let bgPage = chrome.extension.getBackgroundPage(); //Getting the variables from the background page

let idsOfDownload = [];
idsOfDownload = bgPage.downloadIds;
console.log(idsOfDownload);
 
let cancel = document.createElement("button");
cancel.id = "cancel";
cancel.className = "btn";
cancel.innerHTML='<i class="fa fa-stop-circle"></i> Cancel All</button>';
document.body.appendChild(cancel);

$('body').width(350); 

setInterval(function(){

	let downloadString = LZString.decompress(localStorage.getItem('downloadLinks'));

    if(downloadString === "") return;

    let downloadLinks =  JSON.parse(downloadString);

    if (downloadLinks !== undefined && downloadLinks !== null && downloadLinks !== "null") {
        let status = `Total pending download: ${downloadLinks.length}`;
        jQuery("#download-status").html(status);
    }
    // if(downloadLinks.length===0){
    //     //$(pause).hide();
    //     //$(resume).hide();
    //     $(cancel).hide();
    // }else{
    //    // $(pause).show();
    //     //$(resume).show();
    //     $(cancel).show();
    // }
},1000);


/*
$(pause).click(function() {
    chrome.runtime.sendMessage({"message": "pause-download"});
});

$(resume).click(function () {
    chrome.runtime.sendMessage({"message": "start-download"});
}); */

$(cancel).click(function () {
    chrome.runtime.sendMessage({message: "cancel-download"});
});