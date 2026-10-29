import axios from 'axios';
import express from 'express';
const router = express.Router();

// Fungsi untuk mengambil gambar secara acak
async function loli() {
    try {
        const { data } = await axios.get(`https://raw.githubusercontent.com/arulzzzxd/database/main/Random-loli/image-loli-link.json`);
        const response = await axios.get(data[Math.floor(data.length * Math.random())], { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        throw error;
    }
}

// Endpoint utama Router
router.get('/', async (req, res) => {
    try {
        const pedo = await loli();
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': pedo.length,
        });
        res.end(pedo);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.desc = "Mengambil gambar anime Loli acak.";
router.status = "ready"; 
router.type = "free";

export default router;
