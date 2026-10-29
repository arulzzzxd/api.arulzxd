import axios from 'axios';
import express from 'express';

const router = express.Router();

async function randomNsfw() {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            // Acak nilai isAnimated secara acak (true / false)
            const isAnimated = Math.random() < 0.5;

            // 1. Request metadata gambar dari API
            const apiRes = await axios.get("https://api.waifu.best/images", {
                params: {
                    isNsfw: "True",
                    isAnimated: isAnimated
                },
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json"
                },
                timeout: 10000
            });

            const data = apiRes.data;

            if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
                throw new Error("Gagal mengambil metadata gambar");
            }

            // Pilih satu item secara acak dari array hasil pencarian
            const selectedItem = data.items[Math.floor(Math.random() * data.items.length)];
            const imageUrl = selectedItem?.url;

            if (!imageUrl) {
                throw new Error("URL gambar tidak ditemukan pada item");
            }

            // 2. Unduh buffer gambar dari CDN
            const imageRes = await axios.get(imageUrl, {
                responseType: "arraybuffer",
                timeout: 15000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });

            const contentType = imageRes.headers["content-type"] || "image/jpeg";
            const buffer = Buffer.from(imageRes.data);

            if (!buffer || buffer.length === 0) {
                throw new Error("Buffer gambar kosong");
            }

            return {
                buffer,
                contentType
            };

        } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
                throw new Error(`Gagal memuat gambar setelah ${maxAttempts} percobaan: ${error.message}`);
            }
        }
    }
}

// Endpoint GET utama
router.get('/', async (req, res) => {
    try {
        const nsfw = await randomNsfw();
        
        res.setHeader('Content-Type', nsfw.contentType);
        res.setHeader('Content-Length', nsfw.buffer.length);
        
        return res.end(nsfw.buffer);

    } catch (error) {
        console.error("NSFW Route Error:", error.message);
        
        return res.status(500).json({
            status: false,
            creator: "Arulzxd",
            message: error.message || "Terjadi kesalahan server saat mengambil gambar"
        });
    }
});

router.title = "nsfw anime 18";
router.desc = "Mengambil gambar anime 🔞 acak (gambar & animasi).";
router.status = "ready"; 
router.type = "premium";

export default router;
