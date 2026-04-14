import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;

if (!process.env.HF_TOKEN) {
  console.error('❌ HF_TOKEN is missing! Server cannot start.');
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

// 🔥 Rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Try again in 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔥 MODEL
const MODEL = 'HuggingFaceH4/zephyr-7b-beta';

// ✅ Client
const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
  timeout: 45000
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    huggingface: !!process.env.HF_TOKEN ? 'configured' : 'missing',
    model: MODEL,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// 🔥 CHAT API - FLAWLESS
app.post('/api/chat', limiter, async (req, res) => {
  console.log(`🔥 /api/chat hit at ${new Date().toISOString()} - IP: ${req.ip}`);
  
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    const cleanMessage = message.trim().slice(0, 2000);

    console.log(`🤖 Processing: ${MODEL}`);

    // 🔥 Render cold start protection
    if (process.env.RENDER) {
      await new Promise(r => setTimeout(r, 300));
    }

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful student assistant. Keep responses concise and educational.' },
        { role: 'user', content: cleanMessage }
      ],
      max_tokens: 400,
      temperature: 0.7,
      extra_body: {
        options: { wait_for_model: true }
      }
    });

    // 🔥 ATOMIC CLEANING (no collateral damage)
    let reply = completion?.choices?.[0]?.message?.content;
    
    if (!reply || reply.trim().length === 0) {
      reply = "⚠️ Model returned empty response. Try again.";
      console.log('⚠️ Empty - fallback');
    } else {
      // ✅ MICROSCOPIC FIX: Line-start only for Assistant
      reply = reply
        .replace(/^User:.*?\n/gi, '')              // Line-start User:
        .replace(/^Assistant:?\s*/gi, '')          // 👈 FIXED: Line-start Assistant:
        .replace(/User:\s*$/gi, '')                // Trailing User:
        .replace(/^\n+|\n+$/g, '')                 // Newlines
        .trim();
      
      if (reply.length === 0) {
        reply = "⚠️ Malformed response. Try again.";
      }
    }

    console.log(`✅ Success - ${reply.length} chars`);
    res.json({ reply });
    
  } catch (error) {
    console.error('🚨 ERROR:', {
      message: error.message,
      status: error.status,
      code: error.code,
      response_status: error.response?.status
    });

    const status = error.response?.status || error.status;
    
    if (status === 429) return res.status(429).json({ error: 'Rate limited. Wait.' });
    if (status === 401) return res.status(401).json({ error: 'Auth failed. Check HF_TOKEN.' });
    if (status === 403 || status === 404) return res.status(403).json({ error: `Model denied: ${MODEL}` });
    if (status >= 500) return res.status(503).json({ error: 'Service unavailable.' });
    
    res.status(500).json({ error: 'AI error.' });
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
  console.log(`🚀 Server on port ${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/health`);
  console.log(`🔥 Model: ${MODEL}`);
  console.log(`✅ All edge cases handled`);
});
