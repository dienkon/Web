import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { BookOpen, Film, Leaf } from "lucide-react";

export const art = {
  dna: "./assets/dna-art.webp",
  cell: "./assets/cell-art.webp",
  butterfly: "./assets/butterfly-art.webp",
  letter: "./assets/letter-art.webp",
};
const tiles: Record<string, number> = {
  nucleosome: 0,
  chromosome: 1,
  replication: 2,
  transcription: 3,
  translation: 4,
  division: 5,
  mendel: 6,
  evolution: 7,
  ecosystem: 8,
};
type Props = {
  chapter: number;
  reduced: boolean;
  low: boolean;
  dnaMode: string;
  exhibit: string;
  bloom: boolean;
  photos: string[];
  zoom: number;
  resetView: number;
  intro: boolean;
  onIntroEnd: () => void;
  onPhoto: (index: number) => void;
  onBase: (base: string) => void;
  onReady: () => void;
};

function Atlas({ id }: { id: string }) {
  return (
    <img
      className="science-atlas"
      data-exhibit={id}
      src={`./assets/${id in tiles ? id : "nucleosome"}-art.webp`}
      alt="Tranh minh họa sinh học"
      draggable={false}
      decoding="async"
    />
  );
}

export default function IllustrationScene({
  chapter,
  reduced,
  low,
  dnaMode,
  exhibit,
  bloom,
  photos,
  zoom,
  resetView,
  intro,
  onIntroEnd,
  onPhoto,
  onBase,
  onReady,
}: Props) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; dx: number; dy: number } | null>(
    null,
  );
  useEffect(() => {
    let alive = true;
    Promise.all(
      [art.dna, art.cell, art.butterfly, art.letter].map(
        (src) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => {
              image
                .decode()
                .catch(() => undefined)
                .then(() => resolve());
            };
            image.onerror = () => resolve();
            image.src = src;
          }),
      ),
    ).then(() => {
      if (alive) onReady();
    });
    return () => {
      alive = false;
    };
  }, [onReady]);
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [resetView, chapter]);
  useEffect(() => {
    if (!intro) return;
    const timer = window.setTimeout(onIntroEnd, 6800);
    return () => window.clearTimeout(timer);
  }, [intro, onIntroEnd]);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (frame) return;
      const x = (event.clientX / innerWidth - 0.5) * 14,
        y = (event.clientY / innerHeight - 0.5) * 10;
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--mouse-x", `${x}px`);
        document.documentElement.style.setProperty("--mouse-y", `${y}px`);
        frame = 0;
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--mouse-x");
      document.documentElement.style.removeProperty("--mouse-y");
    };
  }, [reduced]);
  const interactive = chapter === 1 || chapter === 2;
  return (
    <div
      className={`illustrated-world chapter-art-${chapter} ${reduced ? "motion-off" : ""} ${low ? "art-lite" : ""} ${intro ? "voyage-active" : ""}`}
      data-renderer="2d"
    >
      <div className="cosmic-background" />
      <div className="star-field" aria-hidden="true">
        {Array.from({ length: low ? 32 : 80 }, (_, i) => (
          <i
            key={i}
            style={
              {
                "--i": i,
                left: `${(i * 37.43) % 100}%`,
                top: `${(i * 23.71) % 100}%`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="orbital-rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {chapter === 0 && (
        <>
          <img className="cell-illustration cell-top" src={art.cell} alt="" />
          <img
            className="cell-illustration cell-bottom"
            src={art.cell}
            alt=""
          />
          <div className="hero-dna-art art-float">
            <img src={art.dna} alt="Tranh ADN xoắn kép phát sáng" />
          </div>
          <img className="hero-letter-art" src={art.letter} alt="" />
          <div className="hero-chromosome">
            <Atlas id="chromosome" />
          </div>
        </>
      )}
      {interactive && (
        <div
          className="interactive-art"
          key={`${chapter}-${chapter === 2 ? exhibit : dnaMode}`}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              dx: offset.x,
              dy: offset.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setOffset({
              x: Math.max(
                -90,
                Math.min(90, drag.current.dx + event.clientX - drag.current.x),
              ),
              y: Math.max(
                -60,
                Math.min(60, drag.current.dy + event.clientY - drag.current.y),
              ),
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <div className="art-spotlight" />
          <div
            className={`science-art-transform mode-${dnaMode}`}
            style={{
              transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})`,
            }}
          >
            {chapter === 2 && exhibit !== "dna" ? (
              <Atlas id={exhibit} />
            ) : dnaMode === "replicate" ? (
              <Atlas id="replication" />
            ) : (
              <div className="dna-illustration">
                {dnaMode === "unwind" ? (
                  <>
                    <img
                      className="dna-half dna-half-left"
                      src={art.dna}
                      alt="Minh họa nghệ thuật tách hai mạch ADN"
                    />
                    <img
                      className="dna-half dna-half-right"
                      src={art.dna}
                      alt=""
                    />
                  </>
                ) : (
                  <img src={art.dna} alt="Tranh minh họa ADN xoắn kép" />
                )}
                <div className="base-hotspots">
                  {["A", "T", "G", "C"].map((base, i) => (
                    <button
                      key={base}
                      aria-label={`Khám phá ${base}`}
                      style={{ "--base-index": i } as CSSProperties}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onBase(base)}
                    >
                      {base}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="art-scientific-caption">
            <span />
            MINH HỌA NGHỆ THUẬT · NỘI DUNG KHOA HỌC Ở BÊN TRÁI
            <span />
          </div>
          {chapter === 1 && (
            <div className="pair-key">
              <span>
                5′{" "}
                <b>
                  A <i>··</i> T
                </b>{" "}
                3′
              </span>
              <span>
                3′{" "}
                <b>
                  G <i>···</i> C
                </b>{" "}
                5′
              </span>
            </div>
          )}
        </div>
      )}
      {(chapter === 0 || chapter === 3) && (
        <div
          className={`memory-ribbon ${chapter === 3 ? "memory-feature" : ""}`}
        >
          {Array.from({ length: Math.max(photos.length, 7) }, (_, i) => (
            <button
              key={i}
              className="film-frame"
              style={{ "--frame": i } as CSSProperties}
              onClick={() => onPhoto(i % Math.max(photos.length, 4))}
              aria-label={`Xem kỷ niệm ${i + 1}`}
            >
              <i className="film-holes holes-top" />
              {photos.length ? (
                <img src={photos[i % photos.length]} alt={`Kỷ niệm ${i + 1}`} />
              ) : (
                <span className="film-placeholder">
                  <BookOpen size={25} strokeWidth={0.7} />
                  <b>20 / 11</b>
                  <small>MỘT THỜI ĐỂ NHỚ</small>
                </span>
              )}
              <i className="film-holes holes-bottom" />
              <em>{String(i + 1).padStart(2, "0")}</em>
            </button>
          ))}
        </div>
      )}
      {chapter === 3 && (
        <div className="memory-dust" aria-hidden="true">
          <Film />
          <span>Những khoảnh khắc ở lại.</span>
        </div>
      )}
      {chapter === 4 && (
        <div
          className={`gratitude-halo ${bloom ? "gift-sent" : ""}`}
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
          <span>20 / 11</span>
        </div>
      )}
      {chapter === 5 && (
        <div className="final-letter-art art-float">
          <div className="letter-aura" />
          <img
            src={art.letter}
            alt="Phong thư tri ân với giấy mỹ thuật và dấu sáp vàng"
          />
          <Leaf className="letter-leaf" size={30} strokeWidth={0.6} />
        </div>
      )}
      <div className="butterfly-garden" aria-hidden="true">
        {Array.from({ length: low ? 2 : 4 }, (_, i) => (
          <div className={`butterfly-flight butterfly-${i}`} key={i}>
            <div className="butterfly-turn">
              <span className="butterfly-wing wing-left" />
              <span className="butterfly-wing wing-right" />
              <span className="butterfly-body" />
            </div>
            <span className="butterfly-trail" />
          </div>
        ))}
      </div>
      <div className="drifting-petals" aria-hidden="true">
        {Array.from({ length: low ? 5 : 12 }, (_, i) => (
          <i key={i} style={{ "--petal": i } as CSSProperties} />
        ))}
      </div>
      {intro && (
        <div className="microscopic-voyage">
          <div className="voyage-rays" />
          <img className="voyage-cell" src={art.cell} alt="" />
          <img className="voyage-dna" src={art.dna} alt="" />
          <div className="voyage-spark" />
        </div>
      )}
    </div>
  );
}
