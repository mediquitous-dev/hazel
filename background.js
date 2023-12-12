chrome.runtime.onMessage.addListener(function(event, sender, sendResponse) {
    if (event.type === 'requestAdminApi') {
        console.log('requestAdminApi', event)
        chrome.tabs.query({url: 'https://admin.nugu.jp/*'}, function(tabs) {
            console.log('tabs', tabs)
            chrome.tabs.sendMessage(tabs[0].id, event)
        })
    }
    if (event.type === 'responseAdminApi') {
        console.log('responseAdminApi', event)
        chrome.tabs.query({url: 'https://www.nugu.jp/*'}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, event)
        })
    }
})
