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

    async getHentaiList() {
        const $ = await this.getPage('/hentai-list/');
        const items = [];
        $('.nk-az-item a').each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');
            
            const tooltipHtml = $(el).attr('original-title') || '';
            let image = '';
            let metadata = {};
            if (tooltipHtml) {
                const _$ = cheerio.load(tooltipHtml);
                image = _$('.nk-tooltip-img').attr('src') || '';
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

            if (title && href) {
                items.push({
                    title,
                    url: href,
                    slug: href.split('/').filter(Boolean).pop(),
                    image,
                    cover: image,
                    metadata
                });
            }
        });
        return items;
    }
}

const scraper = new NekopoiScraper();

router.get('/', async (req, res) => {
    try {
        const result = await scraper.getHentaiList();

        return res.json({
            status: true,
            creator: "ArulzXD",
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

router.title = "nekopoi hentai list";
router.desc = "Mengambil daftar alfabetis (A-Z) seluruh judul Hentai di Nekopoi.";
router.status = "ready";
router.type = "premium";

export default router;
