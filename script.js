const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;

const states = {
  idle: { row: 0, frames: 6, fps: 5 },
  "running-right": { row: 1, frames: 8, fps: 9 },
  "running-left": { row: 2, frames: 8, fps: 9 },
  waving: { row: 3, frames: 4, fps: 5 },
  jumping: { row: 4, frames: 5, fps: 6 },
  failed: { row: 5, frames: 8, fps: 6 },
  waiting: { row: 6, frames: 6, fps: 4 },
  running: { row: 7, frames: 6, fps: 9 },
  review: { row: 8, frames: 6, fps: 5 },
};

const pet = document.querySelector("#pet");
const statusLabel = document.querySelector("#statusLabel");
const buttons = document.querySelectorAll("[data-state]");

let currentState = "idle";
let frame = 0;
let lastFrameAt = 0;

function draw() {
  const state = states[currentState];
  pet.style.backgroundPosition = `-${frame * FRAME_WIDTH}px -${
    state.row * FRAME_HEIGHT
  }px`;
}

function setState(nextState) {
  currentState = nextState;
  frame = 0;
  statusLabel.textContent = nextState;

  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.state === nextState);
  });

  draw();
}

function tick(timestamp) {
  const state = states[currentState];
  const interval = 1000 / state.fps;

  if (timestamp - lastFrameAt >= interval) {
    frame = (frame + 1) % state.frames;
    lastFrameAt = timestamp;
    draw();
  }

  requestAnimationFrame(tick);
}

buttons.forEach((button) => {
  button.addEventListener("click", () => setState(button.dataset.state));
});

setState(currentState);
requestAnimationFrame(tick);
