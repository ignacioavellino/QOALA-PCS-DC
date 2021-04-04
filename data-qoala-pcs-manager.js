class DQP {
  // TODO: this.programs.content has as id the QOALA id, but we should make a dictionary like with the other stuff (sessions, people, etc ..)

  // TODO: fix the too many 'presenter' fields, used for computing the match
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

    this.dCTalksId  = 1;
    this.dCVenuesId = 1;

    this.sessionSpread = [];

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
        award               : this.programs.qoala.contents[c].award,
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
      if (!content) {
        console.log("ERROR. Unknown QOALA content when trying to match presenters:", presenters);
        return;
      }
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

  processPeopleExtraInformation(peopleExtraInformation, fields) {
    // ********************
    // 1. Iterate the Final People
    // ********************
    for( var idx in peopleExtraInformation ) {
      var person = this.dictionaries.people[peopleExtraInformation[idx].exported_id];
      if (!person) {
        console.log("ERROR. Unknown QOALA person when trying to add the following information to them:", peopleExtraInformation[idx]);
      } else {
        for( var idy in fields ) {
          switch (fields[idy].type) {
            case "text":
              person[fields[idy].name] = peopleExtraInformation[idx][fields[idy].name];
            break;
              
            case "json":
              person[fields[idy].name] = JSON.parse(peopleExtraInformation[idx][fields[idy].name]);
            break;

            case "default":
              console.log("ERROR. Unknown type:", peopleExtraInformation[idx][fields[idy]]);
              break;
          }
          
        }
      }
    }
  }

  setDCData(dcData) {
    // TODO: validate
    this.programs.dc = dcData;
  }

  processDCData(renames) {
    this.dCTalksId  = 1;
    this.dCVenuesId = 1;
    var i;

    // ********************
    // 1. Prepare talk-types (=QOALA tracks)
    // ********************
    this.programs.dc.talkTypes = [];
    this.programs.dc.talkTypesDict = [];
    i = 1;
    for (var idx in this.programs.final.tracks) {
      var track = this.programs.final.tracks[idx];

      var printName = "";
      if (track.name) {
        var printName = track.name.slice(
          track.name.indexOf(this.talkTypesExcessBlurb) + this.talkTypesExcessBlurb.length,
          track.name.length );
      }

      var found = renames.tracksToRename.find(element => element.idQOALA == track.id);

      if (found) {
        printName = found.name;
      }

      var objToPush = {
        id                : i,
        name              : printName,
        icon              : "",
        summary           : "",
        active            : "",
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

      // Check if it has a contentTypes that should be renamed
      var found = renames.contentTypesToRename.find(element => element.idQOALA == contentType.id);
      var finalName = contentType.name;

      if (found) {
        finalName = found.name;
      }

      var objToPush = {
        id                : i,
        name              : finalName,
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
    //i = 1; // use dCVenuesId, we will use it later
    for (var idx in this.programs.qoala.rooms) {
      var room = this.programs.qoala.rooms[idx];

      // Check if it has a room that should be renamed
      var found = renames.roomsToRename.find(element => element.idQOALA == room.id);
      var finalName = room.name;

      if (found) {
        finalName = found.name;
      }

      var objToPush = {
        id                : this.dCVenuesId,
        name              : finalName,
        capacity          : "",
        reserved_capacity : "",
        level_id          : "",
        map_venue_id      : "",
        event_id          : "1",
        external_id       : room.id,
        sessiontTypeId    : this.programs.dc.sessionTypesDict[room.typeId].id
      };
      this.programs.dc.venues.push(objToPush);
      this.programs.dc.venuesDict[room.id] = objToPush;
      this.dCVenuesId++;
    }


    // ********************
    // 4. Compute Speakers
    // ********************
    this.programs.dc.speakers = [];
    this.programs.dc.speakersDict = [];
    i = 1;
    for (var idx in this.programs.final.people) {
      var person = this.programs.final.people[idx];

      // Compute name
      var firstName = person.firstName;
      if (person.middleInitial && person.middleInitial.length > 0) {
        firstName += " " + person.middleInitial;
      }

      var affiliations = [];
      // var locations = [];
      // var sates = [];
      // var contries = [];
      // var companies = [];
      var location = "";
      var state = "";
      var country = "";
      var company = "";

      if (person["Content related affiliations"]) {
        for (var idy in person["Content related affiliations"]) {
          if (person["Content related affiliations"][idy] != null) {
            affiliations.push(person["Content related affiliations"][idy]);
            // locations.push(person["Content related affiliations"][idy].city);
            // sates.push(person["Content related affiliations"][idy].state);
            // contries.push(person["Content related affiliations"][idy].country);

            // companies.push({
            //   dsl          : person["Content related affiliations"][idy].dsl,
            //   institution   : person["Content related affiliations"][idy].institution
            // });
          }
        }
      }

      if (person.affiliation_match_by_email) {
        company = person.affiliation_match_by_email;
      } else {
        if (person["Content related affiliations"] && person["Content related affiliations"].length > 0) {
          company  = person["Content related affiliations"][0].institution;
          location = person["Content related affiliations"][0].dsl;
        }
      }


      var objToPush = {
        id                    : i,
        pronoun               : person.pronnouns_match_by_email ? person.pronnouns_match_by_email : "",
        first_name            : firstName,
        last_name             : person.lastName,
        email                 : person.email ? person.email : "",
        location              : location, //JSON.stringify(locations),
        state                 : state, //JSON.stringify(sates),
        country               : country, //JSON.stringify(contries),
        contact_number        : "",
        bio                   : "",
        company               : company, //JSON.stringify(companies),
        job_title             : "",
        company_website       : "",
        theme_ids             : this.programs.dc.themes[0].id, // One theme by default
        talk_ids              : "", // will be computed later, blank for now
        event_ids             : 1, 
        speaker_type_id       : "COMING SOON",
        featured              : "",
        facebook              : "",
        twitter               : "",
        linkedin              : "",
        external_id           : person.id,
        affiliations          : JSON.stringify(affiliations)
      };
      this.programs.dc.speakers.push(objToPush);
      this.programs.dc.speakersDict[person.id] = objToPush;
      i++;
    }


    // ********************
    // 5 & 6. Prepare sessions and inside talks
    // ********************
    // *** Talks ***
    this.programs.dc.talks = [];
    //this.programs.dc.talksDict = []; // We can't use this anymore, because one QOALA id now has multiple talks in DC
    // Dictionary for later association of talks in Speakers table
    this.dictionaries.dc.talksBySpeakers = [];
    // Dictionary for later computing speaker_type for Speakers table
    this.dictionaries.dc.talksById = [];


    // *** Sessions ***
    this.programs.dc.sessions = [];
    //this.programs.dc.sessionsDict = []; // We don't need
    // Dictionary for later
    this.dictionaries.dc.sessionsByTalks = [];
    
    i = 1;
    for (var idx in this.programs.final.sessions) {
      var session = this.programs.final.sessions[idx];

      // Get day and time data
      var dcDay = this._matchQOALATimeSlotIdWithDCDayId(session.timeSlotId);

      // Compute moderators (=QOALA chairs)
      var moderators = [];
      var moderatorsEmails = [];
      for (var idy in session.chairIds) {
        var personQOALA = this.dictionaries.people[ session.chairIds[idy] ];
        var speakerDCId = this.programs.dc.speakersDict[personQOALA.id].id;
        var speakerDCEmail = this.programs.dc.speakersDict[personQOALA.id].email;
        
        moderators.push(speakerDCId);
        moderatorsEmails.push(speakerDCEmail);
      }

      // If this session is in the spread array, create as many sessions as needed
      if (this.sessionSpread[session.id]) {
        for (var idy in this.sessionSpread[session.id]) {

          //getsert = get or insert venue
          var venueIdx = this._venueGetsert( this.sessionSpread[session.id][idy].room );

          this._createDCSessionAndTalksFromData(
            i, 
            session.name, 
            this.programs.dc.sessionTypesDict[ session.typeId ].id,
            1,
            this.programs.dc.days[dcDay.dcDayId].id,
            dcDay.time,
            dcDay.duration,
            moderators.join(", "),
            moderatorsEmails.join(", "),
            venueIdx,
            this.programs.dc.themes[0].id,
            session.id,
            this.dictionaries.timeSlots[session.timeSlotId].startDate,
            this.dictionaries.timeSlots[session.timeSlotId].endDate,
            this.sessionSpread[session.id].contentIds
          );
          
          i++;
        }
      } else {
        // Otherwise, create just one
        this._createDCSessionAndTalksFromData(
          i, 
          session.name, 
          this.programs.dc.sessionTypesDict[ session.typeId ].id,
          1,
          this.programs.dc.days[dcDay.dcDayId].id,
          dcDay.time,
          dcDay.duration,
          moderators.join(", "),
          moderatorsEmails.join(", "),
          this.programs.dc.venuesDict[session.roomId].id,
          this.programs.dc.themes[0].id,
          session.id,
          this.dictionaries.timeSlots[session.timeSlotId].startDate,
          this.dictionaries.timeSlots[session.timeSlotId].endDate,
          session.contentIds
        );

        i++;
      }
    }

    // ********************
    // 7. Add talks to speakers, and speaker_type
    // ********************
    for (var idx in this.programs.dc.speakers) {
      var talks = this.dictionaries.dc.talksBySpeakers[ this.programs.dc.speakers[idx].id ];

      // Take this chance to process the speaker type of speakerDCId
      var doesKeynote = false;
      var doesTalk = false;

      if (!talks) {
        // Some people don't give talks, like co-authors
      } else {
        this.programs.dc.speakers[idx].talk_ids = talks.join(", ");

        // Compute speaker type
        for ( var tdx in talks ) {
          var dcTalk = this.dictionaries.dc.talksById[talks[tdx]];
          if (dcTalk.talk_type_id == 22 || dcTalk.talk_type_id == 16) { // keynore or opening
            doesKeynote = true;
          } else {
            doesTalk = true;
          }
          if (doesKeynote) {
            // As soon as it has 1 keynote, it's keynote, we can stop
            this.programs.dc.speakers[idx].speaker_type_id = 1;
            break;
          }
        }
      }

      // If no keynote -> if they author one paper: they are author
      if (!doesKeynote) {
        if (doesTalk) {
          this.programs.dc.speakers[idx].speaker_type_id = 2;
        } else {
          // Otherwise: session chair
          this.programs.dc.speakers[idx].speaker_type_id = 3;
        }
      }

    }
  }

  _createDCSessionAndTalksFromData(idDC, name, type, eventId, dayId, time, duration, moderatorsIds, moderatorsEmails, venuesIds, themesIds, externalId, epochTimeStart, epochTimeEnd, contentIds) {
    var objToPush = {
      id                    : idDC,
      title                 : name,
      description           : "",
      session_type_id       : type,
      event_id              : eventId,
      day_id                : dayId,
      time                  : time,
      duration              : duration,
      background_image      : "",
      talk_ids              : "", // Will be computed later
      moderators_ids        : moderatorsIds,
      moderators_emails     : moderatorsEmails,
      venue_ids             : venuesIds,
      theme_ids             : themesIds, // One theme by default
      registration_required : "",
      bookable              : "",
      booking_start_date    : "",
      booking_end_date      : "",
      featured              : "",
      active                : "",
      completed             : "", // leave as False says Jacob
      external_id           : externalId,
      epochTimeStart        : epochTimeStart,
      epochTimeEnd          : epochTimeEnd
    };

    // DC wants a 1-1 relation between talks and sessions, which means that we need to clone talks
    // Caveats: be careful to use the right id, and to keep the talk_ids in the session in the correct order
    var talkIds = [];
    for (var idy in contentIds) {
      var contentQOALA = this.dictionaries.contents[ contentIds[idy] ];
      var talk = this._createDCTalkFromSessionData(contentQOALA, objToPush);
      this.dCTalksId++;

      // Add talk to list of talks
      this.programs.dc.talks.push(talk);
      this.dictionaries.dc.talksById[talk.id] = talk;

      talkIds.push(talk.id);
    }

    // Associate the talks we have just created
    objToPush.talk_ids = talkIds.join(", ");
    
    this.programs.dc.sessions.push(objToPush);
    //this.programs.dc.sessionsDict[idDC] = objToPush;
  }

  _venueGetsert(roomName) {
    var found = undefined;
    for(var idz in this.programs.dc.venues) {
      if ( this.programs.dc.venues[idz].name == roomName) {
        found = (this.programs.dc.venues[idz].id + ""); // Why this? Otherwise it returns a pointer to the variable, which changes! Take the value.
        break;
      }
    }

    if (!found) {
      var objToPush = {
        id                : this.dCVenuesId,
        name              : roomName,
        capacity          : "",
        reserved_capacity : "",
        level_id          : "",
        map_venue_id      : "",
        event_id          : "1",
        external_id       : "EE",
        sessiontTypeId    : ""
      };

      this.programs.dc.venues.push(objToPush);
      found = (this.dCVenuesId + ""); // Why this? Otherwise it returns a pointer to the variable, which changes! Take the value.

      this.dCVenuesId++;
    }

    return found;
  }

  setSessionSpread(ss) {
    // Process into a format easy to use later

    // Result result
    this.sessionSpread = [];

    for (var idx in ss) {
      // Session not already in the final array. Create it.
      if (!this.sessionSpread[ss[idx]["qoala-session-id"]]) {
        this.sessionSpread[ss[idx]["qoala-session-id"]] = [];
      }

      var sessionToSpread = this.sessionSpread[ss[idx]["qoala-session-id"]];

      // Add this row using the table id as index
      if (!sessionToSpread[ss[idx]["table-id"]]) {
        sessionToSpread[ss[idx]["table-id"]] = {
          id          : ss[idx]["qoala-session-id"] + "_" + ss[idx]["table-id"],
          trackId     : ss[idx]["trackId"],
          tableId     : ss[idx]["table-id"],
          room        : ss[idx]["room"],
          contentIds  : [ ]
        };
      }

      // Push content id of this row
      sessionToSpread[ss[idx]["table-id"]].contentIds.push(ss[idx]["qoala-content-id"]);
    }
  }

  _createDCTalkFromSessionData(contentQOALA, sessionDC) {
    // Compute authors list AND speakers from authors
    var authors = [];
    var speakers = [];
    var speakersEmails = [];
    var j = 1;
    // For each author
    for (var idy in contentQOALA.authors) {
      var personQOALA = this.dictionaries.people[ contentQOALA.authors[idy].personId ];
      if (!personQOALA) {
        console.log("ERROR. Unknown person when trying to match speaker for content:", contentQOALA);
      }

      // Name
      var fullName = personQOALA.firstName;
      if (personQOALA.middleInitial && personQOALA.middleInitial.length > 0) {
        fullName += " " + personQOALA.middleInitial;
      }
      fullName += " " + personQOALA.lastName;
      
      // Affiliations
      var affiliations = [];
      for (var idz in personQOALA["Content related affiliations"]) {
        var stringFinal = "";
        if (personQOALA["Content related affiliations"][idz].dsl.length > 0) {
          stringFinal += personQOALA["Content related affiliations"][idz].dsl + ", ";
        }
        if (personQOALA["Content related affiliations"][idz].institution.length > 0) {
          stringFinal += personQOALA["Content related affiliations"][idz].institution + ", ";
        }
        if (personQOALA["Content related affiliations"][idz].city.length > 0) {
          stringFinal += personQOALA["Content related affiliations"][idz].city + ", ";
        }
        if (personQOALA["Content related affiliations"][idz].state.length > 0) {
          stringFinal += personQOALA["Content related affiliations"][idz].state + ", ";
        }
        if (personQOALA["Content related affiliations"][idz].country.length > 0) {
          stringFinal += personQOALA["Content related affiliations"][idz].country
        }
        if (stringFinal.endsWith(", ")) {
          stringFinal = stringFinal.slice(0, stringFinal.length - 2);
        }

        affiliations.push( stringFinal );
      }

      // Email
      var email = personQOALA.email ? personQOALA.email : "";

      authors.push({
        order         : j,
        speakerId     : this.programs.dc.speakersDict[contentQOALA.authors[idy].personId].id, // id to table of speaker ids
        name          : fullName,
        email         : email,
        company       : affiliations.join("; ")
      });
      j++

      // Speaker
      var speakerDCId = this.programs.dc.speakersDict[personQOALA.id].id;
      speakers.push(speakerDCId);
      // Add to dictionaries, for later associating the talks of a speaker
      if (!this.dictionaries.dc.talksBySpeakers[speakerDCId]) {
        this.dictionaries.dc.talksBySpeakers[speakerDCId] = [this.dCTalksId];
      } else {
        this.dictionaries.dc.talksBySpeakers[speakerDCId].push(this.dCTalksId);
      }

      speakersEmails.push(email);
    }
    
    // Also, compute speakers from presenters. Just in case we need it later.
    var presenters = [];
    for (var idy in contentQOALA.presenters) {
      var personQOALA = this.dictionaries.people[ contentQOALA.presenters[idy].personId ];
      if (!personQOALA) {
        console.log("ERROR. Unknown person when trying to match speaker for content:", contentQOALA);
      }
      var presentersDCId = this.programs.dc.speakersDict[personQOALA.id].id;
      presenters.push(presentersDCId);
    }

    // Awards
    var awardName = "";
    if (contentQOALA.award) {
      awardName = this._getAwardName(contentQOALA.award);
    }

    var talkToReturn = {
      id                    : this.dCTalksId,
      title                 : contentQOALA.title,
      description           : contentQOALA.abstract,
      cover_image           : "",
      approved              : "",
      featured              : "",
      owner_email           : "",
      venue_id              : sessionDC.venue_id, // leave blank says Jacob
      day_id                : sessionDC.day_id, // leave blank says Jacob
      talk_type_id          : this.programs.dc.talkTypesDict[contentQOALA.trackId].id,
      duration              : this.dictionaries.contentTypes[contentQOALA.typeId].duration, 
      speaker_ids           : speakers.join(", "),
      speaker_emails        : speakersEmails.join(", "),
      authors               : JSON.stringify(authors),
      session_ids           : sessionDC.id,
      theme_ids             : this.programs.dc.themes[0].id, // One theme by default
      event_ids             : 1,
      moderator_id          : sessionDC.moderators_ids, // leave blank says Jacob
      publishing_approval   : "",
      publishing_blocked    : "",
      webcast_url           : "",
      eposter_presentation  : "",
      eposter_url           : "",
      webcast_poster        : "",
      time                  : sessionDC.time, // leave blank says Jacob
      external_id           : contentQOALA.id,
      presenters_id         : "", //presenters.join(", "),
      award                 : awardName
    };
  
    return talkToReturn;
  }

  _getAwardName(awardId) {
    if (awardId == "BEST_PAPER") {
      return "Best Paper";
    } else if (awardId == "HONORABLE_MENTION") {
      return "Honorable Mention";
    } else {
      console.log("ERROR: unrecognized award type:", awardId);
    }
  }

  _matchQOALATimeSlotIdWithDCDayId(timeSlotId) {
    var dateQOALAStart = new Date( this.dictionaries.timeSlots[timeSlotId].startDate );

    // Get in GMT
    var dateQOALAStartDay = this.dateFormatterDCDay.format(dateQOALAStart);
    var dateQOALAStartTime = this.dateFormatterDCTime.format(dateQOALAStart);

    var match = undefined;

    for (var idx in this.programs.dc.days) {
      var dayDC = this.programs.dc.days[idx].date.slice(0, 2) ;
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

    console.log(qOALAEntry.id, ", ", qOALAEntry.title);
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
