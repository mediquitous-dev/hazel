function sendToAdminTab(tabId, event) {
    chrome.tabs.sendMessage(tabId, event).catch(function() {
        chrome.tabs.reload(tabId);
        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.tabs.sendMessage(tabId, event);
            }
        });
    });
}

chrome.runtime.onMessage.addListener(function(event, sender, sendResponse) {
    if (event.type === 'requestAdminApi') {
        chrome.tabs.query({url: 'https://admin.nugu.jp/*'}, function(tabs) {
            if (tabs.length === 0) {
                chrome.tabs.create({url: 'https://admin.nugu.jp/'}).then(function(tab) {
                    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                        if (tabId === tab.id && changeInfo.status === 'complete') {
                            chrome.tabs.onUpdated.removeListener(listener);
                            chrome.tabs.sendMessage(tab.id, event);
                        }
                    });
                });
            } else {
                sendToAdminTab(tabs[0].id, event);
            }
        });
    }
    if (event.type === 'responseAdminApi') {
        chrome.tabs.query({url: 'https://www.nugu.jp/*'}, function(tabs) {
            if (tabs.length === 0) return;
            chrome.tabs.sendMessage(tabs[0].id, event);
        });
    }
});
