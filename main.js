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
	        		tracks 			: [],
	        		contentTypes 	: []
	        	});

	        	console.log("Finished processing DC Data");


	//         }
	//     };
	//     reader.readAsText(files[i], "UTF8");
	// }

}

function loadFilePeopleQOALA() {
	console.log("Loading Extra QOALA People Information");

	const files = document.getElementById("file-input-people-extra").files;

	var reader = new FileReader();
	// Keep ref to name
	reader.fileName = files[0].name;

    reader.onload = function(event) {
        console.log("Done reading file", event.target.fileName);
        try {
        	var jsonPeopleExtraInfo = CSVJSON.csv2json(event.target.result, {parseNumbers: true});
        	
        	console.log("Loaded People extra information Content entries:", jsonPeopleExtraInfo.length);

        	// Add info to people
        	dqp.processPeopleExtraInformation( jsonPeopleExtraInfo, ["email"] );

        	console.log("Finished processing extra info people");
	    	
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
	days 		: [{"ID":5,"Date":"07 May 2021","Start Time":"7:55 AM","End Time":"7:55 AM","Created At":"23 March 2021 7:55 AM","Updated At":"23 March 2021 7:55 AM","Actions":""},{"ID":6,"Date":"08 May 2021","Start Time":"7:55 AM","End Time":"7:55 AM","Created At":"23 March 2021 7:55 AM","Updated At":"23 March 2021 7:55 AM","Actions":""},{"ID":7,"Date":"09 May 2021","Start Time":"7:55 AM","End Time":"7:55 AM","Created At":"23 March 2021 7:55 AM","Updated At":"23 March 2021 7:55 AM","Actions":""},{"ID":8,"Date":"10 May 2021","Start Time":"7:55 AM","End Time":"7:55 AM","Created At":"23 March 2021 7:55 AM","Updated At":"23 March 2021 7:55 AM","Actions":""},{"ID":9,"Date":"11 May 2021","Start Time":"7:56 AM","End Time":"7:56 AM","Created At":"23 March 2021 7:56 AM","Updated At":"23 March 2021 7:56 AM","Actions":""},{"ID":10,"Date":"12 May 2021","Start Time":"7:56 AM","End Time":"7:56 AM","Created At":"23 March 2021 7:56 AM","Updated At":"23 March 2021 7:56 AM","Actions":""},{"ID":11,"Date":"13 May 2021","Start Time":"7:56 AM","End Time":"7:56 AM","Created At":"23 March 2021 7:56 AM","Updated At":"23 March 2021 7:56 AM","Actions":""},{"ID":12,"Date":"14 May 2021","Start Time":"7:56 AM","End Time":"7:56 AM","Created At":"23 March 2021 7:56 AM","Updated At":"23 March 2021 7:56 AM","Actions":""},{"ID":13,"Date":"15 May 2021","Start Time":"7:56 AM","End Time":"7:56 AM","Created At":"26 March 2021 7:25 PM","Updated At":"26 March 2021 7:25 PM","Actions":""},{"ID":14,"Date":"16 May 2021","Start Time":"7:56 AM","End Time":"7:56 AM","Created At":"26 March 2021 7:25 PM","Updated At":"26 March 2021 7:25 PM","Actions":""}],
	speakerType : [{id: "Keynote Speaker", event_ids : 1, external_id : 1}, {id: "Author", event_ids : 1, external_id : 2}],
	themes 		: [{id: 1, name: "CHI", icon : "", active : "", focus : "",summary : "", hero : "", vertical_tile : "", short_name : "", description : "", color : "", external_id : ""}]
};
