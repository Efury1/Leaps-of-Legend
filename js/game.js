// ============================================================
// CONFIG — rescaled for a 900x700 desktop canvas
// All the tunable numbers for the game live up here so they're
// easy to find and adjust in one place.
// ============================================================
const MOVEMENT_SPEED = 7;           // pixels per frame the unicorn moves left/right
const GRAVITY = 0.7;                // how fast falling speed increases each frame
const FLOOR_Y = 630;                // the y position of the ground in screen space
const UNICORN_HEIGHT = 16;          // used to line the sprite up with its feet, not its top-left corner
const CAMERA_MIDDLE = 350;          // once the player passes this height, the camera starts following them
const MOVING_PLATFORM_CHANCE_MAX = 0.6; // 60% chance a newly spawned platform moves
const MOVING_PLATFORM_SPEED = 2;    // pixels per frame moving platforms slide

// Music CONFIG
let audioCtx = null;                // Web Audio context, created only once the player presses Play
let musicRepeatTimer = null;        // handle for the setTimeout that loops the tune
const GAME_TUNE = "cefhjhfec000fhjlmljhjhfec000"; // each letter is a note, '0' is a rest
const GAME_NOTE_LEN = 0.25;         // seconds per note

// ============================================================
// DOM REFERENCES
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 700;

const unicornEl = document.getElementById('unicorn'); // the actual player sprite, a positioned <div>

// If unicorn.png 404s, swap in an emoji so the game still works
// even without the image asset.
const unicornImg = new Image();
unicornImg.onerror = () => {
  unicornEl.style.backgroundImage = 'none';
  unicornEl.textContent = '🦄';
  unicornEl.style.fontSize = '16px';
  unicornEl.style.lineHeight = '16px';
  unicornEl.style.textAlign = 'center';
};
unicornImg.src = 'unicorn.png';

// ============================================================
// GAME STATE
// ============================================================
// gameState controls which "screen" is active: 'menu', 'playing',
// 'gameover', or 'winning'. 
let gameState = 'menu';

let playerX = 450;      // player's horizontal position in world space
let playerY = 0;        // player's vertical position, mirrors verticalOffset
let facingRight = true; // flips the sprite when moving left

let verticalOffset = 0;   // how far the player has moved from the floor line (negative = up) 
let verticalVelocity = 0; // current vertical speed (negative = moving up, positive = falling)

let currentPlatform = null; // the platform object the player is standing on (if any)
let cameraOffset = 0;       // how far the camera has scrolled up as the player climbs

let alicornPoints = 0;            // Points in topbar
let lives = 3;                    // shown as rainbow emoji, lost when you fall to the floor
let highestPlatformY = Infinity;  // tracks the highest platform reached, we need this for scoring/sky/spawning
let wasFalling = false;           // used to tell "still standing on the floor" apart from "just landed hard"

let nextSpawnY = 260;         // once the highest platform reaches this height, we want to spawn a new one above it
let newPlatformSpawned = false; // guards against spawning multiple platforms for the same climb

// Tracks which arrow keys are currently held down, so movement
// can be continuous rather than one step per keypress.
const keysPressed = {
  ArrowLeft: false,
  ArrowRight: false
};

// ============================================================
// PLATFORMS — repositioned for the wider 900px stage
// ============================================================
// The starting platforms the player sees at the bottom of the climb.
// More get pushed onto this same array as the player climbs higher.
const platforms = [
  { x: 150, y: 500, width: 160, height: 12 },
  { x: 450, y: 380, width: 160, height: 12 },
  { x: 250, y: 260, width: 160, height: 12 },
];

// Creates the actual DOM element for a platform and stores a
// reference to it on the platform object itself, so later code
// can just do platform.element.style... to move it.
function createPlatformElement(platform) {
  const element = document.createElement('div');
  element.className = 'platform';
  element.style.left = platform.x + 'px';
  element.style.top = platform.y + 'px';
  element.style.width = platform.width + 'px';
  element.style.height = platform.height + 'px';
  document.querySelector('.stage').appendChild(element);
  platform.element = element;
}

platforms.forEach(createPlatformElement);

// Called every frame to check if the player has reached ground
// level. If they were falling when they hit it, that costs a life.
function checkForFloorHit() {
  if (verticalOffset >= 0) {
    if (wasFalling) {
      lives--;
      updateLivesDisplay();
      playBlip(220, 0.3); // sound + screen shake on losing a life 
      const stage = document.querySelector('.stage');
      stage.classList.add('shake');
      setTimeout(() => stage.classList.remove('shake'), 300);
    }
    verticalOffset = 0;
    verticalVelocity = 0;
    currentPlatform = null;
    wasFalling = false;
  } else {
    wasFalling = true;
  }
  playerY = verticalOffset;
}

// ============================================================
// Potions
// ============================================================
// Potions are bar to pickup
// Using 'let' because we reassign this array
// whenever we filter a collected potion out of it.
let potions = [];

function createPotionElement(potion) {
  const element = document.createElement('div');
  element.className = 'potion';
  element.style.left = potion.x + 'px';
  element.style.top = potion.y + 'px';
  element.textContent = '🧪';
  document.querySelector('.stage').appendChild(element);
  potion.element = element;
}

potions.forEach(createPotionElement);

// ============================================================
// Unicorn Bubble
// ============================================================
// A speech-bubble effect shown when the player presses Shift
const bubbleEl = document.createElement('div');

let bubbleTimeout = null; // handle for the auto-hide timer, null when no bubble is active

// Hides the bubble and clears the timer handle so bubble() disappears
function removeBubble() {
  bubbleEl.remove();
  bubbleTimeout = null;
}

function bubble() {
    const newBubble = FLOOR_Y + playerY;
    bubbleEl.className = 'bubbleEl';
    document.querySelector('.stage').appendChild(bubbleEl);

    // Add the little pointer/dot for the speech bubble, once.
    if (!bubbleEl.querySelector('.bubbleDot')) {
      const dot = document.createElement('div');
      dot.className = 'bubbleDot';
      bubbleEl.appendChild(dot);
    }

    // If Shift is pressed again while a bubble is already showing,
    // clear the earlier timer first. Otherwise the FIRST timer
    if (bubbleTimeout) {
      clearTimeout(bubbleTimeout);
    }

    bubbleTimeout = setTimeout(() => {
      console.log('removeBubble firing');
      removeBubble();
    }, 5000);
}

// ============================================================
// PRINCESS PLATFORM — special fixed platform, revealed at score 15
// ============================================================
const PRINCESS_SCORE_THRESHOLD = 15;

// y follows the same climb pattern as the auto-spawned platforms
// (start 500, each new platform 120 higher), pushed a bit further
// so it reads as a distinct "final" platform rather than a normal one.
const princessPlatform = { x: 40, y: -1060, width: 160, height: 12 };
createPlatformElement(princessPlatform);
princessPlatform.element.style.display = 'none'; // hidden until revealPrincessPlatform() runs
princessPlatform.element.classList.add('princess-platform');

let princessRevealed = false; // becomes true once the player earns enough points

const princessEl = document.createElement('div');
princessEl.id = 'princess';
princessEl.classList.add('princess'); // pulls in size, scale(4), transform-origin from CSS
princessEl.style.position = 'absolute';
princessEl.style.display = 'none';
document.querySelector('.stage').appendChild(princessEl);

// Same 404-fallback pattern as the unicorn: try an image, fall
// back to an emoji if it's missing.
const princessImg = new Image();
princessImg.onload = () => {
  princessEl.style.backgroundImage = "url('princess1.png')";
  princessEl.style.backgroundRepeat = 'no-repeat';
};
princessImg.onerror = () => {
  princessEl.textContent = '👸';
  princessEl.style.fontSize = '28px';
};
princessImg.src = 'princess.png';

// Called once, the moment the player's score first hits the
// threshold. Makes the princess and her platform visible and
// adds the platform to the main platforms array so landing
// logic treats it like any other platform.
function revealPrincessPlatform() {
  princessRevealed = true;
  princessPlatform.element.style.display = 'block';
  platforms.push(princessPlatform);

  princessEl.style.left = princessPlatform.x + (princessPlatform.width / 2 - 16) + 'px';
  princessEl.style.display = 'block';
}

// Checks every frame whether the unicorn has reached the princess.
// Uses a simple circle-collision check (see isTouching below).
function checkForPrincessCollection() {
  const unicorn = { x: playerX, y: FLOOR_Y + playerY, radius: 12 };

  // Use the platform's center as the touch point, with a radius
  // that spans the whole platform width, so landing anywhere on
  // it counts as reaching the princess.
  const object = {
    x: princessPlatform.x + princessPlatform.width / 2,
    y: princessPlatform.y,
    radius: princessPlatform.width / 2
  };

  if (isTouching(unicorn, object)) {
    if (alicornPoints >= 15) {
      gameState = 'winning';
      drawWinningMenu();
    }
  }
}

// ============================================================
// Sky
// ============================================================
// As the player climbs higher (highestPlatformY gets smaller,
// since up is negative), the background sky class changes to
// suggest day turning to night turning to deep space.
const SKY_STAGES = [
  'sky__space',
  'sky__midnight',
  'sky__night',
  'sky__evening',
  'sky__dusk',
  'sky__afternoon',
  'sky__noon',
  'sky__morning',
  'sky__dawn'
];

function updateSkyForHeight() {
  const stage = document.querySelector('.stage');
  let skyClass;

  if (highestPlatformY > 490) {
    skyClass = 'sky__dawn';
  } else if (highestPlatformY > 420) {
    skyClass = 'sky__morning';
  } else if (highestPlatformY > 350) {
    skyClass = 'sky__noon';
  } else if (highestPlatformY > 280) {
    skyClass = 'sky__afternoon';
  } else if (highestPlatformY > 210) {
    skyClass = 'sky__dusk';
  } else if (highestPlatformY > 140) {
    skyClass = 'sky__evening';
  } else if (highestPlatformY > 70) {
    skyClass = 'sky__night';
  } else if (highestPlatformY > 0) {
    skyClass = 'sky__midnight';
  } else {
    skyClass = 'sky__space';
  }

  stage.classList.remove(...SKY_STAGES);
  stage.classList.add(skyClass);
}

// ============================================================
// Music
// ============================================================
// A tiny synth "tracker": each character in GAME_TUNE is either a
// note letter (mapped to a frequency below) or '0' for a rest.
function playTune(str, noteLen) {
  if (!str) return;

  audioCtx = new AudioContext();
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch && ch !== '0') {
      const osc = audioCtx.createOscillator();
      osc.connect(masterGain);
      osc.type = 'sine';

      const startTime = i * noteLen + 0.3;
      // Converts the character code into a musical frequency using
      // the equal-temperament formula (each semitone is a factor of 1.06 apart).
      const freq = 440 * Math.pow(1.06, -105 + str.charCodeAt(i));
      osc.frequency.setValueAtTime(freq, startTime);

      // Quick attack, quick decay, so notes don't bleed into each other.
      masterGain.gain.setValueAtTime(0.5, startTime);
      masterGain.gain.setTargetAtTime(0.001, startTime + 0.1, 0.05);

      osc.start(startTime);
      osc.stop(startTime + noteLen - 0.01);
    }
  }

  // Once the tune finishes playing, schedule it to play again,
  // creating a seamless loop.
  const tuneDurationMs = (str.length * noteLen + 0.3) * 1000;
  musicRepeatTimer = setTimeout(() => playTune(str, noteLen), tuneDurationMs);
}

function stopMusic() {
  if (musicRepeatTimer) {
    clearTimeout(musicRepeatTimer);
    musicRepeatTimer = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

// Reuses the music's audio context ---
// Plays a single soft tone. Only fires once music has started (audioCtx
// exists), so jump/land sounds before Play is pressed just get skipped.
function playBlip(freq, duration = 0.12) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime + 0.05, 0.05);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ============================================================
// MENU SCREENS
// ============================================================
// These functions draw directly onto the 2D canvas (not DOM
// elements) for the menu, game-over, and winning screens.

// Same deep-space-to-violet gradient used by the sky__space/midnight
// CSS classes, so the menu and game-over screens feel like the same world.
function drawMagicalBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#2d1b4e');
  gradient.addColorStop(1, '#0f0820');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// A reusable rounded-rectangle drawer, used for buttons and
// the pink "parchment" text boxes.
function drawRoundedRect(x, y, width, height, radius, fillColor, strokeColor) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// Draws the big glowing title text centered horizontally at a
// given vertical position.
function drawTitle(text, centerY) {
  ctx.textAlign = 'center';
  ctx.font = '40px Trebuchet MS';
  ctx.shadowColor = '#ff9ecb';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffd76e';
  ctx.fillText(text, canvas.width / 2, centerY);
  ctx.shadowBlur = 0; // reset so the shadow doesn't leak into later drawing
}

// Draws one line of text inside a pink rounded box ("parchment"),
// auto-sized to fit the text. Used for both the intro blurb and
// each control-instructions line.
function drawTextOnParchment(text, centerX, centerY, font) {
  ctx.font = font;
  const textWidth = ctx.measureText(text).width;

  // Pink box with a plum border, matching the topbar styling.
  drawRoundedRect(
    centerX - textWidth / 2 - 20,
    centerY - 20,
    textWidth + 40,
    40,
    10,
    '#ffe6f5',
    '#5b2f8a'
  );

  // Draw the text on top of the box.
  ctx.fillStyle = '#6b2f8f';
  ctx.textAlign = 'center';
  ctx.fillText(text, centerX, centerY + 7); // +7 nudges the baseline down to sit inside the box
}

// Draws a clickable-looking button. The actual click detection
// happens separately in handleClick, using the same y value.
function drawMenuButton(label, y) {
  drawRoundedRect(canvas.width / 2 - 70, y, 140, 50, 12, '#c9427a', '#ffe6f5');
  ctx.fillStyle = '#fff9f0';
  ctx.font = '22px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText(label, canvas.width / 2, y + 32);
}

// The main menu screen: title, goal, scoring rules, controls, and
// the Play button. Also hides all the DOM platforms/princess
// so they don't show through behind the canvas menu.
//
// IMPORTANT: the Play button is drawn at y = 420 here. handleClick
// below checks clicks against the SAME y value for gameState ===
// 'menu', so if you move this button, update handleClick too.
function drawMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawMagicalBackground();
  drawTitle('Leaps of Legend', 100);

  // Goal, stated up front in one line.
  drawTextOnParchment(
    'Climb platform to platform and reach the princess.',
    canvas.width / 2,
    150,
    '18px Trebuchet MS',
  );

  // Scoring rules, grouped together so cause -> effect is clear.
  drawTextOnParchment('+1 point per new platform reached', canvas.width / 2, 200, '15px Trebuchet MS');
  drawTextOnParchment('-1 point for touching a potion 🧪', canvas.width / 2, 250, '15px Trebuchet MS');
  drawTextOnParchment('Reach 15 points to reveal the princess', canvas.width / 2, 300, '15px Trebuchet MS');
  drawTextOnParchment('Falling costs a life 🌈, lose all 3 and it\'s over', canvas.width / 2, 350, '15px Trebuchet MS');

  // Controls, grouped separately from the rules above.
  drawTextOnParchment('← → move   ↑ jump   Shift talk to unicorn', canvas.width / 2, 400, '15px Trebuchet MS');

  drawMenuButton('Play', 420);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });
  princessEl.style.display = 'none';
}

// Shown when the player reaches the princess with enough points.
// Its "Play again" button is drawn at y = 340 — handleClick checks
// this same value for gameState === 'winning'.
function drawWinningMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawMagicalBackground();
  drawTitle('Leaps of Legend', 170);
  drawTextOnParchment(
    'The princess is alive because of you, you won.',
    canvas.width / 2,
    250,
    '20px Trebuchet MS',
  );

  drawMenuButton('Play again', 340);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });
  princessEl.style.display = 'none';
}

// Shown when lives reach 0. Its "Play again" button is also at
// y = 320 — handleClick checks this same value for gameState === 'gameover'.
function drawGameOverMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawMagicalBackground();
  drawTitle('Game Over', 240);

  ctx.fillStyle = '#ffe6f5';
  ctx.font = '24px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('Alicorn Score: ' + alicornPoints, canvas.width / 2, 280);

  drawMenuButton('Play again', 320);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });
  princessEl.style.display = 'none';
}

drawMenu(); // show the menu as soon as everything above is ready

// ============================================================
// DISPLAY HELPERS
// ============================================================
// These update the plain-HTML topbar (score/lives), separate from
// the canvas-drawn menus above.
function updateScoreDisplay() {
  document.querySelector('.topbar div:last-child').textContent = 'Alicorn Points: ' + alicornPoints;
}

function updateLivesDisplay() {
  document.querySelector('.rainbows').textContent = '🌈'.repeat(lives);
}

// The floating "+1" score popup 
// Spawns a short-lived DOM element at a given screen position and
// lets the CSS animation (floatUp) fade/rise it, then removes itself.
function showScorePopup(x, y) {
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = '+1';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.querySelector('.stage').appendChild(el);
  setTimeout(() => el.remove(), 600);
}

// ============================================================
// INPUT
// ============================================================
// Handles clicks on the canvas. Only does anything while a menu
// screen is showing (menu / gameover / winning) — during actual
// gameplay, clicks are ignored.
function handleClick(event) {
  if (gameState !== 'menu' && gameState !== 'gameover' && gameState !== 'winning') return;

  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  // Each screen draws its button at a different y — this must match
  // whatever y value that screen's drawMenuButton() call used above:
  //   drawMenu()          -> 420
  //   drawWinningMenu()   -> 340
  //   drawGameOverMenu()  -> 320
  const buttonY =
    gameState === 'menu' ? 420 :
    gameState === 'winning' ? 340 :
    320; // gameover

  const buttonX = canvas.width / 2 - 70, buttonW = 140, buttonH = 50;
  const clickedButton =
    clickX >= buttonX && clickX <= buttonX + buttonW &&
    clickY >= buttonY && clickY <= buttonY + buttonH;

  if (!clickedButton) return;

  // Only reset progress when coming from a game-over screen. Winning
  // and the very first menu don't need a reset before starting play.
  if (gameState === 'gameover') {
    resetGame();
  }

  gameState = 'playing';
  playTune(GAME_TUNE, GAME_NOTE_LEN);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  platforms.forEach(platform => {
    platform.element.style.display = 'block';
  });
  if (princessRevealed) {
    princessEl.style.display = 'block';
  }
  update();
}

// Tracks arrow key state for continuous movement, handles the
// one-shot jump on ArrowUp, and triggers the speech bubble on Shift.
function keyDownHandler(event) {
  if (event.key === 'Right' || event.key === 'ArrowRight') {
    keysPressed.ArrowRight = true;
  } else if (event.key === 'Left' || event.key === 'ArrowLeft') {
    keysPressed.ArrowLeft = true;
  } else if (event.key === 'ArrowUp') {
    // Only allow a jump if not already moving vertically (i.e. on
    // solid ground or a platform), so you can't jump mid-air.
    if (verticalVelocity === 0) {
      verticalVelocity = -15;
      currentPlatform = null; // jumping off whatever we were standing on
      playBlip(660, 0.1); // jump sound
    }
  }
  else if (event.key == 'Shift' || event.shiftKey) {
     bubble();
  }
}

function keyUpHandler(event) {
  if (event.key === 'Right' || event.key === 'ArrowRight') {
    keysPressed.ArrowRight = false;
  } else if (event.key === 'Left' || event.key === 'ArrowLeft') {
    keysPressed.ArrowLeft = false;
  }
}

// ============================================================
// GAME RESET
// ============================================================
// Puts all the per-run state back to its starting values. Note
// this does NOT remove already-spawned platforms/potions or hide
// the princess — those persist between runs in this version.
function resetGame() {
  playerX = 450;
  verticalOffset = 0;
  verticalVelocity = 0;
  currentPlatform = null;
  alicornPoints = 0;
  lives = 3;
  highestPlatformY = Infinity;
  wasFalling = false;
  cameraOffset = 0;
  updateScoreDisplay();
  updateLivesDisplay();
}

// ============================================================
// Objects
// ============================================================
// Simple circle-vs-circle collision check shared by potions and
// the princess. unicorn.x is how far right, unicorn.y is how far down.
function isTouching(unicorn, object) {
  const distanceX = unicorn.x - object.x;
  const distanceY = unicorn.y - object.y;
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
  return distance < unicorn.radius + object.radius;
}

// ============================================================
// MAIN LOOP
// ============================================================
// Runs once per animation frame while gameState === 'playing'.
// Order matters here: physics and collision checks happen first,
// then game-over/win are checked, then the frame gets drawn, then
// movement input is applied for next frame, then we schedule the
// next call to keep the loop going.
function update() {
  if (gameState !== 'playing') return;
  unicornEl.style.display = 'block';

  applyGravityIfFalling();
  checkStillOnCurrentPlatform();
  checkForLanding();
  moveMovingPlatforms();
  maybeSpawnNewPlatform();
  checkForPotionCollection();
  checkForPrincessCollection();

  if (lives === 0) {
    gameState = 'gameover';
    stopMusic();
    drawGameOverMenu();
    return; // stop the loop, the game-over screen takes over
  }

  if (gameState === 'winning') {
    stopMusic();
    drawWinningMenu();
    return; // stop the loop, the winning screen takes over
  }

  checkForFloorHit();
  renderPlayerAndPlatforms();
  applyMovementInput();

  requestAnimationFrame(update); // schedule the next frame
}
// END OF UPDATE MAIN LOOP

// If the player isn't standing on a platform, gravity pulls them
// down: velocity increases each frame, and offset accumulates it.
function applyGravityIfFalling() {
  if (!currentPlatform) {
    verticalVelocity += GRAVITY;
    verticalOffset += verticalVelocity;
  }
  playerY = verticalOffset;
}

// If the player is standing on a platform, check whether they've
// walked off its edge (start falling again) or, if it's a moving
// platform, carry the player along with it.
function checkStillOnCurrentPlatform() {
  if (!currentPlatform) return;

  const stillOnPlatform =
    playerX > currentPlatform.x && playerX < currentPlatform.x + currentPlatform.width;

  if (!stillOnPlatform) {
    currentPlatform = null; // walked off the edge, start falling again
  } else if (currentPlatform.isMoving === true) {
    playerX += MOVING_PLATFORM_SPEED * currentPlatform.moveDirection;
  }
}

// Checks all platforms to see if the player has just fallen onto
// one of them. If several platforms are eligible in the same
// frame, picks the highest (smallest y) one — this matters when
// platforms overlap horizontally.
function checkForLanding() {
  if (currentPlatform) return; // already standing on something

  const newTop = FLOOR_Y + playerY;
  let landedPlatform = null;

  platforms.forEach(platform => {
    const pastLeftEdge = playerX > platform.x;
    const beforeRightEdge = playerX < platform.x + platform.width;
    // "Falling onto it" checks that we're moving downward AND that
    // the platform's surface is between where we were last frame
    // and where we are this frame — this stops the player passing
    // straight through a platform when falling fast.
    const fallingOntoIt =
      verticalVelocity >= 0 &&
      newTop >= platform.y &&
      newTop - verticalVelocity <= platform.y;

    if (pastLeftEdge && beforeRightEdge && fallingOntoIt) {
      if (!landedPlatform || platform.y < landedPlatform.y) {
        landedPlatform = platform;
      }
    }
  });

  if (!landedPlatform) return;

  // Snap the player exactly onto the platform's surface.
  verticalOffset = landedPlatform.y - FLOOR_Y;
  verticalVelocity = 0;
  currentPlatform = landedPlatform;

  // Only counts as scoring progress the first time a NEW highest
  // platform is reached, so re-landing on old platforms doesn't
  // rack up extra points.
  if (landedPlatform.y < highestPlatformY) {
    highestPlatformY = landedPlatform.y;
    alicornPoints++;
    newPlatformSpawned = false;
    nextSpawnY = landedPlatform.y;
    updateScoreDisplay();
    updateSkyForHeight();

    // Landing flash
    unicornEl.style.filter = 'brightness(1.6)';
    setTimeout(() => { unicornEl.style.filter = ''; }, 120);

    // landing sound 
    playBlip(880, 0.15);

    // popup score
    showScorePopup(playerX, FLOOR_Y + playerY - cameraOffset - UNICORN_HEIGHT - 20);

    if (alicornPoints === PRINCESS_SCORE_THRESHOLD && !princessRevealed) {
      revealPrincessPlatform();
    }
  }
}

// Slides any platform flagged isMoving back and forth, bouncing
// off the left/right edges of the canvas.
function moveMovingPlatforms() {
  platforms.forEach(platform => {
    if (!platform.isMoving) return;

    // Multiplying moveDirection and MOVING_PLATFORM_SPEED gives a
    // signed amount to add to x each frame: either +2 (right) or -2 (left).
    platform.x += MOVING_PLATFORM_SPEED * platform.moveDirection;

    // platform.x is the platform's left edge. If <= 0 it has hit
    // the left edge of the canvas; x + width >= canvas.width means
    // it has hit the right edge.
    const hitLeftEdge = platform.x <= 0;
    const hitRightEdge = platform.x + platform.width >= canvas.width;
    if (hitLeftEdge || hitRightEdge) {
      platform.moveDirection *= -1; // reverse direction
    }
    platform.element.style.left = platform.x + 'px';
  });
}

// Once the player has climbed high enough (nextSpawnY small enough)
// and no platform has been spawned for this climb yet, generate a
// new one above the current highest platform, at a random x. Once
// the player is high enough, there's a chance it's a moving platform.
function maybeSpawnNewPlatform() {
  if (nextSpawnY > 280 || newPlatformSpawned) return;
  if (princessRevealed) return; // stop generating once the princess platform exists

  const width = 160;
  const height = 12;
  const maxX = canvas.width - width;
  const x = Math.floor(Math.random() * maxX);
  const y = highestPlatformY - 120; // each new platform sits 120px above the last
  const isHighEnoughForDifficultyIncrease = y <= 560;

  const newPlatform = { x, y, width, height };

  // Adding isMoving/moveDirection onto this same object — it's the
  // same shape platforms.forEach() elsewhere already checks for.
  if (isHighEnoughForDifficultyIncrease && Math.random() < MOVING_PLATFORM_CHANCE_MAX) {
    newPlatform.isMoving = true;
    newPlatform.moveDirection = Math.random() < 0.5 ? 1 : -1;
  }

  platforms.push(newPlatform);
  createPlatformElement(newPlatform);
  maybeSpawnNewPotion(newPlatform);

  newPlatformSpawned = true;
  nextSpawnY = y;
}

// ============================================================
// Potions
// ============================================================
// Every time a new platform spawns, a potion spawns on the same
// row at a random x, independent of the platform's own position.
function maybeSpawnNewPotion(platform) {
  const width = 160;
  const height = 12;
  const maxX = canvas.width - width; // rough potion width
  const x = Math.floor(Math.random() * maxX);
  const y = platform.y;
  const newPotion = { x, y };

  potions.push(newPotion);
  createPotionElement(newPotion);
}

// Checks whether the player is touching any potion. Skips scoring
// entirely while the speech bubble is showing (bubbleEl.parentElement
// is truthy whenever it's attached to the stage) — that's the
// potion-immunity window, and it now correctly lasts 5 seconds from
// the MOST RECENT Shift press thanks to the clearTimeout in bubble().
// On a hit, the potion is removed from both the DOM and the array.
function checkForPotionCollection() {
  potions.forEach(potion => {
    const unicorn = { x: playerX, y: FLOOR_Y + playerY, radius: 12 };
    const object = { x: potion.x, y: potion.y, radius: 12 };

    if (bubbleEl.parentElement) {
      return; // bubble active: immune to potions this frame
    }
    else if (isTouching(unicorn, object)) {
      alicornPoints--;
      updateScoreDisplay();
      potion.element.remove();
      // forEach doesn't let you safely delete from the array
      // mid-loop, so filter() is used to build a fresh array
      // with the collected potion left out.
      potions = potions.filter(p => p !== potion);
    }
  })
}

// ============================================================
// Rendering
// ============================================================
// Every object or character needs to go through here, otherwise
// cameraOffset won't be applied and it'll look like it's floating
// in the wrong place once the camera starts scrolling.
function renderPlayerAndPlatforms() {
  const newTop = FLOOR_Y + playerY;

  unicornEl.style.left = `${playerX}px`;
  unicornEl.style.top = `${newTop - UNICORN_HEIGHT - cameraOffset}px`;
  unicornEl.style.transform = facingRight ? 'scale(4)' : 'scale(-4, 4)'; // flip sprite when facing left

  // Camera only scrolls once the player climbs above CAMERA_MIDDLE;
  // below that, cameraOffset stays 0 and the world doesn't move.
  if (newTop - CAMERA_MIDDLE < 0) {
    cameraOffset = newTop - CAMERA_MIDDLE;
  }

  platforms.forEach(platform => {
    platform.element.style.top = (platform.y - cameraOffset) + 'px';
  });

  // Any object with a fixed world y needs to be re-projected into
  // screen space every frame using the camera offset.
  potions.forEach(potion => {
    potion.element.style.top = (potion.y - cameraOffset) + 'px';
  });

  if (princessRevealed) {
    princessEl.style.top = (princessPlatform.y - cameraOffset - 32) + 'px';
  }

  if (bubbleEl.parentElement) {
    bubbleEl.style.left = `${playerX - 50}px`;
    bubbleEl.style.top = `${newTop - UNICORN_HEIGHT - cameraOffset - 50}px`;
  }
}

// Reads the held-key state and moves the player accordingly. Runs
// after rendering so the visual update above reflects last frame's
// position, and this frame's movement shows up next frame.
function applyMovementInput() {
  if (keysPressed.ArrowLeft) {
    facingRight = false;
    playerX -= MOVEMENT_SPEED;
  }
  if (keysPressed.ArrowRight) {
    facingRight = true;
    playerX += MOVEMENT_SPEED;
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
canvas.addEventListener('click', handleClick);
window.addEventListener('keydown', keyDownHandler);
window.addEventListener('keyup', keyUpHandler);