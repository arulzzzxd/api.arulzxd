import express from 'express';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import multer from 'multer';

const router = express.Router();
const upload = multer();

const APPLE_EMOJI_JSON_URL = 'https://raw.githubusercontent.com/arulzzzxd/database/refs/heads/main/emoji-apple.json';
const BACKGROUND_URL = 'https://raw.githubusercontent.com/zenzXD/uploader-storage/main/uploads/1783850965107.png';
const PLUS_ICON_URL = 'https://raw.githubusercontent.com/zenzXD/uploader-storage/main/uploads/1783844204892.png';
const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu;

let appleEmojiMap = null;
let fontLoaded = false;
const emojiImageCache = new Map();

async function getBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

function drawCircleImg(ctx, img, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

async function loadAssets() {
  if (fontLoaded) return;
  try {
    const fontBuffer = await getBuffer('https://github.com/rsms/inter/raw/refs/heads/master/docs/font-files/Inter-Bold.woff2');
    GlobalFonts.register(fontBuffer, 'InstagramBold');
    fontLoaded = true;
  } catch (err) {
    console.error('Gagal memuat font InstagramBold:', err.message);
  }
}

function emojiToUnicode(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join('-');
}

async function loadAppleEmojiMap() {
  if (appleEmojiMap) return appleEmojiMap;
  const jsonBuffer = await getBuffer(APPLE_EMOJI_JSON_URL);
  appleEmojiMap = JSON.parse(jsonBuffer.toString('utf-8'));
  return appleEmojiMap;
}

async function getEmojiImage(emoji) {
  if (emojiImageCache.has(emoji)) return emojiImageCache.get(emoji);
  const map = await loadAppleEmojiMap();
  const base = emojiToUnicode(emoji);
  const variants = [
    base,
    base.replace(/-fe0f/gi, ''),
    `${base.replace(/-fe0f/gi, '')}-fe0f`,
    base.toUpperCase(),
    base.replace(/-fe0f/gi, '').toUpperCase(),
    base.replace(/-fe0f/gi, '').toUpperCase() + '-FE0F',
  ];
  let b64 = null;
  for (const v of variants) {
    if (map[v]) { b64 = map[v]; break; }
  }
  if (!b64) return null;
  const buf = Buffer.from(b64, 'base64');
  const img = await loadImage(buf);
  emojiImageCache.set(emoji, img);
  return img;
}

async function drawAppleEmoji(ctx, emoji, x, y, size) {
  const img = await getEmojiImage(emoji);
  if (!img) {
    ctx.fillText(emoji, x, y);
    return;
  }
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

function measureTextCustom(ctx, text, fontSize) {
  const parts = text.split(EMOJI_REGEX);
  let totalWidth = 0;
  for (const part of parts) {
    if (!part) continue;
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(part)) {
      totalWidth += fontSize * 1.05;
    } else {
      totalWidth += ctx.measureText(part).width;
    }
    EMOJI_REGEX.lastIndex = 0;
  }
  return totalWidth;
}

async function drawTextWithEmojis(ctx, text, x, y, fontSize) {
  const parts = text.split(EMOJI_REGEX);
  let currentX = x;
  for (const part of parts) {
    if (!part) continue;
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(part)) {
      const emojiSize = fontSize * 1.05;
      const emojiCX = currentX + emojiSize / 2;
      const emojiCY = y;
      await drawAppleEmoji(ctx, part, emojiCX, emojiCY, emojiSize);
      currentX += emojiSize;
    } else {
      ctx.fillText(part, currentX, y);
      currentX += ctx.measureText(part).width;
    }
    EMOJI_REGEX.lastIndex = 0;
  }
}

function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.font = `${fontSize}px InstagramBold`;
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.includes('\n')) {
      const parts = word.split('\n');
      for (let j = 0; j < parts.length; j++) {
        const test = cur + (cur ? " " : "") + parts[j];
        if (measureTextCustom(ctx, test, fontSize) > maxWidth && cur) {
          lines.push(cur); cur = parts[j];
        } else { cur = test; }
        if (j < parts.length - 1) { lines.push(cur); cur = ""; }
      }
      continue;
    }
    const test = cur + (cur ? " " : "") + word;
    if (measureTextCustom(ctx, test, fontSize) > maxWidth && i > 0) {
      lines.push(cur); cur = word;
    } else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function generateFakeIgProfile({ pengikut, mengikuti, postingan, username, bio, ppBuffer }) {
  await loadAssets();

  const [bgBuffer, plusBuffer] = await Promise.all([
    getBuffer(BACKGROUND_URL),
    getBuffer(PLUS_ICON_URL)
  ]);

  const bg = await loadImage(bgBuffer);
  const ppImg = await loadImage(ppBuffer);
  const plusImg = await loadImage(plusBuffer);

  const canvas = createCanvas(bg.width, bg.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(bg, 0, 0, bg.width, bg.height);

  const ppSize = 145;
  const ppX = 35;
  const ppY = 145;
  drawCircleImg(ctx, ppImg, ppX, ppY, ppSize);

  const plusSize = 70;
  const plusX = ppX + ppSize - plusSize + 5;
  const plusY = ppY + ppSize - plusSize + 5;
  ctx.drawImage(plusImg, plusX, plusY, plusSize, plusSize);

  ctx.fillStyle = '#f9fdfe';

  const usernameFontSize = 25;
  ctx.font = `${usernameFontSize}px InstagramBold`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const usernameX = 190;
  const usernameY = 150;
  await drawTextWithEmojis(ctx, username, usernameX, usernameY, usernameFontSize);

  ctx.font = '30px InstagramBold';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const statY = 210;
  const postinganX = 260;
  const pengikutX = 550;
  const mengikutiX = 850;

  ctx.fillText(postingan.toString(), postinganX, statY);
  ctx.fillText(pengikut.toString(), pengikutX, statY);
  ctx.fillText(mengikuti.toString(), mengikutiX, statY);

  const bioX = 35;
  const bioY = 320;
  const bioFontSize = 22;
  const maxBioWidth = 950;

  ctx.font = `${bioFontSize}px InstagramBold`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const bioLines = wrapText(ctx, bio, maxBioWidth, bioFontSize);
  for (let i = 0; i < bioLines.length; i++) {
    await drawTextWithEmojis(ctx, bioLines[i].trim(), bioX, bioY + (i * 30), bioFontSize);
  }

  return canvas.encode('png');
}

// Endpoint POST untuk membuat profil Fake Instagram
router.post('/', upload.single('fileupload'), async (req, res) => {
  try {
    const file = req.file;
    const username = req.body.username?.trim() || 'King Jenn 👑';
    const postingan = req.body.postingan?.trim() || '12';
    const pengikut = req.body.pengikut?.trim() || '1.123';
    const mengikuti = req.body.mengikuti?.trim() || '12';
    const bio = req.body.bio?.trim() || 'Haii.';

    if (!file) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: "Berkas 'fileupload' wajib diunggah!"
      });
    }

    const imageBuffer = await generateFakeIgProfile({
      username,
      postingan,
      pengikut,
      mengikuti,
      bio,
      ppBuffer: file.buffer
    });

    res.setHeader('Content-Type', 'image/png');
    return res.send(imageBuffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat memproses pembuatan profil Fake Instagram",
      error: err.message
    });
  }
});

router.desc = "Membuat gambar tampilan profil Fake Instagram kustom.";
router.paramsConfig = {
  fileupload: {
    type: "file",
    desc: "Berkas gambar foto profil yang akan diunggah"
  },
  username: "contoh: Arulzxd",
  postingan: "contoh: 12",
  pengikut: "contoh: 1.123",
  mengikuti: "contoh: 12",
  bio: "contoh: Haii."
};

router.status = "ready";
router.type = "free";

export default router;
