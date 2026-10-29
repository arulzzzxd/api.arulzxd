import axios from 'axios';
import express from 'express';

const router = express.Router();

async function randomNsfw() {
    try {
        const api = await axios.get("https://api.waifu.best/images?isNsfw=True&isAnimated=All&orderBy=UploadedAt&orientation=All&reviewStatus=Accepted&childrenReviewStatus=Accepted", {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            },
            timeout: 10000
        });

        const data = api.data;

        if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
            throw new Error("Gagal mengambil gambar nsfw");
        }

        // Ambil url dari item acak
        const randomIndex = Math.floor(Math.random() * data.items.length);
        const imageUrl = data.items[randomIndex].url;

        // Download gambar langsung dari URL CDN
        const image = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const contentType = image.headers["content-type"] || "image/jpeg";

        return {
            buffer: Buffer.from(image.data),
            contentType: contentType
        };
    } catch (error) {
        throw error;
    }
}

router.get('/', async (req, res) => {
    try {
        const nsfw = await randomNsfw();
        
        res.writeHead(200, {
            'Content-Type': nsfw.contentType,
            'Content-Length': nsfw.buffer.length,
        });
        
        res.end(nsfw.buffer);
    } catch (error) {
        console.error(error);
        
        return res.status(500).json({
            status: false,
            creator: "Arulzxd",
            message: error.response?.data?.detail || error.message || "Terjadi kesalahan server"
        });
    }
});

router.title = "nsfw anime 18";
router.desc = "Mengambil gambar anime 🔞 acak.";
router.status = "ready"; 
router.type = "premium";

export default router;
