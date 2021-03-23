let dqp;

window.addEventListener("load", function() {
	// Set trigger for when files are loaded
	const inputFileQOALA = document.getElementById("file-input-qoala");
	inputFileQOALA.addEventListener("change", loadFileDataQOALA, false);

	const inputFilePCS = document.getElementById("file-input-pcs");
	inputFilePCS.addEventListener("change", loadFileDataPCS, false);

	dqp = new DQP();

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

		var button = document.getElementById();
	}
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
	        dqp.addPCSTrack(trackID, json);
	        //programs.pcs[trackID] = json;
	    };
	    reader.readAsText(files[i], "UTF8");
	    // See for encodings: https://github.com/whatwg/encoding/blob/main/encodings.json
	}

	var button = document.getElementById("button-merge");
	button.removeAttribute("disabled");
}

function mergeDataSources() {
	console.log("Data source merge start. Check following lines for content that does not match");
	// For now, ignore 
    // 11302 Invited Talk
    // 11765 SIGCHI Awars
    // 11766 SIGCHI Lifetime Award
    // 11768 "Keynotes_30min"
    // 11769 "Keynotes_15min"
    // 11306 Plenary
    // 11764 Break
	dqp.mergeQOALAWithPCS([11302,11765,11766,11768,11769,11306,11764]);

	console.log("Data source merge end");

	var button = document.getElementById("button-export");
	button.removeAttribute("disabled");
}

function exportResultCSV() {
	var stringToExport = CSVJSON.json2csv(dqp.programs.toExport);
	
	var blob = new Blob([stringToExport], {
	    type: "text/plain;charset=utf-8;",
	});
	saveAs(blob, "result_v" + dqp.programs.qoala.dataVersion + ".csv");
}

