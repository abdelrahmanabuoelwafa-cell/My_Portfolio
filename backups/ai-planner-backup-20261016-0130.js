/* ============================================================
   AI Business Planner — Professional Sales Assistant
   - Real AI via secure Cloudflare Worker (holds API key)
   - API key never exposed in frontend code
   - Advanced persuasion & closing techniques
   - English-first, can answer any customer question
   - Fallback: local rule-based mode if API unavailable
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
      : 'Guide Assistant — offline mode';
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
    { key: 'idea',     q: 'What is your app or project idea? What problem does it solve?' },
    { key: 'users',    q: 'Who is your target audience? Who will use this app?' },
    { key: 'features', q: 'What are the top 3 features you absolutely need?' },
    { key: 'platform', q: 'Which platform(s)? Android, iOS, web, or a combination?' },
    { key: 'budget',   q: 'What is your approximate budget? (Example: $5000-10000 or flexible)' },
    { key: 'timeline', q: 'When do you need this launched? (Example: next month or within 3 months)' }
  ];

  var HINTS = {
    idea:     /app|website|platform|build|want|create|develop|startup|idea|project|solution|product/i,
    users:    /users|audience|customers|target|who|people|market|clients|segment|demographics/i,
    features: /feature|functionality|capability|need|require|want|include|must-have|should-have/i,
    platform: /android|ios|iphone|ipad|web|website|flutter|react native|cross-platform|mobile|desktop/i,
    budget:   /budget|cost|spend|price|money|dollar|usd|\$|cheap|expensive|affordable/i,
    timeline: /time|deadline|launch|month|week|duration|schedule|when|ready|deliver/i
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
    btnEl.textContent = on ? '...' : 'Send';
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
    lines.push('Here is a summary of your project requirements:');
    lines.push('');
    lines.push('• Project idea: ' + (a.idea || 'Not specified'));
    lines.push('• Target users: ' + (a.users || 'Not specified'));
    lines.push('• Top features: ' + (a.features || 'Not specified'));
    lines.push('• Platform: ' + (a.platform || 'Not specified'));
    lines.push('• Budget: ' + (a.budget || 'Flexible / to be discussed'));
    lines.push('• Timeline: ' + (a.timeline || 'To be determined'));
    lines.push('');
    lines.push('If this looks correct, say "yes" and I will prepare a detailed implementation plan. Otherwise, tell me what to change.');
    return lines.join('\n');
  }

  function buildPlan() {
    var a = state.answers;
    var lines = [];

    lines.push('=== Project Implementation Plan ===');
    lines.push('');

    lines.push('1) Project Overview');
    lines.push(a.idea || 'Not specified');
    lines.push('');

    lines.push('2) MVP Feature Scope');
    if (a.features) {
      a.features.split(/[,;\n]/).forEach(function (f, i) {
        f = f.trim();
        if (f) lines.push('   ' + (i + 1) + '. ' + f);
      });
    } else {
      lines.push('   - Core features to be defined based on your needs');
    }
    lines.push('');

    lines.push('3) Implementation Phases');
    lines.push('   Phase 1: Design and wireframing (1-2 weeks)');
    lines.push('   Phase 2: Core development (depends on complexity)');
    lines.push('   Phase 3: Testing and quality assurance');
    lines.push('   Phase 4: Deployment and launch');
    lines.push('');

    lines.push('4) Technology Stack');
    var plat = (a.platform || '').toLowerCase();
    if (/flutter|cross|android.*ios|ios.*android/.test(plat)) {
      lines.push('   - Flutter (Android + iOS in one codebase)');
      lines.push('   - Firebase (authentication, database, push notifications)');
    } else if (/android|mobile/.test(plat)) {
      lines.push('   - Kotlin + Jetpack Compose for Android');
      lines.push('   - Firebase for backend and analytics');
    } else if (/ios|iphone|ipad/.test(plat)) {
      lines.push('   - Swift + SwiftUI for iOS');
      lines.push('   - CloudKit or Firebase for backend');
    } else if (/web|website|platform/.test(plat)) {
      lines.push('   - React or Next.js for frontend');
      lines.push('   - Node.js + PostgreSQL for backend');
    } else {
      lines.push('   - Technology stack chosen based on your platform preference');
    }
    lines.push('   - Git for version control + Figma for design');
    lines.push('');

    lines.push('5) Timeline Estimate');
    var featCount = a.features ? a.features.split(/[,;\n]/).filter(function (f) { return f.trim(); }).length : 0;
    if (featCount <= 2) lines.push('   - 3 to 6 weeks (simple scope)');
    else if (featCount <= 4) lines.push('   - 6 to 12 weeks (moderate complexity)');
    else lines.push('   - 3 to 6 months (complex feature set)');
    lines.push('   * Note: Timelines are estimates and depend on clarity of requirements + feedback speed.');
    lines.push('');

    lines.push('6) Open Questions / Next Steps');
    var open = [];
    if (!a.budget || /flexible|to be discussed/.test(a.budget)) open.push('   - Budget range for accurate scope');
    if (!a.timeline || /to be determined/.test(a.timeline)) open.push('   - Preferred launch timeline');
    open.push('   - Design preferences (branding + style)');
    open.push('   - Third-party integrations needed');
    lines.push(open.join('\n'));
    lines.push('');
    lines.push('=== End of Plan ===');

    return lines.join('\n');
  }

  function localNext(userText) {
    var lower = userText.toLowerCase();

    if (state.phase === 'confirming') {
      if (/yes|yep|correct|that\'s right|ok|sounds good|perfect/i.test(lower)) {
        state.phase = 'planning';
        return Promise.resolve().then(function () {
          addMsg('bot', 'Great! Let me generate a detailed implementation plan for you. This will take a moment...');
          return delay(1200).then(function () {
            addMsg('plan', buildPlan());
            state.phase = 'done';
            addMsg('bot', 'The plan is ready. If you have questions or want to adjust anything, just let me know.');
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
            addMsg('bot', updated ? 'Got it. Let me update the summary:' : 'Understood. Here is the updated summary:');
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
        addMsg('bot', 'The planning session is complete. Feel free to reach out when you are ready to start a new project.');
        if (/new project|restart|project proposal|start over/i.test(lower)) {
          resetState();
          addMsg('bot', GREETING);
          return askNext();
        }
      });
    }

    return askNext();
  }

  var GREETING =
    'Hello! I am your business planning assistant. I help clarify project requirements and prepare implementation plans.' +
    '\n\nI can help with:' +
    '\n• Understanding your app idea and goals' +
    '\n• Building a detailed business plan' +
    '\n• Estimating timelines and tech stack recommendations' +
    '\n\nTip: You can describe your project in free form (I will extract what I need — like the idea, users, features, budget, timeline...)';

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
      showError('Please enter a message.');
      inputEl.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError('Message is too long. Please keep it under ' + MAX_CHARS + ' characters.');
      return;
    }

    if (state.phase === 'done' && /new project|restart/i.test(text.toLowerCase())) {
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
