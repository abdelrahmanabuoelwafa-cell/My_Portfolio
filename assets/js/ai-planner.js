/* ============================================================
   AI Business Planner — High-Converting Client Roadmap & Estimator
   - Groq AI / Google Gemini via Cloudflare AI Worker & Direct Fallback
   - Structured 5-Section Client-Focused Output
   - Real Delivery Flow & Milestones Schedule (Actual delivery moments)
   - Dynamic Budget Estimation with Real-Time Currency Switcher (EGP, SAR, AED, USD)
   - Dedicated Section for Future Enhancements (تحسينات إضافية)
   - English by default with full Arabic support
   ============================================================ */
(function () {
  'use strict';

  var AI_ENDPOINT = window.PORTFOLIO_AI_ENDPOINT || null;
  var TIMEOUT_MS = 32000;
  var MAX_IDEA = 2500;

  // The 5 High-Impact, Client-Converting Sections (Irrelevant sections removed)
  var PREFILL = {
    en: '1) Executive Blueprint & Core Value Proposition\n2) Core MVP Deliverables & Feature Scope\n3) Real Delivery Flow & Milestones Schedule\n4) Investment Estimation & Budget Breakdown\n5) Recommended Future Enhancements & Add-ons\n',
    ar: '1) ملخص المشروع والقيمة الأساسية\n2) مميزات النسخة الأولى MVP ونطاق التسليم\n3) مراحل التنفيذ والجدول الزمني الفعلي للتسليم\n4) التكلفة التقديرية وتفاصيل الميزانية\n5) تحسينات إضافية مقترحة وتوسعات مستقبلية\n'
  };

  var PREFILL_NOTE = {
    en: '\nIMPORTANT: Output exactly these 5 numbered sections directly. For Section 3 (Real Delivery Flow), detail week-by-week delivery with explicit client handoff moments (Figma prototype, test builds v0.1 & v0.5, store release & source code handover). For Section 4 (Investment & Budget), provide clear cost breakdown with recommended package and milestone payment terms. For Section 5 (Future Enhancements), highlight 3-4 high-ROI future upgrades. Be convincing, professional, and client-centric.',
    ar: '\nهام: اكتب الأقسام الخمسة المرقمة أعلاه مباشرة بدقة. في القسم 3 (مراحل التنفيذ والجدول الفعلي)، حدد بالأسابيع متى يستلم العميل كل مرحلة (بروتوتايب فيجما تفاعلي، نسخ تجريبية v0.1 و v0.5، ونشر المتجرين وتسليم السورس كود والضمان). في القسم 4 (التكلفة والميزانية)، قدم تقديرًا واضحًا بالعملة المطلوبة وتقسيم الدفعات. في القسم 5 (تحسينات إضافية)، اذكر 3-4 إضافات مميزة للمستقبل. اكتب بأسلوب مقنع واحترافي يطمئن العميل.'
  };

  // Currency Conversion Rates (Base: USD)
  var CURRENCY_RATES = {
    USD: { symbol: '$', rate: 1.0, name: 'USD ($)', code: 'USD' },
    EGP: { symbol: 'ج.م', rate: 50.0, name: 'EGP (ج.م)', code: 'EGP' },
    SAR: { symbol: 'ر.س', rate: 3.75, name: 'SAR (ر.س)', code: 'SAR' },
    AED: { symbol: 'د.إ', rate: 3.67, name: 'AED (د.إ)', code: 'AED' }
  };

  var form = document.getElementById('planner-form');
  if (!form) return;

  var ideaEl = document.getElementById('planner-idea');
  var audEl = document.getElementById('planner-audience');
  var featEl = document.getElementById('planner-features');
  var currEl = document.getElementById('planner-currency');
  var deadlineEl = document.getElementById('planner-deadline');
  var btn = document.getElementById('planner-btn');
  var emptyEl = document.getElementById('planner-empty');
  var loadingEl = document.getElementById('planner-loading');
  var errorEl = document.getElementById('planner-error');
  var bodyEl = document.getElementById('planner-body');
  var previewEl = document.getElementById('planner-preview');
  var chips = Array.prototype.slice.call(document.querySelectorAll('#planner-platform .pf-chip'));

  var currentSelectedCurrency = 'USD';
  var lastGeneratedPlan = '';

  var STR = {
    en: {
      topBadge: 'Instant Client Roadmap & Budget Estimator — Free',
      mainTitle: 'AI Project Blueprint & Cost Planner',
      mainSubtitle: 'Transform your app idea into a high-converting, production-ready roadmap with realistic delivery milestones, transparent budget estimation in your local currency, and tailored feature architecture.',
      badge: 'AI Engine Online — Architecture & Sprint Planning Ready',
      ideaLabel: 'Project Idea & Business Vision *',
      ideaPh: 'Describe your app concept, the core problem it solves, and your main business goal...',
      audLabel: 'Target Audience & Market (Optional)',
      audPh: 'e.g. Healthcare clinics, e-commerce shoppers, college students...',
      platLabel: 'Target Platform',
      platMobile: 'Mobile (iOS + Android)',
      platWeb: 'Web',
      platDesktop: 'Desktop',
      platUniversal: 'Cross-Platform',
      featLabel: 'Key Features & Modules (Optional)',
      featPh: 'e.g. User login, payment gateway, real-time chat, push notifications, Google Maps...',
      currencyLabel: 'Preferred Currency & Country',
      deadlineLabel: 'Estimated Delivery Expectation',
      dlMvp: 'Fast MVP (2–3 Weeks)',
      dlStandard: 'Standard Production (3–5 Weeks)',
      dlEnterprise: 'Full Scale Launch (6–8 Weeks)',
      dlFlexible: 'Flexible / Milestone Based',
      generate: 'Generate Client Roadmap & Estimate',
      generating: 'Architecting Roadmap...',
      note: 'Clear, structured guidance. Final timeline, deliverables, and exact quote are finalized during your free consultation.',
      empty: 'Ready to build your client-grade project plan? Fill in your project idea above and generate a structured 5-section executive blueprint.',
      loadingTitle: 'Architecting Your Project Roadmap...',
      loading: 'Analyzing features, structuring sprints, and computing budget...',
      errIdea: 'Please describe your project idea first.',
      errNetwork: 'Could not reach the AI service. Please check your connection and try again.',
      errConfig: 'AI service endpoint is not configured.',
      errTimeout: 'The AI took too long to respond. Please try again.',
      errGeneric: 'Something went wrong while generating the plan. Please try again.',
      approveBtn: '✅ Approve Plan & Message on WhatsApp',
      askBtn: '❓ Ask AI a Question about this Plan',
      regenBtn: '🔄 Regenerate Plan',
      namePh: 'Your Name (Optional)',
      contactPh: 'WhatsApp or Email for follow-up',
      askPh: 'Ask any question about this plan (e.g. Can we deliver Phase 1 faster?)...',
      sendQuestion: 'Send Question',
      asking: 'Consulting AI...',
      successMsg: 'Roadmap approved! Opening WhatsApp to connect with Abdelrahman...',
      currSwitcherLabel: 'Switch Display Currency:'
    },
    ar: {
      topBadge: 'خطة عمل برمجية وميزانية تقديرية للعميل — مجانًا',
      mainTitle: 'مخطط مشروعك البرمجي وتقدير التكلفة بالذكاء الاصطناعي',
      mainSubtitle: 'حوّل فكرة تطبيقك إلى خطة تنفيذ واضحة ومقنعة مع مراحل التسليم الفعلية، التكلفة التقريبية بعملتك المحلية، والمعمارية البرمجية المناسبة.',
      badge: 'محرك الذكاء الاصطناعي متصل — جاهز لتخطيط مراحل التنفيذ والتكلفة',
      ideaLabel: 'فكرة المشروع والهدف منه *',
      ideaPh: 'اوصف فكرة تطبيقك، المشكلة التي يحلها، والهدف الرئيسي لمشروعك...',
      audLabel: 'الجمهور المستهدف والسوق (اختياري)',
      audPh: 'مثال: عيادات طبية، متسوقون عبر الإنترنت، طلاب جامعات...',
      platLabel: 'المنصة المستهدفة',
      platMobile: 'موبايل (أندرويد + آيفون)',
      platWeb: 'ويب',
      platDesktop: 'سطح المكتب',
      platUniversal: 'جميع المنصات',
      featLabel: 'المميزات المطلوبة (اختياري)',
      featPh: 'مثال: تسجيل دخول، دفع إلكتروني، شات فوري، إشعارات، خرائط جوجل...',
      currencyLabel: 'العملة المفضلة / البلد',
      deadlineLabel: 'المدة الزمنية المتوقعة للتسليم',
      dlMvp: 'نسخة أولية سريعة (2 إلى 3 أسابيع)',
      dlStandard: 'إطلاق قياسي متكامل (3 إلى 5 أسابيع)',
      dlEnterprise: 'مشروع كبير وموسع (6 إلى 8 أسابيع)',
      dlFlexible: 'مرن / حسب مراحل الاتفاق',
      generate: 'أنشئ خطة المشروع وتقدير التكلفة',
      generating: 'جارٍ هندسة خطة التنفيذ...',
      note: 'تقديرات تخطيطية أولية واضحة. يتم تحديد الموعد النهائي والتكلفة الدقيقة بعد استشارة مجانية.',
      empty: 'جاهز لبناء خطة مشروعك البرمجي؟ اكتب فكرة مشروعك بالأعلى لتوليد خطة تنفيذية منظمة من 5 أقسام.',
      loadingTitle: 'جارٍ هندسة وتخطيط مشروعك البرمجي...',
      loading: 'تحليل المتطلبات، جدولة المراحل بالأسابيع، وحساب التكلفة التقديرية...',
      errIdea: 'من فضلك اكتب فكرة مشروعك أولاً.',
      errNetwork: 'تعذر الاتصال بخدمة الذكاء الاصطناعي. تحقق من اتصالك وحاول ثانية.',
      errConfig: 'خدمة الذكاء الاصطناعي غير متصلة.',
      errTimeout: 'استغرق الذكاء الاصطناعي وقتًا طويلاً. حاول مرة أخرى.',
      errGeneric: 'حدث خطأ أثناء إعداد الخطة. يرجى المحاولة مرة أخرى.',
      approveBtn: '✅ وافقت على الخطة — ابدأ على واتساب',
      askBtn: '❓ اسأل الذكاء الاصطناعي عن الخطة',
      regenBtn: '🔄 ولّد خطة جديدة',
      namePh: 'اسمك الكريم (اختياري)',
      contactPh: 'رقم واتساب أو إيميلك للتواصل',
      askPh: 'اسأل أي استفسار عن الخطة (مثلاً: ممكن نسرع الأسبوع الثاني؟)...',
      sendQuestion: 'إرسال السؤال',
      asking: 'جارٍ التفكير...',
      successMsg: 'تمت الموافقة على الخطة! جارٍ فتح واتساب للتواصل المباشر مع عبد الرحمن...',
      currSwitcherLabel: 'اختر عملة العرض:'
    }
  };

  function lang() {
    var l = document.documentElement.getAttribute('lang') || 'en';
    return (l === 'ar' || l === 'en') ? l : 'en';
  }

  function t(key) {
    var dict = STR[lang()] || STR.en;
    return dict[key] !== undefined ? dict[key] : (STR.en[key] || '');
  }

  function applyStrings() {
    document.querySelectorAll('[data-pf]').forEach(function (el) {
      var k = el.getAttribute('data-pf');
      if (k && STR[lang()] && STR[lang()][k]) {
        el.textContent = STR[lang()][k];
      }
    });

    if (ideaEl) ideaEl.placeholder = t('ideaPh');
    if (audEl) audEl.placeholder = t('audPh');
    if (featEl) featEl.placeholder = t('featPh');
    if (btn && !btn.disabled) {
      var span = btn.querySelector('span');
      if (span) span.textContent = t('generate');
      else btn.textContent = t('generate');
    }
  }

  window.__plannerI18n = applyStrings;
  applyStrings();

  function showState(which) {
    if (emptyEl) emptyEl.hidden = which !== 'empty';
    if (loadingEl) loadingEl.hidden = which !== 'loading';
    if (errorEl) errorEl.hidden = which !== 'error';
    if (bodyEl) bodyEl.hidden = which !== 'body';
    if (previewEl) previewEl.hidden = which !== 'preview';
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
    showState('error');
    setBusy(false);
  }

  function setBusy(on) {
    if (!btn) return;
    btn.disabled = on;
    var span = btn.querySelector('span');
    if (span) span.textContent = on ? t('generating') : t('generate');
  }

  // Chips toggle
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (other) {
        other.classList.remove('on');
        other.setAttribute('aria-pressed', 'false');
      });
      c.classList.add('on');
      c.setAttribute('aria-pressed', 'true');
    });
  });

  function platforms() {
    var sel = chips.find(function (c) { return c.classList.contains('on'); });
    return sel ? sel.getAttribute('data-v') : 'Mobile app (iOS & Android via Flutter)';
  }

  function buildUserMessage() {
    var isAr = lang() === 'ar';
    var L = [];
    var currency = (currEl && currEl.value) || 'USD';
    currentSelectedCurrency = currency;

    L.push(isAr ? 'فكرة المشروع:' : 'Project Idea:');
    L.push((ideaEl && ideaEl.value.trim()) || '');
    var aud = audEl && audEl.value.trim();
    if (aud) { L.push(isAr ? 'الجمهور المستهدف:' : 'Target Audience:'); L.push(aud); }
    L.push(isAr ? 'المنصة:' : 'Platform:');
    L.push(platforms());
    var feats = featEl && featEl.value.trim();
    if (feats) { L.push(isAr ? 'المميزات المطلوبة:' : 'Requested Features:'); L.push(feats); }
    L.push(isAr ? 'العملة المختارة للتسعير:' : 'Preferred Currency for Pricing:');
    L.push(currency + ' (' + (CURRENCY_RATES[currency] ? CURRENCY_RATES[currency].symbol : '$') + ')');
    if (deadlineEl && deadlineEl.value) {
      L.push(isAr ? 'الجدول الزمني المتوقع:' : 'Timeline Expectation:');
      L.push(deadlineEl.options[deadlineEl.selectedIndex].text);
    }
    L.push(isAr ? 'أخرج الخطة كاملة وفق الأقسام الخمسة المطلوبة فقط.' : 'Produce the full plan using strictly the 5 required sections.');
    return L.join('\n');
  }

  function callGeminiDirect(promptText, systemPromptText) {
    var key = window.PORTFOLIO_GEMINI_KEY;
    if (!key) return Promise.reject(new Error('No Gemini API key'));
    var model = window.PORTFOLIO_GEMINI_MODEL || 'gemini-3.5-flash-lite';
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key);

    var payload = {
      systemInstruction: { parts: [{ text: systemPromptText }] },
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 3200
      }
    };

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('Gemini API HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      var cand = data && data.candidates && data.candidates[0];
      if (cand && cand.content && cand.content.parts && cand.content.parts[0]) {
        var reply = cand.content.parts[0].text || '';
        if (reply.trim()) return reply.trim();
      }
      throw new Error('Empty Gemini response');
    });
  }

  function callAI(userText, onDelta) {
    var pricingContext = window.PRICING ? ('\n\nOfficial Pricing Source:\n' + JSON.stringify(window.PRICING)) : '';
    var isAr = lang() === 'ar';

    var systemPrompt = isAr
      ? 'أنت مستشار تقني أول متخصص في هندسة وتخطيط مشاريع تطبيقات الموبايل Flutter لموقع المهندس عبد الرحمن عبد الله. اكتب الخطة للعميل بأسلوب جذاب، مقنع، واحترافي يبعث على الثقة والأمان. نظّم الخطة بدقة شديدة في 5 أقسام مرقمة فقط (واحذف أي أقسام نظرية أو حشو لا يهم العميل):\n1) ملخص المشروع والقيمة الأساسية (حل المشكلة وميزة التطبيق)\n2) مميزات النسخة الأولى MVP ونطاق التسليم (الشاشات والتدفق المعماري بـ Flutter)\n3) مراحل التنفيذ والجدول الزمني الفعلي للتسليم (مهم جدًا: وضّح متى يستلم العميل مشروعه أسبوعيًا: الأسبوع 1 بروتوتايب فيجما تفاعلي، الأسبوع 2 نسخة تجريبية v0.1 على هاتفه، الأسبوع 3 نسخة كاملة v0.5، الأسبوع 4 النشر على Google Play و App Store وتسليم السورس كود مع ضمان 30 يومًا)\n4) التكلفة التقديرية وتفاصيل الميزانية (قدّم السعر المقدر بالعملة المحددة مع اسم الباقة الأنسب Starter أو Standard أو Pro ونظام الدفع على 3 دفعات + سطر أن السعر النهائي يؤكد بعد استشارة مجانية)\n5) تحسينات إضافية مقترحة وتوسعات مستقبلية (3 إلى 4 إضافات ذكية للمرحلة الثانية مثل الذكاء الاصطناعي، الإشعارات، الدفع المتعدد، التحليلات).' + pricingContext
      : 'You are a Senior Technical Consultant & Flutter Project Architect on the portfolio of Abdelrahman Abdullah. Write a convincing, highly professional, client-converting project plan. Organize the plan STRICTLY into 5 clear numbered sections (exclude theoretical fluff, assumptions, or open questions):\n1) Executive Blueprint & Core Value Proposition (Problem solved, USP, market edge)\n2) Core MVP Deliverables & Feature Scope (Specific screens, architecture, Flutter cross-platform advantages)\n3) Real Delivery Flow & Milestones Schedule (CRITICAL: Explicitly specify when the client receives deliverables: Week 1 Interactive Figma prototype walkthrough; Week 2 Test Build v0.1 on their device; Week 3 Staging Build v0.5; Week 4 Final QA, Google Play & Apple App Store submission, full source code handover & 30-day warranty)\n4) Investment Estimation & Budget Breakdown (Provide estimated budget in the selected currency, recommend the ideal tier Starter/Standard/Pro, and highlight 3-stage milestone payments + note that final quote is locked during free consult)\n5) Recommended Future Enhancements & Add-ons (3-4 high-value scalability ideas for Phase 2: AI capabilities, automated push campaigns, advanced analytics, payment gateways).' + pricingContext;

    var fullPrompt = userText;
    if (fullPrompt.indexOf('1)') === -1) {
      fullPrompt += '\n\n' + PREFILL[lang()] + PREFILL_NOTE[lang()];
    }

    if (!AI_ENDPOINT || AI_ENDPOINT.indexOf('YOUR-WORKER-NAME') !== -1) {
      return callGeminiDirect(fullPrompt, systemPrompt).then(function (txt) {
        if (onDelta) { try { onDelta(txt); } catch (e) {} }
        return txt;
      });
    }

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;

    var bodyObj = { 
      message: fullPrompt,
      systemPrompt: systemPrompt,
      conversationHistory: []
    };

    return fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('Worker HTTP ' + res.status);
      return res.json();
    }).then(function (j) {
      var msg = j && (j.message || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content));
      if (!msg) throw new Error('Empty Worker response');
      if (onDelta) { try { onDelta(msg); } catch (e) {} }
      return msg;
    }).catch(function (workerErr) {
      console.warn('[AI Worker error, falling back to direct Gemini]', workerErr);
      return callGeminiDirect(fullPrompt, systemPrompt).then(function (txt) {
        if (onDelta) { try { onDelta(txt); } catch (e) {} }
        return txt;
      });
    });
  }

  /* ---- Parse the 5 Sections ---- */
  function parseSections(text) {
    var lines = text.split(/\r?\n/);
    var secs = [];
    var cur = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = line.match(/^\s*(?:\*\*)?\s*(\d)\s*[).\-:]\s*\*?\*?\s*(\S.*)$/);
      if (m && +m[1] >= 1 && +m[1] <= 5) {
        if (cur) secs.push(cur);
        cur = { num: +m[1], title: m[2].replace(/\*+$/, '').trim(), body: [] };
      } else if (cur) {
        cur.body.push(line);
      }
    }
    if (cur) secs.push(cur);
    return secs;
  }

  /* ---- Dynamic Currency Converter Helper ---- */
  function getEstimatedAmounts(currency) {
    var cur = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
    var isAr = lang() === 'ar';
    var sym = cur.symbol;

    function fmt(val) {
      return (val >= 1000 ? val.toLocaleString() : val) + ' ' + sym;
    }

    return {
      starter: isAr ? (fmt(Math.round(150 * cur.rate)) + ' – ' + fmt(Math.round(350 * cur.rate))) : (sym + (150 * cur.rate).toLocaleString() + ' – ' + sym + (350 * cur.rate).toLocaleString()),
      standard: isAr ? (fmt(Math.round(450 * cur.rate)) + ' – ' + fmt(Math.round(950 * cur.rate))) : (sym + (450 * cur.rate).toLocaleString() + ' – ' + sym + (950 * cur.rate).toLocaleString()),
      pro: isAr ? (fmt(Math.round(1100 * cur.rate)) + ' – ' + fmt(Math.round(2500 * cur.rate))) : (sym + (1100 * cur.rate).toLocaleString() + ' – ' + sym + (2500 * cur.rate).toLocaleString())
    };
  }

  function updateBudgetCardAmounts(activeCurr) {
    currentSelectedCurrency = activeCurr;
    var est = getEstimatedAmounts(activeCurr);

    var starterEl = document.getElementById('price-tier-starter');
    var standardEl = document.getElementById('price-tier-standard');
    var proEl = document.getElementById('price-tier-pro');

    if (starterEl) starterEl.textContent = est.starter;
    if (standardEl) standardEl.textContent = est.standard;
    if (proEl) proEl.textContent = est.pro;

    document.querySelectorAll('.curr-pill').forEach(function (pill) {
      pill.classList.toggle('active', pill.getAttribute('data-c') === activeCurr);
    });
  }

  /* ---- Render Client-Facing Plan Cards ---- */
  function renderPlan(text) {
    if (!bodyEl) return;
    lastGeneratedPlan = text;
    bodyEl.textContent = '';

    var secs = parseSections(text);
    var isAr = lang() === 'ar';

    var wrap = document.createElement('div');
    wrap.className = 'pr-cards-wrap';

    var icons = {
      1: 'fa-bullseye',
      2: 'fa-layer-group',
      3: 'fa-stopwatch',
      4: 'fa-wallet',
      5: 'fa-rocket'
    };

    var badges = {
      1: isAr ? 'الرؤية والهدف' : 'Vision & Value',
      2: isAr ? 'نطاق النسخة الأولى' : 'MVP Scope',
      3: isAr ? 'المراحل والتسليم الفعلي' : 'Real Delivery Schedule',
      4: isAr ? 'الميزانية المعتمدة' : 'Investment & Pricing',
      5: isAr ? 'تحسينات إضافية' : 'Future Add-ons'
    };

    if (secs.length >= 3) {
      secs.forEach(function (s) {
        var card = document.createElement('div');
        card.className = 'client-plan-card';

        var iconClass = icons[s.num] || 'fa-check-circle';
        var badgeText = badges[s.num] || (isAr ? 'القسم ' + s.num : 'Section ' + s.num);
        var badgeColorClass = s.num === 3 ? 'badge-timeline' : (s.num === 4 ? 'badge-budget' : 'badge-highlight');

        var cardHeader = document.createElement('div');
        cardHeader.className = 'cpc-header';
        cardHeader.innerHTML = [
          '<div class="cpc-title">',
          '  <i class="fas ' + iconClass + '"></i>',
          '  <span>' + escapeHtml(s.title) + '</span>',
          '</div>',
          '<span class="cpc-badge ' + badgeColorClass + '">' + badgeText + '</span>'
        ].join('');
        card.appendChild(cardHeader);

        // Custom Visual Enhancement for Section 3: Timeline Flow
        if (s.num === 3) {
          var timelineBox = document.createElement('div');
          timelineBox.className = 'timeline-flow';
          timelineBox.innerHTML = isAr ? [
            '<div class="timeline-step-box">',
            '  <div class="tsb-week"><span>الأسبوع 1</span> <i class="fas fa-pencil-ruler"></i></div>',
            '  <div class="tsb-title">التصميم والبروتوتايب</div>',
            '  <div class="tsb-desc">واجهات Figma تفاعلية وهندسة البيانات.</div>',
            '  <div class="tsb-handover"><i class="fas fa-check"></i> تجربة واجهة حية</div>',
            '</div>',
            '<div class="timeline-step-box">',
            '  <div class="tsb-week"><span>الأسبوع 2</span> <i class="fas fa-code"></i></div>',
            '  <div class="tsb-title">تطوير واجهات Flutter</div>',
            '  <div class="tsb-desc">برمجة الشاشات وإدارة الحالة بالـ BLoC.</div>',
            '  <div class="tsb-handover"><i class="fas fa-mobile-alt"></i> استلام نسخة تجريبية v0.1</div>',
            '</div>',
            '<div class="timeline-step-box">',
            '  <div class="tsb-week"><span>الأسبوع 3</span> <i class="fas fa-database"></i></div>',
            '  <div class="tsb-title">الباك إند والربط</div>',
            '  <div class="tsb-desc">ربط Firebase أو REST API، الدفع، والإشعارات.</div>',
            '  <div class="tsb-handover"><i class="fas fa-cloud-upload-alt"></i> استلام نسخة v0.5</div>',
            '</div>',
            '<div class="timeline-step-box">',
            '  <div class="tsb-week"><span>الأسبوع 4</span> <i class="fas fa-rocket"></i></div>',
            '  <div class="tsb-title">الفحص والنشر</div>',
            '  <div class="tsb-desc">اختبار الأداء، نشر Google Play و App Store.</div>',
            '  <div class="tsb-handover"><i class="fas fa-award"></i> السورس كود + ضمان 30 يومًا</div>',
            '</div>'
          ].join('') : [
            '<div class="timeline-step-box">',
            '  <div class="tsb-week"><span>Week 1</span> <i class="fas fa-pencil-ruler"></i></div>',
            '  <div class="tsb-title">Discovery & UI/UX</div>',
            '  <div class="tsb-desc">Wireframing, Figma clickable prototype, architecture design.</div>',
            '  <div class="tsb-handover"><i class="fas fa-check"></i> Interactive Figma Prototype</div>',
            '</div>',
            '<div class="timeline-step-box">',
            '  <div class="tsb-week"><span>Week 2</span> <i class="fas fa-code"></i></div>',
            '  <div class="tsb-title">Flutter Frontend</div>',
            '  <div class="tsb-desc">Responsive screens, BLoC state management, local caching.</div>',
            '  <div class="tsb-handover"><i class="fas fa-mobile-alt"></i> Working Build v0.1</div>',
            '</div>',
            '<div class="timeline-step-box">',
            '  <div class="tsb-week"><span>Week 3</span> <i class="fas fa-database"></i></div>',
            '  <div class="tsb-title">Backend & APIs</div>',
            '  <div class="tsb-desc">Firebase/REST API integration, auth, push notifications.</div>',
            '  <div class="tsb-handover"><i class="fas fa-cloud-upload-alt"></i> Staging Build v0.5</div>',
            '</div>',
            '<div class="timeline-step-box">',
            '  <div class="tsb-week"><span>Week 4</span> <i class="fas fa-rocket"></i></div>',
            '  <div class="tsb-title">Release & Handover</div>',
            '  <div class="tsb-desc">QA testing, Google Play & App Store submission.</div>',
            '  <div class="tsb-handover"><i class="fas fa-award"></i> Full Source Code + 30-Day Warranty</div>',
            '</div>'
          ].join('');
          card.appendChild(timelineBox);
        }

        // Custom Visual Enhancement for Section 4: Dynamic Budget with Currency Switcher
        if (s.num === 4) {
          var initialEstimates = getEstimatedAmounts(currentSelectedCurrency);
          var currencyBar = document.createElement('div');
          currencyBar.className = 'currency-selector-bar';
          currencyBar.innerHTML = [
            '<div class="csb-label"><i class="fas fa-coins"></i> <span>' + t('currSwitcherLabel') + '</span></div>',
            '<div class="csb-pills">',
            '  <button type="button" class="curr-pill ' + (currentSelectedCurrency === 'USD' ? 'active' : '') + '" data-c="USD">🇺🇸 USD</button>',
            '  <button type="button" class="curr-pill ' + (currentSelectedCurrency === 'EGP' ? 'active' : '') + '" data-c="EGP">🇪🇬 EGP</button>',
            '  <button type="button" class="curr-pill ' + (currentSelectedCurrency === 'SAR' ? 'active' : '') + '" data-c="SAR">🇸🇦 SAR</button>',
            '  <button type="button" class="curr-pill ' + (currentSelectedCurrency === 'AED' ? 'active' : '') + '" data-c="AED">🇦🇪 AED</button>',
            '</div>'
          ].join('');
          card.appendChild(currencyBar);

          var budgetHighlight = document.createElement('div');
          budgetHighlight.className = 'budget-estimate-highlight';
          budgetHighlight.innerHTML = isAr ? [
            '<div class="beh-tier-card">',
            '  <div class="beh-tier-name">STARTER</div>',
            '  <div class="beh-price" id="price-tier-starter">' + initialEstimates.starter + '</div>',
            '  <div class="beh-desc">تطبيقات خفيفة وبسيطة، حتى 5 شاشات.</div>',
            '</div>',
            '<div class="beh-tier-card recommended">',
            '  <div class="beh-tier-name">⭐ STANDARD (الأكثر طلبًا)</div>',
            '  <div class="beh-price" id="price-tier-standard">' + initialEstimates.standard + '</div>',
            '  <div class="beh-desc">تطبيقات متكاملة، متجر أو لوحة تحكم، حتى 12 شاشة.</div>',
            '</div>',
            '<div class="beh-tier-card">',
            '  <div class="beh-tier-name">PRO (إطلاق كامل)</div>',
            '  <div class="beh-price" id="price-tier-pro">' + initialEstimates.pro + '</div>',
            '  <div class="beh-desc">تطبيق إنتاجي متقدم وشامل مع إطلاق المتجرين.</div>',
            '</div>'
          ].join('') : [
            '<div class="beh-tier-card">',
            '  <div class="beh-tier-name">STARTER</div>',
            '  <div class="beh-price" id="price-tier-starter">' + initialEstimates.starter + '</div>',
            '  <div class="beh-desc">Lean utility apps, up to 5 screens.</div>',
            '</div>',
            '<div class="beh-tier-card recommended">',
            '  <div class="beh-tier-name">⭐ STANDARD (Recommended)</div>',
            '  <div class="beh-price" id="price-tier-standard">' + initialEstimates.standard + '</div>',
            '  <div class="beh-desc">Complete e-commerce / service apps, up to 12 screens.</div>',
            '</div>',
            '<div class="beh-tier-card">',
            '  <div class="beh-tier-name">PRO (Full Launch)</div>',
            '  <div class="beh-price" id="price-tier-pro">' + initialEstimates.pro + '</div>',
            '  <div class="beh-desc">Full production app, unlimited screens, store deployment.</div>',
            '</div>'
          ].join('');
          card.appendChild(budgetHighlight);
        }

        // Custom Visual Enhancement for Section 5: Future Enhancements Grid
        if (s.num === 5) {
          var enhanceGrid = document.createElement('div');
          enhanceGrid.className = 'enhancements-grid';
          enhanceGrid.innerHTML = isAr ? [
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-brain"></i></div><div class="enhancement-text"><h5>ذكاء اصطناعي واقتراحات</h5><p>مساعد دردشة ذكي وترشيحات مخصصة للمستخدمين.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-bell"></i></div><div class="enhancement-text"><h5>حملات إشعارات ذكية</h5><p>إشعارات مبرمجة لزيادة التفاعل واسترجاع العملاء.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-credit-card"></i></div><div class="enhancement-text"><h5>بوابات دفع متعددة</h5><p>دعم Apple Pay، بطاقات بنكية، ومحافظ محلية.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-chart-line"></i></div><div class="enhancement-text"><h5>تحليلات سلوك الزوار</h5><p>تتبع دقيق لمسار الشراء ومعدلات التحويل.</p></div></div>'
          ].join('') : [
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-brain"></i></div><div class="enhancement-text"><h5>AI Smart Assistant</h5><p>In-app generative chatbot & personalized user recommendations.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-bell"></i></div><div class="enhancement-text"><h5>Automated Push Campaigns</h5><p>Segmented push notifications to drive user re-engagement.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-credit-card"></i></div><div class="enhancement-text"><h5>Multi-Currency Gateways</h5><p>Seamless Apple Pay, Google Pay, Stripe & local card gateways.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-chart-line"></i></div><div class="enhancement-text"><h5>Conversion Funnel Tracking</h5><p>Real-time telemetry and user retention behavioral metrics.</p></div></div>'
          ].join('');
          card.appendChild(enhanceGrid);
        }

        var contentText = document.createElement('div');
        contentText.className = 'cpc-content';
        contentText.setAttribute('dir', 'auto');
        contentText.textContent = s.body.join('\n').trim();
        card.appendChild(contentText);

        wrap.appendChild(card);
      });
    } else {
      var fallbackCard = document.createElement('div');
      fallbackCard.className = 'client-plan-card';
      var p = document.createElement('div');
      p.className = 'cpc-content';
      p.setAttribute('dir', 'auto');
      p.textContent = text.trim();
      fallbackCard.appendChild(p);
      wrap.appendChild(fallbackCard);
    }

    bodyEl.appendChild(wrap);

    // Event listener for live currency switcher pills inside the budget card
    bodyEl.querySelectorAll('.curr-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var c = pill.getAttribute('data-c');
        if (c) updateBudgetCardAmounts(c);
      });
    });

    // Action & Review Box (Handoff to Abdelrahman)
    var actionBox = document.createElement('div');
    actionBox.className = 'pr-review-box';
    actionBox.innerHTML = [
      '<div class="pr-contact-fields">',
      '  <div class="pr-field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">',
      '    <input type="text" id="pr-client-name" class="pf-input" style="padding:12px 16px;font-size:14px;" placeholder="' + t('namePh') + '">',
      '    <input type="text" id="pr-client-contact" class="pf-input" style="padding:12px 16px;font-size:14px;" placeholder="' + t('contactPh') + '">',
      '  </div>',
      '</div>',
      '<div class="pr-action-buttons">',
      '  <button type="button" id="pr-approve-btn"><i class="fab fa-whatsapp" style="font-size:18px;"></i> ' + t('approveBtn') + '</button>',
      '  <button type="button" id="pr-ask-btn"><i class="fas fa-question-circle"></i> ' + t('askBtn') + '</button>',
      '  <button type="button" id="pr-regen-btn"><i class="fas fa-sync-alt"></i> ' + t('regenBtn') + '</button>',
      '</div>',
      '<div id="pr-ask-panel" style="display:none;margin-top:18px;">',
      '  <div style="display:flex;gap:10px;">',
      '    <input type="text" id="pr-ask-input" class="pf-input" placeholder="' + t('askPh') + '" style="flex:1;">',
      '    <button type="button" id="pr-ask-submit-btn" class="btn-primary" style="white-space:nowrap;padding:12px 20px;">' + t('sendQuestion') + '</button>',
      '  </div>',
      '</div>',
      '<div id="pr-qa-stream" style="margin-top:14px;display:flex;flex-direction:column;gap:10px;"></div>',
      '<div id="pr-status-msg" style="display:none;margin-top:14px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;text-align:center;"></div>'
    ].join('\n');
    bodyEl.appendChild(actionBox);

    // Wire up buttons
    var approveBtn = document.getElementById('pr-approve-btn');
    var askBtn = document.getElementById('pr-ask-btn');
    var regenBtn = document.getElementById('pr-regen-btn');
    var askPanel = document.getElementById('pr-ask-panel');
    var askInput = document.getElementById('pr-ask-input');
    var askSubmitBtn = document.getElementById('pr-ask-submit-btn');
    var qaStream = document.getElementById('pr-qa-stream');
    var statusMsg = document.getElementById('pr-status-msg');

    if (regenBtn) {
      regenBtn.addEventListener('click', function () {
        showState('empty');
        if (form && form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (askBtn && askPanel) {
      askBtn.addEventListener('click', function () {
        var isHidden = askPanel.style.display === 'none';
        askPanel.style.display = isHidden ? 'block' : 'none';
        if (isHidden && askInput) askInput.focus();
      });
    }

    if (askSubmitBtn && askInput) {
      askSubmitBtn.addEventListener('click', function () {
        var qText = askInput.value.trim();
        if (!qText) return;
        askSubmitBtn.disabled = true;
        askSubmitBtn.textContent = t('asking');

        var qItem = document.createElement('div');
        qItem.className = 'pr-qa-item';
        qItem.style.background = 'rgba(168,85,247,0.06)';
        qItem.style.border = '1px solid rgba(168,85,247,0.2)';
        qItem.style.borderRadius = '12px';
        qItem.style.padding = '12px 16px';
        qItem.innerHTML = '<div style="font-weight:700;color:var(--neon);margin-bottom:4px;">Q: ' + escapeHtml(qText) + '</div><div class="pr-qa-ans" style="color:var(--text);font-size:13px;line-height:1.6;"><i class="fas fa-spinner fa-spin"></i> ' + t('asking') + '</div>';
        qaStream.appendChild(qItem);
        askInput.value = '';

        var askPrompt = isAr
          ? 'أجب العميل بأسلوب مهندس ومستشار فلاتر واثق ومقنع ومباشر وبنفس لغته:\n\n[خطة المشروع]:\n' + text + '\n\n[سؤال العميل]: ' + qText
          : 'Answer the client clearly and confidently as a senior Flutter architect:\n\n[Project Plan]:\n' + text + '\n\n[Client Question]: ' + qText;

        callAI(askPrompt, null).then(function (ans) {
          var ansEl = qItem.querySelector('.pr-qa-ans');
          if (ansEl) ansEl.textContent = ans;
        }).catch(function (err) {
          var ansEl = qItem.querySelector('.pr-qa-ans');
          if (ansEl) ansEl.textContent = isAr ? 'تعذر الرد مؤقتًا. يمكنك التواصل مع عبد الرحمن مباشرة عبر واتساب.' : 'Unable to answer temporarily. Please message Abdelrahman directly on WhatsApp.';
        }).finally(function () {
          askSubmitBtn.disabled = false;
          askSubmitBtn.textContent = t('sendQuestion');
        });
      });
    }

    if (approveBtn) {
      approveBtn.addEventListener('click', function () {
        var nameInput = document.getElementById('pr-client-name');
        var contactInput = document.getElementById('pr-client-contact');
        var clientName = (nameInput && nameInput.value.trim()) || (isAr ? 'عميل مهتم' : 'Interested Client');
        var clientContact = (contactInput && contactInput.value.trim()) || '';
        var userIdea = (ideaEl && ideaEl.value.trim()) || '';
        var curCode = currentSelectedCurrency || 'USD';

        var waMsg = isAr
          ? 'مرحبًا أستاذ عبد الرحمن 👋\nقرأت خطة المشروع المولدة بالذكاء الاصطناعي وأرغب في مناقشتها وبدء العمل!\n\n👤 الاسم: ' + clientName + (clientContact ? ' (' + clientContact + ')' : '') + '\n💡 فكرة التطبيق: ' + userIdea + '\n💱 العملة المفضلة: ' + curCode + '\n\nهل نستطيع تحديد موعد للاستشارة المجانية (15 دقيقة)؟'
          : 'Hello Abdelrahman 👋\nI reviewed my AI-generated project roadmap and would like to proceed with the free consultation to get started!\n\n👤 Name: ' + clientName + (clientContact ? ' (' + clientContact + ')' : '') + '\n💡 App Concept: ' + userIdea + '\n💱 Preferred Currency: ' + curCode + '\n\nCan we schedule our free 15-minute alignment call?';

        var waUrl = 'https://wa.me/201123031944?text=' + encodeURIComponent(waMsg);
        window.open(waUrl, '_blank', 'noopener');

        // Web3Forms backup notification if configured
        var web3Key = window.PORTFOLIO_WEB3FORMS_KEY;
        if (web3Key && web3Key !== 'ACCESS_KEY_HERE') {
          fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_key: web3Key,
              subject: '🤝 عميل وافق على خطة المشروع — ' + clientName,
              name: clientName,
              contact: clientContact,
              message: 'Idea: ' + userIdea + '\nCurrency: ' + curCode + '\n\nPlan Snippet:\n' + text.slice(0, 1500)
            })
          }).catch(function (e) { console.warn('[Web3Forms Planner Error]', e); });
        }

        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.style.background = 'rgba(16, 185, 129, 0.15)';
          statusMsg.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          statusMsg.style.color = '#34d399';
          statusMsg.innerHTML = '<i class="fas fa-check-circle"></i> ' + t('successMsg');
        }
      });
    }

    showState('body');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---- Submit Event ---- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn && btn.disabled) return;

    var idea = ideaEl ? ideaEl.value.trim() : '';
    if (!idea) {
      showError(t('errIdea'));
      if (ideaEl) ideaEl.focus();
      return;
    }
    if (idea.length > MAX_IDEA) idea = idea.slice(0, MAX_IDEA);

    if (errorEl) errorEl.hidden = true;
    showState('loading');
    setBusy(true);

    callAI(buildUserMessage(), function (partial) {
      if (previewEl && partial) {
        previewEl.textContent = partial;
        showState('preview');
      }
    }).then(function (reply) {
      renderPlan(reply);
    }).catch(function (err) {
      console.error('[AI Planner Error]', err);
      showError(t('errGeneric'));
    }).finally(function () {
      setBusy(false);
    });
  });

})();
