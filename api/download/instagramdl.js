import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

const BASE_URL = "https://saveinta.com";
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  Referer: `${BASE_URL}/en`,
  Origin: BASE_URL,
};

function decodeSnapTokenUrl(urlWithToken) {
  if (!urlWithToken || typeof urlWithToken !== "string") return urlWithToken;
  try {
    const match = urlWithToken.match(/token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/);
    if (!match || !match[1]) return urlWithToken;

    const payloadPart = match[1].split(".")[1];
    let base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const decoded = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    if (decoded && decoded.url) {
      return decoded.url;
    }
  } catch {}
  return urlWithToken;
}

function unpackSaveIntaJs(packedJs) {
  if (!packedJs || typeof packedJs !== "string") return "";
  try {
    const executable = packedJs.replace(/eval\s*\(/, "return (");
    const fn = new Function(executable);
    return fn();
  } catch (err) {
    throw new Error(`Gagal mendecode payload JavaScript SaveInta: ${err.message}`);
  }
}

async function saveintaScraper(instagramUrl) {
  const cleanUrl = String(instagramUrl || "").trim();
  if (!cleanUrl) {
    return {
      status: false,
      message: "Parameter URL Instagram wajib diisi.",
    };
  }

  if (!/instagram\.com\/(?:p|reel|reels|tv|share)\/[A-Za-z0-9_-]+/i.test(cleanUrl)) {
    return {
      status: false,
      message: "URL tidak valid. Pastikan link berasal dari Instagram (post, reel, tv, atau share).",
    };
  }

  const pageRes = await axios.get(`${BASE_URL}/en`, {
    headers: DEFAULT_HEADERS,
    timeout: 10000,
  });

  const pageHtml = pageRes.data;
  const k_exp = pageHtml.match(/k_exp\s*=\s*["\x27]([^"\x27]+)["\x27]/)?.[1];
  const k_token = pageHtml.match(/k_token\s*=\s*["\x27]([^"\x27]+)["\x27]/)?.[1];

  if (!k_exp || !k_token) {
    throw new Error("Gagal mengekstraksi token otorisasi dari SaveInta.");
  }

  let cftoken = "";
  try {
    const verifyRes = await axios.post(
      `${BASE_URL}/api/userverify`,
      new URLSearchParams({ url: cleanUrl }).toString(),
      {
        headers: {
          ...DEFAULT_HEADERS,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        timeout: 10000,
      }
    );
    if (verifyRes.data?.token) {
      cftoken = verifyRes.data.token;
    }
  } catch {}

  const searchPayload = new URLSearchParams({
    k_exp,
    k_token,
    q: cleanUrl,
    t: "media",
    lang: "en",
    v: "v2",
    cftoken,
  });

  const searchRes = await axios.post(
    `${BASE_URL}/api/ajaxSearch`,
    searchPayload.toString(),
    {
      headers: {
        ...DEFAULT_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      timeout: 15000,
    }
  );

  const resJson = searchRes.data;
  if (!resJson || resJson.status !== "ok") {
    return {
      status: false,
      message: resJson?.mess || "Gagal memproses media Instagram. Cek apakah link privat atau dihapus.",
    };
  }

  if (resJson.mess) {
    const cleanMess = cheerio.load(resJson.mess).text().trim();
    return {
      status: false,
      message: cleanMess || "Media Instagram bersifat privat atau tidak ditemukan.",
    };
  }

  const rawJs = resJson.data;
  if (!rawJs) {
    throw new Error("Respon data kosong dari server SaveInta.");
  }

  const unpackedScript = unpackSaveIntaJs(rawJs);

  const htmlMatch = unpackedScript.match(/innerHTML\s*=\s*"((?:[^"\\]|\\.)*)"/);
  if (!htmlMatch || !htmlMatch[1]) {
    throw new Error("Gagal mengekstraksi blok HTML media hasil pencarian.");
  }

  const rawHtml = JSON.parse(`"${htmlMatch[1]}"`);
  const $ = cheerio.load(rawHtml);

  const mediaList = [];

  $(".download-items").each((_, itemEl) => {
    const item = $(itemEl);
    const rawThumb = item.find(".download-items__thumb img").attr("src") || "";
    const downloadBtn = item.find("a.btn-download, a[href*='token=']");
    const rawDownloadUrl = downloadBtn.attr("href") || "";
    const title = downloadBtn.text().trim() || item.find("h3").text().trim() || "Download Media";

    const directDownload = decodeSnapTokenUrl(rawDownloadUrl);
    const directThumb = decodeSnapTokenUrl(rawThumb);

    const isVideo =
      title.toLowerCase().includes("video") ||
      rawDownloadUrl.includes(".mp4") ||
      directDownload.includes(".mp4");

    mediaList.push({
      type: isVideo ? "video" : "photo",
      title,
      thumbnail: directThumb,
      download_url: directDownload,
      proxy_url: rawDownloadUrl || null,
    });
  });

  if (mediaList.length === 0) {
    return {
      status: false,
      message: "Tidak ada tautan media yang berhasil diekstraksi.",
    };
  }

  return {
    status: true,
    data: {
      url: cleanUrl,
      count: mediaList.length,
      media: mediaList,
    },
  };
}

router.get('/', async (req, res) => {
  const url = req.body?.url || req.query?.url;

  if (!url) {
    return res.status(400).json({
      status: false,
      creator: "Arulzxd",
      message: "Parameter 'url' (Link Instagram) wajib diisi!"
    });
  }

  try {
    const result = await saveintaScraper(url);
    if (!result.status) {
      return res.status(400).json({
        status: false,
        creator: "Arulzxd",
        message: result.message
      });
    }

    return res.json({
      status: true,
      creator: "Arulzxd",
      result: result.data
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: err.message || "Internal Server Error saat scraping SaveInta."
    });
  }
});

router.paramsConfig = {
  url "contoh: https://www.instagram.com/reel/..."
};

router.desc = "Downloader Media Instagram (Reels/Post/Carousel.";
router.status = "ready";
router.type = "free";

export default router;
