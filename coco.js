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

document.body.insertAdjacentHTML(
    "beforeend",
    `
<div style="position:fixed;top:8px;right:8px;z-index:99999;display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #d1d5db;border-radius:6px;padding:4px 8px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <span style="font-size:12px;font-weight:500;white-space:nowrap">상품스탯</span>
    <select style="font-size:12px;border:1px solid #d1d5db;border-radius:4px;padding:2px 4px;background:#fff" id="hazel-period">
        <option value="">보지않음</option>
        ${periods.map((period) => `<option value="${period.label}">${period.label}</option>`).join("")}
    </select>
</div>
`,
);

function loadDataAndAdd(periodValue) {
    if (!periodValue) return;

    const period = periods.find(period => period.label === periodValue)
    const periodStart = period.time ? dayjs().subtract(period.time, period.unit).format('YYYY-MM-DD HH:mm:ss') : dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss')

    pending = true;
    document.querySelectorAll('.hazel-info').forEach(badge => badge.remove());

    const productLinks = getVisibleElements('a[href^="/product/"]');
    if (!productLinks.length) return;

    const productCodes = [...new Set(productLinks.map(link => link.href.split('/').pop()))];

    const pendingHtmlContent = `
            <div class="hazel-spinner" style="margin:8px;display:inline-block;width:16px;height:16px;border:2px solid #3b82f6;border-right-color:transparent;border-radius:50%;animation:hazel-spin 0.75s linear infinite" role="status"></div>
            <style>@keyframes hazel-spin{to{transform:rotate(360deg)}}</style>
    `;
    productCodes.forEach(productCode => {
        showOnThumbnal(productCode, pendingHtmlContent)
    })
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
    const apiUrls = [
        `/adminapi/v1/customerevent/annotate/?${Object.keys(viewitemParams)
            .map((key) => `${key}=${viewitemParams[key]}`)
            .join("&")}`,
        `/adminapi/v1/orderitem/annotate/?${Object.keys(orderitemParams)
            .map((key) => `${key}=${orderitemParams[key]}`)
            .join("&")}`,
    ];
    chrome.runtime.sendMessage({ type: "requestAdminApi", apiUrls });
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
        document.querySelectorAll('.hazel-spinner').forEach(spinner => spinner.remove())
        Object.keys(dataMap).forEach(productCode => {
            const htmlContent = `
                        <table style="margin:0;font-size:12px;border-collapse:collapse">
                          <tbody>
                            <tr>
                              <td style="padding:0 4px 0 0">조회</td>
                              <td style="padding:0;text-align:right">${dataMap[productCode].viewCount ?? "-"}</td>
                            </tr>
                            <tr>
                              <td style="padding:0 4px 0 0">구매</td>
                              <td style="padding:0;text-align:right">${dataMap[productCode].orderCount ?? "-"}</td>
                            </tr>
                            <tr>
                              <td style="padding:0 4px 0 0">CVR</td>
                              <td style="padding:0;text-align:right">${dataMap[productCode].orderCount && dataMap[productCode].viewCount ? ((dataMap[productCode].orderCount / dataMap[productCode].viewCount) * 100).toFixed(2) : "-"}</td>
                            </tr>
                          </tbody>
                        </table>
            `;
            showOnThumbnal(productCode, htmlContent)
        })
    }
})

function showOnThumbnal(productCode, htmlContent) {
    const aElements = document.querySelectorAll(`a[href="/product/${productCode}"].text-black`)
    aElements.forEach(aElement => {
        // console.log(productCode)
        // console.log(aElement)
        // console.log(aElement.parentElement)
        const parentElement = aElement.parentElement;
        if (parentElement.querySelector(".hazel-info")) {
            parentElement.querySelector(".hazel-info").innerHTML = htmlContent;
        } else {
            parentElement.insertAdjacentHTML(
                "beforeend",
                `<div style="position: absolute;right:0;top:0;opacity: 0.8;font-size:80%" class="hazel-info">${htmlContent}</div>`,
            );
        }
    })
}
