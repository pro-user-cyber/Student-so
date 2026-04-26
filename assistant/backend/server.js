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

// 🔥 HF_TOKEN REQUIRED
const HF_TOKEN = process.env.HF_TOKEN?.trim();
if (!HF_TOKEN) {
  console.error('❌ HF_TOKEN missing - Add to Render dashboard');
  process.exit(1);
}

console.log('✅ HF_TOKEN OK');

// ✅ Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  message: { error: '⏳ 25 requests/minute max' },
  standardHeaders: true,
  legacyHeaders: false,
});

const MODEL = 'HuggingFaceH4/zephyr-7b-beta';

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: HF_TOKEN,
  timeout: 60000  // ✅ STEP 3 - HF needs time
});

console.log(`🤖 Model: ${MODEL}`);

// 🔥 HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    model: MODEL,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 🔥 CHAT API - BATTLE TESTED
app.post('/api/chat', limiter, async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  console.log(`🔥 [${requestId}] "${req.body.message?.slice(0, 50)}..."`);
  
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      console.log(`❌ [${requestId}] Empty message`);
      return res.status(400).json({ error: 'Message required' });
    }

    const cleanMessage = message.trim().slice(0, 3000);

    // Render cold start
    if (process.env.RENDER && process.uptime() < 10) {
      console.log(`💤 [${requestId}] Cold start delay`);
      await new Promise(r => setTimeout(r, 800));
    }

    // ✅ STEP 4 - RETRY LOGIC
    let completion;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🤖 [${requestId}] Attempt ${attempt}/2`);
        
        completion = await client.chat.completions.create({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: `StudentOS AI Study Assistant

Answer concisely with:
- Bullet points
- Educational emojis  
- Clear explanations

Max 400 words.`
            },
            { role: 'user', content: cleanMessage }
          ],
          max_tokens: 800,
          temperature: 0.3
        });
        
        console.log(`✅ [${requestId}] Success on attempt ${attempt}`);
        break;
        
      } catch (attemptError) {
        console.warn(`⚠️ [${requestId}] Attempt ${attempt} failed:`, attemptError.message);
        
        if (attempt === 2) {
          throw attemptError;  // Final attempt failed
        }
        
        // Wait before retry
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const replyRaw = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!replyRaw) {
      throw new Error('Empty response from model');
    }

    // Minimal cleaning
    const reply = replyRaw
      .replace(/^Assistant:\s*/i, '')
      .replace(/^AI:\s*/i, '')
      .trim();

    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] COMPLETE ${duration}ms - ${reply.length} chars`);

    res.json({ reply });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // ✅ STEP 1 - FULL ERROR LOGGING
    console.error(`💥 [${requestId}] FAILED ${duration}ms:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      name: error.name
    });

    // ✅ STEP 2 - FRIENDLY FALLBACKS
    let userError = '🤖 AI is taking a break. Try again in 10 seconds.';
    let statusCode = 500;

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      userError = '⏳ Model loading (HF free tier). Try again.';
      statusCode = 503;
    } else if (error.response?.status === 429) {
      userError = '⏳ Rate limited by HuggingFace.';
      statusCode = 429;
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      userError = '🔑 Service authentication issue.';
      statusCode = 503;
    }

    res.status(statusCode).json({ error: userError });
  }
});

// 🔥 404
app.use('*', (req, res) => {
  console.log(`🚫 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

// 🔥 Global errors
app.use((err, req, res, next) => {
  console.error('💥 UNHANDLED ERROR:', {
    url: req.originalUrl,
    method: req.method,
    stack: err.stack
  });
  res.status(500).json({ error: 'Server error' });
});

// 🔥 Startup
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 StudentOS Backend v2.0');
  console.log(`📍  http://localhost:${PORT}`);
  console.log(`🔍  http://localhost:${PORT}/health`);
  console.log(`💬  POST /api/chat`);
  console.log(`⏱️   Timeout: 60s`);
  console.log(`🔄   Retries: 2x`);
  console.log(`✅   LIVE\n`);
});
