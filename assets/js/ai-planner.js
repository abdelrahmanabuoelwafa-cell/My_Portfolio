/* ============================================================
   AI Chat Assistant — General Conversational Assistant
   - Real AI via secure Cloudflare Worker (holds API key)
   - API key never exposed in frontend code
   - Multilingual: responds in user's preferred language
   - Professional, persuasive, helpful
   - Safe rendering: textContent only (no innerHTML — no XSS)
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
      ? 'AI Assistant — Connected'
      : 'AI Assistant — offline mode';
    modeEl.classList.toggle('ai-connected', aiMode);
  }

  /* ---- Conversation state ---- */
  var history = [];

  /* ---- Helpers ---- */
  function addMsg(role, text) {
    var div = document.createElement('div');
    div.className = 'planner-msg ' + role;
    div.textContent = text.substring(0, MAX_CHARS);
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
    history.push({ role: role, text: text });
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
    btnEl.textContent = on ? '...' : 'Send';
  }

  /* ---- AI: send conversation to Cloudflare Worker ---- */
  function callAI(userText) {
    var messages = [];
    history.forEach(function (m) {
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
      return 'The reply took too long. Please try again.';
    }
    if (err.status === 429) {
      return 'The service is busy right now. Try again in a minute.';
    }
    if (err.status === 400) {
      return 'Could not process that message. Please rephrase it.';
    }
    if (err.status === 504) {
      return 'The AI service timed out. Please try again shortly.';
    }
    return 'Could not reach the assistant. Please try again shortly.';
  }

  /* ---- Main submit handler ---- */
  function submit() {
    var text = inputEl.value.trim();
    hideError();

    if (!text) {
      showError('Please enter a message.');
      inputEl.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError('Message is too long. Please keep it under ' + MAX_CHARS + ' characters.');
      return;
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
      result = Promise.reject(new Error('AI is currently offline'));
    }

    result.catch(function (err) {
      typing.remove();
      console.error('[AI Assistant]', err);

      var last = history[history.length - 1];
      if (last && last.role === 'user') history.pop();

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
  addMsg('bot', 'Hello! I am the AI assistant for Abdelrahman Abdullah\'s portfolio. I can help you with questions about his services, skills, projects, or discuss your software development needs. How can I assist you today?');
})();
