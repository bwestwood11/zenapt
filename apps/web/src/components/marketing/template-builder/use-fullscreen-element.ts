"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export function useFullscreenElement<T extends HTMLElement>(
  elementRef: RefObject<T | null>,
) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === elementRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [elementRef]);

  const toggleFullscreen = useCallback(async () => {
    if (!elementRef.current) {
      return;
    }

    if (document.fullscreenElement === elementRef.current) {
      await document.exitFullscreen();
      return;
    }

    await elementRef.current.requestFullscreen();
  }, [elementRef]);

  return {
    isFullscreen,
    toggleFullscreen,
  };
}
