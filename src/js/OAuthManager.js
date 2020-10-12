class OAuthManager{
    
    constructor(){
        if(!OAuthManager.instance){
            OAuthManager.instance = this;
            this.credentials ={
                clientID: 'NOwxMlnUZ7AN4tuTgvkppg',
                redirectUri: encodeURIComponent(chrome.identity.getRedirectURL()),
                credential:'YW51cGFtZGFoYWwxOl9oMzdCakRxIWNxUDU4Iw=='
            }
        }
        return this;
    }

    postRequest(requestBody){
        const url = 'https://urs.earthdata.nasa.gov/oauth/token';

        return new Promise(resolve =>{
            fetch(url, requestBody)
                .then(res => res.json())
                .then(out => resolve(out))
                .catch(err => console.error(err))
        })
    }

    getAuthUrl(){
        const authUrl = "https://urs.earthdata.nasa.gov/oauth/authorize?client_id=" + this.credentials.clientID + "&redirect_uri=" + this.credentials.redirectUri + "&response_type=code";
        return authUrl;
    }

    getRedirectedURL(){
        const authUrl = this.getAuthUrl();

        return new Promise(resolve => {
            chrome.identity.launchWebAuthFlow({
                'url': authUrl,
                'interactive': true
            }, resolve)
        });
        
    }

    getAuthorizationToken(){
        return(
            this.getRedirectedURL()
                .then(redirectURL => {
                    return redirectURL.substring(redirectURL.lastIndexOf('=') + 1);
                })
        )
    }

    getAccessToken(){
        return(
            this.getAuthorizationToken()
                .then(authToken => {
                    console.log(authToken)
                    const requestBody = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': 'Basic ' + this.credentials.credential,
                            'Host': 'urs.earthdata.nasa.gov'
                        },
                        body: `grant_type=authorization_code&code=${authToken}&redirect_uri=${this.credentials.redirectUri}`
                    }

                    return this.postRequest(requestBody);

                })
        )
    }

    refreshAccessToken(refreshToken){
        const requestBody = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + this.credentials.credential,
                'Host': 'urs.earthdata.nasa.gov'
            },
            body: `grant_type=refresh_token&refresh_token=${refreshToken}`
        }

        return this.postRequest(requestBody);

    }


}