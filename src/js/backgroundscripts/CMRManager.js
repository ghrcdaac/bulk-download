class CMRManager{
    constructor(lsManager){
        this.pointer = {
            paging: 1,
            index: 0
        };
        this.links = [];
        this.lsManager = lsManager;
        this.pageSize = 100;
        return this;
    }

    geLinks(){
        return this.links;
    }

    getPointer(){
       return this.pointer;
    }

    setItem(CMRItem){
        this.links.push(CMRItem);
        this.write();
    }

    incrementPointer(){
        const pointer = this.pointer;
        const links = this.links;
        const currentCMRItem = links[pointer.index];
        const paging = Math.ceil(
            currentCMRItem.noOfGranules/this.pageSize
        );
        
        if(pointer.paging < paging){
            this.pointer.paging++;
            
        }
        else if( pointer.paging === paging){
            // if(pointer.index < (links.length - 1)){
            //     this.pointer.index++;
            //     this.pointer.paging = 1;
                
            // }
            this.pointer.index++;
            this.pointer.paging = 1;
        }
        this.write();

    }

    hasNextBatch(){
        const pointer = this.pointer;
        const links = this.links;

        if(pointer.index >= links.length){
            return false;
        }

        const currentCMRItem = links[pointer.index];
        const paging = Math.ceil(
            currentCMRItem.noOfGranules/this.pageSize
        );
        
        if(pointer.index < (links.length - 1)){
            return true;
        }

        if(pointer.paging <= paging){
            return true;
        }

        return false;
    }

    getNextCMRLink(){
        const baseUrl = this.links[this.pointer.index].url;
        const paging = this.pointer.paging;
        this.incrementPointer();

        return baseUrl +[paging];
    }

    getFinalUrl(url, pageSize)  {
        url = url.replace("page_size=100", ("page_size=" + pageSize.toString()));
        return url;
    }

    fetchDownloadLinks(args=null){

        return new Promise((resolve, reject) =>{
            if(!this.hasNextBatch()){
                reject(new Error("No new links found"));
            }

            let url = null;
            let pageSize = null;

            if(args && args.login){
                if(args.url && args.url.url){
                    url = args.url.url;
                }else{
                    url = args.url;
                }
                url = url + '1'
                pageSize = 1;
            }else{
                url = this.getNextCMRLink();
                pageSize = 100; 
            }

            url = this.getFinalUrl(url, pageSize);

            fetch(url)
            .then(res => res.json())
            .then((out) => {
                const entries = out['feed']['entry'];
                const cmrLinks = [];
            
                if (entries.length === 0) {
                    swal.fire(
                        "Empty Dataset",
                        "Earthdata could not find any granules for this search. Please contact Earthdata Help Desk",
                        "error"
                    );
                }

                for (let i = 0; i < entries.length; i++) {
                    cmrLinks[i] = new DownloadItem(entries[i].links[0].href, entries[i].dataset_id);
                
                }

                // chrome.storage.sync.set({ 'datasetName': datasetName });
                resolve(cmrLinks);

            })
            // .catch(err => {
            //     swal.close();
            //     swal.fire({
            //         title: 'Could not fetch the download links',
            //         type: 'error'
            //     });
            //     reject(err);
            // });
        })
    
    }

    write(){
        try {
            this.lsManager.set({
                'CMRPointer': this.pointer,
                'CMRLinks': this.links
            })
        } catch (error) {
            throw error;
        }
    }

    getLoginLinks(all=false){
        
        return (
            new Promise (async (resolve, reject) =>{
                let loginLinks;

                try {
                    if (all){
                        

                        loginLinks = await Promise.all(
                            this.links.map((link) =>{
                                return this.fetchDownloadLinks({
                                    login: true,
                                    url: link.url 
                                })
                            }))
                            
                        function flattenDeep(arr1) {
                            return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
                        }
                        resolve(flattenDeep(loginLinks));
                        
                    }else{
    
                        loginLinks = await this.fetchDownloadLinks({
                            login: true,
                            url: this.links[this.links.length - 1].url
                        })
                        resolve(loginLinks);
                    }
                } 
                catch (error) {
                    console.error(error);
                    reject(error);
                }
                
        }))

    }

    reset(){
        this.pointer = {
            paging: 1,
            index: 0
        };
        this.links = [];
        this.write();
    }

    //handle case when total granule size is unknown

    //cmrItem = {
    //     url:
    //     noOfGranules:
    //}

}