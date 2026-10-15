/* ============================================================
   AI Business Planner
   - Sends user's request text to a secure backend endpoint
   - NO API key in frontend (endpoint must be a serverless proxy)
   - Safe rendering: textContent only (no innerHTML → no XSS)
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     IMPORTANT: Put your secure backend URL here.
     This must be a serverless function (Vercel / Netlify /
     Cloudflare Workers) that holds the real AI API key and
     forwards the request.  NEVER put an API key in this file.
     Leave empty until the backend is ready → button will show
     "خدمة التحليل غير مهيأة بعد".
     -------------------------------------------------------- */
  var YOUR_AI_API_ENDPOINT = '';

  var MAX_CHARS = 4000;

  var input = document.getElementById('planner-input');
  var btn = document.getElementById('planner-btn');
  var loading = document.getElementById('planner-loading');
  var errorBox = document.getElementById('planner-error');
  var resultBox = document.getElementById('planner-result');

  if (!input || !btn) return;

  /* Build the Arabic analysis prompt */
  function buildPrompt(userText) {
    return 'أنت مساعد أعمال ذكي متخصص. ' +
      'قم بتحليل الطلب التالي وقدم خطة عمل واضحة ومفصلة باللغة العربية، ' +
      'مرقمة بالضبط في 6 أقسام:\n\n' +
      '1. فهم مختصر لطلب العميل\n' +
      '2. المتطلبات الأساسية\n' +
      '3. خطة عمل مرحلية ومرتبة\n' +
      '4. التقنيات أو الأدوات المقترحة\n' +
      '5. المدة التقديرية للتنفيذ\n' +
      '6. المخاطر أو الأسئلة التي يجب توضيحها مع العميل\n\n' +
      'اكتب النص كاملاً بخط واضح وفقرات منفصلة، بدون أي تنسيق Markdown.\n\n' +
      'طلب العميل:\n"""\n' + userText + '\n"""';
  }

  /* Show / hide helpers */
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }
  function hideError() { errorBox.hidden = true; errorBox.textContent = ''; }
  function showResult(text) {
    /* textContent — safe, no XSS */
    resultBox.textContent = text;
    resultBox.hidden = false;
  }
  function hideResult() { resultBox.hidden = true; resultBox.textContent = ''; }

  /* Loading state */
  function setLoading(on) {
    btn.disabled = on;
    loading.hidden = !on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    hideError();
    hideResult();

    var text = input.value.trim();

    /* Validation */
    if (!text) {
      showError('الرجاء كتابة طلبك أولًا.');
      input.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError('النص طويل جدًا. الحد الأقصى ' + MAX_CHARS + ' حرفًا.');
      return;
    }
    if (!YOUR_AI_API_ENDPOINT) {
      showError('خدمة التحليل غير مهيأة بعد. يرجى المحاولة لاحقًا.');
      return;
    }

    /* Call backend */
    setLoading(true);

    fetch(YOUR_AI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt(text) })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (raw) {
        /* Try JSON { result: "..." } first, else use raw text */
        var out = raw;
        try {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed.result === 'string') out = parsed.result;
          else if (parsed && typeof parsed.content === 'string') out = parsed.content;
          else if (parsed && parsed.choices && parsed.choices[0]) {
            out = parsed.choices[0].message ? parsed.choices[0].message.content : raw;
          }
        } catch (e) { /* not JSON — use raw text */ }
        showResult(out.trim());
      })
      .catch(function (err) {
        /* Log full error for dev only — never show raw to user */
        console.error('[AI Planner]', err);
        showError('تعذر تحليل الطلب الآن، حاول مرة أخرى.');
      })
      .finally(function () {
        setLoading(false);
      });
  });

  /* Allow Ctrl+Enter to submit from textarea */
  input.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      btn.click();
    }
  });
})();
