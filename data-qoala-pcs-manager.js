class DQP {
  
  constructor( config = {} ) {
    let self = this;

    this.programs = {
      qoala : undefined,
      pcs : [],
      final : [],
      toExport : []
    };

    this.pCSIncompleteTitleBlurb = "[NO FINAL TITLE PROVIDED. ORIGINAL TITLE: ";

  }

  setQOALAProgram(programJSON) {
    // TODO: validate
    this.programs.qoala = programJSON;
  }

  processDataQOALA(callbackSuccess) {
    var tracks = [];
    var contentTypes = [];

    // ********************
    // 1. Create the Final program object
    // ********************

    // Make a track key:names object, to avoid iterating all the time
    for (var i = 0; i < this.programs.qoala.tracks.length; i++) {
      tracks[this.programs.qoala.tracks[i].id] = this.programs.qoala.tracks[i].name;
    }

    // Same for content Type
    for (var i = 0; i < this.programs.qoala.contentTypes.length; i++) {
      contentTypes[this.programs.qoala.contentTypes[i].id] = this.programs.qoala.contentTypes[i].name;
    }

    // Iterate over all content
    for (var c = 0; c < this.programs.qoala.contents.length; c++) {
      // Add an entry hashed by the QOALA id
      // The contents of the entry are the final output of this script
      this.programs.final[this.programs.qoala.contents[c].id] = {
        id                  : this.programs.qoala.contents[c].id,
        title               : this.programs.qoala.contents[c].title,
        doi                 : this.programs.qoala.contents[c].doi,
        trackId             : this.programs.qoala.contents[c].trackId,
        typeId              : this.programs.qoala.contents[c].typeId,
        //authors           : this.programs.qoala.contents[c].authors,
        // Fetch track data
        trackName           : tracks[this.programs.qoala.contents[c].trackId],
        typeName            : contentTypes[this.programs.qoala.contents[c].typeId],
        sessionOneStart     : undefined,
        sessionOneEnd       : undefined,
        sessionTwoStart     : undefined,
        sessionTwoEnd       : undefined,
        sessionThreeStart   : undefined,
        sessionThreeEnd     : undefined,
        contactName         : undefined,
        contactEmail        : undefined
      };
    }

    // ********************
    // 2. Add Session information
    // ********************

    // Make a timeSlots key:names object, to avoid iterating all the time
    var timeSlots = [];
    for (var i = 0; i < this.programs.qoala.timeSlots.length; i++) {
      timeSlots[this.programs.qoala.timeSlots[i].id] = {
        startDate   : this.programs.qoala.timeSlots[i].startDate,
        endDate     : this.programs.qoala.timeSlots[i].endDate
      }
    }

    // For each session
    for (var i = 0; i < this.programs.qoala.sessions.length; i++) {

      // Get session
      var session = this.programs.qoala.sessions[i];
      
      // For each content in the session
      for (var j = 0; j < session.contentIds.length; j++) {

        // Get content object
        var contentInSession = session.contentIds[j];

        // Assign this session to the row that corresponds to this content
        if (!this.programs.final[contentInSession].sessionOneStart) {
          this.programs.final[contentInSession].sessionOneStart = timeSlots[session.timeSlotId].startDate;
          this.programs.final[contentInSession].sessionOneEnd   = timeSlots[session.timeSlotId].endDate;
        } else {
          if (!this.programs.final[contentInSession].sessionTwoStart) {
            this.programs.final[contentInSession].sessionTwoStart = timeSlots[session.timeSlotId].startDate;
            this.programs.final[contentInSession].sessionTwoEnd   = timeSlots[session.timeSlotId].endDate;;
          } else  {
            if (!this.programs.final[contentInSession].sessionThreeStart) {
              this.programs.final[contentInSession].sessionThreeStart = timeSlots[session.timeSlotId].startDate;
              this.programs.final[contentInSession].sessionThreeEnd   = timeSlots[session.timeSlotId].endDate;
            } else  {
              console.log("Three timeslots are full, huh?", session.contentIds);
            }
          }
        }
        
      }
    }
  }

  addPCSTrack(id, programJSON) {
    // TODO: validate
    this.programs.pcs[id] = programJSON;
  }

  mergeQOALAWithPCS(contentTypesToIgnore) {
    // Clean
    this.programs.toExport = [];

    // For each data in the final array
    for( var idxProgFinal in this.programs.final ) {
      var pcsItemIdx = undefined;

      // Consider contentTypes to ignore
      if ( !contentTypesToIgnore.includes(this.programs.final[idxProgFinal].typeId) ) {
        pcsItemIdx = this._matchEntryQOALAWithPCS(this.programs.final[idxProgFinal], contentTypesToIgnore);
      } else {
        continue;
      }
      
      if (pcsItemIdx != undefined) {
        this.programs.final[idxProgFinal].contactName  = this.programs.pcs[this.programs.final[idxProgFinal].typeId][pcsItemIdx]["Contact Name"];
        this.programs.final[idxProgFinal].contactEmail = this.programs.pcs[this.programs.final[idxProgFinal].typeId][pcsItemIdx]["Contact Email"];
      } /*else {
        //console.log("Can't match: (QOALA id)", this.programs.final[idxProgFinal].id);
      }*/

      // Prepare array to export
      var toPush = {
        type              : this.programs.final[idxProgFinal].typeName,
        title             : this.programs.final[idxProgFinal].title,
        sessionOneStart   : this.programs.final[idxProgFinal].sessionOneStart,
        sessionOneEnd     : this.programs.final[idxProgFinal].sessionOneEnd,
        sessionTwoStart   : this.programs.final[idxProgFinal].sessionTwoStart,
        sessionTwoEnd     : this.programs.final[idxProgFinal].sessionTwoEnd,
        contactName       : this.programs.final[idxProgFinal].contactName,
        contactEmail      : this.programs.final[idxProgFinal].contactEmail
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
      /*
      if (qOALAEntry.title.indexOf("SIGCHI Lifetime Research Award Talk: The Future Is Not") > -1) {
        if (pCSContent[idxPCSContent].Title.indexOf("SIGCHI Lifetime Research Award Talk: The Future Is Not") > -1) {
          console.log("here");
          debugger;
        }
      }
      */

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
          titlePCS = titlePCS.slice(this.pCSIncompleteTitleBlurb.length, titlePCS.length - 1);
        }

        
        if (titlePCS.trim() == titleQOALA.trim()) {
          return idxPCSContent;
        }
      }
    }

    console.log(qOALAEntry.id, ",", qOALAEntry.title);
    return undefined;
  }
}
