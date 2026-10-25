import express from "express";
import multer from "multer";
import axios from "axios";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

// Cache untuk template dasar
let templateCache = null;

async function getBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(data);
}

router.post("/", upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'post_images', maxCount: 9 }
]), async (req, res) => {
    try {
        const files = req.files || {};
        const body = req.body || {};

        // Parameter input
        const postsCount = body.posts || "1.254";
        const followersCount = body.followers || "100K";
        const followingCount = body.following || "150";
        const profileName = body.name || "Nama Pengguna";
        const bioText = body.bio || "Fitur dan sumber informasi khusus untuk bisnis.";

        // URL / Buffer Gambar dasar dari gambar template yang diunggah
        // Anda bisa menyimpan gambar 311517.png ke server/CDN Anda dan mengganti URL di bawah
        const TEMPLATE_URL = body.template_url || "https://cdn.arulzzxd.my.id/files/QgJPb0Sb.png"; // Ganti dengan URL template UI Instagram Anda

        if (!templateCache) {
            templateCache = await getBuffer(TEMPLATE_URL);
        }

        const bgImage = await loadImage(templateCache);
        const canvas = createCanvas(bgImage.width, bgImage.height);
        const ctx = canvas.getContext("2d");

        // 1. Draw Template Utama
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        // 2. Render Foto Profil (Avatar) Jika Disediakan
        if (files['avatar'] && files['avatar'][0]) {
            const avatarImg = await loadImage(files['avatar'][0].buffer);
            
            // Koordinat Lingkaran Profil berdasarkan gambar UI Instagram
            const avatarX = 120; // Posisi pusat X avatar
            const avatarY = 120; // Posisi pusat Y avatar
            const avatarRadius = 75; // Jari-jari lingkaran profil

            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
            ctx.restore();
        } else if (body.avatar_url) {
            const avatarBuf = await getBuffer(body.avatar_url);
            const avatarImg = await loadImage(avatarBuf);
            
            const avatarX = 120;
            const avatarY = 120;
            const avatarRadius = 75;

            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
            ctx.restore();
        }

        // 3. Menimpa Grid Postingan (Greenscreen) dengan Gambar Kustom jika diunggah
        const postFiles = files['post_images'] || [];
        if (postFiles.length > 0 || body.post_urls) {
            // Posisi Grid Postingan (3x3)
            const gridCols = 3;
            const gridRows = 3;
            const startY = 345; // Koordinat Y awal grid postingan
            const itemWidth = canvas.width / gridCols;
            const itemHeight = itemWidth; // Persegi (1:1)

            const urls = body.post_urls ? (Array.isArray(body.post_urls) ? body.post_urls : [body.post_urls]) : [];

            for (let i = 0; i < 9; i++) {
                let postImgBuf = null;

                if (postFiles[i]) {
                    postImgBuf = postFiles[i].buffer;
                } else if (urls[i]) {
                    postImgBuf = await getBuffer(urls[i]);
                }

                if (postImgBuf) {
                    const postImg = await loadImage(postImgBuf);
                    const col = i % gridCols;
                    const row = Math.floor(i / gridCols);

                    const x = col * itemWidth;
                    const y = startY + (row * itemHeight);

                    // Gambarkan foto postingan di posisi grid
                    ctx.drawImage(postImg, x, y, itemWidth, itemHeight);
                }
            }
        }

        // 4. Export PNG
        const buffer = await canvas.encode("png");
        res.setHeader("Content-Type", "image/png");
        return res.end(buffer);

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message
        });
    }
});

router.desc = "Maker Fake Instagram Profile Canvas dengan dukungan kustomisasi avatar & postingan green screen.";
router.paramsConfig = {
    avatar: {
        type: "file",
        desc: "File foto profil (opsional)"
    },
    post_images: {
        type: "file",
        desc: "Array file gambar postingan (maksimal 9 gambar untuk mengganti green screen)"
    },
    posts: "Jumlah postingan (contoh: 1.254)",
    followers: "Jumlah pengikut (contoh: 100K)",
    following: "Jumlah mengikuti (contoh: 150)"
};
router.status = "ready";
router.type = "free";

export default router;
