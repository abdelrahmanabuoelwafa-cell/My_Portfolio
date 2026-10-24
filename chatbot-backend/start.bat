@echo off
echo Starting Grok Chatbot Backend...
echo Make sure you have set GROK_API_KEY in .env file
echo.
cd /d "%~dp0"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
