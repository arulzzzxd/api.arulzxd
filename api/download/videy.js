import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing 'url' parameter" });
  try {
    const videoId = url.split("=")[1];
    if (!videoId) return res.status(400).json({ error: "Invalid 'url' parameter" });
    const anunyah = `https://cdn.videy.co/${videoId}.mp4`;
    const data = {
      fileurl: anunyah
    };
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.desc = "Videy.co Downloader untuk mengambil langsung URL video dari link Videy.";
router.paramsConfig = {
  url: "contoh: https://videy.co/v?id=XXXXXX"
};
router.status = "ready"; 
router.type = "free";

export default router;
