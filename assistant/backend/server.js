import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // ✅ FIXED - No more snake bug

const app = express();

// ✅ PROPER PORT
const PORT = process.env.PORT || 3000;

// ✅ API KEY CHECK - Fail fast
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is missing! Server cannot start.');
  process.exit(1);
}

console.log(`🚀 Starting server on PORT: ${PORT}`);

// ✅ CORS - Clean domains only
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://pro-user-cyber.github.io'
  ],
  credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Try again in 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000
});

// ✅ Health check - Honest status
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    openai: !!process.env.OPENAI_API_KEY ? 'configured' : 'missing', // ✅ FIXED - Honest
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Chat API
app.post('/api/chat', limiter, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    const cleanMessage = message.trim().slice(0, 2000);

    const model = 'gpt-4o-mini'; // No fake fallback comments

    const completion = await openai.chat.completions.create({
      model,
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
    
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limited by OpenAI. Please wait.' });
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'OpenAI access denied. Check model access or API key.' });
    }
    if (error.status === 404) {
      return res.status(404).json({ error: 'OpenAI model not found. Check your access.' });
    }
    if (error.status >= 500) {
      return res.status(503).json({ error: 'AI service temporarily unavailable.' });
    }
    
    res.status(500).json({ error: 'AI processing error' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Errors
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Listen
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Health check ready`);
  console.log(`🌐 Production ready!`);
});
