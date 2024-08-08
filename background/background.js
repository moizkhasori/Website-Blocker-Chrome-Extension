// background file - logs extension worker me ayege, na k webstie inspect element me
chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            injectDefaultContentScript(tab.id, tab.url)
        }
    })
})


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.task === "checkWebsiteStatus") {

        (async() => {
            try {
                const blocked_websites = await getBlockedWebsiteListFromLocalStorage();
                const blocked = blocked_websites.some((website) => (website.url === message.url));
                sendResponse({ blocked: blocked });

            } catch (error) {
                sendResponse({ error: true, errorObject: error });
            }
        })();

        return true;
        
    }


    if (message.task === "blockWebsite") {

        (async () => {
            try {
                await executeScript(message.tabId, "ReplaceFiles/replace.js")
                await insertCSS(message.tabId, "ReplaceFiles/replace.css")
                sendResponse({ success: true })
            } catch (error) {
                sendResponse({ success:false, error: error })
            }

        })();

        return true;

    }


    if (message.task === "unblockWebsite") {
        (async () => {
            try {
                await reloadTab(message.tabId);
                sendResponse({ success: true })
            } catch (error) {
                sendResponse({ success: false, error: error })
            }

            
        })();

        return true;
    }

    if(message.task === "checkAllWebsitesStatus"){

        (async() => {
            try {

                const blockedWebsites = await getBlockedWebsiteListFromLocalStorage();
                const senderTabUrl = sender.tab.url;
                const senderTabId = sender.tab.id;

                if(isChromeInternalUrl(senderTabUrl)){
                    sendResponse({success: false, message: "internal chrome url!"})
                    return true;
                }

                const isCurrentTabBlocked = blockedWebsites.some((website) => website.url === senderTabUrl)

                if(isCurrentTabBlocked){

                    await executeScript(senderTabId, "ReplaceFiles/replace.js")
                    await insertCSS(senderTabId, "ReplaceFiles/replace.css")
                    sendResponse({success: true})

                }else{
                    sendResponse({success: false, message:"URL not Blocked"})
                }


                
            } catch (error) {
                sendResponse({ success: false, error: error })
            }
        })();

        return true;
    }

})

function injectDefaultContentScript(tabId, tabUrl){

    // cant insert into urls including chrome://
    if(tabUrl.includes("chrome://")){
        console.log("Default Chrome Url - cannot insert Content Script!");
        return;
    }

    chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ["contentScript/contentScript.js"]
    }, (data) => {
        console.log(`content script inserted successfully from extension install/upadte event! - ${new URL(tabUrl).hostname}`);
    })

}

function executeScript(tabId, scriptFile){
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: {tabId:tabId},
            files: [scriptFile]
        }, () => {
            if(chrome.runtime.lastError){
                reject(chrome.runtime.lastError)
            }else{
                resolve();
            }
        })
    })
}

function insertCSS(tabId, cssFile){
    return new Promise((resolve, reject) => {
        chrome.scripting.insertCSS({
            target:{ tabId: tabId},
            files: [cssFile]
        }, () => {
            if(chrome.runtime.lastError){
                reject(chrome.runtime.lastError)
            }else{
                resolve();
            }
        })
    })
}

function reloadTab(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.reload(tabId, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

function isChromeInternalUrl(url){
    return url.includes("chrome://")
}

function getBlockedWebsiteListFromLocalStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("blocked_websites", (websites) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            } else {
                resolve(websites.blocked_websites || [])
            }
        })
    })
}