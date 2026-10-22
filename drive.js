import express from 'express';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));
const router = express.Router();

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const HEADERS = { "user-agent": UA, "accept-language": "en-US,en;q=0.9,id;q=0.8" };

function parseFileId(input) {
    if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) return input;
    const m =
        input.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        input.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
        input.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) throw new Error("File ID tidak ditemukan di URL");
    return m[1];
}

function filenameFromCD(cd) {
    if (!cd) return null;
    const utf8 = cd.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8) return decodeURIComponent(utf8[1]);
    const plain = cd.match(/filename="?([^";]+)"?/i);
    return plain ? plain[1] : null;
}

const driveDownload = async (input) => {
    try {
        const fileId = parseFileId(input);
        const base = "https://drive.usercontent.google.com/download";

        let res = await client.get(base, {
            params: { id: fileId, export: "download" },
            headers: HEADERS,
            responseType: "arraybuffer",
            maxRedirects: 5,
            validateStatus: () => true,
        });

        let downloadUrl = `${base}?id=${fileId}&export=download`;
        const contentType = res.headers["content-type"] || "";

        if (contentType.includes("text/html")) {
            const page = Buffer.from(res.data).toString("utf8");
            const confirm = (page.match(/name="confirm" value="([^"]+)"/) || [])[1] || "t";
            const uuid = (page.match(/name="uuid" value="([^"]+)"/) || [])[1];
            const action = (page.match(/<form[^>]*action="([^"]+)"/) || [])[1] || base;

            if (page.includes("Google Drive - Quota exceeded"))
                throw new Error("Kuota download file ini sudah habis, coba lagi nanti");
            if (!uuid && !confirm) throw new Error("Gagal resolve link (file mungkin private / butuh login)");

            const params = new URLSearchParams({ id: fileId, export: "download", confirm });
            if (uuid) params.set("uuid", uuid);
            downloadUrl = `${action}?${params.toString()}`;

            res = await client.get(downloadUrl, {
                headers: HEADERS,
                responseType: "stream",
                validateStatus: () => true,
            });
            if (res.data.destroy) res.data.destroy();
        }

        const cd = res.headers["content-disposition"];
        const filename = filenameFromCD(cd) || null;
        const mimeType = (res.headers["content-type"] || "").split(";")[0] || null;
        const sizeBytes = Number(res.headers["content-length"]) || null;

        if ((mimeType || "").includes("text/html") && !filename)
            throw new Error("File tidak bisa di-download (private / restricted / dihapus)");

        const cookies = await jar.getCookieString("https://drive.usercontent.google.com");

        return {
            status: true,
            fileId,
            filename,
            extension: filename ? (filename.match(/\.(\w+)$/) || [])[1] || null : null,
            mimeType,
            sizeBytes,
            sizeMB: sizeBytes ? +(sizeBytes / 1048576).toFixed(2) : null,
            downloadUrl,
            cookies: cookies || null,
        };
    } catch (error) {
        console.error("Error Main Process:", error.message);
        return { status: false, error: error.message };
    }
};

router.get('/', async (req, res) => {
  try {
    const url = req.query.url?.trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: 'Masukkan parameter url/link (contoh: ?url=https://drive.google.com/file/d/1sYTUx34mZCQ39vVNqZGGAFaDYHq1o9vI/view?usp=drive_link)'
      });
    }

    const result = await driveDownload(url);

    if (!result) {
      return res.status(404).json({
        status: false,
        creator: 'ArulzXD',
        message: 'Gagal mengekstrak media dari URL yang diberikan.'
      });
    }

    return res.json({
      status: true,
      creator: 'ArulzXD',
      result: result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan pada server saat memproses unduhan.'
    });
  }
});

router.desc = "Pengunduh media Google Drive";
router.paramsConfig = {
  url: "url: https://drive.google.com/file/d/..."
};
router.status = "ready";
router.type = "free";

export default router;
