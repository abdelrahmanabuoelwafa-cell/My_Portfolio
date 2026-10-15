/* ============================================================
   AI Business Planner — Interactive Chat Assistant
   - Conversational flow: asks 1-2 clarifying questions at a time
   - Remembers answers, never re-asks known info
   - Summary → confirmation → full plan
   - When YOUR_AI_API_ENDPOINT is empty: local rule-based mode
     (clearly labeled, NOT pretending to be AI)
   - When endpoint is set: AI drives every response
   - Safe rendering: textContent only (no innerHTML → no XSS)
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     IMPORTANT: Put your secure backend URL here.
     This must be a serverless function (Vercel / Netlify /
     Cloudflare Workers) that holds the real AI API key and
     forwards the request.  NEVER put an API key in this file.
     Leave empty → local rule-based assistant (no fake AI).
     -------------------------------------------------------- */
  var YOUR_AI_API_ENDPOINT = '';

  var MAX_CHARS = 4000;

  /* ---- DOM ---- */
  var chatEl = document.getElementById('planner-chat');
  var inputEl = document.getElementById('planner-input');
  var btnEl = document.getElementById('planner-btn');
  var errorEl = document.getElementById('planner-error');
  var modeEl = document.getElementById('planner-mode');

  if (!chatEl || !inputEl || !btnEl) return;

  var aiMode = !!YOUR_AI_API_ENDPOINT;
  if (modeEl) {
    modeEl.textContent = aiMode
      ? 'المساعد الذكي — متصل بالذكاء الاصطناعي'
      : 'المساعد الإرشادي — بدون ذكاء اصطناعي متصل';
    modeEl.classList.toggle('ai-connected', aiMode);
  }

  /* ---- Conversation state ---- */
  var state = {
    phase: 'greeting',       // greeting | collecting | confirming | planning | done
    answers: {
      idea: '',              // فكرة المشروع والمشكلة
      users: '',             // المستخدمون المستهدفون
      features: '',          // أهم الوظائف
      platform: '',          // المنصة
      budget: '',            // الميزانية
      timeline: ''           // الموعد التقريبي
    },
    queue: [],               // أسئلة متبقية
    history: []              // سجل المحادثة {role, text}
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

  /* Keyword hints → skip questions already answered in free text
     (only applied to the FIRST user message to avoid false positives) */
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
    div.textContent = text; /* safe — no innerHTML */
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

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* Detect which topics are already covered in a free-text answer */
  function detectTopics(text) {
    var found = [];
    var lower = text.toLowerCase();
    Object.keys(HINTS).forEach(function (key) {
      if (HINTS[key].test(lower)) found.push(key);
    });
    return found;
  }

  /* Build the remaining question queue, skipping known topics */
  function buildQueue(knownKeys) {
    state.queue = ALL_QUESTIONS.filter(function (item) {
      return knownKeys.indexOf(item.key) === -1 && !state.answers[item.key];
    });
  }

  /* Generate summary from collected answers */
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

  /* Generate the final plan (local mode — structured template) */
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

  /* ---- AI mode: send conversation to backend ---- */
  function callAI(userText) {
    var convo = state.history.map(function (m) {
      return (m.role === 'user' ? 'العميل' : 'المساعد') + ': ' + m.text;
    }).join('\n');
    convo += '\nالعميل: ' + userText;

    var sysPrompt =
      'أنت مساعد أعمال تفاعلي. مهمتك:' +
      '\n1) إذا كان طلب العميل عامًا، اسأل سؤالًا توضيحيًا واحدًا فقط في كل رد.' +
      '\n2) لا تسأل عن معلومات ذكرها العميل سابقًا.' +
      '\n3) عندما تكتمل المعلومات (فكرة، مستخدمون، وظائف، منصة، ميزانية، موعد)، اعرض ملخص فهمك واطلب التأكيد.' +
      '\n4) بعد التأكيد، اعرض خطة عمل تشمل: ملخص، MVP، مراحل، أدوات، مدة، نقاط مفتوحة.' +
      '\nاكتب بالعربية فقط، بأسلوب مختصر وواضح، بدون Markdown.';

    return fetch(YOUR_AI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: sysPrompt + '\n\nالمحادثة:\n' + convo + '\n\nردك:'
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (raw) {
      var out = raw;
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.result === 'string') out = parsed.result;
        else if (parsed && typeof parsed.content === 'string') out = parsed.content;
        else if (parsed && parsed.choices && parsed.choices[0]) {
          out = parsed.choices[0].message ? parsed.choices[0].message.content : raw;
        }
      } catch (e) { /* not JSON */ }
      return out.trim();
    });
  }

  /* ---- Local mode: next step in the flow ---- */
  function localNext(userText) {
    var lower = userText.toLowerCase();

    /* Confirm phase */
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
        /* Correction — update answer, then re-show summary */
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

    /* Collecting phase */
    if (state.phase === 'collecting' || state.phase === 'greeting') {
      /* FIRST message: detect topics to skip answered questions */
      if (state.history.filter(function (h) { return h.role === 'user'; }).length <= 1) {
        var detected0 = detectTopics(userText);
        detected0.forEach(function (k) {
          if (state.answers.hasOwnProperty(k) && !state.answers[k]) {
            state.answers[k] = userText;
          }
        });
        /* Store idea as the full first message if detected */
        if (!state.answers.idea && detected0.indexOf('idea') !== -1) {
          state.answers.idea = userText;
        }
        buildQueue([]);
      } else if (state.queue.length > 0) {
        /* Subsequent messages: answer current question directly */
        var current = state.queue[0];
        state.answers[current.key] = userText;
        state.queue.shift();
        buildQueue([]);
      }

      /* If all answered → summary */
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

    /* Done phase — free chat */
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
    'مرحبًا! أنا مساعد تخطيط المشاريع.' +
    '\nسأساعدك في تحويل فكرتك إلى خطة عمل واضحة.' +
    '\n\nاكتب لي: ماذا تريد أن تبني؟ (ويمكنك ذكر أي تفاصيل تعرفها — منصة، ميزانية، مستخدمين... ولن أسألك عنها مجددًا)';

  function resetState() {
    state.phase = 'collecting';
    state.answers = { idea: '', users: '', features: '', platform: '', budget: '', timeline: '' };
    state.queue = [];
    buildQueue([]);
  }

  /* Ask next question from queue (1 question at a time) */
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

    /* Reset for new project */
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
      addMsg('system', 'تعذر تحليل الطلب الآن، حاول مرة أخرى.');
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

  /* ---- Boot: greeting only (first question asked after user replies) ---- */
  addMsg('bot', GREETING);
  state.phase = 'collecting';
  buildQueue([]); /* all questions pending */
})();
