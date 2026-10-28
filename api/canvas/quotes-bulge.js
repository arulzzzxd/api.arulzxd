import express from 'express';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';

const router = express.Router();

const WIDTH = 720;
const HEIGHT = 1280;
const BULGE_RADIUS = 580;
const BULGE_STRENGTH = 0.12;

const FONT_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Regular.ttf';
const EMOJI_JSON_URL = 'https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json';

const THEMES = {
  quote: { bg: '#ffffff', text: '#9e0a1b' },
};

let fontLoaded = false;
let emojiMap = null;
const emojiImageCache = new Map();

async function ensureAssets() {
  if (!fontLoaded) {
    const fontRes = await axios.get(FONT_URL, { responseType: 'arraybuffer' });
    GlobalFonts.register(Buffer.from(fontRes.data), 'QuoteFont');
    fontLoaded = true;
  }

  if (!emojiMap) {
    const emojiRes = await axios.get(EMOJI_JSON_URL, { responseType: 'json' });
    emojiMap = emojiRes.data;
  }
}

function emojiToUnicode(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join('-');
}

async function getEmojiImage(emoji) {
  if (emojiImageCache.has(emoji)) return emojiImageCache.get(emoji);
  const base = emojiToUnicode(emoji);
  const variants = [
    base,
    base.replace(/-fe0f/gi, ''),
    `${base.replace(/-fe0f/gi, '')}-fe0f`,
    base.toUpperCase(),
    base.replace(/-fe0f/gi, '').toUpperCase(),
    base.replace(/-fe0f/gi, '').toUpperCase() + '-FE0F'
  ];
  let b64 = null;
  for (const v of variants) {
    if (emojiMap && emojiMap[v]) { b64 = emojiMap[v]; break; }
  }
  if (!b64) return null;
  const img = await loadImage(Buffer.from(b64, 'base64'));
  emojiImageCache.set(emoji, img);
  return img;
}

const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu;

function tokenize(rawText) {
  const chunks = rawText.split(EMOJI_REGEX);
  const tokens = [];
  for (const chunk of chunks) {
    if (!chunk) continue;
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(chunk)) {
      tokens.push({ type: 'emoji', text: chunk });
      EMOJI_REGEX.lastIndex = 0;
      continue;
    }
    const parts = chunk.split(/(\*[^*]+\*)/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        splitWords(part.slice(1, -1), 'italic', tokens);
      } else {
        splitWords(part, 'auto', tokens);
      }
    }
  }
  return tokens;
}

function splitWords(text, forcedStyle, tokens) {
  const words = text.split(/(\s+)/);
  for (const w of words) {
    if (w === '') continue;
    if (/^\s+$/.test(w)) {
      tokens.push({ type: 'space', text: w });
      continue;
    }
    let style = forcedStyle;
    if (forcedStyle === 'auto') {
      const letters = w.replace(/[^a-zA-Z]/g, '');
      style = (letters.length > 1 && letters === letters.toUpperCase()) ? 'bold' : 'regular';
    }
    tokens.push({ type: 'word', text: w, style });
  }
}

function fontForStyle(style, size) {
  if (style === 'bold') return `bold ${size}px QuoteFont`;
  if (style === 'italic') return `italic ${size}px QuoteFont`;
  return `${size}px QuoteFont`;
}

function expandToChars(tokens) {
  const chars = [];
  for (const tok of tokens) {
    if (tok.type === 'emoji') {
      chars.push({ type: 'emoji', text: tok.text });
      continue;
    }
    if (tok.type === 'space') {
      chars.push({ type: 'char', text: ' ', style: 'regular' });
      continue;
    }
    for (const ch of tok.text) {
      chars.push({ type: 'char', text: ch, style: tok.style });
    }
  }
  return chars;
}

function layoutLines(ctx, tokens, fontSize, maxWidth) {
  const lines = [];
  let current = [];
  let currentWidth = 0;

  function widthOf(tok) {
    if (tok.type === 'emoji') return fontSize;
    ctx.font = fontForStyle(tok.style, fontSize);
    return ctx.measureText(tok.text).width;
  }

  for (const tok of tokens) {
    if (tok.type === 'space') {
      ctx.font = `${fontSize}px QuoteFont`;
      const spW = ctx.measureText(' ').width;
      if (current.length === 0) continue;
      current.push({ ...tok, width: spW });
      currentWidth += spW;
      continue;
    }
    const w = widthOf(tok);
    if (currentWidth + w > maxWidth && current.length > 0) {
      while (current.length && current[current.length - 1].type === 'space') current.pop();
      lines.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push({ ...tok, width: w });
    currentWidth += w;
  }
  if (current.length) {
    while (current.length && current[current.length - 1].type === 'space') current.pop();
    lines.push(current);
  }
  return lines;
}

function totalLineWidth(line) {
  return line.reduce((sum, t) => sum + t.width, 0);
}

function findBestFontSize(ctx, tokens, maxWidth, maxHeight) {
  let lo = 10, hi = 80, best = lo;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const currentLineGap = Math.floor(mid * 0.2);
    const lines = layoutLines(ctx, tokens, mid, maxWidth);
    const totalHeight = lines.length * (mid + currentLineGap) - currentLineGap;
    const fits = totalHeight <= maxHeight && lines.every(l => totalLineWidth(l) <= maxWidth);
    if (fits) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return best;
}

async function drawEmojiToken(ctx, emoji, x, y, size) {
  const img = await getEmojiImage(emoji);
  if (!img) { ctx.font = `${size}px QuoteFont`; ctx.fillText(emoji, x, y); return; }
  ctx.drawImage(img, x, y, size, size);
}

async function drawFlatLines(ctx, lines, centerX, startY, fontSize, lineGap) {
  let y = startY;
  for (const line of lines) {
    const charTokens = expandToChars(line);
    const widths = charTokens.map(c => {
      if (c.type === 'emoji') return fontSize;
      ctx.font = fontForStyle(c.style, fontSize);
      return ctx.measureText(c.text).width;
    });
    const lineWidth = widths.reduce((a, b) => a + b, 0);
    let x = centerX - lineWidth / 2;

    for (let i = 0; i < charTokens.length; i++) {
      const c = charTokens[i];
      const w = widths[i];
      if (c.type === 'emoji') {
        await drawEmojiToken(ctx, c.text, x, y, fontSize);
      } else if (c.text !== ' ') {
        ctx.font = fontForStyle(c.style, fontSize);
        ctx.fillText(c.text, x, y);
      }
      x += w;
    }
    y += fontSize + lineGap;
  }
}

function applyBulgeDistortion(srcCtx, dstCtx, width, height, radius, strength) {
  const srcData = srcCtx.getImageData(0, 0, width, height);
  const dstData = dstCtx.createImageData(width, height);
  const src = srcData.data;
  const dst = dstData.data;

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let sx = x;
      let sy = y;

      if (dist < radius && dist > 0) {
        const norm = dist / radius;
        const exponent = 1 + strength;
        const newDist = radius * Math.pow(norm, exponent);
        const ratio = newDist / dist;
        sx = cx + dx * ratio;
        sy = cy + dy * ratio;
      }

      const dstIdx = (y * width + x) * 4;

      if (sx >= 0 && sx < width - 1 && sy >= 0 && sy < height - 1) {
        const x1 = Math.floor(sx);
        const y1 = Math.floor(sy);
        const x2 = x1 + 1;
        const y2 = y1 + 1;

        const wx = sx - x1;
        const wy = sy - y1;

        const i11 = (y1 * width + x1) * 4;
        const i21 = (y1 * width + x2) * 4;
        const i12 = (y2 * width + x1) * 4;
        const i22 = (y2 * width + x2) * 4;

        for (let c = 0; c < 4; c++) {
          const top = src[i11 + c] * (1 - wx) + src[i21 + c] * wx;
          const bottom = src[i12 + c] * (1 - wx) + src[i22 + c] * wx;
          dst[dstIdx + c] = Math.round(top * (1 - wy) + bottom * wy);
        }
      } else {
        dst[dstIdx] = 255;
        dst[dstIdx + 1] = 255;
        dst[dstIdx + 2] = 255;
        dst[dstIdx + 3] = 255;
      }
    }
  }

  dstCtx.putImageData(dstData, 0, 0);
}

router.get('/', async (req, res) => {
  try {
    const text = req.body.text?.trim() || 'Hidup itu seperti mengendarai sepeda 🚲. Untuk menjaga keseimbanganmu ⚖️, kamu harus terus bergerak maju ➡️.';
    const t = THEMES.quote;

    const padding = 140;
    const maxWidth = WIDTH - padding * 2;

    await ensureAssets();

    const offCanvas = createCanvas(WIDTH, HEIGHT);
    const offCtx = offCanvas.getContext('2d');

    offCtx.fillStyle = t.bg;
    offCtx.fillRect(0, 0, WIDTH, HEIGHT);

    const tokens = tokenize(text);
    offCtx.textAlign = 'left';
    offCtx.textBaseline = 'top';

    const fontSize = findBestFontSize(offCtx, tokens, maxWidth, HEIGHT * 0.45);
    const lineGap = Math.floor(fontSize * 0.2);

    const lines = layoutLines(offCtx, tokens, fontSize, maxWidth);
    const totalTextHeight = lines.length * (fontSize + lineGap) - lineGap;

    offCtx.fillStyle = t.text;
    const startY = (HEIGHT - totalTextHeight) / 2;
    const centerX = WIDTH / 2;

    await drawFlatLines(offCtx, lines, centerX, startY, fontSize, lineGap);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    applyBulgeDistortion(offCtx, ctx, WIDTH, HEIGHT, BULGE_RADIUS, BULGE_STRENGTH);

    const buffer = await canvas.encode('png');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat memproses pembuatan kutipan cembung',
      error: err.message
    });
  }
});

router.desc = "Membuat gambar kutipan bergaya kartus dengan efek distorsi cembung dan dukungan emoji Apple.";
router.paramsConfig = {
  text: "contoh: Hidup itu seperti mengendarai sepeda 🚲"
};

router.status = "ready";
router.type = "free";

export default router;
