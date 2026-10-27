import express from 'express';
import axios from 'axios';
import multer from 'multer';

const router = express.Router();
const upload = multer();

const UA = "Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0";

async function removeBackground(buffer, filename = 'image.jpg', mimetype = 'image/jpeg') {
  // Convert buffer ke format base64 data URI
  const encodedImage = `data:${mimetype};base64,${buffer.toString('base64')}`;

  const response = await axios.post(
    'https://background-remover.com/removeImageBackground',
    {
      encodedImage,
      title: filename,
      mimeType: mimetype
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
        'Referer': 'https://background-remover.com/upload',
        'Accept': '*/*',
        'Origin': 'https://background-remover.com'
      },
      responseType: 'arraybuffer' // Untuk mengantisipasi response biner (gambar)
    }
  );

  const contentType = response.headers['content-type'] || '';

  // 1. Jika API mengembalikan gambar biner langsung
  if (contentType.includes('image/')) {
    return {
      type: 'buffer',
      data: Buffer.from(response.data),
      contentType
    };
  }

  // 2. Jika API mengembalikan response JSON
  const jsonString = Buffer.from(response.data).toString('utf-8');
  const jsonRes = JSON.parse(jsonString);

  const resultData =
    jsonRes.encodedImageWithoutBackground ||
    jsonRes.image ||
    jsonRes.resultImage ||
    jsonRes.output ||
    jsonRes.data ||
    jsonRes.result ||
    null;

  if (!resultData) {
    throw new Error('Data gambar tidak ditemukan pada respons server.');
  }

  // Jika hasilnya berupa URL publik
  if (typeof resultData === 'string' && resultData.startsWith('http')) {
    const imgRes = await axios.get(resultData, { responseType: 'arraybuffer' });
    return {
      type: 'buffer',
      data: Buffer.from(imgRes.data),
      contentType: imgRes.headers['content-type'] || 'image/png'
    };
  }

  // Jika hasilnya berupa Base64 string
  if (typeof resultData === 'string') {
    const cleanB64 = resultData.replace(/^data:[^;]+;base64,/, '').trim();
    return {
      type: 'buffer',
      data: Buffer.from(cleanB64, 'base64'),
      contentType: 'image/png'
    };
  }

  throw new Error('Format hasil gambar tidak dikenali.');
}

// Endpoint POST untuk mengunggah file gambar
router.post('/', upload.single('fileupload'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: "Berkas 'fileupload' wajib diunggah!"
      });
    }

    // Jalankan pemrosesan remove background
    const result = await removeBackground(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    res.setHeader('Content-Type', result.contentType || 'image/png');
    return res.send(result.data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat memproses penghapusan latar belakang",
      error: err.message
    });
  }
});

router.desc = "Menghapus latar belakang (background) gambar secara otomatis.";
router.paramsConfig = {
  fileupload: {
    type: "file",
    desc: "Berkas gambar yang akan dihapus latar belakangnya"
  }
};

router.status = "ready";
router.type = "free";

export default router;
