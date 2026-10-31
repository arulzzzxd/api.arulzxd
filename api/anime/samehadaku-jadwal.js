import express from 'express';
import axios from 'axios';

const router = express.Router();
const BASE_URL = "https://v2.samehadaku.how";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_NAMES = {
  monday: "Senin",
  tuesday: "Selasa",
  wednesday: "Rabu",
  thursday: "Kamis",
  friday: "Jumat",
  saturday: "Sabtu",
  sunday: "Minggu"
};

router.get('/', async (req, res) => {
  try {
    const selectedDay = req.query.day?.toLowerCase()?.trim();
    const result = {};

    const fetchDay = async (day) => {
      try {
        const url = `${BASE_URL}/wp-json/custom/v1/all-schedule?perpage=20&day=${day}`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': UA } });
        return data.map(item => ({
          title: item.title,
          url: item.url,
          time: item.east_time || "",
          image: item.featured_img_src || "",
          score: item.east_score || "",
          type: item.east_type || "",
          genres: item.genre || ""
        }));
      } catch {
        return [];
      }
    };

    if (selectedDay && DAYS.includes(selectedDay)) {
      result[DAY_NAMES[selectedDay]] = await fetchDay(selectedDay);
    } else {
      for (const day of DAYS) {
        result[DAY_NAMES[day]] = await fetchDay(day);
      }
    }

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Gagal mengambil jadwal rilis anime",
      error: err.message
    });
  }
});

router.title = "Jadwal Rilis Anime";
router.desc = "Mengambil jadwal tayang rilis anime berdasarkan hari.";
router.paramsConfig = {
  day: {
    type: "select",
    options: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    default: "monday"
  }
};

router.status = "ready";
router.type = "free";

export default router;
