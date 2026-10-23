import express from "express";
import multer from "multer";
import axios from "axios";
import {
    createCanvas,
    loadImage
} from "@napi-rs/canvas";

const router = express.Router();
const upload = multer();

const BG_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772797781960.jpeg";
const BADGE_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772797710490.png";

let bgCache = null;
let badgeCache = null;

async function getBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(data);
}

function drawCircularTextTop(ctx, text, centerX, centerY, radius, badgeImage) {
    const fontSize = 72;
    const strokeWidth = 3;
    const arcSpan = Math.PI * 0.7;

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textRadius = radius + 75;
    const chars = text.split("");
    const n = chars.length;
    const angleIncrement = n > 1 ? arcSpan / (n - 1) : 0;
    const start = Math.PI / 2 + arcSpan / 2;

    for (let i = 0; i < n; i++) {
        const char = chars[i];
        const angle = start - i * angleIncrement;
        const x = centerX + Math.cos(angle) * textRadius;
        const y = centerY + Math.sin(angle) * textRadius;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle - Math.PI / 2);
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(char, 0, 0);
        ctx.fillText(char, 0, 0);
        ctx.restore();
    }

    if (badgeImage) {
        const endAngle = start - (n - 1) * angleIncrement;
        const badgeAngle = endAngle - angleIncrement;
        const badgeSize = Math.round(fontSize * 0.9);
        const bx = centerX + Math.cos(badgeAngle) * textRadius;
        const by = centerY + Math.sin(badgeAngle) * textRadius;
        ctx.drawImage(badgeImage, bx - badgeSize / 2, by - badgeSize / 2, badgeSize, badgeSize);
    }
}

const cpUpload = upload.fields([
    { name: 'avatarFile', maxCount: 1 }
]);

router.post("/", cpUpload, async (req, res) => {
    try {
        const files = req.files || {};
        const body = req.body || {};

        const text = body.text?.trim() || body.caption?.trim() || "DEVELOPER";
        const avatarFileInput = files.avatarFile?.[0];

        if (!avatarFileInput || !avatarFileInput.buffer) {
            return res.status(400).json({
                status: false,
                message: "Berkas 'avatarFile' (Foto profil) wajib diunggah!"
            });
        }

        if (!bgCache) bgCache = await getBuffer(BG_URL);
        if (!badgeCache) badgeCache = await getBuffer(BADGE_URL);

        const userImage = await loadImage(avatarFileInput.buffer);
        const bg = await loadImage(bgCache);
        const badge = await loadImage(badgeCache);

        const canvas = createCanvas(1080, 1080);
        const ctx = canvas.getContext("2d");

        // Render Background
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 263;

        // Render Avatar Lingkaran
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(userImage, centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.restore();

        // Render Teks Melengkung & Badge
        drawCircularTextTop(ctx, text.toUpperCase(), centerX, centerY, radius, badge);

        // Export PNG Buffer
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

router.desc = "Maker untuk membuat avatar berbingkai Fake Developer.";
router.paramsConfig = {
    avatarFile: {
    type: "file",
    desc: "file gambar profil"
  },
  text: "contoh: ArulzDev"
};
router.status = "ready";
router.type = "free";

export default router;
