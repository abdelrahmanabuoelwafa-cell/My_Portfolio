/* ============================================================
   AI Business Planner — premium guided brief (bilingual)
   - Real AI via OVHcloud endpoint (FREE, no login, no API key)
   - Guided form -> structured 9-section project plan
   - Follows the site language (ar/en) with RTL/LTR support
   - Safe rendering: textContent only (no innerHTML -> no XSS)
   ============================================================ */
(function () {
  'use strict';

  var AI_ENDPOINT = 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions';
  var AI_MODEL = 'Qwen3.6-27B';
  var TIMEOUT_MS = 120000;
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
      errTimeout: 'The AI took too long to respond. Please try again.',
      errGeneric: 'Something went wrong while generating the plan. Please try again.',
      errCancelled: 'Request cancelled because the language was switched.',
      sectionFallback: 'Plan',
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
      errTimeout: 'استغرق الذكاء الاصطناعي وقتًا طويلاً. حاول مرة أخرى.',
      errGeneric: 'حدث خطأ أثناء إنشاء الخطة. حاول مرة أخرى.',
      errCancelled: 'تم إلغاء الطلب بسبب تبديل اللغة.',
      sectionFallback: 'الخطة',
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
  function buildSystem(withPrefill) {
    if (lang() === 'ar') {
      return 'أنت مستشار تقنية ومشاريع محترف. مهمتك تحويل فكرة عميل إلى خطة مشروع واضحة.' +
        '\nاكتب الرد بالعربية الفصحى الواضحة فقط.' +
        '\nقسّم ردك بالضبط إلى 9 أقسام، كل قسم في سطر يبدأ بالشكل: 1) عنوان القسم' +
        '\nالأقسام: 1) ملخص المشروع 2) المشكلة والحل 3) المستخدمون المستهدفون 4) مميزات النسخة الأولية MVP' +
        ' 5) مميزات مستقبلية 6) التقنيات المقترحة مع سبب الاختيار 7) مراحل التنفيذ والجدول الزمني' +
        ' 8) المخاطر والافتراضات والأسئلة المفتوحة 9) الخطوات التالية' +
        '\nقواعد مهمة: لا تستخدم Markdown؛ لا تخترع ميزانية مؤكدة أو مواعيد تسليم محددة؛ علّم كل تقدير بأنه مبدئي' +
        '؛ إذا كانت معلومة ناقصة فاذكرها في قسم المخاطر؛ كن مختصرًا وعمليًا (3-6 أسطر لكل قسم).' +
        (withPrefill ? PREFILL_NOTE.ar : '');
    }
    return 'You are a professional technology and product consultant. Your job is to turn a client idea into a clear project plan.' +
      '\nReply in clear English only.' +
      '\nStructure your reply into exactly 9 sections, each starting on its own line in the form: 1) Section title' +
      '\nThe sections: 1) Project summary 2) Problem & solution 3) Target users 4) Core MVP features' +
      ' 5) Potential future features 6) Suggested technology stack with reasons 7) Development phases & rough timeline' +
      ' 8) Risks, assumptions & open questions 9) Recommended next steps' +
      '\nRules: plain text only, no Markdown; never invent a confirmed budget or guaranteed delivery dates; label every estimate as preliminary' +
      '; list missing information under risks; be concise and practical (3-6 lines per section).' +
        (withPrefill ? PREFILL_NOTE.en : '');
  }

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
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    currentAbort = ctrl;
    function clear() { if (timer) clearTimeout(timer); currentAbort = null; }

    function delay(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function run(withPrefill, effort, maxTok, retry429Count) {
      var msgs = [
        { role: 'system', content: buildSystem(withPrefill) },
        { role: 'user', content: userText }
      ];
      if (withPrefill) msgs.push({ role: 'assistant', content: PREFILL[lang()] });
      var bodyObj = { model: AI_MODEL, messages: msgs, stream: true };
      if (effort) bodyObj.reasoning_effort = effort;
      if (maxTok) bodyObj.max_tokens = maxTok;

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
        if (!res.body) return res.json().then(function (j) {
          return j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '';
        });

        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buf = '';
        var content = '';
        function pump() {
          return reader.read().then(function (step) {
            if (step.done) return content;
            buf += decoder.decode(step.value, { stream: true });
            var lines = buf.split('\n');
            buf = lines.pop();
            for (var i2 = 0; i2 < lines.length; i2++) {
              var ln = lines[i2].trim();
              if (ln.indexOf('data:') !== 0) continue;
              var payload = ln.slice(5).trim();
              if (payload === '[DONE]') continue;
              try {
                var j2 = JSON.parse(payload);
                var d = j2.choices && j2.choices[0] && j2.choices[0].delta;
                if (d && d.content) {
                  content += d.content;
                  if (onDelta) { try { onDelta(content); } catch (e) {} }
                }
              } catch (e) {}
            }
            return pump();
          });
        }
        return pump();
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

    /* speed ladder: prefill+minimal thinking -> plain+minimal -> plain no-cap */
    return run(true, 'minimal', 6000, 0).then(function (txt) {
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

  function renderPlan(text) {
    if (!bodyEl) return;
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
    showState('body');
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
  /* ---- persist drafts across the English-mode reload ---- */
  (function persistDrafts() {
    try {
      var textIds = ['planner-idea', 'planner-audience', 'planner-features'];
      textIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var key = 'pfDraft:' + id;
        var saved = sessionStorage.getItem(key);
        if (saved && !el.value) el.value = saved;
        el.addEventListener('input', function () {
          try { sessionStorage.setItem(key, el.value); } catch (e) {}
        });
      });
      ['planner-budget', 'planner-deadline'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var key = 'pfDraft:' + id;
        var saved = sessionStorage.getItem(key);
        if (saved) el.value = saved;
        el.addEventListener('change', function () {
          try { sessionStorage.setItem(key, el.value); } catch (e) {}
        });
      });
      var chipKey = 'pfDraft:chips';
      var savedChips = sessionStorage.getItem(chipKey);
      if (savedChips) {
        var on = savedChips.split('|');
        chips.forEach(function (c) {
          var v = c.getAttribute('data-v');
          if (on.indexOf(v) !== -1) {
            c.classList.add('on');
            c.setAttribute('aria-pressed', 'true');
          }
        });
      }
      chips.forEach(function (c) {
        c.addEventListener('click', function () {
          try {
            sessionStorage.setItem(chipKey, chips.filter(function (x) { return x.classList.contains('on'); })
              .map(function (x) { return x.getAttribute('data-v'); }).join('|'));
          } catch (e) {}
        });
      });
    } catch (e) {}
  })();

  /* ---- init ---- */
  applyStrings();
  showState('empty');
})();
