class DownloadQueue{
    
    constructor(){
        this.downloadItems = [];
        this.downloadIds = {};
    }

    reset(){
        this.downloadItems = [];
        this.downloadIds = {};
    }
}