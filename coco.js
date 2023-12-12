let pending = false

const periods = [
    {label: '오늘', value: dayjs().format('YYYY-MM-DD')},
    {label: '최근7일', value: dayjs().subtract(7, 'day').format('YYYY-MM-DD')},
    {label: '최근30일', value: dayjs().subtract(30, 'day').format('YYYY-MM-DD')},
]

const periodHtml = periods.map(period => `<option value="${period.value}">${period.label}</option>`).join('')

document.querySelector('.navbar-nav').insertAdjacentHTML('beforeend', `
<div class="input-group">
    <select class="form-select" id="hazel-period" aria-label="Example select with button addon">
        ${periodHtml}
    </select>
    <button class="btn btn-secondary" type="button" id="hazel-start">hazel</button>
</div>
`)
document.querySelector('#hazel-start').addEventListener('click', function() {
    pending = true
    document.querySelectorAll('.hazel-info').forEach(badge => badge.remove())
    const productLinks = Array.from(document.querySelectorAll('a[href^="/product/"]'))
    const productCodes = [...new Set(productLinks.map(link => link.href.split('/').pop()))]
    params = {
        groupby_fields: 'product__code',
        count_fields: 'id',
        created__gte: document.querySelector('#hazel-period').value,
        product__code__in: productCodes.join(','),
        action: 'view_item'
    }
    chrome.runtime.sendMessage({
        type: 'requestAdminApi',
        apiUrl: `/adminapi/v1/customerevent/annotate/?${Object.keys(params).map(key => `${key}=${params[key]}`).join('&')}`
    })
})

chrome.runtime.onMessage.addListener(function(event, sender, sendResponse) {
    if (event.type === 'responseAdminApi') {
       pending = false
       const {data} = event
        data.forEach(item => {
            const aElement = document.querySelector(`a[href="/product/${item.product__code}"]`)
            const parentElement = aElement.parentElement
            const htmlContent = `
                    <div style="position: absolute;right:0;top:0;" class="hazel-info">
                      <span class="badge badge-pill bg-danger">조회 ${item.id__count}</span>
                    </div>
            `
            parentElement.insertAdjacentHTML('beforeend', htmlContent)
        })
    }
})
