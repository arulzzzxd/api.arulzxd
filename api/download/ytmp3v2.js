import express from 'express';
import axios from 'axios';

const router = express.Router();

async function ytmp3(ytUrl) {
    try {
        const headers = {
            'accept': 'application/json',
            'content-type': 'application/json',
            'origin': 'https://ssvid.cc',
            'referer': 'https://ssvid.cc/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
        };

        const initRes = await axios.post('https://hub.convert1s.com/api/download', {
            url: ytUrl,
            audio: { bitrate: '128k' },
            output: { type: 'audio', format: 'mp3' }
        }, { headers, timeout: 15000 });

        const { statusUrl, title, duration } = initRes.data;

        if (!statusUrl) {
            throw new Error('Gagal mendapatkan statusUrl dari server.');
        }

        let isCompleted = false;
        let downloadData = null;
        let attempts = 0;
        const maxAttempts = 20;

        while (!isCompleted && attempts < maxAttempts) {
            attempts++;
            const statusRes = await axios.get(statusUrl, { headers, timeout: 10000 });
            
            if (statusRes.data.status === 'completed') {
                isCompleted = true;
                downloadData = statusRes.data;
            } else {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        if (!downloadData) {
            throw new Error('Proses konversi membutuhkan waktu terlalu lama. Silakan coba lagi.');
        }

        return {
            status: true,
            title: downloadData.title || title,
            duration: downloadData.duration || duration,
            downloadUrl: downloadData.downloadUrl
        };

    } catch (error) {
        return {
            status: false,
            message: error.message || 'Gagal mengonversi video YouTube ke MP3.'
        };
    }
}

router.get('/', async (req, res) => {
    try {
        const url = req.query.url?.trim();

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'ArulzXD',
                message: 'Masukkan parameter url (contoh: ?url=https://youtu.be/...)'
            });
        }

        const resData = await ytmp3(url);

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
                duration: resData.duration,
                downloadUrl: resData.downloadUrl
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: 'ArulzXD',
            message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan MP3.'
        });
    }
});

router.desc = "YouTube MP3 Downloader untuk mengonversi dan mengunduh audio dari video YouTube.";
router.paramsConfig = {
    url: "contoh: https://youtu.be/NJMEtaDTVtA"
};
router.status = "ready";
router.type = "free";

export default router;
