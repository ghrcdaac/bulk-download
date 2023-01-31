# Project Title :
Earth Data Bulk Downloader Browser Extension

#### Description:
A browser extension to add bulk data download capability to Earthdata Search website.

#### Code Structure:

##### manifest.json: 
Includes all the permissions and instructions for the file names to be picked up for the extension.

##### content.js: 
The JavaScript code to change anything in the content of the web page is included here. For example, the code for appending the download button, observing granular mutations and fetching the download links from CMR data website when the button is clicked etc are written in it.

##### bg.js:
This is a JavaScript code to download the links in background which receives the links from content scripts in the form of messages and saves in the browser's local storage.

##### popup.html:
This is a html page which is shows up when the extension icon in the title bar of the browser is clicked.

##### popup.js:
This is a JavaScript file which has code fetching the names of the downloaded files from the local storage of the browser which is included in script of html page.

##### style.css:
This has the styling code css trick for the borders of pause and play buttons to toggle when clicked

##### images:
These have the images with .png extension to be used for the icons of the browser extension.

#### How to Run:
Step 1:
- Clone the git repository to your local desktop
https://github.com/ghrcdaac/bulk-download.git

**or**

![1](https://user-images.githubusercontent.com/109820220/214403792-b5c34629-b928-4163-9964-8a019ff82f16.png)

**Warning:** Make sure you have git installed on your local machine to clone it from the
command prompt. If not, can be installed from the link: https://git-scm.com/download/win


Step 2:

Locate the git cloned folder(must be in the Downloads folder). It is a zip file with the name
“bulk-download-master@dd8331ec68b.zip”. Unzip the folder and check if it has a folder
structure with a “manifest.json” file in src folder as shown below

![2](https://user-images.githubusercontent.com/109820220/214407846-70216b8b-7690-4742-a7e5-1c2adcbbc6e6.PNG)

- Open a web browser,
    - if Google Chrome, open chrome://extensions/
    - On opening Chrome, open the extensions page by typing “chrome://extensions” in the address bar or from settings → more tools → Extensions. 
   
        ![g_1](https://user-images.githubusercontent.com/109820220/215856575-d4f37047-ccd0-44bc-82e0-838a91171a43.PNG)

        - Switch on the Developer mode on the top right corner of the page
        
        ![g_2](https://user-images.githubusercontent.com/109820220/215856636-7aaa1512-f0e6-4ecb-82da-2288da61d306.PNG)

        - Click on load unpacked and browse the git cloned folder and select src and click on "Select Folder"
        
        ![g_3](https://user-images.githubusercontent.com/109820220/215856714-c8c9337e-4e2e-4c7a-a97f-1a2c9be2b5ad.PNG)
        
        - The extension has been installed and is ready to be tested in the Google Chrome browser.
        
        ![g_4](https://user-images.githubusercontent.com/109820220/215856810-0abce69f-6591-4bf2-9231-d8d59c48e038.PNG)

         - Now open Earth Data website in a new page, select the dataset and Click on Bulk Download now
         
    - if Firefox, open about:debugging
        ![f_1](https://user-images.githubusercontent.com/109820220/215814508-4938ad46-a4a3-4045-b6f9-84434b9067a1.PNG)
    
         - Click on load temporary add-on, navigate to src folder and open the manifest file

         ![f_2](https://user-images.githubusercontent.com/109820220/215814704-098450a0-fafc-4bd7-ad7a-bb65c3e048c1.PNG)

         - Now open Earth Data website in a new page, select the dataset and Click on Bulk Download now

        Warning: Please do not close the “about:debugging” page in Firefox during testing. Kindly
use a new tab for Earthdata Website. (Once the firefox browser is closed, since the
add-on is a temporary extension for developers, it gets deleted. This is not the case for
the Chrome browser though.)


#### Downloading:
        - For initial testing, here’s an example dataset with temporal filters applied already, available at the link https://search.earthdata.nasa.gov/search/
        
        ![h_1](https://user-images.githubusercontent.com/109820220/215864333-6f70a370-43b3-4a86-b88f-76ec6f0175e2.PNG)

        - Click on the dropdown button to see the Bulk Download Button.
        
        ![h_2](https://user-images.githubusercontent.com/109820220/215864540-159c98a7-05df-42ce-8fbe-7c66ba1a1e8e.PNG)
        
        On clicking the Bulk Download All button, if not logged in, it asks you to log in to URS using a popup window(make sure your browser allows pop-ups) and then   downloads all the granules. If already logged in, it directly downloads the granules.

        ![h_3](https://user-images.githubusercontent.com/109820220/215864729-016b1ce3-3a13-4a92-bdf8-2771a7aca0be.PNG)
        
        An additional pop-up window may appear which redirects to create an authentication session. After authenticating, it downloads 3 granules in your local downloads folder. The downloads are stored in a folder named after the dataset, inside Earthdata-BulkDownloads folder or user specified folder. In this case, you will
see the following files in: Earthdata-BulkDownloads\AMSR-E\AMSR2 Unified L3 Global 5-Day 25 km EASE-Grid Snow Water Equivalent V001

        ![h_4](https://user-images.githubusercontent.com/109820220/215865032-27e9ee2f-fe52-41c0-9e82-9790ce661e80.PNG)

#### How to Test:
Running the test file in an eclipse IDE with the selenium jar files included, automates the testing process and prints the success/failure of the listed test cases.
