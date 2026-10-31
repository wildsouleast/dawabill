/* DawaBill core maths — shared by the bill maker, GST calculator and expiry checker.
   Works in the browser (window.DawaCalc) and in Node (module.exports) for tests. */
(function (root) {
  'use strict';
  function r2(x) { return Math.round((Number(x) + Number.EPSILON) * 100) / 100; }
  function num(x) { var n = parseFloat(String(x == null ? '' : x).replace(/,/g, '')); return isFinite(n) ? n : 0; }

  // One bill line. MRP in India normally INCLUDES GST, so inclusive=true is the default.
  function computeLine(it, inclusive) {
    var qty = num(it.qty), rate = num(it.mrp), disc = Math.min(Math.max(num(it.disc), 0), 100), gst = num(it.gst);
    var gross = r2(qty * rate);
    var discAmt = r2(gross * disc / 100);
    var net = r2(gross - discAmt);
    var taxable, tax, total;
    if (inclusive !== false) { taxable = r2(net * 100 / (100 + gst)); tax = r2(net - taxable); total = net; }
    else { taxable = net; tax = r2(net * gst / 100); total = r2(net + tax); }
    var cgst = r2(tax / 2), sgst = r2(tax - cgst);
    return { qty: qty, mrp: rate, disc: disc, gst: gst, gross: gross, discAmt: discAmt, taxable: taxable, tax: tax, cgst: cgst, sgst: sgst, total: total };
  }

  function computeBill(items, opts) {
    opts = opts || {};
    var inclusive = opts.inclusive !== false;
    var lines = [], t = { gross: 0, discAmt: 0, taxable: 0, cgst: 0, sgst: 0, tax: 0, total: 0, qty: 0 }, slabs = {};
    (items || []).forEach(function (it) {
      if (!it || (!String(it.name || '').trim() && !num(it.mrp))) return;
      var l = computeLine(it, inclusive); lines.push(l);
      ['gross', 'discAmt', 'taxable', 'cgst', 'sgst', 'tax', 'total', 'qty'].forEach(function (k) { t[k] = r2(t[k] + l[k]); });
      var s = slabs[l.gst] || (slabs[l.gst] = { rate: l.gst, taxable: 0, cgst: 0, sgst: 0, tax: 0 });
      s.taxable = r2(s.taxable + l.taxable); s.cgst = r2(s.cgst + l.cgst); s.sgst = r2(s.sgst + l.sgst); s.tax = r2(s.tax + l.tax);
    });
    var payable = Math.round(t.total);
    var roundOff = opts.noRound ? 0 : r2(payable - t.total);
    if (opts.noRound) payable = t.total;
    return { lines: lines, totals: t, slabs: Object.keys(slabs).map(function (k) { return slabs[k]; }).sort(function (a, b) { return a.rate - b.rate; }), roundOff: roundOff, payable: r2(payable) };
  }

  // Simple GST calculator: amount inclusive or exclusive of GST.
  function gstSplit(amount, rate, inclusive) {
    amount = num(amount); rate = num(rate);
    var base, tax;
    if (inclusive) { base = r2(amount * 100 / (100 + rate)); tax = r2(amount - base); }
    else { base = r2(amount); tax = r2(amount * rate / 100); }
    var cgst = r2(tax / 2);
    return { base: base, tax: tax, cgst: cgst, sgst: r2(tax - cgst), total: r2(base + tax) };
  }

  /* ---------- Amount in words, Indian system (lakh / crore) ---------- */
  var EN1 = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var EN10 = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  var HI = ('शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस ' +
    'बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस ' +
    'चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरेपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ ' +
    'साठ इकसठ बासठ तिरेसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी ' +
    'अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे').split(' ');

  function two(n, lang) { if (lang === 'hi') return n ? HI[n] : ''; return n < 20 ? EN1[n] : (EN10[Math.floor(n / 10)] + (n % 10 ? ' ' + EN1[n % 10] : '')); }
  function intWords(n, lang) {
    if (n === 0) return lang === 'hi' ? HI[0] : 'Zero';
    var U = lang === 'hi' ? { cr: 'करोड़', lk: 'लाख', th: 'हज़ार', hu: 'सौ' } : { cr: 'Crore', lk: 'Lakh', th: 'Thousand', hu: 'Hundred' };
    var out = [];
    var crore = Math.floor(n / 10000000); n %= 10000000;
    if (crore) out.push(intWords(crore, lang) + ' ' + U.cr);
    var lakh = Math.floor(n / 100000); n %= 100000; if (lakh) out.push(two(lakh, lang) + ' ' + U.lk);
    var th = Math.floor(n / 1000); n %= 1000; if (th) out.push(two(th, lang) + ' ' + U.th);
    var hu = Math.floor(n / 100); n %= 100; if (hu) out.push(two(hu, lang) + ' ' + U.hu);
    if (n) out.push(two(n, lang));
    return out.join(' ');
  }
  function amountInWords(amount, lang) {
    amount = r2(Math.abs(num(amount)));
    var rupees = Math.floor(amount), paise = Math.round((amount - rupees) * 100);
    if (lang === 'hi') return 'रुपये ' + intWords(rupees, 'hi') + (paise ? ' और ' + intWords(paise, 'hi') + ' पैसे' : '') + ' मात्र';
    return 'Rupees ' + intWords(rupees, 'en') + (paise ? ' and ' + intWords(paise, 'en') + ' Paise' : '') + ' Only';
  }

  /* ---------- Expiry: "MM/YY" or "MM/YYYY"; a medicine marked EXP 08/26 is treated as valid to 31 Aug 2026 ---------- */
  function parseExpiry(s) {
    var m = String(s || '').trim().match(/^(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})$/);
    if (!m) return null;
    var mo = parseInt(m[1], 10), y = parseInt(m[2], 10);
    if (mo < 1 || mo > 12) return null;
    if (y < 100) y += 2000;
    return new Date(y, mo, 0); // last day of that month
  }
  function daysLeft(exp, today) {
    var end = typeof exp === 'string' ? parseExpiry(exp) : exp; if (!end) return null;
    var t = today ? new Date(today) : new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((end - t) / 86400000);
  }
  function expiryStatus(exp, today) {
    var d = daysLeft(exp, today); if (d === null) return { key: 'invalid', days: null };
    return { key: d < 0 ? 'expired' : d <= 30 ? 'd30' : d <= 90 ? 'd90' : d <= 180 ? 'd180' : 'ok', days: d };
  }
  function inr(x) { return num(x).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  var api = { r2: r2, num: num, computeLine: computeLine, computeBill: computeBill, gstSplit: gstSplit, amountInWords: amountInWords, parseExpiry: parseExpiry, daysLeft: daysLeft, expiryStatus: expiryStatus, inr: inr };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DawaCalc = api;
})(this);
