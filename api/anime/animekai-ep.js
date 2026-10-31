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
const decodeBase64 = (b) => { try { return Buffer.from(b || '', 'base64').toString('utf8') } catch { return '' } };
const extractIframeSrc = (html) => html?.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] || null;

async function getEpisode(episodeUrl) {
  const url = abs(episodeUrl);
  if (!url) throw new Error('URL episode tidak valid');
  
  const { data } = await http.get(url);
  const $ = cheerio.load(data);

  const servers = $('.ak-srv-btn').map((_, el) => {
    const $el = $(el);
    return {
      name: clean($el.text()),
      lang: clean($el.attr('data-lang')),
      embedUrl: abs(extractIframeSrc(decodeBase64($el.attr('data-value'))))
    };
  }).get();

  return {
    title: clean($('.entry-title').text()),
    episodeNumber: clean($('meta[itemprop="episodeNumber"]').attr('content') || $('.lm .epx').eq(1).text().replace(/episode/i, '')),
    lang: clean($('.lg').text()),
    mainEmbed: abs($('#pembed iframe').attr('src')),
    servers,
    prev: abs($('.naveps a[rel="prev"]').attr('href')),
    next: abs($('.naveps .nvs:last-child a').attr('href'))
  };
}

router.get('/', async (req, res) => {
  const url = req.query.url?.trim();

  if (!url) {
    return res.status(400).json({
      status: false,
      creator: 'Arulzxd',
      message: "Parameter 'url' episode wajib diisi!"
    });
  }

  try {
    const result = await getEpisode(url);
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
      message: 'Gagal mengambil data episode streaming.',
      error: err.message
    });
  }
});

router.title = "AnimeKai Episode Streaming";
router.desc = "Mengambil URL server embed player untuk video streaming episode AnimeKai.";
router.paramsConfig = {
  url: "Contoh: https://animekai.com.ro/...episode-5..."
};
router.status = "ready";
router.type = "free";

export default router;
