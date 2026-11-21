(function () {
  'use strict';

  var FALLBACK = 'https://t.me/+GcPzFfpGyl5jMzM9';
  var GROWTH_URL = 'growth.json';
  var state = { invite_links: {}, member_count: null };

  function linkFor(source) {
    return state.invite_links[source] || FALLBACK;
  }

  function applyLinks() {
    var hasMemberCount = state.member_count !== null &&
      state.member_count !== undefined &&
      Number.isFinite(Number(state.member_count));
    document.querySelectorAll('[data-telegram-source]').forEach(function (el) {
      el.href = linkFor(el.getAttribute('data-telegram-source'));
    });
    document.querySelectorAll('[data-subscriber-count]').forEach(function (el) {
      if (hasMemberCount) {
        el.textContent = Number(state.member_count).toLocaleString('ko-KR') + '명';
        el.hidden = false;
      }
    });
    if (hasMemberCount) {
      document.querySelectorAll('[data-subscriber-count-fallback]').forEach(function (el) {
        el.hidden = true;
      });
    }
  }

  window.dealbotTelegramUrl = linkFor;
  window.dealbotShareUrl = function (url, text) {
    return 'https://t.me/share/url?url=' + encodeURIComponent(url) +
      '&text=' + encodeURIComponent(text || '노트북 핫딜 알림 채널');
  };

  fetch(GROWTH_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then(function (data) {
      state = data || state;
      state.invite_links = state.invite_links || {};
      applyLinks();
      document.dispatchEvent(new CustomEvent('dealbot:growth-ready'));
    })
    .catch(function () {
      applyLinks();
      document.dispatchEvent(new CustomEvent('dealbot:growth-ready'));
    });
})();
