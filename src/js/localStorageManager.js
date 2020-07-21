class LocalStorageManager{
    constructor(){
        if(!LocalStorageManager.instance){
            LocalStorageManager.instance = this;
        }
        return this;
    }

    getItem(key, onlyValue = false, errorHandling = true, erase = false){
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(key, item => {

                // console.log(key, item);
                let value;
                if(typeof item[key] !== "undefined" || !errorHandling){

                    if(!onlyValue){
                        resolve(item);
                        value = item;
                    }else{
                        resolve(item[key]);
                        value = item[key];
                    }
                    
                    if(typeof item[key] !== "undefined" && erase){
                        chrome.storage.local.remove(key);
                    }
                    
                    return value;
                }
                else{
                
                    // console.log(key, "got rejected");
                    reject();
                }
            })
        })
    }

    get(key){
        return this.getItem(key, true);
    }

    getNextBatch(){
        return new Promise(resolve =>{
            this.get("bulkDownloader_dataSets")
                .then( dataSets => {
                    if(dataSets.length != 0){
                        const currentDataSet = dataSets.shift();
                        this.setItem("bulkDownloader_dataSets", dataSets, "overwrite");
                        this.setItem("bulkDownloader_currentDataSet", currentDataSet, "overwrite");
                        return(currentDataSet);
                    }
                })
                .then((dataSet) => {
                    console.log(dataSet);
                    resolve(this.getItem(dataSet, true, false, true));
                })
                .catch(err => console.error(err));

        });
    }

    getDownloadLinks(){
        return new Promise(resolve => {
            this.getItem("bulkDownloader_currentDataSet", true, false, false)
                .then(dataSet => this.getItem(dataSet, true, false, true))
                .then(item => {
                    console.log(item);
                    if(item && item.length != 0){
                        resolve(item);
                    }else{
                        resolve (this.getNextBatch());
                    }
                })
                .catch(err => console.error(err));
        });
    }

    //pushs by default
    setItem(key, value, method = "append"){

        if (method == "overwrite"){
            return new Promise(resolve => {
                chrome.storage.local.set({
                    [key]: value
                }, resolve);
            })
        }
        
        return new Promise (resolve => {
            this.getItem(key, false, false)
                .then(item => {

                    if(typeof item[key] === "undefined"){
                        resolve(this.setItem(key, value, "overwrite"));
                        return;
                    }

                    if(method == "push" && typeof item[key].push === "function"){
                        item[key].push(value);    
                    }
                    else if(method == "distinct" && typeof item[key].push === "function"){
                        item[key].push(value);
                        item[key] = [...new Set(item[key])];    
                    }
                    else if(method == "concat" && typeof item[key].concat === "function"
                        && typeof value.concat === "function"
                    ){
                        item[key] = item[key].concat(value);
                    }

                    resolve(this.setItem(key, item[key], "overwrite"));
                })
                .catch(err => console.error(err));
        })
    }
    
    initItem(key, value){
        chrome.storage.local.get(key, (item) => {
            if(!item[key]){
                chrome.storage.local.set({
                    [key] : value
                });
            }
        })
    }

    initStorage(){
        return (Promise.all([
            this.initItem("bulkDownloader_loginLinks", []),
            this.initItem("bulkDownloader_dataSets", []),
            this.initItem("bulkDownloader_inUse", false),
            this.initItem("bulkDownloader_currentDataSet", null)
        ]));
    }

    call(...promises){
        return new Promise((resolve) => {
            this.getItem("bulkDownloader_inUse", true, false)
                .then(inUse =>{
                    if(!inUse){
                        return(this.setItem("bulkDownloader_inUse", true, "overwrite")
                            .then(()=> Promise.all([...promises])
                            .then(values => {
                                this.setItem("bulkDownloader_inUse", false, "overwrite");
                                resolve(values);    
                            })))
                    }else{
                        return setTimeout(() => resolve(this.call(...promises)), 1000);
                    }
            })
            .catch(err => console.error(err));
        })
    }
     
}