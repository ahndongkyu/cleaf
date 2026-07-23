"use client";

import { Children, type ReactNode, useRef, useState } from "react";

type SwipeSummaryDeckProps = {
  labels: string[];
  dark?: boolean;
  children: ReactNode;
  className?: string;
};

export function SwipeSummaryDeck({ labels, dark = false, children, className = "" }: SwipeSummaryDeckProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = slides.length;

  const moveTo = (index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const nextIndex = index % count;
    scroller.scrollTo({ left: scroller.clientWidth * nextIndex, behavior: "smooth" });
    setActiveIndex(nextIndex);
  };

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientWidth === 0) return;
    const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
    setActiveIndex(Math.min(Math.max(index, 0), count - 1));
  };

  if (count === 0) return null;

  return (
    <section className={`relative overflow-hidden ${className}`}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="home-deck-scroll flex snap-x snap-mandatory overflow-x-auto"
      >
        {slides.map((slide, index) => (
          <div key={index} className="w-full shrink-0 snap-center">
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3.5 flex items-center justify-center" role="tablist" aria-label="카드 선택">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`${labels[index]} 기록 보기`}
              onClick={() => moveTo(index)}
              className="flex items-center justify-center p-1"
            >
              <span
                className={`block rounded-full transition-colors ${
                  index === activeIndex
                    ? "h-[5px] w-[5px] bg-accent"
                    : `h-1 w-1 ${dark ? "bg-white/35" : "bg-divider"}`
                }`}
              />
            </button>
          ))}
        </div>
      )}
      <span className="sr-only">{labels[activeIndex]} 기록</span>
    </section>
  );
}
