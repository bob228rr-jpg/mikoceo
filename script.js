const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;

const states = {
  idle: { row: 0, frames: 6, fps: 5 },
  "running-right": { row: 1, frames: 8, fps: 10 },
  "running-left": { row: 2, frames: 8, fps: 10 },
  waving: { row: 3, frames: 4, fps: 5 },
  jumping: { row: 4, frames: 5, fps: 7 },
  failed: { row: 5, frames: 8, fps: 6 },
  waiting: { row: 6, frames: 6, fps: 4 },
  running: { row: 7, frames: 6, fps: 9 },
  review: { row: 8, frames: 6, fps: 5 },
};

const companion = document.querySelector(".pet-companion");
const companionFrame = document.querySelector(".companion-frame");
const lore = document.querySelector("#lore");
const compactQuery = matchMedia("(pointer: coarse)");

const companionState = {
  mode: "roaming",
  x: 28,
  y: 0,
  targetX: 28,
  targetY: 0,
  movementKind: "run",
  frame: 0,
  lastFrameAt: 0,
  lastTickAt: 0,
  state: "waving",
  nextMoveAt: 0,
  pauseUntil: 0,
  greetingUntil: 0,
  scrollLockedUntil: 0,
  readingLore: false,
  readingSettledAt: 0,
};

function isCompact() {
  return compactQuery.matches || window.innerWidth <= 860;
}

function petScale() {
  if (window.innerWidth <= 520) {
    return 0.34;
  }

  if (window.innerWidth <= 860) {
    return 0.38;
  }

  return 0.62;
}

function petSize() {
  const scale = petScale();
  return {
    width: FRAME_WIDTH * scale,
    height: FRAME_HEIGHT * scale,
  };
}

function spritePosition(element, stateName, frame) {
  const state = states[stateName];
  element.style.backgroundPosition = `-${frame * FRAME_WIDTH}px -${
    state.row * FRAME_HEIGHT
  }px`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setPosition(x, y) {
  companionState.x = x;
  companionState.y = y;
  companion?.style.setProperty("--pet-x", `${x}px`);
  companion?.style.setProperty("--pet-y", `${y}px`);
}

function clampToViewport(point) {
  const size = petSize();

  return {
    x: clamp(point.x, 8, window.innerWidth - size.width - 8),
    y: clamp(point.y, 76, window.innerHeight - size.height - 8),
  };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomViewportPoint() {
  const size = petSize();
  const compact = isCompact();
  const topSafe = compact ? 84 : 118;
  const bottomSafe = window.innerHeight - size.height - (compact ? 18 : 70);
  const leftSafe = 12;
  const rightSafe = window.innerWidth - size.width - 12;
  const heroCtaBand = !compact && window.scrollY < window.innerHeight * 0.65;
  const avoidCta = (point) => {
    if (!heroCtaBand) {
      return point;
    }

    const ctaXMax = 520;
    const ctaYMin = window.innerHeight - 285;
    const ctaYMax = window.innerHeight - 120;

    if (point.x < ctaXMax && point.y > ctaYMin && point.y < ctaYMax) {
      return { ...point, x: ctaXMax + 34, y: bottomSafe - 28 };
    }

    return point;
  };

  return avoidCta({
    x: randomBetween(leftSafe, Math.max(leftSafe, rightSafe)),
    y: randomBetween(topSafe, Math.max(topSafe, bottomSafe)),
  });
}

function randomEdgeSpawn() {
  const size = petSize();
  const edge = ["left", "right", "top", "bottom"][Math.floor(Math.random() * 4)];

  if (edge === "left") {
    return { x: -size.width - 18, y: randomBetween(90, window.innerHeight - size.height - 20) };
  }

  if (edge === "right") {
    return { x: window.innerWidth + 18, y: randomBetween(90, window.innerHeight - size.height - 20) };
  }

  if (edge === "top") {
    return { x: randomBetween(18, window.innerWidth - size.width - 18), y: -size.height - 18 };
  }

  return {
    x: randomBetween(18, window.innerWidth - size.width - 18),
    y: window.innerHeight + 18,
  };
}

function randomExitPoint() {
  const size = petSize();
  const edge = ["left", "right", "top", "bottom"][Math.floor(Math.random() * 4)];

  if (edge === "left") {
    return { x: -size.width - 24, y: companionState.y };
  }

  if (edge === "right") {
    return { x: window.innerWidth + 24, y: companionState.y };
  }

  if (edge === "top") {
    return { x: companionState.x, y: -size.height - 24 };
  }

  return { x: companionState.x, y: window.innerHeight + 24 };
}

function lorePoint() {
  const copy = lore?.querySelector("div");
  const box = copy?.getBoundingClientRect();

  if (!box) {
    return null;
  }

  if (isCompact()) {
    return clampToViewport({ x: box.right - 92, y: box.top + 16 });
  }

  return clampToViewport({ x: box.left - 92, y: box.top + Math.min(box.height * 0.62, 230) });
}

function setMoveTarget(point, mode, timestamp, movementKind = "run") {
  companionState.targetX = point.x;
  companionState.targetY = point.y;
  companionState.mode = mode;
  companionState.movementKind = movementKind;
  companionState.pauseUntil = 0;
  companionState.nextMoveAt = timestamp + randomBetween(3000, 6000);
}

function setPause(timestamp) {
  companionState.mode = "paused";
  companionState.pauseUntil = timestamp + randomBetween(1000, 2400);
}

function startRoamingMove(timestamp) {
  const target = companionState.readingLore && lorePoint() ? lorePoint() : randomViewportPoint();
  const distance = Math.hypot(target.x - companionState.x, target.y - companionState.y);
  const jumpChance = distance < 190 ? 0.22 : 0.08;
  const movementKind = Math.random() < jumpChance ? "jump" : "run";

  setMoveTarget(target, "roaming", timestamp, movementKind);
}

function startExit(timestamp) {
  setMoveTarget(randomExitPoint(), "exiting", timestamp, "run");
  companionState.scrollLockedUntil = timestamp + 1300;
}

function startEnter(timestamp) {
  const spawn = randomEdgeSpawn();
  setPosition(spawn.x, spawn.y);

  const target = companionState.readingLore && lorePoint() ? lorePoint() : randomViewportPoint();
  setMoveTarget(target, "entering", timestamp, "run");
}

function chooseMovementAnimation(dx, distance, movementKind) {
  if (distance > 14) {
    if (movementKind === "jump") {
      return "jumping";
    }

    return dx < 0 ? "running-left" : "running-right";
  }

  return null;
}

function chooseState(distance, dx, timestamp) {
  if (companionState.mode === "greeting") {
    return "waving";
  }

  const movementState = chooseMovementAnimation(dx, distance, companionState.movementKind);
  if (movementState) {
    return movementState;
  }

  if (companionState.readingLore && (companionState.mode === "paused" || companionState.mode === "roaming")) {
    const readingTime = timestamp - companionState.readingSettledAt;
    return readingTime < 2200 ? "review" : "waiting";
  }

  if (companionState.mode === "paused") {
    return Math.floor(timestamp / 2200) % 2 === 0 ? "waiting" : "idle";
  }

  return "idle";
}

function updateCompanion(timestamp) {
  if (!companion || !companionFrame) {
    return;
  }

  const elapsed = Math.min(timestamp - (companionState.lastTickAt || timestamp), 40);
  companionState.lastTickAt = timestamp;

  if (companionState.mode === "greeting" && timestamp >= companionState.greetingUntil) {
    setPause(timestamp);
  }

  if (companionState.mode === "paused" && timestamp >= companionState.pauseUntil) {
    startRoamingMove(timestamp);
  }

  if (companionState.mode === "roaming" && timestamp >= companionState.nextMoveAt) {
    startRoamingMove(timestamp);
  }

  const dx = companionState.targetX - companionState.x;
  const dy = companionState.targetY - companionState.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 8 && companionState.mode !== "paused" && companionState.mode !== "greeting") {
    const baseSpeed = isCompact() ? 118 : 172;
    const speed = companionState.mode === "exiting" || companionState.mode === "entering"
      ? baseSpeed * 1.55
      : baseSpeed;
    const step = Math.min(distance, (speed * elapsed) / 1000);

    setPosition(
      companionState.x + (dx / distance) * step,
      companionState.y + (dy / distance) * step,
    );
  }

  const arrived = distance <= 10;
  if (arrived && companionState.mode === "exiting") {
    startEnter(timestamp + 80);
  } else if (arrived && companionState.mode === "entering") {
    setPause(timestamp);
  } else if (arrived && companionState.mode === "roaming") {
    if (companionState.readingLore && companionState.readingSettledAt === 0) {
      companionState.readingSettledAt = timestamp;
    }
    setPause(timestamp);
  }

  companion.classList.toggle("is-reading", companionState.readingLore);

  if (!companionState.readingLore) {
    companionState.readingSettledAt = 0;
  }

  const nextState = chooseState(distance, dx, timestamp);
  if (nextState !== companionState.state) {
    companionState.state = nextState;
    companionState.frame = 0;
  }

  const frameState = states[companionState.state];
  const frameInterval = 1000 / frameState.fps;

  if (timestamp - companionState.lastFrameAt >= frameInterval) {
    companionState.frame = (companionState.frame + 1) % frameState.frames;
    companionState.lastFrameAt = timestamp;
    spritePosition(companionFrame, companionState.state, companionState.frame);
  }
}

function keepInsideViewport() {
  if (["exiting", "entering"].includes(companionState.mode)) {
    return;
  }

  const point = clampToViewport({ x: companionState.x, y: companionState.y });
  setPosition(point.x, point.y);
}

function tick(timestamp) {
  updateCompanion(timestamp);
  requestAnimationFrame(tick);
}

window.addEventListener("pointerdown", () => {
  companionState.mode = "greeting";
  companionState.greetingUntil = performance.now() + 900;
});

window.addEventListener(
  "scroll",
  () => {
    const now = performance.now();

    if (now < companionState.scrollLockedUntil || ["exiting", "entering"].includes(companionState.mode)) {
      return;
    }

    startExit(now);
  },
  { passive: true },
);

if (lore && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      companionState.readingLore = entry.isIntersecting && entry.intersectionRatio > 0.28;
      companionState.readingSettledAt = 0;

      if (companionState.readingLore && !["exiting", "entering", "greeting"].includes(companionState.mode)) {
        startRoamingMove(performance.now());
      }
    },
    { threshold: [0.28, 0.5, 0.72] },
  );

  observer.observe(lore);
}

window.addEventListener("resize", () => {
  keepInsideViewport();
  startRoamingMove(performance.now());
});

const start = clampToViewport({
  x: isCompact() ? 18 : 32,
  y: isCompact() ? 86 : window.innerHeight - 180,
});
setPosition(start.x, start.y);
spritePosition(companionFrame, companionState.state, companionState.frame);
setMoveTarget(randomViewportPoint(), "roaming", performance.now() + 250, "run");
requestAnimationFrame(tick);
