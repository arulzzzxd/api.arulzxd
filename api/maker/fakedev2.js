import express from "express";
import multer from "multer";
import axios from "axios";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

const router = express.Router();
const upload = multer();

const BG_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772229788017.jpeg";
const FONT_URL = "https://files.catbox.moe/76wwjt.ttf";

let isFontLoaded = false;
let bgCache = null;

async function getBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(data);
}

async function loadFont() {
    if (isFontLoaded) return;
    try {
        const fontBuffer = await getBuffer(FONT_URL);
        GlobalFonts.register(fontBuffer, "Nunito");
        isFontLoaded = true;
    } catch (err) {
        console.error("Gagal mendaftarkan font Nunito:", err.message);
    }
}

const drawCircularTextBottom = (context, str, cx, cy, rad) => {
    const fontSize = 85;
    const arcSpan = Math.PI * 0.6; 
    const textRadius = rad + 75; 
    const chars = str.toUpperCase().split("");
    const n = chars.length;
    const angleIncrement = n > 1 ? arcSpan / (n - 1) : 0;
    const start = (Math.PI / 2) + (arcSpan / 2);

    const fontName = isFontLoaded ? "Nunito" : "sans-serif";
    context.font = `bold italic ${fontSize}px "${fontName}"`;
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (let i = 0; i < n; i++) {
        const char = chars[i];
        const angle = start - i * angleIncrement;
        const x = cx + Math.cos(angle) * textRadius;
        const y = cy + Math.sin(angle) * textRadius;

        context.save();
        context.translate(x, y);
        context.rotate(angle - Math.PI / 2);
        context.lineWidth = 4;
        context.strokeStyle = "rgba(0,0,0,0.5)";
        context.strokeText(char, 0, 0);
        context.fillText(char, 0, 0);
        context.restore();
    }
};

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

        await loadFont();

        if (!bgCache) bgCache = await getBuffer(BG_URL);

        const userImg = await loadImage(file.buffer);
        const background = await loadImage(bgCache);

        const canvas = createCanvas(1024, 1024);
        const ctx = canvas.getContext("2d");

        // Render Background
        ctx.drawImage(background, 0, 0, 1024, 1024);

        const centerX = 518; 
        const centerY = 455; 
        const radius = 235; 

        // Crop & Clip Foto User ke Bentuk Lingkaran
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        const aspect = userImg.width / userImg.height;
        let drawWidth, drawHeight, dx, dy;
        
        if (aspect > 1) {
            drawHeight = radius * 2;
            drawWidth = drawHeight * aspect;
            dx = centerX - drawWidth / 2;
            dy = centerY - radius;
        } else {
            drawWidth = radius * 2;
            drawHeight = drawWidth / aspect;
            dx = centerX - radius;
            dy = centerY - drawHeight / 2;
        }
        
        ctx.drawImage(userImg, dx, dy, drawWidth, drawHeight);
        ctx.restore();

        // Render Teks Melengkung di Bagian Bawah
        drawCircularTextBottom(ctx, text, centerX, centerY, radius);

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

router.desc = "Maker untuk membuat avatar berbingkai Fake Developer v2.";
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