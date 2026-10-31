/* GST calculator for medicines */
(function () {
  'use strict';
  var C = window.DawaCalc, D = window.Dawa, t = D.t, inr = C.inr, $ = function (id) { return document.getElementById(id); };
  var mode = 'incl';
  function run() {
    var amt = $('gAmt').value, rate = +$('gRate').value, incl = mode === 'incl';
    var r = C.gstSplit(amt, rate, incl);
    $('gOut').innerHTML =
      '<span>' + t('base') + '</span><b>₹' + inr(r.base) + '</b>' +
      '<span>CGST (' + rate / 2 + '%)</span><b>₹' + inr(r.cgst) + '</b>' +
      '<span>SGST (' + rate / 2 + '%)</span><b>₹' + inr(r.sgst) + '</b>' +
      '<span>' + t('totalGst') + ' (' + rate + '%)</span><b>₹' + inr(r.tax) + '</b>' +
      '<span class="big">' + t('totalAmt') + '</span><b class="big">₹' + inr(r.total) + '</b>';
    $('gWords').textContent = C.amountInWords(r.total, D.lang());
    $('gTable').innerHTML = '<tr><th>' + t('rateLbl') + '</th><th class="r">' + t('base') + '</th><th class="r">' + t('totalGst') + '</th><th class="r">' + t('totalAmt') + '</th></tr>' +
      [0, 5, 12, 18].map(function (g) { var x = C.gstSplit(amt, g, incl); return '<tr><td>' + g + '%</td><td class="r">' + inr(x.base) + '</td><td class="r">' + inr(x.tax) + '</td><td class="r">' + inr(x.total) + '</td></tr>'; }).join('');
    D.store.set('gst', { amt: amt, rate: rate, mode: mode });
  }
  function setMode(m) { mode = m; document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); }); run(); }
  document.addEventListener('DOMContentLoaded', function () {
    var s = D.store.get('gst', { amt: '100', rate: 5, mode: 'incl' });
    $('gAmt').value = s.amt; $('gRate').value = String(s.rate);
    ['gAmt', 'gRate'].forEach(function (id) { $(id).addEventListener('input', run); $(id).addEventListener('change', run); });
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
    document.addEventListener('dawa:lang', run);
    setMode(s.mode || 'incl');
  });
})();
