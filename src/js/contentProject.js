console.log("Earth Data Bulk Downloader Extension has been set up!");


$(document).ready(function () {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

        function getCmrFilters(url) {
            //Function to get CMR filter from EDS URL
            let filter = {};
            let conceptId = "p=(.*?)&";
            let startDate = "pg\\[0\\]\\[qt\\]=(\\d{4}-\\d{2}-\\d{2})\\T(\\d{2})\\%3A(\\d{2})\\%3A(\\d{2})";
            let stopDate = "pg\\[0\\]\\[qt\\]=.*(\\d{4}-\\d{2}-\\d{2})\\T(\\d{2})\\%3A(\\d{2})\\%3A(\\d{2})";
            filter['concept_id'] = "?collection_concept_id=" + url.match(conceptId)[1];
            filter['temporal'] = "&temporal[]=";
            if (url.match(startDate)) {
                filter['temporal'] = filter['temporal'] + url.match(startDate)[1] + "T" + url.match(startDate)[2] + ":" + url.match(startDate)[3] + ":" + url.match(startDate)[4] + "Z";
            }

            if (url.match(stopDate)) {

                filter['temporal'] = filter['temporal'] + "," + url.match(stopDate)[1] + "T" + url.match(stopDate)[2] + ":" + url.match(stopDate)[3] + ":" + url.match(stopDate)[4] + "Z";
            }

            return filter;
        }

        function getCmrQueryLink(url) {
            // Function to get CMR link with appropriate filter
            let filter = getCmrFilters(url);
            let baseUrl = "https://cmr.earthdata.nasa.gov/search/granules.json";

            return (baseUrl + filter['concept_id'] + filter['temporal'] + "&page_size=700&page_num=");
        }

        function download() {

            console.log("Inside cookie checking");
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
                console.log("Inside do while");
                cmrUrlPaging = cmrUrl + [i];
                console.log(cmrUrlPaging);

                let downloadLink = [];

                fetch(cmrUrlPaging)
                    .then(res => res.json())
                    .then((out) => {

                        console.log('Checkout this JSON! ', out);

                        let entries = out['feed']['entry'];
                        console.error(entries.length);
                        numberOfEntries = entries.length;
                        if (numberOfEntries === 0) {
                            //alert("No granules");
                            swal("Empty Dataset", "Common Metadata Repository returned no granules for this search query. Please contact Earthdata help desk", "error");
                        }

                        window.granulesFetched = window.granulesFetched + numberOfEntries;
                        console.log(granulesFetched);
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


        let buttonClass = jQuery(".master-overlay-footer-actions")[0];
        let config = {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        };
        let mutationObserverMain = new MutationObserver(function (mutations, mutationObserverMain) {
            mutations.forEach(function (mutation) {
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
                    let button1 = document.createElement("button");
                    button1.appendChild(text);
                    jQuery(".master-overlay-footer-actions").append(button);

                    //getting the granular data from the existing Download Now button
                    let noOfGranules = jQuery(".pill").first().text();
                    $("#newBulkDownloadButton").html('<i class="fa fa-download"></i> Bulk Download All');


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
                        console.log("There is a Mutation in Granules");
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