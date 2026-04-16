import assert from "node:assert/strict";
import {
  createCollapsedUnderlineFrame,
  createExpandedUnderlineFrame,
  createStoredIndicatorSnapshot,
  parseStoredIndicatorSnapshot,
  restoreIndicatorFromSnapshot,
} from "../lib/nav-indicator";

function runTests() {
  const snapshot = createStoredIndicatorSnapshot({ left: 120, width: 42 }, 300);
  assert.ok(snapshot, "snapshot should be created");

  const restored = restoreIndicatorFromSnapshot(snapshot!, 450);
  assert.ok(restored, "restored indicator should be calculated");
  assert.equal(Math.round(restored!.left), 180);
  assert.equal(Math.round(restored!.width), 63);

  const collapsed = createCollapsedUnderlineFrame({ left: 180, width: 63 });
  assert.equal(collapsed.left, 180);
  assert.equal(collapsed.width, 63);
  assert.equal(collapsed.opacity, 1);
  assert.equal(collapsed.scaleX, 0);

  const expanded = createExpandedUnderlineFrame({ left: 180, width: 63 });
  assert.equal(expanded.left, 180);
  assert.equal(expanded.width, 63);
  assert.equal(expanded.opacity, 1);
  assert.equal(expanded.scaleX, 1);

  const parsed = parseStoredIndicatorSnapshot(JSON.stringify(snapshot));
  assert.ok(parsed, "snapshot JSON should be parsed");

  const invalidParsed = parseStoredIndicatorSnapshot('{"foo":1}');
  assert.equal(invalidParsed, null);

  const invalidRestore = restoreIndicatorFromSnapshot(
    { leftRatio: Number.NaN, widthRatio: 0.1 },
    400,
  );
  assert.equal(invalidRestore, null);

  console.log("nav-indicator tests passed");
}

runTests();
