import { useEffect } from "react";

/**
 * Hides the floating "Ask Us" support bubble while a purchase sheet/modal is
 * open, so it can never sit on top of the Add to Cart / Pay buttons.
 * Uses a counter so nested sheets don't re-show it early.
 */
export function useHideSupportFab(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const count = Number(body.dataset.hideSupportFab || "0") + 1;
    body.dataset.hideSupportFab = String(count);
    return () => {
      const next = Number(body.dataset.hideSupportFab || "1") - 1;
      if (next <= 0) delete body.dataset.hideSupportFab;
      else body.dataset.hideSupportFab = String(next);
    };
  }, [active]);
}
