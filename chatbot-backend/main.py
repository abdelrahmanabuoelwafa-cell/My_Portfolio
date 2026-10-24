"""
AI Chatbot Backend for Portfolio
FastAPI server that supports Google Gemini API (gemini-3.8-flash) & Grok API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Portfolio AI Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROK_API_KEY = os.getenv("GROK_API_KEY", "")

SYSTEM_PROMPT = """You are Abdelrahman Abdullah's AI portfolio assistant.
Abdelrahman is an expert Flutter & Mobile Application Developer based in Cairo, Egypt.

Key Details about Abdelrahman:
- Specialization: Cross-platform mobile apps with Flutter & Dart, Clean Architecture, BLoC / Provider / Hive.
- Featured Apps:
  1. MovieVerse — Cinema streaming & discovery app powered by TMDB API, Firebase & Hive offline caching.
  2. Masrofy — Smart personal finance tracker with live FL Chart analytics and on-device Hive storage.
  3. MediMind & StudySync — AI health companion and smart study planner.
- Background: DEPI (Digital Egypt Pioneers Initiative) and ITI graduate.
- Contact: WhatsApp/Phone: +201123031944 / +201060754494, Email: abdelrahman.a.aboelwafa@gmail.com
- Work status: Available for freelance projects and full-time mobile development roles.

Guidelines:
- Respond in the same language the visitor uses (Arabic or English).
- Be polite, professional, concise, and enthusiastic.
- Help visitors explore projects, get in touch, or discuss app development inquiries."""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list = []

class ChatResponse(BaseModel):
    reply: str


@app.get("/")
async def root():
    return {
        "status": "Portfolio AI Chatbot is running",
        "gemini_ready": bool(GEMINI_API_KEY),
        "grok_ready": bool(GROK_API_KEY)
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "gemini_ready": bool(GEMINI_API_KEY),
        "grok_ready": bool(GROK_API_KEY)
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_msg = request.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Priority 1: Google Gemini API
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={GEMINI_API_KEY}"
            
            # Format chat history
            contents = [
                {"role": "user", "parts": [{"text": f"{SYSTEM_PROMPT}\n\nPlease acknowledge and assist the user."}]},
                {"role": "model", "parts": [{"text": "Understood. I am ready to represent Abdelrahman and assist the visitor."}]}
            ]
            
            for msg in request.history[-8:]:
                if isinstance(msg, dict) and msg.get("role") and msg.get("content"):
                    role = "user" if msg["role"] == "user" else "model"
                    contents.append({"role": role, "parts": [{"text": msg["content"]}]})
            
            contents.append({"role": "user", "parts": [{"text": user_msg}]})

            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 600
                }
            }

            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and candidates[0].get("content", {}).get("parts"):
                        reply_text = candidates[0]["content"]["parts"][0].get("text", "")
                        return ChatResponse(reply=reply_text.strip())
                else:
                    print(f"Gemini API error: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"Gemini error: {e}")

    # Priority 2: Grok API
    if GROK_API_KEY:
        try:
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            for msg in request.history[-8:]:
                if isinstance(msg, dict) and msg.get("role") in ("user", "assistant"):
                    messages.append({"role": msg["role"], "content": msg["content"]})
            messages.append({"role": "user", "content": user_msg})

            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
                    json={"model": "grok-3-mini", "messages": messages, "max_tokens": 500, "temperature": 0.7},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    reply = data["choices"][0]["message"]["content"]
                    return ChatResponse(reply=reply.strip())
        except Exception as e:
            print(f"Grok error: {e}")

    raise HTTPException(status_code=500, detail="AI Service is currently unavailable. Please verify API keys.")
