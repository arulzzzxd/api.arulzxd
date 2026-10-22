import express from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = express.Router();

function generateToken(timestamp) {
    const salt = "T9do@SM1?xGn5";
    const path = "/api/stream.php";
    const stringToHash = salt + timestamp + path;

    return crypto.createHash('md5').update(stringToHash).digest('hex');
}

async function fetchPlayTerabox(teraboxUrl) {
    const timestamp = Math.floor(Date.now() / 1000);
    const token = generateToken(timestamp);
    const endpoint = `https://playterabox.com/api/fetch-video?token=${token}&t=${timestamp}`;
    const payload = {
        url: teraboxUrl
    };

    const headers = {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Origin': 'https://playterabox.com',
        'Referer': 'https://playterabox.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        const { data } = await axios.post(endpoint, payload, { headers, timeout: 30000 });

        if (data && data.status === 'success') {
            return {
                status: true,
                totalFiles: data.total_files,
                totalFolders: data.total_folders,
                files: data.list.map(file => ({
                    name: file.name,
                    size: file.size_formatted,
                    sizeBytes: file.size,
                    duration: file.duration,
                    quality: file.quality,
                    thumbnail: file.thumbnail,
                    downloadLink: file.download_link,
                    normalDlink: file.normal_dlink,
                    fastStreamUrl: file.fast_stream_url,
                    subtitleUrl: file.subtitle_url
                }))
            };
        }

        return {
            status: false,
            message: data?.message || 'Gagal mengekstrak file.'
        };
    } catch (error) {
        if (error.response) {
            return { 
                status: false, 
                message: `API Error (${error.response.status}): ${JSON.stringify(error.response.data)}` 
            };
        }
        return { status: false, message: error.message };
    }
}

router.get('/', async (req, res) => {
    try {
        const url = req.query.url?.trim();

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'ArulzXD',
                message: 'Masukkan parameter url (contoh: ?url=https://1024terabox.com/s/...)'
            });
        }

        const resData = await fetchPlayTerabox(url);

        if (!resData.status) {
            return res.status(400).json({
                status: false,
                creator: 'ArulzXD',
                message: resData.message
            });
        }

        return res.json({
            status: true,
            creator: 'ArulzXD',
            result: {
                totalFiles: resData.totalFiles,
                totalFolders: resData.totalFolders,
                files: resData.files
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: 'ArulzXD',
            message: err.message || 'Terjadi kesalahan pada server saat memproses tautan TeraBox.'
        });
    }
});

router.desc = "TeraBox Downloader & Streamer (mendapatkan direct link download & fast stream HD).";
router.paramsConfig = {
    url: "contoh: https://1024terabox.com/s/1k2Qxwebz3yI09kubXBf2xA"
};
router.status = "ready";
router.type = "free";

export default router;
