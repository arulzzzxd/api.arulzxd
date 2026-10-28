import express from 'express';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } = require('tough-cookie');

const router = express.Router();

const BASE_URL = 'https://getdl.space';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://getdl.space/id/search/tiktok',
  'Origin': 'https://getdl.space'
};

async function searchTikTok(query, count = 10, region = 'ID') {
  const jar = new CookieJar();
  const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 15000
  }));

  const sessionRes = await client.get(`${BASE_URL}/api/session`, { headers: HEADERS });
  
  if (!sessionRes.data?.success || !sessionRes.data.sessionId) {
    throw new Error('Gagal inisialisasi session pada server target.');
  }
  
  const sessionId = sessionRes.data.sessionId;

  const payload = {
    query: query,
    count: count,
    cursor: 0,
    region: region,
    sessionId: sessionId,
    sortType: 0
  };

  const searchRes = await client.post(`${BASE_URL}/api/search/tiktok`, payload, { 
    headers: { ...HEADERS, 'Content-Type': 'application/json' }
  });

  if (searchRes.status !== 200) {
    throw new Error(`Server menolak permintaan (Status: ${searchRes.status})`);
  }

  if (!searchRes.data?.success) {
    throw new Error(`API Error: ${JSON.stringify(searchRes.data)}`);
  }

  const { totalResults, videos } = searchRes.data.data;
  
  const results = videos.map((v, i) => ({
    index: i + 1,
    title: v.title,
    duration: `${v.duration}s`,
    play_url: v.playUrl,
    cover_url: v.cover,
    created_at: new Date(v.createdAt).toLocaleString('id-ID')
  }));

  return {
    query: query,
    total_results: totalResults,
    data: results
  };
}

// Endpoint GET untuk pencarian video TikTok
router.get('/', async (req, res) => {
  try {
    const query = req.query.query?.trim() || req.query.q?.trim() || 'Supra mk4';
    const count = parseInt(req.query.count) || 10;

    const result = await searchTikTok(query, count);

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      ...result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat melakukan pencarian video TikTok",
      error: err.message
    });
  }
});

router.desc = "Mencari video TikTok berdasarkan kata kunci.";
router.paramsConfig = {
  query: "contoh: Supra mk4",
  count: "contoh: 10"
};

router.status = "ready";
router.type = "free";

export default router;
