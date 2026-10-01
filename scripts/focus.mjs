// A persistent decorative shadow is not evidence of keyboard focus.
export function focusIndicatorChanged(before, after) {
  if (!before || !after) return false;
  const outline =
    after.outlineStyle !== "none" &&
    Number.parseFloat(after.outlineWidth) > 0 &&
    after.outlineColor !== "rgba(0, 0, 0, 0)";
  const outlineChanged = ["outlineStyle", "outlineWidth", "outlineColor"].some(
    (key) => before[key] !== after[key],
  );
  return (
    (outline && outlineChanged) ||
    (after.boxShadow !== "none" && before.boxShadow !== after.boxShadow)
  );
}

export async function snapshotFocusStyles(page) {
  await page.evaluate(() => {
    const style = (element) => {
      const computed = getComputedStyle(element);
      return {
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
        boxShadow: computed.boxShadow,
        outlineOffset: computed.outlineOffset,
      };
    };
    const stableKey = element => element.dataset.testid ? `testid:${element.dataset.testid}` :
      element.id ? `id:${element.id}` : null;
    window.__focusStyleBefore = new Map(
      [...document.querySelectorAll("*")].map(element => [element, style(element)]),
    );
    window.__focusStableBefore = new Map(
      [...document.querySelectorAll("[id], [data-testid]")].map(element => [stableKey(element), style(element)]),
    );
    window.__focusStableKey = stableKey;
  });
}

export async function currentFocusSample(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    const visible = (element, indicator = false) => {
      const bounds = element.getBoundingClientRect();
      const own = getComputedStyle(element);
      const extent = indicator && own.outlineStyle !== "none"
        ? Math.max(0, parseFloat(own.outlineWidth) + parseFloat(own.outlineOffset)) : 0;
      const box = { left: bounds.left - extent, right: bounds.right + extent,
        top: bounds.top - extent, bottom: bounds.bottom + extent };
      if (bounds.width <= 0 || bounds.height <= 0 || box.right <= 0 ||
          box.bottom <= 0 || box.left >= innerWidth || box.top >= innerHeight) return false;
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        // Conservative geometric check, not a painted-pixel/conformance claim.
        if (style.visibility !== "visible" || Number(style.opacity) === 0 ||
            style.display === "none" || style.clipPath !== "none" || style.clip !== "auto") return false;
        if (parent === element) continue;
        const rect = parent.getBoundingClientRect();
        const left = rect.left + parent.clientLeft, top = rect.top + parent.clientTop;
        if (["hidden", "clip", "scroll", "auto"].includes(style.overflowX) &&
            (box.left < left - 1 || box.right > left + parent.clientWidth + 1)) return false;
        if (["hidden", "clip", "scroll", "auto"].includes(style.overflowY) &&
            (box.top < top - 1 || box.bottom > top + parent.clientHeight + 1)) return false;
      }
      return true;
    };
    const ancestors = [];
    for (let candidate = element; candidate; candidate = candidate.parentElement) {
      const computed = getComputedStyle(candidate);
      ancestors.push({
        tag: candidate.tagName,
        visible: visible(candidate, true),
        before: window.__focusStyleBefore.get(candidate) ||
          window.__focusStableBefore.get(window.__focusStableKey(candidate)),
        after: {
          outlineStyle: computed.outlineStyle,
          outlineWidth: computed.outlineWidth,
          outlineColor: computed.outlineColor,
          boxShadow: computed.boxShadow,
          outlineOffset: computed.outlineOffset,
        },
      });
    }
    return {
      id: element.dataset.testid || element.id || element.tagName,
      visible: visible(element),
      bounds: (() => { const r = element.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; })(),
      viewport: { width: innerWidth, height: innerHeight },
      ancestors,
    };
  });
}
export async function tabFocusSample(page) {
  await snapshotFocusStyles(page);
  await page.keyboard.press("Tab");
  return currentFocusSample(page);
}

export function hasVisibleFocus(sample) {
  return (
    sample.visible &&
    sample.ancestors.some(
      (candidate) =>
        candidate.visible &&
        focusIndicatorChanged(candidate.before, candidate.after),
    )
  );
}
