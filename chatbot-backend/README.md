# Portfolio AI Chatbot Backend

Backend server for the AI Business Planner using Groq API (llama-3.3-70b-versatile model).

## Features
- 🤖 Groq AI integration with llama-3.3-70b model
- 🔒 API key protected on server-side (never exposed to frontend)
- 🌐 CORS enabled for local development
- 🌍 Bilingual support (English & Arabic)
- ⚡ Fast response times with Groq's infrastructure

## Setup

### 1. Install Dependencies
```bash
cd chatbot-backend
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will run on `http://localhost:3001`

### 3. Development Mode (with auto-restart)
```bash
npm run dev
```

## API Endpoint

### POST `/api/chat`

**Request Body:**
```json
{
  "message": "I want to build a task management app",
  "systemPrompt": "You are an AI assistant specialized in project planning...",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "message": "AI generated response...",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

## Testing

1. Start the backend server:
```bash
npm start
```

2. Open your portfolio website (index.html)

3. Navigate to the "AI Business Planner" section

4. Fill in your project idea and click "Generate plan"

## Production Deployment

For production, deploy this backend to:
- **Heroku**: `git push heroku main`
- **Vercel**: Use serverless functions
- **Railway**: Connect GitHub repo
- **Your VPS**: Use PM2 or systemd

Then update the `AI_ENDPOINT` in `assets/js/ai-planner.js`:
```javascript
var AI_ENDPOINT = 'https://your-domain.com/api/chat';
```

## Environment Variables (Production)

Create a `.env` file:
```
GROQ_API_KEY=your_groq_api_key_here
PORT=3001
```

Then update `server.js` to use:
```javascript
const GROQ_API_KEY = process.env.GROQ_API_KEY || 'fallback_key';
```

## Security Notes

⚠️ **Important**: 
- Never commit `.env` files with real API keys
- Use environment variables in production
- Enable CORS only for your domain in production
- Add rate limiting for production use

## Troubleshooting

### "AI service is not connected"
- Make sure the backend server is running on port 3001
- Check console for CORS errors
- Verify the API key is valid

### "429 Too Many Requests"
- Groq has rate limits on free tier
- Wait a few seconds and try again
- Consider upgrading to paid tier

## License
MIT
