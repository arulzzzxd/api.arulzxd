import express from "express";
import axios from "axios";
import {
    createCanvas,
    loadImage,
    GlobalFonts
} from "@napi-rs/canvas";

const router = express.Router();

const FONT_URL = "https://raw.githubusercontent.com/arulzzzxd/database/main/font/plus-jakarta-sans_5.3.0_latin-700-normal.ttf";
const BG_URL = "https://cdn.arulzzxd.my.id/files/F4pjW08L.png";
const EYE_URL = "https://cdn.arulzzxd.my.id/files/XqtOfI.png";

let fontLoaded = false;
let bgCache = null;
let eyeCache = null;

// Header lengkap untuk melewati proteksi CDN / Cloudflare
const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Referer": "https://cdn.arulzzxd.my.id/"
};

async function loadFont() {
    if (fontLoaded) return;

    const { data } = await axios.get(FONT_URL, {
        responseType: "arraybuffer",
        headers: defaultHeaders
    });

    GlobalFonts.register(
        Buffer.from(data),
        "DANA"
    );

    fontLoaded = true;
}

async function getBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        headers: defaultHeaders
    });
    return Buffer.from(data);
}

function cleanSaldo(input) {
    let text = input.trim().replace(/^rp\s*/i, "");
    if (/^\d+$/.test(text)) {
        text = parseInt(text, 10).toLocaleString("id-ID");
    }
    return text;
}

router.get("/", async (req, res) => {
    try {
        const rawSaldo = req.query.saldo?.trim() || req.query.nominal?.trim() || req.query.text?.trim();

        if (!rawSaldo) {
            return res.status(400).json({
                status: false,
                message: "Parameter saldo/nominal/text wajib diisi (contoh: ?saldo=123.456)"
            });
        }

        const saldo = cleanSaldo(rawSaldo);

        await loadFont();

        if (!bgCache) bgCache = await getBuffer(BG_URL);
        if (!eyeCache) eyeCache = await getBuffer(EYE_URL);

        const bgImg = await loadImage(bgCache);
        const eyeImg = await loadImage(eyeCache);

        const canvas = createCanvas(bgImg.width, bgImg.height);
        const ctx = canvas.getContext("2d");

        // Render Background
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        // KOORDINAT PRESISI SAMA DENGAN BACKGROUND DANA
        const valX = 138;
        const valY = 48;
        const maxFontSize = 35;
        const eyeGap = 8;
        const eyeScale = 0.45;

        let currentFontSize = maxFontSize;
        const maxAllowedWidth = canvas.width - valX - 100;

        ctx.font = `700 ${currentFontSize}px "DANA"`;
        let textWidth = ctx.measureText(saldo).width;

        while (textWidth > maxAllowedWidth && currentFontSize > 16) {
            currentFontSize -= 2;
            ctx.font = `700 ${currentFontSize}px "DANA"`;
            textWidth = ctx.measureText(saldo).width;
        }

        // Tulis Angka Nominal Saldo
        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(saldo, valX, valY);

        // Render Ikon Mata
        const eyeHeight = currentFontSize * eyeScale;
        const eyeWidth = (eyeImg.width / eyeImg.height) * eyeHeight;
        const eyeX = valX + textWidth + eyeGap;
        const eyeY = valY + (currentFontSize * 0.20);

        ctx.drawImage(eyeImg, eyeX, eyeY, eyeWidth, eyeHeight);

        const buffer = await canvas.encode("png");
        res.setHeader("Content-Type", "image/png");
        res.end(buffer);

    } catch (err) {
        res.status(500).json({
            status: false,
            message: `Gagal mengunduh resource: ${err.message}`
        });
    }
});

router.desc = "Maker untuk membuat tampilan Fake Saldo DANA.";
router.paramsConfig = {
  saldo: "contoh: 123.456"
};
router.status = "ready";
router.type = "free";

export default router;
