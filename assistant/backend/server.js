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

const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is missing! Server cannot start.');
  process.exit(1);
}

console.log(`🚀 Starting server on PORT: ${PORT}`);

// ✅ CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://pro-user-cyber.github.io'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// 🔥 FIXED: Tighter rate limit (protects OpenAI, not just your server)
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // ↓ REDUCED from 30 → 10 (Render cold start protection)
  message: { error: 'Too many requests. Try again in 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔥 SAFER MODEL - Works for all accounts
const MODEL = 'gpt-4o-mini'; // ✅ Confirmed: available to all paid API keys

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45000  // ↑ Increased for Render cold starts
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    openai: !!process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    model: MODEL,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// 🔥 CHAT API - FULLY FIXED
app.post('/api/chat', limiter, async (req, res) => {
  // 🧪 LOG EVERY HIT (Render debugging)
  console.log(`🔥 /api/chat hit at ${new Date().toISOString()} - IP: ${req.ip}`);
  
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    const cleanMessage = message.trim().slice(0, 2000);

    console.log(`🤖 Calling OpenAI with model: ${MODEL}`);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful student assistant. Keep responses concise and educational.' },
        { role: 'user', content: cleanMessage }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || 
                  'Sorry, I could not generate a response.';

    console.log(`✅ OpenAI success - ${reply.length} chars`);
    res.json({ reply });
    
  } catch (error) {
    // 🔥 FIXED: FULL ERROR LOGGING - See the TRUTH
    console.error('🚨 FULL OpenAI ERROR:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      response_status: error.response?.status,
      response_data: error.response?.data,
      stack: error.stack?.split('\n')[0] // First line only
    });

    // 🔥 FIXED: PROPER OpenAI error detection
    const status = error.response?.status || error.status;
    
    if (status === 429 || error.code === 'rate_limit_exceeded') {
      return res.status(429).json({ error: 'Rate limited by OpenAI. Please wait 1-2 minutes.' });
    }
    if (status === 401 || error.type === 'invalid_request_error') {
      return res.status(401).json({ error: 'OpenAI authentication failed. Check API key.' });
    }
    if (status === 403 || status === 404) {
      return res.status(403).json({ error: `Model access denied. Model: ${MODEL}` });
    }
    if (status >= 500) {
      return res.status(503).json({ error: 'OpenAI service temporarily unavailable. Try again.' });
    }
    
    // Generic fallback
    res.status(500).json({ error: 'AI processing error. Check logs.' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Errors
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`🔥 Model: ${MODEL} ✅ (universal access)`);
  console.log(`🛡️ Rate limit: 10/min ✅ (Render-safe)`);
});
