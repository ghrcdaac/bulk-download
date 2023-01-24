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
        - Switch on the Developer mode on the top right corner of the page
        - Click on load unpacked and browse the git cloned folder and select src and click on "Select Folder"
        - Now open Earth Data website in a new page, select the dataset and Click on Bulk Download now
        - 
    - if Firefox, open about:debugging
         - Click on load temporary add-on, navigate to src folder and open the manifest file
         - Now open Earth Data website in a new page, select the dataset and Click on Bulk Download now




#### How to Test:
Running the test file in an eclipse IDE with the selenium jar files included, automates the testing process and prints the success/failure of the listed test cases.
