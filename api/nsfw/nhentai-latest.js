import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://nhentai.net/api/v2';
const HEADERS = {
  'User-Agent': 'nhentai-scraper/1.0',
  'Accept': 'application/json'
};

async function getGalleries(type = 'latest', page = 1, perPage = 25) {
  try {
    const endpoint = type === 'popular' ? `${BASE_URL}/galleries/popular` : `${BASE_URL}/galleries`;
    const params = type === 'popular' ? {} : { page, per_page: perPage };

    const { data } = await axios.get(endpoint, {
      params,
      headers: HEADERS,
      timeout: 15000
    });

    if (!data) {
      return { status: false, message: 'Gagal mengambil data.' };
    }

    return {
      status: true,
      result: data
    };
  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.message || 'Terjadi kesalahan saat mengambil daftar gallery.'
    };
  }
}

router.get('/', async (req, res) => {
  try {
    const type = req.query.type || 'latest';
    const page = req.query.page || 1;
    const perPage = req.query.per_page || 25;

    const resData = await getGalleries(type, page, perPage);

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

router.title = "Hentai Latest";
router.desc = "nHentai Latest / Popular Galleries List.";
router.paramsConfig = {
  type: {
    type: "select",
    options: ["latest", "popular"]
  },
  page: "contoh: 1",
  per_page: "contoh: 25"
};
router.status = "ready";
router.type = "premium";

export default router;
