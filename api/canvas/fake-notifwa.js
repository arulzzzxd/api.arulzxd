import express from 'express';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import multer from 'multer';
import moment from 'moment-timezone';

const router = express.Router();
const upload = multer();

const APPLE_EMOJI_JSON_URL = 'https://raw.githubusercontent.com/arulzzzxd/database/refs/heads/main/emoji-apple.json';
let appleEmojiMap = null;
const emojiImageCache = new Map();
const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu;

let isFontLoaded = false;

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
  if (isFontLoaded) return;
  const fonts = [
    { url: 'https://raw.githubusercontent.com/zenzXD/uploader-storage/main/uploads/1783935033044.ttf', name: 'RobotoBold' },
    { url: 'https://raw.githubusercontent.com/zenzXD/uploader-storage/main/uploads/1783935096347.ttf', name: 'RobotoRegular' },
    { url: 'https://raw.githubusercontent.com/zenzXD/uploader-storage/main/uploads/1783935155987.ttf', name: 'SanFrancisco' }
  ];

  for (const font of fonts) {
    const buf = await getBuffer(font.url);
    GlobalFonts.register(buf, font.name);
  }
  isFontLoaded = true;
}

function emojiToUnicode(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join('-');
}

async function loadAppleEmojiMap() {
  if (appleEmojiMap) return appleEmojiMap;
  const buf = await getBuffer(APPLE_EMOJI_JSON_URL);
  appleEmojiMap = JSON.parse(buf.toString('utf-8'));
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

async function drawTextWithEmojis(ctx, text, x, y, fontSize, fontString) {
  ctx.font = fontString;
  const parts = text.split(EMOJI_REGEX);
  let currentX = x;
  for (const part of parts) {
    if (!part) continue;
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(part)) {
      const emojiSize = fontSize * 1.05;
      const emojiCX = currentX + emojiSize / 2;
      const emojiCY = y + (fontSize / 2);
      await drawAppleEmoji(ctx, part, emojiCX, emojiCY, emojiSize);
      currentX += emojiSize;
    } else {
      ctx.fillText(part, currentX, y);
      currentX += ctx.measureText(part).width;
    }
    EMOJI_REGEX.lastIndex = 0;
  }
}

async function fakenotifwa({ ppBuffer, username, chat, tanggal, jam }) {
  await loadAssets();

  const background = 'https://raw.githubusercontent.com/zenzXD/uploader-storage/main/uploads/1783938224798.png';
  const waIconUrl = 'https://raw.githubusercontent.com/zenzXD/uploader-storage/main/uploads/1783937277449.jpeg';

  const [bgBuffer, waIconBuffer] = await Promise.all([
    getBuffer(background),
    getBuffer(waIconUrl)
  ]);

  const bg = await loadImage(bgBuffer);
  const ppImg = await loadImage(ppBuffer);
  const waImg = await loadImage(waIconBuffer);

  const canvas = createCanvas(bg.width, bg.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(bg, 0, 0, bg.width, bg.height);

  const tanggalY = 120;
  ctx.font = '36px "SanFrancisco", sans-serif';
  ctx.fillStyle = '#C5C5C5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(tanggal, bg.width / 2, tanggalY);

  const jamY = 170;
  ctx.font = '160px "SanFrancisco", sans-serif';
  ctx.fillStyle = '#C5C5C5';
  ctx.textAlign = 'center';
  ctx.fillText(jam, bg.width / 2, jamY);

  const ppSize = 77;
  const ppX = 39;
  const ppY = 909;
  drawCircleImg(ctx, ppImg, ppX, ppY, ppSize);

  const waIconSize = 24;
  const waIconX = ppX + ppSize - waIconSize + 2;
  const waIconY = ppY + ppSize - waIconSize + 2;
  drawCircleImg(ctx, waImg, waIconX, waIconY, waIconSize);

  const usernameX = 135;
  const usernameY = 913;
  const usernameFontSize = 26;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  await drawTextWithEmojis(ctx, username, usernameX, usernameY, usernameFontSize, 'bold 26px "RobotoBold", sans-serif');

  const chatX = 135;
  const chatY = 952;
  const chatFontSize = 22;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';
  await drawTextWithEmojis(ctx, chat, chatX, chatY, chatFontSize, '22px "RobotoRegular", sans-serif');

  return canvas.encode('png');
}

router.post('/', upload.single('fileupload'), async (req, res) => {
  try {
    const file = req.file;
    const username = req.body.username?.trim() || 'arulzxd 💫';
    const chat = req.body.chat?.trim() || 'Haii sayangg udah makan belumm? 🥺';

    if (!file) {
      return res.status(400).json({
        status: false,
        creator: 'Arulzxd',
        message: "Berkas 'fileupload' (foto profil) wajib diunggah!"
      });
    }

    // Mengambil waktu dan tanggal otomatis dengan WIB (Asia/Jakarta)
    moment.locale('id');
    const now = moment().tz('Asia/Jakarta');
    const jam = now.format('H.mm');
    const tanggal = now.format('dddd, D MMMM');

    const imageBuffer = await fakenotifwa({
      ppBuffer: file.buffer,
      username,
      chat,
      tanggal,
      jam
    });

    res.setHeader('Content-Type', 'image/png');
    return res.send(Buffer.from(imageBuffer));

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat membuat gambar Fake Notif WhatsApp',
      error: err.message
    });
  }
});

router.desc = "Membuat gambar tampilan notifikasi WhatsApp kustom.";
router.paramsConfig = {
  fileupload: {
    type: "file",
    desc: "Berkas foto profil pengirim notifikasi"
  },
  username: "contoh: ZennzXD 💫",
  chat: "contoh: Haii sayangg udah makan belumm? 🥺"
};

router.status = "ready";
router.type = "free";

export default router;
