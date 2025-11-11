import { createRef } from "react";
import ReactDOM from "react-dom/client";
import Widget, { type WidgetRef } from "./widget";
import tailwindCSS from "./index.css?inline";

export interface WidgetHostOptions {
  props?: Record<string, unknown>;
  globalBindings?: boolean;
  watchHash?: boolean;
  hashName?: string;
}

export interface InitOptions {
  hashName?: string;
  businessId: string;
}

declare global {
  interface Window {
    zenapt: {
      init: (opt: InitOptions) => void;
      bookNow?: () => boolean;
      closeBookingDialog?: () => boolean;
      __instance?: WidgetHost | null;
    };
  }
}

export class WidgetHost {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private root?: ReactDOM.Root;
  private widgetRef = createRef<WidgetRef>();
  private styleEl?: HTMLStyleElement;
  private hashName: string;

  constructor(selector: string, options: WidgetHostOptions = {}) {
    const {
      globalBindings = true,
      watchHash = true,
      hashName = "book-now",
    } = options;

    this.hashName = hashName;

    const el = document.querySelector(selector);
    if (!el) throw new Error(`[WidgetHost] Host not found: ${selector}`);

    this.host = el as HTMLElement;

    // Prevent double initialization
    if (this.host.shadowRoot) {
      console.warn(`[WidgetHost] Shadow root already exists on ${selector}`);
      this.shadow = this.host.shadowRoot;
      return;
    }

    // create shadow root
    this.shadow = this.host.attachShadow({ mode: "open" });

    // inject Tailwind CSS scoped to shadow
    this.styleEl = document.createElement("style");
    this.styleEl.textContent = tailwindCSS;
    this.shadow.appendChild(this.styleEl);

    // create React container
    const container = document.createElement("div");
    container.className = "zenapt-container";
    this.shadow.appendChild(container);

    // mount React root
    this.root = ReactDOM.createRoot(container);
    this.root.render(<Widget ref={this.widgetRef} {...(options.props || {})} />);

    // attach global helpers if requested
    if (globalBindings) this.bindWindow();
    if (watchHash) this.watchHash();
  }

  /** Opens the dialog inside widget */
  openDialog() {
    this.widgetRef.current?.openDialog();
  }

  /** Closes the dialog inside widget */
  closeDialog() {
    this.widgetRef.current?.closeDialog();
  }

  /** Destroy widget and cleanup */
  destroy() {
    this.root?.unmount();
    this.styleEl?.remove();
    this.unbindWindow();
    window.removeEventListener("hashchange", this.hashHandler);
    this.host.innerHTML = "";
  }

  /** Attach global functions */
  private bindWindow() {
    window.zenapt.bookNow = () => {
      this.openDialog();
      return true;
    };

    window.zenapt.closeBookingDialog = () => {
      this.closeDialog();
      return true;
    };
  }

  /** Remove global functions */
  private unbindWindow() {
    delete window.zenapt.bookNow;
    delete window.zenapt.closeBookingDialog;
  }

  /** Automatically open sheet on hash navigation */
  private hashHandler = () => {
    if (window.location.hash === `#${this.hashName}`) {
      this.openDialog();
    }
  };

  /** Watch and handle URL hash for auto-opening */
  private watchHash() {
    // initial check in case user loaded directly with #book-now
    this.hashHandler();
    window.addEventListener("hashchange", this.hashHandler);
  }

}

/** Global bootstrap */
window.zenapt = {
  init: ({ hashName, businessId }: InitOptions) => {
    if (window.zenapt.__instance) {
      console.warn("[zenapt] Widget already initialized.");
      return;
    }

    const widgetId = "zenapt-widget";
    let container = document.getElementById(widgetId);
    if (!container) {
      container = document.createElement("div");
      container.id = widgetId;
      document.body.appendChild(container);
    }

    const instance = new WidgetHost(`#${widgetId}`, { hashName });
    window.zenapt.__instance = instance;

    console.info(`[zenapt] Widget initialized for businessId: ${businessId}`);
  },
  bookNow: () => false,
  closeBookingDialog: () => false,
  __instance: null,
};
