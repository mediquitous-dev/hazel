let pending = false

const periods = [
    { label: '최근 30분', time: 10, unit: 'minute' },
    { label: '최근 1시간', time: 1, unit: 'hour' },
    { label: '최근 3시간', time: 3, unit: 'hour' },
    { label: '최근 6시간', time: 6, unit: 'hour' },
    { label: '최근 12시간', time: 12, unit: 'hour' },
    { label: '오늘', time: 0, unit: 'day' },
    { label: '최근7일', time: 7, unit: 'day' },
    { label: '최근30일', time: 30, unit: 'day' }
]

document.querySelector('.navbar-nav').insertAdjacentHTML('beforeend', `
<div class="input-group">
    <span class="input-group-text">상품스탯</span>
    <select class="form-select" id="hazel-period" aria-label="Example select with button addon">
        <option value="">보지않음</option>
        ${periods.map(period => `<option value="${period.label}">${period.label}</option>`).join('')}
    </select>
</div>
`)

function loadDataAndAdd(periodValue) {
    if (!periodValue) return;

    const period = periods.find(period => period.label === periodValue)
    const periodStart = period.time ? dayjs().subtract(period.time, period.unit).format('YYYY-MM-DD HH:mm:ss') : dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss')

    pending = true;
    document.querySelectorAll('.hazel-info').forEach(badge => badge.remove());

    const productLinks = getVisibleElements('a[href^="/product/"]');
    if (!productLinks.length) return;

    const productCodes = [...new Set(productLinks.map(link => link.href.split('/').pop()))];
    const viewitemParams = {
        groupby_fields: 'product__code',
        count_fields: 'id',
        created__gte: periodStart,
        product__code__in: productCodes.join(','),
        action: 'view_item'
    }
    const orderitemParams = {
        groupby_fields: 'product_variant__product__code',
        count_fields: 'id',
        ordered__gte: periodStart,
        product_variant__product__code__in: productCodes.join(',')
    }
    chrome.runtime.sendMessage({
        type: 'requestAdminApi',
        apiUrls: [
            `/adminapi/v1/customerevent/annotate/?${Object.keys(viewitemParams).map(key => `${key}=${viewitemParams[key]}`).join('&')}`,
            `/adminapi/v1/orderitem/annotate/?${Object.keys(orderitemParams).map(key => `${key}=${orderitemParams[key]}`).join('&')}`,
        ]
    });
}

function getVisibleElements(selector) {
  const elements = document.querySelectorAll(selector);
  const visibleElements = [];

  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
      visibleElements.push(el);
    }
  });

  return visibleElements;
}

document.querySelector('#hazel-period').addEventListener('change', function (event) {
    loadDataAndAdd(event.target.value);
})

let timeout;
window.addEventListener('scroll', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        const periodValue = document.querySelector('#hazel-period').value;
        loadDataAndAdd(periodValue);
    }, 300); // 300ms 디바운스
});



chrome.runtime.onMessage.addListener(function (event, sender, sendResponse) {
    if (event.type === 'responseAdminApi') {
        pending = false
        const {data} = event
        const [viewitemData, orderitemData] = data
        const dataMap = {}
        viewitemData.forEach(item => {
            dataMap[item.product__code] = {
                viewCount: item.id__count
            }
        })
        orderitemData.forEach(item => {
            dataMap[item.product_variant__product__code] = {
                orderCount: item.id__count, ...dataMap[item.product_variant__product__code]
            }
        })
        Object.keys(dataMap).forEach(productCode => {
            const aElement = document.querySelector(`a[href="/product/${productCode}"]`)
            if (!aElement) {
                return
            }
            const parentElement = aElement.parentElement
            const htmlContent = `
                    <div style="position: absolute;right:0;top:0;opacity: 0.8;font-size:80%" class="hazel-info">
                        <table class="table table-sm table-borderless m-0">
                          <tbody>
                            <tr>
                              <td class="py-0">조회</td>
                              <td class="text-end py-0">${dataMap[productCode].viewCount ?? '-'}</td>
                            </tr>
                            <tr>
                              <td class="py-0">구매</td>
                              <td class="text-end py-0">${dataMap[productCode].orderCount ?? '-'}</td>
                            </tr>
                            <tr>
                              <td class="py-0">CVR</td>
                              <td class="text-end py-0">${(dataMap[productCode].orderCount && dataMap[productCode].viewCount) ? (dataMap[productCode].orderCount / dataMap[productCode].viewCount * 100).toFixed(2) : '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                    </div>
            `
            parentElement.insertAdjacentHTML('beforeend', htmlContent)
        })
    }
})
