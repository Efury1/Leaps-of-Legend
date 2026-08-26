// ============================================================
// CONFIG — rescaled for a 900x700 desktop canvas
// ============================================================
const MOVEMENT_SPEED = 7;
const GRAVITY = 0.7;
const FLOOR_Y = 630;
const UNICORN_HEIGHT = 16;
const CAMERA_MIDDLE = 350;
const MOVING_PLATFORM_CHANCE_MAX = 0.6;
const MOVING_PLATFORM_SPEED = 2;

// Music CONFIG
let audioCtx = null;
let musicRepeatTimer = null;
const GAME_TUNE = "cefhjhfec000fhjlmljhjhfec000";
const GAME_NOTE_LEN = 0.25;



// ============================================================
// Facts
// ============================================================

facts = [
  {height: 10, text: "Ancient Greeks thought unicorns were real animals from India.", collected: false},
  {height: 25, text: "People once sold narwhal tusks as unicorn horns for medicine.", collected: false},
  {height: 50, text: "Old Bibles once called a wild ox a unicorn by mistake.", collected: false},
  {height: 100, text: "Scotland still uses the unicorn as its national symbol today.", collected: false}
]

// ============================================================
// DOM REFERENCES
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 700;

const unicornEl = document.getElementById('unicorn');

// If unicorn.png 404s, swap in an emoji so the game still works.
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
let gameState = 'menu';

let playerX = 450;
let playerY = 0;
let facingRight = true;

let verticalOffset = 0;   // how far the player has moved from the floor line (negative = up)
let verticalVelocity = 0; // current vertical speed

let currentPlatform = null; // platform the player is standing on, if any
let cameraOffset = 0;

let score = 0;
let lives = 3;
let highestPlatformY = Infinity;
let wasFalling = false;

let nextSpawnY = 260;        // y value that triggers spawning a new platform
let newPlatformSpawned = false;

const keysPressed = {
  ArrowLeft: false,
  ArrowRight: false
};

// ============================================================
// PLATFORMS — repositioned for the wider 900px stage
// ============================================================
const platforms = [
  { x: 150, y: 500, width: 160, height: 12 },
  { x: 450, y: 380, width: 160, height: 12 },
  { x: 250, y: 260, width: 160, height: 12 },
];

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

function checkForFloorHit() {
  if (verticalOffset >= 0) {
    if (wasFalling) {
      lives--;
      updateLivesDisplay();
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

const potions = [];

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
// PRINCESS PLATFORM — special fixed platform, revealed at score 19
// ============================================================
const PRINCESS_SCORE_THRESHOLD = 15;

// y follows the same climb pattern as your auto-spawned platforms
// (start 500, each new platform 120 higher), pushed a bit further
// so it reads as a distinct "final" platform rather than a normal one.

// Real plataform height would be -1180
// platform is next platform = previous platform - 200
// height is 500 (n - 1) * 120
const princessPlatform = { x: 40, y: -1060, width: 160, height: 12 };
createPlatformElement(princessPlatform);
princessPlatform.element.style.display = 'none';
princessPlatform.element.classList.add('princess-platform');

let princessRevealed = false;

const princessEl = document.createElement('div');
princessEl.id = 'princess';
princessEl.classList.add('princess'); // pulls in size, scale(4), transform-origin from CSS
princessEl.style.position = 'absolute';
princessEl.style.display = 'none';
document.querySelector('.stage').appendChild(princessEl);

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

function revealPrincessPlatform() {
  princessRevealed = true;
  princessPlatform.element.style.display = 'block';
  platforms.push(princessPlatform); // landing logic now checks it too

  princessEl.style.left = princessPlatform.x + (princessPlatform.width / 2 - 16) + 'px';
  princessEl.style.display = 'block';
}

// ============================================================
// Sky
// ============================================================

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
      const freq = 440 * Math.pow(1.06, -105 + str.charCodeAt(i));
      osc.frequency.setValueAtTime(freq, startTime);

      masterGain.gain.setValueAtTime(0.5, startTime);
      masterGain.gain.setTargetAtTime(0.001, startTime + 0.1, 0.05);

      osc.start(startTime);
      osc.stop(startTime + noteLen - 0.01);
    }
  }

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
// ============================================================
// MENU SCREENS
// ============================================================
// Deterministic star scatter so the menu backdrop reads as a night
// sky without relying on Math.random (same look every time it draws).
function drawStars(count) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let i = 0; i < count; i++) {
    const x = (i * 137.5) % canvas.width;
    const y = (i * 79.3) % canvas.height;
    const r = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Same deep-space-to-violet gradient used by the sky__space/midnight
// CSS classes, so the menu and game-over screens feel like the same world.
function drawMagicalBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#2d1b4e');
  gradient.addColorStop(1, '#0f0820');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawStars(60);
}

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

function drawTitle(text, centerY) {
  ctx.textAlign = 'center';
  ctx.font = '40px Trebuchet MS';
  ctx.shadowColor = '#ff9ecb';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffd76e';
  ctx.fillText(text, canvas.width / 2, centerY);
  ctx.shadowBlur = 0;
}

function drawTextOnParchment(text, centerX, centerY, font) {

  ctx.font = font;
  const textWidth = ctx.measureText(text).width;

  // Cotton-candy pink box with a plum border, matching the topbar styling
  drawRoundedRect(
    centerX - textWidth / 2 - 20,
    centerY - 20,
    textWidth + 40,
    40,
    10,
    '#ffe6f5',
    '#5b2f8a'
  );

  // draw text ontop
  ctx.fillStyle = '#6b2f8f';
  ctx.textAlign = 'center';

  // 7 is to budge the baseline up 
  ctx.fillText(text, centerX, centerY + 7);
}

function drawMenuButton(label, y) {
  drawRoundedRect(canvas.width / 2 - 70, y, 140, 50, 12, '#c9427a', '#ffe6f5');
  ctx.fillStyle = '#fff9f0';
  ctx.font = '22px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText(label, canvas.width / 2, y + 32);
}

function drawMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawMagicalBackground();
  drawTitle('Leaps of Legend', 170);
  drawTextOnParchment(
    'Climb up the platforms to meet the princess and give her your Alicorn points to save her.',
    canvas.width / 2,
    250,
    '20px Trebuchet MS',
  );

  drawMenuButton('Play', 340);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });
  princessEl.style.display = 'none';
}

function drawGameOverMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawMagicalBackground();
  drawTitle('Game Over', 240);

  ctx.fillStyle = '#ffe6f5';
  ctx.font = '24px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('Alicorn Score: ' + score, canvas.width / 2, 280);

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
function updateScoreDisplay() {
  document.querySelector('.topbar div:last-child').textContent = 'Alicorn Points: ' + score;
}

function updateLivesDisplay() {
  document.querySelector('.rainbows').textContent = '🌈'.repeat(lives);
}

// ============================================================
// INPUT
// ============================================================
function handleClick(event) {
  if (gameState !== 'menu' && gameState !== 'gameover') return;

  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  const buttonY = gameState === 'menu' ? 340 : 320;
  const buttonX = canvas.width / 2 - 70, buttonW = 140, buttonH = 50;
  const clickedButton =
    clickX >= buttonX && clickX <= buttonX + buttonW &&
    clickY >= buttonY && clickY <= buttonY + buttonH;

  if (!clickedButton) return;

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

function keyDownHandler(event) {
  if (event.key === 'Right' || event.key === 'ArrowRight') {
    keysPressed.ArrowRight = true;
  } else if (event.key === 'Left' || event.key === 'ArrowLeft') {
    keysPressed.ArrowLeft = true;
  } else if (event.key === 'ArrowUp') {
    if (verticalVelocity === 0) {
      verticalVelocity = -15;
      currentPlatform = null; // jumping off whatever we were standing on
    }
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
function resetGame() {
  playerX = 450;
  verticalOffset = 0;
  verticalVelocity = 0;
  currentPlatform = null;
  score = 0;
  lives = 3;
  highestPlatformY = Infinity;
  wasFalling = false;
  cameraOffset = 0;
  updateScoreDisplay();
  updateLivesDisplay();
}

// ============================================================
// MAIN LOOP
// ============================================================
function update() {
  if (gameState !== 'playing') return;
  unicornEl.style.display = 'block';

  applyGravityIfFalling();
  checkStillOnCurrentPlatform();
  checkForLanding();
  moveMovingPlatforms();
  maybeSpawnNewPlatform();

  if (lives === 0) {
    gameState = 'gameover';
    stopMusic();
    drawGameOverMenu();
    return;
  }

  checkForFloorHit();
  renderPlayerAndPlatforms();
  applyMovementInput();

  requestAnimationFrame(update);
}

function applyGravityIfFalling() {
  if (!currentPlatform) {
    verticalVelocity += GRAVITY;
    verticalOffset += verticalVelocity;
  }
  playerY = verticalOffset;
}

function checkStillOnCurrentPlatform() {
  if (!currentPlatform) return;

  const stillOnPlatform =
    playerX > currentPlatform.x && playerX < currentPlatform.x + currentPlatform.width;

  if (!stillOnPlatform) {
    currentPlatform = null; // walked off the edge, start falling again
  }
}

function checkForLanding() {
  if (currentPlatform) return; // already standing on something

  const newTop = FLOOR_Y + playerY;
  let landedPlatform = null;

  platforms.forEach(platform => {
    const pastLeftEdge = playerX > platform.x;
    const beforeRightEdge = playerX < platform.x + platform.width;
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

  verticalOffset = landedPlatform.y - FLOOR_Y;
  verticalVelocity = 0;
  currentPlatform = landedPlatform;

  if (landedPlatform.y < highestPlatformY) {
    highestPlatformY = landedPlatform.y;
    score++;
    newPlatformSpawned = false;
    nextSpawnY = landedPlatform.y;
    updateScoreDisplay();
    updateSkyForHeight();

    if (score === PRINCESS_SCORE_THRESHOLD && !princessRevealed) {
      revealPrincessPlatform();
    }
  }
}

function moveMovingPlatforms() {
  platforms.forEach(platform => {
    if(!platform.isMoving) return;
    /* Multiplying moveDirection and MOVE_PLATFORM_SPEED gives
    * us a signed amount to add to x each frame 
    * Signed meaning it is either +1.5 meaning 1.5 to right
    * - 1.5 meaning 1.5 to left*/
    platform.x += MOVING_PLATFORM_SPEED * platform.moveDirection;

    /* platform.x is the platforms left edge position. If <= 0 it means 
    * it has passed the dge of the canvas */
    const hitLeftEdge = platform.x <= 0;
    /* The platform has a width, therefore the right is platform.x + platform.width. */
    const hitRightEdge = platform.x + platform.width >= canvas.width;
    if (hitLeftEdge || hitRightEdge) {
      platform.moveDirection *= -1;
    }
    platform.element.style.left = platform.x + 'px';
  });
}

function maybeSpawnNewPlatform() {
  if (nextSpawnY > 280 || newPlatformSpawned) return;
  if (princessRevealed) return; // stop generating once the princess platform exists

  const width = 160;
  const height = 12;
  const maxX = canvas.width - width;
  const x = Math.floor(Math.random() * maxX);
  const y = highestPlatformY - 120;
  const isHighEnoughForDifficultyIncrease = y <= 560;

  const newPlatform = { x, y, width, height };
  
  /* We are putting a new property onto the sam eobject. So, it will have isMoving and moveDirection */
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

function renderPlayerAndPlatforms() {
  const newTop = FLOOR_Y + playerY;

  unicornEl.style.left = `${playerX}px`;
  unicornEl.style.top = `${newTop - UNICORN_HEIGHT - cameraOffset}px`;
  unicornEl.style.transform = facingRight ? 'scale(4)' : 'scale(-4, 4)';

  if (newTop - CAMERA_MIDDLE < 0) {
    cameraOffset = newTop - CAMERA_MIDDLE;
  }

  platforms.forEach(platform => {
    platform.element.style.top = (platform.y - cameraOffset) + 'px';
  });

  if (princessRevealed) {
    princessEl.style.top = (princessPlatform.y - cameraOffset - 32) + 'px';
  }
}

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