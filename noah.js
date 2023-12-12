chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'requestAdminApi') {
        fetch(request.apiUrl)
            .then(response => response.json())
            .then(data => {
                chrome.runtime.sendMessage({type: 'responseAdminApi', data});
            })
            .catch(error => reject(error));
    }
})
