import express from 'express';
import axios from 'axios';

const router = express.Router();

async function scrapePikwy(targetUrl) {
  const headers = {
    'Accept': '*/*',
    'Accept-Language': 'id-ID,id;q=0.9',
    'Priority': 'u=1, i',
    'Sec-Ch-Ua': '"Chromium";v="147", "Not.A/Brand";v="8"',
    'Sec-Ch-Ua-Mobile': '?1',
    'Sec-Ch-Ua-Platform': '"Android"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://pikwy.com/'
  };

  try {
    const encodeFirst = encodeURIComponent(targetUrl);
    const encodedUrl = encodeURIComponent(encodeFirst);
    const apiUrl = `https://api.pikwy.com/?tkn=125&d=3000&u=${encodedUrl}&fs=1&w=1280&h=1200&s=100&z=100&f=jpg&rt=jweb`;

    const { data: resData, status: resStatus } = await axios.get(apiUrl, { 
      headers, 
      validateStatus: () => true 
    });

    if (resStatus >= 400 || !resData) {
      throw new Error(`API HTTP Error ${resStatus}`);
    }

    const iurl = resData.iurl || '';
    if (!iurl) {
      throw new Error(typeof resData === 'object' ? JSON.stringify(resData) : 'Gagal mengambil screenshot');
    }

    let hostName = '';
    try {
      const urlObj = new URL(targetUrl);
      hostName = urlObj.hostname || '';
    } catch (e) {}

    const media = [];
    if (iurl) media.push({ type: 'image', url: iurl });
    if (resData.durl) media.push({ type: 'direct', url: resData.durl });
    if (resData.curl) media.push({ type: 'link', url: resData.curl });

    return {
      status: true,
      data: {
        date: resData.date || new Date().toLocaleString('id-ID'),
        ourl: resData.ourl || targetUrl,
        author: hostName || targetUrl,
        curl: resData.curl || null,
        durl: resData.durl || null,
        iurl: resData.iurl || null,
        media: media
      }
    };

  } catch (error) {
    let errMsg = error.message || 'Unknown Error';
    if (error.response && error.response.data) {
      errMsg = typeof error.response.data === 'object' 
        ? JSON.stringify(error.response.data) 
        : error.response.data;
    }
    return {
      status: false,
      message: errMsg
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
        message: 'Masukkan parameter url (contoh: ?url=https://google.com)'
      });
    }

    const result = await scrapePikwy(url);

    if (!result.status) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: result.message || 'Gagal membuat screenshot dari URL yang diberikan.'
      });
    }

    return res.json({
      status: true,
      creator: 'ArulzXD',
      result: result.data
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses tangkapan layar.'
    });
  }
});

// Parameter metadata untuk parser otomatis /apilist
router.title = "sswebv2";
router.desc = "Web Screenshot Tool untuk mengambil tangkapan layar dari sebuah URL web.";
router.paramsConfig = {
  url: "https://google.com"
};
router.status = "ready";
router.type = "free";

export default router;
