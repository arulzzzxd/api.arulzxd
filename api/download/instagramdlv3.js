import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://indown.ai';
const API_URL = `${BASE_URL}/api/ajaxSearch`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const K_EXP = '1787641966';
const K_TOKEN = 'bb2880d13bafb6db4ba7276410c1f73faf64cf64d34f252264c8837b76ffd58a';

function getContentType(url) {
  if (url.includes('/reel/')) return 'reel';
  if (url.includes('/p/')) return 'post';
  if (url.includes('/stories/')) return 'story';
  if (url.includes('/tv/')) return 'igtv';
  return 'unknown';
}

function extractQuality(url, html) {
  if (url.includes('1080') || url.includes('1080p')) return '1080p';
  if (url.includes('720') || url.includes('720p')) return '720p';
  if (url.includes('480') || url.includes('480p')) return '480p';
  if (url.toLowerCase().includes('hd')) return 'HD';
  if (url.toLowerCase().includes('sd')) return 'SD';
  if (html.includes('HD') || html.includes('1080')) return 'HD';
  return 'original';
}

function determineType(url) {
  const urlLower = url.toLowerCase();
  if (/\.(mp4|mov|avi)/.test(urlLower)) return 'video';
  if (/\.(jpg|jpeg|png|webp)/.test(urlLower)) return 'image';
  return 'unknown';
}

function parseDownloadLinks(html) {
  const links = [];

  const downloadPatterns = [
    /href="([^"]+)"[^>]*class="[^"]*download[^"]*"/gi,
    /href="([^"]+)"[^>]*>.*?Download/gi,
    /data-url="([^"]+)"/gi,
    /<a[^>]+href="(https?:\/\/[^"]+\.(?:mp4|jpg|jpeg|png)[^"]*)"/gi,
  ];

  for (const pattern of downloadPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      if (url && !links.find((l) => l.url === url)) {
        const quality = extractQuality(url, html);
        links.push({ url: url, quality: quality, type: determineType(url) });
      }
    }
  }

  const videoSourcePattern = /<source[^>]+src="([^"]+)"[^>]*>/gi;
  let match;
  while ((match = videoSourcePattern.exec(html)) !== null) {
    const src = match[1];
    if (!links.find((l) => l.url === src)) {
      const quality = extractQuality(src, html);
      links.push({ url: src, quality: quality, type: 'video' });
    }
  }

  const imgSourcePattern = /<img[^>]+src="([^"]+)"[^>]*>/gi;
  while ((match = imgSourcePattern.exec(html)) !== null) {
    const src = match[1];
    if (/\.(jpg|jpeg|png|webp)/i.test(src)) {
      if (!links.find((l) => l.url === src)) {
        links.push({ url: src, quality: 'original', type: 'image' });
      }
    }
  }

  return links;
}

async function fetchInDown(instagramUrl) {
  const contentType = getContentType(instagramUrl);

  const data = new URLSearchParams({
    k_exp: K_EXP,
    k_token: K_TOKEN,
    q: instagramUrl,
    t: contentType,
    lang: 'id',
    v: 'v2',
    html: '',
  });

  try {
    const response = await axios.post(API_URL, data.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/id`,
        'Origin': BASE_URL,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });

    if (response.status !== 200) {
      return { status: false, message: `HTTP ${response.status} - API request failed` };
    }

    const result = response.data;

    if (result.status !== 'ok') {
      return { status: false, message: result.mess || 'Gagal mengekstrak video.' };
    }

    const mess = result.mess || '';
    if (mess.includes('Kesalahan') || mess.includes('Error')) {
      return { status: false, message: mess };
    }

    const htmlContent = result.html || '';
    if (!htmlContent) {
      return { status: false, message: 'Tidak ada konten HTML pada respons server.' };
    }

    const downloadLinks = parseDownloadLinks(htmlContent);

    if (!downloadLinks || downloadLinks.length === 0) {
      return { status: false, message: 'Tautan unduhan tidak ditemukan dalam HTML.' };
    }

    return {
      status: true,
      content_type: contentType,
      downloads: downloadLinks,
    };
  } catch (error) {
    return { status: false, message: error.message || 'Terjadi kesalahan saat menghubungi API InDown.' };
  }
}

router.get('/', async (req, res) => {
  try {
    const url = req.query.url?.trim();

    if (!url || !url.includes('instagram.com')) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: 'Masukkan parameter url Instagram yang valid (contoh: ?url=https://www.instagram.com/reel/...)',
      });
    }

    const resData = await fetchInDown(url);

    if (!resData.status) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: resData.message,
      });
    }

    return res.json({
      status: true,
      creator: 'ArulzXD',
      result: {
        content_type: resData.content_type,
        downloads: resData.downloads,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan Instagram.',
    });
  }
});

router.desc = 'InDown Instagram Downloader (mendukung Post, Reel, Story, & IGTV).';
router.paramsConfig = {
  url: 'contoh: https://www.instagram.com/reel/... atau https://www.instagram.com/p/...',
};
router.status = 'ready';
router.type = 'free';

export default router;
