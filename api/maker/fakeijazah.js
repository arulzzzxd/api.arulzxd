import express from "express";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const router = express.Router();

const CANVAS_WIDTH = 1100;
const CANVAS_HEIGHT = 760;

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function generateFakeIjazah(nama, gelar, universitas) {
    const tahun = new Date().getFullYear();
    const ijazahNo = 'IZH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
      <rect width="1100" height="760" fill="#f8f4e8"/>
      <rect x="28" y="28" width="1044" height="704" rx="10" fill="none" stroke="#333" stroke-width="4"/>
      <rect x="42" y="42" width="1016" height="676" rx="8" fill="none" stroke="#777" stroke-width="2"/>
      <text x="550" y="105" text-anchor="middle" font-family="Times New Roman, serif" font-size="34" font-weight="700">IJAZAH</text>
      <text x="550" y="145" text-anchor="middle" font-family="Times New Roman, serif" font-size="17">UNTUK HIBURAN</text>
      <line x1="220" y1="170" x2="880" y2="170" stroke="#333" stroke-width="2"/>
      <text x="550" y="235" text-anchor="middle" font-family="Times New Roman, serif" font-size="15">Diberikan kepada</text>
      <text x="550" y="290" text-anchor="middle" font-family="Times New Roman, serif" font-size="30" font-weight="700">${escapeXml(nama).toUpperCase()}</text>
      <text x="550" y="340" text-anchor="middle" font-family="Times New Roman, serif" font-size="20">${escapeXml(gelar).toUpperCase()}</text>
      <text x="550" y="390" text-anchor="middle" font-family="Times New Roman, serif" font-size="18">${escapeXml(universitas).toUpperCase()}</text>
      <line x1="220" y1="425" x2="880" y2="425" stroke="#888" stroke-width="1"/>
      <text x="550" y="485" text-anchor="middle" font-family="Times New Roman, serif" font-size="16">No. Ijazah: ${ijazahNo}</text>
      <text x="550" y="525" text-anchor="middle" font-family="Times New Roman, serif" font-size="16">Tahun Lulus: ${tahun}</text>
      <text x="550" y="630" text-anchor="middle" font-family="Times New Roman, serif" font-size="14" fill="#666">DOKUMEN CONTOH — TIDAK BERLAKU SEBAGAI DOKUMEN RESMI</text>
    </svg>`;

    const template = await loadImage(Buffer.from(svg));
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(template, 0, 0);
    return await canvas.encode('png');
}

router.get("/", async (req, res) => {
    try {
        const nama = req.query.nama?.trim() || "Rimuru";
        const gelar = req.query.gelar?.trim() || "S.Kom";
        const universitas = req.query.universitas?.trim() || "Universitas Zero";

        const imageBuffer = await generateFakeIjazah(nama, gelar, universitas);

        res.setHeader("Content-Type", "image/png");
        return res.end(imageBuffer);

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message
        });
    }
});

router.desc = "Maker untuk membuat gambar Fake Ijazah Hiburan.";
router.paramsConfig = {
    nama: "contoh: Arulz",
    gelar: "contoh: S.Kom",
    universitas: "contoh: Universitas Arulz"
};
router.status = "ready";
router.type = "free";

export default router;
