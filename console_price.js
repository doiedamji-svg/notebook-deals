// Layer 6 — v15 콘솔 가격 추출 (장기 안전망)
//
// 사용자가 쿠팡 페이지를 볼 때 자동 가격 추출 → 8765 서버에 POST.
// Akamai 입장에서 100% 정상 사용자 트래픽 → 차단 위험 0.
//
// 사용법:
//   1. 북마클릿: javascript:fetch('https://100.93.57.43:8765/static/console_price.js').then(r=>r.text()).then(eval)
//   2. 콘솔에 코드 붙여넣기 → 페이지 새로고침마다 자동 실행
//
// 작동 흐름:
//   1. URL에서 productId 추출
//   2. DOM에서 가격 + 카드할인 + 재고 추출
//   3. localhost:8765/price-update POST
//   4. 결과 콘솔 출력 (성공 시 ✅)
//
// 추출 항목:
//   - product_id, item_id, vendor_item_id (URL + DOM)
//   - 현재가 (couponPrice 또는 salePrice)
//   - 원가
//   - 카드 추가 할인율
//   - WOW 가격
//   - 재고 (soldout 표시 여부)
//   - 타이틀

(function () {
    "use strict";

    const SERVER_URL = "https://100.93.57.43:8765/price-update";  // Mac Mini Tailscale
    const VERSION = "v1.0";

    function logInfo(msg) { console.log(`[PriceExtract ${VERSION}] ${msg}`); }
    function logErr(msg, err) { console.error(`[PriceExtract ${VERSION}] ${msg}`, err); }

    // URL 파싱
    const url = new URL(location.href);
    const pidMatch = location.pathname.match(/\/vp\/products\/(\d+)/);
    if (!pidMatch) {
        logInfo("쿠팡 상품 페이지 아님 — skip");
        return;
    }
    const productId = pidMatch[1];
    const itemId = url.searchParams.get("itemId") || "";
    const vendorItemId = url.searchParams.get("vendorItemId") || "";

    // DOM 추출 (쿠팡 selector — v15 콘솔 추출 패턴 참고)
    function num(el) {
        if (!el) return null;
        const t = el.textContent.replace(/[^0-9]/g, "");
        return t ? parseInt(t, 10) : null;
    }

    function pickFirst(selectors) {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    const title = pickFirst([
        "h2.prod-buy-header__title",
        "h1.prod-buy-header__title",
        ".prod-buy-header__title",
    ])?.textContent.trim();

    const currentPrice = num(pickFirst([
        ".total-price strong",
        ".total-price > .price-value",
        ".prod-coupon-price-content .total-price strong",
        ".prod-price-info .total-price strong",
    ]));

    const originalPrice = num(pickFirst([
        ".origin-price",
        ".prod-origin-price del",
        ".prod-price-info .origin-price",
    ]));

    // 카드 추가 할인 (% 텍스트)
    let cardDiscountPct = null;
    const cardEl = pickFirst([
        ".prod-coupon-card-discount-message",
        ".card-discount",
    ]);
    if (cardEl) {
        const m = cardEl.textContent.match(/(\d+)\s*%/);
        if (m) cardDiscountPct = parseInt(m[1], 10);
    }

    // 재고
    const soldoutEl = pickFirst([
        ".oos-label",
        ".prod-no-buy",
        ".soldout-info",
    ]);
    const isSoldout = !!soldoutEl;

    // WOW 가격 (있으면)
    const wowPrice = num(pickFirst([
        ".prod-wow-price strong",
        ".wow-price",
    ]));

    const payload = {
        product_id: productId,
        item_id: itemId,
        vendor_item_id: vendorItemId,
        title: title,
        current_price: currentPrice,
        original_price: originalPrice,
        card_discount_pct: cardDiscountPct,
        wow_price: wowPrice,
        is_soldout: isSoldout,
        extracted_at: new Date().toISOString(),
        source: "console_price_v1",
        page_url: location.href,
    };

    if (!currentPrice && !isSoldout) {
        logInfo("가격 추출 실패 — DOM 변경 가능성. skip");
        return;
    }

    // 서버 POST
    fetch(SERVER_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
        mode: "cors",
    })
        .then(r => r.json())
        .then(res => {
            logInfo(`✅ 가격 전송 완료: ${currentPrice?.toLocaleString()}원 — ${title?.slice(0, 30)}...`);
        })
        .catch(err => {
            logErr("전송 실패 (서버 unreachable?)", err);
        });
})();
