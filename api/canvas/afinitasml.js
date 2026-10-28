import express from 'express';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';
import multer from 'multer';

const router = express.Router();
const upload = multer();

const backgrounds = [
  "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772225640136.png",
  "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772225645439.png",
  "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772225653904.png",
  "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772225659927.png",
  "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772225664898.png",
  "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772821724016.png"
];

async function generateAfinitasCard(userBuffer, bgIndex = 0) {
  // 1. Ambil gambar latar belakang dan bingkai avatar
  const [bgRes, borderRes] = await Promise.all([
    axios.get(backgrounds[bgIndex], { responseType: "arraybuffer" }),
    axios.get("https://c.termai.cc/i128/BOc3D5a.png", { responseType: "arraybuffer" })
  ]);

  const userImage = await loadImage(userBuffer);
  const bg = await loadImage(Buffer.from(bgRes.data));
  const avatarBorder = await loadImage(Buffer.from(borderRes.data));

  // 2. Inisialisasi Canvas
  const canvas = createCanvas(bg.width, bg.height);
  const ctx = canvas.getContext("2d");

  // Gambar Latar Belakang
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  // 3. Konfigurasi Posisi dan Pemotongan Avatar (Center Crop)
  const frame = { x: 444, y: 847, w: 205, h: 205 };
  const avatarSize = 300;

  const avatarX = frame.x + (frame.w - avatarSize) / 2;
  const avatarY = frame.y + (frame.h - avatarSize) / 2;

  const minSide = Math.min(userImage.width, userImage.height);
  const cropX = (userImage.width - minSide) / 2;
  const cropY = (userImage.height - minSide) / 2;

  // Gambar Avatar Pengguna
  ctx.drawImage(
    userImage,
    cropX,
    cropY,
    minSide,
    minSide,
    avatarX,
    avatarY,
    avatarSize,
    avatarSize
  );

  // 4. Gambar Bingkai Avatar
  const pad = 55;
  ctx.drawImage(
    avatarBorder,
    avatarX - pad,
    avatarY - pad,
    avatarSize + pad * 2,
    avatarSize + pad * 2
  );

  return canvas.encode("png");
}

// Endpoint POST untuk membuat gambar Afinitas ML
router.post('/', upload.single('fileupload'), async (req, res) => {
  try {
    const file = req.file;
    const bgParam = parseInt(req.body.bg) || 1; // Default ke background 1

    if (!file) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: "Berkas 'fileupload' wajib diunggah!"
      });
    }

    if (bgParam < 1 || bgParam > backgrounds.length) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: `Pilihan background tidak valid! Gunakan angka antara 1 sampai ${backgrounds.length}.`
      });
    }

    const bgIndex = bgParam - 1;
    const imageBuffer = await generateAfinitasCard(file.buffer, bgIndex);

    res.setHeader('Content-Type', 'image/png');
    return res.send(imageBuffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat memproses pembuat gambar Afinitas ML",
      error: err.message
    });
  }
});

router.desc = "Membuat kartu afinitas Mobile Legends kustom berdasarkan foto yang diunggah.";
router.paramsConfig = {
  fileupload: {
    type: "file",
    desc: "Berkas gambar yang akan diletakkan pada kartu"
  },
  bg: {
    type: "select",
    options: ["1", "2", "3", "4", "5", "6"],
    default: "1"
  }
};

router.status = "ready";
router.type = "free";

export default router;
