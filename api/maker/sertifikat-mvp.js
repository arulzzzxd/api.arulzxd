import express from 'express';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';

const router = express.Router();

const BACKGROUND_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772230577235.jpeg";

router.get('/', async (req, res) => {
  try {
    const text = req.query.name?.trim() || req.query.text?.trim() || 'Fauzan';

    if (text.length > 20) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: "Nama terlalu panjang! Maksimal 20 karakter."
      });
    }

    const bgRes = await axios.get(BACKGROUND_URL, { responseType: 'arraybuffer' });
    const bg = await loadImage(Buffer.from(bgRes.data));

    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#918A81";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(text, 640, 530);

    const buffer = await canvas.encode("png");

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat memproses pembuatan sertifikat MVP",
      error: err.message
    });
  }
});

router.desc = "Membuat gambar sertifikat MVP.";
router.paramsConfig = {
  name: "contoh: Arulzxd"
};

router.status = "ready";
router.type = "free";

export default router;
