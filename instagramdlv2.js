import express from 'express';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const router = express.Router();

const BASE_URL = 'https://igexport.com';

const jar = new CookieJar();
const client = wrapper(axios.create({
    baseURL: BASE_URL,
    jar: jar, 
    timeout: 30000, 
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'Referer': `${BASE_URL}/id/video-download/`,
        'Accept': 'application/json, text/plain, */*',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
    }
}));

function getEndpointByUrl(url) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('/reel/') || 
        lowerUrl.includes('/tv/') || 
        lowerUrl.includes('/stories/')) {
        return '/api/ig-reels';
    }
    return '/api/ig-photo';
}

async function scrapeIGExportSmart(igUrl, retries = 2) {
    const endpoint = getEndpointByUrl(igUrl);

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (attempt > 1) {
                await new Promise(r => setTimeout(r, 2000));
            }

            await client.get('/id/video-download/');
            
            const params = { url: igUrl };
            const response = await client.get(endpoint, { params });

            const serverData = response.data;
            if (!serverData) throw new Error('Empty response from server');

            return {
                status: true,
                detected_type: endpoint === '/api/ig-reels' ? 'video/reel' : 'photo/post',
                result: serverData
            };

        } catch (error) {
            const isServerError = error.response && [502, 504, 503].includes(error.response.status);
            if (isServerError && attempt < retries) {
                continue; 
            }

            if (error.response) {
                return {
                    status: false,
                    message: error.response.data?.message || `HTTP Error ${error.response.status}`
                };
            }
            
            if (attempt === retries) {
                return {
                    status: false,
                    message: error.message || 'Gagal mengambil data dari IGExport.'
                };
            }
        }
    }
    
    return { status: false, message: 'All retries exhausted.' };
}

router.get('/', async (req, res) => {
    try {
        const url = req.query.url?.trim();

        if (!url || !url.includes('instagram.com')) {
            return res.status(400).json({
                status: false,
                creator: 'ArulzXD',
                message: 'Masukkan parameter url Instagram yang valid (contoh: ?url=https://www.instagram.com/reel/...)'
            });
        }

        const resData = await scrapeIGExportSmart(url);

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
            type: resData.detected_type,
            result: resData.result
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: 'ArulzXD',
            message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan Instagram.'
        });
    }
});

router.desc = "Instagram Downloader via IGExport (mendukung Reel, Photo, Post, & Story).";
router.paramsConfig = {
    url: "contoh: https://www.instagram.com/reel/..."
};
router.status = "ready";
router.type = "free";

export default router;
