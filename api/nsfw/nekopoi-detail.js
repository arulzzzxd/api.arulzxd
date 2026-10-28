import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

class NekopoiScraper {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'https://nekopoi.care';
        this.headers = {
            'User-Agent': config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
            ...config.headers
        };
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: this.headers,
            timeout: config.timeout || 15000,
            proxy: config.proxy || undefined,
            ...config.axiosOptions
        });
    }

    resolveUrl(url) {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    extractM3u8(iframeUrl) {
        if (!iframeUrl) return null;

        try {
            const parsedUrl = new URL(iframeUrl);
            const streamId = parsedUrl.searchParams.get("name") || parsedUrl.searchParams.get("id");
            
            if (streamId && iframeUrl.includes('/play.html')) {
                const baseUrl = iframeUrl.split('/play.html')[0];
                return `${baseUrl}/streams/${streamId}.m3u8`;
            }
        } catch (error) {
            console.error("URL Iframe tidak valid:", error.message);
        }
        
        return null;
    }

    async getPage(urlPath) {
        const url = this.resolveUrl(urlPath);
        try {
            const response = await this.axiosInstance.get(url);
            return cheerio.load(response.data);
        } catch (error) {
            throw new Error(`Gagal memuat halaman: ${url}. Pesan: ${error.message}`);
        }
    }

    async getDetail(urlPath) {
        const $ = await this.getPage(urlPath);
        const resolvedUrl = this.resolveUrl(urlPath);
        
        const title = $('h1.entry-title, h1.title, h1').first().text().trim() || $('h2').first().text().trim();
        const isSeries = $('.nk-episode-grid, .nk-series-detail, .nk-series-meta-list').length > 0;
        
        if (isSeries) {
            const titleText = $('.nk-series-synopsis b').first().text().trim() || title;
            const posterStyle = $('.nk-series-poster').attr('style') || '';
            const posterMatch = posterStyle.match(/url\(['"]?(.*?)['"]?\)/);
            const poster = posterMatch ? posterMatch[1] : '';
            const synopsis = $('.nk-series-synopsis p').text().trim();
            
            const metadata = {};
            $('.nk-series-meta-list li').each((i, el) => {
                const text = $(el).text().trim();
                if (text.includes(':')) {
                    const parts = text.split(':');
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    if (key && value) {
                        metadata[key] = value;
                    }
                }
            });
            
            const episodes = [];
            $('.nk-episode-grid li a, .nk-episode-card').each((i, el) => {
                const epUrl = $(el).attr('href');
                const epTitle = $(el).find('.nk-episode-card-title').text().trim();
                const epBadge = $(el).find('.nk-episode-badge').text().trim();
                const epDate = $(el).find('.nk-episode-card-date').text().trim();
                const epStyle = $(el).find('.nk-episode-card-thumb').attr('style') || '';
                const epImgMatch = epStyle.match(/url\(['"]?(.*?)['"]?\)/);
                const epImage = epImgMatch ? epImgMatch[1] : '';
                
                if (epUrl) {
                    episodes.push({
                        title: epTitle || epBadge || `Episode ${i+1}`,
                        url: epUrl,
                        badge: epBadge,
                        date: epDate,
                        image: epImage
                    });
                }
            });
            
            return {
                type: 'series',
                title: titleText,
                url: resolvedUrl,
                poster,
                synopsis,
                metadata,
                episodes
            };
        } else {
            const metadata = {};
            $('.konten p, .content p, .entry-content p').each((i, el) => {
                const text = $(el).text().trim();
                if (text.includes(':')) {
                    const parts = text.split(':');
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    if (key && value) {
                        metadata[key] = value;
                    }
                }
            });
            
            const embeds = [];
            const m3u8s = [];
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src) {
                    embeds.push(src);
                    const m3u8 = this.extractM3u8(src);
                    if (m3u8) m3u8s.push(m3u8);
                }
            });
            
            const downloads = [];
            $('.nk-download-box .nk-download-row, .download-box .download-row').each((i, el) => {
                const name = $(el).find('.nk-download-name, .download-name').text().trim();
                const links = [];
                $(el).find('a').each((j, aEl) => {
                    const host = $(aEl).text().trim();
                    const href = $(aEl).attr('href');
                    if (href) {
                        links.push({ host, url: href });
                    }
                });
                if (name && links.length > 0) {
                    downloads.push({ name, links });
                }
            });
            
            return {
                type: 'episode',
                title,
                url: resolvedUrl,
                metadata,
                embeds,
                m3u8s,
                downloads
            };
        }
    }
}

const scraper = new NekopoiScraper();

router.get('/', async (req, res) => {
    try {
        const text = req.query.text?.trim() || req.query.url?.trim() || req.query.path?.trim();

        if (!text) {
            return res.status(400).json({
                status: false,
                creator: "ArulzXD",
                message: "Masukkan parameter text, url, atau path (contoh: ?text=hentai/oide-yo-mizuryuu-kei-land/)"
            });
        }

        const result = await scraper.getDetail(text);

        return res.json({
            status: true,
            creator: "ArulzXD",
            result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: "ArulzXD",
            message: err.message
        });
    }
});

router.title = "nekopoi detail";
router.desc = "Mengambil detail anime, metadata, embed video, M3U8 streaming link, serta download box dari Nekopoi.";
router.paramsConfig = {
    text: "contoh: hentai/oide-yo-mizuryuu-kei-land/"
};
router.status = "ready";
router.type = "premium";

export default router;
