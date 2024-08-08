console.log("Content Script Inserted!");




chrome.runtime.sendMessage({task:'checkAllWebsitesStatus'}, (response) => {
    console.log("blocking websites....");
})
