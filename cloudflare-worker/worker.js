/* my-ai-proxy — Secure AI proxy for Groq (Cloudflare Worker)
   ----------------------------------------------------------
   - CORS: allowlist only (no wildcards); Vary: Origin on EVERY response;
     Access-Control-Allow-Origin echoed only for allowlisted origins
   - System prompt lives HERE. Client "system" messages are REJECTED (400)
   - Client body accepts ONLY { messages } with role/content keys; no
     alternate prompt, no extra fields, model fixed server-side
   - Body read is byte-limited DURING stream read (not after full buffering)
   - Strict conversation sequence: alternates user/assistant, ends with user
   - Output capped (max_tokens) + response size/shape checked before return
   - Soft per-IP throttle via Cache API: APPROXIMATE only, NOT a guaranteed
     counter (non-atomic, races possible) — see note at the constant
   - Upstream timeout 30s; upstream 429/401/403/timeout mapped to clear
     generic statuses; NEVER logs keys or conversation content
*/

/* ====== CORS allowlist (update with your deployed origin(s)) ====== */
const ALLOWED_ORIGINS = new Set([
  "https://my-portfolio.mohammed-galalxc1.workers.dev",     // Workers deployment (for local testing)
  "https://abdelrahmanabuoelwafa-cell.github.io"            // GitHub Pages origin (update as needed)
]);

const ALLOWED_MODEL = "openai/gpt-oss-120b"; // Free-tier model; server-side constant to avoid client misuse
const MAX_BODY_BYTES = 32 * 1024;            // 32KB — reasonable for chat request payloads
const MAX_MESSAGES = 40;                     // Max number of messages (excluding system to keep token count low)
const MAX_CONTENT_CHARS = 6000;              // Max chars per message content
const MAX_TOTAL_CHARS = 50000;               // Total chars across all messages
const MAX_OUTPUT_TOKENS = 1024;              // Max tokens for AI response (capped at Groq's limits)
const MAX_RESPONSE_BYTES = 64 * 1024;        // Max bytes for response body (capped for safety)
const UPSTREAM_TIMEOUT_MS = 30000;           // 30s timeout for Groq upstream

/* Soft throttle config (best-effort) — runs on Cache API for approximate rate limiting.
   NOTE: This is NOT a guaranteed counter. For production-grade rate limiting, add
   a Durable Object or Rate Limiting binding (requires upgrade). */
const SOFT_WINDOW_MS = 60 * 1000;
const SOFT_LIMIT_PER_MIN = 15;
/* ======================================================== */

/* ====== System prompt for the AI assistant (server-side only) ====== */
const SYSTEM_PROMPT =
  "You are a highly professional, multilingual AI assistant representing Abdelrahman Abdullah, a Flutter developer and software engineer." +
  "\n\nYour Role:" +
  "\n- You are the primary point of contact for clients visiting the portfolio website." +
  "\n- You speak any language fluently (Arabic, English, or others based on user preference)." +
  "\n- You have exceptional persuasion and communication skills." +
  "\n- You combine general conversation assistance with advanced sales capabilities." +
  "\n\nCommunication Style:" +
  "\n- Formal, professional, yet warm and approachable." +
  "\n- Clear, concise, and direct responses." +
  "\n- Use persuasive language that builds trust and credibility." +
  "\n- Adapt your tone to match the user's language and formality level." +
  "\n\nCapabilities:" +
  "\n1) General Conversation: Answer questions about Abdelrahman's services, skills, experience, technology stack, and work philosophy." +
  "\n2) Sales & Business Development: Engage clients, understand their needs, explain value propositions, and guide them toward collaboration." +
  "\n3) Professional Planning: Create detailed, professional implementation plans based on client requirements when requested." +
  "\n\nPlanning Process (when a client needs a project plan):" +
  "\n- Ask smart, clarifying questions to understand: project idea, target users, key features, platform(s), budget range, timeline." +
  "\n- Show a summary of requirements and ask for confirmation before creating a detailed plan." +
  "\n- After confirmation, provide: project overview, MVP scope, implementation phases, recommended tech stack, timeline with assumptions, and open decisions." +
  "\n\nStrict Safety Rules (NEVER violate these):" +
  "\n- DO NOT fabricate past clients, testimonials, case studies, or specific results." +
  "\n- DO NOT provide formal price quotes in Abdelrahman's name. Pricing is decided after full scope discussion. You may give rough ranges based on complexity." +
  "\n- DO NOT promise specific deadlines, budgets, or outcomes. Use phrases like \"typically,\" \"approximately,\" \"depending on scope.\"" +
  "\n- DO NOT imply that execution, contact, or agreement has started. Direct formal commitments to Abdelrahman." +
  "\n- DO NOT invent statistics, metrics, or performance data." +
  "\n\nInformation You Know (about Abdelrahman):" +
  "\n- Flutter developer and software engineer" +
  "\n- Specializes in mobile app development (Android, iOS)" +
  "\n- Experience with: Flutter, Dart, Firebase, REST APIs, Git, UI/UX design" +
  "\n- Education: B.Sc. Computer Science & AI at MTI (2024-2028)" +
  "\n- Training: ITI, DEPI programs" +
  "\n- Approach: Focus on clean code, performance, and user experience" +
  "\n\nResponse Guidelines:" +
  "\n- Always respond in the user's preferred language (match their language)." +
  "\n- Be helpful, informative, and persuasive without being pushy." +
  "\n- If you don't know specific details, admit it honestly and offer to connect the user with Abdelrahman." +
  "\n- Use Markdown for lists and structure when it improves readability." +
  "\n- Keep responses concise but comprehensive." +
  "\n\nError Handling:" +
  "\n- If a user asks for something outside your scope (e.g., \"sign a contract now\"), politely redirect: \"I can help you prepare, but formal agreements are handled directly by Abdelrahman. Would you like me to facilitate an introduction?\"" +
  "\n- If asked about sensitive topics (internal processes, personal information beyond portfolio), maintain professional boundaries.";
/* ======================================================== */

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

/* JSON response with or without ACAO based on origin; Vary: Origin always added */
function jsonRes(origin, status, obj) {
  const headers = { "Content-Type": "application/json", "Vary": "Origin" };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(JSON.stringify(obj), { status: status, headers: headers });
}

/* Reject response WITHOUT ACAO (foreign origin or other rejected request) but with Vary: Origin */
function rejectRes(status) {
  return new Response(null, { status: status, headers: { "Vary": "Origin" } });
}

/* Byte-limited body reader for request body (same as reading a stream):
   Instead of request.text() which buffers the entire request first, we stream-read
   and abort early if size exceeds MAX_BODY_BYTES (prevents memory issues and large attacks).
   This also works if request.body is missing (non-streamed fetcher). */
async function readBodyLimited(request, maxBytes) {
  const declared = request.headers.get("Content-Length");
  if (declared !== null && declared !== "" && Number(declared) > maxBytes) {
    return { tooLarge: true };
  }
  if (!request.body || typeof request.body.getReader !== "function") {
    const text = await request.text();
    const bytes = new TextEncoder().encode(text).byteLength;
    return bytes > maxBytes ? { tooLarge: true } : { text: text, bytes: bytes };
  }
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch (e) { /* ignore */ }
      return { tooLarge: true };
    }
    chunks.push(result.value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    merged.set(chunks[i], offset);
    offset += chunks[i].byteLength;
  }
  return { text: new TextDecoder().decode(merged), bytes: total };
}

/* Approximate rate limiting (best-effort) — not guaranteed accurate due to:
   - Cache consistency issues at the edge
   - No atomic increment/decrement operations
   - Possible race conditions at PoP or geographic distribution
   - Higher rate could still bypass if requests hit different edges
   This is sufficient for abuse mitigation but not for strict billing controls. */
async function approximateThrottle(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const keyUrl = "https://ratelimit.internal/" + ip;
  const cache = caches.default;
  const now = Date.now();
  let count = 1;
  let start = now;
  try {
    const hit = await cache.match(keyUrl);
    if (hit) {
      const data = await hit.json();
      if (now - data.start < SOFT_WINDOW_MS) {
        count = data.count + 1;
        start = data.start;
      }
    }
  } catch (e) { /* cache miss or error */ }
  if (count > SOFT_LIMIT_PER_MIN) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((start + SOFT_WINDOW_MS - now) / 1000)) };
  }
  await cache.put(keyUrl, new Response(JSON.stringify({ count: count, start: start }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "max-age=60" }
  }));
  return { allowed: true };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const originOk = origin !== null && ALLOWED_ORIGINS.has(origin);
    const echoOrigin = originOk ? origin : null;

    /* --- CORS: handle preflight first, reject foreign origins --- */
    if (request.method === "OPTIONS") {
      if (origin && !originOk) return rejectRes(403);
      if (originOk) return new Response(null, { status: 204, headers: corsHeaders(origin) });
      return new Response(null, { status: 204, headers: { "Vary": "Origin" } });
    }

    if (request.method !== "POST") {
      return jsonRes(echoOrigin, 405, { error: "Method not allowed" });
    }

    /* Reject foreign origins (non-wildcard, no ACAO) */
    if (origin && !originOk) return rejectRes(403);

    /* --- Soft rate limiting (best-effort, runs on Cache API) --- */
    const rl = await approximateThrottle(request);
    if (!rl.allowed) {
      const h = { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter), "Vary": "Origin" };
      if (echoOrigin) Object.assign(h, corsHeaders(echoOrigin));
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: h });
    }

    if (!env.GROQ_API_KEY) {
      return jsonRes(echoOrigin, 500, { error: "Server configuration error" });
    }

    /* --- Content-Type: application/json strict (no charset parameter in strict check) --- */
    const rawCT = request.headers.get("Content-Type") || "";
    const mediaType = rawCT.split(";")[0].trim().toLowerCase();
    if (mediaType !== "application/json") {
      return jsonRes(echoOrigin, 400, { error: "Content-Type must be application/json" });
    }

    /* --- Byte-limited body read for request payload --- */
    const read = await readBodyLimited(request, MAX_BODY_BYTES);
    if (read.tooLarge) {
      return jsonRes(echoOrigin, 413, { error: "Payload too large" });
    }

    let body;
    try {
      body = JSON.parse(read.text);
    } catch (e) {
      return jsonRes(echoOrigin, 400, { error: "Invalid JSON" });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonRes(echoOrigin, 400, { error: "Invalid body" });
    }

    /* --- Strict field validation: only 'messages' allowed, no model, no extra fields --- */
    const bodyKeys = Object.keys(body);
    for (let i = 0; i < bodyKeys.length; i++) {
      if (bodyKeys[i] !== "messages") {
        return jsonRes(echoOrigin, 400, { error: "Unknown field: " + bodyKeys[i] });
      }
    }

    const rawMessages = body.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0 || rawMessages.length > MAX_MESSAGES) {
      return jsonRes(echoOrigin, 400, { error: "messages must be an array of 1-" + MAX_MESSAGES });
    }

    /* --- Strict message validation: only role + content, alternating, no system from client --- */
    let total = 0;
    const clean = [];
    for (let i = 0; i < rawMessages.length; i++) {
      const m = rawMessages[i];
      if (!m || typeof m !== "object" || Array.isArray(m)) {
        return jsonRes(echoOrigin, 400, { error: "Invalid message format" });
      }
      if (m.role === "system") {
        return jsonRes(echoOrigin, 400, { error: "system messages are not allowed; instructions come from the server" });
      }
      if (m.role !== "user" && m.role !== "assistant") {
        return jsonRes(echoOrigin, 400, { error: "Invalid role" });
      }
      const mKeys = Object.keys(m);
      for (let k = 0; k < mKeys.length; k++) {
        if (mKeys[k] !== "role" && mKeys[k] !== "content") {
          return jsonRes(echoOrigin, 400, { error: "Unknown message field: " + mKeys[k] });
        }
      }
      if (typeof m.content !== "string" || m.content.trim().length === 0) {
        return jsonRes(echoOrigin, 400, { error: "Message content must be non-empty text" });
      }
      if (m.content.length > MAX_CONTENT_CHARS) {
        return jsonRes(echoOrigin, 400, { error: "Message exceeds " + MAX_CONTENT_CHARS + " chars" });
      }
      if (m.content.indexOf("\u0000") !== -1) {
        return jsonRes(echoOrigin, 400, { error: "Invalid characters" });
      }
      total += m.content.length;
      clean.push({ role: m.role, content: m.content });
    }
    if (total > MAX_TOTAL_CHARS) {
      return jsonRes(echoOrigin, 400, { error: "Conversation exceeds " + MAX_TOTAL_CHARS + " chars" });
    }

    /* --- Strict alternation: must alternate user/assistant and end with user --- */
    for (let i = 1; i < clean.length; i++) {
      if (clean[i].role === clean[i - 1].role) {
        return jsonRes(echoOrigin, 400, { error: "Messages must alternate between user and assistant" });
      }
    }
    if (clean[clean.length - 1].role !== "user") {
      return jsonRes(echoOrigin, 400, { error: "Last message must be from user" });
    }

    /* system prompt added server-side (not exposed to client) */
    const finalMessages = [{ role: "system", content: SYSTEM_PROMPT }].concat(clean);

    /* --- Upstream call to Groq: fetch with timeout, auth, and error handling --- */
    let resp;
    try {
      resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + env.GROQ_API_KEY
        },
        body: JSON.stringify({
          model: ALLOWED_MODEL,
          messages: finalMessages,
          stream: false,
          max_tokens: MAX_OUTPUT_TOKENS
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      });
    } catch (e) {
      const name = e && e.name ? e.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        console.error("upstream_timeout");
        return jsonRes(echoOrigin, 504, { error: "AI request timed out" });
      }
      console.error("upstream_fetch_failed");
      return jsonRes(echoOrigin, 502, { error: "AI service unavailable" });
    }

    if (!resp.ok) {
      /* Log status but never log request body or response body (avoid exposing key or conversation) */
      console.error("upstream_error status=" + resp.status);
      if (resp.status === 429) {
        const retry = resp.headers.get("Retry-After") || "60";
        const h = { "Content-Type": "application/json", "Retry-After": retry, "Vary": "Origin" };
        if (echoOrigin) Object.assign(h, corsHeaders(echoOrigin));
        return new Response(JSON.stringify({ error: "AI provider busy" }), { status: 429, headers: h });
      }
      if (resp.status === 401 || resp.status === 403) {
        return jsonRes(echoOrigin, 500, { error: "Server configuration error" });
      }
      return jsonRes(echoOrigin, 502, { error: "AI service unavailable" });
    }

    /* --- Parse and validate response shape before returning --- */
    let data;
    try {
      data = await resp.json();
    } catch (e) {
      console.error("upstream_bad_json");
      return jsonRes(echoOrigin, 502, { error: "AI service unavailable" });
    }
    const choice = data && data.choices && data.choices[0];
    const content = choice && choice.message && choice.message.content;
    if (typeof content !== "string" || content.length === 0) {
      console.error("upstream_unexpected_shape");
      return jsonRes(echoOrigin, 502, { error: "AI service unavailable" });
    }
    if (content.length > MAX_TOTAL_CHARS) {
      console.error("upstream_oversized_response");
      return jsonRes(echoOrigin, 502, { error: "AI service unavailable" });
    }

    /* Return sanitized response (strip any extra fields from response for safety) */
    const out = {
      choices: [{
        index: 0,
        message: { role: "assistant", content: content },
        finish_reason: typeof choice.finish_reason === "string" ? choice.finish_reason : "stop"
      }],
      model: typeof data.model === "string" ? data.model : ALLOWED_MODEL
    };
    const outBytes = new TextEncoder().encode(JSON.stringify(out)).byteLength;
    if (outBytes > MAX_RESPONSE_BYTES) {
      console.error("upstream_oversized_response");
      return jsonRes(echoOrigin, 502, { error: "AI service unavailable" });
    }
    return jsonRes(echoOrigin, 200, out);
  }
};
