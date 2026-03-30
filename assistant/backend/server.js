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
const port = 3000;

// ✅ Validate API key
if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) {
  console.error('💀 FATAL: OPENAI_API_KEY missing/invalid');
  process.exit(1);
}

console.log('✅ OpenAI ready');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', openai: 'ready' });
});

// Chat API
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful student assistant.' },
        { role: 'user', content: message.trim() }
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
    
    res.status(500).json({ 
      error: messages[status] || 'AI error occurred' 
    });
  }
});

// Error handlers
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

app.listen(port, () => {
  console.log(`🚀 http://localhost:${port}`);
});
