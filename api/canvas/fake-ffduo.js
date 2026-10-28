import express from 'express';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';

const router = express.Router();

let isFontLoaded = false;
const MAX_BG = 50;

async function loadFont() {
  if (isFontLoaded) return;
  try {
    const res = await axios.get("https://raw.githubusercontent.com/arulzzzxd/database/main/font/TeutonNormal.otf", { responseType: "arraybuffer" });
    GlobalFonts.register(Buffer.from(res.data), "TeutonNormal");
    isFontLoaded = true;
  } catch (err) {
    console.error("Gagal memuat font TeutonNormal:", err.message);
    throw new Error("Gagal memuat font remote.");
  }
}

router.get('/', async (req, res) => {
  try {
    const name1 = req.query.name1?.trim() || 'Arulz.Ganzz';
    const name2 = req.query.name2?.trim() || 'EldaChan';
    const lobby = parseInt(req.query.bg) || 1;

    if (lobby < 1 || lobby > MAX_BG) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: `Pilihan background tidak valid! Gunakan angka antara 1 sampai ${MAX_BG}.`
      });
    }

    await loadFont();

    const bgUrl = `https://raw.githubusercontent.com/arulzzzxd/database/main/fake-ff-duo/${lobby}.png`;
    const bgRes = await axios.get(bgUrl, { responseType: "arraybuffer" });
    const background = await loadImage(Buffer.from(bgRes.data));

    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.font = `bold 38px "TeutonNormal"`;
    ctx.textAlign = "center";

    // Draw Name 1
    ctx.fillStyle = "#ffffff";
    ctx.fillText(name1, 212, canvas.height - 314);
    ctx.fillStyle = "#ffb300";
    ctx.fillText(name1, 212, canvas.height - 314);
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 1.6;
    ctx.strokeText(name1, 212, canvas.height - 314);

    // Draw Name 2
    ctx.fillStyle = "#ffffff";
    ctx.fillText(name2, 740, canvas.height - 434);
    ctx.fillStyle = "#ffb300";
    ctx.fillText(name2, 740, canvas.height - 434);
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 1.6;
    ctx.strokeText(name2, 740, canvas.height - 434);

    const buffer = await canvas.encode("png");

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat memproses pembuatan banner Fake FF Duo",
      error: err.message
    });
  }
});

router.desc = "Membuat gambar banner Fake Free Fire Duo kustom.";
router.paramsConfig = {
  name1: "contoh: Arulz.Ganzz",
  name2: "contoh: EldaChan",
  bg: {
    type: "select",
    options: Array.from({ length: MAX_BG }, (_, i) => (i + 1).toString()),
    default: "1"
  }
};

router.status = "ready";
router.type = "free";

export default router;
