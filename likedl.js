import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import FormData from 'form-data';

const router = express.Router();

class StepToDownScraper {
    constructor() {
        this.baseUrl = 'https://steptodown.com';
        this.apiUrl = `${this.baseUrl}/wp-json/aio-dl/video-data/`;
        this.client = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                'Referer': `${this.baseUrl}/likee-video-downloader/`,
                'Origin': this.baseUrl,
                'Accept': 'application/json'
            },
            timeout: 30000
        });
        this.token = null;
    }

    async initToken() {
        if (this.token) return this.token;

        try {
            const res = await this.client.get(`${this.baseUrl}/likee-video-downloader/`);
            const $ = cheerio.load(res.data);

            const tokenValue = $('#token').val();

            if (!tokenValue || tokenValue.length < 10) {
                throw new Error('Token tidak ditemukan. Struktur HTML website mungkin berubah.');
            }

            this.token = tokenValue;
            return this.token;

        } catch (err) {
            throw new Error(`[Init Error]: ${err.message}`);
        }
    }

    async downloadVideo(videoUrl) {
        try {
            await this.initToken();

            const form = new FormData();
            form.append('url', videoUrl);
            form.append('token', this.token);

            const res = await this.client.post(this.apiUrl, form, {
                headers: form.getHeaders()
            });

            if (res.data?.error) {
                throw new Error(`Server Error: ${res.data.error}`);
            }

            if (!res.data?.medias || res.data.medias.length === 0) {
                throw new Error('Tidak ada media ditemukan. Pastikan URL Likee valid dan publik.');
            }

            return {
                status: true,
                title: res.data.title,
                thumbnail: res.data.thumbnail,
                source: res.data.source,
                medias: res.data.medias.map(m => ({
                    quality: m.quality,
                    url: m.url,
                    size: m.formattedSize,
                    extension: m.extension
                }))
            };

        } catch (err) {
            return {
                status: false,
                message: err.message
            };
        }
    }
}

router.get('/', async (req, res) => {
    try {
        const url = req.query.url?.trim();

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'ArulzXD',
                message: 'Masukkan parameter url (contoh: ?url=https://l.likee.video/v/...)'
            });
        }

        const scraper = new StepToDownScraper();
        const resData = await scraper.downloadVideo(url);

        if (!resData.status) {
            return res.status(400).json({
                status: false,
                creator: 'ArulzXD',
                message: resData.message
            });
        }

        return res.json({
            status: true,
            creator: 'ArulzXD',
            result: {
                title: resData.title,
                thumbnail: resData.thumbnail,
                source: resData.source,
                medias: resData.medias
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: 'ArulzXD',
            message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan Likee.'
        });
    }
});

router.desc = "Likee Video Downloader untuk mengunduh media dari aplikasi Likee.";
router.paramsConfig = {
    url: "contoh: https://l.likee.video/v/zh4Gqt"
};
router.status = "ready";
router.type = "free";

export default router;
