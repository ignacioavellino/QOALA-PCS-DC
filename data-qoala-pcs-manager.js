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
        contents      : [],
        sessions      : [],
        people        : [],
        timeSlots     : [],
        contentTypes  : [],
        tracks        : []
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
      contents      : [],
      dc            : {}
    };

    this.dateFormatterDCDay = new Intl.DateTimeFormat('en', {
      // hour: '2-digit',
      // minute: '2-digit',
      // second: '2-digit',
      // year: 'numeric',
      // month: '2-digit',
      day: '2-digit',
      timeZone: 'GMT',
      //hour12: false,
      hourCycle: "h23"
      // hour12 false gives 24:00 instead of 00:00, so don't use it
      // timeZoneName: 'short'
    });

    this.dateFormatterDCTime = new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'GMT',
      hourCycle: "h23"
      // hour12: false,
    });

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
        trackId             : this.programs.qoala.contents[c].trackId,
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
    this.programs.final.tracks         = this.programs.qoala.tracks;
    

    // ********************
    // 3. Add Session information to program content
    // ********************
    // Make dictionaries
    for (var i = 0; i < this.programs.final.timeSlots.length; i++) {
      this.dictionaries.timeSlots[this.programs.final.timeSlots[i].id] = {
        startDate   : this.programs.final.timeSlots[i].startDate,
        endDate     : this.programs.final.timeSlots[i].endDate
      }
    }

    for (var idx in this.programs.final.contents) {
      this.dictionaries.contents[this.programs.final.contents[idx].id] = this.programs.final.contents[idx];
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
    // 1. Prepare talk-types (=QOALA tracks)
    // ********************
    this.programs.dc.talkTypes = [];
    this.programs.dc.talkTypesDict = [];
    i = 1;
    for (var idx in this.programs.final.tracks) {
      var track = this.programs.final.tracks[idx];

      // Check if it has a track that should be ignored
      if ( ignores.tracks.includes(track.id) ) {
        continue;
      }

      var printName = "";
      if (track.name) {
        var printName = track.name.slice(
          track.name.indexOf(this.talkTypesExcessBlurb) + this.talkTypesExcessBlurb.length,
          track.name.length );
      }

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
    // 2. Prepare session-types (=QOALA contentTypes)
    // ********************
    this.programs.dc.sessionTypes = [];
    this.programs.dc.sessionTypesDict = [];
    i = 1;
    for (var idx in this.programs.final.contentTypes) {
      var contentType = this.programs.final.contentTypes[idx];

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

    // ********************
    // 3. Prepare venues (= QOALA rooms)
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
        event_id          : 1,
        external_id       : room.id,
        sessiontTypeId    : this.programs.dc.sessionTypesDict[room.typeId].id
      };
      this.programs.dc.venues.push(objToPush);
      this.programs.dc.venuesDict[room.id] = objToPush;
      i++;
    }


    // ********************
    // 4. Compute Speakers
    // ********************
    this.programs.dc.speakers = [];
    this.programs.dc.speakersDict = [];
    i = 1;
    for (var idx in this.programs.final.people) {
      var person = this.programs.final.people[idx];

      var firstName = person.firstName;
      if (person.middleInitial && person.middleInitial.length > 0) {
        firstName += " " + person.middleInitial;
      }

      var objToPush = {
        id                    : i,
        pronoun               : "",
        first_name            : firstName,
        last_name             : person.lastName,
        email                 : "",
        location              : "SEE INDIVIDUAL TALKS",
        state                 : "SEE INDIVIDUAL TALKS",
        country               : "SEE INDIVIDUAL TALKS",
        contact_number        : "",
        bio                   : "",
        company               : "",
        job_title             : "",
        company_website       : "",
        theme_ids             : this.programs.dc.themes[0].id, // One theme by default
        talk_ids              : "", // will compute later
        event_ids             : 1, 
        speaker_type_id       : "CANNOT COMPUTE",
        featured              : "TRUE",
        facebook              : "",
        twitter               : "",
        linkedin              : "",
        external_id           : person.id
      };
      this.programs.dc.speakers.push(objToPush);
      this.programs.dc.speakersDict[person.id] = objToPush;
      i++;
    }

    // ********************
    // 5. Prepare talks
    // ********************
    this.programs.dc.talks = [];
    this.programs.dc.talksDict = [];

    // Dictionary for later
    this.dictionaries.dc.talksBySpeakers = [];
    i = 1;
    for (var idx in this.programs.final.contents) {
      var content = this.programs.final.contents[idx];

      // Compute authors list
      var authors = [];
      var j = 1;
      for (var idy in content.authors) {
        var personQOALA = this.dictionaries.people[ content.authors[idy].personId ];
        var fullName = personQOALA.firstName;
        if (personQOALA.middleInitial && personQOALA.middleInitial.length > 0) {
          fullName += " " + personQOALA.middleInitial;
        }
        fullName += " " + personQOALA.lastName;
        var affiliation = "";

        authors.push({
          order         : j
          speakerId     : this.programs.dc.speakersDict[content.authors[idy].personId].id, // id to table of speaker ids
          name          : fullName,
          affiliations  : content.authors[idy].affiliations
        });
        j++
      }

      /*
      // Compute speakers from presenters
      var speakers = [];
      for (var idy in content.presenters) {
        var personQOALA = this.dictionaries.people[ content.presenters[idy].personId ];
        if (!personQOALA) {
          console.log("ERROR. Unknown person when trying to match speaker for content:", content);
        }
        var speakerDCId = this.programs.dc.speakersDict[personQOALA.id].id;
        speakers.push(speakerDCId);

        // Add to dictionaries, for later
        if (!this.dictionaries.dc.talksBySpeakers[speakerDCId]) {
          this.dictionaries.dc.talksBySpeakers[speakerDCId] = [i];
        } else {
          this.dictionaries.dc.talksBySpeakers[speakerDCId].push(i);
        }
      }
      */
      // Compute speakers from authors
      var speakers = [];

      // Check if it has a track that should be ignored
      if ( ignores.tracks.includes(content.trackId) ) {
        continue;
      }

      var objToPush = {
        id                    : i,
        title                 : content.title,
        description           : content.abstract,
        cover_image           : "",
        approved              : "",
        featured              : "",
        owner_email           : "",
        venue_id              : "SEE SESSION",
        day_id                : "SEE SESSION",
        talk_type_id          : this.programs.dc.talkTypesDict[content.trackId].id,
        duration              : this.dictionaries.contentTypes[content.typeId].duration, 
        speaker_ids           : speakers.join(","),
        speaker_emails        : "",
        authors               : JSON.stringify(authors),
        session_ids           : "", // need to link
        theme_ids             : this.programs.dc.themes[0].id, // One theme by default
        event_ids             : 1,
        moderator_id          : "SEE SESSION",
        publishing_approval   : "",
        publishing_blocked    : "",
        webcast_url           : "",
        eposter_presentation  : "",
        eposter_url           : "",
        webcast_poster        : "",
        time                  : "SEE SESSION",
        external_id           : content.id
      };

      this.programs.dc.talks.push(objToPush);
      this.programs.dc.talksDict[content.id] = objToPush;
      i++;
    }

    // ********************
    // 6. Prepare sessions
    // ********************
    this.programs.dc.sessions = [];
    this.programs.dc.sessionsDict = [];

    // Dictionary for later
    this.dictionaries.dc.sessionsByTalks = [];
    
    i = 1;
    for (var idx in this.programs.final.sessions) {
      var session = this.programs.final.sessions[idx];

      // Get day and time data
      var dcDay = this._matchQOALATimeSlotIdWithDCDayId(session.timeSlotId);

      // Compute moderators (=QOALA chairs)
      var moderators = [];
      for (var idy in session.chairIds) {
        var personQOALA = this.dictionaries.people[ session.chairIds[idy] ];
        var speakerDCId = this.programs.dc.speakersDict[personQOALA.id].id;
        moderators.push(speakerDCId);
      }

      var talks = [];
      // Compute talks within this session
      for (var idy in session.contentIds) {
        var contentQOALA = this.dictionaries.contents[ session.contentIds[idy] ];
        var talkDCId = this.programs.dc.talksDict[contentQOALA.id].id;
        talks.push(talkDCId);

        // Add to dictionaries, for later
        if (!this.dictionaries.dc.sessionsByTalks[talkDCId]) {
          this.dictionaries.dc.sessionsByTalks[talkDCId] = [i];
        } else {
          this.dictionaries.dc.sessionsByTalks[talkDCId].push(i);
        }
      }

      var objToPush = {
        id                    : i,
        title                 : session.name,
        description           : "",
        session_type_id       : this.programs.dc.sessionTypesDict[ session.typeId ].id,
        event_id              : 1,
        day_id                : this.programs.dc.days[dcDay.dcDayId].ID,
        time                  : dcDay.time,
        duration              : dcDay.duration,
        background_image      : "",
        talk_ids              : talks.join(","),
        moderators_ids        : moderators.join(","),
        moderators_emails     : "",
        venue_ids             : this.programs.dc.venuesDict[session.roomId].id,
        theme_ids             : this.programs.dc.themes[0].id, // One theme by default
        registration_required : "",
        bookable              : "",
        booking_start_date    : "",
        booking_end_date      : "",
        featured              : "",
        active                : "TRUE",
        completed             : "TRUE",
        external_id           : session.id,
        epochTimeStart        : this.dictionaries.timeSlots[session.timeSlotId].startDate,
        epochTimeEnd          : this.dictionaries.timeSlots[session.timeSlotId].endDate
      };
      this.programs.dc.sessions.push(objToPush);
      this.programs.dc.sessionsDict[contentType.id] = objToPush;
      i++;
    }

    // ********************
    // 7. Add sessions to talks
    // ********************
    for (var idx in this.programs.dc.talks) {
      var talks = this.dictionaries.dc.sessionsByTalks[ this.programs.dc.talks[idx].id ];
      if (!talks) {
        // Some sessions have no content, like breaks
        // console.log("No talk stored in dict", this.programs.dc.talks[idx]);
      } else {
        this.programs.dc.talks[idx].session_ids = talks.join(", ")
      }
    }

    // ********************
    // 8. Add talks to speakers
    // ********************
    // TODO: This is wrong, it links to authors, but should link to presenters
    // for (var idx in this.programs.dc.speakers) {
    //   var speakers = this.dictionaries.dc.talksBySpeakers[ this.programs.dc.speakers[idx].id ];
    //   if (!speakers) {
    //     // Some people don't give talks, like co-authors
    //   } else {
    //     this.programs.dc.speakers[idx].talk_ids = speakers.join(", ")
    //   }
    // }

  }

  _matchQOALATimeSlotIdWithDCDayId(timeSlotId) {
    var dateQOALAStart = new Date( this.dictionaries.timeSlots[timeSlotId].startDate );

    // Get in GMT
    var dateQOALAStartDay = this.dateFormatterDCDay.format(dateQOALAStart);
    var dateQOALAStartTime = this.dateFormatterDCTime.format(dateQOALAStart);

    var match = undefined;

    for (var idx in this.programs.dc.days) {
      var dayDC = this.programs.dc.days[idx].Date.slice(0, 2) ;
      if (dateQOALAStartDay == dayDC) {
        match = idx;
        break;
      }
    }

    if (!match) {
      console.log("WARNING - No day match");
      debugger;
    }

    // For duration: end - start is in milliseconds, so multiply by 1000 for seconds, then by 60 for minutes
    return {
      dcDayId   : match,
      time      : dateQOALAStartTime,
      duration  : (this.dictionaries.timeSlots[timeSlotId].endDate - this.dictionaries.timeSlots[timeSlotId].startDate) / 1000 / 60
    };
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
