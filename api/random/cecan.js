import express from 'express';
import axios from 'axios';

const router = express.Router();

const CATEGORIES = [
  "china",
  "indonesia",
  "japan",
  "javanese",
  "hijab",
  "korea",
  "malaysia",
  "thailand",
  "vietnam"
];

async function getRandomCecanPic(category) {
  try {
    const rawUrl = `https://raw.githubusercontent.com/arulzzzxd/database/main/random-cecan/${category}.json`;
    const { data } = await axios.get(rawUrl, { timeout: 10000 });

    let parsedData = data;
    if (typeof data === 'string') {
      parsedData = JSON.parse(data);
    }

    let urls = [];
    if (Array.isArray(parsedData)) {
      urls = parsedData;
    } else if (parsedData && typeof parsedData === 'object') {
      const dynamicKey = Object.keys(parsedData).find(key => Array.isArray(parsedData[key]));
      if (dynamicKey) {
        urls = parsedData[dynamicKey];
      } else {
        urls = Object.values(parsedData);
      }
    }

    if (!urls || urls.length === 0) {
      throw new Error(`Kategori '${category}' kosong atau tidak ditemukan.`);
    }

    // Ambil item acak dari array
    const randomItem = urls[Math.floor(Math.random() * urls.length)];

    let randomUrl = '';
    if (typeof randomItem === 'string') {
      randomUrl = randomItem;
    } else if (randomItem && typeof randomItem === 'object') {
      randomUrl = randomItem.result || randomItem.url || Object.values(randomItem).find(v => typeof v === 'string' && v.startsWith('http'));
    }

    if (!randomUrl || !randomUrl.trim().startsWith('http')) {
      throw new Error("Gagal mengekstrak URL gambar yang valid.");
    }

    // Unduh gambar dari CDN
    const response = await axios.get(randomUrl.trim(), {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'image/jpeg'
    };
  } catch (error) {
    throw error;
  }
}

// Endpoint GET utama
router.get('/', async (req, res) => {
  try {
    const categoryParam = (req.query.category || req.query.type || 'indonesia').toLowerCase().trim();
    const category = CATEGORIES.includes(categoryParam) ? categoryParam : 'indonesia';

    const imageResult = await getRandomCecanPic(category);

    res.setHeader('Content-Type', imageResult.contentType);
    res.setHeader('Content-Length', imageResult.buffer.length);
    return res.end(imageResult.buffer);

  } catch (error) {
    console.error("Random Cecan Route Error:", error.message);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Gagal mengambil gambar cecan",
      error: error.message
    });
  }
});

router.title = "Random Cecan";
router.desc = "Mengambil gambar cecan acak berdasarkan kategori negara / jenis.";
router.paramsConfig = {
  category: {
    type: "select",
    options: CATEGORIES,
    default: "indonesia"
  }
};

router.status = "ready";
router.type = "free";

export default router;
