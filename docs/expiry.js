/* Medicine expiry checker + stock expiry list */
(function () {
  'use strict';
  var C = window.DawaCalc, D = window.Dawa, t = D.t, esc = D.esc, $ = function (id) { return document.getElementById(id); };
  var filter = 'all';
  function list() { return D.store.get('stock', []); }
  function save(l) { D.store.set('stock', l); render(); }
  function fmtEnd(d) { return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; }
  function badge(st) { return '<span class="st ' + st.key + '">' + esc(t('st_' + st.key)) + '</span>'; }
  function daysTxt(st) { return st.days === null ? '' : st.days < 0 ? Math.abs(st.days) + ' ' + t('daysAgo') : st.days + ' ' + t('daysLeft'); }
  function quick() {
    var v = $('qExp').value, st = C.expiryStatus(v), end = C.parseExpiry(v);
    $('qOut').innerHTML = !v ? '' : st.key === 'invalid' ? badge(st) + ' <span class="muted">MM/YY</span>' :
      badge(st) + ' <b>' + esc(daysTxt(st)) + '</b> <span class="muted">· ' + esc(t('validTill')) + ' ' + esc(fmtEnd(end)) + '</span>';
  }
  function render() {
    var l = list().map(function (x, i) { var st = C.expiryStatus(x.exp); return { x: x, i: i, st: st }; });
    var counts = { expired: 0, d30: 0, d90: 0, d180: 0, ok: 0 };
    l.forEach(function (r) { if (counts[r.st.key] != null) counts[r.st.key]++; });
    $('stats').innerHTML = ['expired', 'd30', 'd90', 'd180', 'ok'].map(function (k) { return '<div class="st ' + k + '"><b>' + counts[k] + '</b>' + esc(t('st_' + k)) + '</div>'; }).join('');
    l.sort(function (a, b) { return (a.st.days === null ? 1e9 : a.st.days) - (b.st.days === null ? 1e9 : b.st.days); });
    var rows = l.filter(function (r) { return filter === 'all' || r.st.key === filter; });
    $('stockBody').innerHTML = rows.length ? rows.map(function (r) {
      return '<tr><td><b>' + esc(r.x.name) + '</b>' + (r.x.batch ? '<br><span class="muted">' + esc(r.x.batch) + '</span>' : '') + '</td><td>' + esc(r.x.exp) + '</td><td class="r">' + esc(r.x.qty) + '</td><td>' + badge(r.st) + '<br><span class="note">' + esc(daysTxt(r.st)) + '</span></td><td><button class="btn small danger" data-rm="' + r.i + '" aria-label="' + esc(t('del')) + ' ' + esc(r.x.name) + '">✕</button></td></tr>';
    }).join('') : '<tr><td colspan="5" class="muted">—</td></tr>';
  }
  function add() {
    var x = { name: $('sName').value.trim(), batch: $('sBatch').value.trim(), exp: $('sExp').value.trim(), qty: $('sQty').value.trim() };
    if (!x.name || !C.parseExpiry(x.exp)) { D.toast(t('st_invalid')); return; }
    var l = list(); l.push(x); save(l);
    $('sName').value = ''; $('sBatch').value = ''; $('sExp').value = ''; $('sQty').value = ''; $('sName').focus();
  }
  function csv() {
    var rows = [['Medicine', 'Batch', 'Expiry', 'Qty', 'Status', 'Days left']].concat(list().map(function (x) { var st = C.expiryStatus(x.exp); return [x.name, x.batch, x.exp, x.qty, D.t('st_' + st.key), st.days]; }));
    var s = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + s], { type: 'text/csv' })); a.download = 'expiry-list.csv'; a.click();
  }
  function slash(e) { var v = e.target.value.replace(/[^\d\/]/g, ''); if (/^\d{2}$/.test(v) && (e.inputType || '').indexOf('delete') < 0) v += '/'; e.target.value = v; }
  document.addEventListener('DOMContentLoaded', function () {
    $('qExp').addEventListener('input', function (e) { slash(e); quick(); });
    $('sExp').addEventListener('input', slash);
    $('addStock').addEventListener('click', add);
    $('stockForm').addEventListener('submit', function (e) { e.preventDefault(); add(); });
    $('stockBody').addEventListener('click', function (e) { var i = e.target.getAttribute('data-rm'); if (i == null) return; var l = list(); l.splice(+i, 1); save(l); });
    document.querySelectorAll('[data-f]').forEach(function (b) { b.addEventListener('click', function () { filter = b.getAttribute('data-f'); document.querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); render(); }); });
    $('btnCsv').addEventListener('click', csv);
    $('btnPrintList').addEventListener('click', function () { window.print(); });
    $('btnClear').addEventListener('click', function () { if (confirm(t('clearAll') + '?')) save([]); });
    document.addEventListener('dawa:lang', function () { render(); quick(); });
    render();
  });
})();
