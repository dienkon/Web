import fs from "fs";
import path from "path";
import { safeFetchHtml } from "../server/services/webImporter/fetchService";
import { sieugioiAdapter } from "../server/services/webImporter/adapters/sieugioiAdapter";
import { normalizeToDkTestJson } from "../server/services/webImporter/normalizer";
import type { ExtractedExam, ExtractedQuestion } from "../server/services/webImporter/types";

interface MappedThread {
  title: string;
  slug: string;
  id: string;
  url: string;
  numId: number;
  bai: number;
  topicId: string;
  baiTitle: string;
  chapter: string;
}

const IMAGES_DIR = path.resolve(process.cwd(), "public/images/practice/sieugioi");
const DATA_DIR = path.resolve(process.cwd(), "src/practice/data/sieugioi");

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Download and cache image
const downloadedImagesMap = new Map<string, string>(); // onlineUrl -> localRelativePath

async function downloadImageLocally(imgUrl: string): Promise<string> {
  if (downloadedImagesMap.has(imgUrl)) {
    return downloadedImagesMap.get(imgUrl)!;
  }

  try {
    const parsed = new URL(imgUrl);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const lastPart = pathname.split("/").pop() || `img_${Date.now()}`;
    
    // Derive extension or default to .png
    let fileName = lastPart.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(fileName)) {
      if (fileName.includes("-png") || fileName.includes("_png")) {
        fileName = fileName.replace(/[-_]png/i, "") + ".png";
      } else if (fileName.includes("-jpg") || fileName.includes("_jpg")) {
        fileName = fileName.replace(/[-_]jpg/i, "") + ".jpg";
      } else {
        fileName = fileName + ".png";
      }
    }

    const localFilePath = path.join(IMAGES_DIR, fileName);
    const webPath = `/images/practice/sieugioi/${fileName}`;

    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 0) {
      downloadedImagesMap.set(imgUrl, webPath);
      return webPath;
    }

    // Fetch image
    const resp = await fetch(imgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DkTestWebImporter/1.0",
        Referer: "https://sieugioi.com/",
      },
    });

    if (!resp.ok) {
      console.warn(`[ImageDownload] Warning: Failed to fetch ${imgUrl}: status ${resp.status}`);
      return imgUrl; // Fallback to online url if cannot download
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(localFilePath, buffer);
    downloadedImagesMap.set(imgUrl, webPath);
    return webPath;
  } catch (err) {
    console.warn(`[ImageDownload] Error downloading ${imgUrl}:`, err);
    return imgUrl;
  }
}

async function processQuestionImages(q: ExtractedQuestion): Promise<void> {
  const localImages: string[] = [];
  for (const onlineImg of q.images) {
    const localUrl = await downloadImageLocally(onlineImg);
    localImages.push(localUrl);

    // Replace onlineUrl in promptHtml, promptText, explanation, explanationHtml
    if (q.promptHtml && q.promptHtml.includes(onlineImg)) {
      q.promptHtml = q.promptHtml.split(onlineImg).join(localUrl);
    }
    if (q.promptText && q.promptText.includes(onlineImg)) {
      q.promptText = q.promptText.split(onlineImg).join(localUrl);
    }
    if (q.explanation && q.explanation.includes(onlineImg)) {
      q.explanation = q.explanation.split(onlineImg).join(localUrl);
    }
    if (q.explanationHtml && q.explanationHtml.includes(onlineImg)) {
      q.explanationHtml = q.explanationHtml.split(onlineImg).join(localUrl);
    }
  }

  q.images = localImages;
  if (localImages.length > 0) {
    q.imageUrl = localImages[0];
    // If promptText does not contain image markdown, append it nicely so LatexPreview shows it
    if (!q.promptText.includes(localImages[0]) && !q.promptText.includes("![hình]")) {
      q.promptText = `${q.promptText}\n\n![hình minh họa](${localImages[0]})`;
    }
  }
}

async function scrapeSingleThread(meta: MappedThread, retryCount = 2): Promise<any | null> {
  const saveJsonPath = path.join(DATA_DIR, `exam_${meta.id}.json`);

  // If already scraped, load and return
  if (fs.existsSync(saveJsonPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(saveJsonPath, "utf8"));
      return existing;
    } catch {
      // Re-scrape if corrupt
    }
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`[Scraper] [${meta.id}] Fetching: ${meta.title} (Attempt ${attempt})...`);
      const fetchRes = await safeFetchHtml(meta.url, { timeoutMs: 25000 });
      
      const extracted = await sieugioiAdapter.extract(fetchRes.html, meta.url);
      
      // Download all images locally and rewrite URLs
      for (const q of extracted.questions) {
        await processQuestionImages(q);
      }

      // Normalize to DkTest schema v3
      let dktestJson;
      try {
        dktestJson = normalizeToDkTestJson(extracted);
      } catch (err: any) {
        console.warn(`[Normalizer] Warning for exam ${meta.id}:`, err.message);
      }

      const examRecord = {
        meta,
        extracted,
        dktestJson,
        scrapedAt: new Date().toISOString(),
      };

      fs.writeFileSync(saveJsonPath, JSON.stringify(examRecord, null, 2), "utf8");
      console.log(`[Scraper] ✓ [${meta.id}] Done! ${extracted.questions.length} questions, ${extracted.questionsWithImages} with images.`);
      return examRecord;
    } catch (err: any) {
      console.error(`[Scraper] ✗ [${meta.id}] Error on attempt ${attempt}:`, err.message);
      if (attempt < retryCount) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  return null;
}

// Concurrency pool runner
async function runPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<any>[] = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item)).then((res) => {
      results.push(res);
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
}

async function main() {
  const mappedThreads: MappedThread[] = JSON.parse(fs.readFileSync("scratch/mapped_threads.json", "utf8"));
  console.log(`Starting scraper for ${mappedThreads.length} threads with concurrency 3...`);

  // Target all threads from Bài 1 to Bài 17 (1743 - 1804)
  const results = await runPool(mappedThreads, 3, (thread) => scrapeSingleThread(thread));

  const successful = results.filter(Boolean);
  console.log(`\n======================================================`);
  console.log(`Scraping completed! Successfully processed ${successful.length}/${mappedThreads.length} exams.`);

  // Generate Master Summary & Practice Datasets
  let totalQuestions = 0;
  let totalImages = 0;
  const baiSummary: Record<number, { baiTitle: string; chapter: string; topicId: string; examCount: number; questionCount: number; questions: any[] }> = {};

  for (const rec of successful) {
    const bai = rec.meta.bai;
    if (!baiSummary[bai]) {
      baiSummary[bai] = {
        baiTitle: rec.meta.baiTitle,
        chapter: rec.meta.chapter,
        topicId: rec.meta.topicId,
        examCount: 0,
        questionCount: 0,
        questions: [],
      };
    }

    baiSummary[bai].examCount++;
    baiSummary[bai].questionCount += rec.extracted.questions.length;
    totalQuestions += rec.extracted.questions.length;
    totalImages += rec.extracted.questionsWithImages;

    // Attach questions with reference metadata
    for (const q of rec.extracted.questions) {
      baiSummary[bai].questions.push({
        ...q,
        examId: rec.meta.id,
        examTitle: rec.meta.title,
        bai: rec.meta.bai,
        baiTitle: rec.meta.baiTitle,
        chapter: rec.meta.chapter,
        topicId: rec.meta.topicId,
      });
    }
  }

  const masterSummary = {
    totalExams: successful.length,
    totalQuestions,
    totalImagesDownloaded: downloadedImagesMap.size,
    generatedAt: new Date().toISOString(),
    baiSummary,
  };

  fs.writeFileSync(path.join(DATA_DIR, "summary.json"), JSON.stringify(masterSummary, null, 2), "utf8");
  console.log(`Saved master summary to src/practice/data/sieugioi/summary.json`);
  console.log(`Total questions: ${totalQuestions}`);
  console.log(`Total images downloaded: ${downloadedImagesMap.size}`);
}

main().catch(console.error);
