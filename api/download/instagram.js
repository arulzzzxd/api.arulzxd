import express from 'express';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const router = express.Router();

const headers = {
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'sec-ch-ua': '"Chromium";v="141", "Not?A_Brand";v="8"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-site': 'none',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-user': '?1',
    'sec-fetch-dest': 'document',
    'upgrade-insecure-requests': '1'
};

function extractShortcode(url) {
    const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
}

function unescapeUrl(url) {
    if (!url) return '';
    return url
        .replace(/\\u0026/g, '&')
        .replace(/\\u00253D/g, '=')
        .replace(/\\\//g, '/');
}

function extractMediaFromHTML(html, shortcode) {
    const marker = `"code":"${shortcode}"`;
    let idx = html.indexOf(marker);
    if (idx === -1) return null;

    const searchBefore = html.lastIndexOf('"xig_polaris_media":', idx);
    if (searchBefore === -1) return null;

    const jsonStart = html.indexOf('{', searchBefore + '"xig_polaris_media":'.length);
    if (jsonStart === -1) return null;

    let depth = 0;
    let end = jsonStart;
    for (let i = jsonStart; i < Math.min(jsonStart + 500000, html.length); i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') {
            depth--;
            if (depth === 0) { end = i + 1; break; }
        }
    }

    try {
        return JSON.parse(html.substring(jsonStart, end));
    } catch {
        return null;
    }
}

function extractTokensFromHTML(html) {
    const csrf = html.match(/"csrf_token":"([^"]+)"/);
    const lsd = html.match(/"LSD",\[\],\{"token":"([^"]+)"/);

    const relayAppId = html.match(/RelayAPIConfigDefaults[^}]*"X-IG-App-ID":"(\d+)"/);
    const appIdField = html.match(/"APP_ID":"(\d+)"/);

    return {
        csrfToken: csrf ? csrf[1] : '',
        lsd: lsd ? lsd[1] : '',
        appId: relayAppId ? relayAppId[1] : (appIdField ? appIdField[1] : '936619743392459')
    };
}

function formatResult(data) {
    const post = data.if_not_gated_logged_out || data;
    const user = post.user || {};
    const caption = post.caption;
    const captionText = caption ? (typeof caption === 'string' ? caption : caption.text || '') : '';

    const typename = post.__typename || '';
    const mediaType = post.media_type;
    const productType = post.product_type || '';

    let type = 'photo';
    if (mediaType === 2 || typename.includes('Video')) type = 'video';
    if (mediaType === 8 || typename.includes('Carousel') || productType === 'carousel_container') type = 'slide';

    const media = [];

    if (type === 'slide' && post.carousel_media) {
        for (const item of post.carousel_media) {
            const isVideo = item.media_type === 2 || (item.__typename || '').includes('Video');
            if (isVideo && item.video_versions?.length) {
                media.push({
                    type: 'video',
                    url: unescapeUrl(item.video_versions[0].url),
                    width: item.video_versions[0].width || item.original_width,
                    height: item.video_versions[0].height || item.original_height
                });
            } else {
                const candidates = (item.image_versions2 || {}).candidates || [];
                const best = candidates[0] || {};
                const url = unescapeUrl(best.url || item.display_uri || '');
                if (url) {
                    media.push({
                        type: 'photo',
                        url,
                        width: best.width || item.original_width,
                        height: best.height || item.original_height
                    });
                }
            }
        }
    } else if (type === 'video') {
        const vv = post.video_versions || [];
        if (vv.length) {
            media.push({
                type: 'video',
                url: unescapeUrl(vv[0].url),
                width: vv[0].width || post.original_width,
                height: vv[0].height || post.original_height
            });
        }
    } else {
        const candidates = (post.image_versions2 || {}).candidates || [];
        const best = candidates[0] || {};
        const url = unescapeUrl(best.url || item?.display_uri || post.display_uri || '');
        if (url) {
            media.push({
                type: 'photo',
                url,
                width: best.width || post.original_width,
                height: best.height || post.original_height
            });
        }
    }

    return {
        type,
        author: {
            username: user.username || '',
            name: user.full_name || '',
            id: user.pk || user.id || '',
            pp: unescapeUrl(user.profile_pic_url || '')
        },
        caption: captionText,
        stats: {
            like: post.like_count || null,
            comments: post.comment_count || null,
            views: post.play_count || post.video_play_count || null,
            duration: post.video_duration || null
        },
        uploadAt: post.taken_at ? new Date(post.taken_at * 1000).toLocaleString('id-ID') : null,
        media: media.length === 1 ? media[0].url : media.map(m => m.url)
    };
}

function formatGraphQLResult(m) {
    const side = m.edge_sidecar_to_children?.edges || [];
    const mediaList = side.length
        ? side.map(x => x.node.video_url || x.node.display_url)
        : m.video_url || m.display_url;

    let type = 'photo';
    if (side.length) type = 'slide';
    else if (m.is_video) type = 'video';

    return {
        type,
        author: {
            username: m.owner?.username || '',
            name: m.owner?.full_name || '',
            id: m.owner?.id || '',
            pp: unescapeUrl(m.owner?.profile_pic_url || '')
        },
        caption: m.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        stats: {
            like: m.edge_media_preview_like?.count || null,
            comments: m.edge_media_preview_comment?.count || null,
            views: m.video_view_count || m.video_play_count || null,
            duration: m.video_duration || null
        },
        media: Array.isArray(mediaList) ? mediaList.map(u => unescapeUrl(u)) : unescapeUrl(mediaList)
    };
}

async function scrapeInstagram(url) {
    const shortcode = extractShortcode(url);
    if (!shortcode) {
        throw new Error('URL tidak valid, harus mengandung /p/, /reel/, atau /tv/');
    }

    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, withCredentials: true }));

    const targetUrl = `https://www.instagram.com/p/${shortcode}/`;
    const pageRes = await client.get(targetUrl, { headers });
    const htmlData = extractMediaFromHTML(pageRes.data, shortcode);

    if (htmlData) {
        return formatResult(htmlData);
    }

    const tokens = extractTokensFromHTML(pageRes.data);
    const cookiesObj = {};
    const cookies = await jar.getCookies(targetUrl);
    cookies.forEach(c => { cookiesObj[c.key] = c.value; });

    const gqlParams = new URLSearchParams({
        doc_id: '8845758582119845',
        variables: JSON.stringify({ shortcode })
    });

    const gqlRes = await client.get(`https://www.instagram.com/graphql/query/?${gqlParams}`, {
        headers: {
            ...headers,
            'x-ig-app-id': tokens.appId,
            'x-csrftoken': tokens.csrfToken || cookiesObj.csrftoken || '',
            'x-fb-lsd': tokens.lsd,
            'accept': '*/*',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': targetUrl
        }
    });

    const json = gqlRes.data;
    const m = json.data?.xdt_shortcode_media;
    if (m) return formatGraphQLResult(m);

    throw new Error(json.message || 'Data media tidak ditemukan dari Instagram');
}

router.get('/', async (req, res) => {
    try {
        const url = req.query.url?.trim() || req.query.link?.trim();

        if (!url || !url.includes('instagram.com')) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' atau 'link' Instagram valid wajib diisi!"
            });
        }

        const data = await scrapeInstagram(url);

        return res.json({
            status: true,
            creator: "ZennzXD",
            result: data
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message || "Internal Server Error saat mengunduh dari Instagram"
        });
    }
});

router.desc = "Downloader Instagram (Photo, Video, Reel, Carousel Slide) Direct Scraper.";
router.paramsConfig = {
    url: "contoh: https://www.instagram.com/p/DUVqmtzkUJm/"
};
router.status = "ready";
router.type = "free";

export default router;
