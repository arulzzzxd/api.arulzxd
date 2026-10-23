import express from "express";
import multer from "multer";
import axios from "axios";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const router = express.Router();
const upload = multer();

const BG_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772230249397.jpeg";

let bgCache = null;

async function getBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(data);
}

function formatNomor(n) {
    if (!n) return "+62 812-3456-7890";
    let formatted = n.trim();
    if (formatted.startsWith("08")) {
        formatted = "62" + formatted.slice(1);
    }
    if (formatted.startsWith("62") && formatted.length >= 10) {
        return `+62 ${formatted.slice(2, 5)}-${formatted.slice(5, 9)}-${formatted.slice(9)}`;
    } else if (formatted.startsWith("+")) {
        return formatted;
    } else if (/^\d+$/.test(formatted)) {
        return `+${formatted}`;
    }
    return formatted;
}

router.post("/", upload.single('fileupload'), async (req, res) => {
    try {
        const file = req.file;
        const body = req.body || {};

        if (!file || !file.buffer) {
            return res.status(400).json({
                status: false,
                message: "Berkas 'fileupload' (Foto profil) wajib diunggah!"
            });
        }

        const nama = body.nama?.trim() || "arulzzxd";
        const nomor = formatNomor(body.nomor?.trim() || "08123456789");
        const status = body.status?.trim() || "Busy";

        if (!bgCache) bgCache = await getBuffer(BG_URL);

        const [avatar, background] = await Promise.all([
            loadImage(file.buffer),
            loadImage(bgCache)
        ]);

        const canvas = createCanvas(background.width, background.height);
        const ctx = canvas.getContext("2d");

        // Render Background
        ctx.drawImage(background, 0, 0);

        // Clip & Crop Foto Profil ke Bentuk Lingkaran
        const avatarSize = 350;
        const avatarX = (canvas.width - avatarSize) / 2;
        const avatarY = 163;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const minSide = Math.min(avatar.width, avatar.height);
        const cropX = (avatar.width - minSide) / 2;
        const cropY = (avatar.height - minSide) / 2;
        ctx.drawImage(avatar, cropX, cropY, minSide, minSide, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Teks "Edit"
        ctx.fillStyle = "#25D366";
        ctx.font = "25px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Edit", avatarX + avatarSize / 2, avatarY + avatarSize + 104);

        // Text Biodata Profile
        const startY = 760;
        const gapY = 150;
        ctx.textAlign = "left";
        ctx.font = "30px Arial";
        ctx.fillStyle = "#a7a4a4";

        ctx.fillText(nama, 165, startY + 25);
        ctx.fillText(status, 165, startY + gapY + 25);
        ctx.fillText(nomor, 165, startY + gapY * 2 + 25);

        // Teks "Instagram"
        ctx.fillStyle = "#25D366";
        ctx.fillText("Instagram", 165, startY + gapY * 3 + 26);

        // Response PNG Buffer
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

router.desc = "Maker untuk membuat tampilan Fake WhatsApp Profile.";
router.paramsConfig = {
    fileupload: {
        type: "file",
        desc: "file gambar profil"
    },
    nama: "contoh: Arulz",
    nomor: "contoh: 08123456789",
    status: "contoh: Sibuk"
};
router.status = "ready";
router.type = "free";

export default router;