import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const router = express.Router();

async function snack(url) {
  try {
    if (!url || !url.includes("snackvideo.com")) {
      return {
        status: false,
        message: "URL SnackVideo tidak valid"
      };
    }

    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar,
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
        "Origin": "https://dvsnackvideo.com",
        "Referer": "https://dvsnackvideo.com/id/",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    }));

    const { data } = await client.post(
      "https://dvsnackvideo.com/download.php",
      new URLSearchParams({
        url,
        locale: "id",
        type: "video"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const $ = cheerio.load(data);

    const title = $(".video-title").text().trim() || null;
    const thumbnail = $(".thumbnail").attr("src") || null;
    const duration = $(".duration span").text().trim() || null;

    const stats = $(".video-stats span")
      .map((i, el) => $(el).text().trim())
      .get();

    const likes = stats[0] || null;
    const views = stats[1] || null;
    const comments = stats[2] || null;
    const shares = stats[3] || null;

    const downloads = $(".download-btn")
      .map((i, el) => ({
        type: $(el).text().trim() || `download_${i + 1}`,
        url: $(el).attr("data-url") || null
      }))
      .get()
      .filter(v => v.url);

    if (!downloads.length) {
      return {
        status: false,
        message: "Download URL tidak ditemukan"
      };
    }

    return {
      status: true,
      result: {
        title,
        thumbnail,
        duration,
        stats: {
          likes,
          views,
          comments,
          shares
        },
        downloads,
        source: url
      }
    };

  } catch (e) {
    return {
      status: false,
      message: e.message || "Terjadi kesalahan saat memproses SnackVideo."
    };
  }
}

router.get("/", async (req, res) => {
  try {
    const url = req.query.url?.trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: "ArulzXD",
        message: "Masukkan parameter url (contoh: ?url=https://s.snackvideo.com/p/...)"
      });
    }

    const resData = await snack(url);

    if (!resData.status) {
      return res.status(400).json({
        status: false,
        creator: "ArulzXD",
        message: resData.message
      });
    }

    return res.json({
      status: true,
      creator: "ArulzXD",
      result: resData.result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "ArulzXD",
      message: err.message || "Terjadi kesalahan pada server saat memproses unduhan SnackVideo."
    });
  }
});

router.desc = "SnackVideo Downloader untuk mengunduh video dari SnackVideo.";
router.paramsConfig = {
  url: "contoh: https://s.snackvideo.com/p/K7MLcjQa"
};
router.status = "ready";
router.type = "free";

export default router;
