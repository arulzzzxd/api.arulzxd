import express from 'express';
import axios from 'axios';

const router = express.Router();
const BASE_URL = 'https://tikolu.net/emojimix';

/**
 * Helper untuk mengambil buffer gambar emoji mix dari tikolu.net
 */
async function fetchEmojiMix(emoji1, emoji2) {
    const encodedEmoji1 = encodeURIComponent(emoji1);
    const encodedEmoji2 = encodeURIComponent(emoji2);
    const mixUrl = `${BASE_URL}/${encodedEmoji1}+${encodedEmoji2}`;

    const { data } = await axios.get(mixUrl, {
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://tikolu.net/emojimix/'
        },
        timeout: 15000
    });

    return Buffer.from(data);
}

router.get('/', async (req, res) => {
    try {
        const emoji1 = req.query.emoji1?.trim() || req.query.e1?.trim();
        const emoji2 = req.query.emoji2?.trim() || req.query.e2?.trim();

        if (!emoji1 || !emoji2) {
            return res.status(400).json({
                status: false,
                creator: "Arulzxd",
                message: "Parameter 'emoji1' dan 'emoji2' wajib diisi! Contoh: ?emoji1=😋&emoji2=🔥"
            });
        }

        const imageBuffer = await fetchEmojiMix(emoji1, emoji2);

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.end(imageBuffer);

    } catch (err) {
        if (err.response && err.response.status === 404) {
            return res.status(404).json({
                status: false,
                creator: "Arulzxd",
                message: "Kombinasi kedua emoji tersebut tidak ditemukan di Tikolu EmojiMix."
            });
        }

        return res.status(500).json({
            status: false,
            creator: "Arulzxd",
            message: err.message || "Terjadi kesalahan internal server saat menggabungkan emoji."
        });
    }
});

router.desc = "Maker untuk menggabungkan dua emoji menjadi satu";
router.paramsConfig = {
    emoji1: "contoh: 😋",
    emoji2: "contoh: 🔥"
};
router.status = "ready";
router.type = "free";

export default router;
