let programs = {
	qoala : undefined,
	pcs : [],
	final : [],
	toExport : []
};

let dateFormatter;

window.addEventListener("load", function() {
	// Set trigger for when files are loaded
	const inputFileQOALA = document.getElementById("file-input-qoala");
	inputFileQOALA.addEventListener("change", loadFileDataQOALA, false);

	const inputFilePCS = document.getElementById("file-input-pcs");
	inputFilePCS.addEventListener("change", loadFileDataPCS, false);

	// Set date formatter
	/*
	dateFormatter = new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZone: 'UTC+09:00' // Japan Standard Time
    });
    */
});

function loadServerDataQOALA(callback) {
	// For version only
    // https://files.sigchi.org/conference/cache/10028/version

    console.log("Fetching JSON..");

	var xhttpVersion = new XMLHttpRequest();
    xhttpVersion.onreadystatechange = function() {
         if (this.readyState == 4 && this.status == 200) {
         	//console.log(this.responseText);
         	console.log("Done fetching data");
            try {
            	programs.qoala = JSON.parse(this.responseText);
            	console.log("Loaded QOALA program. Content entries & version:", programs.qoala.contents.length, programs.qoala.dataVersion);
            	updateUI();
            } catch (error) {
            	console.error(error);
            }
         }
    };
    xhttpVersion.open("GET", "https://files.sigchi.org/conference/program/CHI/2021", true);
    xhttpVersion.setRequestHeader("Content-type", "application/json");
    xhttpVersion.send();
}

function loadFileDataQOALA() {
	console.log("Loading QOALA File");

	const files = document.getElementById("file-input-qoala").files;

	var reader = new FileReader();
	// Keep ref to name
	reader.fileName = files[0].name;

    reader.onload = function(event) {
        console.log("Done reading file", event.target.fileName);
        try {
	    	programs.qoala = JSON.parse(event.target.result);
	    	console.log("Loaded QOALA program. Content entries & version:", programs.qoala.contents.length, programs.qoala.dataVersion);
	    	updateUI();
	    } catch (error) {
	    	console.error(error);
	    }
    };

    reader.readAsText(files[0]);
}


function loadFileDataPCS() {
	console.log("Loading PCS Files");

	const files = document.getElementById("file-input-pcs").files;

	for (var i = 0; i < files.length; i++) {
		var reader = new FileReader();
		// Keep ref to name
		reader.fileName = files[i].name;

	    reader.onload = function(event) {
	        console.log("Done reading file", event.target.fileName);
	        const json = CSVJSON.csv2json(event.target.result, {parseNumbers: true});

	        var trackID = event.target.fileName.replace(".csv", "");
	        programs.pcs[trackID] = json;
	        
	    };
	    reader.readAsText(files[i], "UTF8");
	    // See for encodings: https://github.com/whatwg/encoding/blob/main/encodings.json
	}
}

function processDataQOALA() {
	programs.final = getRowsFromQoalaProgramContent();

	console.log("Processed QOALA program into internal program");

	addSessionsToRows(programs.final);

	console.log("Added session information to internal program");
}

function updateUI() {

	if (programs.qoala) {
		var divData = document.getElementById("data-qoala-json");
		divData.innerHTML = "Data content length: " + programs.qoala.contents.length;

		var divVersion = document.getElementById("data-qoala-version");
		divVersion.innerHTML = "Version: " + programs.qoala.dataVersion;
	}
}

function getRowsFromQoalaProgramContent() {
	var result = [];
	var tracks = [];
	var contentTypes = [];

	// Make a track key:names object, to kave at hand, for convenience
	for (var i = 0; i < programs.qoala.tracks.length; i++) {
		tracks[programs.qoala.tracks[i].id] = programs.qoala.tracks[i].name;
	}

	// Same for content Type
	for (var i = 0; i < programs.qoala.contentTypes.length; i++) {
		contentTypes[programs.qoala.contentTypes[i].id] = programs.qoala.contentTypes[i].name;
	}

	var content = programs.qoala.contents;

	// Iterate over all content
	for (var c = 0; c < programs.qoala.contents.length; c++) {
		var row = {
			id  				: programs.qoala.contents[c].id,
			title 				: programs.qoala.contents[c].title,
			sessionOneStart 	: undefined,
			sessionOneEnd 		: undefined,
			sessionTwoStart 	: undefined,
			sessionTwoEnd 		: undefined,
			sessionThreeStart 	: undefined,
			sessionThreeEnd 	: undefined,
			//authors : programs.qoala.contents[c].authors,
			doi : programs.qoala.contents[c].doi,
			contactName 	: undefined,
			contactEmail 	: undefined,
			trackId 	: programs.qoala.contents[c].trackId,
			typeId  	: programs.qoala.contents[c].typeId
		};

		// Fetch the name of the track
		row.trackName = tracks[row.trackId];
		row.typeName = contentTypes[row.typeId];

		result[programs.qoala.contents[c].id] = row;
	}

	return result;
}

function addSessionsToRows(rows) {
	// Make a timeSlots key:names object, to kave at hand, for convenience
	var timeSlots = [];
	for (var i = 0; i < programs.qoala.timeSlots.length; i++) {
		timeSlots[programs.qoala.timeSlots[i].id] = {
			startDate : programs.qoala.timeSlots[i].startDate,
			endDate : programs.qoala.timeSlots[i].endDate
		}
	}

	// For each session
	for (var i = 0; i < programs.qoala.sessions.length; i++) {
		
		// For each content in the session
		for (var j = 0; j < programs.qoala.sessions[i].contentIds.length; j++) {
			// Get content id
			var contentInSession = programs.qoala.sessions[i].contentIds[j];

			// Assign this session to the row that corresponds to this content
			if (!rows[contentInSession].sessionOneStart) {
				rows[contentInSession].sessionOneStart = timeSlots[programs.qoala.sessions[i].timeSlotId].startDate;
				rows[contentInSession].sessionOneEnd = timeSlots[programs.qoala.sessions[i].timeSlotId].endDate;
			} else {
				if (!rows[contentInSession].sessionTwoStart) {
					rows[contentInSession].sessionTwoStart = timeSlots[programs.qoala.sessions[i].timeSlotId].startDate;
					rows[contentInSession].sessionTwoEnd = timeSlots[programs.qoala.sessions[i].timeSlotId].endDate;;
				} else  {
					if (!rows[contentInSession].sessionThreeStart) {
						rows[contentInSession].sessionThreeStart = timeSlots[programs.qoala.sessions[i].timeSlotId].startDate;
						rows[contentInSession].sessionThreeEnd = timeSlots[programs.qoala.sessions[i].timeSlotId].endDate;
					} else  {
						console.log("three timeslots are full, huh?", programs.qoala.sessions[i].contentIds);
					}
				}
			}
			
		}
	}
}

function mergeDataSources() {
	console.log("Data source merge start. Check following lines for content that does not match");
	// Clean
	programs.toExport = [];

	// For each data in the final array
	for( idxProgFinal in  programs.final ) {
		var pcsItemIdx = matchQOALAWithPCS(programs.final[idxProgFinal]);

		if (pcsItemIdx != undefined) {
			programs.final[idxProgFinal].contactName = programs.pcs[programs.final[idxProgFinal].typeId][pcsItemIdx]["Contact Name"];
			programs.final[idxProgFinal].contactEmail = programs.pcs[programs.final[idxProgFinal].typeId][pcsItemIdx]["Contact Email"];
		} /*else {
			//console.log("Can't match: (QOALA id)", programs.final[idxProgFinal].id);
		}*/

		// Prepare array to export
		var toPush = {
			type 			: programs.final[idxProgFinal].typeName,
			title 			: programs.final[idxProgFinal].title,
			sessionOneStart : programs.final[idxProgFinal].sessionOneStart,
			sessionOneEnd 	: programs.final[idxProgFinal].sessionOneEnd,
			sessionTwoStart : programs.final[idxProgFinal].sessionTwoStart,
			sessionTwoEnd 	: programs.final[idxProgFinal].sessionTwoEnd,
			contactName 	: programs.final[idxProgFinal].contactName,
			contactEmail 	: programs.final[idxProgFinal].contactEmail
		};

		try {
			toPush.sessionOneStart = new Date (toPush.sessionOneStart);
			toPush.sessionOneEnd   = new Date (toPush.sessionOneEnd);
			toPush.sessionTwoStart = new Date (toPush.sessionTwoStart);
			toPush.sessionTwoEnd = new Date (toPush.sessionTwoEnd);

			toPush.sessionOneStart = toPush.sessionOneStart.toLocaleString('en-US', { timeZone: 'UTC' });
			toPush.sessionOneEnd = toPush.sessionOneEnd.toLocaleString('en-US', { timeZone: 'UTC' });
			toPush.sessionTwoStart = toPush.sessionTwoStart.toLocaleString('en-US', { timeZone: 'UTC' });
			toPush.sessionTwoEnd = toPush.sessionTwoEnd.toLocaleString('en-US', { timeZone: 'UTC' });

		} catch(error) {

		}

		programs.toExport.push(toPush );
	}

	console.log("Data source merge end");
}

function matchQOALAWithPCS(qOALAEntry) {
	// We had previously loaded PCS files with name equal to the QOALA TypeId

	// For now, ignore 
	// 11302 Invited Talk
	// 11765 SIGCHI Awars
	// 11766 SIGCHI Lifetime Award
	// 11768 "Keynotes_30min"
	// 11769 "Keynotes_15min"
	// 11306 Plenary
	// 11764 Break
	if (qOALAEntry.typeId == 11302 || 
		qOALAEntry.typeId == 11765 || 
		qOALAEntry.typeId == 11766 || 
		qOALAEntry.typeId == 11768 || 
		qOALAEntry.typeId == 11769 || 
		qOALAEntry.typeId == 11306 || 
		qOALAEntry.typeId == 11764) {

		return undefined;
	}
	if (qOALAEntry.title.indexOf("SIGCHI Lifetime Research Award Talk: The Future Is Not") > -1) {
		return undefined;
	}

	var pCSContent = programs.pcs[qOALAEntry.typeId];

	for( idxPCSContent in  pCSContent ) {
		//Debug
		/*
		if (qOALAEntry.title.indexOf("A Network Analysis") > -1) {
			if (pCSContent[idxPCSContent].Title.indexOf("A Network Analysis") > -1) {
				//debugger;
				console.log("here");
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
			if (pCSContent[idxPCSContent].Title.trim() == qOALAEntry.title.trim()) {
				return idxPCSContent;
			}
		}
	}

	console.log(qOALAEntry.id, ",", qOALAEntry.title);
	return undefined;
}

function exportResultCSV() {
	var stringToExport = CSVJSON.json2csv(programs.toExport);
	
	var blob = new Blob([stringToExport], {
	    type: "text/plain;charset=utf-8;",
	});
	saveAs(blob, "result.csv");
}

