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

async function getDetail(slug) {
  const html = await pageText(`${BASE}/series/${encodeURIComponent(slug)}`);
  let series = null;
  const si = html.indexOf('"series":{');
  if (si !== -1) {
    const end = html.indexOf('}}]}', si);
    if (end !== -1) {
      try {
        series = JSON.parse(html.slice(si + 9, end + 1));
      } catch {}
    }
  }

  const syn = html.match(/class="dl-details-synopsis"[\s\S]*?"text":"([^"]+)"/)?.[1]?.replace(/\\n/g, '\n') || '';
  const eps = [];
  const re = /"episode_number":(\d+),"download_links":null,"slug":"([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) eps.push(parseInt(m[1], 10));

  return {
    title: series?.name || slug,
    rating: series?.rating || null,
    status: series?.status || null,
    genres: series?.genres_string || null,
    synopsis: syn,
    episodes: [...new Set(eps)].sort((a, b) => a - b)
  };
}

router.get('/', async (req, res) => {
  try {
    const rawSlug = req.query.slug?.trim();

    if (!rawSlug) {
      return res.status(400).json({
        status: false,
        creator: 'Arulzxd',
        message: "Parameter 'slug' wajib diisi!"
      });
    }

    // Ekstrak slug jika yang dimasukkan berupa URL lengkap
    const slug = rawSlug.split('/').filter(Boolean).pop() || '';
    const detailData = await getDetail(slug);

    return res.status(200).json({
      status: true,
      creator: 'Arulzxd',
      slug: slug,
      result: detailData
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat mengambil detail donghua',
      error: err.message
    });
  }
});

router.title = "Dongworld Detail";
router.desc = "Mengambil detail informasi, sinopsis, dan daftar episode donghua berdasarkan slug.";
router.paramsConfig = {
  slug: "contoh: perfect-world-sub-indo"
};

router.status = "ready";
router.type = "free";

export default router;
