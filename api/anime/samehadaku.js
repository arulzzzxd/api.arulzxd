import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const BASE_URL = "https://v2.samehadaku.how";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

router.get('/', async (req, res) => {
  try {
    const { data: html } = await axios.get(BASE_URL, {
      headers: { 'User-Agent': UA }
    });
    const $ = cheerio.load(html);
    const result = { top_10_minggu_ini: [], latest_anime: [], movie_terbaru: [] };

    // Top 10 Minggu Ini
    $(".topten-animesu li").each((i, el) => {
      if (result.top_10_minggu_ini.length >= 10) return false;
      const $el = $(el);
      const a = $el.find("a.series").first();
      const rank = $el.find("b.is-topten b:last-child").text().trim();
      const title = $el.find(".judul").text().trim();
      const rating = $el.find(".rating").text().trim();
      const url = a.attr("href") || "";
      const image = $el.find("img").attr("src") || "";
      result.top_10_minggu_ini.push({ rank, title, rating, url, image });
    });

    // Latest Anime
    $("h2.entry-title").each((i, el) => {
      const a = $(el).find("a").first();
      const title = $(el).text().trim();
      let url = a.attr("href") || "";
      if (!url.startsWith("http")) url = BASE_URL + url;
      const li = $(el).closest("li");
      const image = li.find(".thumb img").attr("src") || li.find("img").first().attr("src") || "";
      const episode = li.find(".dtla span").first().text().trim();
      const postedBy = li.find(".dtla .author").text().trim();
      const releasedOn = li.find(".dtla span").last().text().trim();
      result.latest_anime.push({ title, url, image, episode, posted_by: postedBy, released_on: releasedOn });
    });

    // Movie Terbaru
    const seenMovies = new Set();
    $(".widgetseries").last().find("li").each((i, el) => {
      const $el = $(el);
      const a = $el.find("a.series").first();
      const h2 = $el.find("h2").first();
      const title = h2.text().trim() || $el.find(".judul").text().trim();
      let url = a.attr("href") || h2.find("a").attr("href") || "";
      if (!url.startsWith("http")) url = BASE_URL + url;
      if (!title || seenMovies.has(url)) return;
      seenMovies.add(url);
      const image = $el.find("img").attr("src") || "";
      const genres = [];
      $el.find("span a[rel='tag']").each((j, g) => genres.push($(g).text().trim()));
      const date = $el.find(".lftinfo span").last().text().trim();
      result.movie_terbaru.push({ title, url, image, genres, date });
    });

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Gagal mengambil data beranda Samehadaku",
      error: err.message
    });
  }
});

router.title = "Samehadaku Home";
router.desc = "Mengambil data anime terbaru, top 10 minggu ini, dan movie terbaru dari beranda.";
router.status = "ready";
router.type = "free";

export default router;
