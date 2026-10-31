#!/usr/bin/env python3
"""Builds DawaBill's static pages into site/. Change BASE when a custom domain is added, then re-run."""
import json, os, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, 'site')
BASE = os.environ.get('DAWABILL_BASE', 'https://wildsouleast.github.io/dawabill/')
NAME = 'DawaBill'
TODAY = datetime.date.today().isoformat()

LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0f7a4f"/><path d="M9 7h10l4 4v14H9z" fill="#fff"/><path d="M19 7v4h4" fill="#cfe9dc"/><rect x="14" y="13" width="4" height="10" rx="1" fill="#0f7a4f"/><rect x="11" y="16" width="10" height="4" rx="1" fill="#0f7a4f"/></svg>'

NAV = [('', 'Bill Maker'), ('gst-calculator/', 'GST Calculator'), ('medicine-expiry-checker/', 'Expiry Checker')]

def ad(name, tall=False):
    return f'<!-- AD SLOT: {name} — paste the AdSense <ins> unit here after approval; keep the reserved height -->\n<div class="ad-slot{" tall" if tall else ""} noprint" data-ad-slot="{name}" aria-hidden="true">Advertisement</div>'

def page(path, title, desc, body, scripts=(), jsonld=(), h_lang='en', extra_head=''):
    depth = path.count('/')
    rel = '../' * depth
    url = BASE + path
    nav = ''.join(f'<a href="{rel}{p}"{" aria-current=page" if p == path else ""}>{n}</a>' for p, n in NAV)
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>' for j in jsonld)
    sc = ''.join(f'<script src="{rel}{s}"></script>' for s in scripts)
    has_lang = any(s in ('bill.js', 'gst.js', 'expiry.js') for s in scripts)
    return f"""<!doctype html>
<html lang="{h_lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#0f7a4f">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{NAME}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}og.png">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{rel}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{rel}styles.css">
{extra_head}{ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site noprint"><div class="wrap">
<a class="logo" href="{rel}">{LOGO}<span>Dawa<b>Bill</b></span></a>
<nav class="main" aria-label="Main">{nav}</nav>
{'<button id="langBtn" class="lang" type="button">हिंदी</button>' if has_lang else ''}
</div></header>
<main id="main">
{body}
</main>
<footer class="site noprint"><div class="wrap cols">
<div><b>DawaBill</b> — free billing tools for Indian medical stores and pharmacies. Works in your browser; your bills stay on your device.<br><span class="muted" style="color:#9fb8ab">Tools only. Nothing on this site is medical advice.</span></div>
<div><b>Tools</b><ul><li><a href="{rel}">Medical bill generator</a></li><li><a href="{rel}gst-calculator/">GST calculator for medicines</a></li><li><a href="{rel}medicine-expiry-checker/">Medicine expiry checker</a></li></ul></div>
<div><b>Site</b><ul><li><a href="{rel}about/">About</a></li><li><a href="{rel}contact/">Contact</a></li><li><a href="{rel}privacy-policy/">Privacy policy</a></li><li><a href="{rel}terms/">Terms of use</a></li></ul></div>
<div style="grid-column:1/-1;color:#9fb8ab">© <span id="yr">2026</span> DawaBill</div>
</div></footer>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<div id="print-root"></div>
<script src="{rel}i18n.js"></script><script src="{rel}calc.js"></script><script src="{rel}common.js"></script>{sc}
</body>
</html>
"""

def write(path, html):
    out = os.path.join(SITE, path, 'index.html') if path.endswith('/') or path == '' else os.path.join(SITE, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write(html)

def faq_ld(items):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a, _, _ in items]}

def faq_html(items):
    return ''.join(f'<details><summary>{q}</summary><p>{a}</p><p class="hi" lang="hi"><b>{qh}</b><br>{ah}</p></details>' for q, a, qh, ah in items)

def webapp(name, path, desc):
    return {"@context": "https://schema.org", "@type": "WebApplication", "name": name, "url": BASE + path, "description": desc,
            "applicationCategory": "BusinessApplication", "operatingSystem": "Any (web browser)", "inLanguage": ["en-IN", "hi-IN"],
            "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "INR"}}

GST_SRC = 'https://gstcouncil.gov.in/sites/default/files/2025-09/press_release_press_information_bureau_0.pdf'

# ------------------------------------------------------------------ HOME: bill maker
HOME_FAQ = [
 ("Is this medical bill generator really free?",
  "Yes. DawaBill is free to use with no login and no limit on bills. The site is supported by ads.",
  "क्या यह मेडिकल बिल जनरेटर सच में फ्री है?", "हाँ, बिल्कुल फ्री है। न लॉगिन चाहिए, न बिलों की कोई सीमा। साइट विज्ञापनों से चलती है।"),
 ("Where are my bills and shop details saved?",
  "Only in your own browser (localStorage) on the phone or computer you use. Nothing is uploaded to our server. If you clear browser data or change phone, saved bills are gone, so keep the PDFs you need.",
  "मेरे बिल और दुकान की जानकारी कहाँ सेव होती है?", "सिर्फ आपके अपने फ़ोन/कंप्यूटर के ब्राउज़र में। हमारे सर्वर पर कुछ नहीं जाता। ब्राउज़र डेटा साफ़ करने या फ़ोन बदलने पर सेव बिल चले जाते हैं, इसलिए ज़रूरी PDF रख लें।"),
 ("How is GST calculated on medicine MRP?",
  "MRP printed on medicines already includes GST. So the tool takes the amount after discount and works backwards: taxable value = amount × 100 ÷ (100 + GST%). The GST is split equally into CGST and SGST. If your rates are without GST, untick “MRP includes GST” and GST is added on top.",
  "दवा के MRP पर GST कैसे निकलता है?", "दवा का MRP पहले से GST सहित होता है। टूल छूट के बाद की राशि से उल्टा हिसाब लगाता है: कर योग्य राशि = राशि × 100 ÷ (100 + GST%)। GST आधा CGST और आधा SGST में बँटता है। अगर आपकी रेट GST के बिना है तो “MRP में GST शामिल है” का टिक हटा दें।"),
 ("Which GST rate should I use for medicines?",
  "Check the rate for each product's HSN code with your CA or on the GST portal. As per the GST Council's 56th meeting (effective 22 September 2025), most medicines moved to 5% and some life-saving drugs to nil. The tool lets you pick 0%, 5%, 12% or 18% for every item.",
  "दवाओं पर कौन सा GST रेट लगाएँ?", "हर प्रोडक्ट के HSN कोड का रेट अपने CA या GST पोर्टल से जाँच लें। GST काउंसिल की 56वीं बैठक (22 सितंबर 2025 से लागू) के अनुसार ज़्यादातर दवाएँ 5% पर और कुछ जीवनरक्षक दवाएँ 0% पर आ गईं। टूल में हर आइटम के लिए 0%, 5%, 12% या 18% चुन सकते हैं।"),
 ("Can I print on a thermal printer?",
  "Yes. Choose “80mm receipt” and press Print or Download PDF. The receipt layout fits common 80 mm thermal printers. For a normal printer choose A4.",
  "क्या थर्मल प्रिंटर पर प्रिंट हो सकता है?", "हाँ। “80mm रसीद” चुनें और प्रिंट या PDF डाउनलोड दबाएँ। यह 80mm थर्मल प्रिंटर के लिए है। साधारण प्रिंटर के लिए A4 चुनें।"),
 ("Is a bill without GSTIN valid?",
  "If you are not GST-registered, leave GSTIN empty and the bill prints as a “Cash memo / Bill”. With a GSTIN it prints as a “Tax invoice”. Your CA can tell you what your shop needs.",
  "बिना GSTIN का बिल चल सकता है?", "अगर आप GST में रजिस्टर्ड नहीं हैं तो GSTIN खाली छोड़ें, बिल “कैश मेमो / बिल” के नाम से बनेगा। GSTIN डालने पर “टैक्स इनवॉइस” बनेगा। आपकी दुकान को क्या चाहिए, यह आपके CA बताएँगे।"),
 ("Does the invoice number go up automatically?",
  "Yes. Every saved or downloaded bill moves the counter to the next number (INV-0001, INV-0002…). You can change the prefix and the next number any time.",
  "क्या बिल नंबर अपने-आप बढ़ता है?", "हाँ। हर सेव या डाउनलोड किए बिल के बाद नंबर अगला हो जाता है (INV-0001, INV-0002…)। प्रीफ़िक्स और अगला नंबर कभी भी बदल सकते हैं।"),
]
HOME_DESC = "Free medical bill generator for Indian chemists: make pharmacy GST invoices with batch, expiry, MRP, discount, CGST/SGST and amount in words. Download PDF (A4 or 80mm). No login."
home_body = f"""
<div class="wrap">
<section class="hero">
<h1>Free Medical Bill Generator – Pharmacy GST Invoice Maker</h1>
<p>Make a clean medical store bill in under a minute: medicine name, batch, expiry, MRP, discount and GST with automatic CGST/SGST, round-off and amount in words. Download a PDF or print on A4 or an 80&nbsp;mm thermal printer. Free, no login, and your data stays on your device.</p>
<ul class="badges"><li>100% free</li><li>No login</li><li>PDF + Print</li><li>A4 &amp; 80mm</li><li>हिंदी / English</li></ul>
</section>
{ad('home-top')}
<form id="billForm" autocomplete="on">
<section class="card" id="shopCard" aria-labelledby="hShop">
<h2 id="hShop"><span data-i18n="shopDetails">Shop details</span> <small>· <span data-i18n="savedDevice">saved on this device only</span></small></h2>
<div class="grid g2">
<div><label for="shopName" data-i18n="shopName">Medical store name</label><input id="shopName" placeholder="e.g. Shree Ram Medical Hall" autocomplete="organization"></div>
<div><label for="shopPhone" data-i18n="shopPhone">Phone</label><input id="shopPhone" inputmode="tel" autocomplete="tel"></div>
<div style="grid-column:1/-1"><label for="shopAddr" data-i18n="shopAddr">Address</label><input id="shopAddr" autocomplete="street-address"></div>
<div><label for="gstin" data-i18n="gstin">GSTIN (optional)</label><input id="gstin" maxlength="15" style="text-transform:uppercase"></div>
<div><label for="dl" data-i18n="dl">Drug licence no. (optional)</label><input id="dl"></div>
<div><label for="logoIn" data-i18n="logo">Logo (optional)</label><input id="logoIn" type="file" accept="image/*"></div>
<div style="display:flex;align-items:flex-end"><button type="button" id="logoRm" class="btn small danger" data-i18n="removeLogo" hidden>Remove logo</button></div>
</div>
</section>

<section class="card" id="billCard" aria-labelledby="hBill">
<h2 id="hBill" data-i18n="billDetails">Bill details</h2>
<div class="grid g3">
<div><label for="invNo" data-i18n="invNo">Invoice no.</label><input id="invNo"></div>
<div><label for="date" data-i18n="date">Date</label><input id="date" type="date"></div>
<div><label for="payMode" data-i18n="payMode">Payment</label><select id="payMode"><option value="cash" data-i18n="cash">Cash</option><option value="upi" data-i18n="upi">UPI</option><option value="card" data-i18n="card">Card</option><option value="credit" data-i18n="credit">Credit</option></select></div>
<div><label for="custName" data-i18n="custName">Customer name (optional)</label><input id="custName" autocomplete="off"></div>
<div><label for="custPhone" data-i18n="custPhone">Customer phone (optional)</label><input id="custPhone" inputmode="tel" autocomplete="off"></div>
<div><label for="doctor" data-i18n="doctor">Doctor name (optional)</label><input id="doctor" autocomplete="off"></div>
</div>
<details style="margin-top:10px"><summary style="font-size:.9rem">Invoice numbering / बिल नंबर सेटिंग</summary>
<div class="grid g2" style="padding-bottom:12px"><div><label for="prefix" data-i18n="invPrefix">Invoice prefix</label><input id="prefix"></div><div><label for="nextNo" data-i18n="nextNo">Next number</label><input id="nextNo" type="number" min="1" inputmode="numeric"></div></div>
</details>
</section>

<section class="card" aria-labelledby="hItems">
<h2 id="hItems" data-i18n="items">Medicines</h2>
<div id="items"></div>
<button type="button" id="addItem" class="btn ghost" data-i18n="addItem">+ Add medicine</button>
<div class="grid g2" style="margin-top:14px">
<div>
<label class="check"><input type="checkbox" id="inclusive" checked> <span data-i18n="inclusive">MRP includes GST (normal for medicines)</span></label>
<label class="check" style="margin-top:6px"><input type="checkbox" id="roundoff" checked> <span data-i18n="roundoff">Round off to nearest rupee</span></label>
<div style="margin-top:10px"><label for="notes" data-i18n="notes">Note on bill (optional)</label><input id="notes"></div>
</div>
<div><div class="totals" id="totals" aria-live="polite"></div><div class="words" id="words"></div></div>
</div>
</section>
</form>

{ad('home-middle')}

<section class="card" aria-labelledby="hPrev">
<h2 id="hPrev" data-i18n="preview">Bill preview</h2>
<div class="row-actions" style="margin:0 0 10px">
<div class="seg" role="group" aria-label="Bill size"><button type="button" data-layout="a4" aria-pressed="true" data-i18n="a4">A4</button><button type="button" data-layout="thermal" aria-pressed="false" data-i18n="thermal">80mm receipt</button></div>
<button type="button" id="btnPdf2" class="btn" data-i18n="pdf">Download PDF</button>
<button type="button" id="btnPrint" class="btn ghost" data-i18n="print">Print</button>
<button type="button" id="btnShare" class="btn ghost" data-i18n="share">WhatsApp text</button>
</div>
<div class="preview-box" id="previewBox"><div class="preview-scale" id="previewScale"><div id="invoice" class="invoice"></div></div></div>
</section>

<section class="card" aria-labelledby="hRecent">
<h2 id="hRecent" data-i18n="recent">Recent bills</h2>
<ul class="recent" id="recent"></ul>
</section>

<span id="h2pSrc" data-src="vendor/html2pdf.bundle.min.js" hidden></span>

<article class="content">
<h2>How to make a medical store bill online (3 steps)</h2>
<ol>
<li><b>Fill your shop details once</b> — store name, address, phone, and optionally GSTIN, drug licence number and logo. They are remembered on this device.</li>
<li><b>Add medicines</b> — name, batch number, expiry (MM/YY), quantity, MRP, discount % and GST %. Totals, CGST/SGST, round-off and amount in words update instantly. An expired batch is flagged in red.</li>
<li><b>Download PDF or Print</b> — pick A4 for a full invoice or 80&nbsp;mm for a thermal receipt. The bill is saved in “Recent bills” and the invoice number moves to the next one.</li>
</ol>
<h2 lang="hi">मेडिकल स्टोर का बिल ऑनलाइन कैसे बनाएँ</h2>
<ol lang="hi">
<li><b>दुकान की जानकारी एक बार भरें</b> — नाम, पता, फ़ोन, और चाहें तो GSTIN, ड्रग लाइसेंस नंबर और लोगो। ये इसी फ़ोन में याद रहते हैं।</li>
<li><b>दवाइयाँ जोड़ें</b> — नाम, बैच, एक्सपायरी (MM/YY), मात्रा, MRP, छूट % और GST %। कुल राशि, CGST/SGST, राउंड ऑफ और राशि शब्दों में अपने-आप बनती है। एक्सपायर्ड बैच लाल रंग में दिखता है।</li>
<li><b>PDF डाउनलोड या प्रिंट करें</b> — पूरे बिल के लिए A4 या थर्मल रसीद के लिए 80mm चुनें। बिल “हाल के बिल” में सेव हो जाता है।</li>
</ol>
<h2>What is on the bill</h2>
<p>Shop name and address, GSTIN and drug licence number (if given), invoice number and date, customer and doctor name (optional), each medicine with batch, expiry, quantity, MRP, discount, GST rate and amount, a GST summary per slab with CGST and SGST, round-off, total payable and the amount in words in the Indian system (lakh, crore). With a GSTIN the heading is “Tax Invoice”; without it, “Cash Memo / Bill”.</p>
{ad('home-content', True)}
<h2>Frequently asked questions</h2>
{faq_html(HOME_FAQ)}
<p class="note">GST rates change from time to time. Source for the September 2025 change: <a href="{GST_SRC}" rel="noopener">GST Council 56th meeting press release (PIB)</a>. DawaBill is a billing tool only and does not give medical or tax advice.</p>
<h2>More free tools for chemists</h2>
<ul><li><a href="gst-calculator/">GST calculator for medicines</a> — split any amount into taxable value, CGST and SGST.</li>
<li><a href="medicine-expiry-checker/">Medicine expiry checker &amp; stock expiry list</a> — see what has expired and what expires in 30/90/180 days.</li></ul>
</article>
</div>
<div class="sticky-bar noprint"><div class="wrap"><span class="sum"><span class="lbl"><span data-i18n="payable">Total payable</span>: </span><span id="barSum">₹0.00</span></span>
<button type="button" id="btnSave" class="btn ghost small" data-i18n="save">Save bill</button>
<button type="button" id="btnNew" class="btn ghost small" data-i18n="newBill">New bill</button>
<button type="button" id="btnPdf" class="btn small" data-i18n="pdf">Download PDF</button></div></div>
<style id="pageStyle"></style>
"""
write('', page('', 'Free Medical Bill Generator | Pharmacy GST Invoice Maker (PDF) – DawaBill', HOME_DESC, home_body,
    scripts=['bill.js'], jsonld=[webapp('DawaBill – Free Medical Bill Generator', '', HOME_DESC), faq_ld(HOME_FAQ)]))

# ------------------------------------------------------------------ GST calculator
GST_FAQ = [
 ("How do I find GST from the MRP of a medicine?",
  "MRP includes GST. Divide by (1 + rate/100). For ₹105 at 5%: taxable value = 105 ÷ 1.05 = ₹100, GST = ₹5 (CGST ₹2.50 + SGST ₹2.50).",
  "दवा के MRP से GST कैसे निकालें?", "MRP में GST शामिल है। MRP को (1 + दर/100) से भाग दें। ₹105 पर 5%: कर योग्य राशि = 105 ÷ 1.05 = ₹100, GST = ₹5 (CGST ₹2.50 + SGST ₹2.50)।"),
 ("How do I add GST to a price?",
  "Choose “Excludes GST”. GST = price × rate ÷ 100. For ₹100 at 12%, GST is ₹12 and the total is ₹112.",
  "किसी कीमत में GST कैसे जोड़ें?", "“GST अलग से जोड़ें” चुनें। GST = कीमत × दर ÷ 100। ₹100 पर 12% GST ₹12 और कुल ₹112।"),
 ("Why is GST split into CGST and SGST?",
  "For a sale inside the same state, half the GST goes to the Centre (CGST) and half to the State (SGST). A 5% rate becomes 2.5% + 2.5%. Sales to another state use IGST instead.",
  "GST, CGST और SGST में क्यों बँटता है?", "एक ही राज्य के अंदर बिक्री पर आधा GST केंद्र (CGST) और आधा राज्य (SGST) को जाता है। 5% = 2.5% + 2.5%। दूसरे राज्य में बिक्री पर IGST लगता है।"),
 ("What GST rate applies to medicines now?",
  "After the GST Council's 56th meeting (effective 22 September 2025) most medicines are at 5% and some life-saving drugs at nil. Always confirm the rate for the product's HSN code.",
  "अभी दवाओं पर कितना GST है?", "GST काउंसिल की 56वीं बैठक (22 सितंबर 2025 से) के बाद ज़्यादातर दवाएँ 5% पर और कुछ जीवनरक्षक दवाएँ 0% पर हैं। हर प्रोडक्ट का रेट उसके HSN कोड से ज़रूर जाँचें।"),
]
GST_DESC = "Free GST calculator for medicines: find taxable value, CGST and SGST from MRP (GST inclusive) or add GST to a price. 0%, 5%, 12%, 18% rates. Hindi & English."
gst_body = f"""
<div class="wrap">
<section class="hero"><h1>GST Calculator for Medicines (MRP Inclusive &amp; Exclusive)</h1>
<p>Enter an amount, pick the GST rate and see the taxable value, CGST, SGST and total instantly. Built for chemists and pharmacy students. दवाओं के लिए GST कैलकुलेटर।</p></section>
{ad('gst-top')}
<section class="card" aria-labelledby="hG"><h2 id="hG" data-i18n="gstCalc">GST calculator</h2>
<div class="grid g3">
<div><label for="gAmt" data-i18n="amountLbl">Amount (₹)</label><input id="gAmt" type="number" inputmode="decimal" min="0" step="any"></div>
<div><label for="gRate" data-i18n="rateLbl">GST rate</label><select id="gRate"><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option></select></div>
<div><span class="muted" style="display:block;font-size:.82rem;font-weight:600;margin-bottom:3px" data-i18n="modeLbl">Amount type</span><div class="seg" role="group"><button type="button" data-mode="incl" aria-pressed="true" data-i18n="incl">Includes GST (MRP)</button><button type="button" data-mode="excl" aria-pressed="false" data-i18n="excl">Excludes GST</button></div></div>
</div>
<div class="result" id="gOut" style="margin-top:14px" aria-live="polite"></div>
<p class="words" id="gWords"></p>
<h3 style="font-size:1rem;margin:14px 0 6px" data-i18n="allRates">Same amount at every rate</h3>
<div class="tbl-wrap"><table class="simple" id="gTable"></table></div>
</section>
{ad('gst-middle')}
<article class="content">
<h2>GST formulas used</h2>
<p><b>GST inclusive (MRP):</b> taxable value = amount × 100 ÷ (100 + rate); GST = amount − taxable value.<br><b>GST exclusive:</b> GST = amount × rate ÷ 100; total = amount + GST.<br>CGST = SGST = GST ÷ 2. Amounts are rounded to paise.</p>
<h2 lang="hi">GST का फ़ॉर्मूला</h2>
<p lang="hi"><b>GST सहित (MRP):</b> कर योग्य राशि = राशि × 100 ÷ (100 + दर)। <b>GST के बिना:</b> GST = राशि × दर ÷ 100। CGST = SGST = GST ÷ 2।</p>
<h2>FAQ</h2>
{faq_html(GST_FAQ)}
<p class="note">Source for the September 2025 rate change: <a href="{GST_SRC}" rel="noopener">GST Council 56th meeting press release (PIB)</a>. This calculator is a tool, not tax advice.</p>
<p>Need a full bill? Use the <a href="../">free medical bill generator</a>.</p>
</article>
</div>"""
write('gst-calculator/', page('gst-calculator/', 'GST Calculator for Medicines – MRP to CGST/SGST (Free) | DawaBill', GST_DESC, gst_body,
    scripts=['gst.js'], jsonld=[webapp('GST Calculator for Medicines', 'gst-calculator/', GST_DESC), faq_ld(GST_FAQ)]))

# ------------------------------------------------------------------ Expiry checker
EXP_FAQ = [
 ("What does EXP 08/26 on a medicine strip mean?",
  "It shows the expiry month and year: August 2026. Shops commonly treat stock as valid until the last day of that month, and that is how this tool counts the days. Always follow the label and your pharmacist's guidance.",
  "दवा के पत्ते पर EXP 08/26 का क्या मतलब है?", "यह एक्सपायरी का महीना और साल है: अगस्त 2026। दुकानों में आम तौर पर उस महीने के आख़िरी दिन तक मान्य माना जाता है, और यह टूल इसी तरह दिन गिनता है। हमेशा लेबल और फार्मासिस्ट की सलाह मानें।"),
 ("Why keep a stock expiry list?",
  "So expired batches are removed from the shelf and near-expiry stock can be returned to the distributor or sold first (FEFO – first expiry, first out) in time.",
  "स्टॉक एक्सपायरी लिस्ट क्यों रखें?", "ताकि एक्सपायर्ड बैच शेल्फ़ से हटें और जल्दी एक्सपायर होने वाला माल समय पर डिस्ट्रीब्यूटर को लौटाया या पहले बेचा जा सके (FEFO)।"),
 ("Is my stock list uploaded anywhere?",
  "No. The list is stored only in your browser on this device. Use “Download CSV” to keep a copy or open it in Excel.",
  "क्या मेरी स्टॉक लिस्ट कहीं अपलोड होती है?", "नहीं। लिस्ट सिर्फ इसी डिवाइस के ब्राउज़र में रहती है। कॉपी रखने के लिए “CSV डाउनलोड” करें, Excel में खुल जाती है।"),
]
EXP_DESC = "Free medicine expiry date checker and stock expiry list for chemists: enter MM/YY to see days left, track expired and near-expiry batches (30/90/180 days), export CSV."
exp_body = f"""
<div class="wrap">
<section class="hero"><h1>Medicine Expiry Date Checker &amp; Stock Expiry List</h1>
<p>Type the expiry printed on the strip (MM/YY) to see how many days are left, or build a stock list that sorts batches by expiry and flags what has expired or expires within 30, 90 or 180 days. दवा एक्सपायरी चेकर।</p></section>
{ad('expiry-top')}
<section class="card noprint" aria-labelledby="hQ"><h2 id="hQ" data-i18n="quick">Quick check</h2>
<div class="grid g2"><div><label for="qExp" data-i18n="expInput">Expiry on strip (MM/YY)</label><input id="qExp" inputmode="numeric" placeholder="MM/YY" maxlength="7"></div>
<div style="display:flex;align-items:flex-end;min-height:44px" id="qOut" aria-live="polite"></div></div>
</section>
<section class="card" aria-labelledby="hS"><h2 id="hS" data-i18n="expTitle">Medicine expiry list</h2>
<form id="stockForm" class="grid g4 noprint" autocomplete="off">
<div><label for="sName" data-i18n="name">Medicine</label><input id="sName"></div>
<div><label for="sBatch" data-i18n="batch">Batch no.</label><input id="sBatch"></div>
<div><label for="sExp" data-i18n="expiry">Expiry (MM/YY)</label><input id="sExp" inputmode="numeric" placeholder="MM/YY" maxlength="7"></div>
<div><label for="sQty" data-i18n="qty">Qty</label><input id="sQty" inputmode="numeric"></div>
<div style="grid-column:1/-1"><button type="button" id="addStock" class="btn" data-i18n="addStock">+ Add to list</button></div>
</form>
<div class="stats" id="stats" style="margin:14px 0"></div>
<div class="seg noprint" role="group" aria-label="Filter" style="flex-wrap:wrap;margin-bottom:8px"><button type="button" data-f="all" aria-pressed="true" data-i18n="all">All</button><button type="button" data-f="expired" aria-pressed="false" data-i18n="st_expired">Expired</button><button type="button" data-f="d30" aria-pressed="false" data-i18n="st_d30">≤ 30 days</button><button type="button" data-f="d90" aria-pressed="false" data-i18n="st_d90">≤ 90 days</button></div>
<div class="tbl-wrap"><table class="simple"><thead><tr><th data-i18n="name">Medicine</th><th data-i18n="exp">Exp</th><th class="r" data-i18n="qty">Qty</th><th data-i18n="status">Status</th><th><span class="skip">Remove</span></th></tr></thead><tbody id="stockBody"></tbody></table></div>
<div class="row-actions noprint"><button type="button" id="btnCsv" class="btn ghost small" data-i18n="exportCsv">Download CSV</button><button type="button" id="btnPrintList" class="btn ghost small" data-i18n="printList">Print list</button><button type="button" id="btnClear" class="btn small danger" data-i18n="clearAll">Clear list</button></div>
</section>
{ad('expiry-middle')}
<article class="content noprint">
<h2>How to use the expiry checker</h2>
<ol><li>Enter the expiry from the strip or box as MM/YY (for example 03/27).</li><li>Add each batch with its quantity to build your list.</li><li>Check the red (expired) and orange (≤ 30 days) rows first, then download CSV or print the list for returns.</li></ol>
<h2 lang="hi">एक्सपायरी चेकर कैसे इस्तेमाल करें</h2>
<ol lang="hi"><li>पत्ते या डिब्बे पर लिखी एक्सपायरी MM/YY में डालें (जैसे 03/27)।</li><li>हर बैच को मात्रा के साथ लिस्ट में जोड़ें।</li><li>पहले लाल (एक्सपायर्ड) और नारंगी (≤ 30 दिन) लाइनें देखें, फिर रिटर्न के लिए CSV या प्रिंट लें।</li></ol>
<h2>FAQ</h2>
{faq_html(EXP_FAQ)}
<p class="note">This is a stock-management tool. It does not tell you whether a medicine is safe to take — never use expired medicine; ask a pharmacist or doctor.</p>
<p>Making a bill? Try the <a href="../">free medical bill generator</a> — it also warns when an expired batch is added.</p>
</article>
</div>"""
write('medicine-expiry-checker/', page('medicine-expiry-checker/', 'Medicine Expiry Date Checker & Stock Expiry List (Free) | DawaBill', EXP_DESC, exp_body,
    scripts=['expiry.js'], jsonld=[webapp('Medicine Expiry Checker', 'medicine-expiry-checker/', EXP_DESC), faq_ld(EXP_FAQ)]))

# ------------------------------------------------------------------ static pages
CONTACT_URL = 'https://github.com/wildsouleast/dawabill/issues/new'
def simple(path, title, desc, h1, html):
    write(path, page(path, title + ' | DawaBill', desc, f'<div class="wrap page content"><h1>{h1}</h1>{html}</div>'))

simple('about/', 'About', 'About DawaBill: free, browser-based billing tools for Indian medical stores and pharmacies.', 'About DawaBill', f"""
<p>DawaBill is a set of free online tools for Indian medical stores, chemists and pharmacy students. It was started by a B.Pharm student who saw small pharmacies writing bills by hand or paying for heavy software just to print a simple GST bill.</p>
<h2>What you can do here</h2>
<ul><li><a href="../">Medical bill / pharmacy GST invoice generator</a> — batch, expiry, MRP, discount, CGST/SGST, round-off, amount in words, PDF and 80&nbsp;mm print.</li>
<li><a href="../gst-calculator/">GST calculator for medicines</a>.</li><li><a href="../medicine-expiry-checker/">Medicine expiry checker and stock expiry list</a>.</li></ul>
<h2>How it works</h2>
<p>Everything runs inside your web browser. Shop details, bills and stock lists are saved on your own device and are never sent to us. There is no account and nothing to install.</p>
<h2>Free, supported by ads</h2>
<p>The tools are free. To keep them free, the site may show advertisements. Ads never appear on the printed bill or PDF.</p>
<h2>Not medical advice</h2>
<p>DawaBill is a billing and stock-keeping tool. It does not recommend medicines, doses or treatment. Please consult a doctor or pharmacist for health questions.</p>
<p>Questions or ideas? See the <a href="../contact/">contact page</a>.</p>""")

simple('contact/', 'Contact', 'Contact DawaBill with questions, bug reports or feature ideas.', 'Contact us', f"""
<p>We would love to hear from you — a bug, a feature your medical store needs, or a question about the tools.</p>
<p><a class="btn" href="{CONTACT_URL}" rel="noopener">Send a message (opens a public form)</a></p>
<p class="note">Messages sent through the form above are public, so please do not include phone numbers, patient names or other private details.</p>
<p>हिंदी में भी लिख सकते हैं। कोई गड़बड़ी या नया फ़ीचर चाहिए तो ज़रूर बताएँ।</p>""")

simple('privacy-policy/', 'Privacy Policy', 'DawaBill privacy policy: your bills stay in your browser; how cookies and advertising work on this site.', 'Privacy Policy', f"""
<p><i>Last updated: {TODAY}</i></p>
<h2>Your bills stay on your device</h2>
<p>Shop details, invoices, customer names, stock lists and settings you enter in DawaBill are stored only in your browser's local storage on your device. They are not sent to or stored on our servers. Clearing your browser data deletes them. You are responsible for any customer information you choose to enter.</p>
<h2>Information collected automatically</h2>
<p>Like most websites, our hosting provider may keep standard server logs (such as IP address, browser type, pages visited and time) for security and to keep the site running. We may use privacy-friendly analytics to count visits.</p>
<h2>Cookies and advertising</h2>
<p>This site may show ads served by Google and its partners. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet.</p>
<p>You may opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" rel="noopener">Google Ads Settings</a>, or opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info/choices/" rel="noopener">www.aboutads.info</a>. Learn more about <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">how Google uses information from sites that use its services</a>.</p>
<h2>Children</h2>
<p>DawaBill is a business tool and is not directed at children under 13.</p>
<h2>Changes</h2>
<p>We may update this policy. The date above shows the latest version.</p>
<h2>Contact</h2>
<p>Questions about privacy: see our <a href="../contact/">contact page</a>.</p>""")

simple('terms/', 'Terms of Use', 'Terms of use for DawaBill free medical bill generator and tools.', 'Terms of Use', f"""
<p><i>Last updated: {TODAY}</i></p>
<p>By using DawaBill you agree to these terms.</p>
<h2>Use of the tools</h2>
<p>DawaBill provides free tools to create bills, calculate GST and track expiry dates. You are responsible for the accuracy of the information you enter, for the GST rates and HSN codes you choose, and for meeting the legal and tax requirements that apply to your business. Please check important bills and tax filings with a qualified accountant.</p>
<h2>No medical or tax advice</h2>
<p>Nothing on this site is medical, legal or tax advice. The expiry checker is a stock tool and does not say whether a medicine is safe to use.</p>
<h2>No warranty</h2>
<p>The tools are provided “as is”, without warranty of any kind. We are not liable for any loss arising from use of the site, including calculation errors or loss of data stored in your browser. Keep copies of bills you need.</p>
<h2>Acceptable use</h2>
<p>Do not use the site to create false or fraudulent bills or for any unlawful purpose.</p>
<h2>Changes</h2>
<p>We may change these terms or the tools at any time.</p>
<p>Contact: <a href="../contact/">contact page</a>.</p>""")

write('404.html', page('404.html', 'Page not found | DawaBill', 'Page not found.', '<div class="wrap page"><h1>Page not found</h1><p><a href="/dawabill/">Go to the free medical bill generator</a></p></div>').replace('href="styles.css"', 'href="/dawabill/styles.css"').replace('src="', 'src="/dawabill/').replace('href="favicon.svg"','href="/dawabill/favicon.svg"').replace('href="gst-calculator/"','href="/dawabill/gst-calculator/"').replace('href="medicine-expiry-checker/"','href="/dawabill/medicine-expiry-checker/"').replace('href="about/"','href="/dawabill/about/"').replace('href="contact/"','href="/dawabill/contact/"').replace('href="privacy-policy/"','href="/dawabill/privacy-policy/"').replace('href="terms/"','href="/dawabill/terms/"'))

# sitemap + robots
urls = ['', 'gst-calculator/', 'medicine-expiry-checker/', 'about/', 'contact/', 'privacy-policy/', 'terms/']
pri = {'': '1.0', 'gst-calculator/': '0.8', 'medicine-expiry-checker/': '0.8'}
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    f'  <url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod><priority>{pri.get(u, "0.3")}</priority></url>\n' for u in urls) + '</urlset>\n'
open(os.path.join(SITE, 'sitemap.xml'), 'w').write(sm)
open(os.path.join(SITE, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {BASE}sitemap.xml\n')
open(os.path.join(SITE, 'favicon.svg'), 'w').write(LOGO.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg"'))
print('built', BASE)
