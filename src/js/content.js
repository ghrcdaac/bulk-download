let hasDownloadableLinks = true;
let lastURL = window.location.href;

$(document).ready(function () {

    function getUpdateButtonPromise(){
        
        const updateButtonPromise =
            fetch(getCmrQueryLink(window.location.href, false))
                .then(res => res.json())
                .then((out) => {
                    const entries = out['feed']['entry'];
                    if (entries.length == 0){
                        hasDownloadableLinks = false;
                        return false;
                    }
                    else{
                        hasDownloadableLinks = true;
                        return true;
                    }
                })
                .then(updateButton())
                .catch(err => console.error(err));
        
        return updateButtonPromise;
    }    
   
    function getCmrFilters(url, withFilters=true) {

        let filter = {};
        let conceptId = getUrlVars(url)["p"];

        if(!conceptId){
            return {};
        }

        if (conceptId.indexOf("!") > 0) {
            conceptId = conceptId.substring(conceptId.lastIndexOf('!') + 1);
        }
        let temporalGranule = getUrlVars(url)["pg[0][qt]"] || getUrlVars(url)["pg[1][qt]"] || getUrlVars(url)["pg[2][qt]"]; //This is because of the inconsistency in the URL
        let polygon = getUrlVars(url)["polygon"];
        let rectangle = getUrlVars(url)["sb"];
        let point = getUrlVars(url)["sp"];
        let temporalGlobal = getUrlVars(url)["qt"];
        filter['concept_id'] = "?collection_concept_id=" + conceptId;
        filter['temporal'] = "&temporal[]=";
        filter['polygon'] = "&polygon=";
        filter['rectangle'] = "&bounding_box=";
        filter['point'] = "&point=";

        if (!withFilters){
            return filter;
        }

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

    function getCmrQueryLink(url, withFilters=true) {
        let filter = getCmrFilters(url, withFilters);
        let baseUrl = "https://cmr.earthdata.nasa.gov/search/granules.json";

        if (filter.length == 0){
            return baseUrl;
        }

        let link = (baseUrl + filter['concept_id'] + filter['polygon'] + filter['rectangle'] + filter['point'] + filter['temporal'] + "&downloadable=true&page_size=700&page_num=");

        if(!withFilters){
            link = link + [1];
        }
        return link;
    }

    function downloadFiles() {

        let downloadPopUp = swal.fire({
            title: 'Loading files for Download',
            showConfirmButton: false,
            timer: 120000
        });

        chrome.runtime.sendMessage({ message: "swal-fire"});
        lsManager = new LocalStorageManager();

        let url = window.location.href;
        let cmrUrl = getCmrQueryLink(url, true);
        let noOfGranules = getNoOfGranules();
        let granulesFetched = 0;
        let granuleCount = 0;
        let page = 1;
        let numberOfEntries = 0;
        let cmrUrlPaging;
        let cmrLinks = [];
        let itr = 0;

        let downloadInterval = setInterval(() => {
            if (granulesFetched < noOfGranules) {

                cmrUrlPaging = cmrUrl + [page];

                fetch(cmrUrlPaging)
                    .then(res => res.json())
                    .then((out) => {
                        
                        let entries = out['feed']['entry'];
                        const dataSetName = "bulkDownloader_" + entries[0].dataset_id;

                        numberOfEntries = entries.length;
                        granuleCount += numberOfEntries;
                        if (numberOfEntries === 0) {
                            swal.fire("Empty Dataset", "Earthdata could not fing any granules for this search query. Please contact Earthdata Help Desk", "error");
                        }

                        let loginLinks = [];

                        // let randomIndices = generateRandomNumbers(numberOfEntries);

                        for (let i = 0; i < numberOfEntries; i++) {
                            cmrLinks[i] = out.feed.entry[i].links[0].href; //filters all the download link
                            if(itr == 0 && i < 10){ //first 10 link of a dataset
                                loginLinks.push(cmrLinks[i]);
                            }
                        }

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
                        // .catch(err => console.error(err));

                    })
                    .catch(err => {
                        swal.close();
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
                // window.onbeforeunload = null;
                chrome.runtime.sendMessage({
                    message: "update-granuleCount",
                    granuleCount: granuleCount
                })
                clearInterval(downloadInterval);
                chrome.storage.local.get(null, item => console.log(item));
            }
        }, 50);

    }
  
    function addGranuleMutation() {

        const config = {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        };
            
        const granulesMutation = $(".button__badge.badge.badge-secondary")[0];

        //To check the change in number of granules
        let granuleMutationObserver = new MutationObserver(function (mutations, granuleMutationObserver) {
           updateButton();
        });
        
        granuleMutationObserver.observe(granulesMutation, config); //Observes the mutation
        updateButton();

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
            let newButton = $("#newBulkDownloadButton");
            let noOfGranules;

            updateButton();

            // //Function for a click listener on the New Bulk Download button
            // newButton.click(function openWin() {
            //     downloadFiles();
            // });

            newButton.click(function openWin() {
                fetch("https://urs.earthdata.nasa.gov/profile")
                    .then((out) => {
                        
                        //Pops up the urs login window if the user is already not logged in
                        if (out.url === "https://urs.earthdata.nasa.gov/home" && out.redirected === true) {
                            let loginWindow;
                            loginWindow = window.open('https://urs.earthdata.nasa.gov/', loginWindow, 'width=600,height=600');
                            let loginInterval = window.setInterval(function () {
                                if (document.cookie.match(/^.*urs_user_already_logged=yes.*$/) ) {
                                    if(loginWindow) loginWindow.close();
                                    clearInterval(loginInterval);
                                    downloadFiles();
                                }
                            }, 1000);
                            
                        }
                        else {
                            downloadFiles();
                        }

                    })
                    // .catch(err => {
                    //     swal.close();
                    //     swal.fire({
                    //         title: 'Could not fetch login page\nPlease login to URS website and try again',
                    //         type: 'error'
                    //     });
                    //     console.error("Error in fetching Logged in status");
                    //     throw err
                    // });
            })
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

    addMutation();
    interval = setInterval(addMutation, 1000); 

    function updateButton() {
        let isDownloadable;
        if(getNoOfGranules() != 0 && hasDownloadableLinks){
            isDownloadable = true;
        }else {
            isDownloadable = false;
        }

        if (document.getElementById("newBulkDownloadButton")) {
            newButton = $("#newBulkDownloadButton");
            if (isDownloadable){
                newButton.prop('disabled', false);
                let noOfGranules = $(".button__badge.badge.badge-secondary").first().text();
                newButton.html('<i class="fa fa-download"></i> Bulk Download All ' +
                '<span class="button__badge badge badge-secondary" >' + noOfGranules + '</span>');
                newButton.css({ "border": "1px solid transparent",
                                "margin": "1%",
                                "background": "#2b7fb9",
                                "padding": ".375rem .75rem",
                                "color": "white",
                                "cursor": "pointer"
                            });

            }
            else{
                newButton.prop('disabled', true);
                newButton.html('<i class="fa fa-download"></i> Bulk Download All ' +
                '<span class="button__badge badge badge-secondary" >' + "Disabled" + '</span>');
                newButton.css({ "border": "1px solid transparent",
                                "margin": "1%",
                                "padding": ".375rem .75rem",
                                "background": "#A9A9A9",
                                "color": "white",
                                "cursor":"not-allowed"
                            });

            }
        }
    };

    function getUrlVars(url) {
        let decodedUrl = decodeURIComponent(url);
        let vars = {};
        let parts = decodedUrl.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });
        return vars;
    }

    function checkUrlChange() {
        if(getUrlVars(window.location.href)['p']){

            if(lastURL != window.location.href){
                if(getUrlVars(lastURL)['p'] != window.location.href['p']){
                    getUpdateButtonPromise();
                    lastURL = window.location.href;
                }
            }
        }

        if(!getUrlVars(lastURL)['p'] && getUrlVars(window.location.href)['p']){
            getUpdateButtonPromise();
                lastURL = window.location.href;
        }


    }

    let checkUrlInterval = setInterval(checkUrlChange, 1000);

    function checkCurrentUrl(){
        let baseUrl = "https://search.earthdata.nasa.gov/search/granules?";
        if ((window.location.href).includes(baseUrl)){
            getUpdateButtonPromise();
        }else{
            setTimeout(checkCurrentUrl, 1000);
        }
    }
    checkCurrentUrl();

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse){
            if(request.message && request.message == "clear-swal-fire"){
                swal.close();
                sendResponse({
                    message: "swal-closed"
                });
            }
        });
    
    $(document).idle({
        onActive: function(){
            window.location.reload();
        },
        idle:900000
    });

    // function generateRandomNumbers(limit, count = 5){
    //     let randomIndices = [];
    //     const randInt = (max) => {
    //         return Math.floor(Math.random() * Math.floor(max));
    //     }

    //     if(limit <= count){
    //         for(let i = 0; i < limit; i++){
    //             randomIndices.push(i);
    //         }
    //         return randomIndices;
    //     }else{
    //         let tempSet = new Set();
    //         while(tempSet.size <= count){
    //             tempSet.add(randInt(limit));
    //         }
    //         tempSet.forEach(val => randomIndices.push(val));
    //         randomIndices.sort();
    //         return randomIndices;
    //     }
    // }

    function getNoOfGranules(){
        let numberOfGranules = $(".button__badge.badge.badge-secondary").first().text();
        let numberOfGranulesString = [];
        numberOfGranulesString = numberOfGranules.split(" ");

        let noOfGranules = 0;
        if (numberOfGranulesString[0].includes(",")) {
            noOfGranules = parseInt(numberOfGranulesString[0].replace(/,/g, ""));
        } else {
            noOfGranules = parseInt(numberOfGranulesString[0]);
        }

        return noOfGranules;
    }    
});