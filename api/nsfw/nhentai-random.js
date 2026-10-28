import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://nhentai.net/api/v2';
const IMG_SERVERS = ['https://i1.nhentai.net', 'https://i2.nhentai.net', 'https://i3.nhentai.net', 'https://i4.nhentai.net'];
const HEADERS = {
  'User-Agent': 'nhentai-scraper/1.0',
  'Accept': 'application/json'
};

function getRandomImageServer() {
  return IMG_SERVERS[Math.floor(Math.random() * IMG_SERVERS.length)];
}

async function getRandomGallery() {
  try {
    const randRes = await axios.get(`${BASE_URL}/galleries/random`, {
      headers: HEADERS,
      timeout: 15000
    });

    const randomId = randRes.data?.id;
    if (!randomId) {
      return { status: false, message: 'Gagal mendapatkan Random ID.' };
    }

    const { data } = await axios.get(`${BASE_URL}/galleries/${randomId}`, {
      headers: HEADERS,
      timeout: 15000
    });

    const images = (data.pages || []).map(p => `${getRandomImageServer()}/${p.path}`);

    return {
      status: true,
      result: {
        id: data.id,
        media_id: data.media_id,
        title: data.title,
        num_pages: data.num_pages,
        num_favorites: data.num_favorites,
        upload_date: data.upload_date,
        tags: data.tags,
        images: images
      }
    };
  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.message || 'Terjadi kesalahan saat mengambil random gallery.'
    };
  }
}

router.get('/', async (req, res) => {
  try {
    const resData = await getRandomGallery();

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
      result: resData.result
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server.'
    });
  }
});

router.title = "Hentai Random";
router.desc = "nHentai Random Gallery Generator.";
router.paramsConfig = {};
router.status = "ready";
router.type = "premium";

export default router;
