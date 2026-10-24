"""
Grok AI Chatbot Backend for Portfolio
FastAPI server that proxies requests to Grok API (api.x.ai)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Portfolio Grok Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROK_API_KEY = os.getenv("GROK_API_KEY", "")
GROK_API_URL = "https://api.x.ai/v1/chat/completions"
GROK_MODEL = "grok-3-mini"

SYSTEM_PROMPT = """You are an AI assistant on Abdelrahman Abdullah's portfolio website.
Abdelrahman is a talented Flutter and Full-Stack developer from Cairo, Egypt.

About Abdelrahman:
- Specializes in Flutter cross-platform mobile app development
- Experience with Dart, Firebase, REST APIs, and modern mobile UI/UX
- Built projects like MediMind (AI health assistant), MovieVerse (movie explorer), StudySync
- Completed DEPI (Digital Egypt Pioneers Initiative) and ITI programs
- Available for freelance work and full-time opportunities
- Contact: WhatsApp +201123031944

Your role:
- Answer questions about Abdelrahman's skills, projects, and experience
- Help visitors understand his work
- Encourage hiring or collaboration
- Be friendly, professional, and concise
- Always respond in the same language the user writes in (Arabic or English)"""


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
    return {"status": "Grok Chatbot API is running", "model": GROK_MODEL}

@app.get("/health")
async def health():
    return {"status": "healthy", "api_key_configured": bool(GROK_API_KEY), "model": GROK_MODEL}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not GROK_API_KEY:
        raise HTTPException(status_code=500, detail="GROK_API_KEY not configured in .env file")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in request.history[-10:]:
        if isinstance(msg, dict) and msg.get("role") in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": request.message})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROK_API_URL,
                headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
                json={"model": GROK_MODEL, "messages": messages, "max_tokens": 500, "temperature": 0.7},
            )
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Grok API error: {response.text}")
            data = response.json()
            reply = data["choices"][0]["message"]["content"]
            return ChatResponse(reply=reply)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
