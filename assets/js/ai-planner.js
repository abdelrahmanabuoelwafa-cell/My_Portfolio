/* ============================================================
   AI Business Planner — High-Converting Client Roadmap & Estimator
   - Groq AI / Google Gemini via Cloudflare AI Worker & Direct Fallback
   - Structured 5-Section Client-Focused Output
   - Real Delivery Flow & Milestones Schedule (Actual delivery moments)
   - Dynamic Budget Estimation with Real-Time Currency Switcher (EGP, SAR, AED, USD)
   - Budget Tier Selection with Click-to-Approve
   - Dedicated Section for Future Enhancements (تحسينات إضافية)
   - English by default with full Arabic support
   ============================================================ */
(function () {
  'use strict';

  var AI_ENDPOINT = window.PORTFOLIO_AI_ENDPOINT || null;
  var TIMEOUT_MS = 32000;
  var MAX_IDEA = 2500;

  // The 5 High-Impact, Client-Converting Sections
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

  var currentSelectedCurrency = 'USD';
  window.__selectedTierId = 'standard';
  window.__selectedTierName = 'STANDARD';

  // DOM elements
  var form = document.getElementById('ai-planner-form');
  var ideaEl = document.getElementById('project-idea');
  var audienceEl = document.getElementById('target-audience');
  var platformEl = document.getElementById('platform-type');
  var featuresEl = document.getElementById('key-features');
  var currencyEl = document.getElementById('preferred-currency');
  var deadlineEl = document.getElementById('expected-deadline');
  var generateBtn = document.getElementById('btn-generate-plan');
  var genBtnText = document.getElementById('gen-btn-text');
  var genBtnIcon = document.getElementById('gen-btn-icon');
  var bodyEl = document.getElementById('pr-body');

  var emptyState = document.getElementById('pr-state-empty');
  var loadingState = document.getElementById('pr-state-loading');
  var errorState = document.getElementById('pr-state-error');

  var lastGeneratedPlan = '';

  function lang() {
    return document.documentElement.lang === 'ar' ? 'ar' : 'en';
  }

  // Localized UI strings
  var I18N = {
    en: {
      topBadge: 'Free Client-Facing Engineering Roadmap & Budget Plan',
      mainTitle: 'AI Software Project Blueprint & Cost Estimator',
      mainSubtitle: 'Turn your app vision into an actionable, executive development proposal with week-by-week delivery milestones and transparent budget estimates.',
      badge: 'Live AI Engine — Ready to structure delivery milestones and costs',
      ideaLabel: 'What are you building? *',
      ideaPh: 'e.g. A cross-platform telemedicine app connecting doctors with patients via video calls, real-time booking, chat, and secure payments...',
      audLabel: 'Target Audience & Market (Optional)',
      audPh: 'e.g. Healthcare clinics, patients in the MENA region, mobile-first users...',
      platLabel: 'Platform Scope',
      platUniversal: 'Cross-Platform (iOS, Android & Web)',
      featLabel: 'Key Features Needed (Optional)',
      featPh: 'e.g. Video consultations, appointment calendar, Apple Pay / Stripe, automated push reminders, bilingual AR/EN UI...',
      currLabel: 'Budget Estimation Currency',
      deadLabel: 'Delivery Target',
      deadFlexible: 'Flexible / Standard Pace (Recommended)',
      generateBtn: 'Generate Project Blueprint',
      generating: 'Architecting your proposal...',
      note: 'Preliminary engineering estimates. Final quote and timelines are guaranteed following a free 15-minute alignment call.',
      emptyTitle: 'Instant, Executive Software Roadmap',
      empty: 'Ready to turn your vision into an actionable proposal? Enter your concept above and our AI consultant will structure an executive 5-section roadmap.',
      loadingTitle: 'Architecting Your Software Roadmap...',
      loading: 'Analyzing feature scope, scheduling week-by-week delivery handoffs, and calculating transparent tier budgets in real time.',
      errConfig: 'AI planner service is temporarily unreachable.',
      errTimeout: 'AI generation timed out. Please try again.',
      errGeneric: 'Something went wrong while generating the roadmap. Please try again.',
      approveBtn: '✅ Approve Plan & Message on WhatsApp',
      askBtn: 'Ask AI About This Plan',
      regenBtn: 'Generate New Plan',
      namePh: 'Your Name (Optional)',
      contactPh: 'WhatsApp or Email for follow-up',
      askPh: 'Ask anything about architecture, milestones, or tech stack...',
      sendQuestion: 'Send Question',
      asking: 'Thinking...',
      successMsg: 'Roadmap approved! Opening WhatsApp to connect directly with Abdelrahman...',
      currSwitcherLabel: 'Switch Currency:',
      tierSelectHint: 'Click a package below to select it for approval',
      tierSelected: 'Selected'
    },
    ar: {
      topBadge: 'خطة عمل برمجية وميزانية تقديرية للعميل — مجانا',
      mainTitle: 'مخطط مشروعك البرمجي وتقدير التكلفة بالذكاء الاصطناعي',
      mainSubtitle: 'حوّل فكرة تطبيقك إلى خطة تنفيذ واضحة ومقنعة مع مراحل التسليم الفعلية وتقديرات دقيقة للميزانية تناسب ميزانيتك.',
      badge: 'محرك الذكاء الاصطناعي متصل — جاهز لتخطيط مراحل التنفيذ والميزانية',
      ideaLabel: 'ماذا تريد أن تبني؟ *',
      ideaPh: 'مثال: تطبيق استشارات طبية متكامل يربط الأطباء بالمرضى عبر مكالمات فيديو، حجز فوري، شات، ودفع إلكتروني...',
      audLabel: 'الجمهور المستهدف والسوق (اختياري)',
      audPh: 'مثال: عيادات طبية، متسوقون عبر الإنترنت، طلاب جامعات...',
      platLabel: 'المنصات المطلوبة',
      platUniversal: 'جميع المنصات (iOS و Android و الويب)',
      featLabel: 'أهم المميزات المطلوبة (اختياري)',
      featPh: 'مثال: تسجيل دخول، دفع إلكتروني، شات فوري، إشعارات، خرائط وتتبع، دعم واجهتين عربي وإنجليزي...',
      currLabel: 'عملة تقدير الميزانية',
      deadLabel: 'الموعد المستهدف للتسليم',
      deadFlexible: 'مرن / وتيرة قياسية (موصى بها)',
      generateBtn: 'إنشاء خطة المشروع والميزانية',
      generating: 'جاري هندسة خطة التنفيذ...',
      note: 'تقديرات تخطيطية أولية واضحة. يتم تحديد الموعد النهائي والتكلفة بدقة تامة بعد جلسة المحاذاة المجانية (15 دقيقة).',
      emptyTitle: 'خطة برمجية تنفيذية متكاملة',
      empty: 'جاهز لبناء خطة مشروعك البرمجي؟ اكتب فكرة مشروعك بالأعلى ليقوم مستشارك التقني بتنظيم خطة شاملة من 5 أقسام تنفيذية.',
      loadingTitle: 'جاري هندسة وتخطيط مشروعك البرمجي...',
      loading: 'تحليل المتطلبات، جدولة المراحل بالأسابيع، وحساب التكلفة التقديرية بالعملة المختارة فورًا.',
      errConfig: 'خدمة الذكاء الاصطناعي غير متصلة.',
      errTimeout: 'استغرق الذكاء الاصطناعي وقتا طويلا. حاول مرة أخرى.',
      errGeneric: 'حدث خطأ أثناء إعداد الخطة. يرجى المحاولة مرة أخرى.',
      approveBtn: 'وافقت على الخطة — ابدأ على واتساب',
      askBtn: 'اسأل الذكاء الاصطناعي عن الخطة',
      regenBtn: 'ولد خطة جديدة',
      namePh: 'اسمك الكريم (اختياري)',
      contactPh: 'رقم واتساب أو إيميلك للتواصل',
      askPh: 'اسأل أي استفسار عن الخطة، التقنيات، أو المواعيد...',
      sendQuestion: 'إرسال السؤال',
      asking: 'جاري التفكير...',
      successMsg: 'تمت الموافقة على الخطة! جاري فتح واتساب للتواصل المباشر مع عبد الرحمن...',
      currSwitcherLabel: 'اختر عملة العرض:',
      tierSelectHint: 'اضغط على الباقة لاختيارها وإرسالها للموافقة',
      tierSelected: 'تم الاختيار'
    }
  };

  function t(k) {
    var l = lang();
    return (I18N[l] && I18N[l][k]) || I18N.en[k] || '';
  }

  // Populate localized form labels on language toggle
  function syncFormText() {
    var isAr = lang() === 'ar';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.setAttribute('placeholder', val);
        } else {
          el.textContent = val;
        }
      }
    });

    if (currencyEl) {
      var curNames = {
        USD: isAr ? 'دولار USD' : 'USD ($)',
        EGP: isAr ? 'جنيه EGP' : 'EGP (ج.م)',
        SAR: isAr ? 'ريال SAR' : 'SAR (ر.س)',
        AED: isAr ? 'درهم AED' : 'AED (د.إ)'
      };
      Array.from(currencyEl.options).forEach(function (opt) {
        if (curNames[opt.value]) opt.textContent = curNames[opt.value];
      });
    }

    if (platformEl && platformEl.options.length) {
      platformEl.options[0].textContent = t('platUniversal');
    }
  }

  function showState(state) {
    if (emptyState) emptyState.style.display = state === 'empty' ? 'block' : 'none';
    if (loadingState) loadingState.style.display = state === 'loading' ? 'block' : 'none';
    if (errorState) errorState.style.display = state === 'error' ? 'block' : 'none';
    if (bodyEl) bodyEl.style.display = state === 'body' ? 'block' : 'none';
  }

  function setGenerating(isGen) {
    if (!generateBtn) return;
    generateBtn.disabled = isGen;
    if (genBtnText) genBtnText.textContent = isGen ? t('generating') : t('generateBtn');
    if (genBtnIcon) {
      genBtnIcon.className = isGen ? 'fas fa-spinner fa-spin' : 'fas fa-wand-magic-sparkles';
    }
  }

  // Parse output into the 5 client-focused sections
  function parseSections(text) {
    var sections = [];
    var regex = /(?:^|\n)(?:###?\s*)?(\d)[\)\.\-]\s*([^\n]+)/g;
    var matches = [];
    var m;

    while ((m = regex.exec(text)) !== null) {
      matches.push({
        num: parseInt(m[1], 10),
        title: m[2].trim(),
        index: m.index
      });
    }

    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].index + matches[i].title.length + 4;
      var end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      var body = text.substring(start, end).trim();

      sections.push({
        num: matches[i].num,
        title: matches[i].title,
        content: body
      });
    }

    if (!sections.length) {
      sections.push({
        num: 1,
        title: lang() === 'ar' ? 'ملخص خطة المشروع' : 'Project Blueprint',
        content: text
      });
    }

    return sections;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatMarkdown(text) {
    var safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
    safe = safe.replace(/^[\*\-]\s+(.*)$/gm, '<li>$1</li>');
    safe = safe.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    safe = safe.replace(/\n\n+/g, '</p><p>');
    safe = safe.replace(/\n/g, '<br>');
    return '<p>' + safe + '</p>';
  }

  function buildUserPrompt() {
    var idea = (ideaEl && ideaEl.value.trim()) || '';
    var aud = (audienceEl && audienceEl.value.trim()) || '';
    var plat = (platformEl && platformEl.value) || 'Cross-Platform (Flutter)';
    var feats = (featuresEl && featuresEl.value.trim()) || '';
    var curr = (currencyEl && currencyEl.value) || currentSelectedCurrency || 'USD';
    var dead = (deadlineEl && deadlineEl.value) || '4-6 Weeks';
    var isAr = lang() === 'ar';

    var L = [];
    L.push(isAr ? 'فكرة المشروع:' : 'Project Idea:');
    L.push(idea);
    L.push('');
    if (aud) { L.push(isAr ? 'الجمهور المستهدف:' : 'Target Audience:'); L.push(aud); }
    L.push(isAr ? 'المنصة:' : 'Platform:');
    L.push(plat);
    if (feats) { L.push(isAr ? 'المميزات المطلوبة:' : 'Requested Features:'); L.push(feats); }
    L.push(isAr ? 'العملة المختارة للتسعير:' : 'Preferred Currency:');
    L.push(curr + ' (' + (CURRENCY_RATES[curr] ? CURRENCY_RATES[curr].symbol : '$') + ')');
    L.push(isAr ? 'الجدول الزمني المتوقع:' : 'Timeline:');
    L.push(dead);
    L.push('');
    L.push(PREFILL[lang()] || PREFILL.en);
    L.push(PREFILL_NOTE[lang()] || PREFILL_NOTE.en);

    return L.join('\n');
  }

  function buildSystemPrompt() {
    var isAr = lang() === 'ar';
    return isAr
      ? 'أنت مستشار تقني أول لمشاريع Flutter على موقع المهندس عبد الرحمن عبد الله. اكتب باللغة العربية بأسلوب مقنع واحترافي يبعث على الثقة ويساعد العميل على اتخاذ قرار العمل فوراً.'
      : 'You are a Senior Technical Consultant & Flutter Project Architect on the portfolio of Abdelrahman Abdullah. Write in professional, reassuring English that helps the client confidently greenlight the project.';
  }

  // AI Backend Dispatch
  async function callAI(userPrompt, systemPrompt) {
    if (AI_ENDPOINT) {
      var ctl = new AbortController();
      var to = setTimeout(function () { ctl.abort(); }, TIMEOUT_MS);
      try {
        var res = await fetch(AI_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt || buildSystemPrompt() },
              { role: 'user', content: userPrompt }
            ]
          }),
          signal: ctl.signal
        });
        clearTimeout(to);
        if (!res.ok) throw new Error('Worker HTTP ' + res.status);
        var data = await res.json();
        var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || data.reply || data.text || '';
        if (reply) return reply;
      } catch (err) {
        clearTimeout(to);
        console.warn('[AI Planner] Cloudflare Worker failed, falling back:', err);
      }
    }

    // Direct Gemini fallback
    var gk = window.PORTFOLIO_GEMINI_KEY;
    if (gk && gk !== 'GEMINI_KEY_HERE') {
      var gmUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(gk);
      var gmRes = await fetch(gmUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: (systemPrompt ? systemPrompt + '\n\n' : '') + userPrompt }] }]
        })
      });
      if (gmRes.ok) {
        var gmData = await gmRes.json();
        var cand = gmData.candidates && gmData.candidates[0];
        var txt = cand && cand.content && cand.content.parts && cand.content.parts[0] && cand.content.parts[0].text;
        if (txt) return txt;
      }
    }

    throw new Error('No AI endpoint available.');
  }

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
      var c = pill.getAttribute('data-c') || pill.getAttribute('data-curr');
      pill.classList.toggle('active', c === activeCurr);
    });

    document.querySelectorAll('.currency-chip').forEach(function (chip) {
      var c = chip.getAttribute('data-curr') || chip.getAttribute('data-c');
      chip.classList.toggle('active', c === activeCurr);
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
      1: isAr ? 'الرؤية والهدف'            : 'Vision & Value',
      2: isAr ? 'نطاق النسخة الأولى'        : 'MVP Scope',
      3: isAr ? 'الجدول الفعلي للتسليم'     : 'Real Delivery Schedule',
      4: isAr ? 'التكلفة والتسعير'          : 'Investment & Pricing',
      5: isAr ? 'تحسينات المستقبل'          : 'Future Add-ons'
    };

    secs.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'client-plan-card section-' + s.num;

      var header = document.createElement('div');
      header.className = 'cpc-header';

      var iconWrap = document.createElement('div');
      iconWrap.className = 'cpc-icon-box';
      iconWrap.innerHTML = '<i class="fas ' + (icons[s.num] || 'fa-check') + '"></i>';

      var titleBox = document.createElement('div');
      titleBox.className = 'cpc-title-box';

      var badgeTxt = badges[s.num] || (isAr ? 'قسم ' + s.num : 'Section ' + s.num);
      titleBox.innerHTML = '<span class="cpc-badge">' + escapeHtml(badgeTxt) + '</span><h4 class="cpc-title">' + escapeHtml(s.title) + '</h4>';

      header.appendChild(iconWrap);
      header.appendChild(titleBox);
      card.appendChild(header);

      var content = document.createElement('div');
      content.className = 'cpc-content';
      content.innerHTML = formatMarkdown(s.content);
      card.appendChild(content);

      // Section 3: Delivery Timeline
      if (s.num === 3) {
        var timelineBox = document.createElement('div');
        timelineBox.className = 'delivery-timeline-highlight';
        timelineBox.innerHTML = isAr ? [
          '<div class="timeline-step-box"><div class="tsb-week"><span>الأسبوع 1</span> <i class="fas fa-pencil-ruler"></i></div><div class="tsb-title">تصميم وبروتوتايب Figma تفاعلي</div><div class="tsb-handoff">يستلم العميل: رابط Figma لاختبار الواجهات والتعديل عليها قبل أي سطر كود.</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>الأسبوع 2</span> <i class="fas fa-code"></i></div><div class="tsb-title">نسخة تجريبية أولية v0.1 على هاتفك</div><div class="tsb-handoff">يستلم العميل: ملف APK أو رابط TestFlight لتجربة التطبيق حيًا على هاتفه.</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>الأسبوع 3</span> <i class="fas fa-database"></i></div><div class="tsb-title">ربط السيرفر والبوابات v0.5</div><div class="tsb-handoff">يستلم العميل: تدفق المستخدمين والمدفوعات والإشعارات قيد العمل الفعلي.</div></div>',
          '<div class="timeline-step-box final-step"><div class="tsb-week"><span>الأسبوع 4</span> <i class="fas fa-rocket"></i></div><div class="tsb-title">نشر المتجرين وتسليم الكود والضمان</div><div class="tsb-handoff">يستلم العميل: إطلاق Google Play + App Store، السورس كود كاملاً، وضمان 30 يومًا.</div></div>'
        ].join('') : [
          '<div class="timeline-step-box"><div class="tsb-week"><span>Week 1</span> <i class="fas fa-pencil-ruler"></i></div><div class="tsb-title">Figma UI/UX Clickable Prototype</div><div class="tsb-handoff">Client receives: Interactive Figma link to review all screens and flows before coding.</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>Week 2</span> <i class="fas fa-code"></i></div><div class="tsb-title">Alpha Build v0.1 On Your Phone</div><div class="tsb-handoff">Client receives: Installable APK / TestFlight build to tap through live on device.</div></div>',
          '<div class="timeline-step-box"><div class="tsb-week"><span>Week 3</span> <i class="fas fa-database"></i></div><div class="tsb-title">Backend & Payment Integration v0.5</div><div class="tsb-handoff">Client receives: Full end-to-end user journeys with live data and push alerts.</div></div>',
          '<div class="timeline-step-box final-step"><div class="tsb-week"><span>Week 4</span> <i class="fas fa-rocket"></i></div><div class="tsb-title">Store Launch, Full Source & Warranty</div><div class="tsb-handoff">Client receives: App Store + Google Play launch, full clean code, 30-day warranty.</div></div>'
        ].join('');
        card.appendChild(timelineBox);
      }

      // Section 4: Budget Cards with Currency Switcher & Selectable Tiers
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

        var hintBar = document.createElement('div');
        hintBar.className = 'tier-select-hint';
        hintBar.innerHTML = '<i class="fas fa-hand-pointer"></i> <span>' + t('tierSelectHint') + '</span>';
        card.appendChild(hintBar);

        var budgetHighlight = document.createElement('div');
        budgetHighlight.className = 'budget-estimate-highlight';
        budgetHighlight.innerHTML = isAr ? [
          '<div class="beh-tier-card selectable-tier" data-tier-id="starter" data-tier-name="STARTER">',
          '  <div class="beh-tier-name">STARTER</div>',
          '  <div class="beh-price" id="price-tier-starter">' + initialEstimates.starter + '</div>',
          '  <div class="beh-desc">تطبيقات خفيفة وبسيطة، حتى 5 شاشات.</div>',
          '  <div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div>',
          '</div>',
          '<div class="beh-tier-card recommended selectable-tier tier-selected" data-tier-id="standard" data-tier-name="STANDARD">',
          '  <div class="beh-tier-name">⭐ STANDARD (الأكثر طلبًا)</div>',
          '  <div class="beh-price" id="price-tier-standard">' + initialEstimates.standard + '</div>',
          '  <div class="beh-desc">تطبيقات متكاملة، متجر أو لوحة تحكم، حتى 12 شاشة.</div>',
          '  <div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div>',
          '</div>',
          '<div class="beh-tier-card selectable-tier" data-tier-id="pro" data-tier-name="PRO">',
          '  <div class="beh-tier-name">PRO (إطلاق كامل)</div>',
          '  <div class="beh-price" id="price-tier-pro">' + initialEstimates.pro + '</div>',
          '  <div class="beh-desc">تطبيق إنتاجي متقدم وشامل مع إطلاق المتجرين.</div>',
          '  <div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div>',
          '</div>'
        ].join('') : [
          '<div class="beh-tier-card selectable-tier" data-tier-id="starter" data-tier-name="STARTER">',
          '  <div class="beh-tier-name">STARTER</div>',
          '  <div class="beh-price" id="price-tier-starter">' + initialEstimates.starter + '</div>',
          '  <div class="beh-desc">Lean utility apps, up to 5 screens.</div>',
          '  <div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div>',
          '</div>',
          '<div class="beh-tier-card recommended selectable-tier tier-selected" data-tier-id="standard" data-tier-name="STANDARD">',
          '  <div class="beh-tier-name">⭐ STANDARD (Recommended)</div>',
          '  <div class="beh-price" id="price-tier-standard">' + initialEstimates.standard + '</div>',
          '  <div class="beh-desc">Complete e-commerce / service apps, up to 12 screens.</div>',
          '  <div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div>',
          '</div>',
          '<div class="beh-tier-card selectable-tier" data-tier-id="pro" data-tier-name="PRO">',
          '  <div class="beh-tier-name">PRO (Full Launch)</div>',
          '  <div class="beh-price" id="price-tier-pro">' + initialEstimates.pro + '</div>',
          '  <div class="beh-desc">Full production app, unlimited screens, store deployment.</div>',
          '  <div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div>',
          '</div>'
        ].join('');
        card.appendChild(budgetHighlight);
      }

      // Section 5: Future Enhancements Grid
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
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-credit-card"></i></div><div class="enhancement-text"><h5>Multi-Gateway Payments</h5><p>Apple Pay, Google Pay, local cards, and installment gateways.</p></div></div>',
          '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-chart-line"></i></div><div class="enhancement-text"><h5>Behavioral Analytics</h5><p>Funnel tracking, retention heatmaps, and conversion insights.</p></div></div>'
        ].join('');
        card.appendChild(enhanceGrid);
      }

      wrap.appendChild(card);
    });

    // Review & Approval Workflow
    var reviewBox = document.createElement('div');
    reviewBox.className = 'pr-review-box';
    reviewBox.innerHTML = [
      '<div class="pr-review-actions">',
      '  <div class="pr-contact-inputs">',
      '    <input type="text" id="pr-client-name" placeholder="' + t('namePh') + '">',
      '    <input type="text" id="pr-client-contact" placeholder="' + t('contactPh') + '">',
      '  </div>',
      '  <button type="button" id="pr-approve-btn"><i class="fab fa-whatsapp" style="font-size:18px;"></i> ' + t('approveBtn') + '</button>',
      '  <div class="pr-secondary-actions">',
      '    <button type="button" id="pr-ask-btn"><i class="fas fa-question-circle"></i> ' + t('askBtn') + '</button>',
      '    <button type="button" id="pr-regen-btn"><i class="fas fa-redo"></i> ' + t('regenBtn') + '</button>',
      '  </div>',
      '</div>',
      '<div id="pr-status-msg" style="display:none;padding:12px 16px;border-radius:12px;margin-top:12px;font-size:14px;font-weight:600;"></div>',
      '<div class="pr-ask-panel" id="pr-ask-panel" style="display:none;margin-top:16px;">',
      '  <div style="display:flex;gap:8px;">',
      '    <input type="text" id="pr-ask-input" placeholder="' + t('askPh') + '" style="flex:1;">',
      '    <button type="button" id="pr-ask-submit-btn" class="btn-primary" style="padding:10px 18px;">' + t('sendQuestion') + '</button>',
      '  </div>',
      '  <div class="pr-qa-stream" id="pr-qa-stream" style="margin-top:12px;display:flex;flex-direction:column;gap:8px;"></div>',
      '</div>'
    ].join('');

    bodyEl.appendChild(wrap);
    bodyEl.appendChild(reviewBox);
    showState('body');

    // Attach currency switcher listeners
    bodyEl.querySelectorAll('.curr-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var c = pill.getAttribute('data-c');
        if (c && CURRENCY_RATES[c]) {
          updateBudgetCardAmounts(c);
        }
      });
    });

    // Attach tier selection listeners
    bodyEl.querySelectorAll('.selectable-tier').forEach(function (card) {
      card.addEventListener('click', function () {
        bodyEl.querySelectorAll('.selectable-tier').forEach(function (t) {
          t.classList.remove('tier-selected');
        });
        card.classList.add('tier-selected');
        window.__selectedTierId = card.getAttribute('data-tier-id') || 'standard';
        window.__selectedTierName = card.getAttribute('data-tier-name') || 'STANDARD';
      });
    });

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
        var curSym = (CURRENCY_RATES[curCode] && CURRENCY_RATES[curCode].symbol) || '$';
        var plat = (platformEl && platformEl.value) || 'Cross-Platform (Flutter)';
        var deadline = (deadlineEl && deadlineEl.value) || '4-6 Weeks';

        var est = getEstimatedAmounts(curCode);
        var tierId = window.__selectedTierId || 'standard';
        var tierPrice = (tierId === 'starter') ? est.starter : ((tierId === 'pro') ? est.pro : est.standard);
        var tierName = (window.__selectedTierName || 'STANDARD').toUpperCase();

        var sep = '\n──────────────────\n';
        var waMsg = isAr
          ? [
            '✅ موافقة على خطة المشروع بالذكاء الاصطناعي', sep,
            '👤 الاسم: ' + clientName + (clientContact ? ' | ' + clientContact : ''),
            '💡 فكرة التطبيق: ' + userIdea,
            '📱 المنصة: ' + plat,
            '📦 الباقة المختارة: ' + tierName + ' (' + tierPrice + ')',
            '🪙 العملة: ' + curCode + ' (' + curSym + ')',
            '⏱️ الجدول الزمني: ' + deadline, sep,
            '📌 مراحل التسليم المتفق عليها:',
            '  الأسبوع 1: بروتوتايب Figma تفاعلي',
            '  الأسبوع 2: نسخة تجريبية v0.1 على هاتفي',
            '  الأسبوع 3: نسخة مكتملة v0.5',
            '  الأسبوع 4: نشر على المتجرين + سورس كود + ضمان 30 يومًا', sep,
            'أرجو جدولة استشارة مجانية (15 دقيقة) لتأكيد التفاصيل النهائية والبدء! 🚀'
          ].join('\n')
          : [
            '✅ AI Project Blueprint Approved', sep,
            '👤 Name: ' + clientName + (clientContact ? ' | ' + clientContact : ''),
            '💡 Concept: ' + userIdea,
            '📱 Platform: ' + plat,
            '📦 Selected Package: ' + tierName + ' (' + tierPrice + ')',
            '🪙 Currency: ' + curCode + ' (' + curSym + ')',
            '⏱️ Target Timeline: ' + deadline, sep,
            '📌 Agreed Delivery Milestones:',
            '  Week 1: Interactive Figma Prototype',
            '  Week 2: Testable Build v0.1 on my phone',
            '  Week 3: Core Features & Backend Sync v0.5',
            '  Week 4: Store Launch + Full Source Code + 30-Day Warranty', sep,
            'Let\'s schedule our free 15-minute alignment call to confirm details and launch! 🚀'
          ].join('\n');

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
              message: 'Idea: ' + userIdea + '\nTier: ' + tierName + ' (' + tierPrice + ')\nCurrency: ' + curCode + '\n\nPlan Snippet:\n' + text.slice(0, 1500)
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

    if (wrap.scrollIntoView) {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Handle Form Submission
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var idea = (ideaEl && ideaEl.value.trim()) || '';
    if (!idea) {
      if (ideaEl) ideaEl.focus();
      return;
    }

    if (currencyEl) {
      currentSelectedCurrency = currencyEl.value || 'USD';
    }

    setGenerating(true);
    showState('loading');

    try {
      var prompt = buildUserPrompt();
      var plan = await callAI(prompt, buildSystemPrompt());
      renderPlan(plan);
    } catch (err) {
      console.error('[AI Planner Error]', err);
      showState('error');
    } finally {
      setGenerating(false);
    }
  }

  // Wire up Top Form Currency Chips
  function attachTopFormCurrencyChips() {
    document.querySelectorAll('.currency-chip').forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        e.preventDefault();
        var c = chip.getAttribute('data-curr') || chip.getAttribute('data-c');
        if (c && CURRENCY_RATES[c]) {
          currentSelectedCurrency = c;
          if (currencyEl) currencyEl.value = c;
          document.querySelectorAll('.currency-chip').forEach(function (ch) {
            var chCode = ch.getAttribute('data-curr') || ch.getAttribute('data-c');
            ch.classList.toggle('active', chCode === c);
          });
          updateBudgetCardAmounts(c);
        }
      });
    });

    if (currencyEl) {
      currencyEl.addEventListener('change', function () {
        var c = currencyEl.value;
        if (c && CURRENCY_RATES[c]) {
          currentSelectedCurrency = c;
          document.querySelectorAll('.currency-chip').forEach(function (ch) {
            var chCode = ch.getAttribute('data-curr') || ch.getAttribute('data-c');
            ch.classList.toggle('active', chCode === c);
          });
          updateBudgetCardAmounts(c);
        }
      });
    }
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', function () {
    syncFormText();
    attachTopFormCurrencyChips();

    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    var langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.addEventListener('click', function () {
        setTimeout(function () {
          syncFormText();
          if (lastGeneratedPlan) renderPlan(lastGeneratedPlan);
        }, 80);
      });
    }

    window.__plannerI18n = function () {
      syncFormText();
      if (lastGeneratedPlan) renderPlan(lastGeneratedPlan);
    };
  });
})();
