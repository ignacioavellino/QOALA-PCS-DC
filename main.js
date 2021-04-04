let dqp;

let processedPCSFiles = 0;
let processedDCFiles = 0;

window.addEventListener("load", function() {
	// Set trigger for when files are loaded
	const inputFileQOALA = document.getElementById("file-input-qoala");
	inputFileQOALA.addEventListener("change", loadFileDataQOALA, false);

	const inputFilePCS = document.getElementById("file-input-pcs");
	inputFilePCS.addEventListener("change", loadFileDataPCS, false);

	const inputFilePresentingAuthors = document.getElementById("file-input-presenting-authors");
	inputFilePresentingAuthors.addEventListener("change", loadFilePresentingAuthors, false);

	const inputFileSessionChairs = document.getElementById("file-input-session-chairs");
	inputFileSessionChairs.addEventListener("change", loadFileSessionCharis, false);

	const inputFileDC = document.getElementById("file-input-dc");
	inputFileDC.addEventListener("change", loadFileDataDC, false);

	const inputFilePeopleQOALA = document.getElementById("file-input-people-extra");
	inputFilePeopleQOALA.addEventListener("change", loadFilePeopleQOALA, false);

	const inputFileSessionSpread = document.getElementById("file-input-session-spread");
	inputFileSessionSpread.addEventListener("change", loadFileSessionSpread, false);
	

	

	dqp = new DQP();

	// Load dev QOALA data
	dqp.setQOALAProgram( testData );
	dqp.processDataQOALA(function() {
		updateUI();
	});

});

function loadServerDataQOALA(callback) {
	// For version only
    // https://files.sigchi.org/conference/cache/10028/version

    console.log("Fetching JSON");

	var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
         if (this.readyState == 4 && this.status == 200) {
         	//console.log(this.responseText);
         	console.log("Done fetching data");
            try {
            	dqp.setQOALAProgram( JSON.parse(this.responseText) );
            	//programs.qoala = JSON.parse(this.responseText);
            	console.log("Loaded QOALA program. Content entries & version:", dqp.programs.qoala.contents.length, dqp.programs.qoala.dataVersion);
            	dqp.processDataQOALA(function() {
            		updateUI();
            	});
            } catch (error) {
            	console.error(error);
            }
         }
    };
    xhttp.open("GET", "https://files.sigchi.org/conference/program/CHI/2021", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
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
        	dqp.setQOALAProgram( JSON.parse(event.target.result) );
	    	//programs.qoala = JSON.parse(event.target.result);
	    	console.log("Loaded QOALA program. Content entries & version:", dqp.programs.qoala.contents.length, dqp.programs.qoala.dataVersion);
	    	dqp.processDataQOALA(function() {
        		updateUI();
        	});
	    } catch (error) {
	    	console.error(error);
	    }
    };

    reader.readAsText(files[0]);
}

function updateUI() {
	if (dqp.programs.qoala) {
		var divData = document.getElementById("data-qoala-json");
		divData.innerHTML = "Data content length: " + dqp.programs.qoala.contents.length;

		var divVersion = document.getElementById("data-qoala-version");
		divVersion.innerHTML = "Version: " + dqp.programs.qoala.dataVersion;
	}
}

function loadFileDataPCS() {
	processedPCSFiles = 0;
	console.log("Loading PCS Files");

	const files = document.getElementById("file-input-pcs").files;

	for (var i = 0; i < files.length; i++) {
		var reader = new FileReader();
		// Keep ref for onload use
		reader.fileName = files[i].name;
		reader.fileLength = files.length;

	    reader.onload = function(event) {
	        console.log("Done reading file", event.target.fileName);
	        var jsonPCS = CSVJSON.csv2json(event.target.result, {parseNumbers: true});

	        var trackID = event.target.fileName.replace(".csv", "");
	        dqp.addPCSTrack(trackID, jsonPCS);

	        processedPCSFiles++;
	        
	        if (event.target.fileLength == processedPCSFiles) {
	        	console.log("Done with all, auto merging");
	        	mergeDataSources();
	        	//loadFileDataDC();
	        }
	    };
	    reader.readAsText(files[i], "UTF8");
	    // See for encodings: https://github.com/whatwg/encoding/blob/main/encodings.json
	}

	var buttonA = document.getElementById("button-merge");
	buttonA.removeAttribute("disabled");

	var buttonB = document.getElementById("button-match-presenting");
	buttonB.removeAttribute("disabled");

	var buttonC = document.getElementById("file-input-session-chairs");
	buttonC.removeAttribute("disabled");
	
	var buttonD = document.getElementById("file-input-presenting-authors");
	buttonD.removeAttribute("disabled");

	var buttonE = document.getElementById("file-input-people-extra");
	buttonE.removeAttribute("disabled");
	
}

function mergeDataSources() {
	console.log("Data source merge start. Check following lines for content that does not match");
	// For now, ignore 
    // 11302 Invited Talk
    // 11768 "Keynotes_30min" *
    // 11769 "Keynotes_15min" *
    // 11306 Plenary
    // 11764 Break *
    // 11771 BREAK (5min) *
    // 11155 BREAK (10min)
    // 11772 BREAK (20min) *
    // 11767 Keynotes *
    // 11773 alt.chi debate
    // 11775 SGC-Q&A
    // 11774 SGC-intro-closing
	//dqp.mergeQOALAWithPCS([11302, 11768, 11769, 11306, 11764, 11771, 11155, 11772, 11767, 11773, 11775, 11774]);
	dqp.mergeQOALAWithPCS([]);

	console.log("Data source merge end");

	var button = document.getElementById("button-export");
	button.removeAttribute("disabled");
}

function matchPresentingAuthors() {
	dqp.computeMatchPresentingAuthorsOnPCSWithQOALA(0.7);

	var contentsForReview = dqp.processPresenterDataForReview();

	var stringToExport = JSON.stringify(contentsForReview, null, 2);
	
	var blob = new Blob([stringToExport], {
	    type: "text/plain;charset=utf-8;",
	});
	saveAs(blob, "presentingAuthorsForReview_" + dqp.programs.qoala.dataVersion + ".json");
}

function loadFilePresentingAuthors() {
	console.log("Loading Presenting Authors");

	const files = document.getElementById("file-input-presenting-authors").files;

	var reader = new FileReader();
	// Keep ref to name
	reader.fileName = files[0].name;

    reader.onload = function(event) {
        console.log("Done reading file", event.target.fileName);
        try {
        	var jsonContent = JSON.parse(event.target.result);
        	console.log("Loaded Presenting Authors. Content entries:", jsonContent["contents"].length);

        	// set presenting authors
        	dqp.setMatchPresentingAuthorsOnPCSWithQOALA( jsonContent );

        	console.log("Finished setting presenting authors");
	    	
	    } catch (error) {
	    	console.error(error);
	    }
    };

    reader.readAsText(files[0]);
}

function loadFileSessionCharis() {
	console.log("Loading Session Chairs");

	const files = document.getElementById("file-input-session-chairs").files;

	var reader = new FileReader();
	// Keep ref to name
	reader.fileName = files[0].name;

    reader.onload = function(event) {
        console.log("Done reading file", event.target.fileName);
        try {
        	var jsonSessionChairs = CSVJSON.csv2json(event.target.result, {parseNumbers: true});
        	
        	console.log("Loaded Session Chairs. Content entries:", jsonSessionChairs.length);

        	// Compute presenting authors
        	var presenting = dqp.computeSessionChairsWithQOALA( jsonSessionChairs, 0.7 );

        	console.log("Finished computing session chairs");

        	var stringToExport = CSVJSON.json2csv(presenting);
	
			var blob = new Blob([stringToExport], {
			    type: "text/plain;charset=utf-8;",
			});
			saveAs(blob, "sessionChairs.csv");
	    	
	    } catch (error) {
	    	console.error(error);
	    }
    };
    reader.readAsText(files[0]);
}

function loadFileDataDC() {
	console.log("Loading DC Data");
	// For dev purposes, don't do a file read but have the data ready here as hardcoded JSON
	
	// const files = document.getElementById("file-input-dc").files;
	// for (var i = 0; i < files.length; i++) {
	// 	var reader = new FileReader();
	// 	// Keep ref for onload use
	// 	reader.fileName = files[i].name;
	// 	reader.fileLength = files.length;

	//     reader.onload = function(event) {
	//         console.log("Done reading file", event.target.fileName);
	//         var json = CSVJSON.csv2json(event.target.result, {parseNumbers: true});

	//         switch(event.target.fileName) {
	//         	case "days.csv":
	//         	dataDC.days = json;
	//         }

	//         processedDCFiles++;
	        
	//         if (event.target.fileLength == processedDCFiles) {
	//         	console.log("Done with all, setting DC data");

	        	dqp.setDCData(dataDC);
	        	/*
	        	dqp.processDCData({
	        		// 11154=, 11156, 11157, 11160, 11158, 11159, 11155, 11164, 11166, 11165, 11167
	        		tracks : [11154, 11156, 11157, 11160, 11158, 11159, 11155, 11164, 11166, 11165, 11167],
	        		// Keynotes_30min = 11768; Keynotes_15min = 11769; break5 = 11771; break20 = 11772; break10 = 11764
	        		//contentTypes 		 : [11768, 11769, 11771, 11772, 11764]
	        		
	        		// break20 = 11772; break10 = 11764
	        		contentTypes 		 : [11772, 11764]
	        	});*/
	        	dqp.processDCData({
	        		tracksToRename 	: [{
	        			idQOALA 	: 11154,
	        			name 		: "Break 20 min"
	        		}, {
	        			idQOALA 	: 11156,
	        			name 		: "Break 5 min"
	        		}, {
	        			idQOALA 	: 11157,
	        			name 		: "Opening"
	        		}, {
	        			idQOALA 	: 11153,
	        			name 		: "SigCHI Lifetime Awards"
	        		}, {
	        			idQOALA 	: 11158,
	        			name 		: "Keynote Q&A (short)"
	        		}, {
	        			idQOALA 	: 11159,
	        			name 		: "Keynote Q&A (long)"
	        		}, {
	        			idQOALA 	: 11155,
	        			name 		: "Break 10 min"
	        		}, {
	        			idQOALA 	: 11164,
	        			name 		: "Keynotes"
	        		}, {
	        			idQOALA 	: 11160,
	        			name 		: "alt.chi debate"
	        		}, {
	        			idQOALA 	: 11166,
	        			name 		: "Student Game Competition Q&A"
	        		}, {
	        			idQOALA 	: 11165,
	        			name 		: "Student Game Competition Closing"
	        		}, {
	        			idQOALA 	: 11167,
	        			name 		: "Student Game Competition Opening"
	        		}],
	        		contentTypesToRename 	: [{
	        			idQOALA 	: 11765,
	        			name 		: "SigCHI Award"
	        		}, {
	        			idQOALA 	: 11766,
	        			name 		: "SigCHI Lifetime Award"
	        		}, {
	        			idQOALA 	: 11768,
	        			name 		: "Keynote Q&A (long)"
	        		}, {
	        			idQOALA 	: 11769,
	        			name 		: "Opening and Live Q&A"
	        		}, {
	        			idQOALA 	: 11771,
	        			name 		: "Break 5 min"
	        		}, {
	        			idQOALA 	: 11772,
	        			name 		: "Break 20 min"
	        		}, {
	        			idQOALA 	: 11773,
	        			name 		: "alt.chi debate"
	        		}, {
	        			idQOALA 	: 11774,
	        			name 		: "Student Game Competition Opening & Closing"
	        		}, {
	        			idQOALA 	: 11775,
	        			name 		: "Student Game Competition Q&A"
	        		}, {
	        			idQOALA 	: 11762,
	        			name 		: "Student Research Competition"
	        		}, {
	        			idQOALA 	: 11763,
	        			name 		: "Student Game Competition"
	        		}, {
	        			idQOALA 	: 11764,
	        			name 		: "Break 10 min"
	        		}],
	        		roomsToRename : [{
	        			idQOALA 	: 10476,
	        			name 		: "SRC 1st-Round Room 1"
	        		}, {
	        			idQOALA 	: 10463,
	        			name 		: "Late-Breaking Work Room 1"
	        		}, {
	        			idQOALA 	: 10462,
	        			name 		: "Interactivity Room 1"
	        		}, {
	        			idQOALA 	: 10480,
	        			name 		: "Doctoral Consortium Poster 1"
	        		}, {
	        			idQOALA 	: 10471,
	        			name 		: "Workshop Room 1"
	        		}]
	        	});

	        	console.log("Finished processing DC Data");


	//         }
	//     };
	//     reader.readAsText(files[i], "UTF8");
	// }

}

function loadFilePeopleQOALA() {
	console.log("Loading extra QOALA People information");

	const files = document.getElementById("file-input-people-extra").files;

	var reader = new FileReader();
	// Keep ref to name
	reader.fileName = files[0].name;

    reader.onload = function(event) {
        console.log("Done reading file", event.target.fileName);
        try {
        	var jsonPeopleExtraInfo = CSVJSON.csv2json(event.target.result, {parseNumbers: true});
        	
        	console.log("Loaded People extra information. Content entries:", jsonPeopleExtraInfo.length);

        	// Add info to people
        	dqp.processPeopleExtraInformation( jsonPeopleExtraInfo, [
        		{name: "email", type: "text"},
        		{name: "pronnouns_match_by_email", type: "text"},
        		{name: "pronnouns_match_by_full_name", type: "text"},
        		{name: "pronnouns_match_overall", type: "text"},

        		{name: "affiliation_match_by_email", type: "text"},
        		{name: "affiliation_match_by_full_name", type: "text"},
        		{name: "affiliation_match_overall", type: "text"},

        		//{name: "Content related institutions", type: "json"},
        		{name: "Content related affiliations", type: "json" }
        	]);

        	console.log("Finished processing extra QOALA people information");
	    	
	    } catch (error) {
	    	console.error(error);
	    }
    };
    reader.readAsText(files[0]);
}

function loadFileSessionSpread() {

	console.log("Loading extra QOALA People information");

	const files = document.getElementById("file-input-session-spread").files;

	var reader = new FileReader();
	// Keep ref to name
	reader.fileName = files[0].name;

    reader.onload = function(event) {
        console.log("Done reading file", event.target.fileName);
        try {
        	var jsonSessionSpread = CSVJSON.csv2json(event.target.result, {parseNumbers: true});
        	
        	console.log("Loaded session spread info. Content entries:", jsonSessionSpread.length);

        	// Add session spread
        	dqp.setSessionSpread( jsonSessionSpread );

        	console.log("Finished processing session spread");
	    	
	    } catch (error) {
	    	console.error(error);
	    }
    };
    reader.readAsText(files[0]);

}

function exportResultCSV() {
	dqp.exportFinalProgram();
	var stringToExport = CSVJSON.json2csv(dqp.programs.toExport);
	
	var blob = new Blob([stringToExport], {
	    type: "text/plain;charset=utf-8;",
	});
	saveAs(blob, "result_v" + dqp.programs.qoala.dataVersion + ".csv");
}


let dataDC = {
	days 		: [{"id":1,"date":"07 May 2021","start_time":"7:55 AM","end_time":"7:55 AM"},{"id":2,"date":"08 May 2021","start_time":"7:55 AM","end_time":"7:55 AM"},{"id":3,"date":"09 May 2021","start_time":"7:55 AM","end_time":"7:55 AM"},{"id":4,"date":"10 May 2021","start_time":"7:55 AM","end_time":"7:55 AM"},{"id":5,"date":"11 May 2021","start_time":"7:56 AM","end_time":"7:56 AM"},{"id":6,"date":"12 May 2021","start_time":"7:56 AM","end_time":"7:56 AM"},{"id":7,"date":"13 May 2021","start_time":"7:56 AM","end_time":"7:56 AM"},{"id":8,"date":"14 May 2021","start_time":"7:56 AM","end_time":"7:56 AM"},{"id":9,"date":"15 May 2021","start_time":"7:56 AM","end_time":"7:56 AM"},{"id":10,"date":"16 May 2021","start_time":"7:56 AM","end_time":"7:56 AM"}],
	speakerType : [{id: "Keynote", event_ids : 1, external_id : 1}, {id: "Author", event_ids : 1, external_id : 2}, {id: "Session Chair", event_ids : 1, external_id : 3},],
	themes 		: [{id: 1, name: "CHI", icon : "", active : "", focus : "",summary : "", hero : "", vertical_tile : "", short_name : "", description : "", color : "", external_id : ""}]
};
