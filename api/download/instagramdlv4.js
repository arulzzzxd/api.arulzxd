import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

async function snapinstaDownloader(url) {
  try {
    const igRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels|tv|stories)\/([^/?&]+)/i;
    if (!igRegex.test(url)) {
      return {
        status: false,
        message: 'URL tidak valid. Pastikan URL berasal dari Instagram.'
      };
    }

    const payload = new URLSearchParams({ url: url }).toString();

    const response = await axios.post('https://snapinsta.tel/process', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://snapinsta.tel/',
        'Origin': 'https://snapinsta.tel',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html, */*; q=0.01'
      },
      timeout: 15000
    });

    const html = response.data;

    if (!html || !html.includes('download-media')) {
      return {
        status: false,
        message: 'Gagal mendapatkan link download. Akun mungkin private atau link salah.'
      };
    }

    const $ = cheerio.load(html);
    const results = [];

    $('.download-item').each((index, element) => {
      const $el = $(element);

      let username = $el.find('.download-top .left').text().trim();
      username = username.replace(/\s+/g, ' ');

      const thumbnail = $el.find('.media-box img[alt="Preview"]').attr('src') || '';
      const downloadUrl = $el.find('.download-media').attr('href') || '';
      const mediaType = $el.find('.download-media').text().trim();

      if (downloadUrl) {
        results.push({
          username: username,
          thumbnail: thumbnail,
          type: mediaType,
          url: downloadUrl
        });
      }
    });

    if (!results.length) {
      return {
        status: false,
        message: 'Media tidak ditemukan dalam HTML respons.'
      };
    }

    return {
      status: true,
      username: results[0].username || '',
      results: results
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || 'Terjadi kesalahan saat memproses unduhan.'
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
        message: 'Masukkan parameter url Instagram (contoh: ?url=https://www.instagram.com/reel/...)'
      });
    }

    const resData = await snapinstaDownloader(url);

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
      username: resData.username,
      result: resData.results
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan Instagram.'
    });
  }
});

router.desc = "SnapInsta Instagram Downloader untuk mengunduh Post, Reel, Story, & TV Instagram.";
router.paramsConfig = {
  url: "contoh: https://www.instagram.com/reel/..."
};
router.status = "ready";
router.type = "free";

export default router;
