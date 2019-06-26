//sending a dummy message to activate the onMessage Listener of Content Script
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete') {
        chrome.tabs.query({active: true}, function (tabs) {
            const msg = "Hello from background";
            chrome.tabs.sendMessage(tabs[0].id, {"message": msg});

        })
    }
});

//onMessage listener to receive the array of download links
//Chrome's downloads API works only in background page of extension and not in the content script

chrome.runtime.onMessage.addListener(receiver);

let downloadLinks = []; //Array to save each message from content script
window.noOfEntries = 0;

//message from content script is received in the first argument of the receiver function i.e. request
function receiver(request, sender, sendResponse) {
    downloadLinks = request.text;
    noOfEntries = request.number;
    console.log(noOfEntries);
    for (let i = 0; i < noOfEntries; i++) {
        chrome.downloads.download({url: downloadLinks[i]}); //Chrome's downloads API easily downloads all the granules

        //This links are stored in local storage so that these can be shown in the popup even after the browser is re-opened.
        chrome.storage.local.set({list: downloadLinks}, function () {
            console.log("Granular links were stored in local storage of the browser");
        });
    }
}








