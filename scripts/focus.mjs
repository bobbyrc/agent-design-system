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

export async function tabFocusSample(page) {
  await page.evaluate(() => {
    const style = (element) => {
      const computed = getComputedStyle(element);
      return {
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
        boxShadow: computed.boxShadow,
      };
    };
    window.__focusStyleBefore = new Map(
      [...document.querySelectorAll("*")].map((element) => [
        element,
        style(element),
      ]),
    );
  });
  await page.keyboard.press("Tab");
  return page.evaluate(() => {
    const element = document.activeElement;
    const visible = (element) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.right > 0 &&
        bounds.left < innerWidth &&
        bounds.bottom > 0 &&
        bounds.top < innerHeight
      );
    };
    const ancestors = [
      element,
      element.parentElement,
      element.parentElement?.parentElement,
    ]
      .filter(Boolean)
      .map((candidate) => {
        const computed = getComputedStyle(candidate);
        return {
          tag: candidate.tagName,
          visible: visible(candidate),
          before: window.__focusStyleBefore.get(candidate),
          after: {
            outlineStyle: computed.outlineStyle,
            outlineWidth: computed.outlineWidth,
            outlineColor: computed.outlineColor,
            boxShadow: computed.boxShadow,
          },
        };
      });
    return {
      id: element.dataset.testid || element.id || element.tagName,
      visible: visible(element),
      ancestors,
    };
  });
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
