import express from "express";
import multer from "multer";
import axios from "axios";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const router = express.Router();
const upload = multer();

const BG_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772226320613.jpeg";

let bgCache = null;

async function getBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(data);
}

router.post("/", upload.single('fileupload'), async (req, res) => {
    try {
        const file = req.file;
        const body = req.body || {};

        const text = body.text?.trim() || body.caption?.trim() || "DEVELOPER";

        if (!file || !file.buffer) {
            return res.status(400).json({
                status: false,
                message: "Berkas 'fileupload' (Foto profil) wajib diunggah!"
            });
        }

        if (!bgCache) bgCache = await getBuffer(BG_URL);

        const [userImage, bgImg] = await Promise.all([
            loadImage(file.buffer),
            loadImage(bgCache)
        ]);

        const canvas = createCanvas(1080, 1080);
        const ctx = canvas.getContext("2d");

        // Render Background
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 263;

        // Clip & Crop Foto Profil
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        const minSide = Math.min(userImage.width, userImage.height);
        const cropX = (userImage.width - minSide) / 2;
        const cropY = (userImage.height - minSide) / 2;
        
        ctx.drawImage(userImage, cropX, cropY, minSide, minSide, centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.restore();

        // Stroke Border Lingkaran Putih
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Render Teks Melengkung dengan Stroke Merah
        ctx.save();
        ctx.font = "bold 72px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const arcSpan = Math.PI * 0.55;
        const textRadius = radius + 75;
        const chars = text.toUpperCase().split("");
        const n = chars.length;
        const angleIncrement = n > 1 ? arcSpan / (n - 1) : 0;
        const start = Math.PI / 2 + arcSpan / 2;

        for (let i = 0; i < n; i++) {
            const angle = start - i * angleIncrement;
            const x = centerX + Math.cos(angle) * textRadius;
            const y = centerY + Math.sin(angle) * textRadius;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle - Math.PI / 2);
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 3;
            ctx.strokeText(chars[i], 0, 0);
            ctx.fillText(chars[i], 0, 0);
            ctx.restore();
        }

        ctx.restore();

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

router.desc = "Maker untuk membuat avatar berbingkai Fake Developer v4 (Red Stroke Text).";
router.paramsConfig = {
    fileupload: {
        type: "file",
        desc: "file gambar profil"
    },
    text: "contoh: DEVELOPER"
};
router.status = "ready";
router.type = "free";

export default router;