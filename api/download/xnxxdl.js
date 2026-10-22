import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

// ======================================================
// UTILITY / HELPER FUNCTIONS
// ======================================================

function parseFileSize(size) {
    return parseFloat(size) * (/GB/i.test(size)
        ? 1000000
        : /MB/i.test(size)
            ? 1000
            : /KB/i.test(size)
                ? 1
                : /bytes?/i.test(size)
                    ? 0.001
                    : /B/i.test(size)
                        ? 0.1
                        : 0);
}

async function getFileSize(downloadLink) {
    if (!downloadLink) return '0';
    try {
        const response = await axios.head(downloadLink, { timeout: 5000 });
        const contentLength = response.headers['content-length'];

        if (contentLength) {
            const fileSizeInBytes = parseInt(contentLength);

            if (fileSizeInBytes < 1024) {
                return `${fileSizeInBytes} bytes`;
            } else if (fileSizeInBytes < 1024 * 1024) {
                const fileSizeInKb = fileSizeInBytes / 1024;
                return `${fileSizeInKb.toFixed(2)} KB`;
            } else if (fileSizeInBytes < 1024 * 1024 * 1024) {
                const fileSizeInMb = fileSizeInBytes / (1024 * 1024);
                return `${fileSizeInMb.toFixed(2)} MB`;
            } else {
                const fileSizeInGb = fileSizeInBytes / (1024 * 1024 * 1024);
                return `${fileSizeInGb.toFixed(2)} GB`;
            }
        }
        return '0';
    } catch {
        return '0';
    }
}

function parseISO8601(durationString) {
    if (!durationString) return 0;
    const matches = durationString.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
    if (!matches) return 0;
    const hours = parseInt(matches[1] || 0);
    const minutes = parseInt(matches[2] || 0);
    const seconds = parseInt(matches[3] || 0);
    return (hours * 3600) + (minutes * 60) + seconds;
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// ======================================================
// CORE XNXX DOWNLOADER FUNCTION
// ======================================================
async function xnxxdl(URL) {
    try {
        const response = await axios.get(URL);
        const $ = cheerio.load(response.data);

        const title = $('meta[property="og:title"]').attr('content');
        const thumb = $('meta[property="og:image"]').attr('content');
        const videoScript = $('#video-player-bg > script:nth-child(6)').html() || '';

        let durationSec = 0;

        try {
            const jsonLdText = $('script[type="application/ld+json"]').html();
            if (jsonLdText) {
                const jsonData = JSON.parse(jsonLdText);
                const videoObj = Array.isArray(jsonData) 
                    ? jsonData.find(x => x['@type'] === 'VideoObject') 
                    : (jsonData['@type'] === 'VideoObject' ? jsonData : null);
                
                const isoDuration = videoObj?.duration || jsonData?.duration;
                if (isoDuration) {
                    durationSec = parseISO8601(isoDuration);
                }
            }
        } catch (e) {}

        if (durationSec === 0) {
            const metaObj = $('meta[property="video:duration"]').attr('content') \vert{}\vert{} $('meta[itemprop="duration"]').attr('content');
            if (metaObj) {
                if (/^\d+$/.test(metaObj)) {
                    durationSec = parseInt(metaObj);
                } else if (/^PT/i.test(metaObj)) {
                    durationSec = parseISO8601(metaObj);
                }
            }
        }

        if (durationSec === 0) {
            const metadataText = $("span.metadata").text();
            const hMatch = metadataText.match(/(\d+)\s*h/i);
            const mMatch = metadataText.match(/(\d+)\s*min/i);
            const sMatch = metadataText.match(/(\d+)\s*sec/i);
            
            if (hMatch) durationSec += parseInt(hMatch[1]) * 3600;
            if (mMatch) durationSec += parseInt(mMatch[1]) * 60;
            if (sMatch) durationSec += parseInt(sMatch[1]);
        }
        
        const duration = formatDuration(durationSec);

        const metadataTextClean = $("span.metadata").text().replace(/\s+/g, " ").trim();
        const qMatch = metadataTextClean.match(/(\d+p|HD|SD)/i);
        const quality = qMatch ? qMatch[1] : "SD";

        const url_low = (videoScript.match(/html5player\.setVideoUrlLow\('([^']+)'\)/) || [])[1] || '';
        const url_high = (videoScript.match(/html5player\.setVideoUrlHigh\('([^']+)'\)/) || [])[1] || '';
        const url_hsl = (videoScript.match(/html5player\.setVideoHLS\('([^']+)'\)/) || [])[1] || '';

        const [size_low, size_high] = await Promise.all([
            getFileSize(url_low),
            getFileSize(url_high)
        ]);

        return {
            title,
            duration,
            quality,
            thumb,
            downloads: {
                low: {
                    url: url_low,
                    size: size_low,
                    sizeB: parseFileSize(size_low)
                },
                high: {
                    url: url_high,
                    size: size_high,
                    sizeB: parseFileSize(size_high)
                },
                hsl: {
                    url: url_hsl,
                    size: "Variable (Streaming)",
                    sizeB: 0
                }
            }
        };
    } catch (error) {
        throw error;
    }
}

// ======================================================
// ENDPOINT GET UTAMA
// ======================================================
router.get('/', async (req, res) => {
    const url = req.query.url;
    
    if (!url) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'url' wajib diisi! Contoh: ?url=https://www.xnxx.com/video-xxxxxx/..."
        });
    }

    try {
        const result = await xnxxdl(url);

        return res.status(200).json({
            status: true,
            creator: 'Arulzxd',
            result,
            metadata: {
                source: 'XNXX Downloader',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: 'Gagal mengambil data video XNXX',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.desc = "XNXX Video Downloader untuk mengunduh video multi-resolusi (Low, High, HLS).";
router.paramsConfig = {
    url: "contoh: https://www.xnxx.com/video-xxxxxx/..."
};
router.status = "ready"; 
router.type = "premium";

export default router;
