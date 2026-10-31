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

async function getHome() {
  const { data } = await http.get('/');
  const $ = cheerio.load(data);

  const latestUpdates = $('#latest-updates .aitem-wrapper .aitem').map((_, el) => parseAItem($, el)).get();
  const trending = $('#trending-anime .aitem').map((_, el) => {
    const $el = $(el);
    return {
      rank: clean($el.find('.num').text()),
      title: clean($el.find('.title').text()),
      url: abs($el.find('.title').attr('href')),
      subEpisode: clean($el.find('.sub a').text() || $el.find('.sub').text())
    };
  }).get();
  const schedule = $('#schedule-list li a').map((_, el) => {
    const $el = $(el);
    return {
      time: clean($el.find('.time').text()),
      title: clean($el.find('.title').text()),
      episode: clean($el.find('span').last().text()),
      url: abs($el.attr('href'))
    };
  }).get();

  return { latestUpdates, trending, schedule };
}

router.get('/', async (req, res) => {
  try {
    const result = await getHome();
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
      message: 'Gagal mengambil data beranda AnimeKai.',
      error: err.message
    });
  }
});

router.title = "AnimeKai Home";
router.desc = "Mengambil update anime terbaru, trending, dan jadwal rilis dari AnimeKai.";
router.status = "ready";
router.type = "free";

export default router;
