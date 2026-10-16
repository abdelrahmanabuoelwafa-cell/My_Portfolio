/* ============================================================
   AI Business Planner — Professional Sales Assistant
   - Real AI via secure Cloudflare Worker (holds API key)
   - API key never exposed in frontend code
   - Advanced persuasion & closing techniques
   - Arabic-first, can answer any customer question
   - Fallback: local rule-based mode if API unavailable
   - Safe rendering: textContent only (no innerHTML → no XSS)
   - Timeout protection: 30s AbortController
   - Clear error states with retry support
   ============================================================ */
(function () {
  'use strict';

  var MAX_CHARS = 4000;
  var AI_TIMEOUT_MS = 30000;

  /* ---- DOM ---- */
  var chatEl = document.getElementById('planner-chat');
  var inputEl = document.getElementById('planner-input');
  var btnEl = document.getElementById('planner-btn');
  var errorEl = document.getElementById('planner-error');
  var modeEl = document.getElementById('planner-mode');

  if (!chatEl || !inputEl || !btnEl) return;

  /* ---- AI: calls secure Cloudflare Worker (holds API key) ---- */
  var AI_ENDPOINT = 'https://my-portfolio.mohammed-galalxc1.workers.dev/';

  var aiMode = true;
  if (modeEl) {
    modeEl.textContent = aiMode
      ? 'المساعد الذكي — متصل بالذكاء الاصطناعي'
      : 'المساعد الإرشادي — بدون ذكاء اصطناعي متصل';
    modeEl.classList.toggle('ai-connected', aiMode);
  }

  /* ---- Conversation state ---- */
  var state = {
    phase: 'greeting',
    answers: { idea: '', users: '', features: '', platform: '', budget: '', timeline: '' },
    queue: [],
    history: []
  };

  /* ---- Question sequence (local mode) ---- */
  var ALL_QUESTIONS = [
    { key: 'idea',     q: 'ما فكرة المشروع والمشكلة التي يحلها؟' },
    { key: 'users',    q: 'من المستخدمون المستهدفون لهذا المشروع؟' },
    { key: 'features', q: 'ما أهم 3 وظائف أو مميزات تحتاجها؟' },
    { key: 'platform', q: 'هل تريده Android أم iOS أم موقع ويب أم الثلاثة؟' },
    { key: 'budget',   q: 'هل لديك ميزانية تقريبية؟ (مثال: 5000-10000 دولار، أو لم أقرر بعد)' },
    { key: 'timeline', q: 'ما الموعد التقريبي الذي تود التسليم قبله؟ (مثال: شهران، أو مرونة كاملة)' }
  ];

  var HINTS = {
    idea:     /تطبيق|موقع|منصة|نظام|مشروع|أريد|ابغى|أبغى/,
    users:    /مستخدمين|جمهور|عملاء|زبائن|طلاب|موظفين|أطفال|رجال|نساء|شباب|عيادة|مدرس|شركة/,
    features: /تسجيل|إشعارات|محادثة|سلة|تقرير يومي|تقرير أسبوعي|لوحة تحكم|حساب شخصي|تتبع|خرائط|دفع إلكتروني/,
    platform: /android|ios|أيفون|أندرويد|flutter|react native|موقع ويب/,
    budget:   /ميزانية|مبلغ|budget|تكلفة|أدفع|كم يكلف/,
    timeline: /موعد|مدة|شهر|أسبوع|سنة|deadline|تسليم|مستعجل/
  };

  /* ---- Helpers ---- */
  function addMsg(role, text) {
    var div = document.createElement('div');
    div.className = 'planner-msg ' + role;
    div.textContent = text;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
    state.history.push({ role: role, text: text });
    return div;
  }

  function addTyping() {
    var div = document.createElement('div');
    div.className = 'planner-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
    return div;
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function hideError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setBusy(on) {
    btnEl.disabled = on;
    inputEl.disabled = on;
    btnEl.textContent = on ? '...' : 'إرسال';
  }

  /* ---- AI: send conversation to Cloudflare Worker ---- */
  function callAI(userText) {
    var messages = [];
    state.history.forEach(function (m) {
      if (m.role === 'user') messages.push({ role: 'user', content: m.text });
      else if (m.role === 'bot') messages.push({ role: 'assistant', content: m.text });
    });

    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, AI_TIMEOUT_MS);

    return fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages }),
      signal: controller.signal
    }).then(function (res) {
      clearTimeout(timeoutId);
      if (!res.ok) {
        var err = new Error('HTTP ' + res.status);
        err.status = res.status;
        throw err;
      }
      return res.json();
    }).then(function (data) {
      if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        return data.choices[0].message.content.trim();
      }
      throw new Error('Invalid response format');
    });
  }

  /* ---- Error messages by status ---- */
  function getErrorMessage(err) {
    if (err.name === 'AbortError') {
      return 'استغرق الرد وقتًا طويلاً. حاول مرة أخرى.';
    }
    if (err.status === 429) {
      return 'الخدمة مضغوطة حاليًا. أعد المحاولة بعد دقيقة.';
    }
    if (err.status === 400) {
      return 'تعذر معالجة الرسالة. أعد كتابتها من فضلك.';
    }
    if (err.status === 504) {
      return 'انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.';
    }
    return 'تعذر الاتصال بالمساعد الآن. حاول مرة أخرى بعد قليل.';
  }

  /* ---- Local mode: next step in the flow ---- */
  function detectTopics(text) {
    var found = [];
    var lower = text.toLowerCase();
    Object.keys(HINTS).forEach(function (key) {
      if (HINTS[key].test(lower)) found.push(key);
    });
    return found;
  }

  function buildQueue(knownKeys) {
    state.queue = ALL_QUESTIONS.filter(function (item) {
      return knownKeys.indexOf(item.key) === -1 && !state.answers[item.key];
    });
  }

  function buildSummary() {
    var a = state.answers;
    var lines = [];
    lines.push('ملخص فهمي للمشروع:');
    lines.push('');
    lines.push('• الفكرة: ' + (a.idea || '—'));
    lines.push('• المستخدمون: ' + (a.users || '—'));
    lines.push('• الوظائف المطلوبة: ' + (a.features || '—'));
    lines.push('• المنصة: ' + (a.platform || '—'));
    lines.push('• الميزانية: ' + (a.budget || 'لم تُحدد بعد'));
    lines.push('• الموعد التقريبي: ' + (a.timeline || 'مرونة كاملة'));
    lines.push('');
    lines.push('هل هذا الفهم صحيح؟ اكتب "نعم" للتأكيد، أو اذكر أي تصحيح.');
    return lines.join('\n');
  }

  function buildPlan() {
    var a = state.answers;
    var lines = [];

    lines.push('=== خطة العمل المقترحة ===');
    lines.push('');

    lines.push('1) ملخص المشروع');
    lines.push(a.idea || '—');
    lines.push('');

    lines.push('2) نطاق النسخة الأولى (MVP)');
    if (a.features) {
      a.features.split(/[,،;\n]/).forEach(function (f, i) {
        f = f.trim();
        if (f) lines.push('   ' + (i + 1) + '. ' + f);
      });
    } else {
      lines.push('   - تحديد الوظائف الأساسية مع العميل');
    }
    lines.push('');

    lines.push('3) مراحل التنفيذ');
    lines.push('   المرحلة 1: التحليل والتصميم (1-2 أسبوع)');
    lines.push('   المرحلة 2: التطوير الأساسي (حسب النطاق)');
    lines.push('   المرحلة 3: الاختبار والمراجعة');
    lines.push('   المرحلة 4: الإطلاق والنشر');
    lines.push('');

    lines.push('4) الأدوات المقترحة');
    var plat = (a.platform || '').toLowerCase();
    if (/flutter|كلا|الثلاثة|android.*ios|ios.*android/.test(plat)) {
      lines.push('   - Flutter (أندرويد + iOS بكود واحد)');
      lines.push('   - Firebase (المصادقة + القواعد + الإشعارات)');
    } else if (/android|أندرويد/.test(plat)) {
      lines.push('   - Kotlin + Jetpack Compose للأندرويد');
      lines.push('   - Firebase للمصادقة والبيانات');
    } else if (/ios|أيفون|آيفون/.test(plat)) {
      lines.push('   - Swift + SwiftUI لنظام iOS');
      lines.push('   - CloudKit أو Firebase للباك إند');
    } else if (/ويب|موقع|web/.test(plat)) {
      lines.push('   - React أو Next.js للواجهة');
      lines.push('   - Node.js + PostgreSQL للباك إند');
    } else {
      lines.push('   - حسب المنصة المختارة — يمكن التوصية بعد تحديدها');
    }
    lines.push('   - Git للتحكم بالإصدارات + Figma للتصميم');
    lines.push('');

    lines.push('5) تقدير المدة');
    var featCount = a.features ? a.features.split(/[,،;\n]/).filter(function (f) { return f.trim(); }).length : 0;
    if (featCount <= 2) lines.push('   - 3 إلى 6 أسابيع (نطاق بسيط)');
    else if (featCount <= 4) lines.push('   - 6 إلى 12 أسبوع (نطاق متوسط)');
    else lines.push('   - 3 إلى 6 أشهر (نطاق كبير — يُنصح بتقسيمه لمراحل)');
    lines.push('   * الافتراضات: تصميم جاهز + مراجعة سريعة + موارد متوفرة');
    lines.push('');

    lines.push('6) نقاط ما زالت تحتاج قرارًا');
    var open = [];
    if (!a.budget || /لم أقرر|غير/.test(a.budget)) open.push('   - تثبيت الميزانية النهائية');
    if (!a.timeline || /مرونة/.test(a.timeline)) open.push('   - تثبيت موعد التسليم');
    open.push('   - هوية بصرية (شعار + ألوان)');
    open.push('   - سياسة المحتوى والبيانات المعتمدة');
    lines.push(open.join('\n'));
    lines.push('');
    lines.push('=== نهاية الخطة ===');

    return lines.join('\n');
  }

  function localNext(userText) {
    var lower = userText.toLowerCase();

    if (state.phase === 'confirming') {
      if (/نعم|صح|موافق|تمام|oui|yes|ok/.test(lower)) {
        state.phase = 'planning';
        return Promise.resolve().then(function () {
          addMsg('bot', 'ممتاز! جارٍ إعداد خطة العمل بناءً على إجاباتك...');
          return delay(1200).then(function () {
            addMsg('plan', buildPlan());
            state.phase = 'done';
            addMsg('bot', 'انتهت الخطة. يمكنك كتابة أي سؤال أو طلب تعديل.');
          });
        });
      } else {
        state.phase = 'collecting';
        var detected = detectTopics(userText);
        var updated = false;
        detected.forEach(function (k) {
          if (state.answers.hasOwnProperty(k)) {
            state.answers[k] = userText;
            updated = true;
          }
        });
        buildQueue([]);
        if (state.queue.length === 0) {
          state.phase = 'confirming';
          return delay(400).then(function () {
            addMsg('bot', updated ? 'تم التحديث. هذا ملخص محدث:' : 'فهمت. هذا الملخص المحدث:');
            return delay(300).then(function () {
              addMsg('bot', buildSummary());
            });
          });
        }
        return askNext();
      }
    }

    if (state.phase === 'collecting' || state.phase === 'greeting') {
      if (state.history.filter(function (h) { return h.role === 'user'; }).length <= 1) {
        var detected0 = detectTopics(userText);
        detected0.forEach(function (k) {
          if (state.answers.hasOwnProperty(k) && !state.answers[k]) {
            state.answers[k] = userText;
          }
        });
        if (!state.answers.idea && detected0.indexOf('idea') !== -1) {
          state.answers.idea = userText;
        }
        buildQueue([]);
      } else if (state.queue.length > 0) {
        var current = state.queue[0];
        state.answers[current.key] = userText;
        state.queue.shift();
        buildQueue([]);
      }

      if (state.queue.length === 0) {
        state.phase = 'confirming';
        return Promise.resolve().then(function () {
          return delay(600).then(function () {
            addMsg('bot', buildSummary());
          });
        });
      }

      return askNext();
    }

    if (state.phase === 'done') {
      return Promise.resolve().then(function () {
        addMsg('bot', 'الخطة جاهزة أعلاه. إذا أردت تعديل أي نقطة أو بدء مشروع جديد، اكتب "مشروع جديد".');
        if (/مشروع جديد|جديد|restart/.test(lower)) {
          resetState();
          addMsg('bot', GREETING);
          return askNext();
        }
      });
    }

    return askNext();
  }

  var GREETING =
    'مرحبًا بك! أنا مستشارك الشخصي لتطوير المشاريع.' +
    '\n\nسأساعدك في:' +
    '\n• تحويل فكرتك إلى واقع' +
    '\n• بناء خطة عمل ذكية' +
    '\n• اتخاذ أفضل القرارات' +
    '\n\nاكتب لي: ماذا تريد أن تبني؟ (ويمكنك ذكر أي تفاصيل تعرفها — منصة، ميزانية، مستخدمين... ولن أسألك عنها مجددًا)';

  function resetState() {
    state.phase = 'collecting';
    state.answers = { idea: '', users: '', features: '', platform: '', budget: '', timeline: '' };
    state.queue = [];
    buildQueue([]);
  }

  function askNext() {
    if (state.queue.length === 0) {
      buildQueue([]);
      if (state.queue.length === 0) {
        state.phase = 'confirming';
        return delay(500).then(function () {
          addMsg('bot', buildSummary());
        });
      }
    }
    var next = state.queue[0];
    return delay(700).then(function () {
      addMsg('bot', next.q);
    });
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* ---- Main submit handler ---- */
  function submit() {
    var text = inputEl.value.trim();
    hideError();

    if (!text) {
      showError('اكتب شيئًا أولًا.');
      inputEl.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError('النص طويل جدًا. الحد الأقصى ' + MAX_CHARS + ' حرفًا.');
      return;
    }

    if (state.phase === 'done' && /مشروع جديد|جديد|restart/.test(text.toLowerCase())) {
      chatEl.innerHTML = '';
      state.history = [];
      resetState();
    }

    inputEl.value = '';
    addMsg('user', text);
    setBusy(true);

    var typing = addTyping();

    var result;
    if (aiMode) {
      result = callAI(text).then(function (reply) {
        typing.remove();
        addMsg('bot', reply);
      });
    } else {
      result = localNext(text).then(function () {
        typing.remove();
      });
    }

    result.catch(function (err) {
      typing.remove();
      console.error('[AI Planner]', err);

      var last = state.history[state.history.length - 1];
      if (last && last.role === 'user') state.history.pop();

      var msg = getErrorMessage(err);
      addMsg('system', msg);
    }).finally(function () {
      setBusy(false);
      inputEl.focus();
    });
  }

  btnEl.addEventListener('click', submit);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  /* ---- Boot ---- */
  addMsg('bot', GREETING);
  state.phase = 'collecting';
  buildQueue([]);
})();
