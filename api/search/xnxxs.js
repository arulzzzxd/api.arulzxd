import axios from 'axios';
import * as cheerio from 'cheerio';
import express from 'express';

const router = express.Router();

function formatDuration(rawText) {
    if (!rawText) return "00.00";
    const text = rawText.trim();
    
    if (text.includes('min') || text.includes('h')) {
        return text;
    }

    const cleanDuration = text.replace(/[^0-9:]/g, '');
    return cleanDuration ? cleanDuration.replace(/:/g, '.') : "00.00";
}

async function xnxxSearch(searchQuery) {
    const parts = searchQuery.trim().split(/\s+/);
    const limit = /^\d+$/.test(parts[parts.length - 1])
        ? Math.min(20, Math.max(1, parseInt(parts.pop())))
        : 5;
    const query = parts.join(' ').trim();

    const headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'referer': 'https://www.xnxx.com/',
        'accept-language': 'en-US,en;q=0.9'
    };

    const initialUrl = `https://www.xnxx.com/search/${encodeURIComponent(query)}/1`;
    const { data } = await axios.get(initialUrl, { headers });
    const $ = cheerio.load(data);

    let maxPages = 1;
    const paginationLinks = $('.pagination li a');
    if (paginationLinks.length > 0) {
        const lastPage = parseInt(paginationLinks.last().attr('href')?.split('/').pop()) || 1;
        maxPages = lastPage;
    }

    const safeMax = Math.min(maxPages, 50); 
    const randomPage = Math.floor(Math.random() * safeMax) + 1;

    const finalUrl = `https://www.xnxx.com/search/${encodeURIComponent(query)}/${randomPage}`;
    const { data: pageData } = await axios.get(finalUrl, { headers });
    const $p = cheerio.load(pageData);
    const results = [];

    $p('.mozaique .thumb-block').each((index, element) => {
        if (results.length >= limit) return false;
        
        const title = $p(element).find('.thumb-under a').first().text().trim() \vert{}\vert{}$p(element).find('a').attr('title');
        let link = $p(element).find('.thumb-under a').attr('href') \vert{}\vert{}$p(element).find('a').attr('href');
        if (link && !link.startsWith('http')) link = `https://www.xnxx.com${link}`;
        const thumbnail = $p(element).find('img').attr('data-src') \vert{}\vert{}$p(element).find('img').attr('src');
        
        let rawDuration = $p(element).find('.metadata').text();
        let matchedDuration = rawDuration.match(/(\d+\s*min|\d+\s*h\s*\d+\s*min|\d+:\d+(?::\d+)?)/i);
        
        const duration = matchedDuration ? formatDuration(matchedDuration[0]) : "00.00";

        if (title && link) results.push({ title, duration, thumbnail, link });
    });

    return {
        query,
        page: randomPage,
        limit,
        total_found: results.length,
        results
    };
}

router.get('/', async (req, res) => {
    const queryParam = req.query.query;

    if (!queryParam) {
        return res.status(400).json({ status: false, message: "Parameter 'query' is required." });
    }

    try {
        const result = await xnxxSearch(queryParam);
        return res.status(200).json({
            status: true,
            creator: 'Arulzxd',
            result,
            metadata: { source: 'XNXX', timestamp: new Date().toISOString() }
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
});

router.desc = "Mencari video dari XNXX berdasarkan kata kunci.";
router.status = "ready"; 
router.type = "premium";

export default router;
