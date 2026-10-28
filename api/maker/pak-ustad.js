import express from 'express';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';

const router = express.Router();

const TEMPLATE_URL = 'https://files.catbox.moe/mj8qgt.jpg';

function wrapText(context, text, maxWidth) {
  const words = text.split(' ');
  let lines = [];
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    const w = context.measureText(test).width;
    if (w > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + ' ';
    } else {
      line = test;
    }
  }
  lines.push(line.trim());
  return lines;
}

router.get('/', async (req, res) => {
  try {
    const text = req.query.text?.trim() || req.query.pertanyaan?.trim() || 'Bagaimana hukumnya berpuasa di hari Jumat?';

    const bgRes = await axios.get(TEMPLATE_URL, { responseType: 'arraybuffer' });
    const base = await loadImage(Buffer.from(bgRes.data));

    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(base, 0, 0);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    const paddingX = 100;
    const x = canvas.width / 2;
    const maxWidth = canvas.width - paddingX * 2;
    const startY = 190;
    const lineSpacing = 10;

    let fontSize = 38;
    ctx.font = `${fontSize}px sans-serif`;
    const lineHeight = fontSize + lineSpacing;

    const lines = wrapText(ctx, text, maxWidth);
    const totalHeight = lines.length * lineHeight;

    const boxHeight = 120;
    let y = startY + (boxHeight / 2) - (totalHeight / 2) + lineHeight / 2;

    if (y + totalHeight > canvas.height - 50) {
      y = canvas.height - totalHeight - 50;
    }

    for (let line of lines) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }

    const buffer = await canvas.encode('png');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat memproses pembuat gambar Tanya Ustadz',
      error: err.message
    });
  }
});

router.desc = "Membuat gambar meme/pertanyaan kustom untuk Tanya Ustadz.";
router.paramsConfig = {
  text: "contoh: Bagaimana hukumnya berpuasa di hari Jumat?"
};

router.status = "ready";
router.type = "free";

export default router;
