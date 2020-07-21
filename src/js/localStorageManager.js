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
                    // console.log(typeof item[key], item);
                    // console.log(`${item}, ${key}, ${method}, ${typeof item[key].concat}, ${typeof value.concat}`);

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
                        // console.log(key, item[key]);
                        item[key] = item[key].concat(value);
                        // console.log(item[key]);   
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
        let result = null;
        return new Promise((resolve, reject) => {
            this.getItem("bulkDownloader_inUse", true, false)
                .then(inUse =>{
                    if(!inUse){
                        this.setItem("bulkDownloader_inUse", true, "overwrite")
                            .then(()=> Promise.all([...promises])
                            .then(values => {
                                this.setItem("bulkDownloader_inUse", false, "overwrite");
                                resolve(values);    
                            }));
                            // .catch(err => {
                            //     console.error(err);
                            //     reject();                                
                            // })
                    }else{
                        // console.log("how?");
                        setTimeout(() => resolve(this.call(...promises)), 1000);
                    }
            })
            // .catch(err => console.error(err));
        })
    }
     
}

// "nameSpace"_"myKey"

localStorage = {
    //other stuff
    "bulkDownloader_dataSets": ['A', 'B', 'C'],
    'bulkDownloader_A': ["f"],
    'bulkDownloader_B': ['df'],
    'bulkDownloader_C': ['df'],
    "bulkDownloader_inUse": true,
    "bulkDownloader_currentDataSet": 'A',
    "bulkDownloader_loginLinks": ["d"]
}