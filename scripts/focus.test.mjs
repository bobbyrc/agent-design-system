import test from "node:test";
import assert from "node:assert/strict";
import { focusIndicatorChanged } from "./focus.mjs";
const decoration = {
  outlineStyle: "none",
  outlineWidth: "0px",
  outlineColor: "rgb(1, 2, 3)",
  boxShadow: "rgba(36, 56, 43, .07) 0px 1px 4px",
};
test("decorative active-scope and panel shadows cannot masquerade as keyboard focus", () => {
  assert.equal(focusIndicatorChanged(decoration, { ...decoration }), false);
  assert.equal(
    focusIndicatorChanged(
      { ...decoration, boxShadow: "none" },
      { ...decoration, boxShadow: "none" },
    ),
    false,
  );
});
test("actual newly visible outline qualifies", () =>
  assert.equal(
    focusIndicatorChanged(decoration, {
      ...decoration,
      outlineStyle: "solid",
      outlineWidth: "3px",
      outlineColor: "rgb(44, 110, 155)",
    }),
    true,
  ));
test("focus-specific wrapper shadow qualifies", () =>
  assert.equal(
    focusIndicatorChanged(decoration, {
      ...decoration,
      boxShadow: "rgb(44, 110, 155) 0px 0px 0px 3px",
    }),
    true,
  ));
test("transparent or unchanged outline does not qualify", () => {
  assert.equal(
    focusIndicatorChanged(decoration, {
      ...decoration,
      outlineStyle: "solid",
      outlineWidth: "3px",
      outlineColor: "rgba(0, 0, 0, 0)",
    }),
    false,
  );
  assert.equal(
    focusIndicatorChanged(
      { ...decoration, outlineStyle: "solid", outlineWidth: "3px" },
      { ...decoration, outlineStyle: "solid", outlineWidth: "3px" },
    ),
    false,
  );
});
