let init = false;

let visiting = {};
let visited = {};
let windowIds = {};
let cancelledJobs = {};
let pausedJobs = {};

let downloadIds = [];
let downloadInterval = null;
let downloadLinks = [];

let interval = null;
let downloadNextBatchInterval = null;
let fetchCMRInterval = null;
let popupManager = null;
let path = '';
let directoryName = '';

let downloadData = {
    datasetName: null,
    downloadsInProgress: false,
    totalNoofFiles: 0,
    estimatedTotalNoofFiles: 0,
    update: function(request) {
        downloadData.datasetName = request.datasetName;
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

window.isInit = function() {
    return init;
};

function initDownload(request) {

    if (request.firstItr) {
        popupManager = new PopupManager();

        if (!downloadData.downloadsInProgress) {
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

        // beginDownload();

        while (loginLinks.length != 0) {
           
            onLoggedIn(loginLinks.pop(), () => {
                if (!downloadData.downloadsInProgress) { //if downloads are ongoing
                    beginDownload();
                    console.log("ongoing downloads");
                    downloadData.downloadsInProgress = true;
                }
            });
        }
    }).catch(err => console.error(err));

    downloadData.update(request);

}

function beginDownload() {

    lsManager.call(
            lsManager.getDownloadLinks()
        )
        .then((result) => {
            console.log(downloadLinks.length);
            if (
                (downloadLinks.lenth !== 0) &&
                (result[0] && result[0].length !== 0)
            ){
                downloadLinks = result[0];
            }

            if (downloadLinks && downloadLinks.length !== 0) {
                
                downloadInterval = setInterval(() => {
                    console.log("here");
                    if (downloadLinks.length !== 0) {
                        updateDownloadIds();
                        download(downloadLinks.shift());
                        console.log(downloadLinks.length);
                    } else {
                        beginDownload();
                        console.log("localStorage Cleared");
                        chrome.storage.local.clear(() => lsManager.initStorage());
                        clearInterval(downloadInterval);
                    }
                }, 1000);
            } else {
                console.log("localStorage Cleared");
                chrome.storage.local.clear(() => lsManager.initStorage());
                clearInterval(downloadInterval);
            }

        })
        .catch(err => {
            console.error(err);
        });
}

const onLoggedIn = (loginLink, callback) => {

    const baseLink = loginLink.match(/^(http)s?:\/\/.[^\/]*\//g)[0];

    if (windowIds[baseLink] && !visited[baseLink]) {
        chrome.tabs.query({
            windowId: windowIds[baseLink]
        }, (tabs) => {
            if (tabs.length == 0) {
                visiting[baseLink] = false;
            }
        });
    }

    if (!visited[baseLink] && visiting[baseLink]) {
        return;
    } else if (!visited[baseLink]) {

        visiting[baseLink] = true;

        chrome.windows.create({
            url: [loginLink],
            type: 'popup'
        }, (loginWindow) => {

            windowIds[baseLink] = loginWindow.id;

            function loginDownload(item) {
                chrome.downloads.cancel(item.id);
                visited[baseLink] = true;
                visiting[baseLink] = false;
                chrome.windows.remove(loginWindow.id);
                chrome.downloads.onCreated.removeListener(loginDownload);
                chrome.tabs.onUpdated.removeListener(granuleOpenedinBrowser);
                callback();
                // return true;
            }

            function granuleOpenedinBrowser(tabId, changeInfo, tab) {
                if (
                    tabId == loginWindow.tabs[0].id &&
                    tab.url == tab.title &&
                    tab.url == loginLink
                ) {
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

    } else {
        callback();
        // return true;
    }
};

window.addEventListener("ondownloadcomplete", function(e){
    // downloadData.downloadsInProgress = false;
    reset(true);
})

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    request.message = request.message.toLowerCase();

    if (typeof(request) === "object") {
        if (request.message == "start-download") {
            initDownload(request);
        } else if (request.message == "cancel-download") {
            cancelAll();
        } else if (request.message == "pause-download") {
            pauseAll();
        } else if (request.message == "resume-download") {
            resumeAll();
        } else if (request.message == "update-popup") {
            if (popupManager) {
                if(request.action && request.action == "post-progress"){
                    popupManager.postPogress();
                    
                }else if(request.action && request.action == "reset-popup"){
                    popupManager.reset(true);
                }                
            }
        } else if (request.message == "swal-fire") {
            closeSwal(sender);
        } else if (request.message == "update-granuleCount") {
            downloadData.totalNoofFiles = request.granuleCount;
            popupManager.updateGranuleCount(request.granuleCount);
        } else if (request.message == "download-completed") {
            reset(true);
        } else if (request.message == "check-urs-cookies"){
            popupLoginWindow(() => {
                chrome.tabs.sendMessage(
                    sender.tab.id,
                    {
                        message: "urs-cookies",
                        loggedIn: true
                    }
                )
            });
        } else if (request.message == "cmr"){
            fetchLinks(request.url, request.noOfGranules);
        }
    }

});

function closeSwal(sender) {

    chrome.downloads.onCreated.addListener(function sendSwalMessage() {
        chrome.tabs.sendMessage(
            sender.tab.id, { message: "clear-swal-fire" },
            function(response) {
                if (response.message == "swal-closed") {
                    chrome.downloads.onCreated.removeListener(sendSwalMessage);
                }
            });
    })

}

function download(downloadLink) {

    if(typeof(downloadLink) !== 'string'){
        return;
    }

    let filename = downloadLink.substring(downloadLink.lastIndexOf('/') + 1);
    let foldername = "Earthdata-BulkDownloads";
    chrome.storage.sync.get(['mainFolderName'], function(name) {
        if (name) {
            directoryName = name.mainFolderName;
        }
    });
    const dataSetname = downloadData.datasetName;
    if (directoryName) {
        path = directoryName + '/' + dataSetname + "/" + filename;
    } else {
        path = foldername + '/' + dataSetname + "/" + filename;
    }
    chrome.downloads.download({
        url: downloadLink,
        filename: path
    }, function(downloadId) {
        if (cancelledJobs[jobId]) {
            chrome.downloads.cancel(downloadId);
        } else if (pausedJobs[jobId]) {
            modifyDownload(downloadId, pause);
        }
        downloadIds[downloadId] = downloadLink;
    });
}

function modifyDownload(id, callback) {
    chrome.downloads.search({
        id: parseInt(id)
    }, (items) => {
        if (items.length != 0) {
            callback(items[0]);
        }
    });
}

function resume(item) {
    if (item.canResume == true) {
        chrome.downloads.resume(item.id);
    } else {
        if (item.paused == true) {
            chrome.downloads.cancel(item.id);
        }
    }
}

function pause(item) {
    if (item && item.state) {
        if (item.state == "in_progress") {
            chrome.downloads.pause(item.id);
        }
    }
}

function downloadNextBatch() {

    if (popupManager.getProgress() > 80) {
        getDownloadLinks();
    }
}

function pauseAll() {
    Object.keys(pausedJobs).forEach(jobId => {
        pausedJobs[jobId] = true;
    });

    let downloadKeys = Object.keys(downloadIds);

    for (let i of downloadKeys) {
        modifyDownload(i, pause);
    }

    // lsManager.putback(downloadLinks);
    
    clearInterval(downloadInterval);
}

function resumeAll() {
    Object.keys(pausedJobs).forEach(jobId => {
        pausedJobs[jobId] = false;
    });

    let downloadKeys = Object.keys(downloadIds);

    for (let i of downloadKeys) {
        modifyDownload(i, resume);
    }

    beginDownload();
}

function cancelAll() {

    Object.keys(cancelledJobs).forEach(jobId => {
        cancelledJobs[jobId] = true;
    });

    let downloadKeys = Object.keys(downloadIds);

    for (let i of downloadKeys) {
        chrome.downloads.cancel(parseInt(i));
    }

    reset();

}

function reset(all = false) {

    clearInterval(downloadInterval);
    chrome.storage.local.clear(() => lsManager.initStorage());

    visiting = {};
    visited = {};
    windowIds = {};

    downloadLinks = [];

    interval = null;
    fetchCMRInterval = null;
    downloadNextBatchInterval = null;

    // if (popupManager) {
    //     popupManager.reset(true);
    // }

    if (all) {
        totalJobs = 0;
        jobId = 0;
        cancelledJobs = {};
        pausedJobs = {};
        downloadIds = [];
        downloadData.reset();
        
    }
}

function updateDownloadIds() {
    totalJobs += 1;
    jobId = totalJobs;
    cancelledJobs[jobId] = false;
    pausedJobs[jobId] = false;
}

async function popupLoginWindow(callback){

    const loggedIn = await loggedInToURS();

    if(loggedIn){
        callback();
        return;
    }
    
    chrome.tabs.query({
        windowType: 'popup',
        url: "https://urs.earthdata.nasa.gov/"
    }, function (tabs){
        if(tabs.length !== 0){

            const pollLoggedInStatus = async () => {
                const loggedIn = await loggedInToURS();

                if(loggedIn){
                    if(tabs[0].id){
                        chrome.tabs.remove(tabs[0].id);
                    }
                    callback();
                }else{
                    setTimeout(pollLoggedInStatus, 1000);
                }
            }
            pollLoggedInStatus();
            
        }else{   
            chrome.windows.create({
                url: "https://urs.earthdata.nasa.gov/",
                type: 'popup'
            }, (loginWindow)=>{
                popupLoginWindow(callback);
            })
        }
    })
}

function loggedInToURS(){
    
    return new Promise(resolve =>{
        chrome.cookies.get({
            url: "https://urs.earthdata.nasa.gov/",
            name: "urs_user_already_logged"
        }, (cookie) =>{
            if(cookie && cookie.value == "yes"){
                resolve(true);
            }else{
                resolve(false);
            }
        })
    })       
}

function fetchLinks(cmrUrl, noOfGranules) {

    const page_size = 700;

    let granulesFetched = 0;
    let granuleCount = 0;
    let page = 1;
    let numberOfEntries = 0;
    let cmrUrlPaging;
    let cmrLinks = [];
    let itr = 0;

    const parseLinks = () => {
        if (granulesFetched < noOfGranules) {

            cmrUrlPaging = cmrUrl + [page];

            fetch(cmrUrlPaging)
                .then(res => res.json())
                .then((out) => {

                    let entries = out['feed']['entry'];
                    const dataSetName = "bulkDownloader_" + entries[0].dataset_id;

                    numberOfEntries = entries.length;
                    granuleCount += numberOfEntries;
                    if (numberOfEntries === 0) {
                        swal.fire("Empty Dataset", "Earthdata could not fing any granules for this search query. Please contact Earthdata Help Desk", "error");
                    }

                    let datasetName = out.feed.entry[0].dataset_id;

                    let loginLinks = [];


                    for (let i = 0; i < numberOfEntries; i++) {
                        cmrLinks[i] = out.feed.entry[i].links[0].href; //filters all the download link
                        if (itr == 0 && i < 10) { //first 10 link of a dataset
                            loginLinks.push(cmrLinks[i]);
                        }
                    }

                    lsManager.call(
                            lsManager.setItem(dataSetName, cmrLinks, "distinct"),
                            lsManager.setItem("bulkDownloader_loginLinks", loginLinks, "concat"),
                            lsManager.setItem("bulkDownloader_dataSets", dataSetName, "distinct")
                        )
                        .then(() => {
                            let firstItr = false;
                            if (itr == 0) {
                                lsManager.call(lsManager.setItem("bulkDownloader_currentDataSet", dataSetName, "overwrite"));
                                firstItr = true;
                            }

                            initDownload({
                                granuleCount: noOfGranules,
                                dataSetName: dataSetName,
                                datasetName: datasetName,
                                firstItr: firstItr,
                                number: numberOfEntries,
                                message: "start-download"
                            })

                            chrome.storage.sync.set({ 'datasetName': datasetName });

                        })

                })
                .catch(err => {
                    swal.close();
                    swal.fire({
                        title: 'Could not fetch the download links',
                        type: 'error'
                    });
                    throw err
                });

            granulesFetched = granulesFetched + page_size;
            page++;
        } else {
            //update granules count
            downloadData.totalNoofFiles = granuleCount;
            popupManager.updateGranuleCount(granuleCount);
            
            //clear download interval
            clearInterval(fetchCMRInterval);
            chrome.storage.local.get(null, item => console.log(item));
        }
    };
    parseLinks();
    fetchCMRInterval = setInterval(parseLinks, 60000);

}