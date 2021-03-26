class DQP {
  // TODO: this.programs.content has as id the QOALA id, but we should make a dictionary like with the other stuff (sessions, people, etc ..)

  // TODO: fix the too many presenter fields, used for computing the match
  // keep the string, but for the QOALA field, store it temporarly, not permanently

  
  constructor( config = {} ) {
    let self = this;

    this.programs = {
      qoala : undefined,
      pcs : [],
      final : {
        contents     : [],
        sessions     : [],
        people       : [],
        timeSlots    : [],
        contentTypes : []
      },
      dc : {
        days          : undefined,
        venues        : [], // eq rooms in QOALA
        talkTypes     : [], // eq tracks in QOALA
        sessionTypes  : [] // eq contentTypes in QOALA
      },
      toExport : [],
    };

    this.dictionaries = {
      timeSlots     : [],
      contentTypes  : [],
      people        : [],
      content       : []
    };

    this.presenterMatch = [];

    this.pCSIncompleteTitleBlurb = "[NO FINAL TITLE PROVIDED. ORIGINAL TITLE: ";
    this.pCSIncompleteTitleRegex = /(\[NO FINAL TITLE PROVIDED. ORIGINAL TITLE: )(.*)(\])/;
    this.talkTypesExcessBlurb = "CHI 2021 ";

  }

  setQOALAProgram(programJSON) {
    // TODO: validate
    this.programs.qoala = programJSON;
  }

  processDataQOALA(callbackSuccess) {
    // ********************
    // 1. Create the Final Program objects
    // ********************
    // Iterate over all QOALA content
    for (var c = 0; c < this.programs.qoala.contents.length; c++) {
      // Add an entry hashed by the QOALA id
      // The contents of the entry are the final output of this script
      this.programs.final.contents[this.programs.qoala.contents[c].id] = {
        id                  : this.programs.qoala.contents[c].id,
        title               : this.programs.qoala.contents[c].title,
        doi                 : this.programs.qoala.contents[c].doi,
        //trackId             : this.programs.qoala.contents[c].trackId,
        abstract            : this.programs.qoala.contents[c].abstract,
        videos              : this.programs.qoala.contents[c].videos,
        authors             : this.programs.qoala.contents[c].authors,
        typeId              : this.programs.qoala.contents[c].typeId,

        // sessionOne          : undefined;
        // sessionTwo          : undefined;
        // sessionThree        : undefined;
        sessionOneStart     : undefined,
        sessionOneEnd       : undefined,
        sessionTwoStart     : undefined,
        sessionTwoEnd       : undefined,
        sessionThreeStart   : undefined,
        sessionThreeEnd     : undefined,
        contactName         : undefined,
        contactEmail        : undefined,

        presenter           : {pCSStr : undefined, qOALAAuthor : undefined },
        presenterBackup     : {pCSStr : undefined, qOALAAuthor : undefined }

      };
    }

    // ********************
    // 2. Copy other objects
    // ********************
    this.programs.final.sessions       = this.programs.qoala.sessions;
    this.programs.final.people         = this.programs.qoala.people;
    this.programs.final.timeSlots      = this.programs.qoala.timeSlots;
    this.programs.final.contentTypes   = this.programs.qoala.contentTypes;

    // ********************
    // 3. Add Session information to program content
    // ********************
    // Make dictionary
    for (var i = 0; i < this.programs.final.timeSlots.length; i++) {
      this.dictionaries.timeSlots[this.programs.final.timeSlots[i].id] = {
        startDate   : this.programs.final.timeSlots[i].startDate,
        endDate     : this.programs.final.timeSlots[i].endDate
      }
    }

    // For each session
    for (var i = 0; i < this.programs.final.sessions.length; i++) {
      // Get session
      var session = this.programs.final.sessions[i];
      
      // For each content in the session
      for (var j = 0; j < session.contentIds.length; j++) {
        // Get content object
        var contentInSession = session.contentIds[j];

        // Assign this session to the row that corresponds to this content
        if (!this.programs.final.contents[contentInSession].sessionOneStart) {
          this.programs.final.contents[contentInSession].sessionOneStart = this.dictionaries.timeSlots[session.timeSlotId].startDate;
          this.programs.final.contents[contentInSession].sessionOneEnd   = this.dictionaries.timeSlots[session.timeSlotId].endDate;
        } else {
          if (!this.programs.final.contents[contentInSession].sessionTwoStart) {
            this.programs.final.contents[contentInSession].sessionTwoStart = this.dictionaries.timeSlots[session.timeSlotId].startDate;
            this.programs.final.contents[contentInSession].sessionTwoEnd   = this.dictionaries.timeSlots[session.timeSlotId].endDate;;
          } else  {
            if (!this.programs.final.contents[contentInSession].sessionThreeStart) {
              this.programs.final.contents[contentInSession].sessionThreeStart = this.dictionaries.timeSlots[session.timeSlotId].startDate;
              this.programs.final.contents[contentInSession].sessionThreeEnd   = this.dictionaries.timeSlots[session.timeSlotId].endDate;
            } else  {
              console.log("Three timeslots are full, huh?", session.contentIds);
            }
          }
        }
      }
    }

    if (callbackSuccess) {
      callbackSuccess();
    }
  }

  addPCSTrack(id, programJSON) {
    // TODO: validate
    this.programs.pcs[id] = programJSON;
  }

  mergeQOALAWithPCS(contentTypesToIgnore) {
    // Make dictionary
    for (var i = 0; i < this.programs.final.contentTypes.length; i++) {
      this.dictionaries.contentTypes[this.programs.final.contentTypes[i].id] = this.programs.final.contentTypes[i];
    }
    for (var i = 0; i < this.programs.final.people.length; i++) {
      this.dictionaries.people[this.programs.final.people[i].id] = this.programs.final.people[i];
    }    

    // ********************
    // 1. Iterate the Final Program
    // ********************
    for( var idxProgFinal in this.programs.final.contents ) {
      var pcsItemIdx = undefined;

      // Check if it has a contentTypes that should be ignored
      if ( contentTypesToIgnore.includes(this.programs.final.contents[idxProgFinal].typeId) ) {
        continue;
      }

      // ********************
      // 1.1 Match Final Program item with PCS item
      // ********************
      pcsItemIdx = this._matchEntryQOALAWithPCS(this.programs.final.contents[idxProgFinal]);
      
      if (pcsItemIdx != undefined) {
        this.programs.final.contents[idxProgFinal].contactName              = this.programs.pcs[this.programs.final.contents[idxProgFinal].typeId][pcsItemIdx]["Contact Name"];
        this.programs.final.contents[idxProgFinal].contactEmail             = this.programs.pcs[this.programs.final.contents[idxProgFinal].typeId][pcsItemIdx]["Contact Email"];
        this.programs.final.contents[idxProgFinal].presenter.pCSStr         = this.programs.pcs[this.programs.final.contents[idxProgFinal].typeId][pcsItemIdx]["Presenting Author"];
        this.programs.final.contents[idxProgFinal].presenterBackup.pCSStr   = this.programs.pcs[this.programs.final.contents[idxProgFinal].typeId][pcsItemIdx]["Backup Presenting Author"];
      }
      // else {
      //   console.log("Can't match: (QOALA id)", this.programs.final.contents[idxProgFinal].id);
      // }
    }
  }

  computeMatchPresentingAuthorsOnPCSWithQOALA(threshold) {
    // Match the author with an author from the QOALA program
    for( var idxProgFinal in this.programs.final.contents ) {
      this._matchPCSPresentingAuthorWithQOALAPerson(idxProgFinal, threshold);
    }
  }

  setMatchPresentingAuthorsOnPCSWithQOALA(presenters) {
    for( var idxPresenters in presenters.contents ) {
      var content = this.programs.final.contents[ presenters.contents[idxPresenters].id ];
      content.presenters = [];

      for( var idxPresLoaded in presenters.contents[idxPresenters].presenters ) {
        content.presenters.push({
          personId : presenters.contents[idxPresenters].presenters[idxPresLoaded].personId
        })
      }
    }
  }

  computeSessionChairsWithQOALA(sessionChairs, thresholdName, thresholdEmail) {
    var result = [];
    for( var idxSessionChairs in sessionChairs ) {
      var similarities = [];
      for( var idxPerson in this.programs.qoala.people ) {
        
        // Compute similarity with this person
        var nameImport = sessionChairs[idxSessionChairs].name;
        var nameQOALA = this.programs.qoala.people[idxPerson].firstName;
        if (this.programs.qoala.people[idxPerson].middleInitial.length > 0) {
          nameQOALA = nameQOALA + " " + this.programs.qoala.people[idxPerson].middleInitial;
        }
        nameQOALA = nameQOALA + " " + this.programs.qoala.people[idxPerson].lastName;
        
        var sim = this._similarity(nameImport, nameQOALA);

        if (sim > thresholdName) {
          similarities.push({
            personId : this.programs.qoala.people[idxPerson].id
          });
        }
      }

      // Session id is in the last 4 digits of the URL
      var sessionId = sessionChairs[idxSessionChairs].URL.slice(sessionChairs[idxSessionChairs].URL.length - 5, sessionChairs[idxSessionChairs].URL.length);

      // TODO: perhaps store only the highest match
      var similaritiesAllString = "";
      for (var i = 0; i < similarities.length; i++) {
        similaritiesAllString += similarities[i].personId;

        if (i < similarities.length - 1) {
           similaritiesAllString += ", ";
        }
      }

      result.push({
        personId  : similaritiesAllString,
        sessionId : sessionId
      });
    
    }

    return result;

      /*
      var similarities = [];
    for (var authIdx in content.authors) {
      // Compute which author is the most similar
      var fullName = this.dictionaries.people[content.authors[authIdx].personId].firstName +
       " " + this.dictionaries.people[content.authors[authIdx].personId].middleInitial +
       " " + this.dictionaries.people[content.authors[authIdx].personId].lastName;
      var sim = this._similarity( content.presenter.pCSStr, fullName);

      if (sim > threshold) {
        similarities.push({
          //idxProgFinal  : idxProgFinal,
          //pCSStr        : content.presenter.pCSStr,
          //authIdx       : authIdx,
          qOALAPersonId : this.dictionaries.people[content.authors[authIdx].personId].id,
          //name          : this.dictionaries.people[content.authors[authIdx].personId].firstName + this.dictionaries.people[content.authors[authIdx].personId].lastName
        });
      }
    }

    if (similarities.length == 1) {
      // Array of presenters with one item
      content.presenters = [{ personId : similarities[0].qOALAPersonId }];
    } else {
      console.log("Similarities", idxProgFinal, similarities.length);
    }
      */
  }

  processPresenterDataForReview() {
    // Reset
    this.presenterMatch = [];

    // ********************
    // 1. Iterate the Final Program
    // ********************
    for( var idxProgFinal in this.programs.final.contents ) {
      // Only for venues that have presenters
      if (this.programs.final.contents[idxProgFinal].presenter.pCSStr) {

        var toPush = {
          id                : this.programs.final.contents[idxProgFinal].id,
          title             : this.programs.final.contents[idxProgFinal].title,
          presenterPCSStr   : this.programs.final.contents[idxProgFinal].presenter.pCSStr,
          presenters        : []
        };

        // For each presenter matched
        for (var idxPresenter in this.programs.final.contents[idxProgFinal].presenters) {
        // if (this.programs.final.contents[idxProgFinal].presenter.qOALAAuthor) {
          var personPresenter = this.dictionaries.people[this.programs.final.contents[idxProgFinal].presenters[idxPresenter].personId];

          if (personPresenter) {
            toPush.presenters.push({ personId : this.programs.final.contents[idxProgFinal].presenters[idxPresenter].personId }); 
          } 
          // else {
          //   debugger;
          // }
        }

        this.presenterMatch.push(toPush);
      }

    }
    return {"contents" : this.presenterMatch};
  }

  setDCData(dcData) {
    // TODO: checks
    this.programs.dc = dcData;
  }

  processDCData(ignores) {
    var i;
    // ********************
    // 1. Prepare Venues (= QOALA rooms)
    // ********************
    this.programs.dc.venues = [];
    this.programs.dc.venuesDict = [];
    i = 1;
    for (var idx in this.programs.qoala.rooms) {
      var room = this.programs.qoala.rooms[idx];

      var objToPush = {
        id                : i,
        name              : room.name,
        capacity          : 0,
        reserved_capacity : 0,
        level_id          : 0,
        map_venue_id      : 0,
        event_id          : 0,
        external_id       : room.id
      };
      this.programs.dc.venues.push(objToPush);
      this.programs.dc.venuesDict[room.id] = objToPush;
      i++;
    }

    // ********************
    // 2. Prepar talk-types (=QOALA tracks)
    // ********************
    // TODO: ignore a list passed by parameter
    this.programs.dc.talkTypes = [];
    this.programs.dc.talkTypesDict = [];
    i = 1;
    for (var idx in this.programs.qoala.tracks) {
      var track = this.programs.qoala.tracks[idx];

      // Check if it has a contentTypes that should be ignored
      if ( ignores.tracks.includes(track.id) ) {
        continue;
      }

      var printName = track.name.slice( 
        track.name.indexOf(this.talkTypesExcessBlurb) + this.talkTypesExcessBlurb.length ,
        track.name.length );

      var objToPush = {
        id                : i,
        name              : printName,
        icon              : "",
        summary           : "",
        active            : "TRUE",
        external_id       : track.id
      };
      this.programs.dc.talkTypes.push(objToPush);
      this.programs.dc.talkTypesDict[track.id] = objToPush;
      i++;
    }

    // ********************
    // 3. Prepar session-types (=QOALA contentTypes)
    // ********************
    this.programs.dc.sessionTypes = [];
    this.programs.dc.sessionTypesDict = [];
    i = 1;
    for (var idx in this.programs.qoala.contentTypes) {
      var contentType = this.programs.qoala.contentTypes[idx];

      // Check if it has a contentTypes that should be ignored
      if ( ignores.contentTypes.includes(contentType.id) ) {
        continue;
      }

      var objToPush = {
        id                : i,
        name              : contentType.name,
        external_id       : contentType.id
      };
      this.programs.dc.sessionTypes.push(objToPush);
      this.programs.dc.sessionTypesDict[contentType.id] = objToPush;
      i++;
    }

  }

  

  exportFinalProgram() {
    // Clean final export
    this.programs.toExport = [];

    // ********************
    // 1. Iterate the Final Program
    // ********************
    for( var idxProgFinal in this.programs.final.contents ) {
      var toPush = {
        type              : this.dictionaries.contentTypes[this.programs.final.contents[idxProgFinal].typeId].name,
        title             : this.programs.final.contents[idxProgFinal].title,
        sessionOneStart   : this.programs.final.contents[idxProgFinal].sessionOneStart,
        sessionOneEnd     : this.programs.final.contents[idxProgFinal].sessionOneEnd,
        sessionTwoStart   : this.programs.final.contents[idxProgFinal].sessionTwoStart,
        sessionTwoEnd     : this.programs.final.contents[idxProgFinal].sessionTwoEnd,
        contactName       : this.programs.final.contents[idxProgFinal].contactName,
        contactEmail      : this.programs.final.contents[idxProgFinal].contactEmail,
        //presenterPCSStr   : this.programs.final.contents[idxProgFinal].presenter.pCSStr,
        presenterQOALAId  : this.programs.final.contents[idxProgFinal].presenterQOALAId
        //presenterQOALAName: "NO MATCH"
      };

      // Process dates
      if (toPush.sessionOneStart) {
        toPush.sessionOneStart = new Date (toPush.sessionOneStart);
        toPush.sessionOneStart = toPush.sessionOneStart.toLocaleString('en-US', { timeZone: 'UTC' });
      } else {
        toPush.sessionOneStart = "";
      }
      if (toPush.sessionOneEnd) {
        toPush.sessionOneEnd   = new Date (toPush.sessionOneEnd);
        toPush.sessionOneEnd   = toPush.sessionOneEnd.toLocaleString('en-US', { timeZone: 'UTC' });
      } else {
        toPush.sessionOneEnd = "";
      }
      if (toPush.sessionTwoStart) {
        toPush.sessionTwoStart = new Date (toPush.sessionTwoStart);
        toPush.sessionTwoStart = toPush.sessionTwoStart.toLocaleString('en-US', { timeZone: 'UTC' });
      } else {
        toPush.sessionTwoStart = "";
      }
      if (toPush.sessionTwoEnd) {
        toPush.sessionTwoEnd   = new Date (toPush.sessionTwoEnd);
        toPush.sessionTwoEnd   = toPush.sessionTwoEnd.toLocaleString('en-US', { timeZone: 'UTC' });
      } else {
        toPush.sessionTwoEnd = "";
      }

      this.programs.toExport.push(toPush);
    }
  }

  _matchEntryQOALAWithPCS(qOALAEntry) {
    // We had previously loaded PCS files with name equal to the QOALA TypeId
    var pCSContent = this.programs.pcs[qOALAEntry.typeId];

    for( var idxPCSContent in  pCSContent ) {
      //Debug by title
      
      // if (qOALAEntry.title.indexOf("Asking better questions") > -1) {
      //   if (pCSContent[idxPCSContent].Title.indexOf("Asking better questions") > -1) {
      //     console.log("here");
      //     debugger;
      //   }
      // }
      

      // Try first to match by DOI
      if (pCSContent[idxPCSContent].DOI && qOALAEntry.doi) {
        if (pCSContent[idxPCSContent].DOI == qOALAEntry.doi) {
          return idxPCSContent;
        }
      } else {
        // Then try title
        var titlePCS = pCSContent[idxPCSContent].Title.trim();
        var titleQOALA = qOALAEntry.title.trim();

        // Ignore incomplete PCS message
        if (titlePCS.indexOf(this.pCSIncompleteTitleBlurb) > -1) {
          //titlePCS = titlePCS.slice(this.pCSIncompleteTitleBlurb.length, titlePCS.length - 1);
          titlePCS = this.pCSIncompleteTitleRegex.exec(titlePCS)[2];
        }

        
        if (titlePCS.trim() == titleQOALA.trim()) {
          return idxPCSContent;
        }
      }
    }

    console.log(qOALAEntry.id, ",", qOALAEntry.title);
    return undefined;
  }

  _matchPCSPresentingAuthorWithQOALAPerson(idxProgFinal, threshold) {
    var content = this.programs.final.contents[idxProgFinal];

    // Initialize empty / reset previously stored presenters if recomputing
    content.presenters = [];

    // This track has no presenter field
    if (!content.presenter.pCSStr) {
      return ;
    }

    var similarities = [];
    for (var authIdx in content.authors) {
      // Compute which author is the most similar
      var fullName = this.dictionaries.people[content.authors[authIdx].personId].firstName;
      if (this.dictionaries.people[content.authors[authIdx].personId].middleInitial.length > 0) {
        fullName = fullName + " " + this.dictionaries.people[content.authors[authIdx].personId].middleInitial;
      }
      fullName = fullName + " " + this.dictionaries.people[content.authors[authIdx].personId].lastName;
      var sim = this._similarity( content.presenter.pCSStr, fullName);

      if (sim > threshold) {
        similarities.push({
          //idxProgFinal  : idxProgFinal,
          //pCSStr        : content.presenter.pCSStr,
          //authIdx       : authIdx,
          qOALAPersonId : this.dictionaries.people[content.authors[authIdx].personId].id,
          //name          : this.dictionaries.people[content.authors[authIdx].personId].firstName + this.dictionaries.people[content.authors[authIdx].personId].lastName
        });
      }
    }

    if (similarities.length == 1) {
      // Array of presenters with one item
      content.presenters = [{ personId : similarities[0].qOALAPersonId }];
    } else {
      console.log("Similarities", idxProgFinal, similarities.length);
    }
  }

  _similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - this._editDistance(longer, shorter)) / parseFloat(longerLength);
  }

  _editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}
