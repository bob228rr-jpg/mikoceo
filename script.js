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
const sections = {
  hero: document.querySelector(".hero"),
  pet: document.querySelector("#pet"),
  lore: document.querySelector("#lore"),
  signal: document.querySelector("#signal"),
};

const isCompact = () => matchMedia("(pointer: coarse)").matches || window.innerWidth <= 860;

const companionState = {
  x: isCompact() ? 18 : 32,
  y: isCompact() ? 86 : Math.max(180, window.innerHeight - 190),
  targetX: isCompact() ? 18 : 32,
  targetY: isCompact() ? 86 : Math.max(180, window.innerHeight - 190),
  frame: 0,
  lastFrameAt: 0,
  state: "waving",
  mood: "idle",
  routeIndex: -1,
  nextRouteAt: performance.now() + 350,
  waveUntil: performance.now() + 900,
  readingLore: false,
  readingSettledAt: 0,
};

function spritePosition(element, stateName, frame) {
  const state = states[stateName];
  element.style.backgroundPosition = `-${frame * FRAME_WIDTH}px -${
    state.row * FRAME_HEIGHT
  }px`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function safePoint(x, y) {
  const scale = petScale();
  const petWidth = FRAME_WIDTH * scale;
  const petHeight = FRAME_HEIGHT * scale;

  return {
    x: clamp(x, 8, window.innerWidth - petWidth - 8),
    y: clamp(y, 78, window.innerHeight - petHeight - 8),
  };
}

function sectionBox(name) {
  return sections[name]?.getBoundingClientRect() || null;
}

function getRoutePoints() {
  const compact = isCompact();
  const hero = sectionBox("hero");
  const pet = sectionBox("pet");
  const lore = sectionBox("lore");
  const signal = sectionBox("signal");
  const points = [];

  if (hero) {
    points.push({
      id: "hero-left",
      mood: "idle",
      ...safePoint(compact ? 18 : hero.left + 28, compact ? 86 : hero.bottom - 170),
    });

    points.push({
      id: "hero-art",
      mood: "waving",
      ...safePoint(
        compact ? window.innerWidth - 98 : hero.right - 210,
        compact ? 146 : hero.top + 420,
      ),
    });

    points.push({
      id: "hero-cta",
      mood: "jumping",
      ...safePoint(compact ? 28 : hero.left + 260, compact ? 430 : hero.bottom - 105),
    });
  }

  if (pet) {
    points.push({
      id: "pet-block",
      mood: "jumping",
      ...safePoint(compact ? window.innerWidth - 98 : pet.left + 120, pet.top + 150),
    });
  }

  if (lore) {
    const copy = lore.querySelector("div")?.getBoundingClientRect() || lore;
    const loreX = compact ? copy.right - 92 : copy.left - 88;
    const loreY = compact ? copy.top + 22 : copy.top + Math.min(copy.height * 0.62, 230);

    points.push({
      id: "lore-read",
      mood: "review",
      ...safePoint(loreX, loreY),
    });
  }

  if (signal) {
    points.push({
      id: "signal",
      mood: "waving",
      ...safePoint(compact ? 22 : signal.right - 190, signal.top + 130),
    });
  }

  return points.length > 0
    ? points
    : [{ id: "fallback", mood: "idle", ...safePoint(24, window.innerHeight - 180) }];
}

function setAutonomousTarget(point, timestamp) {
  companionState.targetX = point.x;
  companionState.targetY = point.y;
  companionState.mood = point.mood;

  if (point.mood === "waving") {
    companionState.waveUntil = timestamp + 1100;
  }

  companionState.nextRouteAt = timestamp + 1900 + Math.random() * 1900;
}

function chooseNextAutonomousTarget(timestamp, forceLore = false) {
  const points = getRoutePoints();
  const lorePoint = points.find((point) => point.id === "lore-read");

  if ((forceLore || companionState.readingLore) && lorePoint) {
    setAutonomousTarget(lorePoint, timestamp);
    return;
  }

  companionState.routeIndex = (companionState.routeIndex + 1) % points.length;
  setAutonomousTarget(points[companionState.routeIndex], timestamp);
}

function chooseCompanionState(distance, dx, timestamp) {
  if (timestamp < companionState.waveUntil) {
    return "waving";
  }

  if (distance > 18) {
    return dx < 0 ? "running-left" : "running-right";
  }

  if (companionState.readingLore && companionState.mood === "review") {
    const readingTime = timestamp - companionState.readingSettledAt;
    return readingTime < 2600 ? "review" : "waiting";
  }

  if (companionState.mood === "jumping") {
    return "jumping";
  }

  if (companionState.mood === "waving") {
    return "waving";
  }

  return companionState.mood === "waiting" ? "waiting" : "idle";
}

function updateCompanion(timestamp) {
  if (!companion || !companionFrame) {
    return;
  }

  if (timestamp >= companionState.nextRouteAt) {
    chooseNextAutonomousTarget(timestamp);
  }

  const dx = companionState.targetX - companionState.x;
  const dy = companionState.targetY - companionState.y;
  const distance = Math.hypot(dx, dy);
  const speed = isCompact() ? 0.09 : 0.105;

  companionState.x += dx * speed;
  companionState.y += dy * speed;
  companion.classList.toggle("is-reading", companionState.readingLore);

  if (companionState.readingLore) {
    companion.style.setProperty("--pet-x", `${companionState.x}px`);
    companion.style.setProperty("--pet-y", `${companionState.y}px`);
  } else {
    companion.style.removeProperty("--pet-x");
    companion.style.removeProperty("--pet-y");
  }

  if (distance < 18 && companionState.readingLore && companionState.readingSettledAt === 0) {
    companionState.readingSettledAt = timestamp;
  }

  if (!companionState.readingLore) {
    companionState.readingSettledAt = 0;
  }

  const nextState = chooseCompanionState(distance, dx, timestamp);
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
    if (companionState.readingLore) {
      chooseNextAutonomousTarget(performance.now(), true);
    }
  },
  { passive: true },
);

if (sections.lore && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      const isReading = entry.isIntersecting && entry.intersectionRatio > 0.28;
      if (isReading === companionState.readingLore) {
        return;
      }

      companionState.readingLore = isReading;
      companionState.readingSettledAt = 0;
      chooseNextAutonomousTarget(performance.now(), isReading);
    },
    { threshold: [0.28, 0.5, 0.72] },
  );

  observer.observe(sections.lore);
}

window.addEventListener("resize", () => {
  companionState.x = clamp(companionState.x, 8, window.innerWidth - 120);
  companionState.y = clamp(companionState.y, 78, window.innerHeight - 120);
  chooseNextAutonomousTarget(performance.now(), companionState.readingLore);
});

spritePosition(companionFrame, companionState.state, companionState.frame);
requestAnimationFrame(tick);
