let parser = new UAParser();

let visiting = {};
let visited = {};
let windowIds = {};
let cancelledJobs = {};

let localStorageInUse = false;
let init = false;

let downloadIds = [];
let downloadLinks = [];

let senderWindow = null;
let interval = null;

let totalMBytes = 0;
let totalJobs = 0;
let jobId = 0;

if (parser.getBrowser().name === "Firefox") {
    chrome = browser;
}

window.isInit = function () {
    return init;
};

let initDownload = function () {

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
                const downloadCompleted = () => {
                    chrome.downloads.search({
                        state : "in_progress"
                    },
                    (results) => {
                        if (results.length !== 0){
                            setTimeout(downloadCompleted, 5000);
                        }else{
                            totalMBytes = 0;
                        }
                    });
                }
            }
        }

    }, 1000);

};

const onLoggedIn = (getSingleLink, callback) => {

    const loginLink = getSingleLink();
    const baseLink = loginLink.match(/^(http)s?:\/\/.[^\/]*\//g)[0];

    if(windowIds[baseLink] && !visited[baseLink]){
        chrome.tabs.query({
            windowId: windowIds[baseLink]
        }, (tabs) => {
            console.log("Found You")
            if(tabs.length == 0){
                visiting[baseLink] = false;
            }
        });
    }

    if(!visited[baseLink] && visiting[baseLink]){
        return;
    }
    else if(!visited[baseLink]){

        visiting[baseLink] = true;

        chrome.windows.create({
            url: [loginLink],
            type: 'popup'
        }, (loginWindow)=>{

            windowIds[baseLink] = loginWindow.id;

            function loginDownload(item){
                chrome.downloads.cancel(item.id,
                    function(){
                        console.log("pop up download deleted");
                    });
                visited[baseLink] = true;
                visiting[baseLink] = false;
                chrome.windows.remove(loginWindow.id);
                chrome.downloads.onCreated.removeListener(loginDownload);
                chrome.tabs.onUpdated.removeListener(granuleOpenedinBrowser);
                callback();
            }

            function granuleOpenedinBrowser(tabId, changeInfo, tab){
                if (
                    tabId == loginWindow.tabs[0].id &&
                    tab.url == tab.title &&
                    tab.url == loginLink
                ){
                    visited[baseLink] = true;
                    chrome.windows.remove(loginWindow.id);
                    chrome.tabs.onUpdated.removeListener(granuleOpenedinBrowser);
                    chrome.downloads.onCreated.removeListener(loginDownload);
                    callback();
                }
            }

            chrome.downloads.onCreated.addListener(loginDownload);

            chrome.tabs.onUpdated.addListener(granuleOpenedinBrowser);
        })
        
        // chrome.windows.create({
        //     url: [loginLink]
        // }, (loginWindow)=>{
        //     chrome.downloads.onCreated.addListener(function loginDownload(item){
        //         chrome.downloads.cancel(
        //             function(item){
        //                 console.log("deleting loginDownload");
        //             });
        //         chrome.windows.remove(loginWindow.id);
        //         chrome.downloads.onCreated.removeListener(loginDownload);
        //         visited[baseLink] = true;
        //         callback();
        //     });
        // })
        
    }else{
        callback();
    }

    
};

// const onLoggedIn = (getSingleLink, callback) => {

//     const loginLink = getSingleLink();
//     const baseLink = loginLink.match(/^(http)s?:\/\/.[^\/]*\//g)[0];

//     const createPopUp = 
//         (new Promise(
//             () => {

//                 if(windowIds[baseLink]){
//                     let flag;
//                     chrome.tabs.query({
//                         windowId: windowIds[baseLink]
//                     }, (tabs) => {
//                         console.log("Found You")
//                        if(tabs.length !== 0){
//                            flag = true;
//                        }
//                     });
//                     return flag;
//                 }
                
//                 if(!visited[baseLink]){
                    
//                     chrome.windows.create({
//                         url: [loginLink],
//                         type: 'popup'
//                     }, (loginWindow)=>{
//                         console.log("recommend");
//                         windowIds[baseLink] = loginWindow.id;

//                         chrome.downloads.onCreated.addListener(function loginDownload(item){
//                             console.log(item);
//                             chrome.downloads.cancel(item.id,
//                                 function(){
//                                     console.log("pop up download deleted");
//                                 });
//                             visited[baseLink] = true;
//                             chrome.windows.remove(loginWindow.id);
//                             chrome.tabs.onUpdated.removeListener(granuleOpenedinBrowser);
//                         });

//                         chrome.tabs.onUpdated.addListener(function granuleOpenedinBrowser(tabId, changeInfo, tab){
//                             if (
//                                 tabId == loginWindow.tabs[0].id &&
//                                 tab.url == tab.title &&
//                                 tab.url == loginLink
//                             ){
//                                 visited[baseLink] = true;
//                                 chrome.windows.remove(loginWindow.id);
//                                 chrome.tabs.onUpdated.removeListener(granuleOpenedinBrowser);
//                             }
//                         })
//                         return true;
//                     })
//                 }
//                 else{
//                     return true;
//                 }
//             }
//         )).then(
//             (auth) => {
//                 console.log("yellow")
//                 if(auth){
//                     console.log("callback");
//                     callback();
//                 }
//             }
//         ).catch((err) =>{
//             console.error(err);
//         })
// };

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    senderWindow = sender;
    request.message = request.message.toLowerCase();
    if (typeof (request) === "object") {
        if (request.message == "start-download") {

            totalMBytes += request.totalMBytes;

            // chrome.runtime.sendMessage({
            //     sender: "background",
            //     recipient: "popup",
            //     totalMBytes: totalMBytes
            // });

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
                
                onLoggedIn(getSingleLink, initDownload);
                
            }
        }
        else if (request.message == "cancel-download") {

            totalMBytes = 0;
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

chrome.downloads.onChanged.addListener(function (delta) {
    if (delta.state && delta.state.current === "complete") {
        console.log(`Download ${delta.id} has completed.`);
        URL.revokeObjectURL(downloadIds[delta.id]);
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

// function pushSingleLink(link){

//     localStorageInUse = true;
//     let downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
//     downloadLinks.push(link);
//     localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(downloadLinks)));
//     localStorageInUse = false;
// }

function getSingleLink(){

    localStorageInUse = true;
    let downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
    downloadLink = downloadLinks.shift();
    downloadLinks.push(downloadLink);
    localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(downloadLinks)));
    localStorageInUse = false;

    return downloadLink;
}