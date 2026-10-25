import express from 'express';
import axios from 'axios';

const router = express.Router();
const BASE_URL = 'https://igexport.com';

function cleanInstagramUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== 'string') return '';
    const trimmed = inputUrl.trim();
    const match = trimmed.match(/(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[a-zA-Z0-9_-]+)/i);
    return match ? match[1] + '/' : trimmed;
}

function extractShortcode(inputUrl) {
    const match = inputUrl.match(/\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : '';
}

async function fetchFromApi(endpoint, targetUrl) {
    const requestUrl = `${BASE_URL}${endpoint}?url=${encodeURIComponent(targetUrl)}`;
    const response = await axios.get(requestUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': `${BASE_URL}/id/reels-download/`,
            'Origin': BASE_URL,
            'Accept': 'application/json, text/plain, */*'
        },
        timeout: 20000
    });

    return response.data;
}

async function igexportReels(reelUrl) {
    if (!reelUrl || typeof reelUrl !== 'string') {
        throw new Error('URL Reels Instagram harus diisi.');
    }

    const cleanedUrl = cleanInstagramUrl(reelUrl);
    const shortcode = extractShortcode(cleanedUrl);

    if (!shortcode) {
        throw new Error('Format URL tidak valid. Masukkan URL Reels Instagram yang valid (contoh: https://www.instagram.com/reel/xxx/).');
    }

    let apiData = null;

    try {
        apiData = await fetchFromApi('/api/ig-reels/', cleanedUrl);
    } catch (err) {
        try {
            apiData = await fetchFromApi('/api/ig-photo/', cleanedUrl);
        } catch {
            throw new Error(`Gagal mengambil data Reels Instagram: ${err.message}`);
        }
    }

    if (!apiData || !apiData.ok) {
        try {
            apiData = await fetchFromApi('/api/ig-photo/', cleanedUrl);
        } catch {}
    }

    if (!apiData || !apiData.ok) {
        const errorMsg = apiData?.error || 'Reels tidak ditemukan atau akun bersifat privat.';
        throw new Error(`Gagal memproses video Reels: ${errorMsg}`);
    }

    const media = apiData.media;
    let videoUrl = null;
    let thumbnailUrl = null;
    let filename = null;

    if (media?.videoUrl) {
        videoUrl = media.videoUrl;
        thumbnailUrl = media.thumbnailUrl || null;
        filename = media.filename || `igexport-${shortcode}.mp4`;
    } else if (Array.isArray(media?.items) && media.items.length > 0) {
        const videoItem = media.items.find(i => i.type === 'video') || media.items[0];
        videoUrl = videoItem.url;
        thumbnailUrl = videoItem.thumbnailUrl || null;
        filename = videoItem.filename || `igexport-${shortcode}.mp4`;
    }

    if (!videoUrl) {
        throw new Error('Video Reels tidak ditemukan di dalam tautan ini.');
    }

    return {
        shortcode: media?.shortcode || shortcode,
        post_url: cleanedUrl,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        filename
    };
}

router.get('/', async (req, res) => {
    try {
        const url = req.query.url?.trim() || req.query.link?.trim();

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' atau 'link' Instagram Reels valid wajib diisi!"
            });
        }

        const data = await igexportReels(url);

        return res.json({
            status: true,
            creator: "Vellzyy",
            result: data
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message || "Internal Server Error saat mengunduh Reels Instagram"
        });
    }
});

router.desc = "Downloader Instagram Reels via IGExport Scraper.";
router.paramsConfig = {
    url: "contoh: https://www.instagram.com/reel/DbLQHTRzdPm/"
};
router.status = "ready";
router.type = "free";

export default router;
