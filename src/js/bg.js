let init = false;

let visiting = {};
let visited = {};
let windowIds = {};
let cancelledJobs = {};
let pausedJobs = {};

let downloadIds = [];
let downloadInterval = null;

let interval = null;
let downloadNextBatchInterval = null;
let popupManager = null;

let downloadData ={
    downloadsInProgress: false,
    totalNoofFiles: 0,
    estimatedTotalNoofFiles: 0,
    update: function(request){
        downloadData.estimatedTotalNoofFiles = request.granuleCount;
        downloadData.totalNoofFiles =+ request.number;
        popupManager.updateGranuleCount(downloadData.totalNoofFiles);
    },
    reset: function() {
        downloadData.downloadsInProgress = false;
        downloadData.totalNoofFiles = 0;
        downloadData.estimatedTotalNoofFiles = 0;
    }
}

let totalJobs = 0;
let jobId = 0;

const lsManager = new LocalStorageManager();
lsManager.initStorage();

if ((new UAParser()).getBrowser().name === "Firefox") {
    chrome = browser;
}

window.isInit = function () {
    return init;
};

let initDownload = function (request) {

    // console.log("initDownload");

    if(request.firstItr){
        popupManager = new PopupManager(request.granuleCount)
        
        if(!downloadData.downloadsInProgress){
            lsManager.call(
                null,
                lsManager.setItem("bulkDownloader_currentDataSet", request.dataSetName)
            )
        }
    }

    lsManager.call(
        lsManager.getItem("bulkDownloader_loginLinks", true, true, false)
    ).then((result) => {
        let loginLinks = result[0];
        // console.log("loginlinks", loginLinks, result);
        while(loginLinks.length != 0){
            onLoggedIn(loginLinks.pop(), () =>{
                if(!downloadData.downloadsInProgress){ //if downloads are ongoing
                    beginDownload();
                    downloadData.downloadsInProgress = true;
                }
                // console.log("onLoggedIn callback")
            });
        }
    })

    downloadData.update(request);

};

function beginDownload(){
   
    lsManager.call(
        lsManager.getDownloadLinks()
    )
    .then((result) => {
        let downloadLinks = result[0];
        if(downloadLinks && downloadLinks.length !== 0){
            // console.log("my download Links");
            downloadInterval = setInterval(() =>{
                if(downloadLinks.length !== 0){
                    updateDownloadIds();
                    download(downloadLinks.shift());
                    // console.log('yess!!')
                }else{
                    beginDownload();
                }
            }, 1000);
        }else{
            clearInterval(downloadInterval);
            chrome.storage.local.clear(lsManager.initStorage);
            // console.log("All download links served");
        }

    })
    .catch(err =>{
        console.error(err);
    });
}

const onLoggedIn = (loginLink, callback) => {

    // console.log(loginLink);
    // const loginLink = getSingleLink();
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
                // return true;
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
                    // return true;
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

    }
    else{
        callback();
        // return true;
    }
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    request.message = request.message.toLowerCase();
    
    if (typeof (request) === "object") {
        if (request.message == "start-download") {               
            initDownload(request);
        }
        else if (request.message == "cancel-download") {
            pauseAll();
                  
           if(confirm("Are you sure you want to cancel downloads?")){
                cancelAll();
           }else{
                resumeAll();
           }
        }
        else if(request.message == "pause-download"){
            pauseAll();
        }
        else if(request.message == "resume-download"){
            resumeAll();
        }
        else if(request.message == "update-popup"){
            if(popupManager){
                popupManager.postPogress();
            }
        }
        else if(request.message == "swal-fire"){
            closeSwal(sender);
        }
        else if(request.message == "update-granuleCount"){
            downloadData.totalNoofFiles = request.granuleCount;
            popupManager.updateGranuleCount(request.granuleCount);
        }
        else if(request.message == "download-completed"){
            reset(true);
        }
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
            modifyDownload(downloadId, pause);
        }
        downloadIds[downloadId] = downloadLink;
    });
}

function handleUndefined(variable, callback){
    console.log(variable);
    if(variable === undefined || variable === "undefined"){
        setTimeout(handleUndefined, 1000);
    }
    else{
        callback();
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

function resume(item){
    if(item.canResume == true){
        chrome.downloads.resume(item.id);
    }else{
        if(item.paused == true){
            chrome.downloads.cancel(item.id);
            // pushSingleLink(item.url);
        }
    }
}

function pause(item){
    if (item && item.state){
        if(item.state == "in_progress"){
            chrome.downloads.pause(item.id);
        }
    }
}

function downloadNextBatch(){
            
    if(popupManager.getProgress() > 80){
        getDownloadLinks();
    }
}

function pauseAll(){
    Object.keys(pausedJobs).forEach(jobId => {
        pausedJobs[jobId] = true;
    });

    let downloadKeys = Object.keys(downloadIds);
    
    for (let i of downloadKeys) {
        modifyDownload(i, pause);
    }

    // clearInterval(downloadNextBatchInterval);
}

function resumeAll(){
    Object.keys(pausedJobs).forEach(jobId => {
        pausedJobs[jobId] = false;
    });

    let downloadKeys = Object.keys(downloadIds);
    
    for (let i of downloadKeys) {
        modifyDownload(i, resume);
    }

    beginDownload();
    // downloadNextBatchInterval = setInterval(downloadNextBatch, 1000);
}

function cancelAll(){

    Object.keys(cancelledJobs).forEach(jobId => {
        cancelledJobs[jobId] = true;
    });
    
    let downloadKeys = Object.keys(downloadIds);
    
    for (let i of downloadKeys) {
        chrome.downloads.cancel(parseInt(i));
    }

    reset();

    // clearInterval(interval);
    // clearInterval(downloadNextBatchInterval);
}

function reset(all=false){

    clearInterval(downloadInterval);
    downloadData.reset();
    chrome.storage.local.clear(() => lsManager.initStorage());
    
    visiting = {};
    visited = {};
    windowIds = {};

    interval = null;
    downloadNextBatchInterval = null;

    if(popupManager){
        popupManager.reset();
    }

    if(all){
        totalJobs = 0;
        jobId = 0;
        cancelledJobs = {};
        pausedJobs = {};
        downloadIds = [];
    }
}

function updateDownloadIds(){
    totalJobs += 1;
    jobId = totalJobs;
    cancelledJobs[jobId] = false;
    pausedJobs[jobId] = false;
}

// chrome.storage.onChanged.addListener((changes, areaname) => console.log(changes, areaname));
