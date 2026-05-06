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

const statePets = document.querySelectorAll("[data-state-pet]");
const buttons = document.querySelectorAll("[data-state]");

let selectedState = "idle";
let stateFrame = 0;
let lastFrameAt = 0;

function position(element, stateName, frame) {
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

  statePets.forEach((pet) => position(pet, selectedState, stateFrame));
}

function tick(timestamp) {
  if (timestamp - lastFrameAt >= 120) {
    const selected = states[selectedState];
    stateFrame = (stateFrame + 1) % selected.frames;
    lastFrameAt = timestamp;

    statePets.forEach((pet) => position(pet, selectedState, stateFrame));
  }

  requestAnimationFrame(tick);
}

buttons.forEach((button) => {
  button.addEventListener("click", () => setState(button.dataset.state));
});

setState(selectedState);
requestAnimationFrame(tick);
