import express from 'express';
import axios from 'axios';
import FormData from 'form-data';
import multer from 'multer';

const router = express.Router();
const upload = multer();

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36";

async function removebg(buffer, filename, mimetype) {
  const form = new FormData();
  form.append("mode", "general_v2");
  form.append("image_file", buffer, {
    filename: filename || "image.jpg",
    contentType: mimetype || "image/jpeg"
  });

  const createRes = await axios.post(
    "https://api.ezremove.ai/api/ez-remove/v3/background-remove/create-job",
    form,
    {
      headers: {
        ...form.getHeaders(),
        "Product-Serial": "5382f8a0338a3262b3c04d5aa3633396",
        "User-Agent": UA,
        "Referer": "https://ezremove.ai/",
        "Origin": "https://ezremove.ai",
        "Accept": "application/json, text/plain, */*"
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    }
  );

  const jobId = createRes.data?.result?.job_id;
  if (!jobId) {
    throw new Error("Gagal mendapatkan job_id dari server ezremove");
  }

  let attempts = 0;
  const maxAttempts = 30; // Batas percobaan polling (maksimal ~90 detik)

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const statusRes = await axios.get(
      `https://api.ezremove.ai/api/ez-remove/v3/background-remove/get-job/${jobId}`,
      {
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "User-Agent": UA,
          "Referer": "https://ezremove.ai/"
        }
      }
    );

    const jobResult = statusRes.data?.result;

    // Status 2: Selesai / Sukses
    if (jobResult?.status === 2) {
      const outputUrl = jobResult?.output?.preview?.[0];
      if (!outputUrl) throw new Error("URL gambar hasil tidak ditemukan.");
      return outputUrl;
    }

    // Status selain 1 (In Progress) mengindikasikan kegagalan
    if (jobResult?.status !== 1) {
      throw new Error(jobResult?.error || "Proses penghapusan latar belakang gagal di server.");
    }
  }

  throw new Error("Timeout: Pemrosesan menghapus latar belakang memakan waktu terlalu lama.");
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

    // Jalankan fungsi hapus background
    const downloadUrl = await removebg(file.buffer, file.originalname, file.mimetype);

    // Ambil gambar hasil dalam bentuk buffer
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
      message: "Internal Server Error saat memproses penghapusan latar belakang",
      error: err.message
    });
  }
});

router.desc = "Menghapus latar belakang (background) gambar secara otomatis via EzRemove AI.";
router.paramsConfig = {
  fileupload: {
    type: "file",
    desc: "Berkas gambar yang akan dihapus latar belakangnya"
  }
};

router.status = "ready";
router.type = "free";

export default router;
