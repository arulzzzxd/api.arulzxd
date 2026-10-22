import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://www.pornhub.com';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

function extractVideoId(input) {
  if (!input) return null;
  const match = input.match(/(?:viewkey=|\/view_video\.php\?viewkey=|^)([a-zA-Z0-9]+)/);
  return match ? match[1] : input.trim();
}

async function resolveGetMedia(getMediaUrl) {
  try {
    const { data } = await axios.get(getMediaUrl, {
      headers: { ...HEADERS, 'Accept': 'application/json' },
      timeout: 10000
    });

    if (Array.isArray(data)) {
      return data;
    } else if (data && data.videoUrl) {
      return [data];
    }
  } catch (e) {
    // Abaikan error resolving media
  }
  return null;
}

async function getPornhubStreams(videoId) {
  try {
    const pageUrl = `${BASE_URL}/view_video.php?viewkey=${videoId}`;
    const { data: html } = await axios.get(pageUrl, {
      headers: { ...HEADERS, 'Accept': 'text/html' },
      timeout: 15000
    });

    const fvMatch = html.match(/var\s+flashvars_\d+\s*=\s*(\{.*?\});/s);
    if (!fvMatch) {
      return {
        status: false,
        message: 'Tidak dapat menemukan data video (video mungkin sudah dihapus/private).'
      };
    }

    let fv;
    try {
      fv = JSON.parse(fvMatch[1]);
    } catch (e) {
      return {
        status: false,
        message: 'Gagal memparsing flashvars metadata video.'
      };
    }

    const title = fv.video_title || videoId;
    const duration = fv.video_duration || 0;
    const is_vr = Boolean(fv.isVR);
    const is_hd = Boolean(fv.isHD);
    const downloads = [];

    let getMediaUrl = null;
    const mediaDefs = fv.mediaDefinitions || [];

    for (const md of mediaDefs) {
      const videoUrl = md.videoUrl || '';
      if (videoUrl.includes('/video/get_media')) {
        getMediaUrl = videoUrl;
        break;
      }
    }

    // Resolusi Direct MP4 Link via get_media API
    if (getMediaUrl) {
      const mediaList = await resolveGetMedia(getMediaUrl);
      if (mediaList) {
        for (const item of mediaList) {
          if (item.videoUrl && item.quality) {
            downloads.push({
              quality: String(item.quality),
              format: 'mp4',
              url: item.videoUrl
            });
          }
        }
      }
    }

    // Backup: Mengambil stream HLS (.m3u8) jika MP4 belum ada
    for (const md of mediaDefs) {
      const videoUrl = md.videoUrl || '';
      const quality = String(md.quality || '');
      const format = md.format || '';

      if (videoUrl && format === 'hls' && videoUrl.includes('.m3u8')) {
        const exists = downloads.some(d => d.quality === quality);
        if (!exists) {
          downloads.push({
            quality: quality,
            format: 'hls',
            url: videoUrl
          });
        }
      }
    }

    // Urutkan kualitas terbaik ke terendah
    downloads.sort((a, b) => {
      const qA = parseInt(a.quality) || 0;
      const qB = parseInt(b.quality) || 0;
      return qB - qA;
    });

    if (!downloads.length) {
      return {
        status: false,
        message: 'Tautan unduhan tidak ditemukan untuk video ini.'
      };
    }

    return {
      status: true,
      result: {
        video_id: videoId,
        title,
        duration: `${duration}s`,
        is_hd,
        is_vr,
        downloads
      }
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || 'Terjadi kesalahan saat mengambil stream video.'
    };
  }
}

router.get('/', async (req, res) => {
  try {
    const rawInput = req.query.url || req.query.id || req.query.viewkey;

    if (!rawInput) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: "Masukkan parameter 'url', 'id', atau 'viewkey' (contoh: ?id=ph638...)"
      });
    }

    const videoId = extractVideoId(rawInput);
    const resData = await getPornhubStreams(videoId);

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
      result: resData.result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan.'
    });
  }
});

router.desc = "Pornhub Video Downloader & Stream Link Extractor.";
router.paramsConfig = {
  id: "contoh: ph638..."
};
router.status = "ready";
router.type = "free";

export default router;
