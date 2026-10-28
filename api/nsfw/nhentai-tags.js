import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://nhentai.net/api/v2';
const HEADERS = {
  'User-Agent': 'nhentai-scraper/1.0',
  'Accept': 'application/json'
};

const VALID_TAG_TYPES = ["tag", "artist", "parody", "character", "language", "group", "category"];

async function getTags(tagType = 'tag', page = 1) {
  try {
    if (!VALID_TAG_TYPES.includes(tagType)) {
      return {
        status: false,
        message: `Kategori tag tidak valid. Pilih dari: ${VALID_TAG_TYPES.join(', ')}`
      };
    }

    const { data } = await axios.get(`${BASE_URL}/tags/${tagType}`, {
      params: { page },
      headers: HEADERS,
      timeout: 15000
    });

    if (!data || !data.result) {
      return { status: false, message: 'Gagal mengambil tag.' };
    }

    return {
      status: true,
      result: data
    };
  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.message || 'Terjadi kesalahan saat mengambil data tag.'
    };
  }
}

router.get('/', async (req, res) => {
  try {
    const type = req.query.type || 'tag';
    const page = req.query.page || 1;

    const resData = await getTags(type, page);

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

router.title = "nHentai Tags Explorer";
router.desc = "nHentai Tag Explorer API.";
router.paramsConfig = {
  type: {
    type: "select",
    options: ["tag", "artist", "parody", "character", "language", "group", "category"]
  },
  page: "contoh: 1"
};
router.status = "ready";
router.type = "premium";

export default router;
