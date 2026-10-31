import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

router.get('/', async (req, res) => {
  const url = req.query.url?.trim();

  if (!url || !url.startsWith("http")) {
    return res.status(400).json({
      status: false,
      creator: "Arulzxd",
      message: "Parameter 'url' batch wajib diisi dengan URL valid!"
    });
  }

  try {
    const { data: html } = await axios.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim() || "";
    const downloads = [];

    $(".download-eps").each((i, el) => {
      const $el = $(el);
      const format = $el.find("p b").text().trim() || "Unknown";
      const links = [];
      $el.find("ul li").each((j, li) => {
        const $li = $(li);
        const quality = $li.find("strong").text().trim();
        const providers = [];
        $li.find("span a").each((k, a) => {
          providers.push({ provider: $(a).text().trim(), url: $(a).attr("href") || "" });
        });
        if (quality) links.push({ quality, providers });
      });
      if (links.length) downloads.push({ format, links });
    });

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      result: { title, url, downloads }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Gagal mengambil detail link unduhan batch",
      error: err.message
    });
  }
});

router.title = "Detail Batch Download";
router.desc = "Mengambil daftar link unduhan dari URL batch anime.";
router.paramsConfig = {
  url: "text (contoh: https://v2.samehadaku.how/batch/one-piece-batch/)"
};

router.status = "ready";
router.type = "free";

export default router;
