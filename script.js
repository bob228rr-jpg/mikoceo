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
  x: 28,
  y: 0,
  targetX: 28,
  targetY: 0,
  frame: 0,
  lastFrameAt: 0,
  lastTickAt: 0,
  state: "waving",
  mood: "waiting",
  nextMoveAt: 0,
  pauseUntil: 0,
  waveUntil: performance.now() + 1200,
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

function safePoint(x, y) {
  const size = petSize();

  return {
    x: clamp(x, 8, window.innerWidth - size.width - 8),
    y: clamp(y, 76, window.innerHeight - size.height - 8),
  };
}

function setPosition(x, y) {
  companionState.x = x;
  companionState.y = y;
  companion?.style.setProperty("--pet-x", `${x}px`);
  companion?.style.setProperty("--pet-y", `${y}px`);
}

function lorePoint() {
  const copy = lore?.querySelector("div");
  const box = copy?.getBoundingClientRect();

  if (!box) {
    return null;
  }

  if (isCompact()) {
    return safePoint(box.right - 92, box.top + 16);
  }

  return safePoint(box.left - 92, box.top + Math.min(box.height * 0.62, 230));
}

function viewportRoutePoints() {
  const compact = isCompact();
  const bottom = window.innerHeight - petSize().height - 18;
  const mid = Math.max(96, window.innerHeight * 0.52);

  if (compact) {
    return [
      { id: "mobile-hello", mood: "waving", ...safePoint(18, 86) },
      { id: "mobile-photo", mood: "idle", ...safePoint(window.innerWidth - 102, 112) },
      { id: "mobile-middle", mood: "jumping", ...safePoint(38, mid) },
      { id: "mobile-bottom", mood: "waiting", ...safePoint(window.innerWidth - 104, bottom) },
    ];
  }

  return [
    { id: "bottom-left", mood: "waiting", ...safePoint(32, bottom) },
    { id: "cta", mood: "jumping", ...safePoint(260, window.innerHeight - 235) },
    { id: "center", mood: "idle", ...safePoint(window.innerWidth * 0.38, bottom - 58) },
    { id: "hero-art", mood: "waving", ...safePoint(window.innerWidth * 0.62, bottom - 120) },
    { id: "bottom-right", mood: "idle", ...safePoint(window.innerWidth - 220, bottom) },
  ];
}

function pickNextPoint() {
  if (companionState.readingLore) {
    const point = lorePoint();
    if (point) {
      return { ...point, mood: "review", id: "lore-read" };
    }
  }

  const points = viewportRoutePoints();
  const farPoints = points.filter((point) => {
    return Math.hypot(point.x - companionState.x, point.y - companionState.y) > 130;
  });
  const candidates = farPoints.length > 0 ? farPoints : points;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function setTarget(point, timestamp) {
  companionState.targetX = point.x;
  companionState.targetY = point.y;
  companionState.mood = point.mood;
  companionState.nextMoveAt = timestamp + 2400 + Math.random() * 2600;

  if (point.mood === "waving") {
    companionState.waveUntil = timestamp + 1100;
  }
}

function chooseState(distance, dx, timestamp) {
  if (timestamp < companionState.waveUntil) {
    return "waving";
  }

  if (distance > 14) {
    return dx < 0 ? "running-left" : "running-right";
  }

  if (companionState.readingLore) {
    const readingTime = timestamp - companionState.readingSettledAt;
    return readingTime < 2600 ? "review" : "waiting";
  }

  if (timestamp < companionState.pauseUntil) {
    if (companionState.mood === "jumping") {
      return "jumping";
    }

    if (companionState.mood === "waving") {
      return "waving";
    }

    return companionState.mood === "idle" ? "idle" : "waiting";
  }

  return "idle";
}

function startNewMove(timestamp) {
  setTarget(pickNextPoint(), timestamp);
  companionState.pauseUntil = 0;
}

function updateCompanion(timestamp) {
  if (!companion || !companionFrame) {
    return;
  }

  const elapsed = Math.min(timestamp - (companionState.lastTickAt || timestamp), 40);
  companionState.lastTickAt = timestamp;

  const dx = companionState.targetX - companionState.x;
  const dy = companionState.targetY - companionState.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 10) {
    if (companionState.readingLore && companionState.readingSettledAt === 0) {
      companionState.readingSettledAt = timestamp;
    }

    if (!companionState.pauseUntil) {
      companionState.pauseUntil = timestamp + 900 + Math.random() * 1600;
    }

    if (!companionState.readingLore && timestamp >= companionState.pauseUntil) {
      startNewMove(timestamp);
    }
  } else {
    const speed = isCompact() ? 100 : 150;
    const step = Math.min(distance, (speed * elapsed) / 1000);
    setPosition(
      companionState.x + (dx / distance) * step,
      companionState.y + (dy / distance) * step,
    );
  }

  if (!companionState.readingLore && timestamp >= companionState.nextMoveAt && distance < 80) {
    startNewMove(timestamp);
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
  const point = safePoint(companionState.x, companionState.y);
  setPosition(point.x, point.y);

  if (!companionState.readingLore) {
    const target = safePoint(companionState.targetX, companionState.targetY);
    companionState.targetX = target.x;
    companionState.targetY = target.y;
  }
}

function tick(timestamp) {
  updateCompanion(timestamp);
  requestAnimationFrame(tick);
}

window.addEventListener("pointerdown", () => {
  companionState.waveUntil = performance.now() + 900;
});

window.addEventListener(
  "scroll",
  () => {
    keepInsideViewport();

    if (companionState.readingLore) {
      setTarget({ ...lorePoint(), mood: "review", id: "lore-read" }, performance.now());
    }
  },
  { passive: true },
);

if (lore && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      companionState.readingLore = entry.isIntersecting && entry.intersectionRatio > 0.28;
      companionState.readingSettledAt = 0;

      if (companionState.readingLore) {
        const point = lorePoint();
        if (point) {
          setTarget({ ...point, mood: "review", id: "lore-read" }, performance.now());
        }
      } else {
        startNewMove(performance.now());
      }
    },
    { threshold: [0.28, 0.5, 0.72] },
  );

  observer.observe(lore);
}

window.addEventListener("resize", () => {
  keepInsideViewport();
  startNewMove(performance.now());
});

const start = safePoint(isCompact() ? 18 : 32, isCompact() ? 86 : window.innerHeight - 190);
setPosition(start.x, start.y);
spritePosition(companionFrame, companionState.state, companionState.frame);
setTarget(pickNextPoint(), performance.now() + 250);
requestAnimationFrame(tick);
