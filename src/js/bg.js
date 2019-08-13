let parser = new UAParser();

if (parser.getBrowser().name === "Firefox") {
    chrome = browser;
}

let init = false;
window.isInit = function () {
    return init;
};

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    chrome.tabs.query({active: true}, function (tabs) {
    })
});

window.downloadIds = [];
let downloadLinks = [];
let senderWindow = null;

let downloaderPopupId = null;

function createPopupDownloader() {
    let downloaderPopup = chrome.windows.create({
            url: chrome.runtime.getURL("html/downloader.html"),
            type: "popup",
            // height: 10,
            //  width: 10,
            state: "minimized"
        },
        function (windowInfo) {
            downloaderPopupId = windowInfo.id;
            // chrome.runtime.sendMessage({ message: "begin-download" });
        }
    );

    chrome.windows.onRemoved.addListener((windowId) => {
        if (downloaderPopupId == windowId) {
            downloaderPopupId = null;
        }
    });
}

function getUrl(data, strFileName, strMimeType) {

    var self = window, // this script is only for browsers anyway...
        defaultMime = "application/octet-stream", // this default mime also triggers iframe downloads
        mimeType = strMimeType || defaultMime,
        payload = data,
        toString = function (a) {
            return String(a);
        },
        myBlob = (self.Blob || self.MozBlob || self.WebKitBlob || toString),
        blob,
        myBlob = myBlob.call ? myBlob.bind(self) : Blob;


    blob = payload instanceof myBlob ?
        payload :
        new myBlob([payload], {type: mimeType});

    if (self.URL) { // simple fast and modern way using Blob and URL:
        return self.URL.createObjectURL(blob);
    }

    return false;
}

let interval = null;
let blobURL = null;
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

                    blobURL = getUrl(x.response, filename);
                    
                    console.log(`Downloading ${blobURL}`);

                    chrome.downloads.download({
                        url: blobURL,
                        filename: filename,
                    }, function (downloadId) {                    
                        downloadIds[downloadId] = blobURL;
                    });


                };
                x.send();
            }

        } else {
            clearInterval(interval);
        }

    }, 1000);

};


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    senderWindow = sender;
    request.message = request.message.toLowerCase();
    if (typeof (request) === "object") {
        if (request.message == "start-download") {

            init = true;

            if (request.links !== undefined) {

                cmrLinks = request.links;

                let downloadLinks = [];

                try {
                    downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
                } catch (e) {
                    downloadLinks = [];
                }

                if (downloadLinks !== undefined && downloadLinks !== null && downloadLinks !== "null") {
                    Array.prototype.push.apply(cmrLinks, downloadLinks);
                }


                localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(cmrLinks)));
            }

            startDownload();

            /*
            //This method can be used when download API https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/downloads/download are not supported
            if (downloaderPopupId === null) {
              createPopupDownloader();
            } else {
              chrome.windows.get(
                downloaderPopupId,
                { populate: true },
                function (windowInfo) {
                  chrome.runtime.sendMessage({ message: "begin-download" });
                });
            }
          */

        }
        else if (request.message == "cancel-download") {

            let downloadKeys = Object.keys(downloadIds);
            for (let i of downloadKeys) {
                chrome.downloads.cancel(parseInt(i));
            }

            localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify([])));
            clearInterval(interval);
        }
    }

    /*
      var downloadUrl = "https://daac.ornl.gov/daacdata/global_climate/global_N_deposition_maps/data/NHx-deposition2050.txt";
      var downloading = browser.downloads.download({
        url : downloadUrl,
        method: 'GET',
        conflictAction : 'uniquify'
      });
      downloading.then(onStartedDownload, onFailed);

       chrome.downloads.download({url:"https://daac.ornl.gov/daacdata/global_climate/global_N_deposition_maps/data/NHx-deposition2050.txt"});

    */


});

chrome.downloads.onChanged.addListener(function (delta) {
    if (delta.state && delta.state.current === "complete") {
        console.log(`Download ${delta.id} has completed.`);
        URL.revokeObjectURL(downloadIds[delta.id]);
    }
});












