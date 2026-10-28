import express from 'express';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';

const router = express.Router();

const IMAGE_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772230812753.jpeg";

function wrapText(context, txt, x, y, maxWidth, lineHeight, fill) {
  const words = txt.split(" ");
  let line = "";
  let lines = [];

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line);
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  if (fill) {
    lines.forEach((l, i) => context.fillText(l, x, y + i * lineHeight));
  }
  return lines.length * lineHeight;
}

router.get('/', async (req, res) => {
  try {
    const text = req.query.text?.trim() || 'Wahai kerang ajaib';

    const response = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
    const img = await loadImage(Buffer.from(response.data));

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, img.width, img.height);

    const boardX = img.width * 0.55;
    const boardY = img.height * 0.18;
    const boardW = img.width * 0.35;
    const boardH = img.height * 0.42;

    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let fontSize = 52;
    let textHeight = Infinity;

    while (fontSize > 16) {
      ctx.font = `bold ${fontSize}px sans-serif`;
      const lineHeight = fontSize + 6;
      textHeight = wrapText(ctx, text, -9999, -9999, boardW, lineHeight, false);
      if (textHeight <= boardH) break;
      fontSize--;
    }

    ctx.font = `bold ${fontSize}px sans-serif`;
    wrapText(ctx, text, boardX + boardW / 2, boardY, boardW, fontSize + 6, true);

    const buffer = await canvas.encode("png");

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat memproses pembuatan meme SpongeBob",
      error: err.message
    });
  }
});

router.desc = "Membuat gambar meme SpongeBob kustom.";
router.paramsConfig = {
  text: "contoh: Wahai kerang ajaib"
};

router.status = "ready";
router.type = "free";

export default router;
