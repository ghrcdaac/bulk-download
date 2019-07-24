//sending a dummy message to activate the onMessage Listener of Content Script
//chrome.tabs.sendMessage(tab.id, "hello");
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete') {
        chrome.tabs.query({active: true}, function (tabs) {
            const msg = "Hello from background";
            chrome.tabs.sendMessage(tab.id, "hello");

        })
    }
});

//onMessage listener to receive the array of download links
//Chrome's downloads API works only in background page of extension and not in the content script

chrome.runtime.onMessage.addListener(receiver);

let downloadLinks = []; //Array to save each message from content script
window.noOfEntries = 0;
window.ids = [];

//message from content script is received in the first argument of the receiver function i.e. request
function receiver(request, sender, sendResponse) {

    downloadLinks = request.text;
    noOfEntries = request.number;
    console.log(noOfEntries);
    console.log(downloadLinks[0]);
    let i;

    chrome.storage.local.clear();
    for (i of downloadLinks) {
        chrome.downloads.download({url: i}, function (downloadId) {
            ids.push(downloadId);
        }); //Chrome's downloads API easily downloads all the granules
    }

    console.log(ids);

    //This links are stored in local storage so that these can be shown in the popup even after the browser is re-opened.

}













