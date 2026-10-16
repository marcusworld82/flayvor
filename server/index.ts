import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { analyzeWithGemini, mockAnalysis } from './analyze.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 80 * 1024 * 1024, // 80MB
  },
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    imageGenConfigured: false,
    mode: process.env.FLAYVOR_FORCE_MOCK === '1' ? 'mock' : 'auto',
  });
});

// Analysis endpoint
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    const mode = (req.body.mode as string) === 'detailed' ? 'detailed' : 'standard';
    const mediaType = (req.body.type as string) === 'video' ? 'video' : 'image';
    const mimeType = (req.body.mimeType as string) || req.file?.mimetype || 'image/jpeg';
    const mediaId = (req.body.mediaId as string) || randomUUID();

    // Budget gate (server-side). Without durable ledger + auth, refuse live spend.
    const spendingEnabled = process.env.FLAYVOR_AI_SPENDING === '1';
    const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    const forceMock = process.env.FLAYVOR_FORCE_MOCK === '1' || !hasKey || !spendingEnabled;

    if (!forceMock && !spendingEnabled) {
      return res.status(403).json({
        error:
          'AI spending is disabled. Set FLAYVOR_AI_SPENDING=1 and configure budget controls before live analysis.',
      });
    }

    let buffer: Buffer | null = null;
    if (req.file) {
      buffer = req.file.buffer;
      // Validate mime
      const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
      ];
      if (!allowed.includes(req.file.mimetype)) {
        return res.status(400).json({ error: `Unsupported media type: ${req.file.mimetype}` });
      }
    }

    if (forceMock) {
      const analysis = mockAnalysis(mediaType, mode);
      return res.json({
        id: randomUUID(),
        schemaVersion: '1.0',
        model: 'mock-local',
        analysis,
        usage: { estimatedCostUsd: 0 },
        note: hasKey
          ? 'Mocked because AI spending is not enabled on the server.'
          : 'Mocked because GEMINI_API_KEY is not configured.',
      });
    }

    const result = await analyzeWithGemini({
      buffer,
      mimeType,
      mediaType,
      mode,
    });

    res.json({
      id: randomUUID(),
      schemaVersion: '1.0',
      model: result.model,
      analysis: result.analysis,
      usage: result.usage,
    });
  } catch (err) {
    console.error('Analyze error', err);
    const message = err instanceof Error ? err.message : 'Analysis failed';
    res.status(500).json({ error: message });
  }
});

// Placeholder generation endpoint — always refuses until configured
app.post('/api/generate', (_req, res) => {
  res.status(503).json({
    error:
      'Image generation is not configured. Wire a verified GPT Image 2.5 (or compatible) adapter and enable spending controls.',
  });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`FLAYVOR server on http://localhost:${PORT}`);
  console.log(
    `Gemini: ${process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? 'key present' : 'not configured (mock)'}`
  );
});
