// ============================================================
// Constants and variables
// ============================================================
const MOVEMENT_SPEED = 7;         
const g = 0.7;                
const FLOOR_Y = 630;              
const UNI_HEIGHT = 16; 
const CAM_MID = 350;         
const MVG_PLATFORM_CHANCE_MAX = 0.6; 
const MVG_PLATFORM_SPEED = 2;  
const PTN_SPAWN_CHANGE = 0.5; 
let lvl = 1; 
let aliPoints = 0; 
let clibScore = 0;   

// Music CONFIG
let audioCtx = null; 
let mscRepeatTimer = null; 
const GME_NT_LEN = 0.2;
const GAM_TUNE = "cefhjhfec000fhjlmljhjhfec000"; 

// ============================================================
// DOM REFERENCES
// ============================================================
const cavs = document.getElementById('gameCanvas');
const ctx = cavs.getContext('2d');
cavs.width = 900;
cavs.height = 700;

const unicornEl = document.getElementById('unicorn'); 

const unicornImg = new Image();
unicornImg.src = 'unicorn.png';

// ============================================================
// GAME STATE
// ============================================================
let gameState = 'menu';

let pX = 450;     
let pY = 0;      
let facRight = true; 

let vertOffset = 0;   
let verVelocity = 0; 
let canDbleJump = false;

let currPlat = null; 
let cmaOffset = 0;      

let lves = 3; 
let highestPlatformY = Infinity; 
let wasFalling = false; 

let nxtSpawnY = 260;        
let newPlatSpawned = false; 

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

function cckFloorHit() {
  if (vertOffset >= 0) {
    if (wasFalling) {
      lves--;
      updLvesDisplay();
      pyBlip(220, 0.3); // sound + screen shake on losing a life
      const stage = document.querySelector('.stage');
      stage.classList.add('shake');
      setTimeout(() => stage.classList.remove('shake'), 300);
    }
    vertOffset = 0;
    verVelocity = 0;
    currPlat = null;
    wasFalling = false;
    canDbleJump = true;
  } else {
    wasFalling = true;
  }
  pY = vertOffset;
}

// ============================================================
// Potions
// ============================================================
let ptns = [];

function createPtnEl(ptn) {
  const element = document.createElement('div');
  element.className = 'potion';
  element.style.left = ptn.x + 'px';
  element.style.top = ptn.y + 'px';
  element.textContent = '🧪';
  document.querySelector('.stage').appendChild(element);
  ptn.element = element;
}

ptns.forEach(createPtnEl);

// ============================================================
// Unicorn Bubble
// ============================================================
const bubbleEl = document.createElement('div');

let bubbleTimeout = null;

function rmeBubble() {
  bubbleEl.remove();
  bubbleTimeout = null;
}

function bble() {
    bubbleEl.className = 'bubbleEl';
    document.querySelector('.stage').appendChild(bubbleEl);
    
    if (!bubbleEl.querySelector('.bubbleDot')) {
      const dot = document.createElement('div');
      dot.className = 'bubbleDot';
      bubbleEl.appendChild(dot);
    }

    if (bubbleTimeout) {
      clearTimeout(bubbleTimeout);
    }

    bubbleTimeout = setTimeout(() => {
      rmeBubble();
    }, 5000);
}

// ============================================================
// PRINCESS PLAT
// ============================================================
const PRIN_SCR_THRES = 15;
const princessPlat = { x: 40, y: -1060, width: 160, height: 12 };
createPlatformElement(princessPlat);
princessPlat.element.style.display = 'none'; 
princessPlat.element.classList.add('princess-platform');

let prinRev = false; 

const princessEl = document.createElement('div');
princessEl.id = 'princess';
princessEl.classList.add('princess'); 
princessEl.style.position = 'absolute';
princessEl.style.display = 'none';
document.querySelector('.stage').appendChild(princessEl);

const prinImg = new Image();
prinImg.onload = () => {
  princessEl.style.backgroundImage = "url('princess1.png')";
  princessEl.style.backgroundRepeat = 'no-repeat';
};
prinImg.src = 'princess.png';

function rvlPrinPlat() {
  prinRev = true;
  princessPlat.element.style.display = 'block';
  platforms.push(princessPlat);

  princessEl.style.left = princessPlat.x + (princessPlat.width / 2 - 16) + 'px';
  princessEl.style.display = 'block';
}

function cckPrinColl() {
  const unicorn = { x: pX, y: FLOOR_Y + pY, radius: 12 };
  const object = {
    x: princessPlat.x + princessPlat.width / 2,
    y: princessPlat.y,
    radius: princessPlat.width / 2
  };

  if (isTouch(unicorn, object)) {
    if (clibScore >= PRIN_SCR_THRES) {
      lvl++;
      gameState = 'winning';
      drawWinningMenu();
    }
  }
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

function updteSkyForHght() {
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

      // Quick attack, quick decay, so notes don't bleed into each other.
      masterGain.gain.setValueAtTime(0.1, startTime); // Lowered to 2, so not as loud
      masterGain.gain.setTargetAtTime(0.001, startTime + 0.1, 0.05);

      osc.start(startTime);
      osc.stop(startTime + noteLen - 0.01);
    }
  }

  const tuneDurationMs = (str.length * noteLen + 0.3) * 1000;
  mscRepeatTimer = setTimeout(() => playTune(str, noteLen), tuneDurationMs);
}

function stopMusic() {
  if (mscRepeatTimer) {
    clearTimeout(mscRepeatTimer);
    mscRepeatTimer = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

function pyBlip(freq, duration = 0.12) {
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
function drawBG() {
  const gradient = ctx.createLinearGradient(0, 0, 0, cavs.height);
  gradient.addColorStop(0, '#2d1b4e');
  gradient.addColorStop(1, '#0f0820');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cavs.width, cavs.height);
}

function drawRoundRect(x, y, width, height, radius, fillColor, strokeColor) {
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

function drawTtle(text, centerY) {
  ctx.textAlign = 'center';
  ctx.font = '40px Trebuchet MS';
  ctx.shadowColor = '#ff9ecb';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffd76e';
  ctx.fillText(text, cavs.width / 2, centerY);
  ctx.shadowBlur = 0; // reset so the shadow doesn't leak into later drawing
}

function drawTxtParchment(text, centerX, centerY, font) {
  ctx.font = font;
  const textWidth = ctx.measureText(text).width;
  drawRoundRect(
    centerX - textWidth / 2 - 20,
    centerY - 20,
    textWidth + 40,
    40,
    10,
    '#ffe6f5',
    '#5b2f8a'
  );

  ctx.fillStyle = '#6b2f8f';
  ctx.textAlign = 'center';

  ctx.fillText(text, centerX, centerY + 7); 
}

function drawLinesOnParchment(text, centerX, centerY, font) {
  ctx.font = font;
  const lineHeight = 25;
  const pding = 20;
  const txtWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const txtHeight = lines.length * lineHeight;

  drawRoundRect(
    centerX - txtWidth / 2 - pding,
    centerY - pding,
    txtWidth + pding * 2,
    txtHeight + pding, 
    10,
    '#ffe6f5',
    '#5b2f8a'
  );

  ctx.fillStyle = '#6b2f8f';
  ctx.textAlign = 'center';

  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, centerY + 7 + (index * 25));
  });
}

function drawMenuBtn(label, y) {
  drawRoundRect(cavs.width / 2 - 70, y, 140, 50, 12, '#c9427a', '#ffe6f5');
  ctx.fillStyle = '#fff9f0';
  ctx.font = '22px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText(label, cavs.width / 2, y + 32);
}

const lines = [
  'Two separate scores: your CLIMB and your ALICORN POINTS',
  'Climb: +1 per new platform reached, resets every level, must hit 15 to reveal the princess',
  'Alicorn Points: +1 or -1 per potion 🧪, carries over between levels, never resets',
  'Shift = conjure a bubble, potions can\'t touch what\'s inside',
  'Falling costs a life 🌈, even legends have bad landings'
];

function drawMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, cavs.width, cavs.height);

  drawBG();
  drawTtle('Leaps of Legend', 100);

  drawTxtParchment(
    'Climb platform to platform and reach the princess.',
    cavs.width / 2,
    150,
    '18px Trebuchet MS',
  );

  drawLinesOnParchment(lines, cavs.width / 2, 200, '15px Trebuchet MS');

  drawTxtParchment('← → move  |  ↑ jump or double jump | Shift: to have protective bubble', cavs.width / 2, 350, '15px Trebuchet MS');

  drawMenuBtn('Play', 420);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });

  ptns.forEach(potion => {
    potion.element.style.display = 'none';
  });

  princessEl.style.display = 'none';
}

function drawWinningMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, cavs.width, cavs.height);

  drawBG();
  drawTtle('Leaps of Legend', 170);
  drawTxtParchment(
    'The princess weeps with gratitude. word travels fast.',
    cavs.width / 2,
    250,
    '20px Trebuchet MS',
  );

  drawTxtParchment(
    'People need a hero. Or at least someone who can jump good',
    cavs.width / 2,
    300,
    '20px Trebuchet MS',
  );

  drawTxtParchment(
    'Level ' + lvl + ' begins now. Alicorn Points carried over: ' + aliPoints,
    cavs.width / 2,
    360,
    '16px Trebuchet MS',
  );

  drawMenuBtn('Play ' + lvl, 390);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });

  ptns.forEach(potion => {
    potion.element.style.display = 'none';
  });

  princessEl.style.display = 'none';
}

function drawGameOverMenu() {
  unicornEl.style.display = 'none';
  ctx.clearRect(0, 0, cavs.width, cavs.height);

  drawBG();
  drawTtle('Game Over', 240);

  ctx.fillStyle = '#ffe6f5';
  ctx.font = '24px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('Climb: ' + clibScore + ' / ' + PRIN_SCR_THRES, cavs.width / 2, 280);
  ctx.font = '18px Trebuchet MS';
  ctx.fillText('Alicorn Points: ' + aliPoints, cavs.width / 2, 310);

  drawMenuBtn('Play again', 340);

  platforms.forEach(platform => {
    platform.element.style.display = 'none';
  });

  ptns.forEach(potion => {
    potion.element.style.display = 'none';
  });

  princessEl.style.display = 'none';
}

const unicornMutterings = [
  'Ugh, why is this so hard',
  'Nobody said anything about this many stairs',
  'I am a MAGICAL creature, not a mountain goat',
  'Whose idea was this curse anyway',
  'I could be grazing right now',
  'Is this really the only way to cure a curse',
  'Cool cool cool, more platforms, love that for me'
];

function pickRandomMuttering() {
    const randomIndex = Math.floor(Math.random() * unicornMutterings.length);
    return unicornMutterings[randomIndex];
}

drawMenu();

// ============================================================
// DISPLAY HELPERS
// ============================================================
function updScoreDisplay() {
  document.querySelector('.topbar div:last-child').textContent =
    'Climb: ' + clibScore + '/' + PRIN_SCR_THRES + '   Alicorn Points: ' + aliPoints;
}

function updLvesDisplay() {
  document.querySelector('.rainbows').textContent = '🌈'.repeat(lves);
}

function showScorePopup(x, y) {
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = '+1';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.querySelector('.stage').appendChild(el);
  setTimeout(() => el.remove(), 600);
}

function showLossPopup(x, y) {
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = '-1';
  el.style.color = '#ff4d4d';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.querySelector('.stage').appendChild(el);
  setTimeout(() => el.remove(), 600);
}

function showMutteringPopup(x, y) {
  const el = document.createElement('div');
  el.className = 'muttering';
  el.textContent = pickRandomMuttering();
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.querySelector('.stage').appendChild(el);
  setTimeout(() => el.remove(), 40000);
}

// ============================================================
// INPUT
// ============================================================

function handleClick(event) {
  if (gameState !== 'menu' && gameState !== 'gameover' && gameState !== 'winning') return;

  const rect = cavs.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  const buttonY =
    gameState === 'menu' ? 420 :
    gameState === 'winning' ? 390 :
    340; // gameover

  const buttonX = cavs.width / 2 - 70, buttonW = 140, buttonH = 50;
  const clickedButton =
    clickX >= buttonX && clickX <= buttonX + buttonW &&
    clickY >= buttonY && clickY <= buttonY + buttonH;

  if (!clickedButton) return;

  // Reset progress before starting a new run, whether coming from
  // game over or a win. The very first menu doesn't need a reset.
  if (gameState === 'gameover' || gameState === 'winning') {
    resetGame();
  }

  gameState = 'playing';
  playTune(GAM_TUNE, GME_NT_LEN);
  ctx.clearRect(0, 0, cavs.width, cavs.height);

  setInterval(() => showMutteringPopup(pX, FLOOR_Y + pY - cmaOffset - UNI_HEIGHT - 20), 20000);

  platforms.forEach(platform => {
    platform.element.style.display = 'block';
  });

  ptns.forEach(potion => {
    potion.element.style.display = 'block';
  });

  if (prinRev) {
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
    if (verVelocity === 0) {
      verVelocity = -15;
      currPlat = null; // jumping off whatever we were standing on
      pyBlip(660, 0.1);
    }
    else if(verVelocity !== 0 && canDbleJump === true) {
      verVelocity = -15;
      pyBlip(660, 0.1);
      canDbleJump = false;
    }
  }
  else if (event.key == 'Shift' || event.shiftKey) {
     bble();
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
  pX = 450;
  vertOffset = 0;
  verVelocity = 0;
  currPlat = null;
  clibScore = 0; // per-level gate resets so the princess needs 15 fresh climbs again
  lves = 3;
  highestPlatformY = Infinity;
  wasFalling = false;
  cmaOffset = 0;

  prinRev = false;
  princessPlat.element.style.display = 'none';

  const princessIndex = platforms.indexOf(princessPlat);
  if (princessIndex !== -1) {
    platforms.splice(princessIndex, 1);
  }

  while (platforms.length > 3) {
    const removed = platforms.pop();
    removed.element.remove();
  }

  updScoreDisplay();
  updLvesDisplay();
}

// ============================================================
// Objects
// ============================================================
function isTouch(unicorn, object) {
  const dX = unicorn.x - object.x;
  const dY = unicorn.y - object.y;
  const d = Math.sqrt(dX * dX + dY * dY);
  return d < unicorn.radius + object.radius;
}

// ============================================================
// MAIN LOOP
// ============================================================
function update() {
  if (gameState !== 'playing') return;
  unicornEl.style.display = 'block';

  alyGIfFalling();
  cckOnCurrPlat();
  cckLand();
  moveMovingPlatforms();
  maybeSpawnNewPlatform();
  cckPtnColl();
  cckPrinColl();

  if (lves === 0) {
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

  cckFloorHit();
  rderPlayAPlat();
  applyMovementInput();

  requestAnimationFrame(update);
}

function alyGIfFalling() {
  if (!currPlat) {
    verVelocity += g;
    vertOffset += verVelocity;
  }
  pY = vertOffset;
}

function cckOnCurrPlat() {
  if (!currPlat) return;

  const stillOnPlatform =
    pX > currPlat.x && pX < currPlat.x + currPlat.width;

  if (!stillOnPlatform) {
    currPlat = null;
  } else if (currPlat.isMoving === true) {
    pX += MVG_PLATFORM_SPEED * currPlat.moveDirection;
  }
}

function cckLand() {
  if (currPlat) return; // already standing on something

  const newTop = FLOOR_Y + pY;
  let landedPlatform = null;

  platforms.forEach(platform => {
    const pastLeftEdge = pX > platform.x;
    const beforeRightEdge = pX < platform.x + platform.width;
    const fallingOntoIt =
      verVelocity >= 0 &&
      newTop >= platform.y &&
      newTop - verVelocity <= platform.y;

    if (pastLeftEdge && beforeRightEdge && fallingOntoIt) {
      if (!landedPlatform || platform.y < landedPlatform.y) {
        landedPlatform = platform;
      }
    }
  });

  if (!landedPlatform) return;

  vertOffset = landedPlatform.y - FLOOR_Y;
  verVelocity = 0;
  currPlat = landedPlatform;
  canDbleJump = true;

  if (landedPlatform.y < highestPlatformY) {
    highestPlatformY = landedPlatform.y;
    clibScore++;
    newPlatSpawned = false;
    nxtSpawnY = landedPlatform.y;
    updScoreDisplay();
    updteSkyForHght();

    // Landing flash
    unicornEl.style.filter = 'brightness(1.6)';
    setTimeout(() => { unicornEl.style.filter = ''; }, 120);

    pyBlip(880, 0.15);

    showScorePopup(pX, FLOOR_Y + pY - cmaOffset - UNI_HEIGHT - 20);

    if (clibScore === PRIN_SCR_THRES && !prinRev) {
      rvlPrinPlat();
    }
  }
}

function moveMovingPlatforms() {
  platforms.forEach(platform => {
    if (!platform.isMoving) return;
    platform.x += MVG_PLATFORM_SPEED * platform.moveDirection;
    const hitLeftEdge = platform.x <= 0;
    const hitRightEdge = platform.x + platform.width >= cavs.width;
    if (hitLeftEdge || hitRightEdge) {
      platform.moveDirection *= -1;
    }
    platform.element.style.left = platform.x + 'px';
  });
}


function maybeSpawnNewPlatform() {
  if (nxtSpawnY > 280 || newPlatSpawned) return;
  if (prinRev) return; // stop generating once the princess platform exists

  // Platforms shrink as your climb
  const width = Math.max(70, 160 - Math.floor((600 - highestPlatformY) / 20) - (lvl - 1) * 15);
  const height = 12;
  const maxX = cavs.width - width;
  const x = Math.floor(Math.random() * maxX);
  const y = highestPlatformY - 120; // each new platform sits 120px above the last
  const isHighEnoughForDifficultyIncrease = y <= 560;

  const newPlatform = { x, y, width, height };

  // Adding isMoving/moveDirection onto this same object — it's the
  // same shape platforms.forEach() elsewhere already checks for.
  if (isHighEnoughForDifficultyIncrease && Math.random() < MVG_PLATFORM_CHANCE_MAX + (lvl - 1) * 0.1) {
    newPlatform.isMoving = true;
    newPlatform.moveDirection = Math.random() < 0.5 ? 1 : -1;
  }

  platforms.push(newPlatform);
  createPlatformElement(newPlatform);

  if (Math.random() < PTN_SPAWN_CHANGE) {
    maybeSpawnNewPotion(newPlatform);
  }

  newPlatSpawned = true;
  nxtSpawnY = y;
}

// ============================================================
// Potions
// ============================================================

function maybeSpawnNewPotion(platform) {
  const width = 160;
  const height = 12;
  const maxX = cavs.width - width; // rough potion width
  const x = Math.floor(Math.random() * maxX);
  const y = platform.y;
  const newPotion = { x, y };

  ptns.push(newPotion);
  createPtnEl(newPotion);
}

function cckPtnColl() {
  ptns.forEach(potion => {
    const unicorn = { x: pX, y: FLOOR_Y + pY, radius: 12 };
    const object = { x: potion.x, y: potion.y, radius: 12 };

    if (!isTouch(unicorn, object)) return;

    if (bubbleEl.parentElement) {
      // Bubble active: potion is neutralized into a bonus point instead.
      aliPoints++;
      pyBlip(880, 0.15);
      updScoreDisplay();
      showScorePopup(potion.x, potion.y - cmaOffset);
    } else {
      aliPoints--;
      pyBlip(200, 0.2);
      updScoreDisplay();
      showLossPopup(potion.x, potion.y - cmaOffset);
    }

    potion.element.remove();
    ptns = ptns.filter(p => p !== potion);
  })
}

// ============================================================
// Rendering
// ============================================================

function rderPlayAPlat() {
  const newTop = FLOOR_Y + pY;

  unicornEl.style.left = `${pX}px`;
  unicornEl.style.top = `${newTop - UNI_HEIGHT - cmaOffset}px`;
  unicornEl.style.transform = facRight ? 'scale(4)' : 'scale(-4, 4)'; // flip sprite when facing left

  if (newTop - CAM_MID < 0) {
    cmaOffset = newTop - CAM_MID;
  }

  platforms.forEach(platform => {
    platform.element.style.top = (platform.y - cmaOffset) + 'px';
  });

  ptns.forEach(potion => {
    potion.element.style.top = (potion.y - cmaOffset) + 'px';
  });

  if (prinRev) {
    princessEl.style.top = (princessPlat.y - cmaOffset - 32) + 'px';
  }

  if (bubbleEl.parentElement) {
    bubbleEl.style.left = `${pX - 50}px`;
    bubbleEl.style.top = `${newTop - UNI_HEIGHT - cmaOffset - 50}px`;
  }
}

function applyMovementInput() {
  if (keysPressed.ArrowLeft) {
    facRight = false;
    pX -= MOVEMENT_SPEED;
  }
  if (keysPressed.ArrowRight) {
    facRight = true;
    pX += MOVEMENT_SPEED;
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
cavs.addEventListener('click', handleClick);
window.addEventListener('keydown', keyDownHandler);
window.addEventListener('keyup', keyUpHandler);