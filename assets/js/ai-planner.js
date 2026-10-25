/* ============================================================
   AI Business Planner — premium guided brief (bilingual)
  - Groq AI (llama-3.3-70b) via local backend server (API key protected)
   - Guided form -> structured 9-section project plan
   - Follows the site language (ar/en) with RTL/LTR support
   - Safe rendering: textContent only (no innerHTML -> no XSS)
   ============================================================ */
(function () {
  'use strict';

  // Cloudflare AI Worker backend (production & development)
  var AI_ENDPOINT = window.PORTFOLIO_AI_ENDPOINT || null;
  var TIMEOUT_MS = 30000;
  var MAX_IDEA = 2500;
  var PREFILL = {
    ar: '1) ملخص المشروع\n2) المشكلة والحل\n3) المستخدمون المستهدفون\n4) مميزات النسخة الأولية MVP\n5) مميزات مستقبلية\n6) التقنيات المقترحة مع سبب الاختيار\n7) مراحل التنفيذ والجدول الزمني\n8) المخاطر والافتراضات والأسئلة المفتوحة\n9) الخطوات التالية\n',
    en: '1) Project summary\n2) Problem & solution\n3) Target users\n4) Core MVP features\n5) Potential future features\n6) Suggested technology stack with reasons\n7) Development phases & rough timeline\n8) Risks, assumptions & open questions\n9) Recommended next steps\n'
  };
  var PREFILL_NOTE = {
    ar: '\nالعناوين التالية مكتوبة مسبقًا — اكتب فقط محتوى كل قسم أسفل عنوانه مباشرة، ولا تكرر العناوين ولا تضف مقدمات.',
    en: '\nThe section headers below are already written — output ONLY each section content directly under its header; do not repeat headers and do not add preambles.'
  };

  var form = document.getElementById('planner-form');
  if (!form) return;

  var ideaEl = document.getElementById('planner-idea');
  var audEl = document.getElementById('planner-audience');
  var featEl = document.getElementById('planner-features');
  var budgetEl = document.getElementById('planner-budget');
  var deadlineEl = document.getElementById('planner-deadline');
  var btn = document.getElementById('planner-btn');
  var emptyEl = document.getElementById('planner-empty');
  var loadingEl = document.getElementById('planner-loading');
  var errorEl = document.getElementById('planner-error');
  var bodyEl = document.getElementById('planner-body');
  var chips = Array.prototype.slice.call(document.querySelectorAll('#planner-platform .pf-chip'));

  var STR = {
    en: {
      badge: 'AI-assisted planning — free, no sign-up',
      ideaLabel: 'Project idea',
      ideaPh: 'Describe your app or business idea in a few sentences...',
      audLabel: 'Target audience (optional)',
      audPh: 'e.g. medical clinics, university students, local shops...',
      platLabel: 'Platform (optional)',
      platMobile: 'Mobile',
      platWeb: 'Web',
      platDesktop: 'Desktop',
      platUnsure: 'Not sure',
      featLabel: 'Key features (optional)',
      featPh: 'e.g. login, appointments, payments, notifications...',
      budgetLabel: 'Budget range (optional)',
      optUnknown: 'Prefer not to say',
      optSmall: 'Small',
      optMedium: 'Medium',
      optLarge: 'Large',
      deadlineLabel: 'Timeline (optional)',
      dlFlexible: 'Flexible',
      dlSoon: '1–2 months',
      dlSoon2: '3–4 months',
      dlUrgent: 'ASAP',
      generate: 'Generate plan',
      generating: 'Generating...',
      note: 'Estimates are preliminary planning guidance, not guarantees.',
      empty: 'Fill in your idea (other fields optional) and generate a structured plan here.',
      loading: 'Analyzing your brief and building the plan...',
      errIdea: 'Please describe your project idea first.',
      errNetwork: 'Could not reach the AI service. Check your connection and try again.',
      errConfig: 'AI service endpoint is not configured. Please check site-config.js.',
      errTimeout: 'The AI took too long to respond. Please try again.',
      errGeneric: 'Something went wrong while generating the plan. Please try again.',
      errCancelled: 'Request cancelled because the language was switched.',
      sectionFallback: 'Plan',
      approveBtn: '✅ Approved — Send plan to Abdelrahman',
      askBtn: '❓ Ask about the plan',
      regenBtn: '🔄 Generate another plan',
      namePh: 'Your name (optional)',
      contactPh: 'WhatsApp or Email for follow-up',
      askPh: 'Ask any question about this plan...',
      sendQuestion: 'Send question',
      asking: 'Thinking...',
      successMsg: 'Plan sent successfully to Abdelrahman! He will reach out to you soon 🚀',
      web3Disabled: 'Direct email submission is not active. Connect with Abdelrahman on WhatsApp:',
      cineH1: 'MOBILE',
      cineH2: 'DESIGN',
      cineH3: 'BUILD',
      cineH4: 'PLAN'
    },
    ar: {
      badge: 'تخطيط بمساعدة الذكاء الاصطناعي — مجاني وبلا تسجيل',
      ideaLabel: 'فكرة المشروع',
      ideaPh: 'اوصف تطبيقك أو فكرة مشروعك في بضع جمل...',
      audLabel: 'الجمهور المستهدف (اختياري)',
      audPh: 'مثال: عيادات طبية، طلاب جامعات، متاجر محلية...',
      platLabel: 'المنصة (اختياري)',
      platMobile: 'موبايل',
      platWeb: 'ويب',
      platDesktop: 'سطح مكتب',
      platUnsure: 'لست متأكدًا',
      featLabel: 'المميزات الأساسية (اختياري)',
      featPh: 'مثال: تسجيل دخول، مواعيد، دفع، إشعارات...',
      budgetLabel: 'نطاق الميزانية (اختياري)',
      optUnknown: 'أفضل عدم الذكر',
      optSmall: 'صغيرة',
      optMedium: 'متوسطة',
      optLarge: 'كبيرة',
      deadlineLabel: 'الجدول الزمني (اختياري)',
      dlFlexible: 'مرن',
      dlSoon: 'شهر إلى شهرين',
      dlSoon2: '3 إلى 4 أشهر',
      dlUrgent: 'في أقرب وقت',
      generate: 'أنشئ الخطة',
      generating: 'جارٍ التوليد...',
      note: 'التقديرات إرشادية أولية وليست ضمانات.',
      empty: 'اكتب فكرتك (والحقول الأخرى اختيارية) لتوليد خطة مشروع منظمة هنا.',
      loading: 'جارٍ تحليل طلبك وبناء الخطة...',
      errIdea: 'من فضلك اكتب فكرة مشروعك أولًا.',
      errNetwork: 'تعذر الوصول لخدمة الذكاء الاصطناعي. تحقق من اتصالك وحاول مجددًا.',
      errConfig: 'خدمة الذكاء الاصطناعي غير متصلة. يرجى مراجعة إعدادات الموقع في site-config.js.',
      errTimeout: 'استغرق الذكاء الاصطناعي وقتًا طويلاً. حاول مرة أخرى.',
      errGeneric: 'حدث خطأ أثناء إنشاء الخطة. حاول مرة أخرى.',
      errCancelled: 'تم إلغاء الطلب بسبب تبديل اللغة.',
      sectionFallback: 'الخطة',
      approveBtn: '✅ وافقت — ابعت الخطة لعبد الرحمن',
      askBtn: '❓ اسأل عن الخطة',
      regenBtn: '🔄 ولّد خطة تانية',
      namePh: 'اسمك (اختياري)',
      contactPh: 'واتساب أو إيميلك للتواصل',
      askPh: 'اسأل أي سؤال عن الخطة (مثلاً: ممكن نبسط النقطة 4؟)...',
      sendQuestion: 'إرسال السؤال',
      asking: 'جارٍ الرد...',
      successMsg: 'وصلت الخطة لعبد الرحمن — هو هيتواصل معاك قريب 🚀',
      web3Disabled: 'إرسال الإيميل مش مفعّل حاليًا — كلّمني على واتساب مباشرة 👇',
      cineH1: 'موبايل',
      cineH2: 'تصميم',
      cineH3: 'تنفيذ',
      cineH4: 'تخطيط'
    }
  };

  function lang() { return document.documentElement.lang === 'ar' ? 'ar' : 'en'; }
  function t(key) { var s = STR[lang()]; return (s && s[key] != null) ? s[key] : STR.en[key]; }

  var currentAbort = null;
  var cancelledByLang = false;

  /* ---- i18n: apply strings to all [data-pf] nodes + controls ---- */
  function applyStrings() {
    if (currentAbort) {
      cancelledByLang = true;
      try { currentAbort.abort(); } catch (e) {}
    }
    var L = STR[lang()];
    document.querySelectorAll('[data-pf]').forEach(function (el) {
      var k = el.getAttribute('data-pf');
      if (L[k] != null) el.textContent = L[k];
    });
    if (ideaEl) ideaEl.placeholder = t('ideaPh');
    if (audEl) audEl.placeholder = t('audPh');
    if (featEl) featEl.placeholder = t('featPh');
    if (btn && !btn.disabled) btn.textContent = t('generate');
    if (bodyEl) bodyEl.setAttribute('dir', 'auto');
    document.querySelectorAll('#planner-result .pr-sec-text').forEach(function (el) { el.setAttribute('dir', 'auto'); });
  }
  window.__plannerI18n = applyStrings;

  /* ---- states ---- */
  function showState(which) {
    if (emptyEl) emptyEl.hidden = which !== 'empty';
    if (loadingEl) loadingEl.hidden = which !== 'loading';
    if (errorEl) errorEl.hidden = which !== 'error';
    if (bodyEl) bodyEl.hidden = which !== 'body';
    var pv = document.getElementById('planner-preview');
    if (pv && which !== 'loading') pv.hidden = true;
  }
  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    showState('error');
  }
  var elapsedTimer = null;
  function setBusy(on) {
    if (btn) {
      btn.disabled = on;
      btn.textContent = on ? t('generating') : t('generate');
    }
    var loadEl = document.getElementById('planner-loading');
    if (on) {
      if (loadEl && !document.getElementById('planner-elapsed')) {
        var sp = document.createElement('span');
        sp.id = 'planner-elapsed';
        sp.style.cssText = 'font-variant-numeric:tabular-nums;opacity:.85;margin-inline-start:6px;';
        loadEl.appendChild(sp);
      }
      var t0 = Date.now();
      if (elapsedTimer) clearInterval(elapsedTimer);
      elapsedTimer = setInterval(function () {
        var sp2 = document.getElementById('planner-elapsed');
        if (sp2) sp2.textContent = Math.round((Date.now() - t0) / 1000) + 's';
      }, 500);
    } else if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
      if (loadEl) {
        var sp3 = document.getElementById('planner-elapsed');
        if (sp3 && sp3.parentNode) sp3.parentNode.removeChild(sp3);
      }
    }
  }

  /* ---- platform chips (toggle) ---- */
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      c.classList.toggle('on');
      c.setAttribute('aria-pressed', c.classList.contains('on') ? 'true' : 'false');
    });
  });
  function platforms() {
    return chips.filter(function (c) { return c.classList.contains('on'); })
      .map(function (c) { return c.getAttribute('data-v'); }).join(', ');
  }

  /* ---- AI ---- */
  function buildUserMessage() {
    var isAr = lang() === 'ar';
    var L = [];
    L.push(isAr ? 'فكرة المشروع:' : 'Project idea:');
    L.push((ideaEl && ideaEl.value.trim()) || '');
    var aud = audEl && audEl.value.trim();
    if (aud) { L.push(isAr ? 'الجمهور المستهدف:' : 'Target audience:'); L.push(aud); }
    var plat = platforms();
    if (plat) { L.push(isAr ? 'المنصة:' : 'Platform:'); L.push(plat); }
    var feats = featEl && featEl.value.trim();
    if (feats) { L.push(isAr ? 'مميزات مطلوبة:' : 'Requested features:'); L.push(feats); }
    if (budgetEl && budgetEl.value) { L.push(isAr ? 'الميزانية:' : 'Budget:'); L.push(budgetEl.options[budgetEl.selectedIndex].text); }
    if (deadlineEl && deadlineEl.value) { L.push(isAr ? 'الجدول الزمني:' : 'Timeline:'); L.push(deadlineEl.options[deadlineEl.selectedIndex].text); }
    L.push(isAr ? 'أنشئ خطة العمل كاملة حسب الأقسام المطلوبة.' : 'Produce the full plan using the required sections.');
    return L.join('\n');
  }

  function callAI(userText, onDelta) {
    if (!AI_ENDPOINT) {
      showError(lang() === 'ar' ? 'نقطة نهاية الذكاء الاصطناعي غير متصلة. يرجى مراجعة إعدادات الموقع.' : 'AI endpoint is not configured. Please check site configuration.');
      setBusy(false);
      return Promise.reject(new Error('AI endpoint not configured'));
    }

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    currentAbort = ctrl;
    function clear() { if (timer) clearTimeout(timer); currentAbort = null; }

    function delay(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function run(withPrefill, effort, maxTok, retry429Count) {
      var prompt = userText;
      if (withPrefill) prompt += '\n\n' + PREFILL[lang()] + PREFILL_NOTE[lang()];
      var pricingContext = window.PRICING ? ('\n\nOfficial Pricing Context:\n' + JSON.stringify(window.PRICING)) : '';
      var systemPrompt = lang() === 'ar' 
        ? 'أنت مساعد ذكاء اصطناعي متخصص في تخطيط مشاريع تطوير التطبيقات لموقع عبد الرحمن عبد الله. اكتب الخطة بنفس لغة العميل ولهجته: لو فكرة المشروع مكتوبة بالمصري، اكتب الخطة كاملة بالمصري؛ لو بالإنجليزي اكتبها بالإنجليزي؛ لو مش واضح، اكتب بالعربية الفصحى. نظّم الخطة بدقة في تسعة أقسام. لو فكرة العميل تطبيق موبايل Flutter، اختم الخطة بقسم التكلفة التقديرية يرشّح الباقة الأنسب من بيانات الأسعار الرسمية (بالاسم والمدى السعري فقط) + سطر إن السعر النهائي بعد استشارة مجانية.' + pricingContext
        : 'You are an AI assistant specialized in app development project planning for Abdelrahman Abdullah. Write the plan in the SAME language and dialect the client wrote their idea in; Egyptian Arabic stays Egyptian Arabic. Keep it detailed, structured in 9 sections, and concise. If the idea is a Flutter mobile app, conclude with an estimated budget section recommending the most suitable tier from the official pricing plans (name and price range only) + note that final pricing is set after a free consultation.' + pricingContext;
      var bodyObj = { 
        message: prompt,
        systemPrompt: systemPrompt,
        conversationHistory: []
      };

      return fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        if (res.status === 429 && retry429Count < 2) {
          return delay(10000).then(function () { return run(withPrefill, effort, maxTok, retry429Count + 1); });
        }
        if (!res.ok) {
          if (withPrefill && res.status >= 400 && res.status < 500) return null;
          throw new Error('HTTP ' + res.status);
        }
        return res.json().then(function (j) {
          // Backend returns { message: "...", conversationHistory: [...] } or { error: "..." }
          if (j.error) throw new Error(j.error);
          var content = j.message || '';
          if (typeof content !== 'string' || !content.trim()) throw new Error('bad-format');
          if (onDelta) { try { onDelta(content); } catch (e) {} }
          return content;
        });
      }).then(function (txt) {
        if (txt === null) return attemptNext();
        txt = (txt || '').trim();
        if (txt) return txt;
        return attemptNext();
      });
    }

    var rung = 0;
    function attemptNext() {
      rung++;
      if (rung === 1) return run(false, 'minimal', 6000, 0);
      if (rung === 2) return run(false, null, null, 0);
      throw new Error('bad-format');
    }

    /* Gemini proxy uses a server-owned system prompt; retry once without optional section prefill. */
    return run(true, null, null, 0).then(function (txt) {
      clear();
      return txt;
    }, function (err) {
      clear();
      throw err;
    });
  }

  /* ---- structured rendering (textContent only) ---- */
  function parseSections(text) {
    var lines = text.split(/\r?\n/);
    var secs = [];
    var cur = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = line.match(/^\s*(?:\*\*)?\s*(\d)\s*[).\-:]\s*\*?\*?\s*(\S.*)$/);
      if (m && +m[1] >= 1 && +m[1] <= 9) {
        if (cur) secs.push(cur);
        cur = { title: m[2].replace(/\*+$/, '').trim(), body: [] };
      } else if (cur) {
        cur.body.push(line);
      }
    }
    if (cur) secs.push(cur);
    return secs;
  }

  var lastGeneratedPlan = '';

  function renderPlan(text) {
    if (!bodyEl) return;
    lastGeneratedPlan = text;
    bodyEl.textContent = '';
    var secs = parseSections(text);
    if (secs.length >= 3) {
      secs.forEach(function (s) {
        var wrap = document.createElement('div');
        wrap.className = 'pr-section';
        var h = document.createElement('div');
        h.className = 'pr-sec-title';
        h.textContent = s.title;
        var p = document.createElement('div');
        p.className = 'pr-sec-text';
        p.setAttribute('dir', 'auto');
        p.textContent = s.body.join('\n').trim();
        wrap.appendChild(h);
        wrap.appendChild(p);
        bodyEl.appendChild(wrap);
      });
    } else {
      var p = document.createElement('div');
      p.className = 'pr-sec-text';
      p.setAttribute('dir', 'auto');
      p.textContent = text.trim();
      bodyEl.appendChild(p);
    }

    // Phase 7: Approval & Review Action Box
    var actionBox = document.createElement('div');
    actionBox.className = 'pr-review-box';
    actionBox.innerHTML = [
      '<div class="pr-contact-fields">',
      '  <div class="pr-field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">',
      '    <input type="text" id="pr-client-name" class="pf-input" style="padding:10px 14px;font-size:13px;" placeholder="' + t('namePh') + '">',
      '    <input type="text" id="pr-client-contact" class="pf-input" style="padding:10px 14px;font-size:13px;" placeholder="' + t('contactPh') + '">',
      '  </div>',
      '</div>',
      '<div class="pr-action-buttons" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">',
      '  <button type="button" id="pr-approve-btn" class="btn-primary" style="background:linear-gradient(135deg,#10b981,#059669);border:none;cursor:pointer;padding:12px 22px;font-weight:700;">' + t('approveBtn') + '</button>',
      '  <button type="button" id="pr-ask-btn" class="btn-primary" style="background:rgba(168,85,247,0.18);border:1px solid rgba(168,85,247,0.4);color:#c084fc;cursor:pointer;padding:12px 20px;">' + t('askBtn') + '</button>',
      '  <button type="button" id="pr-regen-btn" class="btn-primary" style="background:transparent;border:1px solid var(--border);color:var(--muted);cursor:pointer;padding:12px 18px;">' + t('regenBtn') + '</button>',
      '</div>',
      '<div id="pr-ask-panel" style="display:none;margin-top:16px;">',
      '  <div style="display:flex;gap:8px;">',
      '    <input type="text" id="pr-ask-input" class="pf-input" placeholder="' + t('askPh') + '" style="flex:1;">',
      '    <button type="button" id="pr-ask-submit-btn" class="btn-primary" style="white-space:nowrap;padding:10px 18px;">' + t('sendQuestion') + '</button>',
      '  </div>',
      '</div>',
      '<div id="pr-qa-stream" style="margin-top:14px;display:flex;flex-direction:column;gap:10px;"></div>',
      '<div id="pr-status-msg" style="display:none;margin-top:14px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;text-align:center;"></div>'
    ].join('\n');
    bodyEl.appendChild(actionBox);

    // Wire up Phase 7 buttons
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
        qItem.style.cssText = 'padding:12px 16px;background:rgba(0,0,0,0.25);border-left:3px solid #22d3ee;border-radius:8px;font-size:13px;line-height:1.6;';
        qItem.innerHTML = '<div style="font-weight:700;color:#22d3ee;margin-bottom:4px;">Q: ' + escapeHtml(qText) + '</div><div class="pr-qa-ans" style="opacity:0.8;">' + t('asking') + '</div>';
        qaStream.appendChild(qItem);
        askInput.value = '';

        var askPrompt = (lang() === 'ar'
          ? 'اشرح للعميل بنفس لغته ولهجته، مختصر وواضح.\n\n[الخطة]:\n' + text + '\n\n[سؤال العميل]: ' + qText
          : 'Answer the client in the same language and tone, concise and clear.\n\n[Plan]:\n' + text + '\n\n[Client Question]: ' + qText);

        callAI(askPrompt, null).then(function (ans) {
          var ansEl = qItem.querySelector('.pr-qa-ans');
          if (ansEl) ansEl.textContent = ans;
        }).catch(function (err) {
          var ansEl = qItem.querySelector('.pr-qa-ans');
          if (ansEl) ansEl.textContent = lang() === 'ar' ? 'تعذر الرد حاليًا. يرجى مراجعة عبد الرحمن مباشرة عبر واتساب.' : 'Could not retrieve answer. Please reach out to Abdelrahman directly on WhatsApp.';
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
        var clientName = (nameInput && nameInput.value.trim()) || (lang() === 'ar' ? 'زائر من الموقع' : 'Website Visitor');
        var clientContact = (contactInput && contactInput.value.trim()) || 'Not provided';
        var userIdea = (ideaEl && ideaEl.value.trim()) || '';
        var planSummary = text.slice(0, 1500);

        // 1. WhatsApp approval trigger
        var waMsg = lang() === 'ar'
          ? 'وافقت على الخطة! 👋 اسمي: ' + clientName + ' — فكرة المشروع: ' + userIdea + '\n\nملخص الخطة:\n' + planSummary
          : 'I approved the project plan! 👋 Name: ' + clientName + ' — Idea: ' + userIdea + '\n\nPlan Summary:\n' + planSummary;
        var waUrl = 'https://wa.me/201123031944?text=' + encodeURIComponent(waMsg);
        window.open(waUrl, '_blank', 'noopener');

        // 2. Web3Forms submission if key configured
        var web3Key = window.PORTFOLIO_WEB3FORMS_KEY;
        if (web3Key && web3Key !== 'ACCESS_KEY_HERE') {
          fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_key: web3Key,
              subject: '🤝 عميل وافق على خطة من الـ AI Planner',
              name: clientName,
              contact: clientContact,
              message: 'Idea: ' + userIdea + '\n\nFull Plan:\n' + text
            })
          }).catch(function (e) { console.warn('[Web3Forms Planner Error]', e); });
        }

        // 3. Success confirmation
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

  /* ---- submit ---- */
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

    if (AI_ENDPOINT.indexOf('YOUR-WORKER-NAME') !== -1) {
      showError(t('errConfig'));
      return;
    }

    if (errorEl) errorEl.hidden = true;
    showState('loading');
    setBusy(true);
    var pv = document.getElementById('planner-preview');
    if (pv) { pv.hidden = true; pv.textContent = ''; }

    callAI(buildUserMessage(), function (partial) {
      var pv2 = document.getElementById('planner-preview');
      if (pv2) {
        pv2.hidden = false;
        pv2.textContent = partial;
        pv2.scrollTop = pv2.scrollHeight;
      }
    }).then(function (reply) {
      renderPlan(reply);
    }).catch(function (err) {
      if (cancelledByLang) {
        cancelledByLang = false;
        showError(t('errCancelled'));
      } else {
        var isTimeout = err && (err.name === 'AbortError' || /abort/i.test(err.message || ''));
        if (isTimeout) showError(t('errTimeout'));
        else if (err && /HTTP/.test(err.message || '')) showError(t('errNetwork'));
        else showError(t('errGeneric'));
      }
      if (err) console.error('[AI Planner]', err);
    }).then(function () {
      setBusy(false);
      currentAbort = null;
    });
  });

  /* ---- language switches ---- */

  /* ---- clear form on fresh load (client requested) ---- */
  function clearForm() {
    if (ideaEl) ideaEl.value = '';
    if (audEl) audEl.value = '';
    if (featEl) featEl.value = '';
    if (budgetEl) budgetEl.value = '';
    if (deadlineEl) deadlineEl.value = '';
    chips.forEach(function (c) {
      c.classList.remove('on');
      c.setAttribute('aria-pressed', 'false');
    });
    try {
      sessionStorage.clear();
    } catch (e) {}
  }

  /* ---- init ---- */
  applyStrings();
  clearForm();
  showState('empty');
})();
