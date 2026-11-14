import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Dna,
  Expand,
  Film,
  Flower2,
  Heart,
  Home,
  Leaf,
  Mail,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { chapters, content, exhibits } from "./content";
import { bouquetUrl } from "./BouquetArtwork";
import DraggableEnvelope from "./DraggableEnvelope";
const Scene = lazy(() => import("./CinematicStage"));
gsap.registerPlugin(ScrollTrigger);

class SceneBoundary extends Component<
  { children: ReactNode; onReady: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onReady();
  }
  render() {
    return this.state.error ? (
      <div className="webgl-fallback">
        <Dna size={130} strokeWidth={0.5} />
        <p>Chế độ nhẹ · Nội dung và lời tri ân vẫn sẵn sàng.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}

function usePreference() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [low, setLow] = useState(
    () => navigator.hardwareConcurrency <= 4 || window.innerWidth < 700,
  );
  return { reduced, setReduced, low, setLow };
}

function readMessages(): { name: string; message: string }[] {
  try {
    const saved = JSON.parse(
      localStorage.getItem("gen-tri-an-messages") || "[]",
    );
    return Array.isArray(saved)
      ? saved
          .filter(
            (m) => typeof m.name === "string" && typeof m.message === "string",
          )
          .slice(-100)
      : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [active, setActive] = useState(0),
    [progress, setProgress] = useState(0),
    [ready, setReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false),
    [artReady, setArtReady] = useState(false),
    [entered, setEntered] = useState(false);
  const [settings, setSettings] = useState(false),
    [modal, setModal] = useState<
      "letter" | "envelope" | "guestbook" | "photo" | null
    >(null);
  const [dnaMode, setDnaMode] = useState("normal"),
    [base, setBase] = useState("A"),
    [exhibit, setExhibit] = useState("dna");
  const [bloom, setBloom] = useState(false),
    [music, setMusic] = useState(false),
    [photoIndex, setPhotoIndex] = useState(0);
  const [intro, setIntro] = useState(false),
    [zoom, setZoom] = useState(1);
  const [resetView, setResetView] = useState(0);
  const [photos, setPhotos] = useState(content.photos),
    [messages, setMessages] = useState(readMessages);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [studentName, setStudentName] = useState(""),
    [studentMessage, setStudentMessage] = useState("");
  const { reduced, setReduced, low, setLow } = usePreference();
  useEffect(() => {
    document.body.classList.toggle("reduce-motion", reduced);
    return () => document.body.classList.remove("reduce-motion");
  }, [reduced]);
  const input = useRef<HTMLInputElement>(null),
    scene = useRef<HTMLDivElement>(null),
    audio = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null),
    uploaded = useRef<string[]>([]),
    modalRef = useRef<HTMLDivElement>(null);
  const readyCallback = useCallback(() => setSceneReady(true), []);
  useEffect(() => {
    const image = new Image();
    let alive = true;
    const finish = () => {
      if (alive) setArtReady(true);
    };
    image.onload = () => {
      image
        .decode()
        .catch(() => undefined)
        .then(finish);
    };
    image.onerror = finish;
    image.src = bouquetUrl;
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (sceneReady && artReady) setReady(true);
  }, [sceneReady, artReady]);
  useEffect(() => {
    if (!ready) return;
    if (reduced) {
      setEntered(true);
      return;
    }
    const context = gsap.context(() => {
      const timeline = gsap.timeline();
      timeline
        .to(
          ".opening-curtain",
          { scaleX: 0, duration: 1.6, stagger: 0.13, ease: "power4.inOut" },
          0.25,
        )
        .fromTo(
          ".opening-burst",
          { scale: 0.08, opacity: 0.85 },
          { scale: 2.2, opacity: 0, duration: 2.7, ease: "power2.out" },
          0.4,
        )
        .to(
          ".loader",
          {
            opacity: 0,
            duration: 0.75,
            ease: "power2.inOut",
            onComplete: () => setEntered(true),
          },
          0.2,
        )
        .fromTo(
          ".scene",
          { opacity: 0.1, scale: 1.12, filter: "blur(14px) saturate(.3)" },
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px) saturate(1.12)",
            duration: 2.6,
            ease: "power3.out",
          },
          0.35,
        )
        .fromTo(
          ".arrival-aurora",
          { opacity: 0, scale: 1.3 },
          { opacity: 1, scale: 1, duration: 3 },
          0.3,
        )
        .fromTo(
          ".hero-content > *",
          { autoAlpha: 0, y: 30, filter: "blur(6px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.35,
            stagger: 0.16,
            ease: "power3.out",
          },
          0.7,
        )
        .fromTo(
          ".header",
          { y: -28, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.3, ease: "power3.out" },
          0.95,
        )
        .fromTo(
          ".bouquet-art",
          { y: 75, rotate: 5, opacity: 0 },
          {
            y: 0,
            rotate: 0,
            opacity: 1,
            duration: 2.2,
            ease: "power3.out",
            clearProps: "opacity,transform",
          },
          1.05,
        );
      document
        .querySelectorAll<HTMLElement>(".chapter:not(.hero) .chapter-content")
        .forEach((panel) => {
          gsap.fromTo(
            panel.children,
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 1.15,
              stagger: 0.075,
              ease: "power3.out",
              scrollTrigger: {
                trigger: panel.parentElement,
                start: "top 64%",
                toggleActions: "play none none reverse",
              },
            },
          );
        });
    });
    return () => context.revert();
  }, [ready, reduced]);
  const onBase = useCallback((value: string) => {
    setBase(value);
  }, []);
  const onPhoto = useCallback((index: number) => {
    setPhotoIndex(index);
    setModal("photo");
  }, []);
  const go = useCallback(
    (index: number) => {
      document
        .getElementById(chapters[index].id)
        ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
    },
    [reduced],
  );
  const finishIntro = useCallback(() => {
    setIntro(false);
    go(1);
  }, [go]);
  useEffect(() => {
    if (!intro) return;
    document.body.dataset.intro = "true";
    const timer = window.setTimeout(finishIntro, 10000);
    return () => {
      delete document.body.dataset.intro;
      window.clearTimeout(timer);
    };
  }, [intro, finishIntro]);
  useEffect(() => {
    setZoom(1);
  }, [active]);

  useEffect(() => {
    const triggers = chapters.map((chapter, index) =>
      ScrollTrigger.create({
        trigger: `#${chapter.id}`,
        start: "top 48%",
        end: "bottom 48%",
        onToggle: (self) => {
          if (self.isActive) setActive(index);
        },
      }),
    );
    const track = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => setProgress(self.progress),
    });
    return () => {
      triggers.forEach((t) => t.kill());
      track.kill();
    };
  }, []);
  useEffect(() => {
    if (!modal) return;
    const old = document.body.style.overflow,
      previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(
      () =>
        modalRef.current?.querySelector<HTMLElement>("button, input")?.focus(),
      20,
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
      if (event.key === "Tab") {
        const items = modalRef.current?.querySelectorAll<HTMLElement>(
          "button, input, textarea, a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          last.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === last) {
          first.focus();
          event.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = old;
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal]);
  useEffect(
    () => () => {
      uploaded.current.forEach(URL.revokeObjectURL);
      audio.current?.pause();
      void audioContext.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(""), 4500);
      return () => window.clearTimeout(timer);
    }
  }, [notice]);

  const toggleMusic = async () => {
    try {
      if (content.backgroundMusic) {
        if (!audio.current) {
          audio.current = new Audio(content.backgroundMusic);
          audio.current.loop = true;
          audio.current.volume = 0.3;
        }
        if (music) audio.current.pause();
        else await audio.current.play();
      } else {
        if (!audioContext.current) {
          const ctx = new AudioContext();
          audioContext.current = ctx;
          const gain = ctx.createGain();
          gain.gain.value = 0.035;
          gain.connect(ctx.destination);
          [130.81, 196, 261.63, 329.63].forEach((f) => {
            const oscillator = ctx.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.value = f;
            oscillator.connect(gain);
            oscillator.start();
          });
        }
        if (music) await audioContext.current.suspend();
        else await audioContext.current.resume();
      }
      setMusic(!music);
    } catch {
      setNotice("Chưa thể mở âm thanh. Hãy kiểm tra tệp nhạc trong cấu hình.");
    }
  };
  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files)
      .filter(
        (file) =>
          ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
            file.type,
          ) && file.size <= 15 * 1024 * 1024,
      )
      .slice(0, 24);
    if (!valid.length) {
      setNotice("Chọn ảnh JPG, PNG, WebP hoặc AVIF, tối đa 15 MB mỗi ảnh.");
      return;
    }
    const urls = valid.map((file) => URL.createObjectURL(file));
    uploaded.current.push(...urls);
    setPhotos((p) => [...p, ...urls]);
    setNotice(
      `Đã thêm ${valid.length} ảnh. Ảnh chỉ được mở trên thiết bị này.`,
    );
    if (input.current) input.current.value = "";
  };
  const currentExhibit = exhibits.find((e) => e.id === exhibit)!;
  const openLetter = () => setModal("envelope");
  const readLetter = useCallback(() => setModal("letter"), []);

  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung
      </a>
      <div className="scene" ref={scene}>
        <SceneBoundary onReady={readyCallback}>
          <Suspense fallback={null}>
            <Scene
              chapter={active}
              reduced={reduced}
              low={low}
              dnaMode={dnaMode}
              exhibit={exhibit}
              bloom={bloom}
              photos={photos}
              zoom={zoom}
              resetView={resetView}
              intro={intro}
              onIntroEnd={finishIntro}
              onPhoto={onPhoto}
              onBase={onBase}
              onReady={readyCallback}
              onReadLetter={readLetter}
            />
          </Suspense>
        </SceneBoundary>
      </div>
      <div className="atmosphere" />
      <div className="arrival-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="grain" />
      {!reduced && (
        <div className="opening-theatre" aria-hidden="true">
          <div className="opening-curtain curtain-left" />
          <div className="opening-curtain curtain-right" />
          <div className="opening-burst" />
        </div>
      )}
      {!entered && (
        <div
          className="loader"
          role="status"
          aria-label="Đang mở hành trình tri ân"
        >
          <div className="loader-aura" />
          <div className="loader-orbits" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="loader-helix" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} style={{ "--rung": i } as React.CSSProperties} />
            ))}
          </div>
          <Leaf size={42} strokeWidth={0.8} />
          <span>GEN TRI ÂN</span>
          <i />
          <p>Chạm ánh sáng. Đánh thức một thế giới nhỏ…</p>
          <small className="loader-story">
            MỘT HẠT MẦM · MỘT HÀNH TRÌNH · NGÀN LỜI CẢM ƠN
          </small>
        </div>
      )}

      <header className="header">
        <a href="#origin" className="brand" aria-label="Gen Tri Ân — Trang đầu">
          <span className="brand-mark">
            <Leaf size={26} strokeWidth={1} />
            <Leaf size={22} strokeWidth={1} />
          </span>
          <span>
            GEN <b>TRI ÂN</b>
            <small>KHI TRI THỨC NỞ HOA</small>
          </span>
        </a>
        <span className="nav-divider" />
        <nav aria-label="Điều hướng chính">
          {[
            { icon: Home, title: "Khởi nguồn", index: 0 },
            { icon: Dna, title: "Khám phá", index: 1 },
            { icon: Film, title: "Kỷ niệm", index: 3 },
            { icon: Flower2, title: "Tri ân", index: 4 },
          ].map(({ icon: Icon, title, index }) => (
            <button
              key={index}
              onClick={() => go(index)}
              className={
                active === index ||
                (index === 1 && active === 2) ||
                (index === 4 && active === 5)
                  ? "nav-item selected"
                  : "nav-item"
              }
            >
              <Icon size={17} strokeWidth={1.4} />
              <span>{title}</span>
            </button>
          ))}
        </nav>
        <button className="letter-nav" onClick={openLetter}>
          <Mail size={16} strokeWidth={1.4} />
          <span>Gửi thầy một lời</span>
          <ArrowUpRight />
        </button>
      </header>

      <aside className="chapter-dots" aria-label="Các chương">
        {chapters.map((chapter, i) => (
          <button
            key={chapter.id}
            onClick={() => go(i)}
            aria-label={`${i + 1}. ${chapter.name}`}
            aria-current={active === i ? "step" : undefined}
            className={active === i ? "current" : ""}
          >
            <span>{chapter.name}</span>
            <i />
          </button>
        ))}
        <b>
          {String(active + 1).padStart(2, "0")}
          <em>/ 06</em>
        </b>
      </aside>

      <main id="main" aria-busy={!ready}>
        <section id="origin" className="chapter hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span />
              MỪNG NGÀY NHÀ GIÁO VIỆT NAM
              <span />
            </div>
            <h1>GEN TRI ÂN</h1>
            <p className="script hero-script">Khi tri thức nở hoa</p>
            <div className="date-mark">
              <i />
              <span>
                <BookOpen size={24} strokeWidth={1} />
                <b>
                  20 <em>/</em> 11
                </b>
              </span>
              <i />
            </div>
            <p className="hero-description">
              Từ một hạt mầm tri thức,
              <br />
              đến muôn vàn điều tốt đẹp thầy đã gieo.
            </p>
            <button
              className="button primary"
              onClick={() => {
                if (reduced) go(1);
                else setIntro(true);
              }}
            >
              <Sparkles size={16} strokeWidth={1.4} />
              Bắt đầu hành trình
              <ArrowRight size={17} />
            </button>
            <button className="hero-letter" onClick={openLetter}>
              <Mail size={14} />
              Có một lời cảm ơn, dành riêng cho thầy
              <ChevronRight size={13} />
            </button>
          </div>
          <div className="hero-bottom">
            <span className="tiny-orbit" />
            <p>
              MỘT HÀNH TRÌNH CỦA SỰ SỐNG<span>Một món quà từ trái tim</span>
            </p>
          </div>
          <button className="scroll-prompt" onClick={() => go(1)}>
            <span>CUỘN ĐỂ KHÁM PHÁ</span>
            <ArrowDown size={16} strokeWidth={1} />
          </button>
          <span className="hero-side-note">SCIENCE MEETS GRATITUDE</span>
        </section>

        <section id="dna" className="chapter">
          <div className="chapter-content">
            <p className="chapter-kicker">01 — MẬT MÃ SỰ SỐNG</p>
            <h2>
              Mọi điều lớn lao
              <br />
              bắt đầu từ <em>rất nhỏ.</em>
            </h2>
            <p className="body-copy">
              Trong mỗi tế bào là một câu chuyện. Trên từng vòng xoắn ADN là mật
              mã của sự sống — và khởi đầu của những bài học thầy đã trao.
            </p>
            <div className="segmented" aria-label="Chế độ ADN">
              {[
                ["normal", "Cấu trúc"],
                ["unwind", "Tháo xoắn"],
                ["replicate", "Nhân đôi"],
              ].map(([id, name]) => (
                <button
                  key={id}
                  className={dnaMode === id ? "chosen" : ""}
                  onClick={() => setDnaMode(id)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="science-note">
              <span className="base-symbol">{base}</span>
              <div>
                <strong>
                  {base === "A"
                    ? "Adenine"
                    : base === "T"
                      ? "Thymine"
                      : base === "G"
                        ? "Guanine"
                        : "Cytosine"}
                </strong>
                <p>
                  {base === "A" || base === "T"
                    ? "A–T · 2 liên kết hydrogen"
                    : "G–C · 3 liên kết hydrogen"}
                </p>
              </div>
            </div>
            <div className="base-picker" aria-label="Chọn nucleotide">
              {["A", "T", "G", "C"].map((value) => (
                <button
                  key={value}
                  aria-pressed={base === value}
                  aria-label={`Base ${value}`}
                  onClick={() => setBase(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="model-explanation">
              {dnaMode === "normal"
                ? "Hai mạch ngược chiều 5′–3′ và 3′–5′. Chọn A, T, G hoặc C để xem nguyên tắc bổ sung. Tranh là minh họa nghệ thuật."
                : dnaMode === "unwind"
                  ? "Hai mạch tách nhau khi liên kết hydrogen giữa các base bị phá vỡ. Hiệu ứng tách ảnh chỉ gợi ý chuyển động, không mô phỏng cấu trúc phân tử."
                  : "Mỗi ADN con chứa một mạch cũ và một mạch mới: bán bảo tồn. ADN polymerase tổng hợp theo chiều 5′ → 3′; mạch chậm gồm các đoạn Okazaki. Tranh chỉ minh họa ý tưởng; màu và hình dạng không phải dữ liệu cấu trúc phân tử."}
            </p>
            <div className="interaction-hint">
              <RotateCcw size={14} />
              Kéo để dịch chuyển tranh <span>·</span>
              <Expand size={14} />
              Nút + / − để thu phóng
            </div>
            <button className="text-button" onClick={() => go(2)}>
              Bước vào vũ trụ sinh học
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section id="universe" className="chapter universe">
          <div className="chapter-content">
            <p className="chapter-kicker">02 — VŨ TRỤ SINH HỌC</p>
            <h2>
              Mỗi bài học,
              <br />
              một <em>thế giới mới.</em>
            </h2>
            <p className="body-copy">
              Những khái niệm trên trang sách, giờ có thể chạm đến. Chọn một chủ
              đề và để trí tò mò dẫn lối.
            </p>
            <div className="exhibit-picker" aria-label="Chọn chủ đề minh họa">
              {exhibits.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setExhibit(item.id)}
                  className={item.id === exhibit ? "chosen" : ""}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {item.title}
                </button>
              ))}
            </div>
            <div className="exhibit-info" aria-live="polite">
              <span>{currentExhibit.tag}</span>
              <h3>{currentExhibit.title}</h3>
              <p>{currentExhibit.text}</p>
              <small>{currentExhibit.note}</small>
            </div>
          </div>
        </section>

        <section id="memories" className="chapter memories">
          <div className="chapter-content">
            <p className="chapter-kicker">03 — MIỀN KÝ ỨC</p>
            <h2>
              Có những ngày,
              <br />
              mãi là <em>thanh xuân.</em>
            </h2>
            <p className="body-copy">
              Một lời giảng, một nụ cười, một khoảnh khắc cả lớp cùng nhau.
              Những thước phim bé nhỏ, lưu lại những điều thật lớn.
            </p>
            <button
              className="button outline"
              onClick={() => input.current?.click()}
            >
              <Upload size={16} />
              Thêm ảnh của lớp
              <Plus size={16} />
            </button>
            <p className="privacy-note">
              Ảnh chỉ được mở trên thiết bị của bạn.
              <br />
              Không tải lên máy chủ.
            </p>
            {photos.length > 0 && (
              <div className="photo-thumbnails">
                {photos.slice(0, 5).map((photo, index) => (
                  <button
                    key={photo}
                    onClick={() => onPhoto(index)}
                    aria-label={`Mở ảnh ${index + 1}`}
                  >
                    <img src={photo} alt={`Kỷ niệm ${index + 1}`} />
                  </button>
                ))}
                <span>{photos.length} kỷ niệm</span>
              </div>
            )}
            <div className="film-caption">
              <Film size={16} />
              <span>
                {photos.length
                  ? "Chạm vào khung phim để xem kỷ niệm"
                  : "Những khung phim đang chờ câu chuyện của chúng mình"}
              </span>
            </div>
          </div>
        </section>

        <section id="bloom" className="chapter">
          <div className="chapter-content">
            <p className="chapter-kicker">04 — TRI THỨC NỞ HOA</p>
            <h2>
              Từ hạt mầm thầy gieo,
              <br />
              <em>chúng em nở hoa.</em>
            </h2>
            <p className="body-copy">
              Mỗi cánh hoa là một lời cảm ơn. Vì sự kiên nhẫn, vì niềm tin, vì
              những điều thầy đã âm thầm trao gửi.
            </p>
            <p className="script bloom-script">
              Kính tặng thầy, bằng cả trái tim.
            </p>
            <button
              className={`button primary ${bloom ? "sent" : ""}`}
              onClick={() => {
                setBloom(!bloom);
                if (!bloom)
                  setNotice(
                    "Một bó hoa, ngàn lời cảm ơn. Chúc thầy một ngày 20/11 thật đẹp!",
                  );
              }}
            >
              {bloom ? <Check size={17} /> : <Flower2 size={17} />}
              {bloom ? "Bó hoa đã nở vì thầy" : "Gửi thầy bó hoa này"}
              <Heart size={16} fill={bloom ? "currentColor" : "none"} />
            </button>
            <p className="privacy-note">
              Một chuyển cảnh nghệ thuật về lòng biết ơn.
            </p>
          </div>
        </section>

        <section id="gratitude" className="chapter">
          <div className="chapter-content">
            <p className="chapter-kicker">05 — LỜI TRI ÂN</p>
            <h2>
              Điều đẹp nhất,
              <br />
              là được <em>gặp thầy.</em>
            </h2>
            <p className="body-copy">
              Có những lời, ngày thường chúng em ngại nói.
              <br />
              Hôm nay, xin gửi trọn trong lá thư này. Giữ mép giấy và kéo lên để
              mở phong bì.
            </p>
            <button className="button primary" onClick={openLetter}>
              <Mail size={17} />
              Mở lá thư gửi thầy
              <ArrowRight size={17} />
            </button>
            <button
              className="text-button"
              onClick={() => setModal("guestbook")}
            >
              <BookOpen size={16} />
              Viết thêm một lời nhắn
            </button>
            <div className="signature">
              <span>Với tất cả yêu thương,</span>
              <p>{content.className}</p>
              {content.schoolName && <small>{content.schoolName}</small>}
            </div>
            <button className="back-start" onClick={() => go(0)}>
              <RotateCcw size={13} />
              Trở về nơi bắt đầu
            </button>
          </div>
        </section>
      </main>

      {intro && (
        <div className="intro-overlay">
          <div>
            <p className="chapter-kicker">THE ORIGIN — KHỞI NGUỒN</p>
            <h2>
              Một thế giới nhỏ.
              <br />
              <em>Muôn điều kỳ diệu.</em>
            </h2>
            <span className="intro-progress" />
            <p className="intro-caption">
              Phân tử · Tế bào · Nhân · Chất nhiễm sắc
            </p>
          </div>
          <button onClick={finishIntro}>
            Bỏ qua hoạt ảnh
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      {(active === 1 || active === 2) && (
        <div className="model-tools" aria-label="Điều khiển tranh">
          <button
            aria-label="Thu nhỏ tranh"
            disabled={zoom <= 0.6}
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
          >
            <Minus size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Phóng to tranh"
            disabled={zoom >= 1.6}
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.2))}
          >
            <Plus size={16} />
          </button>
          <i />
          <button
            aria-label="Đặt lại tranh"
            onClick={() => {
              setZoom(1);
              setDnaMode("normal");
              setBase("A");
              setResetView((value) => value + 1);
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      )}

      <footer className="bottom-bar">
        <div className="chapter-label">
          <span>{String(active + 1).padStart(2, "0")}</span>
          <i />
          <p>{chapters[active].en}</p>
        </div>
        <div className="journey-line">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="bottom-controls">
          <button
            aria-label={music ? "Tắt nhạc" : "Bật nhạc nền"}
            title={music ? "Tắt nhạc" : "Bật âm thanh nền"}
            onClick={() => void toggleMusic()}
          >
            {music ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>Âm thanh {music ? "bật" : "tắt"}</span>
          </button>
          <span className="control-divider" />
          <button
            aria-label="Tùy chỉnh trải nghiệm"
            title="Tùy chỉnh trải nghiệm"
            onClick={() => setSettings(!settings)}
          >
            <Settings2 size={16} />
          </button>
          <button
            aria-label="Toàn màn hình"
            title="Toàn màn hình"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else
                void document.documentElement
                  .requestFullscreen()
                  .catch(() =>
                    setNotice("Trình duyệt chưa hỗ trợ toàn màn hình."),
                  );
            }}
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </footer>
      {settings && (
        <div className="settings-panel">
          <div>
            <h3>Nhịp điệu của bạn</h3>
            <button
              aria-label="Đóng tùy chỉnh"
              onClick={() => setSettings(false)}
            >
              <X size={17} />
            </button>
          </div>
          <button
            className="setting-row"
            aria-pressed={reduced}
            onClick={() => setReduced(!reduced)}
          >
            <span>
              {reduced ? <Pause size={16} /> : <Play size={16} />}Giảm chuyển
              động
            </span>
            <i className={reduced ? "switch on" : "switch"} />
          </button>
          <button
            className="setting-row"
            aria-pressed={low}
            onClick={() => setLow(!low)}
          >
            <span>
              <Sparkles size={16} />
              Chế độ nhẹ
            </span>
            <i className={low ? "switch on" : "switch"} />
          </button>
          <button
            className="text-button"
            onClick={() => {
              go(5);
              setSettings(false);
            }}
          >
            Bỏ qua đến lời tri ân
            <ArrowRight size={14} />
          </button>
        </div>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={(e) => addPhotos(e.target.files)}
      />
      {notice && (
        <div className="toast" role="status">
          <Sparkles size={16} />
          <span>{notice}</span>
          <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            ref={modalRef}
            className={`modal ${modal === "photo" ? "photo-modal" : ""} ${modal === "letter" ? "letter-modal" : ""} ${modal === "envelope" ? "envelope-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close"
              aria-label="Đóng"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "envelope" && (
              <>
                <h2 id="modal-title">
                  Một lá thư <em>chờ thầy mở.</em>
                </h2>
                <p className="envelope-modal-note">
                  Giữ mép giấy, kéo lên rồi thả tay. Có thể dùng phím ↑ hoặc
                  Enter.
                </p>
                <DraggableEnvelope onRead={readLetter} reduced={reduced} />
              </>
            )}
            {modal === "letter" && (
              <>
                <div className="letter-flourish">
                  <Leaf size={28} strokeWidth={0.8} />
                </div>
                <p className="chapter-kicker">NHÂN NGÀY NHÀ GIÁO VIỆT NAM</p>
                <h2 id="modal-title">
                  Một lá thư, <em>ngàn lời cảm ơn.</em>
                </h2>
                <div className="letter-date">20 tháng 11</div>
                <h3 className="salutation">{content.teacherName},</h3>
                {content.greetings.map((text, i) => (
                  <p className="letter-paragraph" key={i}>
                    {text}
                  </p>
                ))}
                <p className="letter-signature">{content.className}</p>
                <button
                  className="button ink"
                  onClick={() => setModal("guestbook")}
                >
                  <BookOpen size={15} />
                  Để lại một lời nhắn
                  <ArrowRight size={16} />
                </button>
              </>
            )}
            {modal === "guestbook" && (
              <>
                <p className="chapter-kicker">NHỮNG ĐIỀU MUỐN NÓI</p>
                <h2 id="modal-title">
                  Lưu bút <em>gửi thầy.</em>
                </h2>
                <p className="guestbook-intro">
                  Lời nhắn được lưu trong trình duyệt này. Bạn có thể tải xuống
                  để gửi tặng thầy.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = studentName.trim(),
                      message = studentMessage.trim();
                    if (!name || !message) return;
                    const next = [...messages, { name, message }];
                    try {
                      localStorage.setItem(
                        "gen-tri-an-messages",
                        JSON.stringify(next),
                      );
                      setMessages(next);
                      setStudentName("");
                      setStudentMessage("");
                      setError("");
                    } catch {
                      setError(
                        "Bộ nhớ trình duyệt đã đầy. Hãy tải lưu bút xuống trước.",
                      );
                    }
                  }}
                >
                  <label>
                    Tên của bạn
                    <input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Một người học trò của thầy"
                      maxLength={80}
                      required
                    />
                  </label>
                  <label>
                    Điều bạn muốn gửi gắm
                    <textarea
                      value={studentMessage}
                      onChange={(e) => setStudentMessage(e.target.value)}
                      placeholder="Cảm ơn thầy vì…"
                      maxLength={2000}
                      rows={4}
                      required
                    />
                  </label>
                  {error && <p role="alert">{error}</p>}
                  <button className="button primary" type="submit">
                    <Heart size={15} />
                    Lưu lời nhắn
                  </button>
                </form>
                <div className="student-messages">
                  {[...content.studentMessages, ...messages].map((item, i) => (
                    <blockquote key={i}>
                      <p>{item.message}</p>
                      <cite>— {item.name}</cite>
                    </blockquote>
                  ))}
                </div>
                {messages.length > 0 && (
                  <button
                    className="text-button"
                    onClick={() => {
                      const text = [...content.studentMessages, ...messages]
                        .map((m) => `${m.name}\n${m.message}`)
                        .join("\n\n");
                      const url = URL.createObjectURL(
                        new Blob([`GEN TRI ÂN — Lưu bút 20/11\n\n${text}`], {
                          type: "text/plain;charset=utf-8",
                        }),
                      );
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = "Luu-but-20-11.txt";
                      anchor.click();
                      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    Tải lưu bút xuống
                    <ArrowDown size={15} />
                  </button>
                )}
              </>
            )}
            {modal === "photo" && (
              <>
                <h2 id="modal-title" className="photo-title">
                  Một khoảnh khắc <em>để nhớ.</em>
                </h2>
                {photos.length ? (
                  <img
                    className="lightbox-image"
                    src={photos[photoIndex % photos.length]}
                    alt={
                      content.photoCaptions[
                        photoIndex % content.photoCaptions.length
                      ]
                    }
                  />
                ) : (
                  <div className="empty-photo">
                    <Film size={65} strokeWidth={0.7} />
                    <p>Khung hình dành cho kỷ niệm của lớp</p>
                    <button
                      className="button outline"
                      onClick={() => input.current?.click()}
                    >
                      <Upload size={16} />
                      Chọn ảnh đầu tiên
                    </button>
                  </div>
                )}
                <div className="photo-navigation">
                  <button
                    aria-label="Ảnh trước"
                    onClick={() =>
                      setPhotoIndex(
                        (photoIndex - 1 + Math.max(photos.length, 4)) %
                          Math.max(photos.length, 4),
                      )
                    }
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <p>
                    {
                      content.photoCaptions[
                        photoIndex % content.photoCaptions.length
                      ]
                    }
                    <small>
                      {(photoIndex % Math.max(photos.length, 4)) + 1} /{" "}
                      {Math.max(photos.length, 4)}
                    </small>
                  </p>
                  <button
                    aria-label="Ảnh tiếp theo"
                    onClick={() =>
                      setPhotoIndex(
                        (photoIndex + 1) % Math.max(photos.length, 4),
                      )
                    }
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ArrowUpRight() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M2 10 10 2M3 2h7v7" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
