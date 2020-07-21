let data = {
    totalNoofFiles: 0,
    completed: 0,
    in_progress: 0,
    interrupted: 0,
    progress: 0,
    failed:[]
};
updatePopup();

$(document).ready(function(){
    updatePopup();
});

function updateProgressBar(progress) {
    let element = document.getElementById('progress_bar');
    element.style.width = parseInt(progress) + '%';
    element.innerHTML = parseInt(progress)  + '%';
}

chrome.runtime.onMessage.addListener( function(message, sender, sendMessage){
    if( 
        typeof (message) === "object" &&
        message.message == "update-popup-progress"
    ){
        data = message.data;
        console.log(data);
        updateProgressBar(data.progress);
    }
});

function updatePopup(){
    if (data.progress >= 100){
        data.progress = 0;
    }else{
        chrome.runtime.sendMessage({
            message: "update-popup"
        });
    }     
    
}

$(cancel).click(function () {
    
    chrome.runtime.sendMessage({message: "cancel-download"});
    // chrome.runtime.sendMessage({message: "pause-download"});
    // (() => {
    //     Swal.fire({
    //         title: 'Are you sure?',
    //         text: "You won't be able to revert this!",
    //         type: 'warning',
    //         showCancelButton: true,
    //         confirmButtonColor: '#3085d6',
    //         cancelButtonColor: '#d33',
    //         confirmButtonText: 'Resume'
    //       }).then((result) => {
    //         if (result.value) {
    //             chrome.runtime.sendMessage({message: "resume-download"});
    //             Swal.fire(
    //                 'Resume',
    //                 'Your downloads has been resumed.',
    //                 'success'
    //             )
    //         }else{
    //             data.progress = 0;
    //             updateProgressBar(data.progress);
    //             chrome.runtime.sendMessage({message: "cancel-download"});
    //             Swal.fire(
    //                 'Cancelled',
    //                 'Your downloads has been canceled.',
    //                 'success'
    //             )
    //         }
    //       })
    // })(); 

});
$(pause).click(function () {
    chrome.runtime.sendMessage({message: "pause-download"});
});
$(resume).click(function () {
    chrome.runtime.sendMessage({message: "resume-download"});
});