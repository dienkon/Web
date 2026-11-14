import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import IllustrationScene from "./IllustrationScene";
import type { ComponentProps } from "react";
type Props = ComponentProps<typeof IllustrationScene>;
type Shot = { id: number; props: Props };

export default function CinematicStage(props: Props) {
  const [shots, setShots] = useState<Shot[]>([{ id: 0, props }]);
  const serial = useRef(0),
    root = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    timeline = useRef<gsap.core.Timeline | null>(null);
  useLayoutEffect(() => {
    const snapshot = latest.current;
    setShots((current) => {
      const previous = current[current.length - 1];
      if (previous.props.chapter === props.chapter) {
        if (props.reduced && current.length > 1) {
          timeline.current?.kill();
          return [previous];
        }
        return current;
      }
      timeline.current?.kill();
      const next = { id: ++serial.current, props };
      const outgoing = {
        ...previous,
        props:
          previous.props.chapter === snapshot.chapter
            ? snapshot
            : previous.props,
      };
      return props.reduced ? [next] : [outgoing, next];
    });
  }, [props.chapter, props.reduced]);
  useLayoutEffect(() => {
    latest.current = props;
  });
  useLayoutEffect(() => {
    if (!root.current) return;
    if (shots.length < 2) {
      gsap.set(root.current.querySelector(".scene-shot"), {
        clearProps: "transform,opacity,filter,pointerEvents",
      });
      return;
    }
    const [old, next] = shots,
      outgoing = root.current.querySelector(`[data-shot="${old.id}"]`),
      incoming = root.current.querySelector(`[data-shot="${next.id}"]`);
    if (!outgoing || !incoming) return;
    const forward = next.props.chapter > old.props.chapter,
      direction = forward ? 1 : -1,
      destination = next.props.chapter;
    const collapse = destination === 2 || destination === 5;
    const film = destination === 3;
    const duration = 1.8;
    const tl = gsap.timeline({
      onComplete: () => {
        setShots((current) =>
          current.at(-1)?.id === next.id ? [next] : current,
        );
      },
    });
    timeline.current = tl;
    tl.set(incoming, {
      transformOrigin: collapse ? "68% 48%" : "65% 50%",
      pointerEvents: "none",
    })
      .to(
        outgoing,
        {
          scale: collapse ? 0.28 : film ? 1.2 : 1.4,
          xPercent: collapse ? -8 : -direction * 18,
          yPercent: destination === 4 ? -18 : collapse ? -5 : 0,
          rotation: collapse ? -direction * 13 : -direction * 2,
          opacity: 0,
          filter: "blur(14px) saturate(1.4)",
          duration: 1.35,
          ease: "power2.inOut",
        },
        0,
      )
      .fromTo(
        incoming,
        {
          scale: collapse ? 0.6 : film ? 0.86 : 1.22,
          xPercent: film ? direction * 28 : direction * 8,
          yPercent: destination === 4 ? 16 : 3,
          opacity: 0,
          filter: "blur(16px) saturate(.65)",
        },
        {
          scale: 1,
          xPercent: 0,
          yPercent: 0,
          opacity: 1,
          filter: "blur(0px) saturate(1)",
          duration,
          ease: "power3.inOut",
          clearProps: "pointerEvents",
        },
        0.3,
      );
    const particles = root.current.querySelectorAll(".transit-motes i");
    tl.fromTo(
      particles,
      { x: 0, y: 0, scale: 0, opacity: 0 },
      {
        x: (i) => Math.cos(i * 2.4) * (80 + i * 6),
        y: (i) => Math.sin(i * 2.4) * (60 + i * 4),
        scale: 1.3,
        opacity: 0.8,
        stagger: 0.006,
        duration: 0.6,
        ease: "power2.out",
      },
      0.35,
    ).to(
      particles,
      {
        x: (i) => Math.cos(i * 2.4) * (160 + i * 9),
        y: (i) => Math.sin(i * 2.4) * (120 + i * 6),
        scale: 0.2,
        opacity: 0,
        duration: 1.0,
        ease: "power2.in",
      },
      0.9,
    );
    return () => {
      tl.kill();
    };
  }, [shots]);
  useLayoutEffect(
    () => () => {
      timeline.current?.kill();
    },
    [],
  );
  return (
    <div
      ref={root}
      className="cinematic-stage"
      data-transitioning={shots.length > 1 ? "true" : "false"}
      data-current-chapter={props.chapter}
    >
      {shots.map((shot, index) => (
        <div
          className="scene-shot"
          key={shot.id}
          data-shot={shot.id}
          aria-hidden={index !== shots.length - 1 ? true : undefined}
          inert={index !== shots.length - 1 ? true : undefined}
          style={{ zIndex: index }}
        >
          <IllustrationScene
            {...(shot.props.chapter === props.chapter ? props : shot.props)}
          />
        </div>
      ))}
      <div className="transit-motes" aria-hidden="true">
        {Array.from({ length: 35 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  );
}
