chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'requestAdminApi') {
        Promise.all(request.apiUrls.map(apiUrl => fetch(apiUrl)))
            .then(responses => Promise.all(responses.map(response => response.json())))
            .then(data => {
                chrome.runtime.sendMessage({type: 'responseAdminApi', data});
            })
            .catch(error => reject(error));
    }
})
