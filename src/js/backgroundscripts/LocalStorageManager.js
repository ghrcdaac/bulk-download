class LocalStorageManager{
    
    constructor(){
        this.bluePrint = {
            'enumStates': ['idle', 'ongoing', 'canceled', 'paused', 'disconnected'],
            'lastState': 'idle',
            'popupStats': {
                totalNoofFiles: 0,
                completed: 0,
                in_progress: 0,
                interrupted: 0,
                progress: 0,
                failed:[],
                jobCount: 0,
                jobIndex: 0,
                jobs: []
            },
            'enumCMRState': ['idle', 'ongoing'],
            'CMRPointer': {
                paging: 0,
                dataset: 0
            },
            'CMRLinks': [],
            'projectsCount': 0,
            'queue': {
                'inQueue': false, //true or false
                'reason': null, //paused or disconnected
                'ids': {}, //{ids:links}
                'links': [] //downloadItems
            }
    
        }
    }

    //know modes at when initializing
    getInitialState(lsItem){

        if(typeof lsItem !== 'object'){
            console.error(lsItem, "is not an object.");
            throw new Error('TypeError');
        }

        //if we don't find a lastState we assume the extension
        //hasn't run before or it was clear
        if(!lsItem['lastState']){
            return 'idle';
        }

        if(!this.bluePrint['enumStates'].includes(lsItem['lastState'])){
            console.error(lsItem['lastState'], "is not a valid state.");
            throw new Error('TypeError');
        }

        //cases where thing were paused, and quit before resuming
        if(
            lsItem['pause'] &&
            lsItem['pause'].length !== 0
        ){
            return 'disconnected';
        }

        //for now we assume that CMR Links are sucessfully seleted after 
        //download batch is complete
        //we may need to modify this condition if we notice otherwise
        if(
            lsItem['CMRLinks'] &&
            lsItem['CMRLinks'].length !== 0
        ){
            return 'disconnected';
        }

        return lsItem['lastState'];
    }

    get(key, onlyValue=true){
        return new Promise((resolve, reject) =>{
            chrome.storage.local.get(key, (items) => {
                if(chrome.runtime.lastError){
                    reject(chrome.runtime.lastError);
                }
                else{
                    if(onlyValue){
                        resolve(items[key]);
                    }else{
                        resolve(items);
                    }
                    
                }
            })
        })
    }

    set(item){
        return new Promise ((resolve, reject) => {
            chrome.storage.local.set(item, () => {
                if(chrome.runtime.lastError){
                    reject(chrome.runtime.lastError);
                }else{
                    resolve();
                }
            })
        })
    }

    //init ls and returns lastState
    async init(reset = false){

        try {
            // if(reset){
            //     this.set(this.bluePrint);
            //     return 'idle';
            // }

            let items = await this.get(null, false);
            const state = this.getInitialState(items);

            if (state === 'canceled'){
                items = this.bluePrint;
                this.set(items);
                return state;
            }

            Object.keys(this.bluePrint).forEach( key => {
                if(!items[key]){
                    items[key] = this.bluePrint[key];
                }
            })

            this.set(items);
            return state;

        } catch (error) {
            throw(error);
        }
    }

    reset(){
        return new Promise((resolve, reject) =>{
            chrome.storage.local.clear(() =>{
                if(chrome.runtime.lastError){
                    reject(chrome.runtime.lastError);
                }
                resolve(this.init());
            })
        })
    }

    log(key){
        return(
            this.get(key)
                .then((item)=>console.log(item))
                .catch(err => {
                    throw err;
                })
        )
    }
}

