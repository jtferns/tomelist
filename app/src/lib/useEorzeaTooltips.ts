import { useEffect } from "react";

export const EORZEADB_LOADER_SRC =
  "https://lds-img.finalfantasyxiv.com/pc/global/js/eorzeadb/loader.js?v3";

/**
 * Loads the official FFXIV Lodestone "Eorzea DB" tooltip loader script, which
 * upgrades any `<a class="eorzeadb_link" href="...">` in the DOM into a rich
 * item/action tooltip on hover.
 *
 * The loader has no documented API to re-scan the DOM after it has already
 * run once, which is a problem in a SPA where React re-renders can add or
 * remove `.eorzeadb_link` anchors after the initial load. To work around
 * this, every time this hook re-runs with `enabled: true` it removes any
 * previously-injected copy of the script and appends a fresh `<script>`
 * element, forcing the loader to execute (and thus rescan the DOM) again.
 *
 * Tooltips are a progressive enhancement only: the underlying `<a>` links
 * must remain fully functional (they open the Lodestone page directly)
 * whether or not this script loads successfully.
 */
export function useEorzeaTooltips(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let script: HTMLScriptElement | undefined;
    try {
      document
        .querySelectorAll(`script[src="${EORZEADB_LOADER_SRC}"]`)
        .forEach((el) => el.remove());

      script = document.createElement("script");
      script.src = EORZEADB_LOADER_SRC;
      script.async = true;
      document.body.appendChild(script);
    } catch {
      // Third-party script injection must never break the page.
    }

    return () => {
      try {
        script?.remove();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [enabled]);
}
