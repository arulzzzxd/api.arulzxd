import express from "express";
import axios from "axios";
import {
    createCanvas,
    loadImage,
    GlobalFonts
} from "@napi-rs/canvas";

const router = express.Router();

const BG_URL = "https://raw.githubusercontent.com/uploader762/dat2/main/uploads/52e39f-1773064858080.jpg";
const FONT1_URL = "https://raw.githubusercontent.com/uploader762/dat2/main/uploads/49bbd8-1773045557233.otf";
const FONT2_URL = "https://raw.githubusercontent.com/uploader762/dat1/main/uploads/203827-1773063086445.ttf";

let fontsLoaded = false;
let bgCache = null;

async function loadFonts() {
    if (fontsLoaded) return;

    const [font1Res, font2Res] = await Promise.all([
        axios.get(FONT1_URL, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } }),
        axios.get(FONT2_URL, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } })
    ]);

    GlobalFonts.register(Buffer.from(font1Res.data), "CustomFont");
    GlobalFonts.register(Buffer.from(font2Res.data), "GreetingFont");

    fontsLoaded = true;
}

async function getBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(data);
}

function formatSaldo(nominal) {
    const cleanNum = String(nominal).replace(/[^0-9]/g, '');
    return Number(cleanNum).toLocaleString('id-ID');
}

function getGreeting(name) {
    const hour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false });
    const h = Number(hour);
    let waktu = 'Malam';
    if (h >= 4 && h < 11) waktu = 'Pagi';
    else if (h >= 11 && h < 15) waktu = 'Siang';
    else if (h >= 15 && h < 18) waktu = 'Sore';
    
    return `Selamat ${waktu}, ${name}`;
}

router.get("/", async (req, res) => {
    try {
        const name = req.query.nama?.trim() || req.query.name?.trim() || "Zann";
        const rawNominal = req.query.nominal?.trim() || req.query.saldo?.trim() || "10000";

        if (!rawNominal || isNaN(rawNominal.replace(/[^0-9]/g, ''))) {
            return res.status(400).json({
                status: false,
                message: "Parameter nominal/saldo wajib berupa angka (contoh: ?nama=Zann&nominal=10000)"
            });
        }

        const saldo = formatSaldo(rawNominal);
        const greet = getGreeting(name);

        await loadFonts();

        if (!bgCache) bgCache = await getBuffer(BG_URL);
        const bg = await loadImage(bgCache);

        const canvas = createCanvas(bg.width, bg.height);
        const ctx = canvas.getContext("2d");

        // Render Background
        ctx.drawImage(bg, 0, 0, bg.width, bg.height);

        // Posisi & Rendering Nominal Saldo
        const baseX = 2470;
        const baseY = 894;

        ctx.font = "125px CustomFont";
        ctx.fillStyle = "black";

        const numberWidth = ctx.measureText(saldo).width;
        const numberX = baseX - numberWidth;

        ctx.fillText(saldo, numberX, baseY);

        // Posisi & Rendering Teks "Rp"
        const rpText = "Rp";
        const rpWidth = ctx.measureText(rpText).width;
        const rpX = numberX - rpWidth - 4;

        ctx.fillText(rpText, rpX, baseY);

        // Posisi & Rendering Ucapan (Greeting)
        ctx.font = "93px GreetingFont";
        ctx.fillStyle = "gray";

        ctx.fillText(greet, 98, 86);

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

router.desc = "Maker untuk membuat tampilan Fake Saldo Bank Jago.";
router.paramsConfig = {
    nama: "contoh: Arulz",
    nominal: "contoh: 1000000"
};
router.status = "ready";
router.type = "free";

export default router;
