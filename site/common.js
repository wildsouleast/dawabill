/* DawaBill shared: language toggle, toast, storage helpers */
(function () {
  'use strict';
  var D = window.DawaI18N || {};
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('dawabill.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('dawabill.' + k, JSON.stringify(v)); return true; } catch (e) { toast('Storage full – delete old bills'); return false; } }
  };
  function lang() { return store.get('lang', 'en'); }
  function t(key) { var l = lang(); return (D[l] && D[l][key]) || (D.en && D.en[key]) || key; }
  function apply() {
    var l = lang();
    document.documentElement.setAttribute('data-lang', l);
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    var b = document.getElementById('langBtn'); if (b) { b.textContent = l === 'hi' ? 'English' : 'हिंदी'; b.setAttribute('aria-label', l === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'); }
    document.dispatchEvent(new CustomEvent('dawa:lang', { detail: l }));
  }
  var tt;
  function toast(msg) {
    var el = document.getElementById('toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  window.Dawa = { store: store, lang: lang, t: t, apply: apply, toast: toast, esc: esc };
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('langBtn');
    if (b) b.addEventListener('click', function () { store.set('lang', lang() === 'hi' ? 'en' : 'hi'); apply(); });
    var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
    apply();
  });
})();
