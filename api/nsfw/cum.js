import express from 'express';
import axios from 'axios';

const router = express.Router();

const ANIME_CUM = [
  "https://konachan.com/sample/efc2db82a388ecaed8e3214ec2fcf065/Konachan.com%20-%20316542%20sample.jpg",
  "https://konachan.com/sample/f3f6ea463f111501fc8cc2b9b51e5c46/Konachan.com%20-%20316327%20sample.jpg",
  "https://konachan.com/sample/737a707688c52fdfdd74797e76d67ee2/Konachan.com%20-%20316192%20sample.jpg",
  "https://konachan.com/jpeg/a0863dacd6d8ad422e50aeb423d80111/Konachan.com%20-%20316184%20anus%20ass%20blush%20braids%20censored%20kanojo_okarishimasu%20miazi%20nopan%20purple_eyes%20pussy%20red_hair%20sakurasawa_sumi%20school_uniform%20skirt%20thighhighs%20waifu2x%20wet.jpg",
  "https://konachan.com/sample/dcaf0a2ad0b79ff1717a18359ec44996/Konachan.com%20-%20316088%20sample.jpg",
  "https://konachan.com/sample/647c499d8b46970042625601133a0d18/Konachan.com%20-%20315321%20sample.jpg",
  "https://konachan.com/jpeg/163ed4cbe0e542484733e18a953683ea/Konachan.com%20-%20313778%20aliasing%20arknights%20black_hair%20blush%20bodhi_wushushenghua%20bondage%20breasts%20chain%20cleavage%20eunectes_%28arknights%29%20flowers%20garter%20goggles%20tail.jpg",
  "https://konachan.com/sample/e94bc73cafb5d81656f0f54051a3676f/Konachan.com%20-%20313642%20sample.jpg",
  "https://konachan.com/sample/f855a318c6e1d15cf2762b075a80d36f/Konachan.com%20-%20316712%20sample.jpg"
];

async function getRandomImageBuffer() {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      // Pilih URL acak dari array
      const randomUrl = ANIME_CUM[Math.floor(Math.random() * ANIME_CUM.length)];

      const response = await axios.get(randomUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const contentType = response.headers['content-type'] || 'image/jpeg';
      const buffer = Buffer.from(response.data);

      if (buffer.length > 0) {
        return { buffer, contentType };
      }
    } catch (err) {
      attempts++;
    }
  }

  throw new Error('Gagal mengambil gambar acak setelah beberapa kali percobaan.');
}

router.get('/', async (req, res) => {
  try {
    const { buffer, contentType } = await getRandomImageBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'Arulzxd',
      message: 'Internal Server Error saat mengambil gambar acak',
      error: err.message
    });
  }
});

router.title = "Anime18 Cum";
router.desc = "Mengambil gambar acak dari koleksi Anime Cum.";
router.status = "ready";
router.type = "premium";

export default router;
