import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

const DATA_DIR = path.resolve(process.cwd(), "src/practice/data/sieugioi");
const IMAGES_DIR = path.resolve(process.cwd(), "public/images/practice/sieugioi");

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

async function downloadImageLocally(imgUrl: string): Promise<string> {
  try {
    const parsed = new URL(imgUrl);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const lastPart = pathname.split("/").pop() || `img_${Date.now()}`;
    
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
      return webPath;
    }

    const resp = await fetch(imgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DkTestWebImporter/1.0",
        Referer: "https://sieugioi.com/",
      },
    });

    if (!resp.ok) {
      console.warn(`[ImageDownload] Warning: Failed to fetch ${imgUrl}: status ${resp.status}`);
      return imgUrl;
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(localFilePath, buffer);
    console.log(`Downloaded: ${fileName} (${buffer.length} bytes)`);
    return webPath;
  } catch (err) {
    console.warn(`[ImageDownload] Error downloading ${imgUrl}:`, err);
    return imgUrl;
  }
}

async function main() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith("exam_") && f.endsWith(".json"));
  const onlineImages = new Set<string>();

  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8"));
    for (const q of d.extracted?.questions || []) {
      for (const opt of q.options || []) {
        if (opt.html) {
          const $ = cheerio.load(opt.html);
          $("img").each((_, el) => {
            const src = $(el).attr("src") || $(el).attr("data-src");
            if (src && src.startsWith("http")) onlineImages.add(src);
          });
        }
      }
      if (q.explanationHtml) {
        const $ = cheerio.load(q.explanationHtml);
        $("img").each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src");
          if (src && src.startsWith("http")) onlineImages.add(src);
        });
      }
    }
  }

  console.log(`Found ${onlineImages.size} online images to download...`);
  let downloadedCount = 0;
  for (const url of onlineImages) {
    const local = await downloadImageLocally(url);
    if (local.startsWith("/images/")) downloadedCount++;
  }
  console.log(`Successfully downloaded ${downloadedCount} / ${onlineImages.size} images!`);
}

main();
