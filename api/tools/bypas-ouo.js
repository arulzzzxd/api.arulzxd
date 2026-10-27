const express = require('express');
const puppeteer = require('puppeteer');

const router = express.Router();

async function ouoBypass(targetUrl) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    await page
      .waitForFunction(
        () => !document.title.includes('moment') && !document.querySelector('#challenge-running'),
        { timeout: 30000 }
      )
      .catch(() => {});

    await page.waitForSelector('#form-captcha', { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    const hasForm = await page.$('#form-captcha');
    if (hasForm) {
      await page.evaluate(() => {
        const xt = document.querySelector('#x-token');
        if (xt) xt.value = 'bypass';
      });

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
        page
          .click('#btn-main')
          .catch(() => page.evaluate(() => document.querySelector('#form-captcha')?.submit()))
      ]);

      await new Promise((r) => setTimeout(r, 2000));

      const hasForm2 = await page.$('#form-captcha');
      if (hasForm2) {
        await page.evaluate(() => {
          const xt = document.querySelector('#x-token');
          if (xt) xt.value = 'bypass';
        });

        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
          page
            .click('#btn-main')
            .catch(() => page.evaluate(() => document.querySelector('#form-captcha')?.submit()))
        ]);

        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return {
      original_url: targetUrl,
      bypassed_url: page.url()
    };
  } finally {
    await browser.close();
  }
}

router.get('/', async (req, res) => {
  try {
    const url = req.query.url?.trim() || req.query.link?.trim() || req.query.text?.trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: "Parameter 'url' wajib diisi! (contoh: ?url=https://ouo.press/xxxxx)"
      });
    }

    if (!url.includes('ouo.io') && !url.includes('ouo.press')) {
      return res.status(400).json({
        status: false,
        creator: 'ArulzXD',
        message: 'URL tidak valid. Harap masukkan URL dari ouo.io atau ouo.press!'
      });
    }

    const result = await ouoBypass(url);

    return res.json({
      status: true,
      creator: 'ArulzXD',
      result
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: 'ArulzXD',
      message: err.message || 'Terjadi kesalahan saat memproses bypass URL.'
    });
  }
});

router.desc = 'Bypass link shortener ouo.io dan ouo.press secara otomatis.';
router.paramsConfig = {
  url: 'text (contoh: https://ouo.press/xxxxx)'
};
router.status = 'ready';
router.type = 'free';

module.exports = router;
