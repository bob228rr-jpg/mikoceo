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

const statePets = document.querySelectorAll("[data-state-pet]");
const buttons = document.querySelectorAll("[data-state]");
const companion = document.querySelector(".pet-companion");
const companionFrame = document.querySelector(".companion-frame");
const lore = document.querySelector("#lore");

let selectedState = "idle";
let stateFrame = 0;
let stateLastFrameAt = 0;

const isTouch = matchMedia("(pointer: coarse)").matches || window.innerWidth <= 860;
const companionState = {
  x: isTouch ? 18 : 32,
  y: isTouch ? 86 : Math.max(180, window.innerHeight - 190),
  targetX: isTouch ? 18 : 32,
  targetY: isTouch ? 86 : Math.max(180, window.innerHeight - 190),
  frame: 0,
  lastFrameAt: 0,
  state: "waving",
  lastPointerAt: 0,
  waveUntil: performance.now() + 1700,
  readingLore: false,
  lastScrollY: window.scrollY,
  lastScrollAt: performance.now(),
};

function spritePosition(element, stateName, frame) {
  const state = states[stateName];
  element.style.backgroundPosition = `-${frame * FRAME_WIDTH}px -${
    state.row * FRAME_HEIGHT
  }px`;
}

function setState(nextState) {
  selectedState = nextState;
  stateFrame = 0;

  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.state === nextState);
  });

  statePets.forEach((pet) => spritePosition(pet, selectedState, stateFrame));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setCompanionTarget(x, y, wave = false) {
  const scale = isTouch ? 0.34 : 0.62;
  const petWidth = FRAME_WIDTH * scale;
  const petHeight = FRAME_HEIGHT * scale;
  companionState.targetX = clamp(x - petWidth / 2, 8, window.innerWidth - petWidth - 8);
  companionState.targetY = clamp(y - petHeight * 0.78, 78, window.innerHeight - petHeight - 8);
  companionState.lastPointerAt = performance.now();

  if (wave) {
    companionState.waveUntil = performance.now() + 900;
  }
}

function loreTarget() {
  const copy = lore?.querySelector("div");
  const box = copy?.getBoundingClientRect();

  if (!box) {
    return null;
  }

  const x = isTouch ? window.innerWidth - 52 : box.left - 24;
  const y = box.top + Math.min(box.height * 0.72, 260);
  return { x, y };
}

function chooseCompanionState(distance, dx, now) {
  if (now < companionState.waveUntil) {
    return "waving";
  }

  if (companionState.readingLore && distance < 42) {
    return "review";
  }

  if (distance > 20) {
    return dx < 0 ? "running-left" : "running-right";
  }

  if (companionState.readingLore) {
    return "waiting";
  }

  return "idle";
}

function updateCompanion(timestamp) {
  if (!companion || !companionFrame) {
    return;
  }

  if (companionState.readingLore) {
    const target = loreTarget();
    if (target) {
      setCompanionTarget(target.x, target.y);
    }
  }

  const dx = companionState.targetX - companionState.x;
  const dy = companionState.targetY - companionState.y;
  const distance = Math.hypot(dx, dy);
  const speed = isTouch ? 0.075 : 0.11;

  companionState.x += dx * speed;
  companionState.y += dy * speed;
  companion.style.setProperty("--pet-x", `${companionState.x}px`);
  companion.style.setProperty("--pet-y", `${companionState.y}px`);
  companion.classList.toggle("is-reading", companionState.readingLore);

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

function updateShowcase(timestamp) {
  const selected = states[selectedState];
  const frameInterval = 1000 / selected.fps;

  if (timestamp - stateLastFrameAt >= frameInterval) {
    stateFrame = (stateFrame + 1) % selected.frames;
    stateLastFrameAt = timestamp;
    statePets.forEach((pet) => spritePosition(pet, selectedState, stateFrame));
  }
}

function tick(timestamp) {
  updateShowcase(timestamp);
  updateCompanion(timestamp);
  requestAnimationFrame(tick);
}

buttons.forEach((button) => {
  button.addEventListener("click", () => setState(button.dataset.state));
});

if (!isTouch) {
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse") {
      setCompanionTarget(event.clientX, event.clientY);
    }
  });
}

window.addEventListener("pointerdown", (event) => {
  setCompanionTarget(event.clientX, event.clientY, true);
});

window.addEventListener(
  "scroll",
  () => {
    const now = performance.now();
    const delta = Math.abs(window.scrollY - companionState.lastScrollY);
    companionState.lastScrollY = window.scrollY;
    companionState.lastScrollAt = now;

    if (isTouch && delta > 8) {
      const target = loreTarget();
      if (companionState.readingLore && target) {
        setCompanionTarget(target.x, target.y);
      }
    }
  },
  { passive: true },
);

if (lore && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      companionState.readingLore = entry.isIntersecting && entry.intersectionRatio > 0.28;

      if (companionState.readingLore) {
        const target = loreTarget();
        if (target) {
          setCompanionTarget(target.x, target.y);
        }
      }
    },
    { threshold: [0.28, 0.5, 0.72] },
  );

  observer.observe(lore);
}

window.addEventListener("resize", () => {
  companionState.x = clamp(companionState.x, 8, window.innerWidth - 120);
  companionState.y = clamp(companionState.y, 78, window.innerHeight - 120);
  const target = companionState.readingLore ? loreTarget() : null;

  if (target) {
    setCompanionTarget(target.x, target.y);
  }
});

setState(selectedState);
spritePosition(companionFrame, companionState.state, companionState.frame);
requestAnimationFrame(tick);
