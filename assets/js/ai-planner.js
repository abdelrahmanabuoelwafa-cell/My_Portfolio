/* ============================================================
   AI Business Planner — High-Converting Client Roadmap & Cost Estimator
   - Dual Engine: Cloudflare Worker + Direct Gemini API
   - Real-time Synchronized Currency Switcher (USD, EGP, SAR, AED)
   - 3 Selectable Fair Budget Tiers (Starter, Standard, Pro)
   - Strict LTR Price Range Formatting (Dash always centered, no duplicate symbols)
   - Dynamic 3-Milestone Payment Terms synced with Currency & Tier
   - Interactive Deliverables & Investment Breakdown Table
   - One-Click AI Consultant Explainer & Pricing Justifier
   - Pure UTF-8 Bilingual Support (Arabic & English)
   ============================================================ */
(function () {
  'use strict';

  var AI_ENDPOINT = (window.PORTFOLIO_AI_ENDPOINT || '').replace(/\/+$/, '');
  if (!AI_ENDPOINT) AI_ENDPOINT = 'https://abdelrahman-portfolio-gemini.abdelrahman-dev1.workers.dev';
  var GEMINI_MODEL = window.PORTFOLIO_GEMINI_MODEL || 'gemini-3.5-flash-lite';

  var CONTACT = window.PORTFOLIO_CONTACT || {
    whatsappNumber: '201123031944',
    phoneDisplay: '+20 112 303 1944',
    email: 'abdulrahman.abuoshaifa@gmail.com'
  };

  // Currency Conversion Rates (Base: USD)
  var CURRENCY_RATES = {
    USD: { symbol: '$',   rate: 1.0,  code: 'USD', name: 'USD ($)', symPos: 'suffix' },
    EGP: { symbol: 'ج.م', rate: (typeof window !== 'undefined' && window.PRICING && window.PRICING.fxRateEgp) || 48.0, code: 'EGP', name: 'EGP (ج.م)', symPos: 'suffix' },
    SAR: { symbol: 'ر.س', rate: 3.75, code: 'SAR', name: 'SAR (ر.س)', symPos: 'suffix' },
    AED: { symbol: 'د.إ', rate: 3.67, code: 'AED', name: 'AED (د.إ)', symPos: 'suffix' }
  };

  // Base tier ranges in USD (Fair, realistic pricing)
  var TIER_BASE_USD = (function() {
    if (typeof window !== 'undefined' && window.PRICING && Array.isArray(window.PRICING.tiers)) {
      var map = {};
      window.PRICING.tiers.forEach(function(t) {
        map[t.id] = { min: t.price[0], max: t.price[1] };
      });
      return {
        starter:  map.starter  || { min: 60,  max: 120 },
        standard: map.standard || { min: 180, max: 400 },
        pro:      map.pro      || { min: 550, max: 1200 }
      };
    }
    return {
      starter:  { min: 60,  max: 120 },
      standard: { min: 180, max: 400 },
      pro:      { min: 550, max: 1200 }
    };
  })();

  var selectedBudgetTier = { id: 'standard', name: 'STANDARD', priceText: '' };
  var currentSelectedCurrency = 'USD';
  var lastGeneratedPlan = '';

  // DOM Elements (Supports both planner.html and index.html IDs)
  var form        = document.getElementById('planner-form');
  var ideaEl      = document.getElementById('pf-idea') || document.getElementById('planner-idea');
  var audEl       = document.getElementById('pf-audience') || document.getElementById('planner-audience');
  var platGroup   = document.getElementById('pf-platform') || document.getElementById('planner-platform');
  var featEl      = document.getElementById('pf-features') || document.getElementById('planner-features');
  var currEl      = document.getElementById('pf-currency') || document.getElementById('planner-currency') || document.getElementById('planner-budget');
  var deadlineEl  = document.getElementById('pf-deadline') || document.getElementById('planner-deadline');
  var btn         = document.getElementById('planner-submit-btn') || document.getElementById('planner-btn');
  var errEl       = document.getElementById('planner-error');
  var loadEl      = document.getElementById('planner-results-loading') || document.getElementById('planner-loading');
  var bodyEl      = document.getElementById('planner-results-body') || document.getElementById('planner-body');
  var modeEl      = document.getElementById('planner-mode');
  var currencyChips = document.querySelectorAll('.pf-curr-chip, #planner-currency-chips .pf-chip, [data-curr]');

  if (!form || !btn) return;

  function lang() {
    return (document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  // Bilingual strings
  var STR = {
    en: {
      btnDefault: 'Generate AI Blueprint & Fair Cost Quote',
      btnGenerating: 'AI Architect is Analyzing & Calculating...',
      errIdea: 'Please describe your project idea first.',
      errGeneric: 'Something went wrong while generating the plan. Please try again.',
      approveBtn: 'Approve Plan & Message on WhatsApp',
      explainBtn: 'Explain Plan & Justify Price (AI Consultant)',
      regenBtn: 'Modify Brief / Regenerate',
      copyBtn: 'Copy Entire Plan',
      copiedBtn: 'Plan Copied!',
      namePh: 'Your Name (Optional)',
      contactPh: 'WhatsApp or Email for follow-up',
      askPh: 'Ask anything about architecture, pricing justification, or delivery...',
      sendQuestion: 'Ask AI Consultant',
      asking: 'AI Consultant is thinking...',
      successMsg: 'Roadmap approved! Opening WhatsApp to connect directly with Abdelrahman...',
      currSwitcherLabel: 'Switch Pricing Currency:',
      tierSelectHint: 'Click on a package below to select it for your quote & WhatsApp agreement',
      tierSelected: 'Selected Package',
      quickPrompt1: 'Why is this price fair and high ROI?',
      quickPrompt2: 'Explain the weekly delivery flow & guarantees',
      quickPrompt3: 'What makes Standard tier the recommended choice?',
      consultantTitle: 'AI Senior Software Consultant — Plan Explanation & Pricing Justification',
      milestoneTitle: 'Transparent Milestone Payment Terms (Zero Risk)',
      phase1Name: 'Phase 1: Kickoff & Prototype (30%)',
      phase1Desc: 'Upon interactive Figma prototype delivery & client approval.',
      phase2Name: 'Phase 2: Mid-Sprint Test Build (40%)',
      phase2Desc: 'Upon functional v0.5 staging build delivered directly on your device.',
      phase3Name: 'Phase 3: Launch & Handover (30%)',
      phase3Desc: 'Upon final store submission, full source code repository, and 30-day warranty.',
      tableTitle: 'Detailed Scope of Work & Investment Breakdown',
      thPhase: 'Phase / Deliverable',
      thScope: 'Precise Scope of Work',
      thTimeline: 'Timeline / Hours',
      thInvestment: 'Investment Cost',
      tbP1Title: 'Phase 1: UX/UI Blueprint & Clickable Prototype',
      tbP1Scope: 'Interactive Figma design, user flow mapping, responsive layout system',
      tbP1Time: 'Week 1 (~15 hrs)',
      tbP2Title: 'Phase 2: Core Flutter MVP Development',
      tbP2Scope: 'Production client app, state architecture (Riverpod), local storage, Auth & screens',
      tbP2Time: 'Week 2-3 (~25 hrs)',
      tbP3Title: 'Phase 3: APIs, Store Deployment & QA',
      tbP3Scope: 'Backend integration, end-to-end testing, Apple App Store & Google Play release',
      tbP3Time: 'Week 4 (~15 hrs)',
      tbTotalTitle: 'Total Turnkey Delivery & Source Code Ownership',
      tbTotalTime: 'Turnkey in 4 Weeks (Full 30-Day Guarantee)'
    },
    ar: {
      btnDefault: 'توليد الخطة الذكية وتسعير المشروع العادل',
      btnGenerating: 'جاري دراسة المشروع وحساب التكلفة بالذكاء الاصطناعي...',
      errIdea: 'يرجى كتابة فكرة التطبيق أولاً للبدء.',
      errGeneric: 'حدث خطأ غير متوقع أثناء توليد الخطة. حاول مرة أخرى.',
      approveBtn: 'وافقت على الخطة — ابدأ على واتساب',
      explainBtn: 'اشرح لي الخطة وأقنعني بالقيمة والسعر (مستشار AI)',
      regenBtn: 'تعديل الفكرة / إعادة التوليد',
      copyBtn: 'نسخ الخطة بالكامل',
      copiedBtn: 'تم نسخ الخطة بنجاح!',
      namePh: 'اسمك الكريم (اختياري)',
      contactPh: 'رقم واتساب أو إيميلك للمتابعة',
      askPh: 'اسأل عن المعمارية البرمجية، تبرير السعر، أو مراحل التسليم...',
      sendQuestion: 'اسأل المستشار التقني',
      asking: 'المستشار الذكي يفكر ويحلل...',
      successMsg: 'تمت الموافقة! جاري فتح واتساب للتواصل المباشر مع م/ عبدالرحمن...',
      currSwitcherLabel: 'تبديل عملة التسعير:',
      tierSelectHint: 'انقر على أي باقة لاختيارها واعتمادها في تفاصيل الاتفاق وعرض السعر',
      tierSelected: 'الباقة المختارة',
      quickPrompt1: 'لماذا هذا السعر عادل ومربح لي كاستثمار؟',
      quickPrompt2: 'كيف تضمن جودة الكود وسرعة الإطلاق؟',
      quickPrompt3: 'ما الفرق بين الباقة القياسية والباقات الأخرى؟',
      consultantTitle: 'المستشار التقني الأول — شرح الخطة وإقناعك بالقيمة والتسعير',
      milestoneTitle: 'نظام الدفعات المرحلية المحمية (Zero Risk — صفر مخاطرة)',
      phase1Name: 'الدفعة 1: إطلاق المشروع والبروتوتايب (30%)',
      phase1Desc: 'بعد تسليم وتجربة بروتوتايب فيجما تفاعلي كامل وموافقتك عليه.',
      phase2Name: 'الدفعة 2: النسخة التجريبية الأولى (40%)',
      phase2Desc: 'بعد استلام نسخة v0.5 تعمل فعلياً على هاتفك وتجربة الوظائف الأساسية.',
      phase3Name: 'الدفعة 3: النشر والاستلام النهائي (30%)',
      phase3Desc: 'بعد رفع التطبيق لمتجري Apple & Google، تسليم السورس كود، وبدء ضمان الـ 30 يوماً.',
      tableTitle: 'جدول تفاصيل نطاق العمل والاستثمار المالي التقديري',
      thPhase: 'المرحلة / المخرج التقني',
      thScope: 'نطاق التنفيذ الفعلي والدقيق',
      thTimeline: 'الجدول الزمني التقديري',
      thInvestment: 'الاستثمار التقديري',
      tbP1Title: 'المرحلة 1: هندسة الـ UX/UI وبروتوتايب فيجما',
      tbP1Scope: 'تصميم واجهات احترافية تفاعلية Figma، مواءمة تدفق المستخدم، وتأسيس الهوية',
      tbP1Time: 'الأسبوع 1 (~15 ساعة)',
      tbP2Title: 'المرحلة 2: تطوير التطبيق الأساسي (Flutter MVP)',
      tbP2Scope: 'برمجة الواجهات بمعمارية نظيفة، إدارة الحالة (Riverpod)، التخزين الآمن والـ Auth',
      tbP2Time: 'الأسبوع 2-3 (~25 ساعة)',
      tbP3Title: 'المرحلة 3: ربط السيرفر ونشر المتجرين والضمان',
      tbP3Scope: 'تكامل الـ APIs وقواعد البيانات، اختبارات شاملة، نشر Google Play وApp Store، وضمان 30 يوماً',
      tbP3Time: 'الأسبوع 4 (~15 ساعة)',
      tbTotalTitle: 'إجمالي الاستثمار والتسليم المفتاحي الشامل',
      tbTotalTime: 'تسليم متكامل خلال 4 أسابيع (ضمان وجودة كود 100%)'
    }
  };

  function t(k) {
    var l = lang();
    return (STR[l] && STR[l][k]) || STR.en[k] || '';
  }

  function setBusy(busy) {
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
    var span = btn.querySelector('.btn-text') || btn.querySelector('span');
    if (span) span.textContent = busy ? t('btnGenerating') : t('btnDefault');
  }

  function showError(msg) {
    if (!errEl) return;
    if (!msg) {
      errEl.hidden = true;
      errEl.textContent = '';
      return;
    }
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  function showState(state) {
    showError('');
    if (loadEl) loadEl.hidden = (state !== 'loading');
    if (bodyEl) bodyEl.hidden = (state !== 'body');
  }

  function platforms() {
    if (!platGroup) return 'Mobile app (iOS & Android via Flutter)';
    var sel = platGroup.querySelector('.on') || platGroup.querySelector('[aria-pressed="true"]');
    return sel ? sel.getAttribute('data-v') : 'Mobile app (iOS & Android via Flutter)';
  }

  // Platform chips click interaction
  if (platGroup) {
    var platChips = platGroup.querySelectorAll('.pf-chip, .pf-plat-btn');
    platChips.forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        e.preventDefault();
        platChips.forEach(function (c) {
          c.classList.remove('on');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('on');
        chip.setAttribute('aria-pressed', 'true');
      });
    });
  }

  // Format currency ranges with strict LTR isolation so '-' is ALWAYS in the center
  function formatPriceRangeHtml(minUsd, maxUsd, currency) {
    var cur = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
    var sMin = Math.round(minUsd * cur.rate).toLocaleString();
    var sMax = Math.round(maxUsd * cur.rate).toLocaleString();
    var sym = cur.symbol;

    // Strict LTR span prevents Bidi scrambling of the dash
    return '<span class="price-range" dir="ltr">' + sMin + ' &ndash; ' + sMax + '</span> <span class="price-curr" dir="ltr">' + sym + '</span>';
  }

  function formatPriceRangeText(minUsd, maxUsd, currency) {
    var cur = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
    var sMin = Math.round(minUsd * cur.rate).toLocaleString();
    var sMax = Math.round(maxUsd * cur.rate).toLocaleString();
    return sMin + ' – ' + sMax + ' ' + cur.symbol;
  }

  function getEstimatedAmounts(currency) {
    return {
      cur: currency,
      starterHtml:  formatPriceRangeHtml(TIER_BASE_USD.starter.min, TIER_BASE_USD.starter.max, currency),
      standardHtml: formatPriceRangeHtml(TIER_BASE_USD.standard.min, TIER_BASE_USD.standard.max, currency),
      proHtml:      formatPriceRangeHtml(TIER_BASE_USD.pro.min, TIER_BASE_USD.pro.max, currency),
      starterText:  formatPriceRangeText(TIER_BASE_USD.starter.min, TIER_BASE_USD.starter.max, currency),
      standardText: formatPriceRangeText(TIER_BASE_USD.standard.min, TIER_BASE_USD.standard.max, currency),
      proText:      formatPriceRangeText(TIER_BASE_USD.pro.min, TIER_BASE_USD.pro.max, currency)
    };
  }

  // Update milestone payment box to match selected tier & currency
  function updateMilestonesBox(activeCurr, tierId) {
    var cur = CURRENCY_RATES[activeCurr] || CURRENCY_RATES.USD;
    var sym = cur.symbol;
    var base = TIER_BASE_USD[tierId] || TIER_BASE_USD.standard;
    function fmt(n) { return Math.round(n * cur.rate).toLocaleString(); }

    var p1Min = fmt(base.min * 0.30);
    var p1Max = fmt(base.max * 0.30);
    var p2Min = fmt(base.min * 0.40);
    var p2Max = fmt(base.max * 0.40);
    var p3Min = fmt(base.min * 0.30);
    var p3Max = fmt(base.max * 0.30);

    var p1El = document.getElementById('mpb-phase1-amount');
    var p2El = document.getElementById('mpb-phase2-amount');
    var p3El = document.getElementById('mpb-phase3-amount');

    if (p1El) p1El.innerHTML = '<span class="price-range" dir="ltr">' + p1Min + ' &ndash; ' + p1Max + '</span> <span class="price-curr" dir="ltr">' + sym + '</span>';
    if (p2El) p2El.innerHTML = '<span class="price-range" dir="ltr">' + p2Min + ' &ndash; ' + p2Max + '</span> <span class="price-curr" dir="ltr">' + sym + '</span>';
    if (p3El) p3El.innerHTML = '<span class="price-range" dir="ltr">' + p3Min + ' &ndash; ' + p3Max + '</span> <span class="price-curr" dir="ltr">' + sym + '</span>';
  }

  // Update Deliverables Breakdown Table amounts dynamically
  function updateDeliverablesTable(activeCurr, tierId) {
    var cur = CURRENCY_RATES[activeCurr] || CURRENCY_RATES.USD;
    var sym = cur.symbol;
    var base = TIER_BASE_USD[tierId] || TIER_BASE_USD.standard;
    function fmt(n) { return Math.round(n * cur.rate).toLocaleString(); }

    var p1Min = fmt(base.min * 0.30);
    var p1Max = fmt(base.max * 0.30);
    var p2Min = fmt(base.min * 0.40);
    var p2Max = fmt(base.max * 0.40);
    var p3Min = fmt(base.min * 0.30);
    var p3Max = fmt(base.max * 0.30);
    var tMin  = fmt(base.min);
    var tMax  = fmt(base.max);

    var dt1 = document.getElementById('dt-p1-cost');
    var dt2 = document.getElementById('dt-p2-cost');
    var dt3 = document.getElementById('dt-p3-cost');
    var dtTot = document.getElementById('dt-total-cost');

    if (dt1) dt1.innerHTML = '<span class="price-range" dir="ltr">' + p1Min + ' &ndash; ' + p1Max + '</span> <span class="price-curr" dir="ltr">' + sym + '</span>';
    if (dt2) dt2.innerHTML = '<span class="price-range" dir="ltr">' + p2Min + ' &ndash; ' + p2Max + '</span> <span class="price-curr" dir="ltr">' + sym + '</span>';
    if (dt3) dt3.innerHTML = '<span class="price-range" dir="ltr">' + p3Min + ' &ndash; ' + p3Max + '</span> <span class="price-curr" dir="ltr">' + sym + '</span>';
    if (dtTot) dtTot.innerHTML = '<span class="price-range" dir="ltr" style="font-weight:800;font-size:16px;">' + tMin + ' &ndash; ' + tMax + '</span> <span class="price-curr" dir="ltr" style="color:#38bdf8;font-weight:700;">' + sym + '</span>';
  }

  // Update ALL budget cards & tables live when currency changes
  function updateBudgetCardAmounts(activeCurr) {
    currentSelectedCurrency = activeCurr;
    if (currEl) currEl.value = activeCurr;

    // 1. Sync form chips
    currencyChips.forEach(function (chip) {
      var active = chip.getAttribute('data-curr') === activeCurr;
      chip.classList.toggle('on', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // 2. Sync result pills
    document.querySelectorAll('.curr-pill').forEach(function(pill) {
      pill.classList.toggle('active', pill.getAttribute('data-c') === activeCurr);
    });

    // 3. Update 3 tier card prices
    var est = getEstimatedAmounts(activeCurr);
    var sEl   = document.getElementById('price-tier-starter');
    var stdEl = document.getElementById('price-tier-standard');
    var pEl   = document.getElementById('price-tier-pro');

    if (sEl)   sEl.innerHTML   = est.starterHtml;
    if (stdEl) stdEl.innerHTML = est.standardHtml;
    if (pEl)   pEl.innerHTML   = est.proHtml;

    // 4. Update selected tier priceText
    if (selectedBudgetTier.id === 'starter')  selectedBudgetTier.priceText = est.starterText;
    if (selectedBudgetTier.id === 'standard') selectedBudgetTier.priceText = est.standardText;
    if (selectedBudgetTier.id === 'pro')      selectedBudgetTier.priceText = est.proText;

    // 5. Update Milestone Payment Box
    updateMilestonesBox(activeCurr, selectedBudgetTier.id);

    // 6. Update Deliverables Table
    updateDeliverablesTable(activeCurr, selectedBudgetTier.id);
  }

  // Currency chips — form level
  function getCurrencyChips() {
    return document.querySelectorAll('.pf-curr-chip, #planner-currency-chips .pf-chip, [data-curr]');
  }

  function activateCurrencyChip(code) {
    currentSelectedCurrency = code;
    if (currEl) currEl.value = code;
    getCurrencyChips().forEach(function (chip) {
      var active = chip.getAttribute('data-curr') === code;
      chip.classList.toggle('on', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (bodyEl && !bodyEl.hidden) updateBudgetCardAmounts(code);
  }

  getCurrencyChips().forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      var code = chip.getAttribute('data-curr');
      if (code) activateCurrencyChip(code);
    });
  });
  activateCurrencyChip('USD');

  // Helper escape
  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Clean Markdown & format into elegant HTML
  function formatRichContent(lines, isAr) {
    var html = [];

    lines.forEach(function(line) {
      var trimmed = line.trim();
      if (!trimmed) return;

      // Skip raw table markdown lines (| Phase | ... | or | :--- |)
      if (trimmed.indexOf('|') !== -1 && (trimmed.startsWith('|') || trimmed.indexOf('---') !== -1)) {
        return;
      }

      // Format bold markdown
      var clean = escapeHtml(trimmed)
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#38bdf8;font-weight:700;">$1</strong>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#c084fc;">$1</code>');

      // Detect bullets (* or - or •)
      if (/^[•\-*]\s+/.test(trimmed)) {
        var cleanBullet = clean.replace(/^[•\-*]\s+/, '');
        html.push('<div class="cpc-bullet-item"><i class="fas fa-check-circle cpc-bullet-icon" style="color:#10b981;margin-top:4px;"></i> <span>' + cleanBullet + '</span></div>');
      } else if (/^\d+[\.\)]\s+/.test(trimmed)) {
        var cleanNum = clean.replace(/^\d+[\.\)]\s+/, '');
        html.push('<div class="cpc-bullet-item"><span style="color:#a855f7;font-weight:800;margin-right:6px;">•</span> <span>' + cleanNum + '</span></div>');
      } else {
        html.push('<p style="margin:0 0 10px 0;line-height:1.75;color:var(--text);">' + clean + '</p>');
      }
    });

    return html.join('');
  }

  function buildUserMessage() {
    var isAr = lang() === 'ar';
    var L = [];
    var currency = currentSelectedCurrency || 'USD';
    L.push(isAr ? 'فكرة المشروع:' : 'Project Idea:');
    L.push((ideaEl && ideaEl.value.trim()) || '');
    var aud = audEl && audEl.value.trim();
    if (aud) { L.push(isAr ? 'الجمهور المستهدف:' : 'Target Audience:'); L.push(aud); }
    L.push(isAr ? 'المنصة:' : 'Platform:');
    L.push(platforms());
    var feats = featEl && featEl.value.trim();
    if (feats) { L.push(isAr ? 'المميزات المطلوبة:' : 'Requested Features:'); L.push(feats); }
    L.push(isAr ? 'العملة المختارة للتسعير:' : 'Preferred Currency:');
    L.push(currency + ' (' + (CURRENCY_RATES[currency] ? CURRENCY_RATES[currency].symbol : '$') + ')');
    if (deadlineEl && deadlineEl.value) {
      L.push(isAr ? 'الجدول الزمني المتوقع:' : 'Timeline:');
      L.push(deadlineEl.options[deadlineEl.selectedIndex].text);
    }
    L.push(isAr
      ? 'أخرج الخطة كاملة وفق الأقسام الخمسة المرقمة. في القسم 4 (التكلفة والميزانية)، لا تخرج جداول Markdown بها خطوط أو علامات بايب (|). اكتب شرحاً واضحاً ونقاطاً للمخرجات.'
      : 'Produce the full plan using strictly the 5 numbered sections. In Section 4 (Budget), do NOT output raw markdown pipe tables. Provide clean descriptive points.');
    return L.join('\n');
  }

  // AI Call: Cloudflare Worker with Direct Gemini fallback
  function callAI(promptText, systemPromptText) {
    var isAr = lang() === 'ar';
    var defaultSys = isAr
      ? 'أنت مستشار تقني أول ومهندس برمجيات متخصص في Flutter على موقع المهندس عبدالرحمن أبو الوفا. اكتب بأسلوب مقنع واحترافي بنقاط منظمة مقسماً الخطة بدقة إلى 5 أقسام مرقمة:\n1) ملخص المشروع والرؤية الاستراتيجية\n2) مميزات النسخة الأولى MVP ونطاق التسليم\n3) مراحل التنفيذ الفعلية وجدول التسليم الأسبوعي\n4) التكلفة التقديرية والميزانية الاستثمارية العادلة (اكتب نقاطاً واضحة ولا تخرج جداول بايب |)\n5) تحسينات وتوسعات مستقبلية عالية العائد.'
      : 'You are a Senior Flutter Architect on the portfolio of Abdelrahman Abouelwafa. Provide an executive proposal strictly in 5 numbered sections with clean bullet points. In Section 4, do NOT use pipe tables (|); write clean bullet points.';

    var sys = systemPromptText || defaultSys;

    return new Promise(function(resolve, reject) {
      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, 14000);

      fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: sys + '\n\n' + promptText }]
        }),
        signal: controller.signal
      })
      .then(function(res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('Worker status ' + res.status);
        return res.json();
      })
      .then(function(data) {
        var text = '';
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
          text = data.choices[0].message.content || '';
        } else if (data && data.reply) {
          text = data.reply;
        }
        if (text && text.trim().length > 60) {
          resolve(text.trim());
        } else {
          throw new Error('Worker returned insufficient text');
        }
      })
      .catch(function(err) {
        clearTimeout(timer);
        callGeminiDirect(promptText, sys)
          .then(resolve)
          .catch(function() {
            resolve(generateLocalFallbackPlan(promptText));
          });
      });
    });
  }

  function callGeminiDirect(promptText, systemPromptText) {
    var rawKey = window.PORTFOLIO_GEMINI_KEY || '';
    var apiKey = '';
    try { apiKey = atob(rawKey); } catch (e) { apiKey = rawKey; }
    if (!apiKey) return Promise.reject(new Error('No Gemini API key'));

    var model = GEMINI_MODEL;
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(apiKey);

    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, 16000);

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPromptText }] },
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 3200 }
      }),
      signal: controller.signal
    }).then(function(res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('Gemini API HTTP ' + res.status);
      return res.json();
    }).then(function(data) {
      var cand = data && data.candidates && data.candidates[0];
      if (cand && cand.content && cand.content.parts && cand.content.parts[0]) {
        var reply = cand.content.parts.map(function(p){ return p.text || ''; }).join('\n');
        if (reply.trim()) return reply.trim();
      }
      throw new Error('Empty Gemini response');
    });
  }

  // Local rule-based fallback plan
  function generateLocalFallbackPlan() {
    var isAr = lang() === 'ar';
    var idea = (ideaEl && ideaEl.value.trim()) || (isAr ? 'تطبيق خدمات تجاري' : 'Business on-demand application');
    var plat = platforms();
    var curr = currentSelectedCurrency || 'USD';

    if (isAr) {
      return '1) ملخص المشروع والرؤية الاستراتيجية\n' +
        '• بناء وتطوير تطبيق متكامل لفكرة: ' + idea + '\n' +
        '• تجربة مستخدم عصرية وأداء عالي على ' + plat + ' باستخدام أحدث معمارية Flutter.\n' +
        '• التركيز على سرعة الإطلاق واختبار السوق بأقل تكلفة ممكنة.\n\n' +
        '2) مميزات النسخة الأولى MVP ونطاق التسليم\n' +
        '• واجهات مستخدم مخصصة وجذابة متوافقة مع أندرويد وآيفون.\n' +
        '• تسجيل وحماية الحسابات وإدارة الجلسات.\n' +
        '• تكامل قاعدة البيانات السحابية السريعة والتخزين الآمن.\n' +
        '• إشعارات تفاعلية لرفع معدل نشاط واستخدام التطبيق.\n\n' +
        '3) مراحل التنفيذ الفعلية وجدول التسليم الأسبوعي\n' +
        '• الأسبوع 1: تصميم بروتوتايب Figma تفاعلي كامل ومواءمة تدفق الشاشات.\n' +
        '• الأسبوع 2: بناء معمارية التطبيق والشاشات الرئيسية (تسليم نسخة تجريبية v0.1 على هاتفك).\n' +
        '• الأسبوع 3: ربط واجهات الـ API وقواعد البيانات وتكامل الوظائف (نسخة v0.5).\n' +
        '• الأسبوع 4: الاختبارات النهائية، الرفع للمتاجر، تسليم السورس كود كاملاً والضمان 30 يوماً.\n\n' +
        '4) التكلفة التقديرية والميزانية الاستثمارية العادلة\n' +
        '• الباقة المقترحة: Standard (الإنتاج القياسي) بعملة ' + curr + '.\n' +
        '• مقسمة على 3 دفعات مرحلية لحماية العميل (30% / 40% / 30%).\n' +
        '• تشمل كود أصلي Clean Architecture، سورس كود كامل، وضمان 30 يوماً بعد الإطلاق.\n\n' +
        '5) تحسينات وتوسعات مستقبلية مقترحة\n' +
        '• دمج الذكاء الاصطناعي للمساعدة الذاتية وتحليل البيانات.\n' +
        '• برنامج ولاء ونقاط لزيادة عودة العملاء.\n' +
        '• لوحة تحكم إدارية متطورة مع تحليلات بيانية حية ومؤشرات نمو المبيعات.';
    } else {
      return '1) Executive Blueprint & Core Value Proposition\n' +
        '• High-converting mobile solution for: ' + idea + '\n' +
        '• Production-ready Flutter cross-platform architecture targeting ' + plat + '.\n' +
        '• Optimized for rapid validation, minimal cloud costs, and high client retention.\n\n' +
        '2) Core MVP Scope & High-Value Deliverables\n' +
        '• Seamless, responsive UI screens adhering to platform design guides.\n' +
        '• Secure auth, cloud database sync, and state management.\n' +
        '• Real-time notifications and automated error tracking.\n\n' +
        '3) Real Delivery Flow & Milestones Schedule\n' +
        '• Week 1: Interactive Figma Prototype handoff & client design sign-off.\n' +
        '• Week 2: Flutter client architecture & core screen integration (v0.1 build handoff).\n' +
        '• Week 3: API integration, real-time database, and payments flow (v0.5 test build handoff).\n' +
        '• Week 4: Final QA, store publishing readiness, full source code handover, and post-launch support.\n\n' +
        '4) Investment Estimation & Budget Breakdown\n' +
        '• Recommended Package: Standard Production Scope in ' + curr + '.\n' +
        '• Split over 3 milestone payments: 30% kickoff / 40% mid-sprint / 30% final launch.\n' +
        '• Includes Clean Architecture codebase, source code repository, and 30-day warranty.\n\n' +
        '5) Recommended Future Enhancements & Add-ons\n' +
        '• AI Smart Assistant & personalized user recommendations.\n' +
        '• In-app loyalty rewards program.\n' +
        '• Executive analytics dashboard with conversion tracking.';
    }
  }

  // Parse text into 5 numbered sections
  function parseSections(text) {
    var rawParts = text.split(/(?:^|\n)(?:#+\s*)?([1-5])[\)\.\-:]\s*/);
    var secs = [];
    if (rawParts.length >= 3) {
      for (var i = 1; i < rawParts.length; i += 2) {
        var num = parseInt(rawParts[i], 10);
        var content = (rawParts[i + 1] || '').trim();
        var lines = content.split('\n');
        var title = lines[0].replace(/^#+\s*/, '').trim();
        var body = lines.slice(1);
        secs.push({ num: num, title: title, body: body, full: content });
      }
    }
    return secs;
  }

  
  function parsePlannerInputsForQuote() {
    var idea = (ideaEl && ideaEl.value.trim()) || '';
    var featText = (featEl && featEl.value.trim()) || '';
    var combined = (idea + ' ' + featText).toLowerCase();

    var screens = 0;
    var screenMatch = combined.match(/(\d+)\s*(?:screens?|شاش[ةات]|صفح[ةات]|views?)/i);
    if (screenMatch) {
      screens = parseInt(screenMatch[1], 10);
    }

    var features = [];
    if (/auth|login|sign\s*in|register|حساب|تسجيل/i.test(combined)) features.push('firebaseAuth');
    if (/realtime|firestore|قاعدة|بيانات\s*لحظية|database/i.test(combined)) features.push('firestoreRealtime');
    if (/api|rest|سيرفر/i.test(combined)) features.push('restApi');
    if (/pay|دفع|stripe|سداد|visa|checkout|متجر|store/i.test(combined)) features.push('payments');
    if (/push|notif|إشعار|تنبيه/i.test(combined)) features.push('pushNotifications');
    if (/admin|dashboard|لوحة\s*تحكم|إدارة/i.test(combined)) features.push('adminPanel');
    if (/map|gps|خريطة|خرائط|تتبع|location/i.test(combined)) features.push('mapsGps');
    if (/chat|رسائل|محادثة|شات|messaging/i.test(combined)) features.push('chatMessaging');
    if (/figma|ui|تصميم\s*خاص|ux/i.test(combined)) features.push('figmaCustomUI');
    if (/store|play\s*store|app\s*store|رفع\s*متاجر/i.test(combined)) features.push('storeSubmission');
    if (/ar\b|en\b|عربي|إنجليزي|تعريب|لغتين|localization/i.test(combined)) features.push('localizationArEn');
    if (/offline|بدون\s*نت|أوفلاين/i.test(combined)) features.push('offlineMode');
    if (/chart|analytics|رسم\s*بياني|إحصائيات|تحليلات/i.test(combined)) features.push('chartsAnalytics');
    if (/ads|إعلانات|admob/i.test(combined)) features.push('adsIntegration');

    var complexity = 'simple';
    if (features.indexOf('adminPanel') !== -1 || features.indexOf('payments') !== -1 || features.indexOf('chatMessaging') !== -1 || features.indexOf('mapsGps') !== -1 || screens > 12) {
      complexity = 'complex';
    } else if (features.length >= 2 || screens > 5) {
      complexity = 'medium';
    }

    if (!screens) {
      screens = complexity === 'complex' ? 15 : (complexity === 'medium' ? 8 : 5);
    }

    return { screens: screens, features: features, complexity: complexity };
  }

  function formatFeatureName(key, isAr) {
    var names = {
      firebaseAuth: isAr ? 'تسجيل دخول وحسابات Firebase' : 'Firebase Authentication',
      firestoreRealtime: isAr ? 'قاعدة بيانات لحظية Firestore' : 'Firestore Realtime DB',
      restApi: isAr ? 'ربط REST API خارجي' : 'REST API Integration',
      payments: isAr ? 'بوابة دفع إلكتروني وسداد' : 'Online Payment Gateway',
      pushNotifications: isAr ? 'إشعارات لحظية Push' : 'Push Notifications',
      adminPanel: isAr ? 'لوحة تحكم وإدارة' : 'Admin Dashboard',
      mapsGps: isAr ? 'خرائط وتتبع GPS' : 'Maps & GPS Tracking',
      chatMessaging: isAr ? 'شات ومحادثات فورية' : 'Live Chat / Messaging',
      figmaCustomUI: isAr ? 'تصميم واجهات مخصصة Figma' : 'Custom Figma UI/UX',
      storeSubmission: isAr ? 'رفع ونشر على المتاجر' : 'App Store & Play Store Submission',
      localizationArEn: isAr ? 'تعريب ولغتان (عربي/إنجليزي)' : 'Localization (AR / EN)',
      offlineMode: isAr ? 'دعم العمل دون إنترنت Offline' : 'Offline Mode Storage',
      chartsAnalytics: isAr ? 'رسوم بيانية وتحليلات' : 'Charts & Analytics',
      adsIntegration: isAr ? 'إعلانات AdMob' : 'AdMob Integration'
    };
    return names[key] || key;
  }

  function appendCustomQuoteBox(card, isAr, cur) {
    var parsed = parsePlannerInputsForQuote();
    var quote = (typeof window !== 'undefined' && window.estimateQuote)
      ? window.estimateQuote(parsed)
      : { estimate: 200, range: [150, 250], exceedsCeiling: false };

    var curRate = (CURRENCY_RATES[cur] || CURRENCY_RATES.USD).rate;
    var curSym  = (CURRENCY_RATES[cur] || CURRENCY_RATES.USD).symbol;

    var box = document.createElement('div');
    box.className = 'custom-quote-box';
    box.style.cssText = 'margin-top:22px;padding:20px;background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.3);border-radius:16px;';

    if (quote.exceedsCeiling) {
      box.innerHTML = '<div style="font-size:15px;font-weight:700;color:#c084fc;margin-bottom:8px;"><i class="fas fa-handshake"></i> ' +
        (isAr ? 'مشروع مخصص واسع النطاق' : 'Enterprise / Custom Project Scope') + '</div>' +
        '<p style="font-size:13px;color:var(--text);margin-bottom:14px;line-height:1.6;">' +
        (isAr ? 'المشروع ده محتاج مناقشة مباشرة مع عبدالرحمن لتحديد البنية والجدول والتكلفة المناسبة.'
              : 'This project scope requires a direct consultation with Abdelrahman to tailor architecture and timeline.') + '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '  <a href="https://wa.me/' + CONTACT.whatsappNumber + '?text=' + encodeURIComponent(isAr ? 'أهلاً عبد الرحمن، لدي مشروع متقدم وأرغب في مناقشته مباشرة.' : 'Hi Abdelrahman, I have a custom enterprise project to discuss.') + '" target="_blank" rel="noopener" class="pr-action-btn" style="background:#22c55e;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;text-decoration:none;"><i class="fab fa-whatsapp"></i> ' + (isAr ? 'تواصل على واتساب' : 'Chat on WhatsApp') + '</a>' +
        '  <a href="mailto:' + CONTACT.email + '" class="pr-action-btn" style="background:rgba(255,255,255,0.1);color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;text-decoration:none;"><i class="fas fa-envelope"></i> ' + (isAr ? 'إرسال بريد إلكتروني' : 'Send Email') + '</a>' +
        '</div>';
      card.appendChild(box);
      return;
    }

    var estLocal = Math.round(quote.estimate * curRate).toLocaleString();
    var minLocal = Math.round(quote.range[0] * curRate).toLocaleString();
    var maxLocal = Math.round(quote.range[1] * curRate).toLocaleString();

    var marketCmp = '';
    if (quote.estimate <= 150) {
      marketCmp = isAr ? 'نفس هذا المشروع على Fiverr بيتباع عادةً $120–360' : 'Similar scope on Fiverr typically sells for $120–360';
    } else if (quote.estimate <= 450) {
      marketCmp = isAr ? 'نفس هذا المشروع على Fiverr وUpwork بيتباع عادةً $480–1,200' : 'Similar project on Fiverr & Upwork typically sells for $480–1,200';
    } else {
      marketCmp = isAr ? 'نفس هذا المشروع على Fiverr بيتباع عادةً $1,450+ وفي وكالات مصر من $1,500+' : 'Similar production project typically sells for $1,450+ on Fiverr & agencies';
    }

    var cfg = (typeof window !== 'undefined' && window.QUOTE_CONFIG) || { base: 60, perScreenExtra: 15, features: {} };
    var extraScreens = Math.max(0, parsed.screens - 3);
    var rows = '<tr><td>' + (isAr ? 'أساس المشروع (يشمل أول 3 شاشات)' : 'Base Project (incl. first 3 screens)') + '</td><td dir="ltr">$' + cfg.base + '</td></tr>';
    if (extraScreens > 0) {
      rows += '<tr><td>' + (isAr ? 'شاشات إضافية (' + extraScreens + ' × $15)' : 'Extra screens (' + extraScreens + ' × $15)') + '</td><td dir="ltr">$' + (extraScreens * 15) + '</td></tr>';
    }
    parsed.features.forEach(function(fKey) {
      var cost = (cfg.features && cfg.features[fKey]) || 0;
      rows += '<tr><td>' + formatFeatureName(fKey, isAr) + '</td><td dir="ltr">$' + cost + '</td></tr>';
    });
    var mult = parsed.complexity === 'complex' ? '1.35x' : (parsed.complexity === 'medium' ? '1.15x' : '1.0x');
    rows += '<tr><td>' + (isAr ? 'معامل التعقيد (' + (parsed.complexity === 'complex' ? 'معقد' : (parsed.complexity === 'medium' ? 'متوسط' : 'بسيط')) + ')' : 'Complexity Multiplier (' + parsed.complexity + ')') + '</td><td dir="ltr">' + mult + '</td></tr>';

    box.innerHTML = '<div style="font-size:14px;font-weight:700;color:#c084fc;margin-bottom:6px;display:flex;align-items:center;gap:8px;">' +
      '<i class="fas fa-calculator"></i> ' + (isAr ? 'التكلفة التقديرية المخصصة لمشروعك' : 'Estimated Cost Quote for Your Scope') + '</div>' +
      '<div style="font-size:24px;font-weight:800;color:#38bdf8;margin:6px 0 10px 0;" dir="ltr">' +
      '  ~' + curSym + estLocal + ' <span style="font-size:13px;font-weight:500;color:var(--muted);">(' + (isAr ? 'نطاق: ' : 'Range: ') + curSym + minLocal + ' – ' + curSym + maxLocal + ')</span>' +
      '</div>' +
      '<div style="overflow-x:auto;margin:12px 0;">' +
      '  <table class="cpc-table" style="font-size:12px;width:100%;">' +
      '    <thead><tr><th>' + (isAr ? 'البند / المميزة' : 'Item / Feature') + '</th><th>' + (isAr ? 'القيمة التقديرية' : 'Est. Value') + '</th></tr></thead>' +
      '    <tbody>' + rows + '</tbody>' +
      '  </table>' +
      '</div>' +
      '<div style="font-size:12px;color:rgba(168,85,247,0.9);margin:8px 0;font-style:italic;"><i class="fas fa-chart-line"></i> ' + marketCmp + '</div>' +
      '<div style="font-size:11px;color:var(--muted);opacity:0.85;margin-top:6px;"><i class="fas fa-info-circle"></i> ' +
      (isAr ? 'سعر تقريبي لأغراض التخطيط — السعر النهائي بعد مراجعة عبدالرحمن للمتطلبات.'
            : 'Approximate estimate for planning purposes — Final quote finalized after Abdelrahman reviews requirements.') + '</div>';

    card.appendChild(box);
  }

  // Render Plan with Rich Interactive Visuals
  function renderPlan(text) {
    if (!bodyEl) return;
    lastGeneratedPlan = text;
    bodyEl.innerHTML = '';

    var secs = parseSections(text);
    var isAr = lang() === 'ar';
    var cur  = currentSelectedCurrency;
    var initialEst = getEstimatedAmounts(cur);

    var wrap = document.createElement('div');
    wrap.className = 'pr-cards-wrap';

    var icons  = { 1: 'fa-bullseye', 2: 'fa-layer-group', 3: 'fa-stopwatch', 4: 'fa-wallet', 5: 'fa-rocket' };
    var badges = {
      1: isAr ? 'الرؤية والهدف'           : 'Vision & Value',
      2: isAr ? 'نطاق النسخة الأولى'       : 'MVP Scope',
      3: isAr ? 'الجدول الفعلي للتسليم'    : 'Real Delivery Schedule',
      4: isAr ? 'التكلفة والتسعير العادل'  : 'Investment & Pricing',
      5: isAr ? 'تحسينات المستقبل'         : 'Future Add-ons'
    };

    var renderSecs = secs.length >= 3 ? secs : [
      { num: 1, title: isAr ? 'ملخص المشروع والرؤية الاستراتيجية' : 'Executive Blueprint & Strategy', body: ['• حل تقني متكامل عالي الأداء.'] },
      { num: 2, title: isAr ? 'مميزات النسخة الأولى MVP' : 'Core MVP Scope', body: ['• شاشات عصرية، قواعد بيانات سحابية، وحماية.'] },
      { num: 3, title: isAr ? 'مراحل التنفيذ والتسليم الأسبوعي' : 'Real Delivery Schedule', body: ['• أسبوع 1 فيجما، أسبوع 2 نسخة v0.1، أسبوع 3 v0.5، أسبوع 4 نشر المتجرين.'] },
      { num: 4, title: isAr ? 'الميزانية الاستثمارية والتسعير العادل' : 'Investment & Pricing Breakdown', body: [] },
      { num: 5, title: isAr ? 'تحسينات مستقبلية عالية العائد' : 'Future High-ROI Enhancements', body: ['• دمج الذكاء الاصطناعي وبوابات الدفع.'] }
    ];

    renderSecs.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'plan-card-rich' + (s.num === 4 ? ' budget-focus-card' : '');
      card.setAttribute('data-section-num', s.num);

      // Card Header
      var hdr = document.createElement('div');
      hdr.className = 'pr-card-header';
      var badgeText = badges[s.num] || (isAr ? 'القسم ' + s.num : 'Section ' + s.num);
      var iconClass = icons[s.num] || 'fa-check';

      hdr.innerHTML = '<div class="pr-badge"><i class="fas ' + iconClass + '"></i> ' + badgeText + '</div>' +
        '<h4 class="pr-card-title">' + escapeHtml(s.title || (badgeText)) + '</h4>';
      card.appendChild(hdr);

      // SECTION 3: Visual Weekly Handover Timeline
      if (s.num === 3) {
        var tl = document.createElement('div');
        tl.className = 'timeline-visual-wrap';
        tl.innerHTML = isAr ? [
          '<div class="timeline-step-box"><div class="tsb-week"><span>الأسبوع 1</span> <i class="fas fa-pencil-ruler"></i></div><div class="tsb-title">التصميم والبروتوتايب</div><div class="tsb-desc">تصميم بروتوتايب Figma تفاعلي كامل وموافقتك عليه قبل كتابة كود.</div><div class="tsb-handover"><i class="fas fa-gift"></i> رابط Figma تفاعلي</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>الأسبوع 2</span> <i class="fas fa-code"></i></div><div class="tsb-title">معمارية الكود والواجهات</div><div class="tsb-desc">بناء كود Flutter نظيف وربط الشاشات الرئيسية والهوية البصرية.</div><div class="tsb-handover"><i class="fas fa-mobile-alt"></i> تجربة نسخة تجريبية v0.1 على هاتفك</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>الأسبوع 3</span> <i class="fas fa-database"></i></div><div class="tsb-title">ربط السيرفر والبيانات</div><div class="tsb-desc">ربط Firebase / APIs السحابية، واستكمال الوظائف.</div><div class="tsb-handover"><i class="fas fa-cloud-upload-alt"></i> تجربة نسخة شبه نهائية v0.5</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>الأسبوع 4</span> <i class="fas fa-rocket"></i></div><div class="tsb-title">النشر والتسليم الشامل</div><div class="tsb-desc">رفع التطبيق لمتجري Google Play وApp Store وضمان الجودة.</div><div class="tsb-handover"><i class="fas fa-award"></i> تسليم السورس كود + ضمان 30 يوماً</div></div>'
        ].join('') : [
          '<div class="timeline-step-box"><div class="tsb-week"><span>Week 1</span> <i class="fas fa-pencil-ruler"></i></div><div class="tsb-title">Interactive Prototyping</div><div class="tsb-desc">Full Figma prototype, UX flow sign-off, color palette.</div><div class="tsb-handover"><i class="fas fa-gift"></i> Interactive Figma clickable link</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>Week 2</span> <i class="fas fa-code"></i></div><div class="tsb-title">Client-Side Architecture</div><div class="tsb-desc">Flutter clean code, state management, UI widgets.</div><div class="tsb-handover"><i class="fas fa-mobile-alt"></i> Live APK / TestFlight v0.1 on device</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>Week 3</span> <i class="fas fa-database"></i></div><div class="tsb-title">Backend Integration</div><div class="tsb-desc">Firebase / REST API, feature completion & QA.</div><div class="tsb-handover"><i class="fas fa-cloud-upload-alt"></i> Staging build v0.5</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>Week 4</span> <i class="fas fa-rocket"></i></div><div class="tsb-title">Launch & Handover</div><div class="tsb-desc">Google Play & App Store submission, full QA.</div><div class="tsb-handover"><i class="fas fa-award"></i> Source code + 30-day warranty</div></div>'
        ].join('');
        card.appendChild(tl);
      }

      // SECTION 4: Live Currency Switcher & 3 Selectable Fair Tier Cards + Dynamic Milestones & Table
      if (s.num === 4) {
        var cs = document.createElement('div');
        cs.className = 'beh-curr-switcher';
        cs.innerHTML = '<span class="beh-curr-label">' + t('currSwitcherLabel') + '</span>' +
          '<button type="button" class="curr-pill' + (cur==='USD'?' active':'') + '" data-c="USD">USD ($)</button>' +
          '<button type="button" class="curr-pill' + (cur==='EGP'?' active':'') + '" data-c="EGP">EGP (ج.م)</button>' +
          '<button type="button" class="curr-pill' + (cur==='SAR'?' active':'') + '" data-c="SAR">SAR (ر.س)</button>' +
          '<button type="button" class="curr-pill' + (cur==='AED'?' active':'') + '" data-c="AED">AED (د.إ)</button>';
        card.appendChild(cs);

        var hint = document.createElement('p');
        hint.className = 'tier-select-hint';
        hint.textContent = t('tierSelectHint');
        card.appendChild(hint);

        var bh = document.createElement('div');
        bh.className = 'budget-estimate-highlight';
        bh.innerHTML = isAr ? [
          '<div class="beh-tier-card selectable-tier" data-tier-id="starter" data-tier-name="STARTER"><div class="beh-tier-name">STARTER (الباقة الأساسية)</div><div class="beh-price" id="price-tier-starter" dir="ltr">' + initialEst.starterHtml + '</div><div class="beh-desc">تطبيقات خدمية خفيفة، حتى 5 شاشات، سورس كود كامل.</div><div class="beh-market-cmp" style="font-size:11px;color:rgba(168,85,247,0.9);margin:4px 0 6px;font-style:italic;">السوق عادةً: $120–360 على Fiverr</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>',
          '<div class="beh-tier-card recommended selectable-tier tier-selected" data-tier-id="standard" data-tier-name="STANDARD"><div class="beh-tier-name">⭐ STANDARD (الباقة القياسية — موصى بها)</div><div class="beh-price" id="price-tier-standard" dir="ltr">' + initialEst.standardHtml + '</div><div class="beh-desc">تطبيقات متكاملة (متاجر، حجوزات)، حتى 12 شاشة، سيرفر وAuth وضمان 30 يوماً.</div><div class="beh-market-cmp" style="font-size:11px;color:rgba(168,85,247,0.9);margin:4px 0 6px;font-style:italic;">السوق عادةً: $480–1,200 على Fiverr وUpwork</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>',
          '<div class="beh-tier-card selectable-tier" data-tier-id="pro" data-tier-name="PRO"><div class="beh-tier-name">PRO (إطلاق إنتاجي شامل)</div><div class="beh-price" id="price-tier-pro" dir="ltr">' + initialEst.proHtml + '</div><div class="beh-desc">شاشات غير محدودة، نشر المتجرين (iOS & Android)، دفع إلكتروني متقدم.</div><div class="beh-market-cmp" style="font-size:11px;color:rgba(168,85,247,0.9);margin:4px 0 6px;font-style:italic;">السوق عادةً: $1,450+ على Fiverr و$1,500+ في وكالات مصر</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>'
        ].join('') : [
          '<div class="beh-tier-card selectable-tier" data-tier-id="starter" data-tier-name="STARTER"><div class="beh-tier-name">STARTER</div><div class="beh-price" id="price-tier-starter" dir="ltr">' + initialEst.starterHtml + '</div><div class="beh-desc">Lean utility apps, up to 5 screens, clean codebase.</div><div class="beh-market-cmp" style="font-size:11px;color:rgba(168,85,247,0.9);margin:4px 0 6px;font-style:italic;">Market typically: $120–360 on Fiverr</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>',
          '<div class="beh-tier-card recommended selectable-tier tier-selected" data-tier-id="standard" data-tier-name="STANDARD"><div class="beh-tier-name">⭐ STANDARD (Recommended)</div><div class="beh-price" id="price-tier-standard" dir="ltr">' + initialEst.standardHtml + '</div><div class="beh-desc">Complete apps, up to 12 screens, Auth, DB, API & 30-day warranty.</div><div class="beh-market-cmp" style="font-size:11px;color:rgba(168,85,247,0.9);margin:4px 0 6px;font-style:italic;">Market typically: $480–1,200 on Fiverr & Upwork</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>',
          '<div class="beh-tier-card selectable-tier" data-tier-id="pro" data-tier-name="PRO"><div class="beh-tier-name">PRO (Full Scale)</div><div class="beh-price" id="price-tier-pro" dir="ltr">' + initialEst.proHtml + '</div><div class="beh-desc">Full production app, unlimited screens, store deployment, advanced payments.</div><div class="beh-market-cmp" style="font-size:11px;color:rgba(168,85,247,0.9);margin:4px 0 6px;font-style:italic;">Market typically: $1,450+ on Fiverr, $1,500+ with agencies</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>'
        ].join('');
        card.appendChild(bh);

        selectedBudgetTier = { id: 'standard', name: 'STANDARD', priceText: initialEst.standardText };

        // Dynamic Milestone Breakdown Box that recalculates with Currency & Tier
        var mpb = document.createElement('div');
        mpb.className = 'milestones-payment-box';
        mpb.innerHTML = '<div class="mpb-title"><i class="fas fa-shield-alt"></i> ' + t('milestoneTitle') + '</div>' +
          '<div class="mpb-grid">' +
          '  <div class="mpb-item">' +
          '    <div class="mpb-item-header"><span class="mpb-phase-name">' + t('phase1Name') + '</span><span class="mpb-phase-amount" id="mpb-phase1-amount" dir="ltr"></span></div>' +
          '    <p class="mpb-phase-desc">' + t('phase1Desc') + '</p>' +
          '  </div>' +
          '  <div class="mpb-item">' +
          '    <div class="mpb-item-header"><span class="mpb-phase-name">' + t('phase2Name') + '</span><span class="mpb-phase-amount" id="mpb-phase2-amount" dir="ltr"></span></div>' +
          '    <p class="mpb-phase-desc">' + t('phase2Desc') + '</p>' +
          '  </div>' +
          '  <div class="mpb-item">' +
          '    <div class="mpb-item-header"><span class="mpb-phase-name">' + t('phase3Name') + '</span><span class="mpb-phase-amount" id="mpb-phase3-amount" dir="ltr"></span></div>' +
          '    <p class="mpb-phase-desc">' + t('phase3Desc') + '</p>' +
          '  </div>' +
          '</div>';
        card.appendChild(mpb);

        // Dynamic Deliverables & Investment Breakdown Table (No ugly raw markdown pipes!)
        var dtWrap = document.createElement('div');
        dtWrap.className = 'cpc-table-wrap';
        dtWrap.style.margin = '20px 0 14px 0';
        dtWrap.innerHTML = '<div style="font-size:14px;font-weight:700;color:#c084fc;margin-bottom:10px;display:flex;align-items:center;gap:8px;"><i class="fas fa-tasks"></i> ' + t('tableTitle') + '</div>' +
          '<table class="cpc-table">' +
          '  <thead>' +
          '    <tr>' +
          '      <th>' + t('thPhase') + '</th>' +
          '      <th>' + t('thScope') + '</th>' +
          '      <th>' + t('thTimeline') + '</th>' +
          '      <th>' + t('thInvestment') + '</th>' +
          '    </tr>' +
          '  </thead>' +
          '  <tbody>' +
          '    <tr>' +
          '      <td><strong style="color:#38bdf8;"><i class="fas fa-pencil-ruler"></i> ' + t('tbP1Title') + '</strong></td>' +
          '      <td>' + t('tbP1Scope') + '</td>' +
          '      <td>' + t('tbP1Time') + '</td>' +
          '      <td><span id="dt-p1-cost" dir="ltr"></span></td>' +
          '    </tr>' +
          '    <tr>' +
          '      <td><strong style="color:#a855f7;"><i class="fas fa-code"></i> ' + t('tbP2Title') + '</strong></td>' +
          '      <td>' + t('tbP2Scope') + '</td>' +
          '      <td>' + t('tbP2Time') + '</td>' +
          '      <td><span id="dt-p2-cost" dir="ltr"></span></td>' +
          '    </tr>' +
          '    <tr>' +
          '      <td><strong style="color:#34d399;"><i class="fas fa-rocket"></i> ' + t('tbP3Title') + '</strong></td>' +
          '      <td>' + t('tbP3Scope') + '</td>' +
          '      <td>' + t('tbP3Time') + '</td>' +
          '      <td><span id="dt-p3-cost" dir="ltr"></span></td>' +
          '    </tr>' +
          '    <tr style="background:rgba(168,85,247,0.12);font-weight:700;">' +
          '      <td colspan="2"><i class="fas fa-shield-alt" style="color:#10b981;"></i> ' + t('tbTotalTitle') + '</td>' +
          '      <td>' + t('tbTotalTime') + '</td>' +
          '      <td><span id="dt-total-cost" dir="ltr" style="color:#38bdf8;font-size:15px;font-weight:800;"></span></td>' +
          '    </tr>' +
          '  </tbody>' +
          '</table>';
        card.appendChild(dtWrap);

        setTimeout(function() {
          updateMilestonesBox(cur, 'standard');
          updateDeliverablesTable(cur, 'standard');
        }, 10);
        appendCustomQuoteBox(card, isAr, cur);
      }

      // SECTION 5: Future Enhancements Grid
      if (s.num === 5) {
        var eg = document.createElement('div');
        eg.className = 'enhancements-grid';
        eg.innerHTML = isAr ? [
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-brain"></i></div><div class="enhancement-text"><h5>دمج الذكاء الاصطناعي</h5><p>مساعد ذكي داخل التطبيق ونظام ترشيحات مخصص.</p></div></div>',
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-bell"></i></div><div class="enhancement-text"><h5>حملات الإشعارات الذكية</h5><p>إشعارات مجزأة لإعادة تفاعل المستخدمين تلقائياً.</p></div></div>',
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-credit-card"></i></div><div class="enhancement-text"><h5>بوابات دفع متعددة</h5><p>Apple Pay وGoogle Pay وبطاقات بنكية ومحلية.</p></div></div>',
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-chart-line"></i></div><div class="enhancement-text"><h5>تحليلات قنوات التحويل</h5><p>بيانات فورية عن سلوك المستخدم ومعدلات الاحتفاظ.</p></div></div>'
        ].join('') : [
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-brain"></i></div><div class="enhancement-text"><h5>AI Smart Assistant</h5><p>In-app generative chatbot & personalized recommendations.</p></div></div>',
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-bell"></i></div><div class="enhancement-text"><h5>Automated Push Campaigns</h5><p>Segmented push notifications for user re-engagement.</p></div></div>',
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-credit-card"></i></div><div class="enhancement-text"><h5>Multi-Currency Gateways</h5><p>Apple Pay, Google Pay, Stripe & local card processors.</p></div></div>',
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-chart-line"></i></div><div class="enhancement-text"><h5>Conversion Analytics</h5><p>Real-time telemetry & user retention behavioral metrics.</p></div></div>'
        ].join('');
        card.appendChild(eg);
      }

      // Clean formatted bullet items
      var ct = document.createElement('div');
      ct.className = 'cpc-content';
      ct.setAttribute('dir', 'auto');
      var bodyLines = s.body || [];
      ct.innerHTML = formatRichContent(bodyLines, isAr);
      if (ct.innerHTML.trim()) {
        card.appendChild(ct);
      }

      wrap.appendChild(card);
    });

    bodyEl.appendChild(wrap);

    // Wire Currency Switcher Buttons inside Section 4
    bodyEl.querySelectorAll('.curr-pill').forEach(function(pill) {
      pill.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var c = pill.getAttribute('data-c');
        if (c) updateBudgetCardAmounts(c);
      });
    });

    // Wire Selectable Tier Cards
    bodyEl.querySelectorAll('.selectable-tier').forEach(function(tierCard) {
      tierCard.addEventListener('click', function() {
        bodyEl.querySelectorAll('.selectable-tier').forEach(function(tc) { tc.classList.remove('tier-selected'); });
        tierCard.classList.add('tier-selected');
        var tId = tierCard.getAttribute('data-tier-id');
        var tName = tierCard.getAttribute('data-tier-name');
        var est = getEstimatedAmounts(currentSelectedCurrency);
        var pText = (tId === 'starter' ? est.starterText : (tId === 'pro' ? est.proText : est.standardText));

        selectedBudgetTier = {
          id:        tId,
          name:      tName,
          priceText: pText
        };
        updateMilestonesBox(currentSelectedCurrency, tId);
        updateDeliverablesTable(currentSelectedCurrency, tId);
      });
    });

    // Review & Actions Box
    var abox = document.createElement('div');
    abox.className = 'pr-review-box';
    abox.innerHTML = [
      '<div class="pr-contact-fields">',
      '  <div class="pr-field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">',
      '    <input type="text" id="pr-client-name" class="pf-input" style="padding:12px 16px;font-size:14px;" placeholder="' + t('namePh') + '">',
      '    <input type="text" id="pr-client-contact" class="pf-input" style="padding:12px 16px;font-size:14px;" placeholder="' + t('contactPh') + '">',
      '  </div>',
      '</div>',
      '<div class="pr-action-buttons">',
      '  <button type="button" id="pr-approve-btn"><i class="fab fa-whatsapp" style="font-size:18px;"></i> <span>' + t('approveBtn') + '</span></button>',
      '  <button type="button" id="pr-ask-btn"><i class="fas fa-brain"></i> <span>' + t('explainBtn') + '</span></button>',
      '  <button type="button" id="pr-copy-btn" class="btn-secondary" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);padding:13px 20px;border-radius:24px;font-size:13px;font-weight:600;cursor:pointer;color:var(--text);"><i class="fas fa-copy"></i> <span>' + t('copyBtn') + '</span></button>',
      '  <button type="button" id="pr-regen-btn"><i class="fas fa-redo-alt"></i> <span>' + t('regenBtn') + '</span></button>',
      '</div>',
      '<div id="pr-ask-panel" style="display:none;margin-top:20px;padding:22px;background:rgba(15,23,42,0.85);border:1px solid rgba(168,85,247,0.35);border-radius:16px;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.4);">',
      '  <div style="font-size:16px;font-weight:800;color:#c084fc;margin-bottom:12px;display:flex;align-items:center;gap:10px;"><i class="fas fa-user-tie" style="font-size:18px;"></i> ' + t('consultantTitle') + '</div>',
      '  <div id="pr-consultant-pitch" style="padding:16px;background:rgba(168,85,247,0.08);border-left:4px solid #a855f7;border-radius:8px;margin-bottom:16px;font-size:14px;line-height:1.75;color:var(--text);"></div>',
      '  <div class="pr-quick-prompts" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">',
      '    <button type="button" class="btn-quick-prompt" data-q="' + t('quickPrompt1') + '" style="background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.35);color:#e2e8f0;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;">💡 ' + t('quickPrompt1') + '</button>',
      '    <button type="button" class="btn-quick-prompt" data-q="' + t('quickPrompt2') + '" style="background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.35);color:#e2e8f0;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;">⏱️ ' + t('quickPrompt2') + '</button>',
      '    <button type="button" class="btn-quick-prompt" data-q="' + t('quickPrompt3') + '" style="background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.35);color:#e2e8f0;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;">⭐ ' + t('quickPrompt3') + '</button>',
      '  </div>',
      '  <div style="display:flex;gap:10px;">',
      '    <input type="text" id="pr-ask-input" class="pf-input" style="flex:1;padding:12px 16px;font-size:14px;" placeholder="' + t('askPh') + '">',
      '    <button type="button" id="pr-ask-submit-btn" class="btn-primary" style="padding:12px 20px;border-radius:12px;white-space:nowrap;font-size:13px;font-weight:700;"><i class="fas fa-paper-plane"></i> ' + t('sendQuestion') + '</button>',
      '  </div>',
      '  <div id="pr-qa-stream" style="margin-top:16px;display:flex;flex-direction:column;gap:12px;"></div>',
      '</div>',
      '<div id="pr-status-msg" style="display:none;margin-top:14px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;text-align:center;"></div>'
    ].join('\n');

    bodyEl.appendChild(abox);

    var approveBtn   = document.getElementById('pr-approve-btn');
    var askBtn2      = document.getElementById('pr-ask-btn');
    var copyBtn2     = document.getElementById('pr-copy-btn');
    var regenBtn     = document.getElementById('pr-regen-btn');
    var askPanel     = document.getElementById('pr-ask-panel');
    var consultantPitch = document.getElementById('pr-consultant-pitch');
    var askInput     = document.getElementById('pr-ask-input');
    var askSubmitBtn = document.getElementById('pr-ask-submit-btn');
    var qaStream     = document.getElementById('pr-qa-stream');
    var statusMsg    = document.getElementById('pr-status-msg');

    // Regenerate
    if (regenBtn) {
      regenBtn.addEventListener('click', function() {
        if (ideaEl) {
          ideaEl.focus();
          ideaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    // Copy Full Plan
    if (copyBtn2) {
      copyBtn2.addEventListener('click', function() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function() {
            var span = copyBtn2.querySelector('span');
            if (span) span.textContent = t('copiedBtn');
            setTimeout(function() {
              if (span) span.textContent = t('copyBtn');
            }, 2500);
          });
        }
      });
    }

    // Trigger AI Explainer Pitch & Sales Consultant
    if (askBtn2 && askPanel) {
      askBtn2.addEventListener('click', function() {
        var isHidden = askPanel.style.display === 'none';
        askPanel.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          askPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          if (consultantPitch && !consultantPitch.getAttribute('data-loaded')) {
            consultantPitch.setAttribute('data-loaded', '1');
            var curCode = currentSelectedCurrency || 'USD';
            var tierN = selectedBudgetTier.name;
            var tierP = selectedBudgetTier.priceText;

            consultantPitch.innerHTML = isAr
              ? '<strong>مرحباً بك! كمهندس ومستشار تقني، إليك مبررات جدوى هذا الاستثمار:</strong><br>' +
                '• <strong>تسعير عادل ومباشر:</strong> السعر المقترح (' + tierP + ') هو سعر عملي ومباشر بدون وسطاء أو تكاليف مكاتب خفية، يضمن لك كوداً أصلياً Clean Architecture عالي الجودة.<br>' +
                '• <strong>توفير 50%+ عبر Flutter:</strong> تطبيق واحد يعمل بكفاءة وسرعة على iPhone وAndroid في نفس الوقت، مما يوفر نصف تكلفة التطوير والصيانة المستقبلية.<br>' +
                '• <strong>صفر مخاطرة (Zero Risk):</strong> استثمارك مقسم على 3 دفعات مرحلية؛ الدفعة الأولى بعد اعتماد بروتوتايب فيجما التفاعلي، والثانية بعد تجربة نسخة حقيقية على هاتفك، والثالثة عند رفع المتجرين والتسليم.<br>' +
                '• <strong>ملكية كاملة وضمان:</strong> تحصل على السورس كود كاملاً 100% مع ضمان فني 30 يوماً لدعم الاستقرار.'
              : '<strong>Welcome! Here is why this proposal represents maximum ROI:</strong><br>' +
                '• <strong>Direct Fair Pricing:</strong> The quote (' + tierP + ') eliminates agency overheads while delivering enterprise-grade Clean Architecture.<br>' +
                '• <strong>50%+ Cost Savings via Flutter:</strong> A single high-performance codebase for both iOS & Android cuts development and maintenance costs in half.<br>' +
                '• <strong>Zero Risk Milestone Protection:</strong> Payments are phased into 3 tangible milestones (Interactive Figma, Test Build on device, and Store Release).<br>' +
                '• <strong>Full Ownership & Warranty:</strong> 100% source code repository ownership plus a 30-day post-launch warranty.';
          }
          if (askInput) askInput.focus();
        }
      });
    }

    // Quick prompt buttons
    bodyEl.querySelectorAll('.btn-quick-prompt').forEach(function(qBtn) {
      qBtn.addEventListener('click', function() {
        var query = qBtn.getAttribute('data-q');
        if (query && askInput) {
          askInput.value = query;
          if (askSubmitBtn) askSubmitBtn.click();
        }
      });
    });

    // Ask Consultant Custom Question
    function submitQuestion() {
      var qText = (askInput && askInput.value.trim()) || '';
      if (!qText || !qaStream) return;

      askSubmitBtn.disabled = true;
      askSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      var qItem = document.createElement('div');
      qItem.className = 'pr-qa-item';
      qItem.style.cssText = 'padding:14px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);';
      qItem.innerHTML = '<div style="font-weight:700;color:#38bdf8;margin-bottom:6px;"><i class="fas fa-question-circle"></i> ' + escapeHtml(qText) + '</div>' +
        '<div class="pr-qa-ans" style="color:var(--text);font-size:14px;line-height:1.75;"><i class="fas fa-spinner fa-spin"></i> ' + t('asking') + '</div>';
      qaStream.prepend(qItem);
      askInput.value = '';

      var consultantSys = isAr
        ? 'أنت مستشار تقني وهندسي أول لمشاريع Flutter على موقع المهندس عبدالرحمن أبو الوفا. مهمتك طمأنة العميل وإقناعه بقيمة الاستثمار والرد على استفساره بأسلوب واضح ومقنع وعملي. وضح له جودة التسليم، نظافة الكود (Clean Architecture)، وجودة الـ UX، والضمان 30 يوماً بعد النشر، والدفعات المرحلية التي تحميه. كن واثقاً ومقنعاً.'
        : 'You are a Senior Flutter Consultant on the portfolio of Abdelrahman Abouelwafa. Persuade the client with professional, reassuring arguments on why this architecture and pricing represents maximum ROI, clean architecture, store release guarantees, and 30-day post-launch warranty.';

      var fullQPrompt = '[Plan Summary]:\n' + text.slice(0, 1500) + '\n\n[Client Question]: ' + qText;

      callAI(fullQPrompt, consultantSys)
        .then(function(reply) {
          var ansEl = qItem.querySelector('.pr-qa-ans');
          if (ansEl) ansEl.textContent = reply;
        })
        .catch(function() {
          var ansEl = qItem.querySelector('.pr-qa-ans');
          if (ansEl) {
            ansEl.textContent = isAr
              ? 'السعر المقترح مدروس ومقسم على 3 دفعات مرتبطة بمحطات إنجاز حقيقية (بروتوتايب فيجما، نسخة تجريبية v0.5، ونشر المتجرين مع سورس كود كامل وضمان 30 يوماً). تواصل مباشرة على واتساب لنناقش كل بند.'
              : 'The proposed pricing is phased into 3 milestones tied directly to tangible deliverables (Figma prototype, v0.5 test build, and store launch with warranty). Connect with Abdelrahman on WhatsApp to finalize terms.';
          }
        })
        .finally(function() {
          askSubmitBtn.disabled = false;
          askSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> ' + t('sendQuestion');
        });
    }

    if (askSubmitBtn) askSubmitBtn.addEventListener('click', submitQuestion);
    if (askInput) {
      askInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitQuestion();
        }
      });
    }

    // WhatsApp Approve & Lock-in
    if (approveBtn) {
      approveBtn.addEventListener('click', function() {
        var clientName    = (document.getElementById('pr-client-name') && document.getElementById('pr-client-name').value.trim()) || (isAr ? 'عميل مهتم' : 'Interested Client');
        var clientContact = (document.getElementById('pr-client-contact') && document.getElementById('pr-client-contact').value.trim()) || '';
        var userIdea      = (ideaEl && ideaEl.value.trim()) || '';
        var curCode       = currentSelectedCurrency || 'USD';
        var curSym        = (CURRENCY_RATES[curCode] || CURRENCY_RATES.USD).symbol;
        var tierName      = selectedBudgetTier.name;
        var tierPrice     = selectedBudgetTier.priceText;
        var plat          = platforms();
        var deadline      = deadlineEl ? deadlineEl.options[deadlineEl.selectedIndex].text : '';
        var sep           = '────────────────────────';

        var waMsg = isAr ? [
          '✅ موافقة مبدئية على خطة المشروع', sep,
          '👤 الاسم: ' + clientName + (clientContact ? ' | ' + clientContact : ''),
          '💡 فكرة التطبيق: ' + userIdea,
          '📱 المنصة: ' + plat,
          '📦 الباقة المختارة: ' + tierName + (tierPrice ? ' — ' + tierPrice : ''),
          '🪙 العملة: ' + curCode + ' (' + curSym + ')',
          '📊 التقدير المخصص: ' + (window.estimateQuote ? ('~$' + window.estimateQuote(parsePlannerInputsForQuote()).estimate + ' (نطاق $' + window.estimateQuote(parsePlannerInputsForQuote()).range.join('-$') + ')') : ''),
          '⏱️ الجدول الزمني: ' + deadline, sep,
          '📌 مراحل التسليم المتفق عليها:',
          '  الأسبوع 1: بروتوتايب Figma تفاعلي',
          '  الأسبوع 2: نسخة تجريبية v0.1 على هاتفي',
          '  الأسبوع 3: نسخة مكتملة v0.5',
          '  الأسبوع 4: نشر على المتجرين + سورس كود + ضمان 30 يوماً', sep,
          'أرجو جدولة استشارة مجانية (15 دقيقة) لتأكيد التفاصيل النهائية والبدء! 🚀'
        ].join('\n') : [
          '✅ Project Plan Approval', sep,
          '👤 Client: ' + clientName + (clientContact ? ' | ' + clientContact : ''),
          '💡 App Concept: ' + userIdea,
          '📱 Platform: ' + plat,
          '📦 Selected Package: ' + tierName + (tierPrice ? ' — ' + tierPrice : ''),
          '🪙 Currency: ' + curCode + ' (' + curSym + ')',
          '⏱️ Timeline: ' + deadline, sep,
          '📌 Agreed Delivery Flow:',
          '  Week 1: Interactive Figma prototype',
          '  Week 2: Test build v0.1 on device',
          '  Week 3: Staging build v0.5',
          '  Week 4: Store release + source code + 30-day warranty', sep,
          'Please schedule our free 15-min alignment call to lock in deliverables! 🚀'
        ].join('\n');

        window.open('https://wa.me/' + CONTACT.whatsappNumber + '?text=' + encodeURIComponent(waMsg), '_blank', 'noopener');

        if (statusMsg) {
          statusMsg.style.cssText = 'display:block;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);color:#34d399;margin-top:14px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;text-align:center;';
          statusMsg.innerHTML = '<i class="fas fa-check-circle"></i> ' + t('successMsg');
        }
      });
    }

    showState('body');

    try {
      bodyEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch(e) {}
  }

  // Handle Generate Plan
  function handleGeneratePlan(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (btn && btn.disabled) return;

    var idea = (ideaEl && ideaEl.value.trim()) || '';
    if (!idea) {
      showError(t('errIdea'));
      if (ideaEl) ideaEl.focus();
      return;
    }

    showState('loading');
    setBusy(true);

    var userText = buildUserMessage();

    callAI(userText, null)
      .then(function(planText) {
        setBusy(false);
        renderPlan(planText);
      })
      .catch(function() {
        setBusy(false);
        renderPlan(generateLocalFallbackPlan());
      });
  }

  // Bind Submit to prevent default form submission
  form.addEventListener('submit', handleGeneratePlan);

  // Status Indicator
  if (modeEl) {
    var dot = modeEl.querySelector('.status-dot');
    if (dot) dot.style.background = '#22c55e';
  }

})();
