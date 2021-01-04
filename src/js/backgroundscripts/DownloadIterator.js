class DownloadIterator{
    constructor(){
        this.lastActionItr = -1;
        this.itr = 0;
        
        this.downloadItr = 0;
        this.callbackItr = 0;
        this.pauseItr = 0;
        this.cancelItr = 0;
        this.failsafeItr = 0;
        
        return this;
    }
    
    increment(){
        this.itr++;
        return this.itr - 1;
    }

    updateLastActionItr(){
        this.lastActionItr = this.itr;
    }

    getLastActionItr(){
        return this.lastActionItr;
    }

    getCurrent(){
        return this.itr;
    }

    reset(){
        this.itr = 0;
        this.lastActionItr = -1;
        
        this.downloadItr = 0;
        this.pauseItr = 0;
        this.cancelItr = 0;
        this.failsafeItr = 0;

    }
}