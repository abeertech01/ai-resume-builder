"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import resumePreview from "@/assets/ai-resume-preview.jpg";
import { cn } from "@/lib/utils";

const MAX_TILT_DEG = 9;
// Distance (px) from the motif's center at which the tilt maxes out.
const TILT_RANGE_PX = 500;

const RING_RADIUS = 17;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const ATS_SCORE = 92;

const cardClass =
  "rounded-xl bg-white/90 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-900/90 dark:ring-white/10";

interface Drift {
  x?: number;
  y?: number;
  duration: number;
  delay: number;
}

// The outer element only sets the card's depth (translateZ) so it takes
// part in the parallax when the stage tilts; the inner one only drifts.
// They're separate because both use `transform` and would overwrite
// each other on a single element.
function Floating({
  className,
  depth,
  drift,
  children,
}: {
  className: string;
  depth: number;
  drift: Drift;
  children: ReactNode;
}) {
  const driftStyle = {
    "--drift-x": `${drift.x ?? 0}px`,
    "--drift-y": `${drift.y ?? 0}px`,
    "--drift-duration": `${drift.duration}s`,
    "--drift-delay": `${drift.delay}s`,
  } as CSSProperties;

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute select-none", className)}
      style={{ transform: `translateZ(${depth}px)` }}
    >
      <div className="animate-drift" style={driftStyle}>
        {children}
      </div>
    </div>
  );
}

export default function HeroMotif() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const stage = stageRef.current;
    if (!anchor || !stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));

    function tiltTo(x: number, y: number) {
      stage!.style.transform = `rotateX(${(-y * MAX_TILT_DEG).toFixed(2)}deg) rotateY(${(x * MAX_TILT_DEG).toFixed(2)}deg)`;
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = anchor!.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        tiltTo(clamp(dx / TILT_RANGE_PX), clamp(dy / TILT_RANGE_PX));
      });
    }

    function onPointerLeave() {
      cancelAnimationFrame(frame);
      tiltTo(0, 0);
    }

    window.addEventListener("pointermove", onPointerMove);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );
    };
  }, []);

  return (
    // Everything inside is scaled together by --s (smaller on phones,
    // larger on desktop). This box follows the same scale, so the scaled
    // motif doesn't leave empty space or overflow.
    <div
      ref={anchorRef}
      className="relative h-[calc(420px*var(--s))] w-[calc(350px*var(--s))] shrink-0 [--s:1] max-[380px]:[--s:0.78] max-sm:[--s:0.9] lg:[--s:1.35]"
    >
      <div
        className="absolute top-0 left-0 h-[420px] w-[350px] origin-top-left [perspective:1000px]"
        style={{ transform: "scale(var(--s))" }}
      >
        <div
          ref={stageRef}
          className="relative h-full w-full transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d] motion-reduce:transition-none"
        >
          {/* The resume: upright, small, rounded. */}
          <div className="absolute top-[30px] left-[30px] w-[250px] overflow-hidden rounded-lg shadow-2xl ring-1 shadow-black/20 ring-black/5 dark:shadow-black/60 dark:ring-white/10">
            <Image
              src={resumePreview}
              alt="Resume preview"
              width={250}
              sizes="340px"
              className="block h-auto w-full"
            />
            {/* Highlights the "Developed SME software solutions…" bullet
                (56% down the page) that the AI tag points at. */}
            <span
              aria-hidden
              className="absolute rounded-sm bg-sky-400/25 ring-1 ring-sky-500/60"
              style={{
                left: "2.2%",
                top: "55.4%",
                width: "67%",
                height: "1.7%",
              }}
            />
            <span
              aria-hidden
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "69.3%", top: "56.3%" }}
            >
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative block size-2 rounded-full bg-sky-500" />
            </span>
          </div>

          <Floating
            className="top-0 right-0"
            depth={60}
            drift={{ x: 2, y: -7, duration: 7, delay: -1 }}
          >
            <div
              className={cn(cardClass, "flex items-center gap-2.5 px-3 py-2")}
            >
              <svg viewBox="0 0 44 44" className="size-10 -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="4.5"
                  className="stroke-gray-200 dark:stroke-white/10"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - ATS_SCORE / 100)}
                  className="gauge-ring stroke-emerald-500"
                  style={{ "--ring-c": RING_CIRCUMFERENCE } as CSSProperties}
                />
              </svg>
              <div className="leading-tight">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  ATS score
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  92/100
                </p>
              </div>
            </div>
          </Floating>

          <Floating
            className="top-[216px] left-[215px]"
            depth={50}
            drift={{ x: 4, duration: 6, delay: -3 }}
          >
            <div className="relative rounded-full bg-gradient-to-r from-sky-600 to-sky-400 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg shadow-sky-500/30">
              <span className="absolute top-1/2 right-full h-px w-6 -translate-y-1/2 bg-sky-500" />
              ✨ Rewritten by AI
            </div>
          </Floating>

          <Floating
            className="top-[300px] right-0"
            depth={70}
            drift={{ x: -2, y: 6, duration: 8, delay: -2 }}
          >
            <div
              className={cn(
                cardClass,
                "flex items-center gap-2 px-3 py-2 text-xs font-medium whitespace-nowrap text-gray-800 dark:text-gray-100",
              )}
            >
              Downloaded PDF
              <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            </div>
          </Floating>

          <Floating
            className="bottom-3 left-0"
            depth={40}
            drift={{ x: 3, y: -6, duration: 7.5, delay: -4.5 }}
          >
            <div className={cn(cardClass, "flex gap-1.5 p-2")}>
              {["React", "Next.js", "TypeScript"].map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Floating>
        </div>
      </div>
    </div>
  );
}
