import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { GoogleAuth } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './db.js';

dotenv.config();

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Locate Google Service Account Key JSON
function findServiceAccountKey() {
  try {
    const files = fs.readdirSync(__dirname);
    const jsonKey = files.find(f => f.startsWith('gen-lang-client-') && f.endsWith('.json'));
    if (jsonKey) {
      return path.join(__dirname, jsonKey);
    }
  } catch (e) {}
  return null;
}

const serviceAccountPath = findServiceAccountKey();
let googleAuthClient = null;
let projectId = 'gen-lang-client-0148309017';

if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  try {
    const keyData = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    projectId = keyData.project_id || projectId;
    googleAuthClient = new GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    console.log(`🔑 تم تفعيل مفتاح Google Cloud Console: [${path.basename(serviceAccountPath)}]`);
  } catch (e) {
    console.error('فشل قراءة مفتاح حساب الخدمة:', e);
  }
}

// Master Nietzschean Iraqi Scholar System Instruction
const SYSTEM_PROMPT = `
أنت الفيلسوف والمفكر المساعد "رفيق زرادشت"، خبير متعمق جداً في فلسفة فريدريك نيتشه وكتابه الخالد "هكذا تكلم زرادشت" (Also sprach Zarathustra).

المهمة الأساسية:
يقوم المستخدم بقراءة كتاب زرادشت ويواجه صعوبة في نصوصه الفلسفية الشعرية والاستعارات الرمزية المعقدة.
مهمتك هي تفكيك وشرح أي نص، صورة صفحة، أو استفسار يرسله المستخدم بالتفصيل الدقيق والفلسفي، وبأسلوب **باللهجة العراقية الذكية، العميقة، الممتعة والمحببة** (تجمع بين الفصاحة الفلسفية والسلاسة العراقية الطبيعية بدون تكلف جاف).

هيكل الإجابة والتحليل النموذجي:
1. 🦅 **الزبدة وسالفة الفكرة (بالعراقي الواضح والمباشر)**:
   - اشرح شنو قصد نيتشه/زرادشت بهذا المقطع بدون لف ودوران، كأنك تشرح لصديق مقرب بذكاء وعمق.
2. 🔍 **تفكيك الرموز والاستعارات (شنو وراء الكلمات؟)**:
   - اذكر كل رمز ورد بالمقطع (مثل: النسر، الأفعى، الشمس، الجمل، الأسد، الطفل، البهلوان، ذباب السوق، الهاوية، الجبل، النار...) ووضح شنو يرمز له بفكر نيتشه.
3. ⚡ **الربط بالمفاهيم النيتشوية الكبرى**:
   - اربط المقطع بالمفاهيم الأساسية: (الإنسان المتفوق Übermensch، إرادة القوة Will to Power، العود الأبدي Eternal Recurrence، موت الأصنام، أخلاق السادة والعبيد، حب القدر Amor Fati).
4. 📖 **سياق المقطع في رحلة زرادشت**:
   - وضح هذا الكلام بأي جزء أو خطبة (مثلاً: التحولات الثلاثة، شجرة الجبل، فضيلة العطاء، الشوق العظيم، طوق النجاة...).
5. 💡 **شلون تفهم وتطبق هذا الكلام بحياتك اليومية وواقعك؟**:
   - درس عملي وموقف فكري تقدر تستفيد منه لتطوير عقليتك وقوتك الداخلية اليوم.
6. ☕ **فقرة 'سالفة كهوة' (تلخيص سريع وممتع)**:
   - خلاصة مكثفة ومؤثرة جداً بسطرين أو ثلاثة باللهجة العراقية.

ملاحظات مهمة:
- إذا كان المدخل صورة لصفحة من كتاب، ابدأ بقراءة النص الظاهر في الصورة أولاً بدقة (OCR)، ثم قدم التحليل.
- إذا طلب المستخدم تبسيطاً إضافياً (سالفة كهوة) أو نقاشاً محدداً، ركز على النمط المطلوب مع الحفاظ على روح الفلسفة وعمقها.
- لا تكن سطحياً، بل فكك المعنى الفلسفي الحقيقي بذكاء ووضوح.
`;

// Helper: Stream response from Vertex AI Global Endpoint
async function streamVertexAI(contents, systemPrompt, res, modelName = 'gemini-3.7-flash') {
  if (!googleAuthClient) {
    throw new Error('لم يتم العثور على مفتاح Google Console Service Account.');
  }

  const client = await googleAuthClient.getClient();
  const tokenResp = await client.getAccessToken();
  const token = tokenResp.token;

  const url = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${modelName}:streamGenerateContent?alt=sse`;

  const requestBody = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4096
    }
  };

  const fetchResp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!fetchResp.ok) {
    const errText = await fetchResp.text();
    throw new Error(`Vertex AI Error (${fetchResp.status}): ${errText}`);
  }

  const reader = fetchResp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.replace('data: ', '');
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.candidates && parsed.candidates[0]?.content?.parts) {
            for (const part of parsed.candidates[0].content.parts) {
              if (part.text) {
                res.write(`data: ${JSON.stringify({ chunk: part.text })}\n\n`);
              }
            }
          }
        } catch (e) {}
      }
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

function getLocalIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

// ----------------------------------------------------
// DATABASE & JOURNAL API ENDPOINTS (Neon PostgreSQL)
// ----------------------------------------------------

app.get('/api/journal', async (req, res) => {
  try {
    const search = req.query.search || '';
    const items = await db.getAnalyses({ search });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'فشل قراءة السجل من قاعدة البيانات' });
  }
});

app.post('/api/journal', async (req, res) => {
  try {
    const { quote, analysis, mode, tags, deviceInfo } = req.body;
    if (!analysis) {
      return res.status(400).json({ error: 'التحليل فارغ' });
    }
    const saved = await db.saveAnalysis({
      quote: quote || '',
      analysis: analysis,
      mode: mode || 'full',
      tags: tags || '',
      deviceInfo: deviceInfo || req.headers['user-agent'] || ''
    });
    res.json({ success: true, item: saved });
  } catch (err) {
    res.status(500).json({ error: 'فشل الحفظ في قاعدة البيانات: ' + err.message });
  }
});

app.delete('/api/journal/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.deleteAnalysis(id);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل حذف العنصر' });
  }
});

app.get('/api/status', async (req, res) => {
  const hasServiceAccount = Boolean(googleAuthClient);
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY);
  const stats = await db.getStats();
  
  res.json({
    status: 'ok',
    hasApiKey: hasServiceAccount || hasEnvKey,
    authMethod: hasServiceAccount ? 'Google Cloud Service Account (Console)' : (hasEnvKey ? 'API Key' : 'none'),
    serviceAccountKey: serviceAccountPath ? path.basename(serviceAccountPath) : null,
    projectId: projectId,
    port: PORT,
    localIp: getLocalIp(),
    localNetworkUrl: `http://${getLocalIp()}:${PORT}`,
    defaultModel: 'gemini-3.7-flash',
    database: stats
  });
});

app.post('/api/set-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ error: 'يرجى تزويد مفتاح API صحيح' });
  }
  process.env.GEMINI_API_KEY = apiKey.trim();
  res.json({ success: true, message: 'تم حفظ مفتاح API بنجاح!' });
});

app.get('/api/glossary', (req, res) => {
  try {
    const glossaryPath = path.join(__dirname, 'public', 'glossary.json');
    if (fs.existsSync(glossaryPath)) {
      const data = JSON.parse(fs.readFileSync(glossaryPath, 'utf-8'));
      return res.json(data);
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: 'فشل قراءة القاموس' });
  }
});

app.post('/api/parse-doc', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    }

    const { originalname, buffer, mimetype } = req.file;

    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      return res.json({ text: data.text, filename: originalname, pages: data.numpages });
    } else {
      const text = buffer.toString('utf-8');
      return res.json({ text, filename: originalname });
    }
  } catch (err) {
    console.error('Doc parse error:', err);
    res.status(500).json({ error: 'فشل استخراج النص من الملف: ' + err.message });
  }
});

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  const { text, prompt, mode, imageBase64 } = req.body;
  const file = req.file;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const parts = [];

  if (file) {
    parts.push({
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype || 'image/jpeg'
      }
    });
  } else if (imageBase64 && imageBase64.includes(',')) {
    const mimeMatch = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = imageBase64.split(',')[1];
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    });
  }

  let userInstruction = '';
  if (mode === 'kahwa') {
    userInstruction = 'سولفلي واشرحلي هذا المقطع مثل كعدة كهوة بأسلوب عراقي ممتع وسلس ومبسط لأقصى درجة مع الحفاظ على المعنى الجوهري لزرادشت:\n\n';
  } else if (mode === 'symbols') {
    userInstruction = 'ركز على تفكيك الرموز والاستعارات الموجودة بهذا المقطع وشرح شنو تعني عند نيتشه بالتفصيل:\n\n';
  } else if (mode === 'debate') {
    userInstruction = 'ناقش هذا المقطع فكرياً، شنو قوته وشنو الاعتراضات عليه، وشلون نطبقه بحياتنا اليومية:\n\n';
  } else {
    userInstruction = 'حلل وفكك هذا المقطع من كتاب هكذا تكلم زرادشت بالتفصيل الكامل وباللهجة العراقية الذكية حسب الهيكل المعتمد:\n\n';
  }

  if (text) {
    userInstruction += `النص / المقتطف المطلوب تحليله:\n"""\n${text}\n"""\n`;
  }
  if (prompt) {
    userInstruction += `\nسؤال أو توجيه إضافي من القارئ:\n${prompt}\n`;
  }

  if (!text && !parts.length && !prompt) {
    res.write(`data: ${JSON.stringify({ error: 'يرجى تقديم نص أو صورة أو سؤال للتحليل' })}\n\n`);
    return res.end();
  }

  parts.push({ text: userInstruction });

  const contents = [
    {
      role: 'user',
      parts: parts
    }
  ];

  try {
    if (googleAuthClient) {
      await streamVertexAI(contents, SYSTEM_PROMPT, res, 'gemini-3.7-flash');
      return;
    }

    const customKey = req.headers['x-gemini-key'] || req.body.customKey || process.env.GEMINI_API_KEY;
    if (!customKey) {
      throw new Error('لم يتم العثور على مفتاح Google Console أو مفتاح Gemini API.');
    }
    const genAI = new GoogleGenerativeAI(customKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.7-flash',
      systemInstruction: SYSTEM_PROMPT
    });

    const genParts = parts.map(p => p.inlineData ? { inlineData: p.inlineData } : p.text);
    const result = await model.generateContentStream(genParts);
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Analysis error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'حدث خطأ أثناء معالجة الطلب' })}\n\n`);
    res.end();
  }
});

app.post('/api/chat', async (req, res) => {
  const { history = [], message, contextQuote } = req.body;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const dynamicSystemPrompt = SYSTEM_PROMPT + `\nأنت تجري الآن حواراً ونقاشاً فلسفياً حياً وتفاعلياً مع القارئ حول كتاب هكذا تكلم زرادشت والمقطع الذي يقرأه.\nالسياق والمقطع الحالي:\n"""${contextQuote || 'نصوص زرادشت'}"""`;

  const contents = history.map(item => ({
    role: item.role === 'user' ? 'user' : 'model',
    parts: [{ text: item.content }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    if (googleAuthClient) {
      await streamVertexAI(contents, dynamicSystemPrompt, res, 'gemini-3.7-flash');
      return;
    }

    const customKey = req.headers['x-gemini-key'] || req.body.customKey || process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(customKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.7-flash',
      systemInstruction: dynamicSystemPrompt
    });

    const chat = model.startChat({
      history: history.map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }]
      }))
    });

    const result = await chat.sendMessageStream(message);
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'حدث خطأ أثناء المحادثة' })}\n\n`);
    res.end();
  }
});

// Start server if not running in a serverless environment (e.g. Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    const localIp = getLocalIp();
    console.log(`====================================================`);
    console.log(`🦅 رفيق زرادشت (Zarathustra Companion) يعمل الآن!`);
    console.log(`💻 على هذه الحاسبة: http://localhost:${PORT}`);
    console.log(`📱 على الموبايل والأجهزة الأخرى (نفس شبكة الواي فاي):`);
    console.log(`   👉 http://${localIp}:${PORT}`);
    console.log(`====================================================`);
  });
}

export default app;
