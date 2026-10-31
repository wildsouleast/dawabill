/* DawaBill — medical store bill / GST invoice maker. Runs fully in the browser; data stays in localStorage. */
(function () {
  'use strict';
  var C = window.DawaCalc, D = window.Dawa, t = D.t, esc = D.esc, inr = C.inr;
  var $ = function (id) { return document.getElementById(id); };
  var SHOP_F = ['shopName', 'shopAddr', 'shopPhone', 'gstin', 'dl'];
  var BILL_F = ['invNo', 'date', 'payMode', 'custName', 'custPhone', 'doctor', 'notes'];
  var state = { layout: D.store.get('layout', 'a4'), logo: D.store.get('logo', ''), items: [], id: null };

  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function drName(s) { return String(s || '').replace(/^\s*(dr\.?|डॉ\.?)\s*/i, ''); }
  function fmtDate(s) { if (!s) return ''; var p = s.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
  function settings() { return D.store.get('settings', { prefix: 'INV-', next: 1 }); }
  function nextInvNo() { var s = settings(); return s.prefix + String(s.next).padStart(4, '0'); }
  function blankItem() { return { name: '', batch: '', exp: '', hsn: '', qty: 1, mrp: '', disc: 0, gst: 5 }; }

  /* ---------- item rows ---------- */
  function itemHTML(it, i) {
    var g = [0, 5, 12, 18].map(function (r) { return '<option value="' + r + '"' + (Number(it.gst) === r ? ' selected' : '') + '>' + r + '%</option>'; }).join('');
    function f(key, cls, type, extra) {
      return '<div class="' + (cls || '') + '"><label for="it' + i + key + '">' + esc(t(key === 'name' ? 'itemName' : key === 'exp' ? 'expiry' : key)) + '</label>' +
        '<input id="it' + i + key + '" data-k="' + key + '" data-i="' + i + '" type="' + (type || 'text') + '" value="' + esc(it[key]) + '" ' + (extra || '') + '></div>';
    }
    return '<div class="item" data-i="' + i + '"><span class="num">' + (i + 1) + '</span><div class="grid">' +
      f('name', 'f-name', 'text', 'autocomplete="off" placeholder="e.g. Paracetamol 650 Tab"') +
      f('batch', '', 'text', 'autocomplete="off"') +
      f('exp', '', 'text', 'inputmode="numeric" placeholder="MM/YY" maxlength="7"') +
      f('hsn', '', 'text', 'inputmode="numeric" placeholder="3004"') +
      f('qty', '', 'number', 'inputmode="decimal" min="0" step="any"') +
      f('mrp', '', 'number', 'inputmode="decimal" min="0" step="any" placeholder="0.00"') +
      f('disc', '', 'number', 'inputmode="decimal" min="0" max="100" step="any"') +
      '<div><label for="it' + i + 'gst">' + esc(t('gst')) + '</label><select id="it' + i + 'gst" data-k="gst" data-i="' + i + '">' + g + '</select></div>' +
      '<div class="line-total"><span class="lt" id="lt' + i + '"></span><button type="button" class="btn small danger" data-del="' + i + '">' + esc(t('remove')) + '</button></div>' +
      '</div></div>';
  }
  function renderItems() {
    $('items').innerHTML = state.items.map(itemHTML).join('');
    update();
  }

  /* ---------- read / write form ---------- */
  function readForm() {
    var b = { shop: {}, bill: {} };
    SHOP_F.forEach(function (k) { b.shop[k] = $(k).value.trim(); });
    BILL_F.forEach(function (k) { b.bill[k] = $(k).value.trim(); });
    b.inclusive = $('inclusive').checked; b.round = $('roundoff').checked;
    b.items = state.items.map(function (x) { return Object.assign({}, x); });
    return b;
  }
  function calc(b) { return C.computeBill(b.items, { inclusive: b.inclusive, noRound: !b.round }); }

  function update() {
    var b = readForm(), r = calc(b);
    D.store.set('shop', b.shop);
    D.store.set('draft', { bill: b.bill, items: b.items, inclusive: b.inclusive, round: b.round, id: state.id });
    // per-line totals
    var li = 0;
    state.items.forEach(function (it, i) {
      var el = $('lt' + i); if (!el) return;
      var l = C.computeLine(it, b.inclusive);
      var st = it.exp ? C.expiryStatus(it.exp) : null;
      el.innerHTML = esc(t('lineTotal')) + ': <b>₹' + inr(l.total) + '</b>' + (st && st.key === 'expired' ? ' <span class="st expired">' + esc(t('expired')) + '</span>' : '');
    });
    var T = r.totals;
    $('totals').innerHTML =
      '<span>' + esc(t('gross')) + '</span><span>₹' + inr(T.gross) + '</span>' +
      '<span>' + esc(t('discount')) + '</span><span>− ₹' + inr(T.discAmt) + '</span>' +
      '<span>' + esc(t('taxable')) + '</span><span>₹' + inr(T.taxable) + '</span>' +
      '<span>' + esc(t('cgst')) + '</span><span>₹' + inr(T.cgst) + '</span>' +
      '<span>' + esc(t('sgst')) + '</span><span>₹' + inr(T.sgst) + '</span>' +
      (b.round ? '<span>' + esc(t('roundOff')) + '</span><span>' + (r.roundOff >= 0 ? '+' : '−') + ' ₹' + inr(Math.abs(r.roundOff)) + '</span>' : '') +
      '<span class="grand">' + esc(t('payable')) + '</span><span class="grand">₹' + inr(r.payable) + '</span>';
    $('words').textContent = C.amountInWords(r.payable, D.lang());
    $('barSum').textContent = '₹' + inr(r.payable);
    renderInvoice(b, r);
  }

  /* ---------- invoice markup ---------- */
  function renderInvoice(b, r) {
    var inv = $('invoice'), s = b.shop, bl = b.bill, L = D.lang();
    var hasGst = !!s.gstin, hasHsn = b.items.some(function (x) { return String(x.hsn || '').trim(); });
    var title = hasGst ? t('taxInvoice') : t('cashMemo');
    var rows = r.lines.length ? r.lines : [];
    var named = b.items.filter(function (it) { return String(it.name || '').trim() || C.num(it.mrp); });
    var words = C.amountInWords(r.payable, L);
    inv.className = 'invoice' + (state.layout === 'thermal' ? ' thermal' : '');
    if (state.layout === 'thermal') {
      inv.innerHTML =
        (state.logo ? '<img src="' + state.logo + '" alt="">' : '') +
        '<div class="t-c"><h3>' + esc(s.shopName || t('shopName')) + '</h3>' +
        (s.shopAddr ? '<div>' + esc(s.shopAddr) + '</div>' : '') + (s.shopPhone ? '<div>Ph: ' + esc(s.shopPhone) + '</div>' : '') +
        (s.gstin ? '<div>GSTIN: ' + esc(s.gstin) + '</div>' : '') + (s.dl ? '<div>DL: ' + esc(s.dl) + '</div>' : '') +
        '<hr><b>' + esc(title) + '</b></div>' +
        '<div class="kv"><span>' + esc(t('invNo')) + ' ' + esc(bl.invNo) + '</span><span>' + esc(fmtDate(bl.date)) + '</span></div>' +
        (bl.custName ? '<div>' + esc(t('billTo')) + ': ' + esc(bl.custName) + (bl.custPhone ? ' (' + esc(bl.custPhone) + ')' : '') + '</div>' : '') +
        (bl.doctor ? '<div>' + esc(t('dr')) + ' ' + esc(drName(bl.doctor)) + '</div>' : '') + '<hr>' +
        '<table>' + named.map(function (it, i) {
          var l = rows[i];
          return '<tr><td colspan="3"><b>' + esc(it.name) + '</b>' + (it.batch ? ' B:' + esc(it.batch) : '') + (it.exp ? ' E:' + esc(it.exp) : '') + '</td></tr>' +
            '<tr><td>' + l.qty + ' x ' + inr(l.mrp) + (l.disc ? ' -' + l.disc + '%' : '') + '</td><td>G' + l.gst + '%</td><td style="text-align:right">' + inr(l.total) + '</td></tr>';
        }).join('') + '</table><hr>' +
        '<div class="kv"><span>' + esc(t('items_')) + ': ' + named.length + ' / ' + esc(t('qty')) + ': ' + r.totals.qty + '</span></div>' +
        (r.totals.discAmt ? '<div class="kv"><span>' + esc(t('discount')) + '</span><span>-' + inr(r.totals.discAmt) + '</span></div>' : '') +
        '<div class="kv"><span>' + esc(t('taxable')) + '</span><span>' + inr(r.totals.taxable) + '</span></div>' +
        '<div class="kv"><span>' + esc(t('cgst')) + '</span><span>' + inr(r.totals.cgst) + '</span></div>' +
        '<div class="kv"><span>' + esc(t('sgst')) + '</span><span>' + inr(r.totals.sgst) + '</span></div>' +
        (b.round ? '<div class="kv"><span>' + esc(t('roundOff')) + '</span><span>' + (r.roundOff >= 0 ? '+' : '') + inr(r.roundOff) + '</span></div>' : '') +
        '<hr><div class="kv g"><span>' + esc(t('payable')) + '</span><span>Rs ' + inr(r.payable) + '</span></div>' +
        '<div style="margin-top:4px">' + esc(words) + '</div>' +
        (bl.payMode ? '<div>' + esc(t('mode')) + ': ' + esc(t(bl.payMode)) + '</div>' : '') +
        (bl.notes ? '<div>' + esc(bl.notes) + '</div>' : '') +
        '<hr><div class="t-c">' + esc(t('thanks')) + '</div>';
      return;
    }
    var head = '<tr><th>' + esc(t('sn')) + '</th><th>' + esc(t('item')) + '</th>' + (hasHsn ? '<th>HSN</th>' : '') + '<th>' + esc(t('batch')) + '</th><th>' + esc(t('exp')) + '</th><th class="r">' + esc(t('qty')) + '</th><th class="r">' + esc(t('rate')) + '</th><th class="r">' + esc(t('disc')) + '</th><th class="r">' + esc(t('gst')) + '</th><th class="r">' + esc(t('amount')) + '</th></tr>';
    var body = named.map(function (it, i) {
      var l = rows[i];
      return '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(it.name) + '</td>' + (hasHsn ? '<td>' + esc(it.hsn) + '</td>' : '') + '<td>' + esc(it.batch) + '</td><td>' + esc(it.exp) + '</td><td class="r">' + l.qty + '</td><td class="r">' + inr(l.mrp) + '</td><td class="r">' + (l.disc || 0) + '</td><td class="r">' + l.gst + '</td><td class="r">' + inr(l.total) + '</td></tr>';
    }).join('') || '<tr><td colspan="10" class="c small">—</td></tr>';
    var slab = '<table class="slab"><tr><th>' + esc(t('rateCol')) + '</th><th class="r">' + esc(t('taxable')) + '</th><th class="r">CGST</th><th class="r">SGST</th></tr>' +
      r.slabs.map(function (x) { return '<tr><td>' + x.rate + '% (' + x.rate / 2 + '+' + x.rate / 2 + ')</td><td class="r">' + inr(x.taxable) + '</td><td class="r">' + inr(x.cgst) + '</td><td class="r">' + inr(x.sgst) + '</td></tr>'; }).join('') + '</table>';
    inv.innerHTML =
      '<div class="ih">' + (state.logo ? '<img src="' + state.logo + '" alt="logo">' : '') +
      '<div class="shop"><h3>' + esc(s.shopName || t('shopName')) + '</h3>' +
      (s.shopAddr ? '<div>' + esc(s.shopAddr) + '</div>' : '') +
      '<div>' + [s.shopPhone ? 'Ph: ' + esc(s.shopPhone) : '', s.gstin ? 'GSTIN: ' + esc(s.gstin) : '', s.dl ? 'DL No: ' + esc(s.dl) : ''].filter(Boolean).join(' &nbsp;|&nbsp; ') + '</div></div>' +
      '<div class="ttl"><h4>' + esc(title) + '</h4><div>' + esc(t('invNo')) + ' <b>' + esc(bl.invNo) + '</b></div><div>' + esc(t('date')) + ': ' + esc(fmtDate(bl.date)) + '</div>' + (bl.payMode ? '<div>' + esc(t('mode')) + ': ' + esc(t(bl.payMode)) + '</div>' : '') + '</div></div>' +
      '<div class="meta"><div><b>' + esc(t('billTo')) + ':</b> ' + esc(bl.custName || '—') + (bl.custPhone ? ' &nbsp; Ph: ' + esc(bl.custPhone) : '') + '</div>' + (bl.doctor ? '<div><b>' + esc(t('dr')) + '</b> ' + esc(drName(bl.doctor)) + '</div>' : '') + '</div>' +
      '<table>' + head + body + '</table>' +
      '<div class="sum"><div>' + (r.slabs.length ? '<div class="small" style="margin-bottom:3px">' + esc(t('gstSummary')) + '</div>' + slab : '') + '</div>' +
      '<div class="tot">' +
      '<div><span>' + esc(t('gross')) + '</span><span>' + inr(r.totals.gross) + '</span></div>' +
      (r.totals.discAmt ? '<div><span>' + esc(t('discount')) + '</span><span>− ' + inr(r.totals.discAmt) + '</span></div>' : '') +
      '<div><span>' + esc(t('taxable')) + '</span><span>' + inr(r.totals.taxable) + '</span></div>' +
      '<div><span>CGST</span><span>' + inr(r.totals.cgst) + '</span></div><div><span>SGST</span><span>' + inr(r.totals.sgst) + '</span></div>' +
      (b.round ? '<div><span>' + esc(t('roundOff')) + '</span><span>' + (r.roundOff >= 0 ? '+' : '−') + inr(Math.abs(r.roundOff)) + '</span></div>' : '') +
      '<div class="g"><span>' + esc(t('payable')) + '</span><span>₹ ' + inr(r.payable) + '</span></div></div></div>' +
      '<div class="aw"><b>' + esc(t('inWords')) + ':</b> ' + esc(words) + '</div>' +
      (bl.notes ? '<div class="aw">' + esc(bl.notes) + '</div>' : '') +
      '<div class="foot"><div>' + esc(t('thanks')) + '<br><span class="small">' + esc(t('computer')) + '</span></div><div class="sign">' + esc(t('sign')) + '<br>' + esc(s.shopName || '') + '</div></div>';
    fitPreview();
  }
  function fitPreview() {
    var box = $('previewBox'), sc = $('previewScale'), inv = $('invoice'); if (!box) return;
    var avail = box.clientWidth - 20, w = inv.offsetWidth || 718, k = Math.min(1, avail / w);
    sc.style.transform = 'scale(' + k + ')';
    sc.style.height = (inv.offsetHeight * k) + 'px'; sc.style.width = (w * k) + 'px';
  }

  /* ---------- saving / recent bills ---------- */
  function recent() { return D.store.get('bills', []); }
  function saveBill(silent) {
    var b = readForm(), r = calc(b);
    if (!r.lines.length) { D.toast(t('needItem')); return null; }
    var list = recent(), id = state.id || ('b' + Date.now());
    var rec = { id: id, saved: Date.now(), bill: b.bill, items: b.items, inclusive: b.inclusive, round: b.round, payable: r.payable };
    list = list.filter(function (x) { return x.id !== id; }); list.unshift(rec); list = list.slice(0, 60);
    D.store.set('bills', list); state.id = id;
    // auto-increment: if this bill used the "next" number, move the counter on
    var s = settings();
    if (b.bill.invNo === s.prefix + String(s.next).padStart(4, '0')) { s.next++; D.store.set('settings', s); }
    renderRecent(); update();
    if (!silent) D.toast(t('saved'));
    return rec;
  }
  function loadBill(rec, asCopy) {
    BILL_F.forEach(function (k) { $(k).value = rec.bill[k] || ''; });
    $('inclusive').checked = rec.inclusive !== false; $('roundoff').checked = rec.round !== false;
    state.items = rec.items.map(function (x) { return Object.assign(blankItem(), x); });
    state.id = asCopy ? null : rec.id;
    if (asCopy) { $('invNo').value = nextInvNo(); $('date').value = today(); }
    renderItems(); window.scrollTo({ top: $('billCard').offsetTop - 70, behavior: 'smooth' });
  }
  function renderRecent() {
    var list = recent(), el = $('recent');
    if (!list.length) { el.innerHTML = '<li class="muted">' + esc(t('noRecent')) + '</li>'; return; }
    el.innerHTML = list.map(function (x) {
      return '<li><div class="meta"><b>' + esc(x.bill.invNo) + '</b> · ' + esc(fmtDate(x.bill.date)) + (x.bill.custName ? ' · ' + esc(x.bill.custName) : '') + '<br><span class="muted">₹' + inr(x.payable) + ' · ' + x.items.length + ' ' + esc(t('items_')) + '</span></div>' +
        '<div class="row-actions" style="margin:0"><button class="btn small ghost" data-open="' + x.id + '">' + esc(t('open')) + '</button><button class="btn small ghost" data-dup="' + x.id + '">' + esc(t('dup')) + '</button><button class="btn small danger" data-rm="' + x.id + '">' + esc(t('del')) + '</button></div></li>';
    }).join('');
  }
  function newBill() {
    state.id = null; state.items = [blankItem()];
    ['custName', 'custPhone', 'doctor', 'notes'].forEach(function (k) { $(k).value = ''; });
    $('invNo').value = nextInvNo(); $('date').value = today(); renderItems();
  }

  /* ---------- PDF / print ---------- */
  function fileName() { var b = readForm(); return (b.bill.invNo || 'bill').replace(/[^\w\-]+/g, '_') + (state.layout === 'thermal' ? '-80mm' : '') + '.pdf'; }
  function loadH2P() {
    return new Promise(function (res, rej) {
      if (window.html2pdf) return res(window.html2pdf);
      var s = document.createElement('script'); s.src = $('h2pSrc').getAttribute('data-src');
      s.onload = function () { res(window.html2pdf); }; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function downloadPDF() {
    if (!saveBill(true)) return;
    D.toast(t('pdfMaking'));
    var inv = $('invoice');
    loadH2P().then(function (h2p) {
      var thermal = state.layout === 'thermal';
      var hmm = Math.ceil(inv.offsetHeight * 25.4 / 96) + 8;
      var opt = {
        margin: thermal ? [2, 1, 2, 1] : [8, 8, 8, 8], filename: fileName(), image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: thermal ? 3 : 2, backgroundColor: '#ffffff', useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: thermal ? [80, Math.max(hmm, 60)] : 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' }
      };
      return h2p().set(opt).from(inv).save();
    }).then(function () { D.toast(t('pdfDone')); }).catch(function () { D.toast('PDF failed – use Print → Save as PDF'); });
  }
  function doPrint() {
    saveBill(true);
    var root = $('print-root'); root.innerHTML = '';
    var c = $('invoice').cloneNode(true); c.removeAttribute('id'); root.appendChild(c);
    var ps = $('pageStyle'); ps.textContent = state.layout === 'thermal' ? '@page{size:80mm auto;margin:2mm}' : '@page{size:A4;margin:10mm}';
    document.body.classList.add('printing');
    setTimeout(function () { window.print(); }, 50);
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('printing'); });
  function shareText() {
    var b = readForm(), r = calc(b), L = [];
    L.push((b.shop.shopName || 'Bill') + ' — ' + b.bill.invNo + ' (' + fmtDate(b.bill.date) + ')');
    b.items.filter(function (x) { return String(x.name || '').trim(); }).forEach(function (x, i) { L.push((i + 1) + '. ' + x.name + ' x' + x.qty + ' = ₹' + inr(r.lines[i] ? r.lines[i].total : 0)); });
    L.push(t('payable') + ': ₹' + inr(r.payable));
    var url = 'https://wa.me/' + (b.bill.custPhone ? b.bill.custPhone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1') : '') + '?text=' + encodeURIComponent(L.join('\n'));
    window.open(url, '_blank', 'noopener');
  }

  /* ---------- logo ---------- */
  function onLogo(e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var img = new Image();
      img.onload = function () {
        var m = 240, k = Math.min(1, m / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
        state.logo = cv.toDataURL('image/png'); D.store.set('logo', state.logo); $('logoRm').hidden = false; update();
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var shop = D.store.get('shop', {}), draft = D.store.get('draft', null), s = settings();
    SHOP_F.forEach(function (k) { $(k).value = shop[k] || ''; });
    $('prefix').value = s.prefix; $('nextNo').value = s.next;
    if (draft && draft.items && draft.items.length) {
      BILL_F.forEach(function (k) { $(k).value = (draft.bill && draft.bill[k]) || ''; });
      state.items = draft.items; state.id = draft.id || null;
      $('inclusive').checked = draft.inclusive !== false; $('roundoff').checked = draft.round !== false;
      if (!$('invNo').value) $('invNo').value = nextInvNo();
      if (!$('date').value) $('date').value = today();
    } else { $('invNo').value = nextInvNo(); $('date').value = today(); state.items = [blankItem()]; }
    $('billForm').addEventListener('submit', function (e) { e.preventDefault(); });
    $('logoRm').hidden = !state.logo;
    setLayout(state.layout); renderItems(); renderRecent();

    document.querySelectorAll('#shopCard input, #shopCard textarea, #billCard input, #billCard select, #billCard textarea, #inclusive, #roundoff').forEach(function (el) { el.addEventListener('input', update); el.addEventListener('change', update); });
    $('items').addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k'), i = e.target.getAttribute('data-i'); if (k == null) return;
      var v = e.target.value;
      if (k === 'exp') { v = v.replace(/[^\d\/]/g, ''); if (/^\d{2}$/.test(v) && (e.inputType || '').indexOf('delete') < 0) v += '/'; e.target.value = v; }
      state.items[i][k] = v; update();
    });
    $('items').addEventListener('change', function (e) { var k = e.target.getAttribute('data-k'), i = e.target.getAttribute('data-i'); if (k != null) { state.items[i][k] = e.target.value; update(); } });
    $('items').addEventListener('click', function (e) {
      var d = e.target.getAttribute('data-del'); if (d == null) return;
      state.items.splice(+d, 1); if (!state.items.length) state.items.push(blankItem()); renderItems();
    });
    $('addItem').addEventListener('click', function () { state.items.push(blankItem()); renderItems(); var n = $('it' + (state.items.length - 1) + 'name'); if (n) n.focus(); });
    $('logoIn').addEventListener('change', onLogo);
    $('logoRm').addEventListener('click', function () { state.logo = ''; D.store.set('logo', ''); $('logoIn').value = ''; $('logoRm').hidden = true; update(); });
    ['prefix', 'nextNo'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        var st = { prefix: $('prefix').value, next: Math.max(1, parseInt($('nextNo').value, 10) || 1) }; D.store.set('settings', st);
        if (!state.id) { $('invNo').value = nextInvNo(); update(); }
      });
    });
    document.querySelectorAll('[data-layout]').forEach(function (b) { b.addEventListener('click', function () { setLayout(b.getAttribute('data-layout')); update(); }); });
    $('btnPdf').addEventListener('click', downloadPDF); $('btnPdf2').addEventListener('click', downloadPDF);
    $('btnPrint').addEventListener('click', doPrint); $('btnSave').addEventListener('click', function () { saveBill(); });
    $('btnNew').addEventListener('click', newBill); $('btnShare').addEventListener('click', shareText);
    $('recent').addEventListener('click', function (e) {
      var id, list = recent();
      if ((id = e.target.getAttribute('data-open'))) loadBill(list.find(function (x) { return x.id === id; }), false);
      else if ((id = e.target.getAttribute('data-dup'))) loadBill(list.find(function (x) { return x.id === id; }), true);
      else if ((id = e.target.getAttribute('data-rm'))) { D.store.set('bills', list.filter(function (x) { return x.id !== id; })); if (state.id === id) state.id = null; renderRecent(); D.toast(t('deleted')); }
    });
    window.addEventListener('resize', fitPreview);
    document.addEventListener('dawa:lang', function () { renderItems(); renderRecent(); });
  });
  function setLayout(l) {
    state.layout = l; D.store.set('layout', l);
    document.querySelectorAll('[data-layout]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-layout') === l)); });
  }
})();
