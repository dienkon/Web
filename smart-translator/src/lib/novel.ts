import { Chunk } from "../types";
import { generateId } from "./utils";

export function splitIntoChunks(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  
  let currentChunkText: string[] = [];
  let currentChapterTitle = "";
  let hasFoundAnyChapter = false;

  const pushChunk = (title: string) => {
    const joinedText = currentChunkText.join('\n').trim();
    if (joinedText) {
      chunks.push({
        id: generateId(),
        text: joinedText,
        title: title,
        status: "idle",
      });
    }
    currentChunkText = [];
  };

  const extractChapterInfo = (line: string): { type: string, numStr: string, num: number | null } | null => {
    const vnEnMatch = line.match(/^\s*(Chương|Chapter|Hồi|Quyển|Thiên|Tiết)\s+([\dIVXLCDM]+)/i);
    if (vnEnMatch) {
      return { type: vnEnMatch[1], numStr: vnEnMatch[2], num: parseInt(vnEnMatch[2], 10) || null };
    }
    const cnMatch = line.match(/^\s*(第)\s*([\d零一二三四五六七八九十百千万]+)\s*([章回节卷折])/i);
    if (cnMatch) {
      return { type: `${cnMatch[1]}X${cnMatch[3]}`, numStr: cnMatch[2], num: parseInt(cnMatch[2], 10) || null };
    }
    return null;
  };

  for (const line of lines) {
    const chapterInfo = extractChapterInfo(line);
    const isChapterHeader = !!chapterInfo;
    
    if (isChapterHeader) {
      if (!hasFoundAnyChapter) {
        if (currentChunkText.join('\n').replace(/=/g, '').trim()) {
           let prefix = "Chương mở đầu";
           if (chapterInfo?.num && chapterInfo.num > 1) {
              const prevNum = chapterInfo.num - 1;
              if (chapterInfo.type.includes('X')) { // Chinese format
                 prefix = line.replace(chapterInfo.numStr, prevNum.toString()).trim();
              } else {
                 prefix = `${chapterInfo.type} ${prevNum}`;
              }
           } else if (chapterInfo) {
              if (chapterInfo.type.includes('X')) {
                prefix = line.replace(chapterInfo.numStr, "0").trim();
              } else {
                prefix = `${chapterInfo.type} 0`;
              }
           }
           pushChunk(prefix);
        } else {
           currentChunkText = [];
        }
        hasFoundAnyChapter = true;
      } else {
        pushChunk(currentChapterTitle);
      }
      currentChapterTitle = line.replace(/=/g, '').trim();
      currentChunkText.push(line);
    } else {
      currentChunkText.push(line);
    }
  }

  if (currentChunkText.join('\n').replace(/=/g, '').trim()) {
    pushChunk(hasFoundAnyChapter ? currentChapterTitle : "Chương không xác định");
  }

  return chunks;
}

