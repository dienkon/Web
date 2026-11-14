import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { ArrowUp, Leaf, RotateCcw } from "lucide-react";
import { content } from "./content";

export default function DraggableEnvelope({
  onRead,
  reduced,
}: {
  onRead: () => void;
  reduced: boolean;
}) {
  const [pull, setPull] = useState(0),
    [dragging, setDragging] = useState(false),
    [opened, setOpened] = useState(false),
    [extracting, setExtracting] = useState(false);
  const origin = useRef<{ y: number; pull: number } | null>(null),
    value = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const area = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const update = (next: number) => {
    value.current = Math.max(0, Math.min(1, next));
    setPull(value.current);
  };
  const extract = () => {
    if (extracting || opened) return;
    update(1);
    setDragging(false);
    setExtracting(true);
    timer.current = setTimeout(
      () => {
        setOpened(true);
        setExtracting(false);
        onRead();
      },
      reduced ? 0 : 950,
    );
  };
  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (!origin.current) return;
    origin.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (value.current >= 0.7) extract();
    else update(0);
  };
  return (
    <div
      ref={area}
      className={`tactile-envelope ${dragging ? "is-dragging" : ""} ${extracting ? "is-extracting" : ""} ${opened ? "is-opened" : ""}`}
      style={{ "--pull": pull } as CSSProperties}
      data-envelope-state={
        opened
          ? "opened"
          : extracting
            ? "extracting"
            : dragging
              ? "dragging"
              : "ready"
      }
    >
      <div className="envelope-shadow" />
      <div className="envelope-pocket" />
      <div
        className="envelope-flap"
        aria-hidden="true"
        style={{ zIndex: pull > 0.12 ? 1 : 3 }}
      >
        <Leaf size={30} strokeWidth={0.7} />
      </div>
      <div
        className="pullable-letter"
        role="slider"
        tabIndex={opened ? -1 : 0}
        aria-label="Kéo lá thư lên để mở"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pull * 100)}
        aria-orientation="vertical"
        aria-valuetext={
          opened
            ? "Lá thư đã mở"
            : `${Math.round(pull * 100)} phần trăm. Kéo lên hoặc dùng phím mũi tên lên, Enter để rút thư.`
        }
        onPointerDown={(event) => {
          if (opened || extracting || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          origin.current = { y: event.clientY, pull: value.current };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!origin.current) return;
          const distance = Math.max(
            110,
            (area.current?.getBoundingClientRect().height ?? 500) * 0.42,
          );
          update(
            origin.current.pull + (origin.current.y - event.clientY) / distance,
          );
        }}
        onPointerUp={release}
        onPointerCancel={() => {
          origin.current = null;
          setDragging(false);
          if (!opened && !extracting) update(0);
        }}
        onKeyDown={(event) => {
          if (opened || extracting) return;
          if (
            ["ArrowUp", "ArrowDown", "Home", "End", "Enter", " "].includes(
              event.key,
            )
          )
            event.preventDefault();
          if (event.key === "ArrowUp") update(value.current + 0.15);
          if (event.key === "ArrowDown") update(value.current - 0.15);
          if (event.key === "Home") update(0);
          if (event.key === "End" || event.key === "Enter" || event.key === " ")
            extract();
        }}
      >
        <span className="paper-grip" />
        <Leaf className="paper-leaf" size={27} strokeWidth={0.7} />
        <small>20 THÁNG 11</small>
        <h3>
          Gửi thầy,
          <br />
          <em>ngàn lời biết ơn.</em>
        </h3>
        <div className="paper-rule" />
        <p>{content.greetings[0]}</p>
        <span className="paper-signature">{content.className}</span>
        <span className="paper-fold" />
      </div>
      <img
        className="envelope-photo-front"
        src="./assets/letter-art.webp"
        alt="Phong bì giấy hồng với dấu sáp vàng"
        draggable={false}
      />
      <div className="envelope-instruction" aria-live="polite">
        {opened ? (
          <button onClick={onRead}>Đọc lại lá thư</button>
        ) : extracting ? (
          <span>Một lá thư, ngàn lời cảm ơn…</span>
        ) : (
          <>
            <ArrowUp size={16} />
            <span>
              {dragging
                ? pull >= 0.7
                  ? "Thả tay để mở thư"
                  : "Kéo thêm một chút nữa…"
                : "Giữ mép giấy và kéo lên"}
            </span>
          </>
        )}
      </div>
      <button
        className="envelope-reset"
        aria-label="Xếp thư lại vào phong bì"
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          origin.current = null;
          setDragging(false);
          setExtracting(false);
          setOpened(false);
          update(0);
        }}
      >
        <RotateCcw size={13} />
        <span>Xếp thư lại</span>
      </button>
    </div>
  );
}
