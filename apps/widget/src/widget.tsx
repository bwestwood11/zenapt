import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "./lib/utils";
import { usePreferences } from "./hooks/usePreferences";

export type WidgetRef = {
  openDialog: () => void;
  closeDialog: () => void;
};

const sideVariants = {
  right: {
    open: { x: 0 },
    closed: { x: "100%" },
  },
  left: {
    open: { x: 0 },
    closed: { x: "-100%" },
  },
  bottom: {
    open: { y: 0 },
    closed: { y: "100%" },
  },
  top: {
    open: { y: 0 },
    closed: { y: "-100%" },
  },
} as const;

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Sheet dialog"
          initial="closed"
          animate="open"
          exit="closed"
          variants={{
            open: { transition: { staggerChildren: 0.05 } },
            closed: {
              transition: { staggerChildren: 0.03, staggerDirection: -1 },
            },
          }}
        >
          {/* Overlay */}
          <motion.div
            onClick={closeDialog}
            className={cn("absolute inset-0 bg-black/10 backdrop-blur-sm")}
            variants={{
              open: { opacity: 1 },
              closed: { opacity: 0 },
            }}
            transition={{ duration: 0.25 }}
          />

          {/* Sheet */}
          <motion.aside
            className={cn(
              "relative bg-background text-foreground shadow-xl flex flex-col",
              side === "right" && "h-svh w-full max-w-[560px] ml-auto",
              side === "left" && "h-svh w-full max-w-[560px] mr-auto"
            )}
            variants={sideVariants[side]}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
          >
            <div className="flex-1 overflow-auto">
              <iframe
                src={`${import.meta.env.VITE_IFRAME_BASE_URL}/widget/${businessId}/book`}
                onLoad={() => setIsLoading(false)}
                className="w-full h-full"
              />

              {isLoading ? <p>Loading</p> : null}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default Widget;
