lsManager = new LocalStorageManager();

$(document).ready(function () {

    function getUrlVars(url) {
        let decodedUrl = decodeURIComponent(url);
        let vars = {};
        let parts = decodedUrl.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });
        return vars;
    }

    function getCmrFilters(url) {
        //Function to get CMR filter from EDS URL

        let filter = [];
        let allConceptIds = getUrlVars(url)["p"];
        let conceptId = [];

        conceptId = allConceptIds.split("!");


        let noOfDatasets = conceptId.length - 1;
        let temporal = [];
        for (let i = 1; i <= noOfDatasets; i++) {
            temporal[i - 1] = getUrlVars(url)["pg[" + i + "][qt]"];
        }
        let temporalGlobal = getUrlVars(url)["qt"];
        let polygon = getUrlVars(url)["polygon"];
        let rectangle = getUrlVars(url)["sb"];
        let point = getUrlVars(url)["sp"];
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

        let noOfGranules = getEstimatedGranuleCount();
        let granuleCount = 0;
        let completedDatasets = 0;
        let itr = 0;

        let downloadInterval = setInterval(()=>{
            if (completedDatasets < noOfDatasets){
                let page = 1;
                let i = 0;
                do {
                    cmrUrlPaging[i] = cmrUrls[i] + page;
                    let downloadLink = [];

                    fetch(cmrUrlPaging[i])
                        .then(res => res.json())
                        .then((out) => {

                            let entries = out['feed']['entry'];
                            const dataSetName = "bulkDownloader_" + entries[0].dataset_id;

                            numberOfEntries = entries.length;
                            granuleCount += numberOfEntries;
                            if (numberOfEntries === 0) {
                                swal.fire("Empty Dataset", "Earthdata CMR returned no granules for this search query. Please contact Earthdata Help Desk", "error");
                            }

                            let loginLinks = [];

                            for (let k = 0; k < numberOfEntries; k++) {
                                downloadLink[k] = out.feed.entry[k].links[0].href; //filters all the download links
                                if(itr == 0 && i < 10){ //first 10 link of a dataset
                                    loginLinks.push(downloadLink[k]);
                                }
                            }

                            // let dataSet_ids = getUrlVars(window.location.href)['p'].split('!');

                            lsManager.call(             
                                lsManager.setItem(dataSetName, cmrLinks, "distinct"),
                                lsManager.setItem("bulkDownloader_loginLinks", loginLinks, "concat"),
                                lsManager.setItem("bulkDownloader_dataSets", dataSetName, "distinct")                            
                            )
                            .then(() =>{
                                let firstItr = false;
                                if(itr == 0){
                                    lsManager.call(lsManager.setItem("bulkDownloader_currentDataSet", dataSetName, "overwrite"));
                                    firstItr = true; 
                                }
    
                                // chrome.storage.local.get(null, (item) => console.log(item));
    
                                chrome.runtime.sendMessage({
                                    granuleCount: noOfGranules,
                                    dataSetName: dataSetName,
                                    firstItr: firstItr,
                                    number: numberOfEntries,
                                    message: "start-download"
                                })
                            })
                    


                        })
                        .catch(err => {
                            console.error("Error in fetching download links");
                            throw err
                        });

                    page++;
                    itr++;

                } while (numberOfEntries !== 0);
                completedDatasets++;
            }else{
                chrome.runtime.sendMessage({
                    message: "update-granuleCount",
                    granuleCount: granuleCount
                })
                clearInterval(downloadInterval);
            }

        }, 1000);

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

    function getEstimatedGranuleCount(){
        let estimatedGranuleCount = 0;

        Array.from(document.getElementsByClassName(
            "project-collections-item__stats-item project-collections-item__stats-item--granule-count"
            )).forEach(item => {
                let temp = item.innerHTML.match(/^(\d+\.?\d?k?)/gm)[0];
                if(temp.endsWith('k')){
                    temp = temp.slice(0, -1);
                    estimatedGranuleCount += parseFloat(temp) * 1000;
                }else{
                    estimatedGranuleCount += parseFloat(temp);
                }
                
            })
        return estimatedGranuleCount;
    }

});