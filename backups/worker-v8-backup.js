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

/* ====== تنسيقات الحماية (عدّلها هنا عند الحاجة) ====== */
const ALLOWED_ORIGINS = new Set([
  "https://my-portfolio.mohammed-galalxc1.workers.dev",     // الأساسي (موقعك الحالي)
  "https://abdelrahmanabuoelwafa-cell.github.io"            // نسخة GitHub Pages (Origin إضافي)
]);

const ALLOWED_MODEL = "openai/gpt-oss-120b"; // ثابت في السيرفر — حقل model من العميل مرفوض أصلاً
const MAX_BODY_BYTES = 32 * 1024;            // 32KB — تُقاس بالبايت أثناء القراءة
const MAX_MESSAGES = 40;                     // عدد الرسائل (بدون system — فهي مرفوضة)
const MAX_CONTENT_CHARS = 6000;              // أطول رسالة مفردة
const MAX_TOTAL_CHARS = 50000;               // مجموع أطوال كل الرسائل
const MAX_OUTPUT_TOKENS = 1024;              // سقف طول رد النموذج (عند Groq)
const MAX_RESPONSE_BYTES = 64 * 1024;        // سقف حجم الرد المُعاد من السيرفر
const UPSTREAM_TIMEOUT_MS = 30000;           // مهلة استدعاء Groq

/* عتبة تنعيم تقريبية فقط — ليست حدًا مضمونًا (انظر دالة approximateThrottle) */
const SOFT_WINDOW_MS = 60 * 1000;
const SOFT_LIMIT_PER_MIN = 15;
/* لا يُضاف أي إعداد Rate Limiting binding (مدفوع أو غير مدفوع) إلا بموافقة صاحب الموقع. */
/* ======================================================== */

/* ====== تعليمات المساعد — محددة هنا في السيرفر فقط ====== */
const SYSTEM_PROMPT =
  "أنت مساعد أعمال تفاعلي في موقع مطوّر تطبيقات. قواعدك:" +
  "\n1) التحية والبناء: ابدأ بتحية ودودة، واكتشف احتياج العميل الحقيقي بسؤال توضيحي واحد ذكي في كل رد." +
  "\n2) الذاكرة: اعتمد على سجل المحادثة المرفق — لا تسأل العميل مرة أخرى عمّا أجاب عنه سابقًا." +
  "\n3) الاقناع عند التردد أو الاعتراض (غالي، هفكر، مش متأكد): افهم اعتراضه أولًا، ثم اربط قيمة منتجه بمشكلته الشخصية، وأعد صياغة التكلفة كاستثمار — بلا إلحاح مزعج." +
  "\n4) المصداقية: ممنوع منعًا باتًا اختلاق عملاء سابقين أو شهادات أو نتائج أو أرقام مبيعات أو تجارب غير موثقة. إن لم تتوفر بيانات موثوقة من صاحب الموقع، لا تذكرها إطلاقًا." +
  "\n5) تجميع المتطلبات: اسأل تدريجيًا عن: الفكرة، المستخدمين، الوظائف، المنصة، الميزانية التقريبية، الموعد." +
  "\n6) قبل الخطة: عندما تكتمل المعلومات، اعرض ملخصًا لمتطلبات العميل في نقاط واضحة واطلب التأكيد أو التعديل — ولا تعرض الخطة قبل التأكيد." +
  "\n7) بعد التأكيد فقط: اعرض خطة عمل تشمل (ملخص، نطاق MVP، مراحل التنفيذ، الأدوات المقترحة، مدة تقديرية، نقاط مفتوحة)." +
  "\n8) التسعير: لا تخترع أسعارًا ولا تقدّم عرض سعرًا رسميًا باسم صاحب الموقع. إن سأل العميل عن السعر، وضّح أن التسعير يحدده صاحب الموقع مباشرة ويحتاج مراجعة وتواصلًا معه." +
  "\n9) المدة: تقديرية دائمًا مع ذكر الافتراضات صراحة (مثال: تصميم جاهز + مراجعة سريعة + موارد متوفرة)." +
  "\n10) الخاتمة: لا توحي بأن التنفيذ أو التواصل قد بدأ. استخدم عبارات مثل: \"يمكنك إرسال هذا الملخص لصاحب الموقع لمراجعة التنفيذ والتسعير.\" ولا تدّعِ أنك حفظت أو أرسلت الطلب — لا توجد وظيفة لذلك فعلًا." +
  "\n11) الأسلوب: عربية فصحى واضحة، بلا Markdown (أرقام ومسافات فقط)، مختصر وفعال. لا تذكر أنك ذكاء اصطناعي — أنت مستشار أعمال." +
  "\n12) إذا سأل عن شيء خارج نطاق المشروع، أجب بإيجاز وأعد التركيز لاحتياجه.";
/* ======================================================== */

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

/* كل ردود JSON يمرّ من هنا: Vary: Origin دائمًا، وACAO فقط لو Origin مسموح */
function jsonRes(origin, status, obj) {
  const headers = { "Content-Type": "application/json", "Vary": "Origin" };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(JSON.stringify(obj), { status: status, headers: headers });
}

/* رفض بلا ACAO (Origin غريب أو غير موجود) — Vary: Origin موجود */
function rejectRes(status) {
  return new Response(null, { status: status, headers: { "Vary": "Origin" } });
}

/* قراءة محدودة بالبايت أثناء الـstream:
   بخلاف request.text() الذي يخزّن الجسم كاملًا في الذاكرة قبل أي فحص،
   هذه الدالة توقف القراءة وتُلغي الـstream فور تجاوز الحد → الذاكرة محصورة
   بحد MAX_BODY_BYTES (ومحدودة أيضًا بحدود منصة Cloudflare لحجم الطلب). */
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
      try { await reader.cancel(); } catch (e) { /* لا شيء */ }
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

/* حماية تنعيم تقريبية (best-effort) — وليست عدّادًا مضمونًا:
   - قراءة/كتابة غير ذرّية: طلبات متزامنة قد تقرأ نفس العدد ثم تكتب
     فوق بعضها فلا تُحتسب زيادة.
   - قد تُصفّر النافذة بتغيّر PoP أو نفاذ/إبطال الكاش.
   - لا تُعَد خطًا دفاعيًا أمنيًا؛ الحد الفعلي يبقى على Groq
     (30 طلب/دقيقة و1000/يوم على مستوى حسابك).
   - البديل الأقوى (Rate Limiting binding) لا يُضاف إلا بموافقة صاحب الموقع. */
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
  } catch (e) { /* نافذة جديدة */ }
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

    /* --- CORS: أصل مسموح فقط، بلا wildcard، Vary: Origin دائمًا --- */
    if (request.method === "OPTIONS") {
      if (origin && !originOk) return rejectRes(403);
      if (originOk) return new Response(null, { status: 204, headers: corsHeaders(origin) });
      return new Response(null, { status: 204, headers: { "Vary": "Origin" } });
    }

    if (request.method !== "POST") {
      return jsonRes(echoOrigin, 405, { error: "Method not allowed" });
    }

    /* متصفح من نطاق غريب → رفض بلا ACAO */
    if (origin && !originOk) return rejectRes(403);

    /* --- تنعيم تقريبي (غير مضمون — انظر التعليقات) --- */
    const rl = await approximateThrottle(request);
    if (!rl.allowed) {
      const h = { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter), "Vary": "Origin" };
      if (echoOrigin) Object.assign(h, corsHeaders(echoOrigin));
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: h });
    }

    if (!env.GROQ_API_KEY) {
      return jsonRes(echoOrigin, 500, { error: "Server configuration error" });
    }

    /* --- Content-Type: application/json بدقة (يُسمح بمعامل charset اختياري فقط) --- */
    const rawCT = request.headers.get("Content-Type") || "";
    const mediaType = rawCT.split(";")[0].trim().toLowerCase();
    if (mediaType !== "application/json") {
      return jsonRes(echoOrigin, 400, { error: "Content-Type must be application/json" });
    }

    /* --- قراءة محدودة بالبايت أثناء الـstream --- */
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

    /* --- الجسم يقبل حقل messages فقط: لا model، لا حقول إضافية مؤثرة --- */
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

    /* --- التحقق من كل رسالة: أدوار، نص فقط، بلا حقول إضافية، ورفض system --- */
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

    /* --- التسلسل المنطقي: تناوب user/assistant صارم + الرسالة الأخيرة user --- */
    for (let i = 1; i < clean.length; i++) {
      if (clean[i].role === clean[i - 1].role) {
        return jsonRes(echoOrigin, 400, { error: "Messages must alternate between user and assistant" });
      }
    }
    if (clean[clean.length - 1].role !== "user") {
      return jsonRes(echoOrigin, 400, { error: "Last message must be from user" });
    }

    /* system prompt من السيرفر في الصدارة دائمًا */
    const finalMessages = [{ role: "system", content: SYSTEM_PROMPT }].concat(clean);

    /* --- استدعاء Groq: موديل ثابت + مهلة + ترجمة أخطاء --- */
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
      /* رقم الحالة فقط في الـlogs — لا مفاتيح ولا محتوى محادثات */
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

    /* --- فحص شكل وحجم الرد من المزود قبل إرجاعه --- */
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

    /* نعيد حقولًا محدودة ومحددة فقط (sanitize) ثم نفحص الحجم النهائي */
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
