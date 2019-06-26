let bgPage = chrome.extension.getBackgroundPage(); //Getting the variables from the background page
let number = bgPage.noOfEntries; //The number of entries in the CMR data page
console.log(number);

let downloadLinks = []; //Array to store all the links to download the granules
let granuleFileName = []; //Array to save the file names of granules

//$('body').height(800);
$('body').width(200); // Adjusting the width of the extension's popup window


//Retrieving the data stored in the browser's local storage using the get method
chrome.storage.local.get({
        list: []
    },
    function (data) {
        downloadLinks = data.list;

        for (let i = 0; i < number; i++) {
            granuleFileName[i] = downloadLinks[i].split('/')[7]; //getting the exact file name using split

            //creating a new div element for each granule downloaded
            let divElement = document.createElement('div');
            divElement.innerHTML = '<div id="box' + i + '"  style="border: 1px solid #666; padding: 10px; background-color: #ccc;">' + granuleFileName[i] + '<br><button class="button"></button></div>';
            document.body.appendChild(divElement);
            console.log(granuleFileName[i]);

            //appending a css made pause/play button to the above created div
            let pausePlayButton = $(".button");
            pausePlayButton.click(function () {
                pausePlayButton.toggleClass("paused");
                return false;
            });

        }

    }
);
