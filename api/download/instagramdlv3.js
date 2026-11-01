import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import vm from 'node:vm';

const router = express.Router();

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function getMetadata(url) {
  try {
    const { data } = await axios.get(url, { headers, timeout: 10000 });
    const $ = cheerio.load(data);

    const username =
      $('meta[property="instapp:owner_user_name"]').attr('content') ||
      $('meta[property="og:title"]').attr('content')?.split('•')[0]?.trim() ||
      '-';

    const caption =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '-';

    return { username, caption };
  } catch {
    return { username: '-', caption: '-' };
  }
}

async function indown(url) {
  try {
    const { data: pageData, headers: resHeaders } = await axios.get(
      'https://indown.io/en1',
      { headers, timeout: 10000 }
    );

    const $ = cheerio.load(pageData);
    const token = $('input[name="_token"]').val();

    const cookies = resHeaders['set-cookie']
      ?.map(v => v.split(';')[0])
      .join('; ');

    if (!token) throw new Error('Token tidak ditemukan');

    const params = new URLSearchParams();
    params.append('referer', 'https://indown.io/en1');
    params.append('locale', 'en');
    params.append('_token', token);
    params.append('link', url);
    params.append('p', 'i');

    const { data: result } = await axios.post(
      'https://indown.io/download',
      params,
      {
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies || ''
        },
        timeout: 15000
      }
    );

    const $$ = cheerio.load(result);
    const results = [];

    $$('video source[src], a[href]').each((_, el) => {
      let link = $$(el).attr('src') || $$(el).attr('href');
      if (!link) return;

      if (link.includes('/fetch?')) {
        try {
          link = decodeURIComponent(
            new URL(link).searchParams.get('url')
          );
        } catch {}
      }

      if (/cdninstagram\.com|fbcdn\.net/.test(link)) {
        results.push(link.replace(/&dl=1$/, ''));
      }
    });

    const unique = [...new Set(results)];
    if (!unique.length) throw new Error('Media kosong');

    return unique;
  } catch {
    return [];
  }
}

async function snapsave(url) {
  try {
    const form = new URLSearchParams();
    form.append('url', url);

    const { data } = await axios.post(
      'https://snapsave.app/id/action.php?lang=id',
      form,
      {
        headers: {
          ...headers,
          origin: 'https://snapsave.app',
          referer: 'https://snapsave.app/id/download-video-instagram'
        },
        timeout: 15000
      }
    );

    const ctx = {
      window: {},
      document: {
        getElementById: () => ({ value: '' })
      },
      console,
      eval: (res) => res
    };

    vm.createContext(ctx);
    const decoded = vm.runInContext(data, ctx);

    const matches = decoded.match(
      /https:\/\/d\.rapidcdn\.app\/v2\?[^"]+/g
    );

    if (!matches?.length) throw new Error('Media kosong');

    return [
      ...new Set(
        matches.map(u => u.replace(/&amp;/g, '&'))
      )
    ];
  } catch {
    return [];
  }
}

async function igdl(url) {
  if (!url.includes('instagram.com'))
    throw new Error('URL harus berasal dari instagram.com');

  const meta = await getMetadata(url);

  let media = await indown(url);
  if (!media.length) media = await snapsave(url);
  if (!media.length) throw new Error('Media tidak ditemukan atau gagal mengunduh.');

  const formatted = media.map(u => ({
    type: u.includes('.mp4') ? 'video' : 'image',
    url: u
  }));

  return {
    author: meta,
    media: formatted
  };
}

router.get('/', async (req, res) => {
  const url = req.query.url?.trim() || req.query.link?.trim();

  if (!url) {
    return res.status(400).json({
      status: false,
      creator: "Arulzxd",
      message: "Parameter 'url' wajib diisi!"
    });
  }

  try {
    const result = await igdl(url);

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      result
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat mengunduh media Instagram",
      error: err.message
    });
  }
});

router.title = "Instagram Downloader";
router.desc = "Mengunduh foto/video/reel dari postingan Instagram.";
router.paramsConfig = {
  url: "contoh: https://www.instagram.com/p/C..."
};

router.status = "ready";
router.type = "free";

export default router;
