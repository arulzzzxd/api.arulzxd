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

    async getSchedule() {
        const $ = await this.getPage('/jadwal-new-hentai/');
        const schedule = [];
        $('.coming_soon').each((i, el) => {
            const title = $(el).find('a.title, .title').text().trim();
            const episode = $(el).find('.episode').text().trim().replace(/[\(\)]/g, '');
            const imgEl = $(el).find('img').first();
            const image = imgEl.attr('src') || imgEl.attr('data-src');
            
            const infoText = $(el).find('h2').last().text().trim();
            
            let producer = '';
            let releaseDate = $(el).find('.release_date').text().trim().replace(/[\n\r]/g, '');
            let subIndo = '';
            
            const prodMatch = infoText.match(/Producer\s*\/\s*Label\s*:\s*([^\n\r]+)/i);
            if (prodMatch) {
                producer = prodMatch[1].trim();
            }
            
            if (!releaseDate) {
                const relMatch = infoText.match(/Tanggal\s*Release\s*:\s*([^\n\r]+)/i);
                if (relMatch) {
                    releaseDate = relMatch[1].trim();
                }
            }
            
            const subMatch = infoText.match(/Sub\s*Indo\s*:\s*([^\n\r]+)/i);
            if (subMatch) {
                subIndo = subMatch[1].trim();
            }

            if (title) {
                schedule.push({
                    title,
                    episode,
                    image,
                    cover: image,
                    producer,
                    releaseDate,
                    subIndo
                });
            }
        });
        return schedule;
    }
}

const scraper = new NekopoiScraper();

router.get('/', async (req, res) => {
    try {
        const result = await scraper.getSchedule();

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

router.title = "nekopoi schedule";
router.desc = "Mengambil jadwal rilis Hentai mendatang (Upcoming) di Nekopoi.";
router.status = "ready";
router.type = "premium";

export default router;
