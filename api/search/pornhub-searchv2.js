import express from 'express';
import axios from 'axios';

const router = express.Router();

const BASE_URL = 'https://www.pornhub.com';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'application/json, text/plain, */*'
};

async function searchPornhub(query, page = 1, ordering = 'newest', period = 'alltime', category = null) {
  try {
    const params = {
      search: query,
      page: page,
      ordering: ordering,
      period: period,
      thumbsize: 'medium'
    };

    if (category) {
      params.category = category;
    }

    const { data } = await axios.get(`${BASE_URL}/webmasters/search`, {
      params,
      headers: HEADERS,
      timeout: 15000
    });

    if (!data || !data.videos) {
      return {
        status: false,
        message: 'Tidak ada video ditemukan atau parameter pencarian salah.'
      };
    }

    const videos = data.videos.map(v => ({
      video_id: v.video_id,
      title: v.title,
      duration: v.duration,
      views: v.views,
      rating: v.rating,
      ratings_count: v.ratings,
      url: v.url,
      thumbnail: v.default_thumb || v.thumb,
      publish_date: v.publish_date,
      categories: v.categories ? v.categories.map(c => c.category) : [],
      tags: v.tags ? v.tags.map(t => t.tag_name) : [],
      pornstars: v.pornstars ? v.pornstars.map(p => p.pornstar_name) : []
    }));

    return {
      status: true,
      total_videos: videos.length,
      page: Number(page),
      videos: videos
    };

  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.message || 'Terjadi kesalahan saat melakukan pencarian.'
    };
  }
}

router.get('/', async (req, res) => {
  try {
    const query = req.query.query || req.query.q || req.query.search;
    const page = req.query.page || 1;
    const ordering = req.query.ordering || 'newest';
    const period = req.query.period || 'alltime';
    const category = req.query.category || null;

    if (!query) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: "Masukkan parameter 'query' atau 'q' (contoh: ?query=japanese)"
      });
    }

    const resData = await searchPornhub(query, page, ordering, period, category);

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
      result: {
        page: resData.page,
        total_videos: resData.total_videos,
        videos: resData.videos
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses pencarian.'
    });
  }
});

router.desc = "Search Pornhub Videos via Webmasters API.";
router.paramsConfig = {
  query: "contoh: japanese",
  page: "contoh: 1",
  ordering: {
    type: "select",
    options: ["newest", "mostviewed", "rating"]
  },
  period: {
    type: "select",
    options: ["alltime", "weekly", "monthly", "yearly"]
  }
};
router.status = "ready";
router.type = "free";

export default router;
