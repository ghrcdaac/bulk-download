let bgPage = chrome.extension.getBackgroundPage(); //Getting the variables from the background page

let idsOfDownload = [];
idsOfDownload = bgPage.ids;

for (let i of idsOfDownload) {
    console.log(i);
}

$('body').width(350); //increasing the page width of the popup window

//Creating Pause, Resume and Cancel All buttons

let pause = document.createElement("BUTTON");
document.body.appendChild(pause);
pause.id = "pause";
pause.className = "btn";
$("#pause").html('<i class="fa fa-pause-circle"></i> Pause All</button>');
$("#pause").click(function pause() {

    for (let i of idsOfDownload) {
        chrome.downloads.pause(i);
    }
});

let resume = document.createElement("BUTTON");   // Create a <button> element
document.body.appendChild(resume);
resume.id = "resume";
resume.className = "btn";
$("#resume").html('<i class="fa fa-play-circle"></i> Resume All</button> <br>');

$("#resume").click(function resume() {
    for (let i of idsOfDownload) {
        chrome.downloads.resume(i);
    }
});

let cancel = document.createElement("BUTTON");   // Create a <button> element
document.body.appendChild(cancel);
cancel.id = "cancel";
cancel.className = "btn";
$("#cancel").html('<i class="fa fa-stop-circle"></i> Cancel All</button>');
$("#cancel").click(function cancel() {
    for (let i of idsOfDownload) {
        chrome.downloads.cancel(i);
    }
});



