import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    imageGenConfigured: false,
    mode: process.env.FLAYVOR_FORCE_MOCK === '1' ? 'mock' : 'auto',
  });
}
