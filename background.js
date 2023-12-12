chrome.runtime.onMessage.addListener(function(event, sender, sendResponse) {
    if (event.type === 'requestAdminApi') {
        chrome.tabs.query({url: 'https://admin.nugu.jp/*'}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, event)
        })
    }
    if (event.type === 'responseAdminApi') {
        chrome.tabs.query({url: 'https://www.nugu.jp/*'}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, event)
        })
    }
})
