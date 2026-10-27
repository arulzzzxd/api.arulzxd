import express from 'express';
import multer from 'multer';
import axios from 'axios';
import {
    createCanvas,
    loadImage,
    GlobalFonts
} from '@napi-rs/canvas';

const router = express.Router();
const upload = multer();

// CDN URL Assets
const ASSETS_CDN = {
    template: "https://cdn.arulz.biz.id/files/ryrqDfbR.png",
    arrial: "https://cdn.arulz.biz.id/files/Al1Y.ttf",
    ocr: "https://cdn.arulz.biz.id/files/xKv1.ttf",
    sign: "https://cdn.arulz.biz.id/files/jYxGpq.ttf",
};

let fontsLoaded = false;

/**
 * Download buffer dari URL menggunakan axios (Tanpa penyimpanan ke disk)
 */
async function fetchBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(data);
}

/**
 * Register font ke GlobalFonts dari Buffer memory
 */
async function loadKtpFonts() {
    if (fontsLoaded) return;
    try {
        const [arrialBuf, ocrBuf, signBuf] = await Promise.all([
            fetchBuffer(ASSETS_CDN.arrial),
            fetchBuffer(ASSETS_CDN.ocr),
            fetchBuffer(ASSETS_CDN.sign)
        ]);

        GlobalFonts.register(arrialBuf, "ArrialKTP");
        GlobalFonts.register(ocrBuf, "OcrKTP");
        GlobalFonts.register(signBuf, "SignKTP");

        fontsLoaded = true;
    } catch (err) {
        console.error("Gagal mendaftarkan font KTP:", err.message);
    }
}

const cpUpload = upload.fields([
    { name: 'photoFile', maxCount: 1 }
]);

router.post('/', cpUpload, async (req, res) => {
    try {
        const files = req.files || {};
        const body = req.body || {};

        // Validasi Upload Pasfoto
        const photoFileInput = files.photoFile?.[0];
        if (!photoFileInput || !photoFileInput.buffer) {
            return res.status(400).json({
                status: false,
                creator: "Vamz Spectre",
                message: "Berkas 'photoFile' (Pasfoto KTP) wajib diunggah!"
            });
        }

        const photoImg = await loadImage(photoFileInput.buffer);

        // Options dari body request dengan fallback default
        const options = {
            prov: body.prov || "DKI JAKARTA",
            kota: body.kota || "JAKARTA PUSAT",
            nik: body.nik || "3171010101900001",
            nama: body.nama || "BUDI SANTOSO",
            ttl: body.ttl || "JAKARTA, 01-01-2000",
            jk: body.jk || "LAKI-LAKI",
            goldar: body.goldar || "O",
            alamat: body.alamat || "JL. MERDEKA NO. 45",
            rtrw: body.rtrw || "001/002",
            keldesa: body.keldesa || "GAMBIR",
            kec: body.kec || "GAMBIR",
            agama: body.agama || "ISLAM",
            status: body.status || "BELUM KAWIN",
            kerja: body.kerja || "PELAJAR/MAHASISWA",
            wn: body.wn || "WNI",
            masa: body.masa || "SEUMUR HIDUP",
            terbuat: body.terbuat || "01-01-2024",
        };

        // Load Fonts & Template KTP dari memory
        await loadKtpFonts();
        const templateBuf = await fetchBuffer(ASSETS_CDN.template);
        const templateImg = await loadImage(templateBuf);

        // Inisialisasi Canvas
        const canvas = createCanvas(720, 463);
        const ctx = canvas.getContext("2d");

        // Background Template KTP
        ctx.drawImage(templateImg, 0, 0, 720, 463);

        // Crop & Placement Pasfoto
        const PHOTO_X = 520,
            PHOTO_Y = 80,
            PHOTO_W = 200,
            PHOTO_H = 280;
        const frameRatio = PHOTO_W / PHOTO_H;
        const imgRatio = photoImg.width / photoImg.height;

        let sx, sy, sw, sh;
        if (imgRatio > frameRatio) {
            sh = photoImg.height;
            sw = sh * frameRatio;
            sx = (photoImg.width - sw) / 2;
            sy = 0;
        } else {
            sw = photoImg.width;
            sh = sw / frameRatio;
            sx = 0;
            sy = (photoImg.height - sh) / 2;
        }

        const scale = Math.min(PHOTO_W / sw, PHOTO_H / sh) * 0.78;
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = PHOTO_X + (PHOTO_W - dw) / 2 - 15;
        const dy = PHOTO_Y + (PHOTO_H - dh) / 2;

        ctx.drawImage(photoImg, sx, sy, sw, sh, dx, dy, dw, dh);

        // Helper Render Text
        const fontName = (name) => fontsLoaded ? name : "sans-serif";

        const L = (x, y, text, font, size) => {
            ctx.font = `${size}px "${fontName(font)}"`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#000000";
            ctx.fillText(text || "", x, y);
        };

        const C = (x, y, text, font, size) => {
            ctx.font = `${size}px "${fontName(font)}"`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#000000";
            ctx.fillText(text || "", x, y);
        };

        const up = (s) => (s || "").toUpperCase();

        // Render Teks Biodata KTP
        C(380, 45, "PROVINSI " + up(options.prov), "ArrialKTP", 25);
        C(380, 70, "KOTA " + up(options.kota), "ArrialKTP", 25);

        ctx.font = `32px "${fontName("OcrKTP")}"`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#000000";
        ctx.fillText(options.nik, 170, 105);

        L(190, 145, up(options.nama), "ArrialKTP", 16);
        L(190, 168, up(options.ttl), "ArrialKTP", 16);
        L(190, 191, up(options.jk), "ArrialKTP", 16);
        L(463, 190, up(options.goldar), "ArrialKTP", 16);
        L(190, 212, up(options.alamat), "ArrialKTP", 16);
        L(190, 234, up(options.rtrw), "ArrialKTP", 16);
        L(190, 257, up(options.keldesa), "ArrialKTP", 16);
        L(190, 279, up(options.kec), "ArrialKTP", 16);
        L(190, 300, up(options.agama), "ArrialKTP", 16);
        L(190, 323, up(options.status), "ArrialKTP", 16);
        L(190, 346, up(options.kerja), "ArrialKTP", 16);
        L(190, 369, up(options.wn), "ArrialKTP", 16);
        L(190, 390, up(options.masa), "ArrialKTP", 16);

        L(553, 345, "KOTA " + up(options.kota), "ArrialKTP", 12);
        L(570, 365, options.terbuat, "ArrialKTP", 12);

        // Render Tanda Tangan
        ctx.font = `40px "${fontName("SignKTP")}"`;
        const firstName = options.nama.split(" ")[0] || options.nama;
        ctx.fillText(firstName, 540, 395);

        // Response PNG Buffer
        const buffer = await canvas.encode('png');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `inline; filename="ktp-${options.nik}.png"`);
        return res.send(buffer);

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: "Vamz Spectre",
            message: "Internal Server Error saat membuat Fake e-KTP",
            error: err.message
        });
    }
});

router.paramsConfig = {
    photoFile: {
        type: "file",
        desc: "Berkas pasfoto KTP"
    },
    nama: "contoh: BUDI SANTOSO",
    nik: "contoh: 3171010101900001",
    prov: "contoh: DKI JAKARTA",
    kota: "contoh: JAKARTA PUSAT",
    ttl: "contoh: JAKARTA, 01-01-2000",
    jk: "contoh: LAKI-LAKI",
    goldar: "contoh: O",
    alamat: "contoh: JL. MERDEKA NO. 45",
    rtrw: "contoh: 001/002",
    keldesa: "contoh: GAMBIR",
    kec: "contoh: GAMBIR",
    agama: "contoh: ISLAM",
    status: "contoh: BELUM KAWIN",
    kerja: "contoh: PELAJAR/MAHASISWA",
    wn: "contoh: WNI",
    masa: "contoh: SEUMUR HIDUP",
    terbuat: "contoh: 01-01-2024"
};

router.desc = "Maker Fake e-KTP Generator Indonesia (Upload Pasfoto Wajib).";
router.status = "ready";
router.type = "free";

export default router;
