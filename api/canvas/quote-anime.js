import express from 'express';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';

const router = express.Router();

let fontsLoaded = false;

const FONT_QUOTE = {
  family: 'arialn',
  url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Font/ARIALN.ttf'
};

const FONT_USERNAME = {
  family: 'Inter',
  url: 'https://cdn.jsdelivr.net/gh/rsms/inter@master/docs/font-files/Inter-Medium.woff2'
};

const BACKGROUNDS = {
  1: {
    name: 'l',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/qca/L.png',
    textZone: { x: 775, y: 56, w: 456, h: 1102 },
    usernameZone: { x: 890, y: 1167, w: 228, h: 50 },
    usernameFontSize: 28
  },
  2: {
    name: 'gojo',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/qca/gok.png',
    textZone: { x: 755, y: 68, w: 466, h: 1027 },
    usernameZone: { x: 863, y: 1108, w: 249, h: 50 },
    usernameFontSize: 28
  },
  3: {
    name: 'yuji',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/qca/cc.png',
    textZone: { x: 35, y: 68, w: 466, h: 1027 },
    usernameZone: { x: 133, y: 1108, w: 249, h: 50 },
    usernameFontSize: 28
  },
  4: {
    name: 'denji',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/qca/denji.png',
    textZone: { x: 655, y: 68, w: 512, h: 1083 },
    usernameZone: { x: 795, y: 1152, w: 249, h: 50 },
    usernameFontSize: 28
  },
  5: {
    name: 'thorfin',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/qca/thorfin.png',
    textZone: { x: 65, y: 54, w: 489, h: 992 },
    usernameZone: { x: 162, y: 1042, w: 249, h: 50 },
    usernameFontSize: 28
  },
  6: {
    name: 'naruto',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/qca/Naruto.png',
    textZone: { x: 40, y: 56, w: 481, h: 1065 },
    usernameZone: { x: 170, y: 1126, w: 228, h: 50 },
    usernameFontSize: 28
  },
  7: {
    name: 'light',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/qca/LIghtyagami.png',
    textZone: { x: 38, y: 56, w: 493, h: 941 },
    usernameZone: { x: 170, y: 1025, w: 228, h: 50 },
    usernameFontSize: 28
  },
  8: {
    name: 'higuruma',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/qca/higuruma.png',
    textZone: { x: 755, y: 68, w: 424, h: 920 },
    usernameZone: { x: 840, y: 993, w: 249, h: 50 },
    usernameFontSize: 28
  },
  9: {
    name: 'elina',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Image/elina.png',
    textZone: { x: 680, y: 101, w: 505, h: 970 },
    usernameZone: { x: 831, y: 1068, w: 220, h: 50 },
    usernameFontSize: 28
  },
  10: {
    name: 'ayanokoji',
    url: 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Image/ayanolkoji.png',
    textZone: { x: 62, y: 79, w: 505, h: 879 },
    usernameZone: { x: 200, y: 956, w: 220, h: 50 },
    usernameFontSize: 28
  }
};

const TEXT_STYLE = {
  fontWeight: 400,
  fontFamily: 'arialn, sans-serif',
  color: '#111111',
  align: 'justify',
  initialSize: 75,
  minFontSize: 24
};

const USERNAME_STYLE = {
  fontWeight: 500,
  fontFamily: 'Inter, sans-serif',
  color: '#121212',
  align: 'left',
  gap: 40
};

const CANVAS_SIZE = { width: 1254, height: 1254 };

async function loadFonts() {
  if (fontsLoaded) return;
  try {
    const [quoteRes, usernameRes] = await Promise.all([
      axios.get(FONT_QUOTE.url, { responseType: 'arraybuffer' }),
      axios.get(FONT_USERNAME.url, { responseType: 'arraybuffer' })
    ]);

    GlobalFonts.register(Buffer.from(quoteRes.data), FONT_QUOTE.family);
    GlobalFonts.register(Buffer.from(usernameRes.data), FONT_USERNAME.family);

    fontsLoaded = true;
  } catch (err) {
    console.error('Gagal memuat font remote:', err.message);
    throw new Error('Gagal memuat font remote.');
  }
}

function wrapText(ctx, text, maxWidth) {
  const out = [];
  text.split('\n').forEach(p => {
    let cur = '';
    p.split(' ').forEach(w => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxWidth && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = t;
      }
    });
    out.push(cur);
  });
  return out;
}

function fitTextInZone(ctx, text, zone, opts) {
  const { fontWeight, fontFamily, initialSize, minSize = 10, step = 2 } = opts;
  let fontSize = initialSize;
  let lines, lh;

  while (fontSize >= minSize) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    lines = wrapText(ctx, text, zone.w);
    lh = fontSize * 1.2;
    if (lines.length * lh <= zone.h) break;
    fontSize -= step;
  }
  if (fontSize < minSize) {
    fontSize = minSize;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    lines = wrapText(ctx, text, zone.w);
    lh = fontSize * 1.2;
  }
  return { fontSize, lines, lh };
}

function drawJustifiedLine(ctx, line, x, y, targetWidth) {
  const words = line.split(' ');
  if (words.length === 1) {
    ctx.textAlign = 'center';
    ctx.fillText(line, x + targetWidth / 2, y);
    return;
  }
  const wordWidths = words.map(w => ctx.measureText(w).width);
  const totalWordsWidth = wordWidths.reduce((a, b) => a + b, 0);
  const spaceWidth = (targetWidth - totalWordsWidth) / (words.length - 1);

  ctx.textAlign = 'left';
  let cx = x;
  words.forEach((w, i) => {
    ctx.fillText(w, cx, y);
    cx += wordWidths[i] + spaceWidth;
  });
}

function drawQuoteText(ctx, text, zone, opts) {
  const { fontSize, lines, lh } = fitTextInZone(ctx, text, zone, opts);
  ctx.font = `${opts.fontWeight} ${fontSize}px ${opts.fontFamily}`;

  ctx.save();
  ctx.beginPath();
  ctx.rect(zone.x, zone.y, zone.w, zone.h);
  ctx.clip();
  const startY = zone.y + zone.h / 2 - (lines.length * lh) / 2 + lh / 2;

  if (opts.align === 'justify') {
    lines.forEach((l, i) => {
      const y = startY + i * lh;
      const isLastLine = i === lines.length - 1;
      if (isLastLine) {
        ctx.textAlign = 'center';
        ctx.fillText(l, zone.x + zone.w / 2, y);
      } else {
        drawJustifiedLine(ctx, l, zone.x, y, zone.w);
      }
    });
  } else {
    const drawX = opts.align === 'center' ? zone.x + zone.w / 2 : opts.align === 'right' ? zone.x + zone.w : zone.x;
    ctx.textAlign = opts.align;
    lines.forEach((l, i) => ctx.fillText(l, drawX, startY + i * lh));
  }
  ctx.restore();

  return startY + (lines.length - 1) * lh + lh / 2;
}

function drawUsernameText(ctx, text, x, y, opts, fontSize, maxWidth) {
  ctx.font = `${opts.fontWeight} ${fontSize}px ${opts.fontFamily}`;
  ctx.textAlign = 'center';
  const lh = fontSize * 1.2;
  const lines = wrapText(ctx, text, maxWidth);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
}

// Hanya menggunakan 1 method default GET
router.get('/', async (req, res) => {
  try {
    const text = req.query.text?.trim() || req.query.quote?.trim() || 'Semua manusia hanyalah alat';
    const username = req.query.username?.trim() || req.query.author?.trim() || '- Ayanokoji';
    const bgNum = parseInt(req.query.bg) || 10;

    const bg = BACKGROUNDS[bgNum];
    if (!bg) {
      return res.status(400).json({
        status: false,
        creator: 'Arulzxd',
        message: `Background nomor ${bgNum} tidak ditemukan! Gunakan nomor 1 - ${Object.keys(BACKGROUNDS).length}.`
      });
    }

    await loadFonts();

    const bgRes = await axios.get(bg.url, { responseType: 'arraybuffer' });
    const bgImg = await loadImage(Buffer.from(bgRes.data));

    const canvas = createCanvas(CANVAS_SIZE.width, CANVAS_SIZE.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(bgImg, 0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);

    ctx.save();
    ctx.fillStyle = TEXT_STYLE.color;
    ctx.textBaseline = 'middle';
    const quoteEndY = drawQuoteText(ctx, text, bg.textZone, TEXT_STYLE);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = USERNAME_STYLE.color;
    ctx.textBaseline = 'middle';
    const usernameX = bg.textZone.x + bg.textZone.w / 2;
    const usernameY = quoteEndY + USERNAME_STYLE.gap;
    drawUsernameText(ctx, username, usernameX, usernameY, USERNAME_STYLE, bg.usernameFontSize, bg.textZone.w);
    ctx.restore();

    const buffer = await canvas.encode('png');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat memproses pembuatan kutipan anime',
      error: err.message
    });
  }
});

router.desc = "Membuat gambar kutipan anime kustom dengan berbagai latar belakang karakter.";
router.paramsConfig = {
  text: "text (contoh: Semua manusia hanyalah alat)",
  username: "text (contoh: - Ayanokoji)",
  bg: {
    type: "select",
    options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    default: "10"
  }
};

router.status = "ready";
router.type = "free";

export default router;
