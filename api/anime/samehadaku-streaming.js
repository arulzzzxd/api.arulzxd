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
      message: "Parameter 'url' episode wajib diisi dengan URL valid!"
    });
  }

  try {
    const { data: html } = await axios.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim() || "";
    const animeUrl = $("a").filter(function() { return $(this).text().trim() === "All Episode"; }).attr("href") || "";

    const players = [];
    $(".east_player_option").each((i, el) => {
      const $el = $(el);
      players.push({
        name: $el.find("span").text().trim() || $el.text().trim(),
        data_post: $el.attr("data-post") || "",
        data_nume: $el.attr("data-nume") || "",
        data_type: $el.attr("data-type") || ""
      });
    });

    $("iframe.embed-embed, .mirrorifram iframe, iframe[src*='embed'], iframe[src*='player']").each((i, el) => {
      players.push({ name: "iframe", src: $(el).attr("src") || "", type: "iframe" });
    });

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

    const episodeList = [];
    const seenEpUrls = new Set();
    $("a").each((i, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      if (href.includes("episode") && text.match(/Episode\s+\d+/) && !seenEpUrls.has(href)) {
        seenEpUrls.add(href);
        episodeList.push({ title: text, url: href });
      }
    });

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      result: {
        title,
        anime_url: animeUrl,
        players,
        downloads,
        episode_list: episodeList
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Gagal mengambil data episode streaming dan link download",
      error: err.message
    });
  }
});

router.title = "Streaming & Download Episode";
router.desc = "Mengambil player embed streaming dan daftar link download episode Samehadaku.";
router.paramsConfig = {
  url: "text (contoh: https://v2.samehadaku.how/one-piece-episode-1100/)"
};

router.status = "ready";
router.type = "free";

export default router;
