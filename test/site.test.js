const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const SITE = path.join(__dirname, '..', 'site');
const C = require(path.join(SITE, 'calc.js'));
const read = p => fs.readFileSync(path.join(SITE, p), 'utf8');
const PAGES = ['index.html', 'gst-calculator/index.html', 'medicine-expiry-checker/index.html', 'about/index.html', 'contact/index.html', 'privacy-policy/index.html', 'terms/index.html'];

test('bill maths case 1: MRP-inclusive, mixed GST slabs, discount, round-off', () => {
  const b = C.computeBill([
    { name: 'Paracetamol 650', qty: 2, mrp: 30.91, disc: 10, gst: 5 },
    { name: 'Amoxicillin 500', qty: 1, mrp: 112, disc: 0, gst: 12 },
    { name: 'Cough syrup', qty: 3, mrp: 85.5, disc: 5, gst: 18 }]);
  // hand check: line1 61.82-6.18=55.64 -> taxable 55.64/1.05=52.99, gst 2.65 (1.33+1.32)
  assert.deepStrictEqual([b.lines[0].taxable, b.lines[0].tax, b.lines[0].cgst, b.lines[0].sgst], [52.99, 2.65, 1.33, 1.32]);
  // line2 112 -> 100 + 12 (6+6); line3 256.5-12.83=243.67 -> 206.5 + 37.17
  assert.deepStrictEqual([b.lines[1].taxable, b.lines[1].tax], [100, 12]);
  assert.deepStrictEqual([b.lines[2].discAmt, b.lines[2].total, b.lines[2].taxable, b.lines[2].tax], [12.83, 243.67, 206.5, 37.17]);
  assert.strictEqual(b.totals.total, 411.31);
  assert.strictEqual(b.totals.cgst + b.totals.sgst, b.totals.tax);
  assert.strictEqual(C.r2(b.totals.taxable + b.totals.tax), b.totals.total);
  assert.strictEqual(b.roundOff, -0.31);
  assert.strictEqual(b.payable, 411);
  assert.strictEqual(C.amountInWords(b.payable, 'en'), 'Rupees Four Hundred Eleven Only');
});

test('bill maths case 2: GST-exclusive rates, round-off up', () => {
  const b = C.computeBill([{ name: 'Glucometer strips', qty: 1, mrp: 849.5, disc: 0, gst: 12 }, { name: 'Sanitizer', qty: 2, mrp: 45, disc: 0, gst: 18 }], { inclusive: false });
  // 849.5*12% = 101.94 -> 951.44 ; 90*18% = 16.2 -> 106.2 ; total 1057.64 -> 1058 (+0.36)
  assert.strictEqual(b.lines[0].tax, 101.94); assert.strictEqual(b.lines[1].tax, 16.2);
  assert.strictEqual(b.totals.total, 1057.64); assert.strictEqual(b.roundOff, 0.36); assert.strictEqual(b.payable, 1058);
  assert.strictEqual(b.lines[0].cgst, 50.97); assert.strictEqual(b.lines[0].sgst, 50.97);
  assert.strictEqual(C.amountInWords(1058, 'hi'), 'रुपये एक हज़ार अट्ठावन मात्र');
});

test('amount in words uses lakh/crore', () => {
  assert.strictEqual(C.amountInWords(123456789, 'en'), 'Rupees Twelve Crore Thirty Four Lakh Fifty Six Thousand Seven Hundred Eighty Nine Only');
  assert.strictEqual(C.amountInWords(250.5, 'en'), 'Rupees Two Hundred Fifty and Fifty Paise Only');
  assert.strictEqual(C.amountInWords(100000, 'hi'), 'रुपये एक लाख मात्र');
});

test('GST calculator split', () => {
  assert.deepStrictEqual(C.gstSplit(105, 5, true), { base: 100, tax: 5, cgst: 2.5, sgst: 2.5, total: 105 });
  assert.deepStrictEqual(C.gstSplit(100, 12, false), { base: 100, tax: 12, cgst: 6, sgst: 6, total: 112 });
});

test('expiry: month end, status buckets', () => {
  assert.strictEqual(C.daysLeft('11/26', '2026-10-31'), 30);
  assert.strictEqual(C.expiryStatus('09/26', '2026-10-31').key, 'expired');
  assert.strictEqual(C.expiryStatus('10/2026', '2026-10-31').key, 'd30');
  assert.strictEqual(C.expiryStatus('12/26', '2026-10-31').key, 'd90');
  assert.strictEqual(C.expiryStatus('13/27').key, 'invalid');
});

test('pages: title, viewport, canonical, single h1, local assets exist, no broken placeholders', () => {
  for (const p of PAGES) {
    const h = read(p);
    assert.match(h, /<title>[^<]{10,}<\/title>/, p);
    assert.match(h, /<meta name="viewport" content="width=device-width, initial-scale=1">/, p);
    assert.match(h, /<link rel="canonical" href="https:\/\//, p);
    assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1, p + ' h1');
    assert.doesNotMatch(h, /lorem|TODO|\{\{|undefined/i, p);
    assert.doesNotMatch(h, /onclick=|onsubmit=/, p + ' inline handler');
    const dir = path.dirname(path.join(SITE, p));
    for (const m of h.matchAll(/(?:src|href)="([^"#:]+?)"/g)) {
      let ref = m[1]; if (ref.startsWith('/')) continue;
      const f = path.join(dir, ref); const target = ref.endsWith('/') || ref === '' ? path.join(f, 'index.html') : f;
      assert.ok(fs.existsSync(target), p + ' -> ' + ref);
    }
  }
});

test('home page SEO + core tool content', () => {
  const h = read('index.html');
  assert.match(h, /<h1>Free Medical Bill Generator – Pharmacy GST Invoice Maker<\/h1>/);
  assert.match(h, /"@type": "WebApplication"/); assert.match(h, /"@type": "FAQPage"/);
  for (const id of ['shopName', 'gstin', 'dl', 'logoIn', 'custName', 'doctor', 'items', 'addItem', 'btnPdf', 'btnPrint', 'recent', 'langBtn', 'invoice'])
    assert.match(h, new RegExp('id="' + id + '"'), id);
  assert.match(h, /data-layout="thermal"/); assert.match(h, /lang="hi"/);
  assert.ok((h.match(/class="ad-slot/g) || []).length >= 2, 'ad slots');
  assert.ok(fs.existsSync(path.join(SITE, 'vendor/html2pdf.bundle.min.js')));
  for (const f of ['sitemap.xml', 'robots.txt', 'og.png', 'favicon.svg', '404.html']) assert.ok(fs.existsSync(path.join(SITE, f)), f);
  assert.match(read('sitemap.xml'), /medicine-expiry-checker\//);
  assert.match(read('robots.txt'), /Sitemap: https:/);
  assert.match(read('privacy-policy/index.html'), /cookies/i);
});
