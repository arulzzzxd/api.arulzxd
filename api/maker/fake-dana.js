import express from "express";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

const router = express.Router();

const FONT_URL = "https://raw.githubusercontent.com/arulzzzxd/database/main/font/plus-jakarta-sans_5.3.0_latin-700-normal.ttf";
const BG_URL = "https://cdn.arulzzxd.my.id/files/F4pjW08L.png";
const EYE_URL = "https://cdn.arulzzxd.my.id/files/XqtOfI.png";

let fontLoaded = false;
let bgCache = null;
let eyeCache = null;

async function getBuffer(url) {
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!res.ok) {
        throw new Error(`Gagal mengunduh resource dari ${url}: ${res.statusText}`);
    }
    return Buffer.from(await res.arrayBuffer());
}

async function loadFont() {
    if (fontLoaded) return;
    try {
        const fontBuffer = await getBuffer(FONT_URL);
        GlobalFonts.register(fontBuffer, "DANA");
        fontLoaded = true;
    } catch (err) {
        console.warn("Gagal memuat font DANA, menggunakan fallback:", err.message);
    }
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
                creator: "ArulzXD",
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
        const valX = 138;           // Posisi tepat setelah teks "Rp" bawaan gambar
        const valY = 48;            // Posisi Y sejajar dengan teks "Rp" bawaan gambar
        const maxFontSize = 35;      // Ukuran font yang pas dengan "Rp" bawaan
        const eyeGap = 8;            // Jarak presisi antara angka dan ikon mata
        const eyeScale = 0.45;       // Skala ikon mata yang pas & kecil seperti aplikasi asli

        let currentFontSize = maxFontSize;
        const maxAllowedWidth = canvas.width - valX - 100;

        ctx.font = `700 ${currentFontSize}px "DANA", sans-serif`;
        let textWidth = ctx.measureText(saldo).width;

        while (textWidth > maxAllowedWidth && currentFontSize > 16) {
            currentFontSize -= 2;
            ctx.font = `700 ${currentFontSize}px "DANA", sans-serif`;
            textWidth = ctx.measureText(saldo).width;
        }

        // Tulis Angka Nominal Saldo
        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(saldo, valX, valY);

        // Render Ikon Mata (Presisi Tegak Lurus & Sejajar di Tengah Angka)
        const eyeHeight = currentFontSize * eyeScale;
        const eyeWidth = (eyeImg.width / eyeImg.height) * eyeHeight;
        const eyeX = valX + textWidth + eyeGap;
        const eyeY = valY + (currentFontSize * 0.20);

        ctx.drawImage(eyeImg, eyeX, eyeY, eyeWidth, eyeHeight);

        const buffer = await canvas.encode("png");
        res.setHeader("Content-Type", "image/png");
        return res.send(buffer);

    } catch (err) {
        console.error("Error pada maker/fakedana:", err);
        return res.status(500).json({
            status: false,
            creator: "ArulzXD",
            message: err.message || "Internal Server Error"
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
