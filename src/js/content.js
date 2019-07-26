console.log("Earth Data Bulk Downloader Extension has been set up!");


$(document).ready(function () {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

        function getCmrFilters(url) {
            //Function to get CMR filter from EDS URL
            let decodedUrl = decodeURIComponent(url);
            function getUrlVars() {
                let vars = {};
                let parts = decodedUrl.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
                    vars[key] = value;
                });
                return vars;
            }

           // console.log("DecodedURL:" , decodedUrl);
            let filter = {};
            let conceptId = getUrlVars()["p"];
            let temporal = getUrlVars()["pg[0][qt]"];
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

            //console.log("Filters:" , filter);

            return filter;
        }

        function getCmrQueryLink(url) {
            // Function to get CMR link with appropriate filter
            let filter = getCmrFilters(url);
            let baseUrl = "https://cmr.earthdata.nasa.gov/search/granules.json";

            return (baseUrl + filter['concept_id'] + filter['polygon'] + filter['rectangle'] + filter['point'] + filter['temporal'] + "&page_size=700&page_num=");
        }

        function downloadPopUp(){
            let timerInterval;
            swal.fire({
                title: 'Fetching Downloads from CMR!',
                html: 'I will close in <strong></strong> seconds.',
                timer: 2000,
                onBeforeOpen: () => {
                    swal.showLoading();
                    timerInterval = setInterval(() => {
                        swal.getContent().querySelector('strong')
                            .textContent = swal.getTimerLeft()
                    }, 100)
                },
                onClose: () => {
                    clearInterval(timerInterval)
                }
            }).then((result) => {
                if (
                    // Read more about handling dismissals
                    result.dismiss === swal.DismissReason.timer
                ) {
                    console.log('I was closed by the timer')
                }
            })
        }

        function download() {


            let url = window.location.href;
            let cmrUrl = getCmrQueryLink(url);
            let numberOfGranules = jQuery(".pill").first().text();
            let numberOfGranulesString = [];
            numberOfGranulesString = numberOfGranules.split(" ");
            let noOfGranules = 0;
            if (numberOfGranulesString[0].includes(",")) noOfGranules = parseInt(numberOfGranulesString[0].replace(/,/g, ""));
            else noOfGranules = parseInt(numberOfGranulesString[0]);
            window.granulesFetched = 0;
            let i = 1;
            let numberOfEntries = 0;
            let cmrUrlPaging;

            do {

                cmrUrlPaging = cmrUrl + [i];
                console.log(cmrUrlPaging);

                let downloadLink = [];

                fetch(cmrUrlPaging)
                    .then(res => res.json())
                    .then((out) => {

                        //console.log('Checkout this JSON! ', out);

                        let entries = out['feed']['entry'];
                        //console.error(entries.length);
                        numberOfEntries = entries.length;
                        if (numberOfEntries === 0) {
                            swal.fire("Empty Dataset", "Common Metadata Repository returned no granules for this search query. Please contact Earthdata help desk", "error");
                        }
                        else
                            downloadPopUp();

                        window.granulesFetched = window.granulesFetched + numberOfEntries;
                        //console.log(granulesFetched);
                        setTimeout(function () {
                            for (let i = 0; i < numberOfEntries; i++) {
                                downloadLink[i] = out.feed.entry[i].links[0].href; //filters all the download links
                                //console.log(downloadLink[i]);
                            }

                            let message = {
                                text: downloadLink,
                                number: numberOfEntries
                            };


                            chrome.runtime.sendMessage(message); //send the download links as message to background page
                        }, 1000);
                    })
                    .catch(err => {
                        console.error("Error in fetching");
                        throw err
                    });

                granulesFetched = granulesFetched + 700;
                i++;

            } while (granulesFetched < noOfGranules);

        }


        let buttonClass = jQuery(".master-overlay-main-content")[0];
        let config = {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        };
        let mutationObserverMain = new MutationObserver(function (mutations, mutationObserverMain) {
            mutations.forEach(function (mutation) {
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
                    let button1 = document.createElement("button");
                    button1.appendChild(text);
                    jQuery(".button.button.button-full.button-download-data").append(button1);

                    //getting the granular data from the existing Download Now button
                    let noOfGranules = jQuery(".pill").first().text();
                    $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All' + '<span class="pill">' + noOfGranules + '</span>');


                    let loginWindow = null;
                    //window.contentScriptInjected = false;
                    //Function when there is a click on the New Bulk Download button

                    $("#newBulkDownloadButton").click(function openWin() {

                        //Pops up the urs login window if the user is already not logged in
                        if (!document.cookie.match(/^.*urs_user_already_logged=yes.*$/)) {
                            loginWindow = window.open('https://urs.earthdata.nasa.gov/', loginWindow, 'width=600,height=600');

                            let loginInterval = window.setInterval(function () {
                                if (document.cookie.match(/^.*urs_user_already_logged=yes.*$/)) {
                                    loginWindow.close();
                                    clearInterval(loginInterval);
                                    // alert("download");
                                    download();
                                }
                            }, 2000);
                        } else {

                            download();
                        }
                    });
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
                       // console.log("There is a Mutation in Granules");
                        if (document.getElementById("newBulkDownloadButton")) {
                            let noOfGranules = jQuery(".pill").first().text();
                            $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All ' +
                                '<span class="pill" >' + noOfGranules + '</span>');
                        }
                    });
                });

                mutationObserver.observe(granulesMutation, config); //Observes the mutation
            });
        });
        mutationObserverMain.observe(buttonClass, config);


    });
});