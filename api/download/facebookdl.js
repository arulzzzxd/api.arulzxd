import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import qs from 'qs';

const router = express.Router();

async function fetchFgetLinks(fbUrl) {
  try {
    const payload = qs.stringify({ id: fbUrl, locale: 'id' });
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Hx-Current-Url': 'https://fget.io/id',
      'Hx-Request': 'true',
      'Hx-Target': 'target',
      'Hx-Trigger': 'form',
      'Origin': 'https://fget.io',
      'Referer': 'https://fget.io/id'
    };

    const { data: html } = await axios.post('https://fget.io/process', payload, { headers, timeout: 15000 });
    const $ = cheerio.load(html);

    const thumbnail = $('.result-thumbnail img').attr('src') || null;
    const downloads = [];

    $('.space-y-2 .flex').each((_, el) => {
      const quality = $(el).find('.text-sm').text().trim();
      const type = $(el).find('.text-xs').text().replace(/[()]/g, '').trim();
      const url = $(el).find('a').attr('href');

      if (quality && url) {
        downloads.push({ quality, type, url });
      }
    });

    return { thumbnail, downloads };
  } catch {
    return { thumbnail: null, downloads: [] };
  }
}

async function fetchWayInMeta(fbUrl) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      'Content-Type': 'application/json',
      'Origin': 'https://wayin.ai',
      'Referer': 'https://wayin.ai/',
      'X-Platform': 'web'
    };

    const parseRes = await axios.post(
      `https://wayinvideo-api.wayin.ai/api/parse_url?url=${encodeURIComponent(fbUrl)}`,
      {},
      { headers, timeout: 15000 }
    );

    const cleanVideoUrl = parseRes.data?.data || fbUrl;

    const metaRes = await axios.post(
      'https://wayinvideo-api.wayin.ai/api/p/v2/get_video_meta',
      { video_url: cleanVideoUrl },
      { headers, timeout: 15000 }
    );

    const meta = metaRes.data?.data || {};

    return {
      title: meta.title || null,
      author: meta.author || null,
      abstract: meta.abstract || null,
      duration: meta.duration ? `${Math.floor(meta.duration / 1000)}s` : null,
      view_count: meta.view_count || 0,
      comment_count: meta.comment_count || 0,
      like_count: meta.like_count || 0,
      published_at: meta.published_at ? new Date(meta.published_at * 1000).toISOString() : null,
      resolution: meta.res || null
    };
  } catch {
    return null;
  }
}

async function fbDownloader(fbUrl) {
  try {
    const [fgetData, metaData] = await Promise.all([
      fetchFgetLinks(fbUrl),
      fetchWayInMeta(fbUrl)
    ]);

    if (!fgetData.downloads.length) {
      return {
        status: false,
        message: 'Gagal mengambil media download.'
      };
    }

    return {
      status: true,
      metadata: metaData || { title: 'No Metadata Available' },
      downloads: {
        thumbnail: fgetData.thumbnail,
        links: fgetData.downloads
      }
    };

  } catch (err) {
    return {
      status: false,
      message: err.message
    };
  }
}

router.get('/', async (req, res) => {
  try {
    const url = req.query.url?.trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: 'Masukkan parameter url (contoh: ?url=https://www.facebook.com/share/r/...)'
      });
    }

    const resData = await fbDownloader(url);

    if (!resData.status) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: resData.message
      });
    }

    return res.json({
      status: true,
      creator: 'ArulzXD',
      result: {
        metadata: resData.metadata,
        downloads: resData.downloads
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan Facebook.'
    });
  }
});

router.desc = "Facebook Video & Reel Downloader untuk mengunduh media dari Facebook.";
router.paramsConfig = {
  url: "contoh: https://www.facebook.com/share/r/1Be7n8L1MV/"
};
router.status = "ready";
router.type = "free";

export default router;
