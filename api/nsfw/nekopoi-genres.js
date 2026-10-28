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

    async getGenres() {
        const $ = await this.getPage('/genre-list/');
        const genres = [];
        
        const elements = $('.nk-genre-list a, .genre-list a, .genres a, ul.genres li a, .tagcloud a');
        elements.each((i, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            if (name && href) {
                const slug = href.split('/').filter(Boolean).pop();
                if (slug && !genres.some(g => g.slug === slug)) {
                    genres.push({ name, url: href, slug });
                }
            }
        });

        if (genres.length === 0) {
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const name = $(el).text().trim();
                if (href && href.includes('/genres/') && name) {
                    const slug = href.split('/').filter(Boolean).pop();
                    if (slug && !genres.some(g => g.slug === slug)) {
                        genres.push({ name, url: href, slug });
                    }
                }
            });
        }
        return genres;
    }
}

const scraper = new NekopoiScraper();

router.get('/', async (req, res) => {
    try {
        const result = await scraper.getGenres();

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

router.title = "nekopoi genres";
router.desc = "Mengambil seluruh daftar genre yang tersedia di Nekopoi.";
router.status = "ready";
router.type = "premium";

export default router;
