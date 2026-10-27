import express from 'express';
import axios from 'axios';
import crypto from 'node:crypto';
import multer from 'multer';

const router = express.Router();
const upload = multer();

const LOGIN_HASH = 'ab5d684a5cac66c6a7c902dda743fb642827b01b8bd4d9514d46834e4c425ff2';
const API_BASE = 'https://www.imageenlarger.app/api';
const validModes = ['enlarge', 'enhance', 'restore'];

async function getToken() {
  const deviceId = crypto.randomBytes(8).toString('hex');
  const res = await axios.post(
    `${API_BASE}/v2/login`,
    {
      device_name: 'Pixel 7',
      id: deviceId,
      referral: null
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'hash': LOGIN_HASH,
        'User-Agent': 'Mozilla/5.0'
      }
    }
  );

  if (!res.data?.success || !res.data?.data?.token) {
    throw new Error('Gagal mendapatkan token autentikasi.');
  }

  return res.data.data.token;
}

async function processImage(imageBuffer, type, config = {}) {
  const token = await getToken();

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  formData.append('image', blob, 'image.jpg');
  formData.append('type', type);
  formData.append('input', JSON.stringify(config));

  const res = await axios.post(`${API_BASE}/v2/process`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const json = res.data;
  if (!json?.success || !json?.data?.output) {
    throw new Error(`Pemrosesan gagal: ${json?.message || json?.error_code || 'Error tidak diketahui'}`);
  }

  return json.data.output;
}

// Endpoint POST untuk mengunggah file gambar
router.post('/', upload.single('fileupload'), async (req, res) => {
  try {
    const file = req.file;
    const mode = req.body.mode?.toString().toLowerCase().trim() || 'enhance';
    const upscale = parseInt(req.body.scale) || 2;
    const faceEnhance = req.body.faceEnhance === 'true' || req.body.faceEnhance === true;
    const backgroundEnhance = req.body.backgroundEnhance === 'true' || req.body.backgroundEnhance === true;

    if (!file) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: "Berkas 'fileupload' wajib diunggah!"
      });
    }

    if (!validModes.includes(mode)) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: `Mode tidak valid! Gunakan salah satu opsi: ${validModes.join(', ')}`
      });
    }

    let type;
    let config = { upscale };

    if (mode === 'enlarge') {
      type = 'Enlarger';
      config.isFaceEnhanceEnabled = faceEnhance;
    } else if (mode === 'restore') {
      type = 'Restore';
    } else {
      type = 'Enhancer';
      config.isBackgroundEnabled = backgroundEnhance;
    }

    // Jalankan pemrosesan gambar dan dapatkan URL hasilnya
    const downloadUrl = await processImage(file.buffer, type, config);

    // Unduh buffer gambar hasil
    const imageResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer'
    });

    res.setHeader(
      'Content-Type',
      imageResponse.headers['content-type'] || 'image/png'
    );

    return res.send(Buffer.from(imageResponse.data));

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat memproses peningkatan kualitas gambar",
      error: err.message
    });
  }
});

router.desc = "Meningkatkan kualitas, memperbesar resolusi, dan memulihkan detail gambar secara otomatis.";
router.paramsConfig = {
  fileupload: {
    type: "file",
    desc: "Berkas gambar yang akan diproses"
  },
  mode: {
    type: "select",
    options: ["enhance", "enlarge", "restore"]
  },
  scale: {
    type: "select",
    options: ["2", "4"]
  }
};

router.status = "ready";
router.type = "free";

export default router;
