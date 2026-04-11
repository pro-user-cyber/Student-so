import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ FIX: PROPER PORT HANDLING - Render/Deployment SAFE
const PORT = process.env.PORT || 3000;

console.log(`🚀 Starting server on PORT: ${PORT}`);

// ✅ SECURE CORS - ONLY your domains
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://pro-user-cyber.github.io',
    'https://pro-user-cyber.github.io/Student-so'
  ],
  credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));

// ✅ Rate limiting - ONLY chat endpoint
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many requests. Try again in 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000 // 30s timeout
});

// ✅ Health check - CRITICAL for deployments
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    openai: !!process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// ✅ Chat API
app.post('/api/chat', limiter, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    const cleanMessage = message.trim().slice(0, 2000);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful student assistant. Keep responses concise and educational.' },
        { role: 'user', content: cleanMessage }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || 
                  'Sorry, I could not generate a response.';

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI error:', error.message);
    
    // Better error handling
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limited by OpenAI. Please wait.' });
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key configuration.' });
    }
    if (error.status >= 500) {
      return res.status(503).json({ error: 'AI service temporarily unavailable.' });
    }
    
    res.status(500).json({ error: 'AI processing error occurred' });
  }
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Proper error handler (4 params)
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 🔥 PROPER LISTEN - Render/Deployment SAFE
app.listen(PORT, () => {
  console.log(`🚀 Server running successfully on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Ready for production deployment!`);
});
