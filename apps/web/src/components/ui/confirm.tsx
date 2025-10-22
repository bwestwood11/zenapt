// confirm.tsx
"use client";
import React, { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"; // adjust path to your shadcn components
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title?: string;
  description?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  // add more fields if you want (icon, danger style etc)
};

type Request = {
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
};

let globalHandler: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

/**
 * Call this from anywhere in your app.
 * Example: `const ok = await confirm({ title: "Delete?", description: "This is permanent." })`
 */
export function confirm(opts: ConfirmOptions = {}): Promise<boolean> {
  if (!globalHandler) {
    throw new Error(
      "confirm() called before ConfirmProvider was mounted. Wrap your app in <ConfirmProvider />."
    );
  }
  return globalHandler(opts);
}

/**
 * Provider that must wrap your app (e.g. in layout.tsx / App.tsx).
 */
export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<Request[]>([]);
  const [current, setCurrent] = useState<Request | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    // set global handler
    globalHandler = (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const req: Request = { options: opts, resolve };
        setQueue((q) => {
          // if nothing is active and queue empty, we can set current immediately in effect below
          return [...q, req];
        });
      });

    return () => {
      mounted.current = false;
      globalHandler = null;
    };
  }, []);

  // whenever queue changes and no current, pop the next request
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
    }
  }, [queue, current]);

  const close = (result: boolean) => {
    if (current) {
      // resolve the promise for the current request
      try {
        current.resolve(result);
      } catch {
        /* ignore */
      }
      setCurrent(null);
    }
  };

  // Options fallback defaults
  const opts = current?.options ?? {};
  const title = opts.title ?? "Are you sure?";
  const description = opts.description ?? "";
  const confirmText = opts.confirmText ?? "Confirm";
  const cancelText = opts.cancelText ?? "Cancel";

  return (
    <>
      {children}
      {/* Controlled AlertDialog */}
      <AlertDialog open={!!current} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                close(false);
              }}
            >
              {cancelText}
            </Button>
            <Button
              onClick={() => {
                close(true);
              }}
            >
              {confirmText}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
