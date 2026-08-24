const MOVEMENT_SPEED = 5;
let positionX = 200; // starting point
let positionY = 0;
let facingRight = true;
let groundOffset = 0;
const floor = 450;

let distance = 0; // on first cloud
let speed = 0;
const GRAVITY = 0.6;
const UNICORN = document.getElementById('unicorn');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 500;

let gameState = 'menu';
let restingPlatform = null; // tracks which platform (if any) we're currently standing on

let score = 0;
let lives = 3;
let highestPlatformY = Infinity;
let wasFalling = false;

function drawMenu() {
  UNICORN.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#dce9f7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#b48ecb';
  ctx.font = '28px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('Uni-Hop', canvas.width / 2, 180);

  // play button
  ctx.fillStyle = '#b48ecb';
  ctx.fillRect(150, 250, 100, 40);
  ctx.fillStyle = '#fff8fb';
  ctx.font = '18px Trebuchet MS';
  ctx.fillText('Play', 200, 275);
}

function drawGameOverMenu() {
  UNICORN.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#dce9f7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#b48ecb';
  ctx.font = '28px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('Uni-Hop', canvas.width / 2, 180);

  // play button
  ctx.fillStyle = '#b48ecb';
  ctx.fillRect(150, 250, 100, 40);
  ctx.fillStyle = '#fff8fb';
  ctx.font = '18px Trebuchet MS';
  ctx.fillText('Play', 200, 275);
}



function handleClick(event) {
  if (gameState !== 'menu') return;

  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  const buttonX = 150, buttonY = 250, buttonW = 100, buttonH = 40;

  if (clickX >= buttonX && clickX <= buttonX + buttonW &&
      clickY >= buttonY && clickY <= buttonY + buttonH) {
    gameState = 'playing';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();
  }
}

canvas.addEventListener('click', handleClick);
drawMenu(); // draw menu as soon as page loads

const platforms = [
  { x: 90, y: 360, width: 120, height: 10 },
  { x: 180, y: 270, width: 120, height: 10 },
  { x: 150, y: 180, width: 120, height: 10 },
];

platforms.forEach(platform => {
  const element = document.createElement('div');
  element.className = 'platform';
  element.style.left = platform.x + 'px';
  element.style.top = platform.y + 'px';
  element.style.width = platform.width + 'px';
  element.style.height = platform.height + 'px';
  document.querySelector('.stage').appendChild(element);
  platform.element = element;
});

let keysPressed = {
  ArrowLeft: false,
  ArrowRight: false
}

function keyDownHandler(event) {
  if (event.key === "Right" || event.key === "ArrowRight") {
    keysPressed.ArrowRight = true;
  } else if (event.key === "Left" || event.key === "ArrowLeft") {
    keysPressed.ArrowLeft = true;
  }
  else if (event.key === 'ArrowUp') {
    if (speed === 0) {
      speed = -12;
      restingPlatform = null; // leaving the platform we were standing on
    }
  }
}

function keyUpHandler(event) {
  if (event.key === "Right" || event.key === "ArrowRight") {
    keysPressed.ArrowRight = false;
  } else if (event.key === "Left" || event.key === "ArrowLeft") {
    keysPressed.ArrowLeft = false;
  }
}

function updateScoreDisplay() {
  document.querySelector('.topbar div:last-child').textContent = 'Score: ' + score;
}

function updateLivesDisplay() {
  document.querySelector('.rainbows').textContent = '🌈'.repeat(lives)
}

let cameraOffset = 0;

function update() {
  if (gameState !== 'playing') return; // safety check
  UNICORN.style.display = 'block';

  // only apply gravity if we're not already standing on something
  if (!restingPlatform) {
    speed += GRAVITY;
    distance += speed;
  }

  positionY = distance;
  let newTop = floor + positionY;

  // if we were resting, check we're still within that platform's x-range
  if (restingPlatform) {
    let stillOnPlatform = positionX > restingPlatform.x && positionX < restingPlatform.x + restingPlatform.width;
    if (!stillOnPlatform) {
      restingPlatform = null; // walked off the edge, start falling again
    }
  }

  // only look for a NEW landing if we're currently falling
  if (!restingPlatform) {
    let bestPlatform = null;
    platforms.forEach(platform => {
      let pastLeftEdge = positionX > platform.x;
      let beforeRightEdge = positionX < platform.x + platform.width;

      if (pastLeftEdge && beforeRightEdge && speed >= 0 &&
          newTop >= platform.y && newTop - speed <= platform.y) {
        if (!bestPlatform || platform.y < bestPlatform.y) {
          bestPlatform = platform;
        }
      }
    });

    // Whilst restingPlatform is set, the unicorn sets there
    if (bestPlatform) {
      distance = bestPlatform.y - floor;
      speed = 0;
      restingPlatform = bestPlatform; // now officially resting

      // highest platform ascts as a memory for the best height
      // the bestPlatform.y < highestPlatformY only passed when you've hit one high than before
      if(bestPlatform.y < highestPlatformY) {
          highestPlatformY = bestPlatform.y;
          score++;
          updateScoreDisplay();
        }
    }
  }

  if (lives === 0) {
    drawGameOverMenu();
  }

  if (distance >= 0) {
    if (wasFalling) {
      lives--;
      updateLivesDisplay();
    }
    distance = 0;
    speed = 0;
    restingPlatform = null; // ground isn't tracked as a platform, so clear this
    wasFalling = false;
  } else {
    wasFalling = true;
  }

  

  positionY = distance;
  newTop = floor + positionY;

  UNICORN.style.left = `${positionX}px`;
  const UNICORN_HEIGHT = 16;
  UNICORN.style.top = `${newTop - UNICORN_HEIGHT - cameraOffset}px `;

  UNICORN.style.transform = facingRight ? 'scale(3)' : 'scale(-3, 3)';

  // if the unicorn appears above the middle line
  const MIDDLE = 250;
  if (newTop - MIDDLE < 0) {
    cameraOffset = newTop - MIDDLE;
  }

  platforms.forEach(platform => {
    platform.element.style.top = (platform.y - cameraOffset) + 'px';
  })
 
  if (keysPressed.ArrowLeft === true) {
    facingRight = false;
    positionX -= MOVEMENT_SPEED;
  }

  if (keysPressed.ArrowRight === true) {
    facingRight = true;
    positionX += MOVEMENT_SPEED;
  }

  requestAnimationFrame(update);
}

window.addEventListener('keydown', keyDownHandler);
window.addEventListener('keyup', keyUpHandler);