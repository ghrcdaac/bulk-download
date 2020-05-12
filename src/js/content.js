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
        let temporalGranule = getUrlVars()["pg[0][qt]"] || getUrlVars()["pg[1][qt]"] || getUrlVars()["pg[2][qt]"]; //This is because of the inconsistency in the URL
        let polygon = getUrlVars()["polygon"];
        let rectangle = getUrlVars()["sb"];
        let point = getUrlVars()["sp"];
        let temporalGlobal = getUrlVars()["qt"];
        filter['concept_id'] = "?collection_concept_id=" + conceptId;
        filter['temporal'] = "&temporal[]=";
        filter['polygon'] = "&polygon=";
        filter['rectangle'] = "&bounding_box=";
        filter['point'] = "&point=";

        if (temporalGranule)
            filter['temporal'] = filter['temporal'] + temporalGranule;
        else if(temporalGlobal)
            filter['temporal'] = filter['temporal'] + temporalGlobal;


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
        let link = (baseUrl + filter['concept_id'] + filter['polygon'] + filter['rectangle'] + filter['point'] + filter['temporal'] + "&downloadable=true&page_size=700&page_num=");
        console.log("cmr link: ", link);
        return link;
    }

    function downloadFiles() {

        function beginDownload() {

            let downloadPopUp = swal.fire({
                title: 'Loading files for Download',
                showConfirmButton: false,
                timer: 3000
            });

            let url = window.location.href;
            let cmrUrl = getCmrQueryLink(url);
            let numberOfGranules = $(".button__badge.badge.badge-secondary").first().text();
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
            let cmrLinks = [];

            let downloadInterval = setInterval(() => {
                if (granulesFetched < noOfGranules) {

                    cmrUrlPaging = cmrUrl + [page];


                    fetch(cmrUrlPaging)
                        .then(res => res.json())
                        .then((out) => {

                            let entries = out['feed']['entry'];

                            numberOfEntries = entries.length;
                            if (numberOfEntries === 0) {
                                swal.fire("Empty Dataset", "Earthdata could not fing any granules for this search query. Please contact Earthdata Help Desk", "error");
                            }

                            //window.granulesFetched = window.granulesFetched + numberOfEntries;
                            for (let i = 0; i < numberOfEntries; i++) {
                                cmrLinks[i] = out.feed.entry[i].links[0].href; //filters all the download links
                            }

                            chrome.runtime.sendMessage({
                                links: cmrLinks,
                                number: numberOfEntries,
                                message: "start-download",
                            });


                        })
                        .catch(err => {
                            swal.fire({
                                title: 'Could not fetch the download links',
                                type: 'error'
                            });
                            throw err
                        });

                    granulesFetched = granulesFetched + 700;
                    page++;
                }
                else {
                    clearInterval(downloadInterval);
                }
            }, 1000);
        }

        beginDownload();

    }

    function addGranuleMutation() {
        let granulesMutation = $(".button__badge.badge.badge-secondary")[0];
        let updateButtonText = () => {
            if (document.getElementById("newBulkDownloadButton")) {
                let noOfGranules = $(".button__badge.badge.badge-secondary").first().text();
                $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All ' +
                    '<span class="button__badge badge badge-secondary" >' + noOfGranules + '</span>');
            }
        };

        //To check the change in number of granules
        let mutationObserver = new MutationObserver(function (mutations, mutationObserver) {
            mutations.forEach(function (mutation) {
                updateButtonText();
            });
        });

        mutationObserver.observe(granulesMutation, config); //Observes the mutation
        updateButtonText();
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
            button.className = "granule-results-actions__download-all";
            $(".granule-results-actions").append(button);

            //getting the granular data from the existing Download Now button
            let noOfGranules = $(".button__badge.badge.badge-secondary").first().text();
            let newButton = $("#newBulkDownloadButton");
            newButton.html('<i class="fa fa-download"></i> <span class="button__contents"> Bulk Download All </span> <span class="button__badge badge badge-secondary">' + noOfGranules + '</span>');
            newButton.css({ "border": "1px solid transparent", "margin": "1%", "background": "#2b7fb9", "padding": ".375rem .75rem", "color": "white"});

            //Function for a click listener on the New Bulk Download button
            $("#newBulkDownloadButton").click(function openWin() {
                downloadFiles();

            });

        }
    }
    
    let interval;
    function addMutation() {
        let buttonCount = $(".granule-results-actions__download-all").find("button").length;

        if (buttonCount === 1 ) {
            appendBulkDownloadButton();
            addGranuleMutation();
        }
    }

    interval = setInterval(addMutation, 1000);

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        console.log(request, sender, sendResponse);
    });
});