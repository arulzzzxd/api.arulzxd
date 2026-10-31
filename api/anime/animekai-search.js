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

function parseAItem($, el) {
  const $el = $(el);
  const titleEl = $el.find('.title').first();
  const href = titleEl.attr('href') || $el.find('a.poster').attr('href') || $el.attr('href') || $el.find('a').attr('href');
  return {
    title: clean(titleEl.text()) || clean($el.attr('title')),
    url: abs(href),
    poster: abs($el.find('img').attr('src') || $el.find('img').attr('data-src')),
    subEpisode: clean($el.find('.sub').text()),
    dubEpisode: clean($el.find('.dub').text()),
    type: clean($el.find('.info span b, .typez').first().text())
  };
}

function parseBsx($, el) {
  const $el = $(el);
  const a = $el.find('a').first();
  return {
    title: clean(a.attr('title') || $el.find('.tt span a').text() || $el.find('.tt span').text() || $el.find('.inf span a').text() || $el.find('.title').text()),
    url: abs(a.attr('href') || $el.attr('href')),
    poster: abs($el.find('img').attr('src') || $el.find('img').attr('data-src')),
    type: clean($el.find('.typez').text())
  };
}

async function searchAnime(query) {
  const { data } = await http.get('/', { params: { s: query } });
  const $ = cheerio.load(data);
  const results = [];

  $('.aitem').each((_, el) => { results.push(parseAItem($, el)) });
  if (results.length) return { query, total: results.length, results };

  $('.bs .bsx, .bsx').each((_, el) => { results.push(parseBsx($, el)) });
  if (results.length) return { query, total: results.length, results };

  $('.listupd .lexa, .lexa').each((_, el) => {
    const $el = $(el);
    const a = $el.find('a').first();
    results.push({
      title: clean($el.find('.dtl h2 a').text() || $el.find('.dtl h2').text() || a.attr('title')),
      url: abs(a.attr('href')),
      poster: abs($el.find('img').attr('src') || $el.find('img').attr('data-src'))
    });
  });
  if (results.length) return { query, total: results.length, results };

  $('main a[href*="/anime/"], main a[href*="episode-"]').each((_, el) => {
    const $el = $(el);
    const title = clean($el.attr('title') || $el.text());
    const url = abs($el.attr('href'));
    if (title && url && !results.some(r => r.url === url)) results.push({ title, url });
  });

  return { query, total: results.length, results };
}

router.get('/', async (req, res) => {
  const query = req.query.query?.trim() || req.query.q?.trim() || 'Jojo';

  try {
    const result = await searchAnime(query);
    return res.status(200).json({
      status: true,
      creator: 'Arulzxd',
      ...result
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Gagal melakukan pencarian anime.',
      error: err.message
    });
  }
});

router.title = "AnimeKai Search";
router.desc = "Mencari anime di AnimeKai berdasarkan judul.";
router.paramsConfig = {
  query: "contoh: Jojo"
};
router.status = "ready";
router.type = "free";

export default router;
