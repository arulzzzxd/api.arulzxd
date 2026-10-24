import express from 'express';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const router = express.Router();
const BASE_URL = 'https://videodropper.app';

/**
 * Scraper fungsi untuk mengambil data media dari VideoDropper
 */
async function scrapeVideoDropper(targetUrl) {
    const jar = new CookieJar();
    const client = wrapper(
        axios.create({
            baseURL: BASE_URL,
            jar: jar,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                'Referer': `${BASE_URL}/`,
                'Origin': BASE_URL,
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            }
        })
    );

    // 1. Ambil session / token halaman utama
    await client.get('/');

    // 2. Request data download dari API internal VideoDropper
    const response = await client.post('/api/download', {
        url: targetUrl
    });

    if (!response.data) {
        throw new Error('Gagal mendapatkan respons dari server VideoDropper');
    }

    return response.data;
}

router.get('/', async (req, res) => {
    try {
        const url = req.query.url?.trim() || req.query.link?.trim();

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' atau 'link' wajib diisi!"
            });
        }

        const data = await scrapeVideoDropper(url);

        return res.json({
            status: true,
            creator: "Arulzxd",
            result: data
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message || "Internal Server Error saat mengunduh dari VideoDropper"
        });
    }
});

router.desc = "Downloader Media (Instagram, Video, Reels, Photos).";
router.paramsConfig = {
    url: "contoh: https://www.instagram.com/reel/Cxxxxxx/"
};
router.status = "ready";
router.type = "free";

export default router;
