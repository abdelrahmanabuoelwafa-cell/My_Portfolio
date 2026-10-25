# 🚀 Quick Start Guide

## تشغيل الـ AI Chatbot في 3 خطوات

### 1️⃣ تثبيت المكتبات
```bash
cd chatbot-backend
npm install
```

### 2️⃣ تشغيل الخادم
```bash
npm start
```

ستشوف الرسالة دي:
```
✓ Chatbot backend running on http://localhost:3001
✓ Using Groq API with llama-3.3-70b-versatile model
```

### 3️⃣ افتح الموقع
افتح `index.html` في المتصفح أو شغّل live server:
```bash
# في VS Code: اضغط Right-click على index.html → Open with Live Server
# أو استخدم أي HTTP server
python -m http.server 8000
```

روح لسكشن **"AI Business Planner"** (تحت Pricing) واكتب فكرة مشروعك!

---

## 🧪 اختبار سريع

### Test 1: Health Check
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{"status":"ok","message":"Chatbot backend is running"}
```

### Test 2: Send a Message
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to build a fitness tracking app",
    "systemPrompt": "You are a project planning assistant."
  }'
```

**Expected Response:**
```json
{
  "message": "Here's a structured plan for your fitness tracking app:\n\n1) Project summary\n...",
  "conversationHistory": [...]
}
```

---

## 🔧 Troubleshooting

### ❌ "GROQ_API_KEY not set"
**الحل:** الـ `.env` file موجود وفيه الـ API key:
```bash
cat .env
# يجب أن يظهر:
GROQ_API_KEY=gsk_...
```

### ❌ "AI service is not connected"
**الحل:** 
1. تأكد إن الخادم شغال على port 3001
2. افتح `http://localhost:3001/health` في المتصفح
3. لو مش شغال، شغّله بـ `npm start`

### ❌ CORS Error
**الحل:** افتح الموقع من HTTP server (مش file://)
```bash
# استخدم واحد من دول:
python -m http.server 8000
# أو
npx http-server
# أو VS Code Live Server
```

### ❌ "429 Too Many Requests"
**الحل:** Groq عنده rate limits. استنى 10-20 ثانية وحاول تاني.

---

## 📝 مثال استخدام كامل

**في الموقع:**

1. روح لسكشن **"AI Business Planner"**
2. اكتب فكرة المشروع:
   ```
   تطبيق توصيل طعام للمطاعم المحلية
   ```
3. (اختياري) املا:
   - الجمهور المستهدف: `أصحاب مطاعم، عملاء جياع`
   - المنصة: `Mobile`
   - المميزات: `تسجيل دخول، طلبات، دفع، تتبع`
   - الميزانية: `Medium`
   - الجدول الزمني: `3-4 months`
4. اضغط **"Generate plan"**
5. انتظر 5-15 ثانية
6. ستظهر خطة مفصلة بـ 9 أقسام!

---

## 🌍 Production Deployment

لو عايز تنشر الموقع على الإنترنت:

### خيار 1: Railway (الأسهل)
1. اعمل حساب على [Railway.app](https://railway.app)
2. اضغط "New Project" → "Deploy from GitHub"
3. اختار الـ repo
4. اضغط "Add variables" وحط `GROQ_API_KEY`
5. Railway هيدّيك URL زي `https://your-app.railway.app`
6. غيّر في `assets/js/ai-planner.js`:
   ```javascript
   var AI_ENDPOINT = 'https://your-app.railway.app/api/chat';
   ```

### خيار 2: Render
نفس الخطوات، بس على [Render.com](https://render.com)

### خيار 3: VPS خاص
```bash
ssh user@your-server
cd /var/www/chatbot-backend
npm install
npm install -g pm2
pm2 start server.js --name "portfolio-ai"
pm2 save
```

---

## 💡 Tips

- الـ AI بيفهم عربي وإنجليزي
- كل ما تكون فكرتك أوضح، الخطة أحسن
- لو الرد طويل جدًا، قلّل التفاصيل في الـ prompt
- الموديل المستخدم: **llama-3.3-70b-versatile** (من أقوى الموديلات المفتوحة)

---

## 📞 Support

لو عندك مشكلة:
1. شوف الـ console في المتصفح (F12)
2. شوف logs الخادم في Terminal
3. تأكد الـ API key صحيح وفعّال

**Email:** abdelrahman.a.aboelwafa@gmail.com
