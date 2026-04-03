"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { EmblaCarouselType, EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import {
  NextButton,
  PrevButton,
  usePrevNextButtons,
} from "./embla-carousel-arrow-buttons";
import { DotButton, useDotButton } from "./embla-carousel-dot-button";

const TWEEN_FACTOR_BASE = 0.2;

export type HeroCarouselSlide = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
};

const HERO_SLIDES: HeroCarouselSlide[] = [
    {
        eyebrow: "Calendar Management",
        title: "Streamline scheduling with an intuitive calendar view.",
        description:
            "Manage appointments effortlessly with real-time availability, automated reminders, and seamless provider coordination for a seamless booking experience.",
        image:
            "/screens/calendar.png",
    },
    {
        eyebrow: "Treatment Rooms",
        title: "Operate every room with clarity, timing, and confidence.",
        description:
            "Coordinate providers, services, and appointment pacing so every treatment feels prepared and every handoff stays smooth.",
        image:
          "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=2400&q=100",
    },
    {
        eyebrow: "Retail + Ambience",
        title: "Support modern med spas with a more refined operating system.",
        description:
            "Unify bookings, follow-up, and team visibility in a platform designed to feel luxurious for staff and effortless for clients.",
        image:
          "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=2400&q=100",
    },
];

type HeroCarouselProps = Readonly<{
  prefersReducedMotion: boolean;
  options?: EmblaOptionsType;
}>;

type EmblaEngine = ReturnType<EmblaCarouselType["internalEngine"]>;

function getLoopAdjustedDiff(
  engine: EmblaEngine,
  scrollSnap: number,
  scrollProgress: number,
  slideIndex: number,
) {
  if (!engine.options.loop) {
    return scrollSnap - scrollProgress;
  }

  for (const loopItem of engine.slideLooper.loopPoints) {
    const target = loopItem.target();

    if (slideIndex !== loopItem.index || target === 0) {
      continue;
    }

    const sign = Math.sign(target);

    if (sign === -1) {
      return scrollSnap - (1 + scrollProgress);
    }

    if (sign === 1) {
      return scrollSnap + (1 - scrollProgress);
    }
  }

  return scrollSnap - scrollProgress;
}

function getSlideDistance(index: number, selectedIndex: number, totalSlides: number) {
  const rawDistance = index - selectedIndex;

  if (Math.abs(rawDistance) <= totalSlides / 2) {
    return rawDistance;
  }

  return rawDistance > 0 ? rawDistance - totalSlides : rawDistance + totalSlides;
}

function updateLoadedSlides(currentState: boolean[], index: number) {
  if (currentState[index]) {
    return currentState;
  }

  const nextState = [...currentState];
  nextState[index] = true;
  return nextState;
}

function markSlideAsLoaded(
  setLoadedSlides: Dispatch<SetStateAction<boolean[]>>,
  index: number,
) {
  setLoadedSlides((currentState) => updateLoadedSlides(currentState, index));
}

function getTiltedSlideStyle(
  index: number,
  selectedIndex: number,
  prefersReducedMotion: boolean,
  totalSlides: number,
): CSSProperties {
  if (prefersReducedMotion) {
    return {
      opacity: 1,
      transform: "none",
      zIndex: totalSlides,
    };
  }

  const distance = getSlideDistance(index, selectedIndex, totalSlides);
  const clampedDistance = Math.max(-1, Math.min(1, distance));
  const isCentered = distance === 0;
  const rotateY = clampedDistance * -12;
  const rotateZ = clampedDistance * -0.6;
  const translateY = Math.abs(clampedDistance) * 10;
  const scale = isCentered ? 1 : 0.96;

  return {
    opacity: isCentered ? 1 : 0.82,
    transform: `perspective(1600px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translateY(${translateY}px) scale(${scale})`,
    transformOrigin: clampedDistance < 0 ? "right center" : "left center",
    zIndex: totalSlides - Math.abs(distance),
  };
}

export function HeroCarousel({
  prefersReducedMotion,
  options,
}: HeroCarouselProps) {
  const [loadedSlides, setLoadedSlides] = useState<boolean[]>(() =>
    HERO_SLIDES.map(() => false),
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: true,
    skipSnaps: false,
    ...options,
  });
  const tweenFactor = useRef(0);
  const tweenNodes = useRef<HTMLElement[]>([]);

  const { selectedIndex, scrollSnaps, onDotButtonClick } = useDotButton(emblaApi);
  const {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
  } = usePrevNextButtons(emblaApi);

  const setTweenNodes = useCallback((api: EmblaCarouselType) => {
    tweenNodes.current = api.slideNodes().map((slideNode) => {
      const tweenNode = slideNode.querySelector<HTMLElement>("[data-parallax-layer]");

      if (!tweenNode) {
        throw new Error("Parallax layer not found for hero slide.");
      }

      return tweenNode;
    });
  }, []);

  const setTweenFactor = useCallback((api: EmblaCarouselType) => {
    tweenFactor.current = TWEEN_FACTOR_BASE * api.scrollSnapList().length;
  }, []);

  const tweenParallax = useCallback(
    (api: EmblaCarouselType, eventName?: string) => {
      const engine = api.internalEngine();
      const scrollProgress = api.scrollProgress();
      const slidesInView = api.slidesInView();
      const isScrollEvent = eventName === "scroll";

      for (const [snapIndex, scrollSnap] of api.scrollSnapList().entries()) {
        const slidesInSnap = engine.slideRegistry[snapIndex];

        for (const slideIndex of slidesInSnap) {
          if (isScrollEvent && !slidesInView.includes(slideIndex)) {
            continue;
          }

          const diffToTarget = getLoopAdjustedDiff(
            engine,
            scrollSnap,
            scrollProgress,
            slideIndex,
          );
          const translate = diffToTarget * (-100 * tweenFactor.current);
          const tweenNode = tweenNodes.current[slideIndex];

          if (tweenNode) {
            tweenNode.style.transform = `translate3d(${translate}%, 0, 0)`;
          }
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    setTweenNodes(emblaApi);
    setTweenFactor(emblaApi);
    tweenParallax(emblaApi);

    emblaApi
      .on("reInit", setTweenNodes)
      .on("reInit", setTweenFactor)
      .on("reInit", tweenParallax)
      .on("scroll", tweenParallax)
      .on("slideFocus", tweenParallax);

    return () => {
      emblaApi
        .off("reInit", setTweenNodes)
        .off("reInit", setTweenFactor)
        .off("reInit", tweenParallax)
        .off("scroll", tweenParallax)
        .off("slideFocus", tweenParallax);
    };
  }, [emblaApi, setTweenFactor, setTweenNodes, tweenParallax]);

  useEffect(() => {
    const preloaders = HERO_SLIDES.map((slide, index) => {
      const preloader = new globalThis.Image();

      preloader.src = slide.image;
      preloader.decoding = "async";
      preloader.onload = () => markSlideAsLoaded(setLoadedSlides, index);
      preloader.onerror = () => markSlideAsLoaded(setLoadedSlides, index);

      if (preloader.complete) {
        markSlideAsLoaded(setLoadedSlides, index);
      }

      return preloader;
    });

    return () => {
      preloaders.forEach((preloader) => {
        preloader.onload = null;
        preloader.onerror = null;
      });
    };
  }, []);

  const slideStyles = useMemo(
    () =>
      HERO_SLIDES.map((_, index) =>
        getTiltedSlideStyle(
          index,
          selectedIndex,
          prefersReducedMotion,
          HERO_SLIDES.length,
        ),
      ),
    [prefersReducedMotion, selectedIndex],
  );

  return (
    <div className="relative w-full lg:max-w-[72rem]">
      <div className="overflow-visible" ref={emblaRef}>
        <div className="flex touch-pan-y items-start lg:-mx-6">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.eyebrow}
              className="min-w-0 flex-[0_0_86%] px-2 sm:flex-[0_0_78%] lg:flex-[0_0_72%] lg:px-6"
            >
              <div
                className="relative min-h-[18.5rem] overflow-hidden rounded-[1.85rem] border border-white/50 bg-[linear-gradient(135deg,rgba(118,92,58,0.24),rgba(245,237,227,0.95))] shadow-[0_28px_70px_-42px_rgba(67,45,18,0.55)] transition-[transform,opacity,filter] duration-500 ease-out sm:min-h-[23rem] lg:min-h-[31rem]"
                style={{
                  ...slideStyles[index],
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transformStyle: "preserve-3d",
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(146,121,80,0.18),rgba(255,247,236,0.4))]" />
                <div
                  className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_58%)]"
                  style={{ opacity: loadedSlides[index] ? 0 : 1 }}
                />
                <div className="pointer-events-none absolute inset-[0.85rem] rounded-[1.35rem] border border-white/65 shadow-[inset_0_0_0_1px_rgba(166,130,80,0.18)]" />
                <div
                  className="absolute inset-0 overflow-hidden"
                >
                  <div
                    data-parallax-layer
                    className="absolute inset-y-0 -left-[6%] -right-[6%] will-change-transform"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "translateZ(0)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt={slide.title}
                      draggable={false}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      className="h-full w-full object-cover object-center transition-opacity duration-500 [image-rendering:auto]"
                      style={{ opacity: loadedSlides[index] ? 1 : 0 }}
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/32 via-black/6 to-white/10" />

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
                  <div className="max-w-[32rem] rounded-[1.45rem] bg-background/84 p-4 shadow-lg ring-1 ring-white/50 backdrop-blur-md lg:p-5">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-primary/90 lg:text-[0.7rem]">
                      {slide.eyebrow}
                    </p>
                    <p className="mt-2 text-lg font-medium leading-tight text-foreground sm:text-xl lg:text-[1.55rem]">
                      {slide.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[0.95rem] lg:text-base">
                      {slide.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-1 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground lg:text-[0.95rem]">
            Spa-inspired interface preview
          </p>
          <p className="mt-1 text-sm text-muted-foreground lg:max-w-[34rem]">
            Browse elevated clinic scenes designed to mirror the visual direction in your reference.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {scrollSnaps.map((_, index) => (
              <DotButton
                key={`hero-dot-${index + 1}`}
                aria-label={`Show slide ${index + 1}`}
                aria-pressed={selectedIndex === index}
                onClick={() => onDotButtonClick(index)}
                className={`h-2.5 rounded-full transition-all ${
                  selectedIndex === index
                    ? "w-8 bg-primary"
                    : "w-2.5 bg-primary/30 hover:bg-primary/50"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
            <NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
          </div>
        </div>
      </div>
    </div>
  );
}
