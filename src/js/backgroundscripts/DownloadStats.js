class DownloadStats{

    constructor(){
        this.data = {
            totalNoofFiles: 0,
            completed: 0,
            in_progress: 0,
            interrupted: 0,
            progress: 0,
            failed:[],
            jobCount: 0,
            jobIndex: 0,
            jobs: [],
            name: '',
            granuleDatasetName:''
        }
        this.disconnectedErrors = new Set([
            "NETWORK_FAILED",
            "NETWORK_TIMEOUT",
            "NETWORK_DISCONNECTED",
            "NETWORK_SERVER_DOWN",
            "NETWORK_INVALID_REQUEST",
            "USER_SHUTDOWN",
            "CRASH"
        ])
        this.updatePending();
        chrome.downloads.onChanged.addListener((delta) => this.countDownloads(delta));
    }

    isDownloadComplete(){
        const totalDownloads = this.data.completed + this.data.interrupted;
        return (
            this.data.totalNoofFiles === totalDownloads
        )
    }

    isBatchComplete(){
        const totalDownloads = this.data.completed + this.data.interrupted;
        return(
            totalDownloads != 0 &&
            ((totalDownloads % 100 === 0) || 
            this.data.jobs[this.data.jobIndex] == this.data.jobCount)
        )
    }

    fireCustomBDStatsEvent(details){
        window.dispatchEvent(new CustomEvent('customBDStatsEvent', {
            detail: details
        }));
    }

    getProgress(){
        return this.data.progress;
    }

    calculateStats(delta){
        if(!(delta.state && delta.state.previous == "in_progress")){
            return;
        }

        if(delta.state.current == "complete" || 
            (delta.state.current == "interrupted" &&
            delta?.error?.current != "USER_CANCELED")
        ){
            this.data.jobCount +=1;
        }


        if(delta.state.current == "complete"){
            this.data.completed += 1;
            
        }else if(delta.state.current == "interrupted"){

           if(delta?.error?.current != "USER_CANCELED"){
                this.data.interrupted += 1;
                this.data.failed.push(delta);
            }
        }
        this.updatePending();
        this.calcProgess();
        this.postPogress();
    }

    //counts batch specific downlaods
    //fires end of batch and end of download events
    //find better function name
    observeDownloadEvents(delta){
        if(!(delta.state && delta.state.previous == "in_progress")){
            return;
        }

        if(
            delta.state.current == "interrupted" &&
            delta?.error?.current != "USER_CANCELED"
        ){
            if (this.disconnectedErrors.has(delta?.error?.current)){
                this.fireCustomBDStatsEvent({
                    event: 'disconnected',
                    interruptionReason: delta.state.current
                });

            }
        }

        if(this.data.jobs[this.data.jobIndex] == this.data.jobCount){
            this.data.jobIndex++;
            this.data.jobCount = 0;
            
            if(!this.isDownloadComplete()){
                this.fireCustomBDStatsEvent({
                    event: 'batch-complete'
                });
            }
        }

        if(this.getProgress() >= 100){
            this.fireCustomBDStatsEvent({
                event: 'download-complete'
            });
        }

        if(this.isBatchComplete()){
            this.fireCustomBDStatsEvent({
                event: 'batch-complete'
            });
        }
    }

    countDownloads(delta){
        if(delta.filename) this.data.name = delta.filename.current;
        this.calculateStats(delta);
        this.observeDownloadEvents(delta);
    }

    setGranuleCount(totalNoofFiles){
        this.data.totalNoofFiles = totalNoofFiles;
        this.updatePending();
    }

    incrementGranuleCount(noOfGranules){
        this.data.totalNoofFiles += noOfGranules;
        this.data.jobs.push(noOfGranules);
        this.updatePending();
    }

    updatePending(){
        this.data.in_progress = this.data.totalNoofFiles -
            this.data.completed - this.data.interrupted;
    }

    calcProgess(){
        if(this.data.interrupted == this.data.totalNoofFiles){
            this.data.progress == 0;
        }else{
            this.data.progress = parseInt (100 * (this.data.completed)/
                (this.data.totalNoofFiles - this.data.interrupted));
        }
    }
    
    postPogress(){
        chrome.runtime.sendMessage({
            message: "update-popup-progress",
            data: this.data
        })
    }

    async fetch(){
        try {
            const lsManager = new LocalStorageManager();
            const data = await lsManager.get('popupStats');
            this.data = data;
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async write(){
        try {
            const lsManager = new LocalStorageManager();
            await lsManager.set({
                'popupStats': this.data
            })
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    reset(){
        
        // chrome.downloads.onChanged.removeListener(() => this.countDownloads);

        this.data = {
            totalNoofFiles: 0,
            completed: 0,
            in_progress: 0,
            interrupted: 0,
            progress: 0,
            failed:[],
            jobCount: 0,
            jobIndex: 0,
            jobs: [],
            name:''
        }
        
    }

    resetCancel(){

        // chrome.downloads.onChanged.removeListener(() => this.countDownloads);

        this.data = {
            totalNoofFiles: this.data.totalNoofFiles,
            completed: this.data.completed,
            in_progress: 0,
            interrupted: this.data.interrupted,
            progress: this.data.progress,
            failed: this.data.failed,
            jobCount: this.data.jobCount,
            jobIndex: this.data.jobIndex,
            jobs: this.data.jobs,
            name: this.data.name
        }

    }

    
}