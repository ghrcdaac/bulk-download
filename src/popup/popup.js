let data = {
    totalNoofFiles: 0,
    completed: 0,
    in_progress: 0,
    interrupted: 0,
    progress: 0,
    failed: []
};

let loggedErrors = {};
let datasetName = 'Sample name';
let clearDatasetName = 'No Downloads in Progress';

updatePopup();

$(document).ready(function() {
    updatePopup();
    const fileURL = document.URL

    if(fileURL.substring(fileURL.lastIndexOf('/') + 1) == "popup.html"){
        popup();
    }else if (fileURL.substring(fileURL.lastIndexOf('/') + 1) == "errorlog.html"){
        errorlogs();
    }
});

function updateProgressBar(progress) {
    let element = document.getElementById('progress_bar');
    element.style.width = parseInt(progress) + '%';
    element.innerHTML = parseInt(progress) + '%';
}

function updateDownloadStats(stats){

    const fileURL = document.URL;
    if(fileURL.substring(fileURL.lastIndexOf('/') + 1) == "popup.html"){
        document.getElementById("pendingCount").innerHTML = stats.in_progress;
        document.getElementById("finishedCount").innerHTML = stats.completed;
        document.getElementById("failedCount").innerHTML = stats.interrupted;
        updateProgressBar(stats.progress);
        updateErrorLogLink();
    }
}

function updatePopup() {
    if (data.progress >= 100) {
        data.progress = 0;
    } else {
        chrome.runtime.sendMessage({
            message: "update-popup",
            action: "post-progress"
        });
    }

}

function updateErrorLogLink(override = false){
    if(override || data.failed.length === 0){
        $("#errorLogLink").attr("disabled", "disabled");
        $("#errorLogLink").removeAttr("href");
    }else{
        $("#errorLogLink").removeAttr("disabled");
        $("#errorLogLink").attr("href", "errorlog.html");

    }
}

function resetPopup(){
    chrome.runtime.sendMessage({
        message: "update-popup",
        action: "reset-popup"
    })
    updateErrorLogLink(true);
}

chrome.runtime.onMessage.addListener(function(message, sender, sendMessage) {
    if (
        typeof(message) === "object" &&
        message.message == "update-popup-progress"
    ) {
        data = message.data;
        console.log(data);
        updateDownloadStats(data);
        errorlogs();
    }
});

function popup(){

    updateErrorLogLink();

    $(cancel).click(function() {
        chrome.runtime.sendMessage({ message: "pause-download" });
        cancelConfirmation();
    });
    $(pause).click(function() {
        chrome.runtime.sendMessage({ message: "pause-download" });
    });
    $(resume).click(function() {
        chrome.runtime.sendMessage({ message: "resume-download" });
    });
    $(destination).click(function() {
        chrome.downloads.showDefaultFolder()
    });
    $(editFolderName).click(function() {
        swal({
                buttons: {
                    red: {
                        text: "Default folder",
                        value: "Earthdata-BulkDownloads"
                    },
                    confirm: {
                        text: "Edit folder",
                        value: true
                    }
    
                },
                content: {
                    element: "input",
                    attributes: {
                        placeholder: "Enter folder-name",
                        type: "text",
                    },
                }
            })
            .then((value) => {
                let mainFolderName = value;
                swal(`Downloads will be saved in the folder: ${value}`);
                chrome.storage.sync.set({ 'mainFolderName': mainFolderName });
                console.log(value);
            });
    });
    $(clearPopup).click(function() {
        chrome.storage.sync.set({ 'datasetName': clearDatasetName });
        document.getElementById("datasetName").innerHTML = clearDatasetName;
        document.getElementById("pendingCount").innerHTML = '0';
        document.getElementById("finishedCount").innerHTML = '0';
        document.getElementById("failedCount").innerHTML = '0';
        updateProgressBar(0);
        resetPopup();
    });
    $("#searchBar").on("keyup", function() {
        var value = $(this).val().toLowerCase();
        $("#datasetName").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    });

    function cancelConfirmation() {

        swal({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                buttons: {
                    red: {
                        text: "OK, Cancel",
                        value: "cancel"
                    },
                    green: {
                        text: "Resume Downloads",
                        value: "resume"
                    }
                },
            })
            .then((value) => {
                if (value == "resume") {
                    chrome.runtime.sendMessage({ message: "resume-download" });
                    swal({
                        title: "Resumed!",
                        text: "Downloads are now resumed!",
                        icon: "success",
                    })
                }
                if (value == "cancel") {
                    // data.progress = 0;
                    updateProgressBar(data.progress);
                    chrome.runtime.sendMessage({ message: "cancel-download" });
                    swal({
                        title: "Cancelled!",
                        text: "Your downloads have been cancelled!",
                        icon: "error"
                    })
                }
            });
    
    }

    chrome.storage.sync.get(['datasetName'], function(items) {
        datasetName = items.datasetName;
        if (datasetName) {
            if (datasetName.length > 45) {
                datasetName = datasetName.slice(0, 40) + '...';
                document.getElementById("datasetName").innerHTML = datasetName;
            }
        }
    });

}

function errorlogs(){

    const fileURL = document.URL;
    if (fileURL.substring(fileURL.lastIndexOf('/') + 1) == "errorlog.html"){

        (function getErrorLogs(){

            if (loggedErrors.length === data.failed.length){
                return;
            }

            for (let i = 0; i < data.failed.length; i++) {
                if(loggedErrors[data.failed[i].id] !== true){
                    logError(data.failed[i]);
                    loggedErrors[data.failed[i].id] = true;
                }
            }
        })();
    }

}

function logError(delta){
    chrome.downloads.search({
        id: parseInt(delta.id)
    }, (items) => {
        if (items.length != 0) {
            let granuleName = items[0].url;
            granuleName = granuleName.substring(granuleName.lastIndexOf('/') + 1);
            $('#errorLogBody').append('<tr><td>' + granuleName + '</td><td>' + delta.error.current + '</td></tr>');
        }
    });
}