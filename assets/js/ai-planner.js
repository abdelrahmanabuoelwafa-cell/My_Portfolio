/* ============================================================
   AI Business Planner ΓÇö Professional Sales Assistant
   - Real AI via Pollinations.ai (FREE, no login, no API key)
   - Advanced persuasion & closing techniques
   - Arabic-first, can answer any customer question
   - Fallback: local rule-based mode if API unavailable
   - Safe rendering: textContent only (no innerHTML ΓåÆ no XSS)
   ============================================================ */
(function () {
  'use strict';

  var MAX_CHARS = 4000;

  /* ---- DOM ---- */
  var chatEl = document.getElementById('planner-chat');
  var inputEl = document.getElementById('planner-input');
  var btnEl = document.getElementById('planner-btn');
  var errorEl = document.getElementById('planner-error');
  var modeEl = document.getElementById('planner-mode');

  if (!chatEl || !inputEl || !btnEl) return;

  /* ---- AI: send conversation to Pollinations.ai ---- */
  var AI_ENDPOINT = 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions';
  var AI_MODEL = 'Qwen3.6-27B';

  /* Detect AI availability by checking if endpoint is set */
  var aiMode = !!AI_ENDPOINT;
  if (modeEl) {
    modeEl.textContent = aiMode
      ? '╪º┘ä┘à╪│╪º╪╣╪» ╪º┘ä╪░┘â┘è ΓÇö ┘à╪¬╪╡┘ä ╪¿╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è'
      : '╪º┘ä┘à╪│╪º╪╣╪» ╪º┘ä╪Ñ╪▒╪┤╪º╪»┘è ΓÇö ╪¿╪»┘ê┘å ╪░┘â╪º╪í ╪º╪╡╪╖┘å╪º╪╣┘è ┘à╪¬╪╡┘ä';
    modeEl.classList.toggle('ai-connected', aiMode);
  }

  /* ---- Conversation state (local mode) ---- */
  var state = {
    phase: 'greeting',
    answers: { idea: '', users: '', features: '', platform: '', budget: '', timeline: '' },
    queue: [],
    history: []
  };

  /* ---- Question sequence (local mode) ---- */
  var ALL_QUESTIONS = [
    { key: 'idea',     q: '┘à╪º ┘ü┘â╪▒╪⌐ ╪º┘ä┘à╪┤╪▒┘ê╪╣ ┘ê╪º┘ä┘à╪┤┘â┘ä╪⌐ ╪º┘ä╪¬┘è ┘è╪¡┘ä┘ç╪º╪ƒ' },
    { key: 'users',    q: '┘à┘å ╪º┘ä┘à╪│╪¬╪«╪»┘à┘ê┘å ╪º┘ä┘à╪│╪¬┘ç╪»┘ü┘ê┘å ┘ä┘ç╪░╪º ╪º┘ä┘à╪┤╪▒┘ê╪╣╪ƒ' },
    { key: 'features', q: '┘à╪º ╪ú┘ç┘à 3 ┘ê╪╕╪º╪ª┘ü ╪ú┘ê ┘à┘à┘è╪▓╪º╪¬ ╪¬╪¡╪¬╪º╪¼┘ç╪º╪ƒ' },
    { key: 'platform', q: '┘ç┘ä ╪¬╪▒┘è╪»┘ç Android ╪ú┘à iOS ╪ú┘à ┘à┘ê┘é╪╣ ┘ê┘è╪¿ ╪ú┘à ╪º┘ä╪½┘ä╪º╪½╪⌐╪ƒ' },
    { key: 'budget',   q: '┘ç┘ä ┘ä╪»┘è┘â ┘à┘è╪▓╪º┘å┘è╪⌐ ╪¬┘é╪▒┘è╪¿┘è╪⌐╪ƒ (┘à╪½╪º┘ä: 5000-10000 ╪»┘ê┘ä╪º╪▒╪î ╪ú┘ê ┘ä┘à ╪ú┘é╪▒╪▒ ╪¿╪╣╪»)' },
    { key: 'timeline', q: '┘à╪º ╪º┘ä┘à┘ê╪╣╪» ╪º┘ä╪¬┘é╪▒┘è╪¿┘è ╪º┘ä╪░┘è ╪¬┘ê╪» ╪º┘ä╪¬╪│┘ä┘è┘à ┘é╪¿┘ä┘ç╪ƒ (┘à╪½╪º┘ä: ╪┤┘ç╪▒╪º┘å╪î ╪ú┘ê ┘à╪▒┘ê┘å╪⌐ ┘â╪º┘à┘ä╪⌐)' }
  ];

  var HINTS = {
    idea:     /╪¬╪╖╪¿┘è┘é|┘à┘ê┘é╪╣|┘à┘å╪╡╪⌐|┘å╪╕╪º┘à|┘à╪┤╪▒┘ê╪╣|╪ú╪▒┘è╪»|╪º╪¿╪║┘ë|╪ú╪¿╪║┘ë/,
    users:    /┘à╪│╪¬╪«╪»┘à┘è┘å|╪¼┘à┘ç┘ê╪▒|╪╣┘à┘ä╪º╪í|╪▓╪¿╪º╪ª┘å|╪╖┘ä╪º╪¿|┘à┘ê╪╕┘ü┘è┘å|╪ú╪╖┘ü╪º┘ä|╪▒╪¼╪º┘ä|┘å╪│╪º╪í|╪┤╪¿╪º╪¿|╪╣┘è╪º╪»╪⌐|┘à╪»╪▒╪│|╪┤╪▒┘â╪⌐/,
    features: /╪¬╪│╪¼┘è┘ä|╪Ñ╪┤╪╣╪º╪▒╪º╪¬|┘à╪¡╪º╪»╪½╪⌐|╪│┘ä╪⌐|╪¬┘é╪▒┘è╪▒ ┘è┘ê┘à┘è|╪¬┘é╪▒┘è╪▒ ╪ú╪│╪¿┘ê╪╣┘è|┘ä┘ê╪¡╪⌐ ╪¬╪¡┘â┘à|╪¡╪│╪º╪¿ ╪┤╪«╪╡┘è|╪¬╪¬╪¿╪╣|╪«╪▒╪º╪ª╪╖|╪»┘ü╪╣ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è/,
    platform: /android|ios|╪ú┘è┘ü┘ê┘å|╪ú┘å╪»╪▒┘ê┘è╪»|flutter|react native|┘à┘ê┘é╪╣ ┘ê┘è╪¿/,
    budget:   /┘à┘è╪▓╪º┘å┘è╪⌐|┘à╪¿┘ä╪║|budget|╪¬┘â┘ä┘ü╪⌐|╪ú╪»┘ü╪╣|┘â┘à ┘è┘â┘ä┘ü/,
    timeline: /┘à┘ê╪╣╪»|┘à╪»╪⌐|╪┤┘ç╪▒|╪ú╪│╪¿┘ê╪╣|╪│┘å╪⌐|deadline|╪¬╪│┘ä┘è┘à|┘à╪│╪¬╪╣╪¼┘ä/
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
    btnEl.textContent = on ? '...' : '╪Ñ╪▒╪│╪º┘ä';
  }

  /* ---- AI: send conversation to Pollinations.ai ---- */
  function callAI(userText) {
    var sysPrompt =
      '╪ú┘å╪¬ ╪«╪¿┘è╪▒ ╪¬╪│┘ê┘è┘é ┘ê╪º┘é┘å╪º╪╣ ┘à╪¡╪¬╪▒┘ü ┘ê┘à╪│╪º╪╣╪» ╪ú╪╣┘à╪º┘ä ╪░┘â┘è. ┘à┘ç┘à╪¬┘â ┘à╪│╪º╪╣╪»╪⌐ ╪º┘ä╪╣┘à┘è┘ä ┘ê╪º┘é┘å╪º╪╣┘ç ╪¿╪º┘ä╪┤╪▒╪º╪í. ┘é┘ê╪º╪╣╪»┘â:' +
      '\n\n' +
      '1) ╪º┘ä╪¬╪¡┘è╪⌐ ┘ê╪º┘ä╪¿┘å╪º╪í: ╪º╪¿╪»╪ú ╪¿╪¬╪¡┘è╪⌐ ┘ê╪»┘ê╪»╪⌐╪î ┘ê╪º┘â╪¬╪┤┘ü ╪º╪¡╪¬┘è╪º╪¼ ╪º┘ä╪╣┘à┘è┘ä ╪º┘ä╪¡┘é┘è┘é┘è ╪¿╪│╪ñ╪º┘ä ┘ê╪º╪¡╪» ╪░┘â┘è ┘ü┘è ┘â┘ä ╪▒╪».' +
      '\n2) ╪º┘ä╪º╪¡╪¬┘ü╪º╪╕ ╪¿╪º┘ä╪░╪º┘â╪▒╪⌐: ╪¬╪¬╪░┘â╪▒ ┘â┘ä ┘à╪º ┘é╪º┘ä┘ç ╪º┘ä╪╣┘à┘è┘ä ΓÇö ┘ä╪º ╪¬╪│╪ú┘ä ┘à╪▒╪¬┘è┘å ╪╣┘å ┘å┘ü╪│ ╪º┘ä╪┤┘è╪í.' +
      '\n3) ╪º┘é┘å╪º╪╣ ╪º╪¡╪¬╪▒╪º┘ü┘è: ╪╣┘å╪»┘à╪º ┘è╪╣╪¿┘æ╪▒ ╪º┘ä╪╣┘à┘è┘ä ╪╣┘å ╪¬╪▒╪»╪» ╪ú┘ê ╪º╪╣╪¬╪▒╪º╪╢ (╪║╪º┘ä┘è╪î ┘à╪┤ ┘à╪¬╪ú┘â╪»╪î ┘ç┘ü┘â╪▒╪î ┘ä╪│┘ç ╪¿╪»╪▒┘è):' +
      '\n   - ╪º┘ü┘ç┘à ╪º╪╣╪¬╪▒╪º╪╢┘ç ╪º┘ä╪¡┘é┘è┘é┘è ╪ú┘ê┘ä╪º┘ï (╪º╪│╪¬┘à╪╣)' +
      '\n   - ╪º╪▒╪¿╪╖ ╪º┘ä┘à┘å╪¬╪¼/╪º┘ä╪«╪»┘à╪⌐ ╪¿╪¡┘ä ┘à╪┤┘â┘ä╪¬┘ç ╪º┘ä╪┤╪«╪╡┘è╪⌐' +
      '\n   - ╪º╪│╪¬╪«╪»┘à ┘à╪¿╪»╪ú ╪º┘ä┘å╪»╪▒╪⌐ (╪╣╪▒╪╢ ┘ä┘ü╪¬╪▒╪⌐ ┘à╪¡╪»┘ê╪»╪⌐)' +
      '\n   - ╪º╪│╪¬╪«╪»┘à ╪º┘ä╪»┘ä┘è┘ä ╪º┘ä╪º╪¼╪¬┘à╪º╪╣┘è (╪╣┘à┘ä╪º╪í ╪ó╪«╪▒┘è┘å ╪│╪╣╪»╪º╪í)' +
      '\n   - ╪º╪╣╪▒╪╢ ╪º┘ä┘é┘è┘à╪⌐ ┘à┘é╪º╪¿┘ä ╪º┘ä╪│╪╣╪▒ (┘ä┘è╪│ ╪¬┘â┘ä┘ü╪⌐ ╪¿┘ä ╪º╪│╪¬╪½┘à╪º╪▒)' +
      '\n   - ╪º╪╖╪▒╪¡ ╪│╪ñ╪º┘ä ╪º┘ä╪Ñ╪║┘ä╪º┘é: "┘ç┘ä ╪¬╪¿╪»╪ú ╪º┘ä╪ó┘å ╪ú┘à ╪¬┘ü╪╢┘ä ╪º┘ä╪╣╪▒╪╢ ╪º┘ä┘à┘à┘è╪▓╪ƒ"' +
      '\n4) ╪ú╪│┘ä┘ê╪¿ ┘é┘ê┘è ┘ä┘â┘å ┘à┘ç╪░╪¿: ┘ê╪º╪½┘é╪î ┘à╪¿╪º╪┤╪▒╪î ┘à╪«╪¬╪╡╪▒╪î ╪¿╪»┘ê┘å ╪Ñ┘ä╪¡╪º╪¡ ┘à╪▓╪╣╪¼.' +
      '\n5) ╪º╪│╪ú┘ä ╪╣┘å: ╪º┘ä┘ü┘â╪▒╪⌐╪î ╪º┘ä┘à╪│╪¬╪«╪»┘à┘è┘å╪î ╪º┘ä┘à┘è╪▓╪º┘å┘è╪⌐╪î ╪º┘ä┘à┘ê╪╣╪» ΓÇö ┘ä┘â┘å ╪¿╪░┘â╪º╪í ┘ê╪¬╪»╪▒┘è╪¼┘è┘ï╪º.' +
      '\n6) ╪╣┘å╪»┘à╪º ╪¬┘â╪¬┘à┘ä ╪º┘ä┘à╪╣┘ä┘ê┘à╪º╪¬╪î ╪º╪╣╪▒╪╢ ╪«╪╖╪⌐ ╪╣┘à┘ä ╪┤╪º┘à┘ä╪⌐ ┘à╪╣ ╪│╪╣╪▒ ╪¬┘é╪»┘è╪▒┘è ┘ê┘à╪▒╪º╪¡┘ä ╪º┘ä╪¬┘å┘ü┘è╪░.' +
      '\n7) ╪¿╪╣╪» ╪º┘ä╪«╪╖╪⌐╪î ╪º╪│╪ú┘ä: "┘ç┘ä ┘å╪¿╪»╪ú ╪º┘ä╪¬┘å┘ü┘è╪░ ╪º┘ä╪ó┘å╪ƒ"' +
      '\n\n' +
      '╪º┘â╪¬╪¿ ╪¿╪º┘ä╪╣╪▒╪¿┘è╪⌐ ╪º┘ä┘ü╪╡╪¡┘ë ╪º┘ä┘ê╪º╪╢╪¡╪⌐. ╪º╪│╪¬╪«╪»┘à ╪ú╪▒┘é╪º┘à┘ï╪º ┘ê┘à╪│╪º┘ü╪º╪¬ ╪¿╪│┘è╪╖╪⌐ ┘ä┘ä╪¬┘å╪│┘è┘é (┘ä╪º Markdown). ┘â┘å ┘à╪«╪¬╪╡╪▒┘ï╪º ┘ê┘ü╪╣╪º┘ä┘ï╪º.' +
      '\n\n┘é┘ê╪º╪╣╪» ┘à┘ç┘à╪⌐:' +
      '\n- ┘ä╪º ╪¬╪░┘â╪▒ ╪ú┘å┘â ╪░┘â╪º╪í ╪º╪╡╪╖┘å╪º╪╣┘è ΓÇö ╪ú┘å╪¬ ┘à╪│╪¬╪┤╪º╪▒ ╪ú╪╣┘à╪º┘ä ┘à╪¡╪¬╪▒┘ü' +
      '\n- ╪▒┘â┘æ╪▓ ╪╣┘ä┘ë ╪º┘ä┘ü╪º╪ª╪»╪⌐ ┘ä┘ä╪╣┘à┘è┘ä ┘ê┘ä┘è╪│ ╪╣┘ä┘ë ╪º┘ä┘à┘à┘è╪▓╪º╪¬' +
      '\n- ╪º╪│╪¬╪«╪»┘à ╪╣╪¿╪º╪▒╪º╪¬ ┘à╪½┘ä: "┘ç╪░┘ç ┘ü╪▒╪╡╪⌐", "╪º┘ä┘ê┘é╪¬ ┘à┘å╪º╪│╪¿", "╪╣┘à┘ä╪º╪ñ┘å╪º ╪¡┘é┘é┘ê╪º"...' +
      '\n- ╪Ñ╪░╪º ╪│╪ú┘ä ╪╣┘å ╪┤┘è╪í ╪«╪º╪▒╪¼ ┘å╪╖╪º┘é ╪º┘ä┘à╪┤╪▒┘ê╪╣╪î ╪ú╪¼╪¿ ╪¿╪Ñ┘è╪¼╪º╪▓ ┘ê╪ú╪╣╪» ╪º┘ä╪¬╪▒┘â┘è╪▓ ┘ä┘ä╪¿┘è╪╣';

    var messages = [{ role: 'system', content: sysPrompt }];
    state.history.forEach(function (m) {
      if (m.role === 'user') messages.push({ role: 'user', content: m.text });
      else if (m.role === 'bot') messages.push({ role: 'assistant', content: m.text });
    });
    messages.push({ role: 'user', content: userText });

    /* 90s hard timeout so the Send button can never stick forever
       (Qwen reasoning model can think for tens of seconds) */
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 90000);

    return fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages,
        stream: false
      }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      }
      throw new Error('Invalid response format');
    });
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
    lines.push('┘à┘ä╪«╪╡ ┘ü┘ç┘à┘è ┘ä┘ä┘à╪┤╪▒┘ê╪╣:');
    lines.push('');
    lines.push('ΓÇó ╪º┘ä┘ü┘â╪▒╪⌐: ' + (a.idea || 'ΓÇö'));
    lines.push('ΓÇó ╪º┘ä┘à╪│╪¬╪«╪»┘à┘ê┘å: ' + (a.users || 'ΓÇö'));
    lines.push('ΓÇó ╪º┘ä┘ê╪╕╪º╪ª┘ü ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐: ' + (a.features || 'ΓÇö'));
    lines.push('ΓÇó ╪º┘ä┘à┘å╪╡╪⌐: ' + (a.platform || 'ΓÇö'));
    lines.push('ΓÇó ╪º┘ä┘à┘è╪▓╪º┘å┘è╪⌐: ' + (a.budget || '┘ä┘à ╪¬┘Å╪¡╪»╪» ╪¿╪╣╪»'));
    lines.push('ΓÇó ╪º┘ä┘à┘ê╪╣╪» ╪º┘ä╪¬┘é╪▒┘è╪¿┘è: ' + (a.timeline || '┘à╪▒┘ê┘å╪⌐ ┘â╪º┘à┘ä╪⌐'));
    lines.push('');
    lines.push('┘ç┘ä ┘ç╪░╪º ╪º┘ä┘ü┘ç┘à ╪╡╪¡┘è╪¡╪ƒ ╪º┘â╪¬╪¿ "┘å╪╣┘à" ┘ä┘ä╪¬╪ú┘â┘è╪»╪î ╪ú┘ê ╪º╪░┘â╪▒ ╪ú┘è ╪¬╪╡╪¡┘è╪¡.');
    return lines.join('\n');
  }

  function buildPlan() {
    var a = state.answers;
    var lines = [];

    lines.push('=== ╪«╪╖╪⌐ ╪º┘ä╪╣┘à┘ä ╪º┘ä┘à┘é╪¬╪▒╪¡╪⌐ ===');
    lines.push('');

    lines.push('1) ┘à┘ä╪«╪╡ ╪º┘ä┘à╪┤╪▒┘ê╪╣');
    lines.push(a.idea || 'ΓÇö');
    lines.push('');

    lines.push('2) ┘å╪╖╪º┘é ╪º┘ä┘å╪│╪«╪⌐ ╪º┘ä╪ú┘ê┘ä┘ë (MVP)');
    if (a.features) {
      a.features.split(/[,╪î;\n]/).forEach(function (f, i) {
        f = f.trim();
        if (f) lines.push('   ' + (i + 1) + '. ' + f);
      });
    } else {
      lines.push('   - ╪¬╪¡╪»┘è╪» ╪º┘ä┘ê╪╕╪º╪ª┘ü ╪º┘ä╪ú╪│╪º╪│┘è╪⌐ ┘à╪╣ ╪º┘ä╪╣┘à┘è┘ä');
    }
    lines.push('');

    lines.push('3) ┘à╪▒╪º╪¡┘ä ╪º┘ä╪¬┘å┘ü┘è╪░');
    lines.push('   ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 1: ╪º┘ä╪¬╪¡┘ä┘è┘ä ┘ê╪º┘ä╪¬╪╡┘à┘è┘à (1-2 ╪ú╪│╪¿┘ê╪╣)');
    lines.push('   ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 2: ╪º┘ä╪¬╪╖┘ê┘è╪▒ ╪º┘ä╪ú╪│╪º╪│┘è (╪¡╪│╪¿ ╪º┘ä┘å╪╖╪º┘é)');
    lines.push('   ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 3: ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ┘ê╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐');
    lines.push('   ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 4: ╪º┘ä╪Ñ╪╖┘ä╪º┘é ┘ê╪º┘ä┘å╪┤╪▒');
    lines.push('');

    lines.push('4) ╪º┘ä╪ú╪»┘ê╪º╪¬ ╪º┘ä┘à┘é╪¬╪▒╪¡╪⌐');
    var plat = (a.platform || '').toLowerCase();
    if (/flutter|┘â┘ä╪º|╪º┘ä╪½┘ä╪º╪½╪⌐|android.*ios|ios.*android/.test(plat)) {
      lines.push('   - Flutter (╪ú┘å╪»╪▒┘ê┘è╪» + iOS ╪¿┘â┘ê╪» ┘ê╪º╪¡╪»)');
      lines.push('   - Firebase (╪º┘ä┘à╪╡╪º╪»┘é╪⌐ + ╪º┘ä┘é┘ê╪º╪╣╪» + ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬)');
    } else if (/android|╪ú┘å╪»╪▒┘ê┘è╪»/.test(plat)) {
      lines.push('   - Kotlin + Jetpack Compose ┘ä┘ä╪ú┘å╪»╪▒┘ê┘è╪»');
      lines.push('   - Firebase ┘ä┘ä┘à╪╡╪º╪»┘é╪⌐ ┘ê╪º┘ä╪¿┘è╪º┘å╪º╪¬');
    } else if (/ios|╪ú┘è┘ü┘ê┘å|╪ó┘è┘ü┘ê┘å/.test(plat)) {
      lines.push('   - Swift + SwiftUI ┘ä┘å╪╕╪º┘à iOS');
      lines.push('   - CloudKit ╪ú┘ê Firebase ┘ä┘ä╪¿╪º┘â ╪Ñ┘å╪»');
    } else if (/┘ê┘è╪¿|┘à┘ê┘é╪╣|web/.test(plat)) {
      lines.push('   - React ╪ú┘ê Next.js ┘ä┘ä┘ê╪º╪¼┘ç╪⌐');
      lines.push('   - Node.js + PostgreSQL ┘ä┘ä╪¿╪º┘â ╪Ñ┘å╪»');
    } else {
      lines.push('   - ╪¡╪│╪¿ ╪º┘ä┘à┘å╪╡╪⌐ ╪º┘ä┘à╪«╪¬╪º╪▒╪⌐ ΓÇö ┘è┘à┘â┘å ╪º┘ä╪¬┘ê╪╡┘è╪⌐ ╪¿╪╣╪» ╪¬╪¡╪»┘è╪»┘ç╪º');
    }
    lines.push('   - Git ┘ä┘ä╪¬╪¡┘â┘à ╪¿╪º┘ä╪Ñ╪╡╪»╪º╪▒╪º╪¬ + Figma ┘ä┘ä╪¬╪╡┘à┘è┘à');
    lines.push('');

    lines.push('5) ╪¬┘é╪»┘è╪▒ ╪º┘ä┘à╪»╪⌐');
    var featCount = a.features ? a.features.split(/[,╪î;\n]/).filter(function (f) { return f.trim(); }).length : 0;
    if (featCount <= 2) lines.push('   - 3 ╪Ñ┘ä┘ë 6 ╪ú╪│╪º╪¿┘è╪╣ (┘å╪╖╪º┘é ╪¿╪│┘è╪╖)');
    else if (featCount <= 4) lines.push('   - 6 ╪Ñ┘ä┘ë 12 ╪ú╪│╪¿┘ê╪╣ (┘å╪╖╪º┘é ┘à╪¬┘ê╪│╪╖)');
    else lines.push('   - 3 ╪Ñ┘ä┘ë 6 ╪ú╪┤┘ç╪▒ (┘å╪╖╪º┘é ┘â╪¿┘è╪▒ ΓÇö ┘è┘Å┘å╪╡╪¡ ╪¿╪¬┘é╪│┘è┘à┘ç ┘ä┘à╪▒╪º╪¡┘ä)');
    lines.push('   * ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢╪º╪¬: ╪¬╪╡┘à┘è┘à ╪¼╪º┘ç╪▓ + ┘à╪▒╪º╪¼╪╣╪⌐ ╪│╪▒┘è╪╣╪⌐ + ┘à┘ê╪º╪▒╪» ┘à╪¬┘ê┘ü╪▒╪⌐');
    lines.push('');

    lines.push('6) ┘å┘é╪º╪╖ ┘à╪º ╪▓╪º┘ä╪¬ ╪¬╪¡╪¬╪º╪¼ ┘é╪▒╪º╪▒┘ï╪º');
    var open = [];
    if (!a.budget || /┘ä┘à ╪ú┘é╪▒╪▒|╪║┘è╪▒/.test(a.budget)) open.push('   - ╪¬╪½╪¿┘è╪¬ ╪º┘ä┘à┘è╪▓╪º┘å┘è╪⌐ ╪º┘ä┘å┘ç╪º╪ª┘è╪⌐');
    if (!a.timeline || /┘à╪▒┘ê┘å╪⌐/.test(a.timeline)) open.push('   - ╪¬╪½╪¿┘è╪¬ ┘à┘ê╪╣╪» ╪º┘ä╪¬╪│┘ä┘è┘à');
    open.push('   - ┘ç┘ê┘è╪⌐ ╪¿╪╡╪▒┘è╪⌐ (╪┤╪╣╪º╪▒ + ╪ú┘ä┘ê╪º┘å)');
    open.push('   - ╪│┘è╪º╪│╪⌐ ╪º┘ä┘à╪¡╪¬┘ê┘ë ┘ê╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à╪╣╪¬┘à╪»╪⌐');
    lines.push(open.join('\n'));
    lines.push('');
    lines.push('=== ┘å┘ç╪º┘è╪⌐ ╪º┘ä╪«╪╖╪⌐ ===');

    return lines.join('\n');
  }

  function localNext(userText) {
    var lower = userText.toLowerCase();

    if (state.phase === 'confirming') {
      if (/┘å╪╣┘à|╪╡╪¡|┘à┘ê╪º┘ü┘é|╪¬┘à╪º┘à|oui|yes|ok/.test(lower)) {
        state.phase = 'planning';
        return Promise.resolve().then(function () {
          addMsg('bot', '┘à┘à╪¬╪º╪▓! ╪¼╪º╪▒┘ì ╪Ñ╪╣╪»╪º╪» ╪«╪╖╪⌐ ╪º┘ä╪╣┘à┘ä ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪Ñ╪¼╪º╪¿╪º╪¬┘â...');
          return delay(1200).then(function () {
            addMsg('plan', buildPlan());
            state.phase = 'done';
            addMsg('bot', '╪º┘å╪¬┘ç╪¬ ╪º┘ä╪«╪╖╪⌐. ┘è┘à┘â┘å┘â ┘â╪¬╪º╪¿╪⌐ ╪ú┘è ╪│╪ñ╪º┘ä ╪ú┘ê ╪╖┘ä╪¿ ╪¬╪╣╪»┘è┘ä.');
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
            addMsg('bot', updated ? '╪¬┘à ╪º┘ä╪¬╪¡╪»┘è╪½. ┘ç╪░╪º ┘à┘ä╪«╪╡ ┘à╪¡╪»╪½:' : '┘ü┘ç┘à╪¬. ┘ç╪░╪º ╪º┘ä┘à┘ä╪«╪╡ ╪º┘ä┘à╪¡╪»╪½:');
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
        addMsg('bot', '╪º┘ä╪«╪╖╪⌐ ╪¼╪º┘ç╪▓╪⌐ ╪ú╪╣┘ä╪º┘ç. ╪Ñ╪░╪º ╪ú╪▒╪»╪¬ ╪¬╪╣╪»┘è┘ä ╪ú┘è ┘å┘é╪╖╪⌐ ╪ú┘ê ╪¿╪»╪í ┘à╪┤╪▒┘ê╪╣ ╪¼╪»┘è╪»╪î ╪º┘â╪¬╪¿ "┘à╪┤╪▒┘ê╪╣ ╪¼╪»┘è╪»".');
        if (/┘à╪┤╪▒┘ê╪╣ ╪¼╪»┘è╪»|╪¼╪»┘è╪»|restart/.test(lower)) {
          resetState();
          addMsg('bot', GREETING);
          return askNext();
        }
      });
    }

    return askNext();
  }

  var GREETING =
    '┘à╪▒╪¡╪¿┘ï╪º ╪¿┘â! ╪ú┘å╪º ┘à╪│╪¬╪┤╪º╪▒┘â ╪º┘ä╪┤╪«╪╡┘è ┘ä╪¬╪╖┘ê┘è╪▒ ╪º┘ä┘à╪┤╪º╪▒┘è╪╣.' +
    '\n\n╪│╪ú╪│╪º╪╣╪»┘â ┘ü┘è:' +
    '\nΓÇó ╪¬╪¡┘ê┘è┘ä ┘ü┘â╪▒╪¬┘â ╪Ñ┘ä┘ë ┘ê╪º┘é╪╣' +
    '\nΓÇó ╪¿┘å╪º╪í ╪«╪╖╪⌐ ╪╣┘à┘ä ╪░┘â┘è╪⌐' +
    '\nΓÇó ╪º╪¬╪«╪º╪░ ╪ú┘ü╪╢┘ä ╪º┘ä┘é╪▒╪º╪▒╪º╪¬' +
    '\n\n╪º┘â╪¬╪¿ ┘ä┘è: ┘à╪º╪░╪º ╪¬╪▒┘è╪» ╪ú┘å ╪¬╪¿┘å┘è╪ƒ (┘ê┘è┘à┘â┘å┘â ╪░┘â╪▒ ╪ú┘è ╪¬┘ü╪º╪╡┘è┘ä ╪¬╪╣╪▒┘ü┘ç╪º ΓÇö ┘à┘å╪╡╪⌐╪î ┘à┘è╪▓╪º┘å┘è╪⌐╪î ┘à╪│╪¬╪«╪»┘à┘è┘å... ┘ê┘ä┘å ╪ú╪│╪ú┘ä┘â ╪╣┘å┘ç╪º ┘à╪¼╪»╪»┘ï╪º)';

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
      showError('╪º┘â╪¬╪¿ ╪┤┘è╪ª┘ï╪º ╪ú┘ê┘ä┘ï╪º.');
      inputEl.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError('╪º┘ä┘å╪╡ ╪╖┘ê┘è┘ä ╪¼╪»┘ï╪º. ╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë ' + MAX_CHARS + ' ╪¡╪▒┘ü┘ï╪º.');
      return;
    }

    if (state.phase === 'done' && /┘à╪┤╪▒┘ê╪╣ ╪¼╪»┘è╪»|╪¼╪»┘è╪»|restart/.test(text.toLowerCase())) {
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

      if (aiMode) {
        addMsg('system', '╪¬╪╣╪░╪▒ ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è. ╪¡╪º┘ê┘ä ┘à╪▒╪⌐ ╪ú╪«╪▒┘ë ╪¿╪╣╪» ┘é┘ä┘è┘ä.');
      } else {
        addMsg('system', '╪¬╪╣╪░╪▒ ╪¬╪¡┘ä┘è┘ä ╪º┘ä╪╖┘ä╪¿ ╪º┘ä╪ó┘å╪î ╪¡╪º┘ê┘ä ┘à╪▒╪⌐ ╪ú╪«╪▒┘ë.');
      }
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
