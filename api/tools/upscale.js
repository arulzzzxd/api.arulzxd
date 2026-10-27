import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import FormData from 'form-data';
import multer from 'multer';

const router = express.Router();
const upload = multer();
const validScales = ['2', '4'];

const SERVERS = [
  "api1g", "api2g", "api3g", "api8g", "api9g", "api10g", "api11g",
  "api12g", "api13g", "api14g", "api15g", "api16g", "api17g", "api18g",
  "api19g", "api20g", "api21g", "api22g", "api24g", "api25g"
];

const TASK = "r68zl88mq72xq94j2d5p66bn2z9lrbx20njsbw2qsAvgmzr11lvfhAx9kl87pp6yqgx7c8vg7sfbqnrr42qb16v0gj8jl5s0kq1kgp26mdyjjspd8c5A2wk8b4Adbm6vf5tpwbqlqdr8A9tfn7vbqvy28ylphlxdl379psxpd8r70nzs3sk1";

async function getToken() {
  const html = await axios.get("https://www.iloveimg.com/upscale-image");
  const $ = cheerio.load(html.data);

  const script = $("script")
    .filter((_, el) => $(el).html()?.includes("ilovepdfConfig ="))
    .html();
  if (!script) throw new Error("Config iLoveIMG tidak ditemukan");

  const jsonStr = script.split("ilovepdfConfig = ")[1].split(";")[0];
  const json = JSON.parse(jsonStr);
  const csrf = $('meta[name="csrf-token"]').attr("content");

  if (!json?.token || !csrf) throw new Error("Token/CSRF iLoveIMG gagal diambil");
  return { token: json.token, csrf };
}

async function uploadImage(server, headers, buffer, task, fileName = "image.jpg") {
  const form = new FormData();
  form.append("name", fileName);
  form.append("chunk", "0");
  form.append("chunks", "1");
  form.append("task", task);
  form.append("preview", "1");
  form.append("file", buffer, fileName);

  const res = await axios.post(`https://${server}.iloveimg.com/v1/upload`, form, {
    headers: { ...headers, ...form.getHeaders() }
  });
  return res.data;
}

async function imageHD(buffer, fileName = "image.jpg", scale = "4") {
  const { token, csrf } = await getToken();
  const server = SERVERS[Math.floor(Math.random() * SERVERS.length)];

  const headers = {
    Authorization: "Bearer " + token,
    Origin: "https://www.iloveimg.com/",
    Cookie: "_csrf=" + csrf,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  const uploadRes = await uploadImage(server, headers, buffer, TASK, fileName);

  const form = new FormData();
  form.append("task", TASK);
  form.append("server_filename", uploadRes.server_filename);
  form.append("scale", scale);

  const res = await axios.post(`https://${server}.iloveimg.com/v1/upscale`, form, {
    headers: { ...headers, ...form.getHeaders() },
    responseType: "arraybuffer"
  });

  return res.data;
}

// Endpoint POST untuk mengunggah dan meningkatkan kualitas gambar
router.post('/', upload.single('fileupload'), async (req, res) => {
    try {
        const file = req.file;
        const scaleParam = req.body.scale?.toString().trim() || '4';

        if (!file) {
            return res.status(400).json({
                status: false,
                creator: "Arulzxd",
                message: "Berkas 'fileupload' wajib diunggah!"
            });
        }

        if (!validScales.includes(scaleParam)) {
            return res.status(400).json({
                status: false,
                creator: "Arulzxd",
                message: `Scale tidak valid! Gunakan salah satu opsi: ${validScales.join(', ')}`
            });
        }

        // Jalankan proses upscale menggunakan iLoveIMG
        const imageBuffer = await imageHD(file.buffer, file.originalname, scaleParam);

        res.setHeader('Content-Type', file.mimetype || 'image/jpeg');
        return res.send(Buffer.from(imageBuffer));

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: "Arulzxd",
            message: "Internal Server Error saat memproses perbesaran gambar",
            error: err.message
        });
    }
});

router.desc = "Meningkatkan resolusi dan memperjelas gambar secara otomatis.";
router.paramsConfig = {
    fileupload: {
        type: "file",
        desc: "Berkas gambar yang akan di-upscale"
    },
    scale: {
        type: "select",
        options: ["2", "4"]
    }
};

router.status = "ready";
router.type = "free";

export default router;
