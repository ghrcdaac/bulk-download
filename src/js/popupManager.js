class PopupManager{

    constructor(totalNoofFiles){        
        this.data = {
            totalNoofFiles: totalNoofFiles,
            completed: 0,
            in_progress: 0,
            interrupted: 0,
            progress: 0,
            failed:[]
        }
        this.updatePending();
        chrome.downloads.onChanged.addListener((delta) => this.countDownloads(delta));
    }

    downloadsInProgress(){
        if(this.getProgress() > 0 && this.getProgress() < 100){
            return true;
        }else if(this.getProgress() == 0 && this.data.totalNoofFiles && this.data.totalNoofFiles != 0){
            return true
        }else{
            return false;
        }
    }

    getProgress(){
        return this.data.progress;
    }

    countDownloads(delta){
        if(delta.state && delta.state.previous == "in_progress"){
            if(delta.state.current == "complete"){
                this.data.completed += 1;
                console.log(`${delta.state.current} ${delta.id}`);
                
            }else if(delta.state.current == "interrupted"){
                if(delta.error.current != "USER_CANCELED"){
                    this.data.interrupted += 1;
                    this.data.failed.push(delta);
                }
                console.log(delta);
            }
            this.updatePending();
            this.calcProgess();
            this.postPogress();
        }
    }

    updateGranuleCount(totalNoofFiles){
        this.data.totalNoofFiles = totalNoofFiles;
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

    reset(){
        this.data = {
            totalNoofFiles: 0,
            completed: 0,
            in_progress: 0,
            interrupted: 0,
            progress: 0,
            failed:[]
        }
        chrome.downloads.onChanged.removeListener(() => this.countDownloads);
    }
    
    postPogress(){
        chrome.runtime.sendMessage({
            message: "update-popup-progress",
            data: this.data
        })
    }

    
}