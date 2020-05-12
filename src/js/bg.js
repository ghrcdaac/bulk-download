let parser = new UAParser();
let visiting = {};
let visited = {};
let localStorageInUse = false;

function pushSingleLink(link){

    localStorageInUse = true;
    let downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
    downloadLinks.push(link);
    localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(downloadLinks)));
    localStorageInUse = false;
}

function getSingleLink(){

    localStorageInUse = true;
    let downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
    downloadLink = downloadLinks.shift();
    localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(downloadLinks)));
    localStorageInUse = false;

    return downloadLink;
}

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

downloadIds = [];
let downloadLinks = [];
let senderWindow = null;

let downloaderPopupId = null;

function createPopupDownloader() {
    let downloaderPopup = chrome.windows.create({
            url: chrome.runtime.getURL("html/downloader.html"),
            type: "popup",
            state: "minimized"
        },
        function (windowInfo) {
            downloaderPopupId = windowInfo.id;
        }
    );

    chrome.windows.onRemoved.addListener((windowId) => {
        if (downloaderPopupId == windowId) {
            downloaderPopupId = null;
        }
    });
}

let interval = null;
let blobURL = null;
let cancelledJobs = {};
let totalJobs = 0;
let jobId = 0;

let startDownload = function () {

    totalJobs += 1;
    jobId = totalJobs;

    cancelledJobs[jobId] = false;


    interval = setInterval(function () {

        if (!localStorageInUse){
            let downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
        
            if (downloadLinks !== undefined && downloadLinks !== null && downloadLinks !== "null" && downloadLinks.length !== 0) {
                downloadLink = downloadLinks.shift();
                localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(downloadLinks)));

                if (downloadLink !== undefined) {
                                    
                    download(downloadLink);
                }

            } else {
                visited = {};
                visiting = {};
                clearInterval(interval);
            }
        }

    }, 1000);

};

const onLoggedIn = (getSingleLink, callback) => {

    const loginLink = getSingleLink();
    const baseLink = loginLink.match(/^(http)s?:\/\/.[^\/]*\//g)[0];

    if(!visited[baseLink] && visiting[baseLink]){
        return;
    }
    else if(!visited[baseLink]){

        visiting[baseLink] = true;
        
        chrome.windows.create({
            url: [loginLink]
        }, (loginWindow)=>{
            chrome.downloads.onCreated.addListener(function loginDownload(item){
                chrome.downloads.cancel(item.id,
                    function(item){
                        console.log("deleting", item);
                    });
                pushSingleLink(loginLink);
                chrome.windows.remove(loginWindow.id);
                chrome.downloads.onCreated.removeListener(loginDownload);
                callback();
            });
        })
        
    }else{
        pushSingleLink(loginLink);
        callback();
    }

    
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
                
                onLoggedIn(getSingleLink, startDownload);
                
            }
        }
        else if (request.message == "cancel-download") {

            visited = {};
            visiting = {};
            
            localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify([])));

            Object.keys(cancelledJobs).forEach(jobId => {
                cancelledJobs[jobId] = true;
            });
            
            let downloadKeys = Object.keys(downloadIds);
            
            for (let i of downloadKeys) {
                chrome.downloads.cancel(parseInt(i));
            }

            localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify([])));
            clearInterval(interval);
        }
    }

});

function download(downloadLink){
                
    let filename = downloadLink.substring(downloadLink.lastIndexOf('/') + 1);

    chrome.downloads.download({
        url: downloadLink,
        filename: filename
    }, function (downloadId) {
        if (cancelledJobs[jobId]) {
            chrome.downloads.cancel(downloadId);
        } else {
            downloadIds[downloadId] = downloadLink;
        }
    });
}

chrome.downloads.onChanged.addListener(function (delta) {
    if (delta.state && delta.state.current === "complete") {
        console.log(`Download ${delta.id} has completed.`);
        URL.revokeObjectURL(downloadIds[delta.id]);
    }
});