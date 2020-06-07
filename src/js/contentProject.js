let totalMBytes = 0;

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

        conceptId = allConceptIds.split("!");


        let noOfDatasets = conceptId.length - 1;
        let temporal = [];
        for (let i = 1; i <= noOfDatasets; i++) {
            temporal[i - 1] = getUrlVars()["pg[" + i + "][qt]"];
        }
        let temporalGlobal = getUrlVars()["qt"];
        let polygon = getUrlVars()["polygon"];
        let rectangle = getUrlVars()["sb"];
        let point = getUrlVars()["sp"];
        for (let i = 0; i < noOfDatasets; i++) {

            filter[i] = {};
            filter[i]['temporal'] = "&temporal[]=";
            filter[i]['polygon'] = "&polygon=";
            filter[i]['rectangle'] = "&bounding_box=";
            filter[i]['point'] = "&point=";
            filter[i]['concept_id'] = "?collection_concept_id=" + conceptId[i+1];
            if (temporal[i]) //granule filter
            {
                filter[i]['temporal'] = "&temporal[]=" + temporal[i];
            }
            else if(temporalGlobal){
                filter[i]['temporal'] =  "&temporal[]=" + temporalGlobal;
            }

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
        let noOfDatasets = filter.length;;
        let baseUrl = "https://cmr.earthdata.nasa.gov/search/granules.json";
        let urls = [];
        for (let i = 0; i < noOfDatasets; i++) {
            urls[i] = baseUrl + filter[i]['concept_id'] + filter[i]['polygon'] + filter[i]['rectangle'] + filter[i]['point'] + filter[i]['temporal'] + "&page_size=700&page_num=";
        }
        return urls;
    }

    function download() {

        let downloadPopUp = swal.fire({
            title: 'Loading files for Download',
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
                let downloadLink = [];

                fetch(cmrUrlPaging[i])
                    .then(res => res.json())
                    .then((out) => {

                        let entries = out['feed']['entry'];

                        numberOfEntries = entries.length;
                        if (numberOfEntries === 0) {
                            swal.fire("Empty Dataset", "Earthdata CMR returned no granules for this search query. Please contact Earthdata Help Desk", "error");
                        }

                        for (let k = 0; k < numberOfEntries; k++) {
                            downloadLink[k] = out.feed.entry[k].links[0].href; //filters all the download links
                            if(out.feed.entry[k].granule_size){
                                totalMBytes += parseInt(out.feed.entry[k].granule_size);
                            }
                        }

                       // downloadPopUp.close();
                        chrome.runtime.sendMessage({
                            totalMBytes: totalMBytes,
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
        let baseUrl = "https://search.earthdata.nasa.gov/projects";

        //appends the Bulk Download button only if the baseURL matches and does not exist already
        if (location.includes(baseUrl) && !document.getElementById("newBulkDownloadButton")) {
           
            //creates a new button element and the same class name is given as the existing Download Now Button
            let button = document.createElement("button");
            let text = document.createTextNode("Bulk Download All");
            button.appendChild(text);
            button.id = "newBulkDownloadButton";
            button.className = "button button--full button--icon btn btn-success";
            $(".project-collections__footer").append(button);
            button.style.background = '#2b7fb9';
            button.style.padding = "5px 20px";
            button.style.color = "white";

            let newButton = $("#newBulkDownloadButton");
            //getting the granular data from the existing Download Now button
            newButton.html('<i class="fa fa-download"></i> Bulk Download All');
            newButton.css("width", "100%");


            //Function for a click listener on the New Bulk Download button
            $("#newBulkDownloadButton").click(function openWin() {
                download();

            });
        }
    }

    let interval;
    function addMutation() {

        if ($(".project-collections__footer").find(".button").length === 1) {
            appendBulkDownloadButton();
        }
    }

    interval = setInterval(addMutation, 3000);

});