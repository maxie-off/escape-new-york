// 介面語言：繁體中文（zh）或 English（en）。存在瀏覽器裡，下次打開還是同一種語言。
// tr('中文', 'English') 依目前語言選一個；L(x) 把伺服器送來的 { zh, en } 換成目前語言（已經是字串就原樣回傳）。
(function () {
  let lang = 'zh';
  try { lang = localStorage.getItem('lang') === 'en' ? 'en' : 'zh'; } catch (e) { /* ignore */ }
  const listeners = [];
  const I18N = {
    get lang() { return lang; },
    set(l) {
      lang = l === 'en' ? 'en' : 'zh';
      try { localStorage.setItem('lang', lang); } catch (e) { /* ignore */ }
      I18N.apply();
      listeners.forEach((f) => f(lang));
    },
    onChange(f) { listeners.push(f); },
    // 靜態 HTML：data-zh / data-en 換文字，data-ph-zh / data-ph-en 換 placeholder，data-aria-zh / data-aria-en 換 aria-label
    apply(root = document) {
      document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
      root.querySelectorAll('[data-zh]').forEach((el) => { el.textContent = el.dataset[lang]; });
      root.querySelectorAll('[data-ph-zh]').forEach((el) => { el.placeholder = lang === 'en' ? el.dataset.phEn : el.dataset.phZh; });
      root.querySelectorAll('[data-aria-zh]').forEach((el) => { el.setAttribute('aria-label', lang === 'en' ? el.dataset.ariaEn : el.dataset.ariaZh); });
      root.querySelectorAll('[data-lang]').forEach((el) => el.classList.toggle('on', el.dataset.lang === lang));
    },
  };
  window.I18N = I18N;
  window.tr = (zh, en) => (lang === 'en' ? en : zh);
  window.L = (x) => (x && typeof x === 'object' && 'zh' in x ? (lang === 'en' ? x.en : x.zh) : x);
  document.addEventListener('DOMContentLoaded', () => I18N.apply());
})();
