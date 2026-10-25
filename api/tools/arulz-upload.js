import express from 'express';
import multer from 'multer';

const router = express.Router();

// Batas maksimum ukuran berkas: 4.5 MB
const MAX_SIZE_BYTES = Math.floor(4.5 * 1024 * 1024);

// Konfigurasi Multer (Memory Storage & File Size Limit)
const upload = multer({
    limits: {
        fileSize: MAX_SIZE_BYTES
    }
});

const cpUpload = upload.fields([
    { name: 'file', maxCount: 1 }
]);

router.post('/', (req, res) => {
    cpUpload(req, res, async (err) => {
        // Handle Error khusus batas ukuran file Multer
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    status: false,
                    creator: 'Arulzxd',
                    message: 'Ukuran file terlalu besar. Maksimal 4.5 MB.'
                });
            }
            return res.status(400).json({
                status: false,
                creator: 'Arulzxd',
                message: err.message
            });
        } else if (err) {
            return res.status(500).json({
                status: false,
                creator: 'Arulzxd',
                message: err.message
            });
        }

        try {
            const files = req.files || {};
            const uploadedFile = files.file?.[0];

            if (!uploadedFile || !uploadedFile.buffer) {
                return res.status(400).json({
                    status: false,
                    creator: 'Arulzxd',
                    message: "Berkas 'file' wajib diunggah!"
                });
            }

            // Informasi berkas yang berhasil diterima
            const fileInfo = {
                filename: uploadedFile.originalname,
                mimetype: uploadedFile.mimetype,
                size: `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`,
                sizeBytes: uploadedFile.size,
                uploadedAt: new Date().toISOString()
            };

            return res.json({
                status: true,
                creator: 'Arulzxd',
                message: 'File berhasil diunggah.',
                result: fileInfo
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                creator: 'Arulzxd',
                message: error.message || 'Internal Server Error saat memproses berkas'
            });
        }
    });
});

router.desc = "API Endpoint File Uploader (Maksimal 4.5 MB).";
router.paramsConfig = {
    file: "file berkas yang ingin diunggah (wajib upload, max 4.5 MB)"
};
router.status = "ready";
router.type = "free";

export default router;
