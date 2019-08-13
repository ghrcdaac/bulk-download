console.log("Earth Data Bulk Downloader Extension has been set up!");

let parser = new UAParser();

$(document).ready(function () {

    let config = {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    };

    function getCmrFilters(url) {

        let decodedUrl = decodeURIComponent(url);

        function getUrlVars() {
            let vars = {};
            let parts = decodedUrl.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                vars[key] = value;
            });
            return vars;
        }

        let filter = {};
        let conceptId = getUrlVars()["p"];
        if (conceptId.indexOf("!") > 0) {
            conceptId = conceptId.substring(conceptId.lastIndexOf('!') + 1);
        }
        let temporal = getUrlVars()["pg[0][qt]"]; //this needs to be more dynamic in identifying correct index of the filter
        let polygon = getUrlVars()["polygon"];
        let rectangle = getUrlVars()["sb"];
        let point = getUrlVars()["sp"];
        filter['concept_id'] = "?collection_concept_id=" + conceptId;
        filter['temporal'] = "&temporal[]=";
        filter['polygon'] = "&polygon=";
        filter['rectangle'] = "&bounding_box=";
        filter['point'] = "&point=";

        if (temporal)
            filter['temporal'] = filter['temporal'] + temporal;
        if (polygon)
            filter['polygon'] = "&polygon=" + polygon;
        if (rectangle)
            filter['rectangle'] = "&bounding_box=" + rectangle;
        if (point)
            filter['point'] = "&point=" + point;
        return filter;
    }

    function getCmrQueryLink(url) {
        let filter = getCmrFilters(url);
        let baseUrl = "https://cmr.earthdata.nasa.gov/search/granules.json";
        return (baseUrl + filter['concept_id'] + filter['polygon'] + filter['rectangle'] + filter['point'] + filter['temporal'] + "&downloadable=true&page_size=700&page_num=");
    }

    function downloadPopUp() {
        let timerInterval;

    }

    function downloadFiles() {

        /*
        if(parser.getBrowser().name === "Firefox"){
            let image1URL = chrome.extension.getURL("images/firefox-download1.png");
            Swal.fire({
                type: 'warning',
                title: 'Please enable following settings in Firefox',
                html: `<p>Please make Firefox save this file type automatically </p><img style="height:300px; width: 300px;" src="${image1URL}" alt="download-option" height="500" width="500">`,
                showCloseButton: true,
                showCancelButton: true,
                confirmButtonText: 'Yes, I will do it!',
                cancelButtonText: 'No, cancel!',
                width: 600
                //timer: 2500
            }).then((result) => {
                if (result.value) {
                    beginDownload();
                }
    
            });
        }else{
            beginDownload();
        }
        */

        function beginDownload() {

            let downloadPopUp = swal.fire({
                title: 'Fetching download links from Earthdata CMR',
                showConfirmButton: false,
                timer: 3000
            });


            let url = window.location.href;
            let cmrUrl = getCmrQueryLink(url);
            let numberOfGranules = jQuery(".pill").first().text();
            let numberOfGranulesString = [];
            numberOfGranulesString = numberOfGranules.split(" ");

            let noOfGranules = 0;
            if (numberOfGranulesString[0].includes(",")) {
                noOfGranules = parseInt(numberOfGranulesString[0].replace(/,/g, ""));
            } else {
                noOfGranules = parseInt(numberOfGranulesString[0]);
            }

            let granulesFetched = 0;

            let page = 1;
            let numberOfEntries = 0;
            let cmrUrlPaging;

            do {
                cmrUrlPaging = cmrUrl + [page];
                console.log(cmrUrlPaging);

                let cmrLinks = [];

                fetch(cmrUrlPaging)
                    .then(res => res.json())
                    .then((out) => {

                        let entries = out['feed']['entry'];

                        numberOfEntries = entries.length;
                        if (numberOfEntries === 0) {
                            swal.fire("Empty Dataset", "Earthdata CMR returned no granules for this search query. Please contact Earthdata Help Desk", "error");
                        }

                        //window.granulesFetched = window.granulesFetched + numberOfEntries;


                        for (let i = 0; i < numberOfEntries; i++) {
                            cmrLinks[i] = out.feed.entry[i].links[0].href; //filters all the download links
                        }

                        //downloadPopUp.close();

                        chrome.runtime.sendMessage({
                            links: cmrLinks,
                            number: numberOfEntries,
                            message: "start-download",
                        });
                        downloadPopUp.close();

                    })
                    .catch(err => {
                        swal.fire({
                            title: 'Could not fetch download links from Earthdata CMR',
                            type: 'error'
                        });
                        throw err
                    });

                granulesFetched = granulesFetched + 700;
                page++;

            } while (granulesFetched < noOfGranules);

        }


        beginDownload();

    }


    function addGranuleMutation() {
        let granulesMutation = jQuery(".pill")[0];

        //To check the change in number of granules
        let mutationObserver = new MutationObserver(function (mutations, mutationObserver) {
            mutations.forEach(function (mutation) {
                if (document.getElementById("newBulkDownloadButton")) {
                    let noOfGranules = jQuery(".pill").first().text();
                    $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All ' +
                        '<span class="pill" >' + noOfGranules + '</span>');
                }
            });
        });

        mutationObserver.observe(granulesMutation, config); //Observes the mutation
    }

    function appendBulkDownloadButton() {
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
            document.getElementById("newBulkDownloadButton").style.background = '#2b7fb9';
            //getting the granular data from the existing Download Now button
            let noOfGranules = jQuery(".pill").first().text();
            $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All' + '<span class="pill">' + noOfGranules + '</span>');

            let loginWindow = null;

            //Function for a click listener on the New Bulk Download button

            $("#newBulkDownloadButton").click(function openWin() {
                fetch("https://urs.earthdata.nasa.gov/profile")
                    .then((out) => {

                        //Pops up the urs login window if the user is already not logged in
                        if (out.url === "https://urs.earthdata.nasa.gov/home" && out.redirected === true) {
                            loginWindow = window.open('https://urs.earthdata.nasa.gov/', loginWindow, 'width=600,height=600');

                            let loginInterval = window.setInterval(function () {

                                if (document.cookie.match(/^.*urs_user_already_logged=yes.*$/)) {
                                    loginWindow.close();
                                    clearInterval(loginInterval);
                                    downloadFiles();
                                }
                            }, 2000);
                        }
                        else {
                            downloadFiles();
                        }

                    })
                    .catch(err => {
                        console.error("Error in fetching Logged in status");
                        throw err
                    });


            });
        }
    }

    function addMutation() {
        let buttonCount = jQuery("#granule-list").find(".master-overlay-global-actions.actions").find("button").length;

        if (buttonCount === 1 && buttonCount !== 2) {
            appendBulkDownloadButton();
            addGranuleMutation();
            //clearInterval(interval);
        }
    }

    let interval = setInterval(addMutation, 1000);

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        console.log(request, sender, sendResponse);
    });
});