//change namespace for firefox
//chrome.* = browser.*
if((new UAParser()).getBrowser().name === 'Firefox'){
    chrome = browser;
}

chrome.storage.local.clear();
const downloadManager = new DownloadManager();
downloadManager.lsManager.init();

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) =>{

    if(chrome.runtime.lastError){
        throw chrome.runtime.lastError;
    }
    
    request.message = request.message.toLowerCase();

    if(request.message == 'setname'){
        downloadManager.setName(request.value);
    }

    if (typeof(request) !== "object") {
        console.error(request, "is not of type object");
        sendResponse({
            message: 'error',
            error: 'TypeError'
        })
        return;
    }

    if (request.message == "start-download") {
        downloadManager.init(request);

    } else if (request.message == "cancel-download") {
        downloadManager.cancelAll();
    } else if (request.message == "pause-download") {
        downloadManager.pauseAll();
    } else if (request.message == "resume-download") {
        downloadManager.resumeAll();
    } else if (request.message == "retry-download"){
        await downloadManager.authenticate(true);
        downloadManager.retry(); 
    } else if (request.message == "reload-extension"){
        const reloadContentScript = new Promise((resolve, reject) =>{
            chrome.tabs.query({
                url: "https://*.search.earthdata.nasa.gov/search/*"
            }, async (tabs) => {
                
                if(chrome.runtime.lastError){
                    console.error(chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }

                resolve(tabs);
            })
        })
        reloadContentScript
            .then(tabs => {
                if(tabs.length === 0){
                    chrome.runtime.reload();
                    return;
                }
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        message: "reload-extension"
                    })})
                    
                setTimeout(chrome.runtime.reload, 1000);

            })
            .catch(error => {throw error})
    } else if (request.message == "launch-aboutus-tab"){
        chrome.tabs.create({
            url: "popup/settings.html"
        })
    } else if (request.message == "log-errors"){
        window.open(chrome.runtime.getURL('popup/settings.html') + "#rightbox-errorLogs");
        
    }
    
    // re-visit in the future
    else if (request.message == "update-popup") {
        if (downloadManager.stats) {
            if(request.action && request.action == "post-progress"){
                downloadManager.stats.postPogress();
                
            }else if(request.action && request.action == "reset-popup"){
                downloadManager.stats.reset(true);
            }                
        }
    } else if (request.message == "swal-fire") {
        closeSwal(sender);
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
        downloadData.cmrUrl = request.url;
        fetchLinks(request.url, request.noOfGranules);
    }else if (request.message == "update-popup-cancel") {
        if (downloadManager.stats) {
          if(request.action && request.action == "reset-popup-cancel"){
                downloadManager.stats.resetCancel(true);
            }
        }
    }

});