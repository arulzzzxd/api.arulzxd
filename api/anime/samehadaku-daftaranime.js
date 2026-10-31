import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const BASE_URL = "https://v2.samehadaku.how";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

router.get('/', async (req, res) => {
  try {
    const { data: html } = await axios.get(`${BASE_URL}/daftar-anime-2/?list`, {
      headers: { 'User-Agent': UA }
    });
    const $ = cheerio.load(html);
    const items = [];

    $(".listttl ul li a, .listpst li a").each((i, el) => {
      const title = $(el).text().trim();
      let url = $(el).attr("href") || "";
      if (!url.startsWith("http")) url = BASE_URL + url;
      if (title) items.push({ title, url });
    });

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      total: items.length,
      result: items
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Gagal mengambil daftar anime",
      error: err.message
    });
  }
});

router.title = "Daftar Anime";
router.desc = "Mengambil seluruh daftar indeks anime yang tersedia di Samehadaku.";
router.status = "ready";
router.type = "free";

export default router;
