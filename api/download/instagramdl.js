import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

async function savefromins(url) {
  if (!url) {
    throw new Error('URL Instagram wajib diisi');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('URL tidak valid');
  }

  if (
    !['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am']
      .includes(parsedUrl.hostname)
  ) {
    throw new Error('URL harus berasal dari Instagram');
  }

  const { data: html } = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  const $ = cheerio.load(html);

  const title = $('meta[property="og:title"]').attr('content') || '';
  const description = $('meta[property="og:description"]').attr('content') || '';
  const image = $('meta[property="og:image"]').attr('content') || '';
  const video =
    $('meta[property="og:video"]').attr('content') ||
    $('meta[property="og:video:secure_url"]').attr('content') ||
    '';

  const media = [];

  if (video) {
    media.push({
      type: 'video',
      url: video,
    });
  }

  if (image) {
    media.push({
      type: 'image',
      url: image,
    });
  }

  if (media.length === 0) {
    throw new Error('Tidak dapat menemukan media dari URL tersebut');
  }

  return {
    title,
    description,
    thumbnail: image,
    media,
  };
}

router.get('/', async (req, res) => {
  try {
    const url = req.query.url?.trim() || req.query.link?.trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' atau 'link' Instagram valid wajib diisi!",
      });
    }

    const data = await savefromins(url);

    return res.json({
      status: true,
      creator: 'ArulzXD',
      source: 'Instagram',
      result: data,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message || 'Internal Server Error saat mengambil data',
    });
  }
});

router.desc = 'Downloader Instagram Meta Tag Extractor.';
router.paramsConfig = {
  url: 'contoh: https://www.instagram.com/p/Cxxxxxx/',
};
router.status = 'ready';
router.type = 'free';

export default router;
