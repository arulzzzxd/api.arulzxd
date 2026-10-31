import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const BASE_URL = "https://v2.samehadaku.how";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

router.get('/', async (req, res) => {
  try {
    const { data: html } = await axios.get(`${BASE_URL}/daftar-batch`, {
      headers: { 'User-Agent': UA }
    });
    const $ = cheerio.load(html);
    const items = [];

    $("article.animpost, .relat article, .animepost").each((i, el) => {
      const $el = $(el);
      let url = $el.find("a").first().attr("href") || "";
      if (!url.startsWith("http")) url = BASE_URL + url;
      const genres = [];
      $el.find(".genres a, .mta a, a[rel='tag']").each((j, g) => genres.push($(g).text().trim()));
      items.push({
        title: $el.find(".data .title h2, .data .title, h2").first().text().trim(),
        url,
        image: $el.find("img").attr("src") || "",
        score: $el.find(".score").text().trim(),
        status: $el.find(".data .type, .type").first().text().trim(),
        genres
      });
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
      message: "Gagal mengambil daftar anime batch",
      error: err.message
    });
  }
});

router.title = "Daftar Batch Anime";
router.desc = "Mengambil daftar anime paket batch yang siap diunduh.";
router.status = "ready";
router.type = "free";

export default router;
