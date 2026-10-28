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

    async getLatest(page = 1) {
        const urlPath = page > 1 ? `/page/${page}/` : '/';
        const $ = await this.getPage(urlPath);
        return this.parseList($);
    }

    parseList($) {
        const results = [];

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
        const page = parseInt(req.query.page) || 1;
        const result = await scraper.getLatest(page);

        return res.json({
            status: true,
            creator: "ArulzXD",
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

router.title = "nekopoi latest";
router.desc = "Mengambil rilis episode/post terbaru dari halaman utama Nekopoi.";
router.paramsConfig = {
    page: "number: 2"
};
router.status = "ready";
router.type = "premium";

export default router;
