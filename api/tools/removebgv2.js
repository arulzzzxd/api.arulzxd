import express from 'express';
import axios from 'axios';
import FormData from 'form-data';
import multer from 'multer';

const router = express.Router();
const upload = multer();

const SITE_URL = 'https://www.iloveimg.com/remove-background';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html',
  'Accept-Language': 'en-US,en;q=0.5'
};

async function scrapeSession() {
  const { data: html } = await axios.get(SITE_URL, { headers: HEADERS, timeout: 15000 });
  const token = html.match(/"token"\s*:\s*"([^"]+)"/)?.[1];
  const taskId = html.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1];
  const servers = JSON.parse('[' + (html.match(/"servers"\s*:\s*\[([^\]]+)\]/)?.[1] || '') + ']');
  
  if (!token || !taskId || !servers.length) {
    throw new Error('Gagal scrape session dari iLoveIMG.');
  }
  return { token, taskId, servers };
}

async function uploadImage(token, server, taskId, fileBuffer, fileName, mimeType) {
  const form = new FormData();
  form.append('task', taskId);
  form.append('file', fileBuffer, {
    filename: fileName || 'image.jpg',
    contentType: mimeType || 'image/jpeg'
  });

  const sUrl = `https://${server}.ilovepdf.com`;
  const { data } = await axios.post(`${sUrl}/v1/upload`, form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://www.iloveimg.com',
      'Referer': SITE_URL
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 60000
  });

  return { sf: data.server_filename, sUrl };
}

async function doProcess(token, sUrl, taskId, sf, name) {
  const { data } = await axios.post(
    `${sUrl}/v1/process`,
    {
      task: taskId,
      tool: 'removebackgroundimage',
      files: [{ server_filename: sf, filename: name }],
      output_type: 'png'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://www.iloveimg.com',
        'Referer': SITE_URL
      },
      timeout: 60000
    }
  );
  return data;
}

async function downloadImage(token, sUrl, taskId) {
  const { data } = await axios.get(`${sUrl}/v1/download/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://www.iloveimg.com',
      'Referer': SITE_URL
    },
    responseType: 'arraybuffer',
    timeout: 60000
  });

  return Buffer.from(data);
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

    // 1. Dapatkan Token, TaskID, dan Daftar Server
    const session = await scrapeSession();
    
    // Pilih server acak dari daftar server yang tersedia
    const selectedServer = session.servers[Math.floor(Math.random() * session.servers.length)];

    // 2. Unggah berkas gambar dari Memory Storage Buffer
    const { sf, sUrl } = await uploadImage(
      session.token,
      selectedServer,
      session.taskId,
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // 3. Jalankan pemrosesan penghapusan latar belakang
    await doProcess(
      session.token,
      sUrl,
      session.taskId,
      sf,
      file.originalname || 'image.jpg'
    );

    // 4. Unduh hasil berupa buffer gambar PNG
    const imageBuffer = await downloadImage(
      session.token,
      sUrl,
      session.taskId
    );

    res.setHeader('Content-Type', 'image/png');
    return res.send(imageBuffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat memproses penghapusan latar belakang gambar",
      error: err.message
    });
  }
});

router.desc = "Menghapus latar belakang (background) gambar secara otomatis via iLoveIMG.";
router.paramsConfig = {
  fileupload: {
    type: "file",
    desc: "Berkas gambar yang akan dihapus latar belakangnya"
  }
};

router.status = "ready";
router.type = "free";

export default router;
