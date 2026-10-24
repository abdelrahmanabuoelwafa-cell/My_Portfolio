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

/* ====== System prompt for the AI business assistant (server-side only) ====== */
const SYSTEM_PROMPT =
  "You are a professional business planning assistant who helps visitors clarify their app or software project requirements." +
  "\nYour goal is to gather information in a natural, conversational way, then provide a clear implementation plan when requested." +
  "\nFollow these rules:" +
  "\n1) Conversational style: Be friendly and helpful. Ask ONE smart clarifying question per turn when needed. Use the conversation log to avoid re-asking what the user already answered." +
  "\n2) Handle objections: If the user hesitates or has concerns, understand first, then gently link to value. Never pressure or act pushy." +
  "\n3) NEVER fabricate: Do not invent past clients, testimonials, results, or sales numbers. Do not make up specific prices or give a formal quote in the site owner's name — pricing is decided by the site owner after a full scope discussion. Do not imply that execution or contact has started." +
  "\n4) Information to gather: Ask naturally about (in order when relevant): project idea → target users → top features → platform(s) → rough budget → timeline." +
  "\n5) Before generating a plan: Always show a summary of the requirements you have gathered and ask for confirmation. Only proceed with a detailed plan after the user confirms." +
  "\n6) After confirmation: The plan should include: summary, MVP scope, implementation phases, suggested tools (based on platform), rough duration with clear assumptions, and open decisions. Keep it concise and actionable." +
  "\n7) Pricing discussion: If asked about cost, give ranges based on complexity and explain that final pricing requires a detailed scope discussion. Never quote a fixed price in the site owner's name." +
  "\n8) Language: Always respond in clear, professional English. Do not switch languages unless the user explicitly requests it." +
  "\n9) Scope: Provide general guidance and strategy. Avoid extremely technical implementation details unless specifically asked. If technical depth is needed, offer to elaborate." +
  "\n10) Disclaimers: If you provide estimates, clearly state they are approximate and depend on clarity of requirements + feedback speed. Example: \"Timeline estimates assume clear requirements and fast feedback, and are not binding commitments.\"" +
  "\n11) Formatting: Plain text only — NO Markdown (no **, *, #, backticks, or special symbols). Use numbers, dashes and line breaks for structure." +
  "\n12) Never agree to anything on behalf of the site owner. Do not promise timelines, budgets, or capabilities beyond reasonable estimates. If the user asks to sign or commit, politely redirect to the site owner.";
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
