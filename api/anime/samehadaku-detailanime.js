import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const BASE_URL = "https://v2.samehadaku.how";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

router.get('/', async (req, res) => {
  const url = req.query.url?.trim();

  if (!url || !url.startsWith("http")) {
    return res.status(400).json({
      status: false,
      creator: "Arulzxd",
      message: "Parameter 'url' detail anime wajib diisi dengan URL valid!"
    });
  }

  try {
    const { data: html } = await axios.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(html);

    let title = $("h1.titless, .animetitle-episode, h1").first().text().trim() || "";
    title = title.replace(/^(Tonton|Watch|Streaming|List Episode)\s+/i, "").trim();
    const image = $("img[class*='anmsa'], img[itemprop='image'], .thumb img").first().attr("src") || "";
    const synopsis = $(".series-synopsis, .desc, .sinopsis, .entry-content entry-content").first().text().trim() || "";

    const info = {};
    $(".infox .spe span, .spe span, .seriestuinfo span").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes(":")) {
        const [k, ...v] = text.split(":");
        info[k.trim()] = v.join(":").trim();
      }
    });

    const genres = [];
    $("a[href*='genre'], .seriestugenre a").each((i, el) => genres.push($(el).text().trim()));

    const episodes = [];
    const seenUrls = new Set();
    $(".eplister ul li a, a[href*='episode']").each((i, el) => {
      let epUrl = $(el).attr("href") || "";
      if (!epUrl.startsWith("http")) epUrl = BASE_URL + epUrl;
      if (seenUrls.has(epUrl) || !epUrl.includes("episode")) return;
      seenUrls.add(epUrl);
      episodes.push({ title: $(el).text().trim(), url: epUrl });
    });

    const recommendations = [];
    $(".rand-animesu li").each((i, el) => {
      const $el = $(el);
      const a = $el.find("a.series").first();
      let recUrl = a.attr("href") || "";
      if (!recUrl.startsWith("http")) recUrl = BASE_URL + recUrl;
      recommendations.push({
        title: $el.find(".judul").text().trim(),
        url: recUrl,
        image: $el.find("img").attr("src") || "",
        rating: $el.find(".rating").text().trim(),
        episode: $el.find(".episode").text().trim()
      });
    });

    const batchLinks = [];
    $(".mctbx .boxdownload a, .boxdl a").each((i, el) => {
      batchLinks.push({ title: $(el).text().trim(), url: $(el).attr("href") || "" });
    });

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      result: {
        title,
        image,
        synopsis,
        info,
        genres,
        episodes,
        recommendations,
        batch_links: batchLinks
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Gagal mengambil detail anime",
      error: err.message
    });
  }
});

router.title = "Detail Anime";
router.desc = "Mengambil detail anime, daftar episode, sinopsis, dan rekomendasi dari URL anime.";
router.paramsConfig = {
  url: "text (contoh: https://v2.samehadaku.how/anime/one-piece/)"
};

router.status = "ready";
router.type = "free";

export default router;
