import express from "express";
import axios from "axios";

const router = express.Router();

const FONT_URL = "https://raw.githubusercontent.com/arulzzzxd/database/main/font/plus-jakarta-sans_5.3.0_latin-700-normal.ttf";
const BG_URL = "https://cdn.arulzzxd.my.id/files/F4pjW08L.png";
const EYE_URL = "https://cdn.arulzzxd.my.id/files/XqtOfI.png";

let fontBase64 = null;
let bgBase64 = null;
let eyeBase64 = null;

// Helper untuk fetch & convert ke Base64 agar tidak terkena CORS/Cloudflare Block saat render
async function getBase64(url, mimeType) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*"
        }
    });
    return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`;
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

        // Pre-load & cache assets dalam bentuk Data URI
        if (!fontBase64) fontBase64 = await getBase64(FONT_URL, "font/ttf");
        if (!bgBase64) bgBase64 = await getBase64(BG_URL, "image/png");
        if (!eyeBase64) eyeBase64 = await getBase64(EYE_URL, "image/png");

        // Estimasi kalkulasi posisi ikon mata berdasarkan panjang teks
        const fontSize = 35;
        const valX = 138;
        const valY = 74; // Baseline adjustment untuk SVG
        const estimatedTextWidth = saldo.length * 20; 
        const eyeX = valX + estimatedTextWidth + 8;
        const eyeY = 48 + 7;

        // Render via SVG (Ringan & Kompatibel Cloudflare)
        const svgImage = `
        <svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
            <style>
                @font-face {
                    font-family: 'DANA';
                    src: url('${fontBase64}') format('truetype');
                    font-weight: 700;
                }
                .saldo-text {
                    font-family: 'DANA', sans-serif;
                    font-weight: 700;
                    font-size: ${fontSize}px;
                    fill: #000000;
                }
            </style>
            <image href="${bgBase64}" width="720" height="1280"/>
            <text x="${valX}" y="${valY}" class="saldo-text">${saldo}</text>
            <image href="${eyeBase64}" x="${eyeX}" y="${eyeY}" width="28" height="16"/>
        </svg>`;

        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.send(svgImage);

    } catch (err) {
        res.status(500).json({
            status: false,
            message: err.message
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
