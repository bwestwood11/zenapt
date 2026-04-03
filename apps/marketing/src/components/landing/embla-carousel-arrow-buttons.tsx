"use client";

import { useCallback, useEffect, useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import type { EmblaCarouselType } from "embla-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ArrowButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

type UsePrevNextButtonsType = {
  prevBtnDisabled: boolean;
  nextBtnDisabled: boolean;
  onPrevButtonClick: () => void;
  onNextButtonClick: () => void;
};

function baseButtonClassName(disabled?: boolean) {
  return `flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition ${
    disabled
      ? "cursor-not-allowed opacity-45"
      : "hover:border-primary/50 hover:text-primary"
  }`;
}

export function PrevButton({
  className = "",
  disabled,
  ...props
}: Readonly<ArrowButtonProps>) {
  return (
    <button
      type="button"
      aria-label="Previous slide"
      className={`${baseButtonClassName(disabled)} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
}

export function NextButton({
  className = "",
  disabled,
  ...props
}: Readonly<ArrowButtonProps>) {
  return (
    <button
      type="button"
      aria-label="Next slide"
      className={`${baseButtonClassName(disabled)} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

export function usePrevNextButtons(
  emblaApi: EmblaCarouselType | undefined,
): UsePrevNextButtonsType {
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const onPrevButtonClick = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const onNextButtonClick = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setPrevBtnDisabled(!api.canScrollPrev());
    setNextBtnDisabled(!api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    onSelect(emblaApi);
    emblaApi.on("select", onSelect).on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
  };
}
