console.log("Earth Data Bulk Downloader Extension has been set up!");


$(document).ready(function () {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        setTimeout(function () {
            let location = window.location.href;
            let baseUrl = "https://search.earthdata.nasa.gov/search/granules?";

            //appends the Bulk Download button only if the baseURL matches and does not exist already
            if (location.includes(baseUrl) && !document.getElementById("newBulkDownloadButton")) {
                //creates a new button element and the same class name is given as the existing Download Now Button
                let button = document.createElement("button");
                let text = document.createTextNode("Bulk Download All");
                button.appendChild(text);
                button.id = "newBulkDownloadButton";
                button.className = "button retrieve master-overlay-info-tooltip-big";
                jQuery(".master-overlay-global-actions, .actions").append(button);

                //getting the granular data from the existing Download Now button
                let noOfGranules = jQuery(".pill").first().text();
                $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All' + '<span class="pill">' + noOfGranules + '</span>');

            }


            let granulesMutation = jQuery(".pill")[0];

            let config = {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            };

            //To check the change in number of granules
            let mutationObserver = new MutationObserver(function (mutations, mutationObserver) {
                mutations.forEach(function (mutation) {
                    console.log("There is a Mutation in Granules");
                    if (document.getElementById("newBulkDownloadButton")) {
                        let noOfGranules = jQuery(".pill").first().text();
                        $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All ' +
                            '<span class="pill" >' + noOfGranules + '</span>');
                    }
                });
            });

            mutationObserver.observe(granulesMutation, config); //Observes the mutation

            let loginWindow = null;

            //Function when there is a click on the New Bulk Download button
            $("#newBulkDownloadButton").click(function openWin() {

                //Pops up the urs login window if the user is already not logged in
                if (!document.cookie.match(/^.*urs_user_already_logged=yes.*$/)) {
                    loginWindow = window.open('https://urs.earthdata.nasa.gov/', loginWindow, 'width=600,height=600');

                    window.setInterval(function () {
                        if (document.cookie.match(/^.*urs_user_already_logged=yes.*$/)) {
                            loginWindow.close();
                        }
                    }, 2000);
                }
                else if (document.cookie.match(/^.*urs_user_already_logged=yes.*$/)) {
                    sendDownloadLinksToBgPage();
                }
            });

            function sendDownloadLinksToBgPage(){
                let url = window.location.href;
                let conceptId = url.split('p=')[1].split('&')[0];

                let cmrUrl = 'https://cmr.earthdata.nasa.gov/search/granules.json?concept_id=' + conceptId + '&page_size=1000';
                console.log(cmrUrl);
                let xhttp = new XMLHttpRequest();
                let downloadLink = [];
                let numberOfEntries = 0;

                //Function to get the data in json format from the CMR data page using the conceptID
                xhttp.onreadystatechange = function () {
                    if (this.readyState == 4 && this.status == 200) {
                        let jsonData = JSON.parse(this.responseText);
                        let entries = jsonData['feed']['entry'];
                        console.log(entries.length);
                        numberOfEntries = entries.length;
                        for (let i = 0; i < numberOfEntries; i++) {
                            downloadLink[i] = jsonData.feed.entry[i].links[0].href; //filters all the download links
                            console.log(downloadLink[i]);
                        }
                        let message = {
                            text: downloadLink,
                            number: numberOfEntries
                        };
                        chrome.runtime.sendMessage(message); //send the download links as message to background page

                    }

                };
                xhttp.open("GET", cmrUrl, true);
                xhttp.send();
            }

        }, 1000);


    });
});