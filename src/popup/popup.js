let data = {
    stats: {
        totalNoofFiles: 0,
        completed: 0,
        in_progress: 0,
        interrupted: 0,
        progress: 0,
        failed: []
    },
    loggedErrors: {},
    state: "idle"
}

let datasetName = 'Sample name';
let clearDatasetName = 'No Downloads in Progress';

updatePopup();

$(document).ready(function() {
    // updatePopup();
    const fileURL = document.URL

    if(fileURL.substring(fileURL.lastIndexOf('/') + 1) == "popup.html"){
        popup();
    }
    
    if (fileURL.match(/(settings.html)/g)){
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
    if (data.stats.progress >= 100) {
        data.stats.progress = 0;
    } else {
        chrome.runtime.sendMessage({
            message: "update-popup",
            action: "post-progress"
        });
    }

}

function updateErrorLogLink(override = false){
    if(override || data.stats.failed.length === 0){

        $("#errorLogLink").hover(function(){
            $(this).css("cursor", "auto")
        });

        $("#errorLogLink").css({
            "color": "null",
            "text-decoration": "null"
        })

        $("#errorLogLink").prop("click", null).off("click");
    }else{

        // $("#errorLogLink").removeAttr("disabled");
        $("#errorLogLink").hover(function(){
            $(this).css("cursor", "pointer")
        });

        $("#errorLogLink").css({
            "color": "#1f70a3",
            "text-decoration": "underline"
        })
        
        $("#errorLogLink").prop("click", null).off("click");

        $("#errorLogLink").click(() =>{
            chrome.runtime.sendMessage({
                message: "log-errors"
            })
            
        });

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
        data.stats = message.data;
        updateDownloadStats(data.stats);
        errorlogs();
    }
});

function popup(){

    updateErrorLogLink();

    $("#cancel").click(function() {
        // chrome.runtime.sendMessage({ message: "cancel-download" });
        chrome.runtime.sendMessage({ message: "pause-download" });
        cancelConfirmation();
    });
    $("#pause").click(function() {
        chrome.runtime.sendMessage({ message: "pause-download" });
    });
    $("#resume").click(function() {
        chrome.runtime.sendMessage({ message: "resume-download" });
    });
    $("#retry").click(function(){
        chrome.runtime.sendMessage({ message: "retry-download" });
    })
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
            });
    });
    $(reload).click(function() {
        swal({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            buttons: {
                red: {
                    text: "Reload Extension",
                    value: true
                },
                green: {
                    text: "Cancel",
                    value: false
                }
            },
        })
        .then((value) => {
            if (value) {
                swal({
                    title: "See you!",
                    text: "Reloadling the Extension",
                    icon: "success",
                })
                chrome.runtime.sendMessage({ message: "reload-extension" });

            }else{
                swal({
                    title: "Cancelled!",
                    text: "Extension not reloaded",
                    icon: "error"
                })
            }
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
    $(aboutUs).click(function() {
        chrome.runtime.openOptionsPage()
    })
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
                    // data.stats.progress = 0;
                    updateProgressBar(data.stats.progress);
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
        if (!items) return;
        let datasetName = items.datasetName;
        if (datasetName?.length > 45) {
            datasetName = datasetName.slice(0, 40) + '...';
            document.getElementById("datasetName").innerHTML = datasetName;
        }
    });

    // async function changeButtons(){

    //     function showButton(...button){
    //         $("btn").hide();
            
    //         if(button.length !== 0){
    //             button.forEach(btn => {
                    
    //                 if (typeof btn == "string"){
    //                     if(btn[0] !== '#'){
    //                         btn = '#' + btn;
    //                     }
    //                     $(btn).show();
    //                 }else{
    //                     throw `${btn} is not a string!`
    //                 }
    //             })
    //         }
    //     }
    //     const state =  await lsManager.get(state);
    //     if(state === "idle"){
    //         //hide all buttons
    //         showButton();
    //     }else if (state === "downloading"){
    //         //show cancel and pause buttons
    //         showButton("cancel", "pause");
    //     }else if (state === "paused"){
    //         //show cancel and resume buttons
    //         showButton("cancel", "resume");
    //     }else if(state === "disconnected"){
    //         //show cancel and retry button
    //         showButton("cancel", "retry")
    //     }
    // }
}

function errorlogs(){

    const fileURL = document.URL;
    if (fileURL.match(/(settings.html)/g)){

        (function getErrorLogs(){

            if (data.loggedErrors.length === data.stats.failed.length){
                return;
            }

            for (let i = 0; i < data.stats.failed.length; i++) {
                if(data.loggedErrors[data.stats.failed[i].id] !== true){
                    logError(data.stats.failed[i]);
                    data.loggedErrors[data.stats.failed[i].id] = true;
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