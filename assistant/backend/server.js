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

// 🔥 FIX 3: Dynamic port for deployment
const port = process.env.PORT || 3000;

// ✅ FIX 1: SECURE CORS - ONLY your domains
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

// 💀 FIX 2: Remove useless static (GitHub Pages handles frontend)
// app.use(express.static(path.join(__dirname, 'public')));  ← DELETED

// ✅ Rate limiting - ONLY chat endpoint
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' }
});

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', openai: 'configured' });
});

// Chat API
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
        { role: 'system', content: 'You are a helpful student assistant.' },
        { role: 'user', content: cleanMessage }
      ],
      max_tokens: 400,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || 
                  'No response received.';

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI error:', error.message);
    const status = error.status || error.response?.status || 500;
    
    const messages = {
      429: 'Rate limited',
      401: 'API key invalid',
      500: 'Service unavailable'
    };
    
    res.status(status).json({ 
      error: messages[status] || 'AI error occurred' 
    });
  }
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ✅ Proper 4-param error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📱 Health: http://localhost:${port}/health`);
});
