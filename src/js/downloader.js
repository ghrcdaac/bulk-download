let bgPage = chrome.extension.getBackgroundPage();


let senderWindow = null;


let interval = null;
let startDownload = function () {

    interval = setInterval(function () {
        let downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));

        if (downloadLinks !== undefined && downloadLinks !== null && downloadLinks !== "null" && downloadLinks.length !== 0) {

            downloadLink = downloadLinks.shift();
          
            localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(downloadLinks)));

            if (downloadLink !== undefined) {

                let x = new XMLHttpRequest();
                x.open("POST", downloadLink, true);
                x.responseType = 'blob';

                let filename = downloadLink.substring(downloadLink.lastIndexOf('/') + 1);
                x.onload = function (e) {
                    console.log("downloading " + downloadLink);
                    download(x.response, filename);
                }
                x.send();
            }

        } else {
            clearInterval(interval);
        }

    }, 1000);

}
if (bgPage.isInit()) {
    startDownload();
}


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request, sender, sendResponse);

    senderWindow = sender;

    if (typeof (request) === "object") {
        request.message = request.message.toLowerCase();

        if (request.message === "begin-download") {
            clearInterval(interval);
            startDownload();

        }
        if (request.message === "pause-download") {
            if (interval === null) {
                clearInterval(interval);
            }
        }
        if (request.message === "resume-download") {
            if (interval === null) {
                startDownload();
            }
        }
        if (request.message === "cancel-download") {
            if (interval === null) {
                localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify([])));
                clearInterval(interval);
                window.close();
            }
        }
    }
});





