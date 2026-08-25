// ============================================================
// CONFIG
// ============================================================
const MOVEMENT_SPEED = 5;
const GRAVITY = 0.6;
const FLOOR_Y = 450;
const UNICORN_HEIGHT = 16;
const CAMERA_MIDDLE = 250;
const MOVING_PLATFORM_CHANCE_MAX = 0.6;
const MOVING_PLATFORM_SPEED = 1.5;

// ============================================================
// DOM REFERENCES
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 500;

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

let playerX = 200;
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

let nextSpawnY = 180;        // y value that triggers spawning a new platform
let newPlatformSpawned = false;

const keysPressed = {
  ArrowLeft: false,
  ArrowRight: false
};

// ============================================================
// PLATFORMS
// ============================================================
const platforms = [
  { x: 90, y: 360, width: 120, height: 10 },
  { x: 180, y: 270, width: 120, height: 10 },
  { x: 150, y: 180, width: 120, height: 10 },
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

// ============================================================
// MENU SCREENS
// ============================================================
function drawMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#dce9f7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#b48ecb';
  ctx.font = '28px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('Uni-Hop', canvas.width / 2, 180);

  ctx.fillStyle = '#b48ecb';
  ctx.fillRect(150, 250, 100, 40);
  ctx.fillStyle = '#fff8fb';
  ctx.font = '18px Trebuchet MS';
  ctx.fillText('Play', 200, 275);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });
}

function drawGameOverMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#dce9f7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#b48ecb';
  ctx.font = '28px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, 150);

  ctx.font = '20px Trebuchet Ms';
  ctx.fillText('Score: ' + score, canvas.width / 2, 190);

  ctx.fillStyle = '#b48ecb';
  ctx.fillRect(150, 250, 100, 40);
  ctx.fillStyle = '#fff8fb';
  ctx.font = '18px Trebuchet MS';
  ctx.fillText('Play again', 200, 275);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });
}

drawMenu(); // show the menu as soon as everything above is ready

// ============================================================
// DISPLAY HELPERS
// ============================================================
function updateScoreDisplay() {
  document.querySelector('.topbar div:last-child').textContent = 'Score: ' + score;
}

function updateLivesDisplay() {
  document.querySelector('.rainbows').textContent = '🌈'.repeat(lives);
}

// ============================================================
// INPUT
// ============================================================
function handleClick(event) {
  if (gameState !== 'menu') return;

  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  const buttonX = 150, buttonY = 250, buttonW = 100, buttonH = 40;
  const clickedButton =
    clickX >= buttonX && clickX <= buttonX + buttonW &&
    clickY >= buttonY && clickY <= buttonY + buttonH;

  if (clickedButton) {
    gameState = 'playing';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    platforms.forEach(platform => {
      platform.element.style.display = 'block';
    });
    update();
  }
}

function keyDownHandler(event) {
  if (event.key === 'Right' || event.key === 'ArrowRight') {
    keysPressed.ArrowRight = true;
  } else if (event.key === 'Left' || event.key === 'ArrowLeft') {
    keysPressed.ArrowLeft = true;
  } else if (event.key === 'ArrowUp') {
    if (verticalVelocity === 0) {
      verticalVelocity = -12;
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
  playerX = 200;
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

  if (landedPlatform) {
    verticalOffset = landedPlatform.y - FLOOR_Y;
    verticalVelocity = 0;
    currentPlatform = landedPlatform;

    if (landedPlatform.y < highestPlatformY) {
      highestPlatformY = landedPlatform.y;
      score++;
      newPlatformSpawned = false;
      nextSpawnY = landedPlatform.y;
      updateScoreDisplay();
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
  if (nextSpawnY > 200 || newPlatformSpawned) return;

  const width = 120;
  const height = 10;
  const maxX = canvas.width - width;
  const x = Math.floor(Math.random() * maxX);
  const y = highestPlatformY - 90;
  const isHighEnoughForDifficultyIncrease = y <= 400;

  const newPlatform = { x, y, width, height };
  
  /* We are putting a new property onto the sam eobject. So, it will have isMoving and moveDirection */
  if (isHighEnoughForDifficultyIncrease && Math.random() < MOVING_PLATFORM_CHANCE_MAX) {
    newPlatform.isMoving = true;
    newPlatform.moveDirection = Math.random() < 0.5 ? 1 : -1;
  }

  platforms.push(newPlatform);
  createPlatformElement(newPlatform);

  newPlatformSpawned = true;
  nextSpawnY = y;

}

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

function renderPlayerAndPlatforms() {
  const newTop = FLOOR_Y + playerY;

  unicornEl.style.left = `${playerX}px`;
  unicornEl.style.top = `${newTop - UNICORN_HEIGHT - cameraOffset}px`;
  unicornEl.style.transform = facingRight ? 'scale(3)' : 'scale(-3, 3)';

  if (newTop - CAMERA_MIDDLE < 0) {
    cameraOffset = newTop - CAMERA_MIDDLE;
  }

  platforms.forEach(platform => {
    platform.element.style.top = (platform.y - cameraOffset) + 'px';
  });
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