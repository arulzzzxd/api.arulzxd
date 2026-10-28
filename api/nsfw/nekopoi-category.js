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

    async getCategory(category, page = 1) {
        const urlPath = page > 1 ? `/category/${category}/page/${page}/` : `/category/${category}/`;
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

        if ($('.nk-post-card').length > 0) {
            $('.nk-post-card').each((i, el) => {
                const titleEl = $(el).find('h2 a, h3 a').first();
                const title = titleEl.text().trim();
                const url = titleEl.attr('href');
                const style = $(el).find('.nk-thumb-crop').attr('style') || '';
                const imgMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
                const image = imgMatch ? imgMatch[1] : '';
                const date = $(el).find('.nk-post-meta span').text().trim();
                if (url && title) {
                    results.push({ 
                        type: 'latest_upload', 
                        title, 
                        url, 
                        image, 
                        cover: image, 
                        date 
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
        const category = (req.query.category || req.query.text || 'hentai').toLowerCase();
        const page = parseInt(req.query.page) || 1;

        const result = await scraper.getCategory(category, page);

        return res.json({
            status: true,
            creator: "ArulzXD",
            category,
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

router.title = "nekopoi category";
router.desc = "Mengambil daftar rilis dari Nekopoi berdasarkan nama kategori (e.g. hentai, 3d-hentai, 2d-animation, jav, jav-cosplay).";
router.paramsConfig = {
    category: {
        type: "select",
        options: ["hentai", "3d-hentai", "2d-animation", "jav", "jav-cosplay"],
        default: "hentai"
    },
    page: "number: 2"
};
router.status = "ready";
router.type = "premium";

export default router;
