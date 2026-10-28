/**
 * ✦ Nama Scrape : Brat Video Generator (480p White Only MP4)
 * ✦ Author      : ArulzXD
 * ✦ Deskripsi   : Membuat video animasi kata demi kata teks Brat ala Charli XCX beresolusi 480x480 MP4, tema putih, dan tanpa blur menggunakan ffmpeg-static.
 */

import express from "express";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync, existsSync, readFileSync, mkdtempSync, rmSync, unlinkSync } from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);
const router = express.Router();

const FONT_URL = "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/ARIALN.ttf";
const EMOJI_JSON_URL = "https://raw.githubusercontent.com/arulzzzxd/database/refs/heads/main/emoji-apple.json";

// KONSTANTA PERMANEN: White Only, Blur 0, Resolusi 480
const THEME_WHITE = { bg: "#ffffff", text: "#000000" };
const DEFAULT_MAX_WORD_PER_LAYER = 1;
const DEFAULT_MAX_WORD_BEFORE_RESET = [7, 8];
const DEFAULT_FAST_PROGRESS = true;

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download gagal: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

let fontLoaded = false;
async function ensureFont() {
  if (!fontLoaded) {
    const fontBuffer = await downloadBuffer(FONT_URL);
    GlobalFonts.register(fontBuffer, "ArialNarrow");
    fontLoaded = true;
  }
}

let emojiMap = null;
const emojiImageCache = new Map();

function emojiToUnicode(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16).padStart(4, "0")).join("-");
}

async function loadEmojiMap() {
  if (!emojiMap) {
    const buf = await downloadBuffer(EMOJI_JSON_URL);
    emojiMap = JSON.parse(buf.toString("utf-8"));
  }
  return emojiMap;
}

async function getEmojiImage(emoji) {
  if (emojiImageCache.has(emoji)) return emojiImageCache.get(emoji);
  const map = await loadEmojiMap();
  const base = emojiToUnicode(emoji);
  const variants = [
    base,
    base.replace(/-fe0f/gi, ""),
    `${base.replace(/-fe0f/gi, "")}-fe0f`,
    base.toUpperCase(),
    base.replace(/-fe0f/gi, "").toUpperCase(),
    base.replace(/-fe0f/gi, "").toUpperCase() + "-FE0F"
  ];
  let b64 = null;
  for (const v of variants) {
    if (map[v]) { b64 = map[v]; break; }
  }
  if (!b64) return null;
  const img = await loadImage(Buffer.from(b64, "base64"));
  emojiImageCache.set(emoji, img);
  return img;
}

async function drawAppleEmoji(ctx, emoji, x, y, size) {
  const img = await getEmojiImage(emoji);
  if (!img) { ctx.fillText(emoji, x, y); return; }
  ctx.drawImage(img, x, y, size, size);
}

const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu;

function measureTextCustom(ctx, text, fontSize) {
  const parts = text.split(EMOJI_REGEX);
  let w = 0;
  for (const part of parts) {
    if (!part) continue;
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(part)) w += fontSize;
    else w += ctx.measureText(part).width;
    EMOJI_REGEX.lastIndex = 0;
  }
  return w;
}

async function drawTextWithEmojis(ctx, text, x, y, fontSize) {
  const parts = text.split(EMOJI_REGEX);
  let curX = x;
  for (const part of parts) {
    if (!part) continue;
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(part)) {
      await drawAppleEmoji(ctx, part, curX, y, fontSize);
      curX += fontSize;
    } else {
      ctx.fillText(part, curX, y);
      curX += ctx.measureText(part).width;
    }
    EMOJI_REGEX.lastIndex = 0;
  }
}

function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.font = `${fontSize}px ArialNarrow`;
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? cur + " " + word : word;
    if (measureTextCustom(ctx, test, fontSize) > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitsAt(ctx, text, fontSize, maxWidth, maxHeight, lineGap) {
  const lines = wrapText(ctx, text, maxWidth, fontSize);
  const longestWord = Math.max(...text.split(" ").map(w => measureTextCustom(ctx, w, fontSize)));
  const totalHeight = lines.length * (fontSize + lineGap) - lineGap;
  return longestWord <= maxWidth && totalHeight <= maxHeight;
}

function findBestFontSize(ctx, text, maxWidth, maxHeight, lineGap) {
  let lo = 10;
  let hi = 350;
  let best = lo;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fitsAt(ctx, text, mid, maxWidth, maxHeight, lineGap)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function tokenize(text) {
  return text.split(" ").filter(Boolean);
}

async function renderCanvas(text) {
  const size = 480; // Resolusi 480x480 px
  const padding = 38;
  const lineGap = 10;
  const maxWidth = size - padding * 2;
  const maxHeight = size - padding * 2;

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = THEME_WHITE.bg;
  ctx.fillRect(0, 0, size, size);

  if (!text.trim()) return canvas;

  const fontSize = findBestFontSize(ctx, text, maxWidth, maxHeight, lineGap);
  const lines = wrapText(ctx, text, maxWidth, fontSize);

  ctx.fillStyle = THEME_WHITE.text;
  ctx.font = `${fontSize}px ArialNarrow`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const totalTextHeight = lines.length * (fontSize + lineGap) - lineGap;
  let y = (size - totalTextHeight) / 2;
  for (const line of lines) {
    await drawTextWithEmojis(ctx, line, padding, y, fontSize);
    y += fontSize + lineGap;
  }

  return canvas;
}

async function generateBratVideo({
  text = "",
  frameDuration,
  holdDuration,
  maxWordPerLayer = DEFAULT_MAX_WORD_PER_LAYER,
  maxWordBeforeReset = DEFAULT_MAX_WORD_BEFORE_RESET,
  fastProgress = DEFAULT_FAST_PROGRESS
} = {}) {
  const step = Math.max(1, maxWordPerLayer);
  const resetSchedule = Array.isArray(maxWordBeforeReset)
    ? maxWordBeforeReset.map(n => Math.max(0, n))
    : [Math.max(0, Number(maxWordBeforeReset) || 0)];
  const getResetAt = (batchIndex) => resetSchedule[batchIndex % resetSchedule.length];

  await ensureFont();
  await loadEmojiMap();

  const tokens = tokenize(text);
  if (!tokens.length) throw new Error("Teks tidak boleh kosong");

  // Kalkulasi durasi otomatis berdasarkan jumlah kata
  const wordCount = tokens.length;
  const computedFrameDur = frameDuration ?? (wordCount > 15 ? 0.25 : wordCount > 8 ? 0.35 : 0.45);
  const computedHoldDur = holdDuration ?? (wordCount > 15 ? 1.5 : 1.2);

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "brat-480-"));

  const partialTexts = [];
  let batchStart = 0;
  let batchIndex = 0;
  while (batchStart < tokens.length) {
    const resetAt = getResetAt(batchIndex);
    const batchEnd = resetAt > 0 ? Math.min(batchStart + resetAt, tokens.length) : tokens.length;
    for (let i = batchStart + step; i < batchEnd; i += step) {
      partialTexts.push(tokens.slice(batchStart, i).join(" "));
    }
    partialTexts.push(tokens.slice(batchStart, batchEnd).join(" "));
    batchStart = batchEnd;
    batchIndex++;
  }

  const renderFrame = async (partialText, index) => {
    const canvas = await renderCanvas(partialText);
    const buffer = await canvas.encode("png");
    const framePath = path.join(tmpDir, `frame-${String(index + 1).padStart(4, "0")}.png`);
    writeFileSync(framePath, buffer);
    return framePath;
  };

  let framePaths;
  if (fastProgress) {
    framePaths = await Promise.all(partialTexts.map((t, i) => renderFrame(t, i)));
  } else {
    framePaths = [];
    for (let i = 0; i < partialTexts.length; i++) {
      framePaths.push(await renderFrame(partialTexts[i], i));
    }
  }

  const durations = framePaths.map((_, i) =>
    i === framePaths.length - 1 ? computedHoldDur : computedFrameDur
  );

  const manifestLines = [];
  for (let i = 0; i < framePaths.length; i++) {
    manifestLines.push(`file '${framePaths[i].replace(/'/g, "'\\''")}'`);
    manifestLines.push(`duration ${durations[i]}`);
  }
  manifestLines.push(`file '${framePaths[framePaths.length - 1].replace(/'/g, "'\\''")}'`);
  const concatPath = path.join(tmpDir, "concat.txt");
  writeFileSync(concatPath, manifestLines.join("\n"));

  const outPath = path.join(os.tmpdir(), `brat-480-${Date.now()}.mp4`);

  await execFileAsync(ffmpegPath, [
    "-y",
    "-f", "concat", "-safe", "0", "-i", concatPath,
    "-vf", "scale=480:480",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outPath
  ]);

  rmSync(tmpDir, { recursive: true, force: true });
  return outPath;
}

router.post("/", async (req, res) => {
  try {
    const text = req.body.text?.trim() || req.body.q?.trim();

    if (!text) {
      return res.status(400).json({
        status: false,
        creator: "ArulzXD",
        message: "Masukkan parameter text"
      });
    }

    const filePath = await generateBratVideo({
      text,
      maxWordPerLayer: DEFAULT_MAX_WORD_PER_LAYER,
      maxWordBeforeReset: DEFAULT_MAX_WORD_BEFORE_RESET,
      fastProgress: DEFAULT_FAST_PROGRESS
    });

    res.setHeader("Content-Type", "video/mp4");

    res.sendFile(filePath, (err) => {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
      if (err && !res.headersSent) {
        console.error("Error sending file:", err);
      }
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: false,
      creator: "ArulzXD",
      message: err.message || "Terjadi kesalahan saat memproses Brat Video."
    });
  }
});

router.desc = "Membuat video teks animasi Brat.";
router.paramsConfig = {
  text: "text"
};

router.status = "ready";
router.type = "free";

export default router;
