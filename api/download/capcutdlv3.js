import express from 'express';
import axios from 'axios';

const router = express.Router();

function extractHashtags(text) {
    if (!text) return [];
    const matches = text.match(/#[\w\u0590-\u05ff]+/gi) || [];
    return [...new Set(matches)];
}

async function scrapeCapcut(inputUrl) {
    try {
        if (!inputUrl || !inputUrl.includes("capcut.com")) {
            return {
                success: false,
                error: "URL CapCut tidak valid (contoh: https://www.capcut.com/tv2/ZSVEwBgtH/ atau https://www.capcut.com/template-detail/...)",
            };
        }

        const response = await axios.get(inputUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            },
            timeout: 15000,
            maxRedirects: 5,
        });

        const html = response.data;
        let templateData = null;
        let loaderObj = null;

        const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
        for (const s of scripts) {
            if (s[1].includes("loaderData")) {
                try {
                    const parsed = JSON.parse(s[1]);
                    loaderObj = parsed.loaderData?.["template-detail_$"] || parsed.loaderData?.["template_detail"];
                    if (loaderObj?.templateDetail) {
                        templateData = loaderObj.templateDetail;
                        break;
                    }
                } catch (_) {}
            }
        }

        if (!templateData) {
            const getRegex = (re) => html.match(re)?.[1]?.replace(/\\u002F/g, "/") ?? "";
            const getNum = (re) => parseInt(html.match(re)?.[1] || "0", 10);

            const videoUrl = getRegex(/"videoUrl":"(.*?)"/);
            if (!videoUrl) {
                return {
                    success: false,
                    error: "Gagal mengekstrak metadata dari URL CapCut.",
                };
            }

            const coverUrl = getRegex(/"coverUrl":"(.*?)"/);
            const title = getRegex(/"title":"(.*?)"/);
            const desc = getRegex(/"desc":"(.*?)"/);
            const templateId = getRegex(/"templateId":"(.*?)"/);
            const width = getNum(/"videoWidth":([0-9]+)/);
            const height = getNum(/"videoHeight":([0-9]+)/);
            const duration = getNum(/"templateDuration":([0-9]+)/);
            const createTime = getNum(/"createTime":([0-9]+)/);

            return {
                success: true,
                data: {
                    id: templateId,
                    title: title || "CapCut Template",
                    description: desc,
                    hashtags: extractHashtags(desc),
                    coverUrl,
                    videoUrl,
                    videoWidth: width,
                    videoHeight: height,
                    videoRatio: width && height ? `${width}:${height}` : "9:16",
                    durationMs: duration,
                    durationSec: Number((duration / 1000).toFixed(2)),
                    segmentCount: getNum(/"segmentAmount":([0-9]+)/),
                    usageCount: getNum(/"usageAmount":([0-9]+)/),
                    likeCount: getNum(/"likeAmount":([0-9]+)/) || getNum(/"likeCount":([0-9]+)/),
                    playCount: getNum(/"playAmount":([0-9]+)/) || getNum(/"playAmount":([0-9]+)/),
                    commentCount: getNum(/"commentAmount":([0-9]+)/),
                    createdAt: createTime ? new Date(createTime * 1000).toISOString() : "",
                    createdTimestamp: createTime,
                    capabilities: [],
                    author: {
                        name: getRegex(/"author":\{.*?"name":"(.*?)"/),
                        avatarUrl: getRegex(/"avatarUrl":"(.*?)"/),
                    },
                    originalUrl: inputUrl,
                },
            };
        }

        const createTime = Number(templateData.createTime || 0);
        const duration = Number(templateData.templateDuration || 0);

        const rawRecommend = Array.isArray(loaderObj?.recommendList) ? loaderObj.recommendList : [];
        const recommendList = rawRecommend.map((item) => {
            const itemCreateTime = Number(item.createTime || 0);

            const hasAuthor = Boolean(item.author?.name || item.author?.avatarUrl || item.author?.secUid);
            const author = hasAuthor
                ? {
                      name: item.author?.name || undefined,
                      avatarUrl: item.author?.avatarUrl || undefined,
                      description: item.author?.description || undefined,
                      profileUrl: item.author?.profileUrl ? `https://www.capcut.com${item.author.profileUrl}` : undefined,
                      secUid: item.author?.secUid || undefined,
                  }
                : undefined;

            return {
                templateId: String(item.templateId || ""),
                title: item.title || "",
                description: item.desc || "",
                coverUrl: item.coverUrl || "",
                videoUrl: item.videoUrl ? item.videoUrl : undefined,
                usageCount: Number(item.usageAmount || 0),
                likeCount: Number(item.likeAmount || 0),
                createdAt: itemCreateTime ? new Date(itemCreateTime * 1000).toISOString() : undefined,
                createdTimestamp: itemCreateTime || undefined,
                canonicalUrl: item.canonicalPath ? `https://www.capcut.com${item.canonicalPath}` : undefined,
                author,
            };
        });

        const desc = templateData.desc || "";

        const metadata = {
            id: String(templateData.templateId || loaderObj?.templateId || ""),
            title: templateData.title || "",
            description: desc,
            hashtags: extractHashtags(desc),
            tagTitle: templateData.tagTitle || "",
            canonicalUrl: loaderObj?.canonicalPath ? `https://www.capcut.com${loaderObj.canonicalPath}` : (templateData.structuredData?.url || ""),
            originalUrl: inputUrl,
            coverUrl: templateData.coverUrl || "",
            videoUrl: templateData.videoUrl || "",
            videoWidth: Number(templateData.videoWidth || 0),
            videoHeight: Number(templateData.videoHeight || 0),
            videoRatio: templateData.videoRatio || (templateData.videoWidth && templateData.videoHeight ? `${templateData.videoWidth}:${templateData.videoHeight}` : ""),
            durationMs: duration,
            durationSec: Number((duration / 1000).toFixed(2)),
            segmentCount: Number(templateData.segmentAmount || 0),
            usageCount: Number(templateData.usageAmount || 0),
            likeCount: Number(templateData.likeAmount || 0),
            playCount: Number(templateData.playAmount || 0),
            commentCount: Number(templateData.commentAmount || 0),
            createdAt: createTime ? new Date(createTime * 1000).toISOString() : "",
            createdTimestamp: createTime,
            capabilities: Array.isArray(templateData.capabilityName) ? templateData.capabilityName : [],
            ugcLang: templateData.ugcLang || "",
            templateLanguage: templateData.templateLanguage || "",
            itemType: templateData.itemType,
            scene: templateData.scene,
            isValidRegion: templateData.is_valid_template_region ?? loaderObj?.isValidTemplateRegion,
            useAvailable: templateData.useAvailable,
            author: {
                name: templateData.author?.name || "",
                avatarUrl: templateData.author?.avatarUrl || "",
                description: templateData.author?.description || "",
                profileUrl: templateData.author?.profileUrl ? `https://www.capcut.com${templateData.author.profileUrl}` : "",
                secUid: templateData.author?.secUid || "",
                uid: templateData.author?.uid || 0,
            },
            collections: Array.isArray(templateData.collections) ? templateData.collections : [],
            recommendList: recommendList.length > 0 ? recommendList : undefined,
        };

        return {
            success: true,
            data: metadata,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || String(error),
        };
    }
}

router.get('/', async (req, res) => {
    try {
        const url = req.query.url?.trim();

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'ArulzXD',
                message: 'Masukkan parameter url CapCut (contoh: ?url=https://www.capcut.com/tv2/ZSVEwBgtH/)'
            });
        }

        const resData = await scrapeCapcut(url);

        if (!resData.success) {
            return res.status(400).json({
                status: false,
                creator: 'ArulzXD',
                message: resData.error || 'Gagal mengekstrak template CapCut.'
            });
        }

        return res.json({
            status: true,
            creator: 'ArulzXD',
            result: resData.data
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: 'ArulzXD',
            message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan CapCut.'
        });
    }
});

router.desc = "CapCut Scraper & Downloader untuk mengunduh media dan metadata template CapCut.";
router.paramsConfig = {
    url: "contoh: https://www.capcut.com/tv2/ZSVEwBgtH/"
};
router.status = "ready";
router.type = "free";

export default router;
