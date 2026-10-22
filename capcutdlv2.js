import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://snapvideotools.com';
const API_ENDPOINT = `${BASE_URL}/id/api/snap`;

const HEADERS = {
  'Content-Type': 'application/json',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/id/capcut-downloader`,
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Sec-Ch-Ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?1',
  'Sec-Ch-Ua-Platform': '"Android"',
  'X-Requested-With': 'XMLHttpRequest'
};

async function downloadCapCut(targetUrl) {
  try {
    const response = await axios.post(
      API_ENDPOINT,
      { text: targetUrl },
      { headers: HEADERS, timeout: 30000 }
    );

    return {
      status: true,
      data: response.data
    };
  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.response?.data || error.message || 'Gagal mengunduh media CapCut.'
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
        message: 'Masukkan parameter url (contoh: ?url=https://www.capcut.com/tv2/ZS42qbGY9/)'
      });
    }

    const resData = await downloadCapCut(url);

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
      result: resData.data
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan CapCut.'
    });
  }
});

router.desc = "CapCut Video Downloader untuk mengunduh media dari template/video CapCut.";
router.paramsConfig = {
  url: "contoh: https://www.capcut.com/tv2/ZS42qbGY9/"
};
router.status = "ready";
router.type = "free";

export default router;
