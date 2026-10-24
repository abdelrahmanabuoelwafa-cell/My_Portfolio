require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Groq API Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.warn('⚠️  GROQ_API_KEY not set. Set it via environment variable.');
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot backend is running' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, systemPrompt, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build messages array for Groq API
    const systemContent = systemPrompt || `You are a helpful AI assistant for Abdelrahman Abdullah's portfolio website. You help visitors learn about Abdelrahman's skills, experience, projects, and services as a Flutter developer. Be friendly, professional, and concise. If asked about contact info, mention: Email: abdelrahman.a.aboelwafa@gmail.com, Phone/WhatsApp: +201060754494. For projects, highlight MovieVerse and Masrofy apps. For services, mention mobile app development, UI/UX design, API integration, and performance optimization.`;
    
    const messages = [
      { role: 'system', content: systemContent },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to get response from AI',
        details: errorData
      });
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

    res.json({ 
      message: aiMessage,
      conversationHistory: [...conversationHistory, 
        { role: 'user', content: message },
        { role: 'assistant', content: aiMessage }
      ]
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Chatbot backend running on http://localhost:${PORT}`);
  console.log(`✓ Using Groq API with llama-3.3-70b-versatile model`);
});
