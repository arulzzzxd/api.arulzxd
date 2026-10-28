import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://nhentai.net/api/v2';
const HEADERS = {
  'User-Agent': 'nhentai-scraper/1.0',
  'Accept': 'application/json'
};

async function searchGallery(query, page = 1, perPage = 25) {
  try {
    const { data } = await axios.get(`${BASE_URL}/search`, {
      params: {
        query: query,
        page: page,
        per_page: perPage
      },
      headers: HEADERS,
      timeout: 15000
    });

    if (!data || !data.result) {
      return {
        status: false,
        message: 'Tidak ada hasil ditemukan.'
      };
    }

    return {
      status: true,
      total: data.total || 0,
      num_pages: data.num_pages || 0,
      per_page: data.per_page || perPage,
      page: Number(page),
      result: data.result
    };
  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.message || 'Terjadi kesalahan saat mencari.'
    };
  }
}

router.get('/', async (req, res) => {
  try {
    const query = req.query.query || req.query.q || req.query.search;
    const page = req.query.page || 1;
    const perPage = req.query.per_page || 25;

    if (!query) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: "Masukkan parameter 'query' atau 'q' (contoh: ?query=miku)"
      });
    }

    const resData = await searchGallery(query, page, perPage);

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
      result: resData
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses pencarian.'
    });
  }
});

router.title = "Hentai Search";
router.desc = "nHentai Search API untuk mencari doujin/gallery.";
router.paramsConfig = {
  query: "miku",
  page: "contoh: 1",
  per_page: "contoh: 25"
};
router.status = "ready";
router.type = "premium";

export default router;
