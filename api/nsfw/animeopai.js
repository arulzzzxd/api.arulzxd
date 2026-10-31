import express from 'express';
import axios from 'axios';

const router = express.Router();

const ANIME_OPAI = [
      "https://i.pinimg.com/236x/3f/31/e1/3f31e1654143138388fa8c7a9ab35422.jpg",
      "https://i.pinimg.com/236x/28/95/21/2895215c4f863a6cdd4028f780674e36.jpg",
      "https://i.pinimg.com/236x/0e/6f/a4/0e6fa4b94ded13b6e0e0e3904fa0d74b.jpg",
      "https://i.pinimg.com/236x/05/5d/1a/055d1a996c73ac96cb3eb61ce22211cf.jpg",
      "https://i.pinimg.com/236x/53/ad/67/53ad672df89276c1c4ccea8d0ce59197.jpg",
      "https://i.pinimg.com/236x/f1/7b/04/f17b04c73fff451d608adacb75755cfa.jpg",
      "https://i.pinimg.com/236x/b6/1b/5d/b61b5d9b704e556de601fa3a0129ec45.jpg",
      "https://i.pinimg.com/236x/cb/a0/57/cba057ef021851499b83fa21fbfba3a8.jpg",
      "https://i.pinimg.com/236x/b6/a9/bb/b6a9bbed294554c558fc32e525e6957a.jpg",
      "https://i.pinimg.com/236x/24/e3/28/24e3288daec3e5e05a274619ea3ec6a5.jpg",
      "https://i.pinimg.com/236x/c1/4e/1c/c14e1c63a1b28cb1b07819487515fd6b.jpg",
      "https://i.pinimg.com/236x/be/fe/1f/befe1ff49e2a2115fcb9103d48583a43.jpg",
      "https://i.pinimg.com/236x/a8/0d/48/a80d48be2403a1eda578e8bca545054e.jpg",
      "https://i.pinimg.com/236x/2f/b5/68/2fb56865d0f02432d5426c923ce6d447.jpg",
      "https://i.pinimg.com/236x/b2/f1/69/b2f169ca9c63abf27ce2c59ca669727a.jpg",
      "https://i.pinimg.com/236x/e6/c0/26/e6c026c85ffc92f80ba4782ce9ae1953.jpg",
      "https://i.pinimg.com/236x/a0/2d/34/a02d347453af2dc5a6e146cd89a7f2cb.jpg",
      "https://i.pinimg.com/236x/c6/62/c8/c662c88e3e48cf8701fb0bc41c4f3b39.jpg",
      "https://i.pinimg.com/236x/48/00/64/48006405914fd7f0db7bad9fafefa767.jpg",
      "https://i.pinimg.com/236x/9b/22/00/9b2200966b4ac3a6fb045c5d59ed1fce.jpg",
      "https://i.pinimg.com/236x/9a/8c/3e/9a8c3eb56ff11acb6837db51e71c9ed6.jpg",
      "https://i.pinimg.com/236x/d5/37/77/d5377734c773fcab7669c677b520d35e--kawaii.jpg",
      "https://i.pinimg.com/236x/b5/2e/be/b52ebebdb9952137307dbd825d8bb5d5.jpg",
      "https://i.pinimg.com/236x/09/d5/99/09d599d862501ca3e2c95479d86ab759.jpg",
      "https://i.pinimg.com/236x/3c/37/03/3c37033691613e90efd01604b876fd3d.jpg",
      "https://i.pinimg.com/236x/c9/2b/33/c92b3324a9c92c8757cda5a46973f9d0.jpg",
      "https://i.pinimg.com/236x/aa/16/77/aa1677074c72fc759c0244469c009146.jpg",
      "https://i.pinimg.com/236x/50/4e/d4/504ed4438e1500e7e3285a44f3cf9553.jpg",
      "https://i.pinimg.com/236x/28/56/d4/2856d41c68fd2edce9ea093fa932faff.jpg",
      "https://i.pinimg.com/236x/fb/9b/14/fb9b145a1c34721e45db3d97538e453a.jpg"
];

async function getRandomImageBuffer() {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      // Pilih URL acak dari array
      const randomUrl = ANIME_OPAI[Math.floor(Math.random() * ANIME_OPAI.length)];

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

router.title = "Anime18 Opai";
router.desc = "Mengambil gambar acak dari koleksi Anime Opai.";
router.status = "ready";
router.type = "premium";

export default router;
