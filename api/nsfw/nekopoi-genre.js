import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

class NekopoiScraper {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'https://nekopoi.care';
        this.headers = {
            'User-Agent': config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
            ...config.headers
        };
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: this.headers,
            timeout: config.timeout || 15000,
            proxy: config.proxy || undefined,
            ...config.axiosOptions
        });
    }

    resolveUrl(url) {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    async getPage(urlPath) {
        const url = this.resolveUrl(urlPath);
        try {
            const response = await this.axiosInstance.get(url);
            return cheerio.load(response.data);
        } catch (error) {
            throw new Error(`Gagal memuat halaman: ${url}. Pesan: ${error.message}`);
        }
    }

    async getByGenre(genre, page = 1) {
        const urlPath = page > 1 ? `/genres/${genre}/page/${page}/` : `/genres/${genre}/`;
        const $ = await this.getPage(urlPath);
        return this.parseList($);
    }

    parseList($) {
        const results = [];

        if ($('.nk-series-link').length > 0) {
            $('.nk-series-link').each((i, el) => {
                const url = $(el).attr('href');
                const title = $(el).find('.title').text().trim();
                const style = $(el).find('.nk-hentai-thumb, .nk-grid-thumb').attr('style') || '';
                const imgMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
                const image = imgMatch ? imgMatch[1] : '';
                
                const tooltipHtml = $(el).attr('original-title') || '';
                let metadata = {};
                if (tooltipHtml) {
                    const _$ = cheerio.load(tooltipHtml);
                    _$('.nk-tooltip-detail p').each((j, pEl) => {
                        const pText = _$(pEl).text().trim();
                        if (pText.includes(':')) {
                            const parts = pText.split(':');
                            const key = parts[0].trim();
                            const val = parts.slice(1).join(':').trim();
                            metadata[key] = val;
                        }
                    });
                }

                if (url && title) {
                    results.push({ 
                        type: 'series_grid', 
                        title, 
                        url, 
                        image, 
                        cover: image, 
                        metadata 
                    });
                }
            });
        }

        if (results.length === 0) {
            $('article, .eropost, .result-item, .post-item, .box, .result').each((i, el) => {
                const titleEl = $(el).find('h2 a, h3 a, .title a, a.title, .entry-title a').first();
                const title = titleEl.text().trim();
                const url = titleEl.attr('href');
                const imgEl = $(el).find('img').first();
                const image = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src');
                const excerpt = $(el).find('.entry-summary, .excerpt, p').first().text().trim();
                if (url && title) {
                    results.push({ 
                        type: 'generic_post', 
                        title, 
                        url, 
                        image, 
                        cover: image, 
                        excerpt 
                    });
                }
            });
        }

        return results;
    }
}

const scraper = new NekopoiScraper();

router.get('/', async (req, res) => {
    try {
        const text = req.query.text?.trim() || req.query.genre?.trim();
        const page = parseInt(req.query.page) || 1;

        if (!text) {
            return res.status(400).json({
                status: false,
                creator: "ArulzXD",
                message: "Masukkan parameter text atau genre (contoh: ?text=action)"
            });
        }

        const result = await scraper.getByGenre(text, page);

        return res.json({
            status: true,
            creator: "ArulzXD",
            genre: text,
            page,
            total: result.length,
            result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: "ArulzXD",
            message: err.message
        });
    }
});

router.title = "nekopoi genre";
router.desc = "Mengambil daftar rilis dari Nekopoi berdasarkan genre pilihan.";
router.paramsConfig = {
    text: "contoh: action, ahegao, milf",
    page: "number: 2"
};
router.status = "ready";
router.type = "premium";

export default router;
