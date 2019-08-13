console.log("Earth Data Bulk Downloader Extension has been set up!");

$(document).ready(function () {

    function getCmrFilters(url) {
        //Function to get CMR filter from EDS URL
        let decodedUrl = decodeURIComponent(url);

        function getUrlVars() {
            let vars = {};
            let parts = decodedUrl.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                vars[key] = value;
            });
            return vars;
        }

        let filter = [];
        let allConceptIds = getUrlVars()["p"];
        let conceptId = [];
        conceptId = jQuery.unique(allConceptIds.split("!"));
        let noOfDatasets = conceptId.length;
        let temporal = [];
        for (let i = 1; i <= noOfDatasets; i++)
            temporal[i - 1] = getUrlVars()["pg[" + i + "][qt]"];
        let polygon = getUrlVars()["polygon"];
        let rectangle = getUrlVars()["sb"];
        let point = getUrlVars()["sp"];
        for (let i = 0; i < noOfDatasets; i++) {
            filter[i] = {};
            filter[i]['temporal'] = "&temporal[]=";
            filter[i]['polygon'] = "&polygon=";
            filter[i]['rectangle'] = "&bounding_box=";
            filter[i]['point'] = "&point=";
            filter[i]['concept_id'] = "?collection_concept_id=" + conceptId[i];
            if (temporal[i])
                filter[i]['temporal'] = "&temporal[]=" + temporal[i];
            if (polygon)
                filter[i]['polygon'] = "&polygon=" + polygon;
            if (rectangle)
                filter[i]['rectangle'] = "&bounding_box=" + rectangle;
            if (point)
                filter[i]['point'] = "&point=" + point;
        }

        return filter;
    }

    function getCmrQueryLink(url) {
        // Function to get CMR link with appropriate filter
        let filter = [];
        filter = getCmrFilters(url);
        let noOfDatasets = filter.length;
        let baseUrl = "https://cmr.earthdata.nasa.gov/search/granules.json";
        let urls = [];
        for (let i = 0; i < noOfDatasets; i++) {
            urls[i] = baseUrl + filter[i]['concept_id'] + filter[i]['polygon'] + filter[i]['rectangle'] + filter[i]['point'] + filter[i]['temporal'] + "&page_size=700&page_num=";
        }
        return urls;
    }

    function download() {
        let downloadPopUp = swal.fire({
            title: 'Fetching download links from Earthdata CMR',
            showConfirmButton: false,
            timer: 3000
        });

        let url = window.location.href;
        let cmrUrls = [];
        cmrUrls = getCmrQueryLink(url);
        let noOfDatasets = cmrUrls.length;

        window.numberOfEntries = 0;
        let cmrUrlPaging = [];
        for (let i = 0; i < noOfDatasets; i++) {
            let page = 1;
            do {
                cmrUrlPaging[i] = cmrUrls[i] + page;
                console.log(cmrUrlPaging[i]);

                let downloadLink = [];

                fetch(cmrUrlPaging[i])
                    .then(res => res.json())
                    .then((out) => {

                        let entries = out['feed']['entry'];

                        numberOfEntries = entries.length;
                        if (numberOfEntries === 0) {
                            swal.fire("Empty Dataset", "Earthdata CMR returned no granules for this search query. Please contact Earthdata Help Desk", "error");
                        }

                        for (let i = 0; i < numberOfEntries; i++) {
                            downloadLink[i] = out.feed.entry[i].links[0].href; //filters all the download links
                        }

                        //downloadPopUp.close();

                        chrome.runtime.sendMessage({
                            links: downloadLink,
                            number: numberOfEntries,
                            message: "start-download",
                        }); //send the download links as message to background page

                    })
                    .catch(err => {
                        console.error("Error in fetching download links");
                        throw err
                    });

                page++;

            } while (numberOfEntries !== 0);
        }

    }

    function appendBulkDownloadButton() {
        let location = window.location.href;
        let baseUrl = "https://search.earthdata.nasa.gov/projects/";

        //appends the Bulk Download button only if the baseURL matches and does not exist already
        if (location.includes(baseUrl) && !document.getElementById("newBulkDownloadButton")) {
            //creates a new button element and the same class name is given as the existing Download Now Button
            let button = document.createElement("button");
            let text = document.createTextNode("Bulk Download All");
            button.appendChild(text);
            button.id = "newBulkDownloadButton";
            button.className = "button button-full button-download-data";
            $(".master-overlay-footer-actions").append(button);

            document.getElementById("newBulkDownloadButton").style = "background:#2b7fb9; margin-top: 5px;";

            //getting the granular data from the existing Download Now button
            $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All');


            //Function for a click listener on the New Bulk Download button

            $("#newBulkDownloadButton").click(function openWin() {


                //Pops up the urs login window if the user is already not logged in


                fetch("https://urs.earthdata.nasa.gov/profile")
                    .then((out) => {

                        //Pops up the urs login window if the user is already not logged in
                        if (out.url === "https://urs.earthdata.nasa.gov/home" && out.redirected === true) {
                            loginWindow = window.open('https://urs.earthdata.nasa.gov/', loginWindow, 'width=600,height=600');

                            let loginInterval = window.setInterval(function () {

                                if (document.cookie.match(/^.*urs_user_already_logged=yes.*$/)) {
                                    loginWindow.close();
                                    clearInterval(loginInterval);
                                    download();
                                }
                            }, 1000);
                        }
                        else {
                            download();
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

        if ($(".master-overlay-footer-actions").find(".button-full").length === 1) {
            clearInterval(interval);
            appendBulkDownloadButton();

        }
    }

    let interval = setInterval(addMutation, 1000);



});