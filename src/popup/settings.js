$(document).ready(() => {
    
    if(window.location.hash){
        const hash = window.location.hash.substring(1);
        const hashNode = document.getElementById(hash);
        
        if(!hashNode){
            tabs(0);
            return;
        }

        document.querySelectorAll(".tabShow").forEach(function(node) {
            node.style.display = "none";
        });

        hashNode.style.display = "flex";
        if($("#" + hash.substring(hash.lastIndexOf('-') + 1))){
            $("#" + hash.substring(hash.lastIndexOf('-') + 1)
            ).addClass("active").siblings().removeClass("active");
        }


    }else{
        tabs(0);
    }

})

function tabs(panelIndex) {
    const tab = document.querySelectorAll(".tabShow");

    tab.forEach(function(node) {
        node.style.display = "none";
    });

    tab[panelIndex].style.display = "flex";
}

$("#aboutUs").click(function(){
    console.log('haha');
    tabs(0);
})

$("#errorLogs").click(function(){
    tabs(1);
})

$(".tab").click(function() {
    $(this).addClass("active").siblings().removeClass("active");
})

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){

});
