import express from "express";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const router = express.Router();
const BASE_URL = "https://igexport.com";

function getEndpointByUrl(url) {
    const lowerUrl = url.toLowerCase();
    if (
        lowerUrl.includes("/reel/") ||
        lowerUrl.includes("/tv/") ||
        lowerUrl.includes("/stories/")
    ) {
        return "/api/ig-reels";
    }
    return "/api/ig-photo";
}

async function scrapeIGExportSmart(igUrl, retries = 3) {
    const jar = new CookieJar();
    const client = wrapper(
        axios.create({
            baseURL: BASE_URL,
            jar: jar,
            timeout: 180000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
                Referer: `${BASE_URL}/id/video-download/`,
                Accept: "application/json, text/plain, */*",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin"
            }
        })
    );

    const endpoint = getEndpointByUrl(igUrl);

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (attempt > 1) {
                const waitTime = attempt * 5000;
                await new Promise((r) => setTimeout(r, waitTime));
            }

            // Ambil session cookie
            await client.get("/id/video-download/");

            // Request data downloader
            const response = await client.get(endpoint, {
                params: { url: igUrl }
            });

            const serverData = response.data;
            if (!serverData) throw new Error("Empty response from server");

            return {
                status: serverData.ok ? "success" : "error",
                source: "igexport.com",
                detected_type:
                    endpoint === "/api/ig-reels" ? "video/reel" : "photo/post",
                raw_response: serverData,
                metadata: {
                    requested_url: igUrl,
                    timestamp: new Date().toISOString(),
                    attempt: attempt
                }
            };
        } catch (error) {
            const isServerError =
                error.response && [502, 504, 503].includes(error.response.status);

            if (isServerError && attempt < retries) {
                continue;
            }

            if (error.response) {
                return {
                    status: "error",
                    source: "igexport.com",
                    http_status: error.response.status,
                    raw_response: error.response.data,
                    metadata: { requested_url: igUrl, attempts_made: attempt }
                };
            }

            if (attempt === retries) {
                throw error;
            }
        }
    }

    return null;
}

router.get("/", async (req, res) => {
    try {
        const url = req.query.url?.trim() || req.query.link?.trim();

        if (!url || !url.includes("instagram.com")) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' atau 'link' Instagram valid wajib diisi!"
            });
        }

        const result = await scrapeIGExportSmart(url);

        if (!result) {
            return res.status(500).json({
                status: false,
                message: "Gagal mengambil data dari server IGExport (Attempt Exhausted)."
            });
        }

        return res.json({
            status: true,
            creator: "Arulzxd",
            result: result
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message || "Internal Server Error"
        });
    }
});

router.desc = "Scraper Downloader Instagram (Video, Reel, Photo, Story, Post).";
router.paramsConfig = {
    url: "contoh: https://www.instagram.com/reel/Cxxxxxx/"
};
router.status = "ready";
router.type = "free";

export default router;
