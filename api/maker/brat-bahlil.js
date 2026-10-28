import express from 'express';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';

const router = express.Router();

const IMAGE_URL = 'https://i.ibb.co/JwT2QFvY/elaina-md.jpg';

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;

    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);
  return lines;
}

router.get('/', async (req, res) => {
  try {
    const text = req.query.text?.trim() || 'halo member';

    const response = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
    const img = await loadImage(Buffer.from(response.data));

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, img.width, img.height);

    const boardX = img.width * 0.18;
    const boardY = img.height * 0.55;
    const boardW = img.width * 0.64;
    const boardH = img.height * 0.30;

    const padding = boardW * 0.08;
    const textAreaW = boardW - padding * 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';

    let fontSize = 80;
    let lines = [];

    while (fontSize > 30) {
      ctx.font = `500 ${fontSize}px Arial`;
      lines = wrapLines(ctx, text, textAreaW);

      const lineHeight = fontSize * 1.05;
      if (lines.length <= 3 && lines.length * lineHeight <= boardH) break;

      fontSize--;
    }

    ctx.font = `500 ${fontSize}px Arial`;

    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const lineHeight = fontSize * 1.05;
    const showLines = lines.slice(0, 3);

    const startY =
      boardY +
      boardH / 2 -
      (showLines.length * lineHeight) / 2 +
      lineHeight * 0.38;

    showLines.forEach((line, i) => {
      ctx.fillText(
        line,
        boardX + boardW / 2,
        startY + i * lineHeight
      );
    });

    const buffer = await canvas.encode('png');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat memproses pembuatan gambar Brat Bahlil',
      error: err.message
    });
  }
});

router.desc = "Membuat gambar meme Brat Bahlil kustom.";
router.paramsConfig = {
  text: "contoh: halo member"
};

router.status = "ready";
router.type = "free";

export default router;
