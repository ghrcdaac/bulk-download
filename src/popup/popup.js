let progress;

$(document).ready(function(){

    let updatePopupInterval;

    function updatePopup(){
        
        chrome.runtime.sendMessage({
            message: "update-popup"
        });

        if(progress >= 100){
            progress = 0;
            clearInterval(updatePopupInterval);
        }

    }

    setInterval(updatePopup, 2000);
    
});

function updateProgressBar(progress) {
    let element = document.getElementById('progress_bar');
    element.style.width = parseInt(progress) + '%';
    element.innerHTML = parseInt(progress)  + '%';
}

$(cancel).click(function () {
    progress = 0;
    updateProgressBar(progress);
    chrome.runtime.sendMessage({message: "cancel-download"});
});
$(pause).click(function () {
    chrome.runtime.sendMessage({message: "pause-download"});
});
$(resume).click(function () {
    chrome.runtime.sendMessage({message: "resume-download"});
});

chrome.runtime.onMessage.addListener(
    function(message, sender, sendMessage){
        if( 
            typeof (message) === "object" &&
            message.message == "update-popup-progress"
        ){

            progress = message.progress;
            updateProgressBar(progress);
        }
    }
);
