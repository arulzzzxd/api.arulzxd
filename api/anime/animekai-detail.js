import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const BASE_URL = 'https://animekai.com.ro';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    Referer: BASE_URL,
    'Upgrade-Insecure-Requests': '1'
  }
});

const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
const abs = (u) => { try { return u ? new URL(u, BASE_URL).toString() : null } catch { return null } };

function parseEpisodeList($) {
  const episodes = [];

  $('.ak-cl-eps li').each((_, el) => {
    const $el = $(el);
    const a = $el.find('a').first();
    episodes.push({
      number: clean($el.attr('data-num') || $el.find('.gnum').text()),
      title: clean(a.attr('title') || $el.find('.ttl').text()),
      url: abs(a.attr('href'))
    });
  });
  if (episodes.length) return episodes;

  $('.eplister ul li, .episodelist ul li, .episodelist li').each((_, el) => {
    const $el = $(el);
    const a = $el.find('a').first();
    episodes.push({
      number: clean($el.find('.epl-num, .num').text()),
      title: clean($el.find('.epl-title, .ttl, .title').text() || a.attr('title')),
      url: abs(a.attr('href'))
    });
  });
  if (episodes.length) return episodes;

  $('a[href*="episode-"]').each((_, el) => {
    const $el = $(el);
    const title = clean($el.attr('title') || $el.text());
    const url = abs($el.attr('href'));
    if (!title || !url || episodes.some(e => e.url === url)) return;
    episodes.push({ number: title.match(/\d+/)?.[0] || '', title, url });
  });
  return episodes;
}

function parseSeriesInfo($) {
  const info = {};
  $('.ak-cl-spe span, .bigcontent .infox .spe span').each((_, el) => {
    const match = clean($(el).text()).match(/^([^:]+):\s*(.+)$/);
    if (match) info[match[1].trim().toLowerCase().replace(/\s+/g, '_')] = match[2].trim();
  });

  const genres = $('.ak-cl-genres a, .bigcontent .infox .genxed a').map((_, el) => clean($(el).text())).get();

  return {
    title: clean($('.ak-cl-title').text() || $('.bigcontent .infox h1').text() || $('h1.entry-title').text()),
    poster: abs($('.ak-cl-poster img').attr('src') || $('.bigcontent .thum img').attr('src') || $('meta[property="og:image"]').attr('content')),
    type: info.type || clean($('.ak-cl-type').text()),
    status: info.status,
    released: info.released,
    season: info.season,
    duration: info.duration,
    totalEpisodes: info.episodes,
    genres,
    description: clean($('.ak-cl-desc').text() || $('.entry-content p').first().text() || $('meta[name="description"]').attr('content'))
  };
}

async function getAnimeDetail(animeUrl) {
  const url = abs(animeUrl);
  if (!url) throw new Error('URL anime tidak valid');
  const { data } = await http.get(url);
  const $ = cheerio.load(data);
  return { ...parseSeriesInfo($), episodes: parseEpisodeList($) };
}

router.get('/', async (req, res) => {
  const url = req.query.url?.trim();

  if (!url) {
    return res.status(400).json({
      status: false,
      creator: 'Arulzxd',
      message: "Parameter 'url' anime wajib diisi!"
    });
  }

  try {
    const result = await getAnimeDetail(url);
    return res.status(200).json({
      status: true,
      creator: 'Arulzxd',
      result
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Gagal mengambil detail anime.',
      error: err.message
    });
  }
});

router.title = "AnimeKai Detail";
router.desc = "Mengambil informasi detail dan daftar episode anime dari AnimeKai.";
router.paramsConfig = {
  url: "contoh: https://animekai.com.ro/..."
};
router.status = "ready";
router.type = "free";

export default router;
