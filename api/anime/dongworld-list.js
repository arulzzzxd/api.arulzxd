import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE = 'https://dongworld.top';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function pageText(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
    },
    timeout: 20000
  });
  return String(data).replace(/\\"/g, '"');
}

function parseCards(html) {
  const re = /href="\/series\/([^"]+)"[\s\S]*?alt="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?class="dl-card-title">([^<]+)<[\s\S]*?span>([^<]+eps)<[\s\S]*?fa-star"><\/i>([^<]+)</g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({
      slug: m[1],
      title: m[4].trim(),
      cover: m[3].startsWith('http') ? m[3] : BASE + m[3],
      eps: m[5].replace(/<!-- -->/g, '').trim(),
      rating: m[6].trim()
    });
  }
  return out;
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);

    const html = await pageText(`${BASE}/series?page=${page}`);
    const results = parseCards(html);

    if (!results.length) {
      return res.status(404).json({
        status: false,
        creator: 'Arulzxd',
        message: `Katalog donghua pada halaman ${page} kosong.`
      });
    }

    return res.status(200).json({
      status: true,
      creator: 'Arulzxd',
      page: page,
      total: results.length,
      result: results
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat mengambil katalog donghua',
      error: err.message
    });
  }
});

router.title = "Dongworld List Catalog";
router.desc = "Mengambil daftar katalog donghua berdasarkan nomor halaman.";
router.paramsConfig = {
  page: "contoh: 1"
};

router.status = "ready";
router.type = "free";

export default router;
