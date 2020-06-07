let parser = new UAParser();
let init = false;

let visiting = {};
let visited = {};
let windowIds = {};
let cancelledJobs = {};
let pausedJobs = {};

let downloadIds = [];
let downloadLinks = [];

let senderWindow = null;
let interval = null;

let downloadData ={
    startTime: null,
    totalNoofFiles: 0,
    totalMBytes: 0
}

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
    pausedJobs[jobId] = false;

    interval = setInterval(parseDownloadLinks, 1000);

};

function parseDownloadLinks () {

        
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
        // const downloadCompleted = () => {
        //     chrome.downloads.search({
        //         state : "in_progress"
        //     },
        //     (results) => {
        //         if (results.length !== 0){
        //             setTimeout(downloadCompleted, 5000);
        //         }else{
        //             totalMBytes = 0;
        //         }
        //     });
        // }
    }
    

}

const onLoggedIn = (getSingleLink, callback) => {

    const loginLink = getSingleLink();
    const baseLink = loginLink.match(/^(http)s?:\/\/.[^\/]*\//g)[0];

    if(windowIds[baseLink] && !visited[baseLink]){
        chrome.tabs.query({
            windowId: windowIds[baseLink]
        }, (tabs) => {
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
                chrome.downloads.cancel(item.id);
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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    senderWindow = sender;
    request.message = request.message.toLowerCase();
    if (typeof (request) === "object") {
        if (request.message == "start-download") {

            downloadData.totalMBytes += request.totalMBytes;
            downloadData.totalNoofFiles += request.number;
            
            //only in the first iteration
            if(downloadData.startTime === null){
                downloadData.startTime = request.startTime;
                // updatePopup.updatePopup(true);
            }

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

            visited = {};
            visiting = {};

            downloadData ={
                startTime: null,
                totalNoofFiles: 0,
                totalMBytes: 0
            }
            
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
            updatePopup.clear();
        }
        else if(request.message == "pause-download"){

            const pausedLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
            localStorage.setItem('pausedLinks', LZString.compress(JSON.stringify(pausedLinks)));
            localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify([])));

            Object.keys(pausedJobs).forEach(jobId => {
                pausedJobs[jobId] = true;
            });

            let downloadKeys = Object.keys(downloadIds);
            
            for (let i of downloadKeys) {
                modifyDownload(i, pauseDownload);
            }

            clearInterval(interval);
        }
        else if(request.message == "resume-download"){

            const pausedLinks = JSON.parse(LZString.decompress(localStorage.getItem('pausedLinks')));
            localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(pausedLinks)));
            localStorage.setItem('pausedLinks', LZString.compress(JSON.stringify([])));

            Object.keys(pausedJobs).forEach(jobId => {
                pausedJobs[jobId] = false;
            });

            let downloadKeys = Object.keys(downloadIds);
            
            for (let i of downloadKeys) {
                modifyDownload(i, resumeDownload);
            }

            interval = setInterval(parseDownloadLinks, 1000);
        }
        else if(request.message == "update-popup"){
            updatePopup.postPogress();
            updatePopup.updatePopup();
        }
        else if(request.message == "swal-fire"){
            closeSwal(sender);
        }
    }

});

chrome.downloads.onChanged.addListener(function (delta) {

    if (delta.state && delta.state.current === "complete") {
        console.log(`Download ${delta.id} has completed.`);
        URL.revokeObjectURL(downloadIds[delta.id]);
    }
});

function closeSwal(sender){

    chrome.downloads.onCreated.addListener(function sendSwalMessage(){
        chrome.tabs.sendMessage(
            sender.tab.id,
            {message: "clear-swal-fire"},
            function(response) {
                if(response.message == "swal-closed"){
                    chrome.downloads.onCreated.removeListener(sendSwalMessage);
                }
            });
    })
       
}

function download(downloadLink){
                
    let filename = downloadLink.substring(downloadLink.lastIndexOf('/') + 1);

    chrome.downloads.download({
        url: downloadLink,
        filename: filename
    }, function (downloadId) {
        if (cancelledJobs[jobId]) {
            chrome.downloads.cancel(downloadId);
        }
        else if(pausedJobs[jobId]){
            modifyDownload(downloadId, pauseDownload);
        }
        downloadIds[downloadId] = downloadLink;
    });
}

function getSingleLink(){

    let downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
    downloadLink = downloadLinks.shift();
    downloadLinks.push(downloadLink);
    localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(downloadLinks)));

    return downloadLink;
}

function pushSingleLink(link){
    let downloadLinks = JSON.parse(LZString.decompress(localStorage.getItem('downloadLinks')));
    downloadLinks.push(link);
    localStorage.setItem('downloadLinks', LZString.compress(JSON.stringify(downloadLinks)));
}

let updatePopup = {
    data: {
        startTime: null,
        totalNoofFiles: 0,
        totalMBytesRequested: 0,
        totalMBytesRecieved: 0,
        totalMBytesLost: 0,
        ids: {}
    },
    interval: null,
    clear: function (){
        updatePopup.data = {
            startTime: null,
            totalNoofFiles: 0,
            totalMBytesRequested: 0,
            totalMBytesRecieved: 0,
            totalMBytesLost: 0,
            ids: {}
        }

        if(updatePopup.interval !== null){
            clearInterval(updatePopup.interval);
        }
    },
    updatePopup: function (interval = false){
        const MB = 1024*1024;

        updatePopup.data.startTime = downloadData.startTime;

        function calcProgress(){

            updatePopup.data.totalNoofFiles = downloadData.totalNoofFiles;
            updatePopup.data.totalMBytesRequested = downloadData.totalMBytes;

            if(updatePopup.data.totalMBytesRequested > 0){
                chrome.downloads.search({
                    startedAfter: updatePopup.data.startTime
                }, items => {
                    items.forEach((item) => {
        
                        if( item.state == "complete" &&
                            // updatePopup.data.ids &&
                            !updatePopup.data.ids[item.id]
                        ){
                            updatePopup.data.ids[item.id] = true;
                            updatePopup.data.totalMBytesRecieved += parseInt(item.bytesReceived/MB);
                        }else if (  
                            item.state == "interrupted" &&
                            // updatePopup.data.ids &&
                            !updatePopup.data.ids[item.id]
                        ) {
                            updatePopup.data.ids[item.id] = true;
                            updatePopup.data.totalMBytesRecieved += parseInt(item.bytesReceived/MB);
                            updatePopup.data.totalMBytesLost +=
                                    parseInt((item.totalBytes - item.bytesReceived)/MB);
                        }
                    });

                    updatePopup.postPogress();
        
                });
            }

            // if(updatePopup.data.ids.length == updatePopup.data.totalNoofFiles){
                //     updatePopup.clear();

                // // clearInterval(updatePopup.interval);
                // // updatePopup.data = {
                // //     startTime: null,
                // //     totalMBytesRequested: 0,
                // //     totalMBytesRecieved: 0,
                // //     totalMBytesLost: 0,
                // //     ids: {}
                // // }
            // }
        }

        function pollProgress(){
            updatePopup.interval = setInterval(calcProgress, 10000);
        }


        if (!interval){
            return calcProgress();
        }else{
            return pollProgress();
        }
        
    },
    postPogress: function(){
        let progress = 0;
        if(updatePopup.data.totalMBytesRequested > 0 && updatePopup.data.totalMBytesRequested != updatePopup.data.totalMBytesLost){
            progress = parseInt((updatePopup.data.totalMBytesRecieved * 100)/(updatePopup.data.totalMBytesRequested - updatePopup.data.totalMBytesLost));
            if (progress > 100){
                progress == 100;
            }
        }

        chrome.runtime.sendMessage({
            message: "update-popup-progress",
            progress: progress
        })
    }
}

function modifyDownload(id, callback){
    chrome.downloads.search(
        {
            id: parseInt(id)
        }, (items) => {
            if (items.length != 0){
                callback(items[0]);
            }
        }
    );
}

function resumeDownload(item){
    if(item.canResume == true){
        chrome.downloads.resume(item.id);
    }else{
        if(item.paused == true){
            chrome.downloads.cancel(item.id);
            pushSingleLink(item.url);
        }
    }
}

function pauseDownload(item){
    if (item && item.state){
        if(item.state == "in_progress"){
            chrome.downloads.pause(item.id);
        }
    }
}
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