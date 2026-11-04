import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

async function downloadInstagram(targetUrl) {
    try {
        const response = await axios.post('https://iqsaved.com/api/ajaxSearch', new URLSearchParams({
            q: targetUrl,
            t: 'media',
            lang: 'id'
        }), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://iqsaved.com/id/',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 15000
        });

        const html = response.data.data || response.data;
        const $ = cheerio.load(html);

        const username = $('.user-name, a[href*="instagram.com"]').first().text().trim();
        const caption = $('.caption, .desc, p').first().text().trim();

        const mediaList = [];

        $('.download-items, .media-box, div').each((i, el) => {
            const downloadBtn = $(el).find('a.btn-download, a[href*="download"], a:contains("Unduh")');
            const mediaUrl = downloadBtn.attr('href');
            const thumbUrl = $(el).find('img').attr('src');

            if (mediaUrl) {
                mediaList.push({
                    type: mediaUrl.includes('.mp4') ? 'video' : 'photo',
                    url: mediaUrl,
                    thumbnail: thumbUrl || null
                });
            }
        });

        // Filter duplikat URL media jika ada
        const uniqueMedia = mediaList.filter((item, index, self) =>
            index === self.findIndex((t) => t.url === item.url)
        );

        if (!uniqueMedia.length) {
            throw new Error('Media tidak ditemukan atau gagal diproses oleh server target.');
        }

        return {
            username: username || 'Unknown',
            caption: caption || '',
            media: uniqueMedia
        };

    } catch (error) {
        throw new Error(error.message || 'Gagal mengunduh postingan Instagram');
    }
}

router.get('/', async (req, res) => {
    const url = req.query.url?.trim() || req.query.link?.trim();

    if (!url) {
        return res.status(400).json({
            status: false,
            creator: "Arulzxd",
            message: "Parameter 'url' wajib diisi!"
        });
    }

    try {
        const result = await downloadInstagram(url);

        return res.status(200).json({
            status: true,
            creator: "Arulzxd",
            result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: "Arulzxd",
            message: "Internal Server Error saat mengunduh media Instagram",
            error: err.message
        });
    }
});

router.title = "InstagramDl V3";
router.desc = "Mengunduh media (foto/video) dari postingan Instagram.";
router.paramsConfig = {
    url: "text (contoh: https://www.instagram.com/reel/C...)"
};

router.status = "ready";
router.type = "free";

export default router;
