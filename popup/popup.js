// block/ unblock buttons
const blockWebsiteButton = document.getElementById("blockbtn");
const unblockWebsiteButton = document.getElementById("unblockbtn");

// url elements
let urlh3 = document.getElementById("urlh3");
let websiteHostName;
let websiteUrl;

// current status element
let currentStatusElement = document.querySelector(".current_status");

// active tab
let activeTabId;


chrome.tabs.query({ active: true }, async (tabs) => {
    // setting variables and updating html elements
    activeTabId = tabs[0].id;
    websiteUrl = tabs[0].url;
    websiteHostName = new URL(tabs[0].url).hostname
    urlh3.innerText = websiteHostName;

    // check for current webstie blocked-unblocked status
    // send a message - checkStatus, recieve a response - blocked (true/false)
   try {
    const isBlocked = await checkWebsiteStatus("checkWebsiteStatus", websiteUrl);
    updateBlockedUnblockedStatus(isBlocked ? "Blocked" : "UnBlocked");
    enableDisableButtons(isBlocked ? "Blocked" : "UnBlocked");

   } catch (error) {
        console.error("Error checking website status:", error);
   }
})



blockWebsiteButton.addEventListener("click", async () => {
    console.log("block button clicked");

    try {
        const blockedWebsites = await getBlockedWebsiteListFromLocalStorage();
        const activeTabObject = await getCurrentActiveTabObject();

        const activeTabUrl = activeTabObject.url;
        const activeTabId = activeTabObject.id;

        await AddWebsiteToLocalBlockListStorage(blockedWebsites, activeTabUrl);

        const isBlocked = await checkWebsiteStatus("checkWebsiteStatus", activeTabUrl);
        updateBlockedUnblockedStatus(isBlocked ? "Blocked" : "UnBlocked");
        enableDisableButtons(isBlocked ? "Blocked" : "UnBlocked");

        chrome.runtime.sendMessage({task: "blockWebsite", tabId: activeTabId}, (response) => {
            console.log(response, "popup js block button response");
        })

    } catch (error) {
        console.error(error, "popup js - block button catch block")
    }
})


unblockWebsiteButton.addEventListener("click", async () => {

    console.log("unblock button clicked");

    try {
        const blockedWebsites = await getBlockedWebsiteListFromLocalStorage();
        const activeTabObject = await getCurrentActiveTabObject();

        const activeTabUrl = activeTabObject.url;
        const activeTabId = activeTabObject.id;


        await RemoveWebsiteFromBlockedListLocalStorage(blockedWebsites, activeTabUrl)

       const isBlocked = await checkWebsiteStatus("checkWebsiteStatus", activeTabUrl);
       updateBlockedUnblockedStatus(isBlocked ? "Blocked" : "UnBlocked");
       enableDisableButtons(isBlocked ? "Blocked" : "UnBlocked");

       chrome.runtime.sendMessage({task: "unblockWebsite", tabId: activeTabId}, (response) => {
        console.log(response, "popup js block button response");
    })


    } catch (error) {
        console.log(error, "from popupjs unblock btn catch block");
    }

})



// utility functions
function updateBlockedUnblockedStatus(status) {
    currentStatusElement.innerText = status
}

function enableDisableButtons(status){
    if(status.toLowerCase() === "blocked"){
        blockWebsiteButton.disabled = true;
        unblockWebsiteButton.disabled = false;
    }else{
        blockWebsiteButton.disabled = false;
        unblockWebsiteButton.disabled = true;
    }
}

function getBlockedWebsiteListFromLocalStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("blocked_websites", (websites) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            } else {
                resolve(websites.blocked_websites === undefined ? [] : websites.blocked_websites)
            }
        })
    })
}


function AddWebsiteToLocalBlockListStorage(array, url) {
    return new Promise((resolve, reject) => {

        const alreadyBlocked = array.some((website) => (website.url === url));

        if(alreadyBlocked){
            reject({success:false, error: "website already blocked"})
        }

        const blockedWebsites = [...array, {url: url}];
        chrome.storage.local.set({blocked_websites: blockedWebsites}, () => {

            if(chrome.runtime.lastError){
                reject({success:false, error: chrome.runtime.lastError})
            }else{
                resolve()
            }
        })
    })
}

function RemoveWebsiteFromBlockedListLocalStorage(array, url){

    return new Promise((resolve, reject) => {

        const alreadyBlocked = array.some((website) => (website.url === url));

        if(!alreadyBlocked){
            reject({success: false, error: "website already unblocked!"})
        }

        const filteredBlockWebsites = array.filter((websiteItem) => (websiteItem.url !== url));

        chrome.storage.local.set({blocked_websites: filteredBlockWebsites}, () => {

            if (chrome.runtime.lastError) {
                reject({success:false, error: chrome.runtime.lastError})
            } else {
                resolve()
            }
            
        })
    })

    
}

function getCurrentActiveTabObject(){
    return new Promise((resolve, reject) => {
        chrome.tabs.query({active:true}, (tabs) => {
            if(chrome.runtime.lastError){
                reject(chrome.runtime.lastError)
            }else{
                resolve(tabs[0])
            }
        })
    })
}

function checkActiveTabBlockedStatus(tabId, tabUrl){

    return new Promise((resolve, reject) => {

        chrome.tabs.sendMessage(tabId, {task: "checkWebsiteStatus", url: tabUrl}, (response) => {

            if(chrome.runtime.lastError){
                reject(chrome.runtime.lastError)
            }else{
                resolve(response)
            }
            
        })

    })
}

function checkWebsiteStatus(task, url){
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({task: task, url: url}, (response) => {
            if(chrome.runtime.lastError){
                console.error(chrome.runtime.lastError, "popupjs - checkwebsitestatus");
                reject(chrome.runtime.lastError)
            }else{
                resolve(response.blocked)
            }
        })
    })
}