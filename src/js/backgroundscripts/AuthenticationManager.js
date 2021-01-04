class AuthenticationManager{

    constructor(cmrManager){
        this.cmrManager = cmrManager;
        this.cookie = {
            site: "https://urs.earthdata.nasa.gov/user_tokens",
            name: "urs_user_already_logged",
            value: "yes"
        }
        this.visiting = {};
        this.visited = {};
        this.windowIds = {};
        return this;
    }

    createURSPopup(self){
        return (new Promise((resolve, reject)=>{
            chrome.windows.create({
                url: self.cookie.site,
                type: 'popup'
            }, (loginWindow)=>{
                
                if(chrome.runtime.lastError){
                    reject(chrome.runtime.lastError);
                    return;
                }

                resolve(loginWindow.tabs);
            })
        }))
       
    }

    getURSPopup(self){
        return new Promise((resolve, reject) =>{
            chrome.tabs.query({
                windowType: 'popup',
                url: self.cookie.site
            }, async (tabs) => {
                
                if(chrome.runtime.lastError){
                    reject(chrome.runtime.lastError);
                    return;
                }

                if(tabs.length !== 0){
                    resolve(tabs);
                }else{
                    const tabs = await self.createURSPopup(self);
                    resolve(tabs);
                }


            })
        })
    }

    loggedInToURS(self){
        
        return new Promise((resolve, reject) =>{
            chrome.cookies.get({
                url: self.cookie.site,
                name: self.cookie.name
            }, (cookie) =>{
                if(chrome.runtime.lastError){
                    reject(chrome.runtime.lastError);
                }

                if(cookie && cookie.value == self.cookie.value){
                    resolve(true);
                }else{
                    resolve(false);
                }

            })
        })       
    }

    pollLoggedInStatus(self, tabs){
        return new Promise(async (resolve, reject)=>{

            try {

                const loggedIn = await self.loggedInToURS(self);
    
                if(loggedIn){
                    if(tabs[0].id){
                        chrome.tabs.remove(tabs[0].id);
                    }
                    resolve();
                    return;
                }else{
                    return setTimeout(() =>{
                        resolve(self.pollLoggedInStatus(self, tabs));
                    }, 1000);
                }
                
            } catch (error) {
                console.error(error);
                reject(error);
            }
        })
    }

    popupLoginWindow(self){

        return (new Promise (async (resolve, reject) => {

            try {

                const loggedIn = await self.loggedInToURS(self);

                if(loggedIn){
                    resolve();
                    return;
                }
                
                let tabs = await self.getURSPopup(self);
                await self.pollLoggedInStatus(self, tabs);
                resolve();

            } catch (error) {
                console.error(error);
                reject(error);
            }

        }));

    }   
    
    onLoggedIn(loginLink, self){

        const baseLink = loginLink.match(/^(http)s?:\/\/.[^\/]*\//g)[0];
    
        return new Promise(resolve =>{
            if (self.windowIds[baseLink] && !self.visited[baseLink]) {
                chrome.tabs.query({
                    windowId: self.windowIds[baseLink]
                }, (tabs) => {
                    if (tabs.length == 0) {
                        self.visiting[baseLink] = false;
                    }
                });
            }
        
            if (!self.visited[baseLink] && self.visiting[baseLink]) {
                return;
            } else if (!self.visited[baseLink]) {
        
                self.visiting[baseLink] = true;
        
                chrome.windows.create({
                    url: [loginLink],
                    type: 'popup'
                }, (loginWindow) => {
        
                    self.windowIds[baseLink] = loginWindow.id;
        
                    function loginDownload(item) {
                        chrome.downloads.cancel(item.id);
                        self.visited[baseLink] = true;
                        self.visiting[baseLink] = false;
                        chrome.windows.remove(loginWindow.id);
                        chrome.downloads.onCreated.removeListener(loginDownload);
                        chrome.tabs.onUpdated.removeListener(granuleOpenedinBrowser);
                        resolve();
                        // return true;
                    }
        
                    function granuleOpenedinBrowser(tabId, changeInfo, tab) {
                        if (
                            tabId == loginWindow.tabs[0].id &&
                            tab.url == tab.title &&
                            tab.url == loginLink
                        ) {
                            self.visited[baseLink] = true;
                            chrome.windows.remove(loginWindow.id);
                            chrome.tabs.onUpdated.removeListener(granuleOpenedinBrowser);
                            chrome.downloads.onCreated.removeListener(loginDownload);
                            resolve();
                            // return true;
                        }
                    }
        
                    chrome.downloads.onCreated.addListener(loginDownload);
        
                    chrome.tabs.onUpdated.addListener(granuleOpenedinBrowser);
                })
        
                // chrome.windows.create({
                //     url: [loginLink]
                // }, (loginWindow)=>{
                //     chrome.downloads.onCreated.addListener(function loginDownload(item){
                //         chrome.downloads.cancel(
                //             function(item){
                //                 console.log("deleting loginDownload");
                //             });
                //         chrome.windows.remove(loginWindow.id);
                //         chrome.downloads.onCreated.removeListener(loginDownload);
                //         this.visited[baseLink] = true;
                //         return;
                //     });
                // })
        
            } else {
                resolve();
                // return true;
            }
        })
    }
    
    async authenticate(all=false){
        return (new Promise (async (resolve, reject) => {
            
            try {
                await this.popupLoginWindow(this);
                const downloadItems = await this.cmrManager.getLoginLinks(true);
                for(let i = 0; i < downloadItems.length; i++){
                    await this.onLoggedIn(downloadItems[i].url, this);
                }
                resolve();
            } catch (error) {
                console.error(error);
                reject(error);
            }
        }))
    }

    reset(){
        this.visiting = {};
        this.visited = {};
        this.windowIds = {};
    }
}