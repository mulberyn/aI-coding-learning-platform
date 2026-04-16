export type IndicatorDirection = "left" | "right" | "none";

export type IndicatorState = {
  left: number;
  width: number;
};

export type UnderlineAnimationFrame = IndicatorState & {
  opacity: number;
  scaleX: number;
};

export type StoredIndicatorSnapshot = {
  leftRatio: number;
  widthRatio: number;
};

export const NAV_INDICATOR_STORAGE_KEY = "aioj.nav.indicator.v1";

export function getIndicatorDirection(
  previousLeft: number,
  nextLeft: number,
): IndicatorDirection {
  if (nextLeft > previousLeft) {
    return "right";
  }
  if (nextLeft < previousLeft) {
    return "left";
  }
  return "none";
}

export function createStoredIndicatorSnapshot(
  indicator: IndicatorState,
  navWidth: number,
): StoredIndicatorSnapshot | null {
  if (!Number.isFinite(navWidth) || navWidth <= 0) {
    return null;
  }

  return {
    leftRatio: indicator.left / navWidth,
    widthRatio: indicator.width / navWidth,
  };
}

export function restoreIndicatorFromSnapshot(
  snapshot: StoredIndicatorSnapshot,
  navWidth: number,
): IndicatorState | null {
  if (
    !Number.isFinite(navWidth) ||
    navWidth <= 0 ||
    !Number.isFinite(snapshot.leftRatio) ||
    !Number.isFinite(snapshot.widthRatio)
  ) {
    return null;
  }

  const width = Math.max(20, snapshot.widthRatio * navWidth);
  const maxLeft = Math.max(0, navWidth - width);
  const left = Math.min(Math.max(0, snapshot.leftRatio * navWidth), maxLeft);

  return { left, width };
}

export function parseStoredIndicatorSnapshot(
  raw: string | null,
): StoredIndicatorSnapshot | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredIndicatorSnapshot>;
    if (
      typeof parsed.leftRatio !== "number" ||
      typeof parsed.widthRatio !== "number"
    ) {
      return null;
    }

    return {
      leftRatio: parsed.leftRatio,
      widthRatio: parsed.widthRatio,
    };
  } catch {
    return null;
  }
}

export function createCollapsedUnderlineFrame(
  indicator: IndicatorState,
): UnderlineAnimationFrame {
  return {
    ...indicator,
    opacity: 1,
    scaleX: 0,
  };
}

export function createExpandedUnderlineFrame(
  indicator: IndicatorState,
): UnderlineAnimationFrame {
  return {
    ...indicator,
    opacity: 1,
    scaleX: 1,
  };
}
