import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();
const TARGET_SITE = "https://fastdl.app";

async function downloadInstagram(instagramUrl) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage"
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, "languages", { get: () => ["id-ID", "id", "en-US", "en"] });
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    });

    try {
        await page.goto(TARGET_SITE, { waitUntil: "networkidle2", timeout: 60000 });
        await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));

        let apiResponse = null;
        let apiResponseRaw = null;

        page.on("response", async (response) => {
            const url = response.url();
            if (url.includes("/api/convert")) {
                try {
                    apiResponseRaw = await response.text();
                    try {
                        apiResponse = JSON.parse(apiResponseRaw);
                    } catch (e) {
                        const jsonMatch = apiResponseRaw.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            apiResponse = JSON.parse(jsonMatch[0]);
                        }
                    }
                } catch (e) {
                    // Ignore parse error
                }
            }
        });

        const inputFound = await page.evaluate((url) => {
            const selectors = [
                'input[type="text"]', 'input[type="url"]',
                'input[name="url"]', 'input[placeholder*="URL"]',
                'input[placeholder*="url"]', 'input[placeholder*="link"]',
                "#url-input", "#url", ".url-input", "form input"
            ];

            let input = null;
            for (const sel of selectors) {
                input = document.querySelector(sel);
                if (input) break;
            }

            if (!input) return false;

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, "value"
            ).set;

            nativeInputValueSetter.call(input, url);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

            return true;
        }, instagramUrl);

        if (!inputFound) {
            throw new Error("Could not find URL input field.");
        }

        await new Promise((r) => setTimeout(r, 1500));

        const btnClicked = await page.evaluate(() => {
            const selectors = [
                'button[type="submit"]', "button.btn",
                ".download-btn", ".btn-download", "form button",
                '[class*="download"]', '[class*="submit"]', '[class*="convert"]'
            ];

            for (const sel of selectors) {
                const btns = document.querySelectorAll(sel);
                for (const btn of btns) {
                    if (btn.offsetParent !== null && btn.textContent.trim().length > 0) {
                        btn.click();
                        return btn.textContent.trim().substring(0, 30);
                    }
                }
            }

            const form = document.querySelector("form");
            if (form) {
                form.dispatchEvent(new Event("submit", { bubbles: true }));
                return "form_submit";
            }

            return null;
        });

        if (!btnClicked) {
            throw new Error("Could not find download button.");
        }

        let waitTime = 0;
        const maxWait = 45000;

        while (!apiResponse && waitTime < maxWait) {
            await new Promise((r) => setTimeout(r, 1000));
            waitTime += 1000;
        }

        if (!apiResponse) {
            throw new Error("API response not captured within timeout.");
        }

        let data = apiResponse;

        if (data?.url && Array.isArray(data.url) && data.url.length > 0) {
            const bestVideo = data.url.reduce((prev, curr) =>
                (curr.quality || 0) > (prev.quality || 0) ? curr : prev
            );

            return {
                original_url: instagramUrl,
                title: data.meta?.title || "Untitled",
                username: data.meta?.username || "unknown",
                shortcode: data.meta?.shortcode || "",
                thumbnail: data.meta?.thumbnail || null,
                download_url: bestVideo.url,
                quality: bestVideo.subname || `${bestVideo.quality}p`,
                type: bestVideo.type || bestVideo.ext || "mp4",
                all_qualities: data.url,
                meta: data.meta
            };
        }

        if (data?.info === -1 || data?.invalid_request) {
            const errorMsg = data.html || data.message || data.code || "Unknown server error";
            throw new Error(`Server rejected: ${String(errorMsg).substring(0, 150)}`);
        }

        throw new Error("Unexpected response format from server");
    } finally {
        await browser.close();
    }
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

        const data = await downloadInstagram(url);

        return res.json({
            status: true,
            creator: "AwasPhpJir",
            result: data
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message || "Internal Server Error saat mengunduh dari FastDL"
        });
    }
});

router.desc = "Downloader Instagram (Reels, Post, Photo, Video) via FastDL Puppeteer Stealth.";
router.paramsConfig = {
    url: "contoh: https://www.instagram.com/reel/Da61UycpjkO/"
};
router.status = "ready";
router.type = "free";

export default router;
