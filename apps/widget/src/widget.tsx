import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
} from "react";

import { cn } from "./lib/utils";
import { usePreferences } from "./hooks/usePreferences";

export type WidgetRef = {
  openDialog: () => void;
  closeDialog: () => void;
};

const Widget = forwardRef<WidgetRef, {businessId: string, hashName:string}>(({businessId, hashName}, ref) => {
  const [isOpen, setIsOpen] = useState(window.location.hash === `#${hashName}`);
  const { side } = usePreferences();
  const [isLoading, setIsLoading] = useState(true)

  const openDialog = useCallback(() => setIsOpen(true), []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);

    function removeHashFromUrl() {
      const { hash, pathname, search } = window.location;

      // only update if there's a hash present
      if (hash) {
        const cleanUrl = pathname + search;
        window.history.replaceState(history.state, "", cleanUrl);
      }
    }

    removeHashFromUrl();
  }, []);

  useImperativeHandle(ref, () => ({ openDialog, closeDialog }));

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDialog();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeDialog]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Sheet dialog"
        >
          {/* Overlay */}
          <div
            onClick={closeDialog}
            className={cn("absolute inset-0 bg-black/10 backdrop-blur-sm")}
          />

          {/* Sheet */}
          <aside
            className={cn(
              "relative bg-background text-foreground shadow-xl flex flex-col animate-in duration-300",
              side === "right" && "h-svh w-full max-w-140 ml-auto slide-in-from-right",
              side === "left" && "h-svh w-full max-w-140 mr-auto slide-in-from-left"
            )}
          >
            <div className="flex-1 overflow-auto">
              <iframe
                src={`${import.meta.env.VITE_IFRAME_BASE_URL}/widget/${businessId}/book`}
                onLoad={() => setIsLoading(false)}
                className="w-full h-full"
              />

              {isLoading ? <p>Loading</p> : null}
            </div>
          </aside>
        </div>
      )}
    </>
  );
});

export default Widget;
