import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

const BASE_URL = 'https://iqsaved.com/id/';

const client = axios.create({
  timeout: 30000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  }
});

function clean(value) {
  return value?.trim() || null;
}

function getMetadata($) {
  const meta = (name) =>
    clean(
      $(`meta[property="${name}"]`).attr('content') ||
      $(`meta[name="${name}"]`).attr('content')
    );

  return {
    title: meta('og:title') || clean($('title').text()),
    description: meta('og:description') || meta('description'),
    thumbnail: meta('og:image'),
    author: meta('author'),
    siteName: meta('og:site_name'),
    type: meta('og:type')
  };
}

function extractMedia($) {
  const media = [];
  const seen = new Set();

  const add = (url, type) => {
    if (!url || seen.has(url)) return;

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return;

      seen.add(url);
      media.push({
        type,
        url
      });
    } catch {}
  };

  $('video').each((_, el) => {
    const video = $(el);

    add(video.attr('src'), 'video');

    video.find('source').each((_, source) => {
      add($(source).attr('src'), 'video');
    });
  });

  $('a[href], img[src]').each((_, el) => {
    const element = $(el);
    const url = element.attr('href') || element.attr('src');

    if (url && /\.(mp4|jpg|jpeg|png|webp)(\?|$)/i.test(url)) {
      const type = /\.mp4(\?|$)/i.test(url) ? 'video' : 'image';
      add(url, type);
    }
  });

  return media;
}

async function instagramDownloader(instagramUrl) {
  if (!instagramUrl) {
    throw new Error('Parameter URL Instagram wajib diisi');
  }

  const parsed = new URL(instagramUrl);

  if (
    !['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am']
      .includes(parsed.hostname)
  ) {
    throw new Error('URL Instagram tidak valid');
  }

  // Ambil halaman IQSaved dan session cookie
  const page = await client.get(BASE_URL);
  const cookies = page.headers['set-cookie'] || [];

  const $ = cheerio.load(page.data);

  // Cari form downloader dari HTML
  const form = $('form').filter((_, el) => {
    return $(el).find('input').length > 0;
  }).first();

  if (!form.length) {
    throw new Error(
      'Form IQSaved tidak ditemukan. Website mungkin menggunakan AJAX atau proteksi Cloudflare.'
    );
  }

  const action = form.attr('action') || BASE_URL;
  const method = (form.attr('method') || 'POST').toUpperCase();

  const endpoint = new URL(action, BASE_URL).href;
  const params = new URLSearchParams();

  // Isi seluruh hidden input
  form.find('input').each((_, el) => {
    const input = $(el);
    const name = input.attr('name');
    const type = input.attr('type');

    if (name && type === 'hidden') {
      params.append(name, input.attr('value') || '');
    }
  });

  // Temukan input URL Instagram
  const urlInput = form.find('input').filter((_, el) => {
    const input = $(el);
    const name = (input.attr('name') || '').toLowerCase();
    const placeholder = (input.attr('placeholder') || '').toLowerCase();

    return (
      name.includes('url') ||
      name.includes('link') ||
      placeholder.includes('instagram')
    );
  }).first();

  if (!urlInput.length) {
    throw new Error('Input URL Instagram tidak ditemukan');
  }

  const inputName = urlInput.attr('name');

  params.set(inputName, instagramUrl);

  // Submit form
  const response = method === 'GET'
    ? await client.get(endpoint, {
        params,
        headers: {
          Referer: BASE_URL,
          Cookie: cookies.map(c => c.split(';')[0]).join('; ')
        }
      })
    : await client.post(endpoint, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: BASE_URL,
          Origin: new URL(BASE_URL).origin,
          Cookie: cookies.map(c => c.split(';')[0]).join('; ')
        }
      });

  const resultPage = cheerio.load(response.data);

  const metadata = getMetadata(resultPage);
  const media = extractMedia(resultPage);

  // Ambil link download yang ditemukan
  const downloadLinks = [];

  resultPage('a[href]').each((_, el) => {
    const element = resultPage(el);
    const href = element.attr('href');

    if (!href) return;

    if (
      /download|media|\.mp4|\.jpg|\.jpeg|\.png|\.webp/i.test(href)
    ) {
      downloadLinks.push({
        name: clean(element.text()) || 'Download',
        url: new URL(href, endpoint).href
      });
    }
  });

  return {
    originalUrl: instagramUrl,
    metadata,
    media,
    downloadLinks: [
      ...new Map(
        downloadLinks.map(item => [item.url, item])
      ).values()
    ]
  };
}

router.get('/', async (req, res) => {
  const url = req.query.url?.trim() || req.query.link?.trim();

  if (!url) {
    return res.status(400).json({
      status: false,
      creator: 'Arulzxd',
      message: "Parameter 'url' wajib diisi!"
    });
  }

  try {
    const result = await instagramDownloader(url);

    return res.status(200).json({
      status: true,
      creator: 'Arulzxd',
      result
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat mengunduh postingan Instagram',
      error: err.message
    });
  }
});

router.title = "Instagram Downloader V3";
router.desc = "Mengunduh foto/video postingan Instagram.";
router.paramsConfig = {
  url: "text (contoh: https://www.instagram.com/p/...)"
};

router.status = "ready";
router.type = "free";

export default router;
