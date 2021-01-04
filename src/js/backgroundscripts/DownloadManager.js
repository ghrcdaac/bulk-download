class DownloadManager{
    constructor(){

        this.endOfQueue = false;
        this.batchComplete = false;
        this.onGoing = false;

        this.cancelData = {
            cancelByCancelAll: false,
            cancelByCallback: false,
            reset: () => {
                this.cancelData.cancelByCancelAll = false;
                this.cancelData.cancelByCallback = false;
            }
        }

        this.downloadInterval = null;
        this.lastAction = null;
        this.states = new Set(['idle', 'paused', 'ongoing', 'disconnected', 'canceled']);

        this.stats = new DownloadStats();
        this.itr = new DownloadIterator();
        this.queue = new DownloadQueue();
        this.lsManager = new LocalStorageManager();
        this.cmrManager = new CMRManager(this.lsManager);
        this.auth = new AuthenticationManager(this.cmrManager);

        window.addEventListener('customBDStatsEvent', (e)=>{
            if(e.detail.event === 'batch-complete'){
                this.onBatchComplete();
            } else if(e.detail.event === 'download-complete'){
                this.onComplete();
            } else if(e.detail.event === 'disconnected'){
                this.retry();
            } else {
                //pass
            }
        })
    }

    reset(){
        this.endOfQueue = false;
        this.batchComplete = false;
        this.onGoing = false;

        this.cancelData.reset();

        this.downloadInterval = null;
        this.lastAction = null;

        this.itr.reset();
        this.queue.reset();
        this.lsManager.reset();
        this.cmrManager.reset();
        this.auth.reset();
    }

    isAllCanceled(){
        const toCancelCount = this.itr.getLastActionItr() - 
            (this.itr.downloadItr + 
            this.itr.pauseItr +
            this.itr.failsafeItr);

        return (this.itr.cancelItr === toCancelCount);
    }

    authenticate(all=false){
        return this.auth.authenticate(all=false);
    }

    async fetctDownloadLinks(){
        try {
            const links = await this.cmrManager.fetchDownloadLinks();
            this.queue.downloadItems = this.queue.downloadItems.concat(links)
            return Promise.resolve();
        } catch (err) {
            console.error(err);
            throw err;
        }
    }    

    setCMRItem(CMRItem){
        if(
            typeof CMRItem.url !== 'string' &&
            typeof CMRItem.noOfGranules !== 'number' 
        ){
            console.error(CMRItem, "is not a valid CMRItem");
            throw new Error('TypeError');
        }

        this.cmrManager.setItem(CMRItem);
    }

    setState(state){
        
        if(!this.states.has(state)){
            console.error(state, "is not a valid state");
            throw new Error('TypeError');
        }

        try {
            this.lsManager.set({
                'lastState': state
            })   
        } catch (error) {
            throw error;
        }
    }

    //stores data (links and ids) in local storage while pausing etc
    //find better variable name
    async putback(flag){

        if(flag === 'pause' || flag === 'disconnected'){
            try {
                let queue = await this.lsManager.get('queue');
                
                queue.inQueue = true;
                queue.reason = flag;
                Object.assign(queue.ids, this.queue.downloadIds);
                queue.links = queue.links.concat(this.queue.downloadItems);
    
                await this.lsManager.set({
                    'queue': queue
                })
                this.queue.reset();
                
                return Promise.resolve();
            
            } catch (error) {
                console.error(error);
                return Promise.reject(error);
            }
        }else{
            throw new Error("TypeError");
        }
            
    }

    //retrives data (links and ids) from local storage
    //find better function name
    async putfront(){

        try {
            const queue = await this.lsManager.get('queue');

            Object.assign(this.queue.downloadIds, queue.ids);
            this.queue.downloadItems = this.queue.downloadItems.concat(
                queue.links
            );

            this.lsManager.set({
                'queue': {
                    inQueue: false, 
                    reason: null,
                    ids: [],
                    links: []
                }
            });

            return Promise.resolve();
            
        } catch (error) {
            console.error(error);
            return Promise.reject();
        }
        

    }

    search(id){
        return new Promise((resolve, reject) =>{
            
            if(typeof parseInt(id) === NaN){
                console.error(id, "is not a number");
                reject(new Error("TypeError"));
            }

            chrome.downloads.search({
                id: parseInt(id)
            }, (items) =>{

                if(chrome.runtime.lastError){
                    reject(chrome.runtime.lastError);
                }

                if(items.length!= 0){
                    resolve(items[0])
                }else{
                    reject(new Error("Does not Exist"));
                }
            })
        })
    }

    cancel(id){
        try {
            chrome.downloads.cancel(parseInt(id), () => {
                if(chrome.runtime.lastError){
                    throw chrome.runtime.lastError;
                }
            })
        } catch (error) {
            throw error;
        }
    }

    async pause(id){
        try {
            const item = await this.search(id);
            if (item && item.state) {
                if (item.state == "in_progress") {
                    chrome.downloads.pause(item.id, () =>{
                        if(chrome.runtime.lastError){
                            throw chrome.runtime.lastError;
                        }
                    });
                }
            }               
                        
        } catch (error) {
            throw error;
        }
    }

    async resume(id){
        try {
            const item = await this.search(id);
            if (item.canResume == true) {
                chrome.downloads.resume(item.id);
            } else {
                if (item.paused == true) {
                    chrome.downloads.cancel(item.id);
                    //put it back to the queue
                }
            }
            
        } catch (error) {
            throw error;
        }

    }

    //set mode to ongoing

    download(downloadItem){
        
        try {
            if(typeof(downloadItem.url) !== 'string'){
                console.error(downloadItem.url, "is not a string");
                throw new Error("TypeError");
            }

            const filename = downloadItem.url.substring(
                downloadItem.url.lastIndexOf('/') + 1);

            const path = "Earthdata-BulkDownloads/" + filename;


            chrome.downloads.download({
                url: downloadItem.url,
                filename: path
            }, async (downloadId) => {

                this.itr.callbackItr++;
    
                if(chrome.runtime.lastError){
                    this.itr.failsafeItr++;
                    throw chrome.runtime.lastError;
                }

                if(this.lastAction !== 'cancel'){
                    this.queue.downloadIds[downloadId] = downloadItem.url;     
                }
                
                if(downloadItem.id <= this.itr.getLastActionItr()){
                    if(this.lastAction == 'pause'){
                        this.pause(downloadId);
                        this.itr.pauseItr++;
                        
                        this.putback('pause');
                        
                        
                    }else if(this.lastAction == 'cancel'){
                        this.cancel(downloadId);
                        this.itr.cancelItr++;

                        if(this.isAllCanceled()){
                            this.cancelData.cancelByCallback = true;
                            this.onCancelComplete();
                        }

                    }else{
                        this.itr.failsafeItr++;
                    }
            
                } else { //when download proceeds normally
                    this.itr.downloadItr++;
                }
                
                
                
            }); 
            
        } catch (error) {
            throw error;
        }
    }

    async downloadAll(resume=false){

        this.lastAction = 'download';

        try {

            if (!resume){
                await this.fetctDownloadLinks();
            }

            this.downloadInterval = setInterval(
                () => {
            
                    try {
                        if(this.stats.isDownloadComplete()){
                            clearInterval(this.downloadInterval);
                            return;
                        }

                        if(this.queue.downloadItems.length === 0){
                            clearInterval(this.downloadInterval);
                            this.onEndOfQueue();
                            return;
                        }
        
                        const downloadItem = this.queue.downloadItems.pop();
                        downloadItem.id = this.itr.increment();
                        this.download(downloadItem);
                    } catch (error) {
                        throw error;
                    }
                    
    
                }, 700);
            
            

        } catch (error) {
            console.error(error);
            throw error;
        }
        
    }

    //set mode to required
    async cancelAll(){

        //stop further downloads.      

        if(this.lastAction === 'cancel'){
            return;
        }
        this.itr.updateLastActionItr();
        this.lastAction = 'cancel';
        
        try {

            const self = this;
            clearInterval(self.downloadInterval);

            await this.putfront();
            
            Object.keys(this.queue.downloadIds).forEach(ids =>{
                try {
                    this.cancel(ids);
                } catch (error) {
                    console.error(error);
                    throw error;
                }   
            })
            
            //check is all downloads have been cancelled
            //set flags if cancel criterias are met
            this.cancelData.cancelByCancelAll = true;
            if(this.isAllCanceled()){
                this.cancelData.cancelByCallback = true;
                this.onCancelComplete();
            }
            
            this.setState('canceled');
        } catch (error) {
            throw error;
        }

    }

    async pauseAll(){

        if(this.lastAction === 'pause'){
            return;
        }

        try {
            //stop further downloads
            const self = this;
            clearInterval(self.downloadInterval);

            this.itr.updateLastActionItr();
            this.lastAction = 'pause';

            Object.keys(this.queue.downloadIds).forEach(ids =>{
                try {
                    this.pause(ids);
                    
                } catch (error) {
                        throw error;
                }
            })
            this.setState('paused');

            // await this.stats.write();
            
            await this.putback('pause');
            // await this.stats.write();
            //put paused links back to the queue
            //save paused ids   
            
        } catch (error) {
            throw error;
        }         

    }

    async resumeAll(){

        //to optimize resumeAll()
        //see retry

        //need to think about how to store download Stats
        //without losing data

        if(this.lastAction !== 'pause'){
            return;
        }

        this.lastAction = 'resume';

        try {
            // await this.stats.fetch();
            await this.putfront();

            Object.keys(this.queue.downloadIds).forEach(ids =>{
                try {
                    this.resume(ids);
                } catch (error) {
                    console.error(error);
                    throw error;
                }
            })

            this.setState('ongoing');

            // this.downloadAll(true);   
        } catch (error) {
            console.error(error);
            throw error;
            
        }

    }

    onDisconnected(){

        //the eventhandler for disconnected should be closed
        //and opened back again after sometime

        this.pauseAll();
        this.setState('disconnected');
        this.auth.reset();
    }

    async retry(){

        //ping urs
        //only proceed if status = 200
        //else show no internet error
        const pausedLinks = await this.lsManager.get('paused');

        if(pausedLinks.length === 0){
            //failed to retry
            return;
        }

        this.authenticate(true);

        //possible optimization, consider modifying how failed count work
        //since the failed count will increment due to network failure
        //the event handlers might not work porperly due to double counting
        //if the known network errors aren't stored in LS it we could be albe
        //to resume download without calling downloadAll again
        this.resumeAll();
    }

    onEndOfQueue(){
        this.endOfQueue = true;                
        if(this.batchComplete){
            try {
                this.endOfQueue = false;
                this.batchComplete = false;
                this.downloadAll();
            } catch (error) {
                console.error(error);
                throw error;
            }
        }
    }

    onBatchComplete(){
        this.batchComplete = true;
        if(this.endOfQueue){
            try {
                this.endOfQueue = false;
                this.batchComplete = false;
                this.downloadAll();
            } catch (error) {
                console.error(error);
                throw error;
            }
        }
    }

    onComplete(){
        //check if everything empty

        //reset if so
        this.reset();

        this.setState('idle');
        // this.lastAction = null;
        // this.onGoing = false;
    }

    onCancelComplete(){
        if(
            this.cancelData.cancelByCallback &&
            this.cancelData.cancelByCancelAll
        ){
            this.reset();
        }

    }

    async initDownload(){

        if(this.onGoing){
            return;
        }

        if(this.lastAction === 'download'){
            return;
        }
        
        this.setState('ongoing');
        this.onGoing = true;
        this.lastAction = 'download';
        
        try {
            this.downloadAll();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async init(request){
        if(!this.onGoing){
            this.stats.reset();   
        }
        this.stats.incrementGranuleCount(request.noOfGranules);
        
        this.setCMRItem(
            new CMRItem(request.url, request.noOfGranules));
        await this.authenticate();
        this.initDownload();
    }
}