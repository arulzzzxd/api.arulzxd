import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();
const upload = multer();

const API_UPLOAD_URL = "https://api.arulzzxd.my.id/uploader";
const MAX_SIZE_MB = 4.5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const cpUpload = upload.fields([
    { name: 'file', maxCount: 1 }
]);

router.post('/', cpUpload, async (req, res) => {
    try {
        const files = req.files || {};
        const fileInput = files.file?.[0];

        // 1. Validasi Keberadaan File
        if (!fileInput || !fileInput.buffer) {
            return res.status(400).json({
                status: false,
                message: "Berkas 'file' wajib diunggah!"
            });
        }

        // 2. Validasi Ukuran File (Maksimal 4.5 MB)
        if (fileInput.size > MAX_SIZE_BYTES) {
            return res.status(400).json({
                status: false,
                message: `Ukuran file terlalu besar (${(fileInput.size / (1024 * 1024)).toFixed(2)} MB). Maksimal ${MAX_SIZE_MB} MB.`
            });
        }

        // 3. Menyiapkan Form Data langsung dari Memory Buffer
        const formData = new FormData();
        formData.append('file', fileInput.buffer, {
            filename: fileInput.originalname || `upload-${Date.now()}`,
            contentType: fileInput.mimetype
        });

        // 4. Proses Upload via Request POST
        const response = await axios.post(API_UPLOAD_URL, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        // 5. Mengembalikan Respons dari Uploader API
        return res.json({
            status: true,
            creator: "Arulzxd",
            result: response.data
        });

    } catch (err) {
        if (err.response) {
            return res.status(err.response.status || 500).json({
                status: false,
                message: `Gagal upload. HTTP Error ${err.response.status}`,
                error: err.response.data
            });
        }
        return res.status(500).json({
            status: false,
            message: err.message || "Terjadi kesalahan sistem saat mengunggah file"
        });
    }
});

router.desc = "Uploader berkas ke CDN (Maksimal 4.5 MB).";
router.paramsConfig = {
    file: "file berkas media/dokumen (wajib upload)"
};
router.status = "ready";
router.type = "free";

export default router;
