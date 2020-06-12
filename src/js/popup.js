let bgPage = chrome.extension.getBackgroundPage(); //Getting the variables from the background page

let idsOfDownload = [];
idsOfDownload = bgPage.downloadIds;
console.log(idsOfDownload);

$('body').height(150);
//window.resizeBy('300px', '100 px');

// setInterval(function() {

//     let downloadString = LZString.decompress(localStorage.getItem('downloadLinks'));

//     if (downloadString === "") return;

//     let downloadLinks = JSON.parse(downloadString);

//     if (downloadLinks !== undefined && downloadLinks !== null && downloadLinks !== "null") {
//         let status = `Pending download: ${downloadLinks.length}`;
//         jQuery("#download-status").html(status);
//     }
//     // if(downloadLinks.length===0){
//     //     //$(pause).hide();
//     //     //$(resume).hide();
//     //     $(cancel).hide();
//     // }else{
//     //    // $(pause).show();
//     //     //$(resume).show();
//     //     $(cancel).show();
//     // }
// }, 1000);


/*
$(pause).click(function() {
    chrome.runtime.sendMessage({"message": "pause-download"});
});

$(resume).click(function () {
    chrome.runtime.sendMessage({"message": "start-download"});
}); */

$(cancel).click(function() {
    chrome.runtime.sendMessage({ message: "cancel-download" });
});