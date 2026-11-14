export const bouquetUrl = "./assets/bouquet-roses.webp";

export default function BouquetArtwork({
  chapter,
  sent,
  reduced,
}: {
  chapter: number;
  sent: boolean;
  reduced: boolean;
}) {
  const visible = chapter === 0 || chapter === 4;
  return (
    <div
      className={`bouquet-art ${chapter === 0 ? "bouquet-hero" : "bouquet-feature"} ${visible ? "is-visible" : ""} ${sent ? "is-sent" : ""} ${reduced ? "is-still" : ""}`}
      aria-hidden="true"
    >
      <div className="bouquet-halo" />
      <div className="bouquet-float">
        <img
          src={bouquetUrl}
          width={1136}
          height={1384}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
      </div>
      <div className="petal-drift">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} style={{ "--petal": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
