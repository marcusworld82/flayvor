import type { VercelRequest, VercelResponse } from '@vercel/node';

type Source = 'pixabay' | 'unsplash' | 'openverse';

interface DiscoverItem {
  id: string;
  source: Source;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  creator?: string;
  sourceLabel: string;
  originalUrl?: string;
  title?: string;
  mimeType: string;
}

function send(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return send(res, 405, { error: 'Method not allowed' });
  }

  const q = String(req.query.q || '').trim();
  const source = (String(req.query.source || 'openverse') as Source);
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const perPage = Math.min(30, Math.max(5, parseInt(String(req.query.per_page || '20'), 10) || 20));
  const mediaType = String(req.query.type || 'image');

  if (!['pixabay', 'unsplash', 'openverse'].includes(source)) {
    return send(res, 400, { error: 'source must be pixabay, unsplash, or openverse' });
  }

  try {
    let items: DiscoverItem[] = [];
    let total = 0;

    if (source === 'openverse') {
      const result = await searchOpenverse(q, page, perPage, mediaType);
      items = result.items;
      total = result.total;
    } else if (source === 'pixabay') {
      const key = process.env.PIXABAY_API_KEY;
      if (!key) {
        return send(res, 503, {
          error: 'Pixabay not configured',
          hint: 'Set PIXABAY_API_KEY in Vercel env (free key from pixabay.com/api/docs)',
        });
      }
      const result = await searchPixabay(key, q, page, perPage, mediaType);
      items = result.items;
      total = result.total;
    } else if (source === 'unsplash') {
      const key = process.env.UNSPLASH_ACCESS_KEY;
      if (!key) {
        return send(res, 503, {
          error: 'Unsplash not configured',
          hint: 'Set UNSPLASH_ACCESS_KEY in Vercel env (free Access Key from unsplash.com/developers)',
        });
      }
      const result = await searchUnsplash(key, q, page, perPage);
      items = result.items;
      total = result.total;
    }

    return send(res, 200, {
      source,
      query: q,
      page,
      perPage,
      total,
      items,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Discover failed';
    console.error('[discover]', msg);
    return send(res, 500, { error: msg });
  }
}

async function searchOpenverse(
  q: string,
  page: number,
  perPage: number,
  mediaType: string
): Promise<{ items: DiscoverItem[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(perPage),
  });
  if (q) params.set('q', q);
  if (mediaType === 'video') {
    params.set('q', (q ? q + ' ' : '') + 'motion');
  }

  const headers: Record<string, string> = {
    'User-Agent': 'FLAYVOR/0.1 (personal visual taste tool; contact via repo)',
    Accept: 'application/json',
  };
  const token = process.env.OPENVERSE_API_KEY;
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `https://api.openverse.org/v1/images/?${params}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Openverse ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    result_count?: number;
    results?: Array<{
      id: string;
      title?: string;
      url: string;
      thumbnail?: string;
      width?: number;
      height?: number;
      creator?: string;
      foreign_landing_url?: string;
      license?: string;
      license_url?: string;
    }>;
  };

  const items: DiscoverItem[] = (data.results || []).map((r) => ({
    id: `openverse-${r.id}`,
    source: 'openverse' as const,
    type: 'image' as const,
    url: r.url,
    thumbnailUrl: r.thumbnail || r.url,
    width: r.width,
    height: r.height,
    creator: r.creator,
    sourceLabel: 'Openverse',
    originalUrl: r.foreign_landing_url || r.url,
    title: r.title,
    mimeType: 'image/jpeg',
  }));

  return { items, total: data.result_count ?? items.length };
}

async function searchPixabay(
  key: string,
  q: string,
  page: number,
  perPage: number,
  mediaType: string
): Promise<{ items: DiscoverItem[]; total: number }> {
  const wantVideo = mediaType === 'video';
  const endpoint = wantVideo
    ? 'https://pixabay.com/api/videos/'
    : 'https://pixabay.com/api/';

  const params = new URLSearchParams({
    key,
    q: q || 'design',
    page: String(page),
    per_page: String(perPage),
    safesearch: 'true',
  });
  if (!wantVideo) {
    params.set('image_type', 'all');
  }

  const res = await fetch(`${endpoint}?${params}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pixabay ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    totalHits?: number;
    hits?: Array<Record<string, unknown>>;
  };

  const items: DiscoverItem[] = (data.hits || []).map((h) => {
    if (wantVideo) {
      const videos = h.videos as Record<string, { url: string; width: number; height: number }> | undefined;
      const medium = videos?.medium || videos?.small || videos?.large;
      return {
        id: `pixabay-v-${h.id}`,
        source: 'pixabay' as const,
        type: 'video' as const,
        url: medium?.url || String(h.pageURL || ''),
        thumbnailUrl: String(h.userImageURL || h.picture_id || ''),
        width: medium?.width,
        height: medium?.height,
        creator: String(h.user || ''),
        sourceLabel: 'Pixabay',
        originalUrl: String(h.pageURL || ''),
        title: String(h.tags || ''),
        mimeType: 'video/mp4',
      };
    }
    return {
      id: `pixabay-${h.id}`,
      source: 'pixabay' as const,
      type: 'image' as const,
      url: String(h.largeImageURL || h.webformatURL || ''),
      thumbnailUrl: String(h.previewURL || h.webformatURL || ''),
      width: Number(h.imageWidth) || undefined,
      height: Number(h.imageHeight) || undefined,
      creator: String(h.user || ''),
      sourceLabel: 'Pixabay',
      originalUrl: String(h.pageURL || ''),
      title: String(h.tags || ''),
      mimeType: 'image/jpeg',
    };
  });

  return { items, total: data.totalHits ?? items.length };
}

async function searchUnsplash(
  key: string,
  q: string,
  page: number,
  perPage: number
): Promise<{ items: DiscoverItem[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (q) params.set('query', q);

  const endpoint = q
    ? `https://api.unsplash.com/search/photos?${params}`
    : `https://api.unsplash.com/photos?${params}`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Client-ID ${key}`,
      'Accept-Version': 'v1',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Unsplash ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();

  const results = Array.isArray(data) ? data : data.results || [];
  const total = data.total ?? results.length;

  const items: DiscoverItem[] = results.map(
    (p: {
      id: string;
      urls?: { regular?: string; small?: string; full?: string };
      width?: number;
      height?: number;
      user?: { name?: string };
      links?: { html?: string };
      description?: string;
      alt_description?: string;
    }) => ({
      id: `unsplash-${p.id}`,
      source: 'unsplash' as const,
      type: 'image' as const,
      url: p.urls?.regular || p.urls?.full || p.urls?.small || '',
      thumbnailUrl: p.urls?.small || p.urls?.regular,
      width: p.width,
      height: p.height,
      creator: p.user?.name,
      sourceLabel: 'Unsplash',
      originalUrl: p.links?.html,
      title: p.description || p.alt_description || undefined,
      mimeType: 'image/jpeg',
    })
  );

  return { items, total };
}
