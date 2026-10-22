import express from 'express';
import axios from 'axios';

const router = express.Router();

const CAPCUT_HOST = /(^|\.)capcut\.com$/i;
const BASE = 'https://www.capcut.com';

function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[\w\u0590-\u05ff]+/gi) || [];
  return [...new Set(matches)];
}

function absUrl(path) {
  return path ? BASE + path : undefined;
}

function isCapcutUrl(input) {
  try {
    const u = new URL(input);
    return u.protocol === 'https:' && CAPCUT_HOST.test(u.hostname);
  } catch (e) {
    return false;
  }
}

async function scrapeCapcut(inputUrl) {
  const response = await axios.get(inputUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    },
    timeout: 15000,
    maxRedirects: 5,
    responseType: 'text',
    beforeRedirect: (options) => {
      const host = options.hostname || (options.host || '').split(':')[0];
      if (!CAPCUT_HOST.test(host)) {
        throw new Error('Redirect ke domain non-CapCut diblokir.');
      }
    }
  });

  const html = String(response.data || '');
  let templateData = null;
  let loaderObj = null;

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  for (const s of scripts) {
    if (s[1].includes('loaderData')) {
      try {
        const parsed = JSON.parse(s[1]);
        loaderObj = (parsed.loaderData && (parsed.loaderData['template-detail_$'] || parsed.loaderData['template_detail'])) || null;
        if (loaderObj && loaderObj.templateDetail) {
          templateData = loaderObj.templateDetail;
          break;
        }
      } catch (e) { }
    }
  }

  if (!templateData) {
    const getRegex = (re) => {
      const m = html.match(re);
      return m && m[1] ? m[1].replace(/\\u002F/g, '/') : '';
    };
    const getNum = (re) => {
      const m = html.match(re);
      return parseInt((m && m[1]) || '0', 10);
    };

    const videoUrl = getRegex(/"videoUrl":"(.*?)"/);
    if (!videoUrl) throw new Error('Gagal mengekstrak metadata dari URL CapCut.');

    const desc = getRegex(/"desc":"(.*?)"/);
    const width = getNum(/"videoWidth":([0-9]+)/);
    const height = getNum(/"videoHeight":([0-9]+)/);
    const duration = getNum(/"templateDuration":([0-9]+)/);
    const createTime = getNum(/"createTime":([0-9]+)/);

    return {
      id: getRegex(/"templateId":"(.*?)"/),
      title: getRegex(/"title":"(.*?)"/) || 'CapCut Template',
      description: desc,
      hashtags: extractHashtags(desc),
      originalUrl: inputUrl,
      coverUrl: getRegex(/"coverUrl":"(.*?)"/),
      videoUrl,
      videoWidth: width,
      videoHeight: height,
      videoRatio: width && height ? `${width}:${height}` : '9:16',
      durationMs: duration,
      durationSec: Number((duration / 1000).toFixed(2)),
      segmentCount: getNum(/"segmentAmount":([0-9]+)/),
      usageCount: getNum(/"usageAmount":([0-9]+)/),
      likeCount: getNum(/"likeAmount":([0-9]+)/) || getNum(/"likeCount":([0-9]+)/),
      playCount: getNum(/"playAmount":([0-9]+)/) || getNum(/"playCount":([0-9]+)/),
      commentCount: getNum(/"commentAmount":([0-9]+)/),
      createdAt: createTime ? new Date(createTime * 1000).toISOString() : '',
      createdTimestamp: createTime,
      capabilities: [],
      author: {
        name: getRegex(/"author":\{.*?"name":"(.*?)"/),
        avatarUrl: getRegex(/"avatarUrl":"(.*?)"/)
      }
    };
  }

  const t = templateData;
  const createTime = Number(t.createTime || 0);
  const duration = Number(t.templateDuration || 0);
  const desc = t.desc || '';

  const rawRecommend = Array.isArray(loaderObj && loaderObj.recommendList) ? loaderObj.recommendList : [];
  const recommendList = rawRecommend.map((item) => {
    const itemCreateTime = Number(item.createTime || 0);
    const a = item.author || {};
    const hasAuthor = Boolean(a.name || a.avatarUrl || a.secUid);
    return {
      templateId: String(item.templateId || ''),
      title: item.title || '',
      description: item.desc || '',
      coverUrl: item.coverUrl || '',
      videoUrl: item.videoUrl || undefined,
      usageCount: Number(item.usageAmount || 0),
      likeCount: Number(item.likeAmount || 0),
      createdAt: itemCreateTime ? new Date(itemCreateTime * 1000).toISOString() : undefined,
      createdTimestamp: itemCreateTime || undefined,
      canonicalUrl: absUrl(item.canonicalPath),
      author: hasAuthor
        ? {
            name: a.name || undefined,
            avatarUrl: a.avatarUrl || undefined,
            description: a.description || undefined,
            profileUrl: absUrl(a.profileUrl),
            secUid: a.secUid || undefined
          }
        : undefined
    };
  });

  const au = t.author || {};
  return {
    id: String(t.templateId || (loaderObj && loaderObj.templateId) || ''),
    title: t.title || '',
    description: desc,
    hashtags: extractHashtags(desc),
    tagTitle: t.tagTitle || '',
    canonicalUrl: (loaderObj && loaderObj.canonicalPath)
      ? BASE + loaderObj.canonicalPath
      : ((t.structuredData && t.structuredData.url) || ''),
    originalUrl: inputUrl,
    coverUrl: t.coverUrl || '',
    videoUrl: t.videoUrl || '',
    videoWidth: Number(t.videoWidth || 0),
    videoHeight: Number(t.videoHeight || 0),
    videoRatio: t.videoRatio || (t.videoWidth && t.videoHeight ? `${t.videoWidth}:${t.videoHeight}` : ''),
    durationMs: duration,
    durationSec: Number((duration / 1000).toFixed(2)),
    segmentCount: Number(t.segmentAmount || 0),
    usageCount: Number(t.usageAmount || 0),
    likeCount: Number(t.likeAmount || 0),
    playCount: Number(t.playAmount || 0),
    commentCount: Number(t.commentAmount || 0),
    createdAt: createTime ? new Date(createTime * 1000).toISOString() : '',
    createdTimestamp: createTime,
    capabilities: Array.isArray(t.capabilityName) ? t.capabilityName : [],
    ugcLang: t.ugcLang || '',
    templateLanguage: t.templateLanguage || '',
    itemType: t.itemType,
    scene: t.scene,
    isValidRegion: t.is_valid_template_region != null ? t.is_valid_template_region : (loaderObj && loaderObj.isValidTemplateRegion),
    useAvailable: t.useAvailable,
    author: {
      name: au.name || '',
      avatarUrl: au.avatarUrl || '',
      description: au.description || '',
      profileUrl: au.profileUrl ? BASE + au.profileUrl : '',
      secUid: au.secUid || '',
      uid: au.uid || 0
    },
    collections: Array.isArray(t.collections) ? t.collections : [],
    recommendList: recommendList.length > 0 ? recommendList : undefined
  };
}

router.get('/', async (req, res) => {
  const url = (req.query.url || '').trim();

  if (!url) {
    return res.status(400).json({
      status: false,
      creator: 'ArulzXD',
      message: 'Parameter "url" wajib diisi.'
    });
  }

  if (!isCapcutUrl(url)) {
    return res.status(400).json({
      status: false,
      creator: 'ArulzXD',
      message: 'URL CapCut tidak valid (contoh: https://www.capcut.com/tv2/ZSVEwBgtH/ atau https://www.capcut.com/template-detail/...).'
    });
  }

  try {
    const data = await scrapeCapcut(url);

    return res.json({
      status: true,
      creator: 'ArulzXD',
      result: data
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: 'Gagal mengambil template CapCut: ' + (err.message || err)
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
