const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');

let keys = {};
let paused = false;
let debugMode = false;
let score = 0;
let lives = 3;
let lastSpawnX = 0;
let nextCheckpoint = 1000;

let groundY;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  groundY = canvas.height - 50;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const player = {
  x: 100,
  y: groundY - 248,
  width: 248,
  height: 248,
  dy: 0,
  grounded: true,
  attack: false,
  direction: 'right',
  hitboxOffsetX: 80,
  hitboxOffsetY: 60,
  hitboxWidth: 88,
  hitboxHeight: 128
};

const playerRightImg = new Image();
playerRightImg.src = 'assets/player-right.png';
const playerLeftImg = new Image();
playerLeftImg.src = 'assets/player-left.png';
const enemyRightImg = new Image();
enemyRightImg.src = 'assets/enemy-right.png';
const enemyLeftImg = new Image();
enemyLeftImg.src = 'assets/enemy-left.png';
const groundTexture = new Image();
groundTexture.src = 'assets/ground-texture.png';

let blocks = [];
let enemies = [];
let coins = [];
let checkpoints = [];

let questionBank = [];
let usedQuestions = new Set();

fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    questionBank = data;
  });

document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-menu').style.display = 'none';
  generateWorldSegment();
  gameLoop();
});

document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && player.grounded) {
    player.dy = -28;
    player.grounded = false;
  }
  if (e.code === 'KeyF') {
    player.attack = true;
    setTimeout(() => player.attack = false, 300);
  }
  if (e.code === 'KeyP') paused = !paused;
  if (e.code === 'F5') {
    e.preventDefault();
    debugMode = !debugMode;
  }
});

function detectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function generateWorldSegment() {
  const segmentStart = lastSpawnX + 400;
  const segmentEnd = segmentStart + 800;

  for (let i = segmentStart + 100; i < segmentEnd; i += 400) {
    blocks.push({ x: i, y: groundY - player.hitboxHeight, width: 40, height: player.hitboxHeight });

    const platformX = i + 200;
    const platformWidth = 200;
    const platformY = 160 + Math.floor(Math.random() * 100);

    blocks.push({ x: platformX, y: platformY, width: platformWidth, height: 40 });

    enemies.push({
      x: platformX + 20,
      y: platformY - 248,
      width: 248,
      height: 248,
      hitboxOffsetX: 80,
      hitboxOffsetY: 60,
      hitboxWidth: 88,
      hitboxHeight: 128,
      hp: 1,
      dx: 2,
      active: true,
      patrolMin: platformX,
      patrolMax: platformX + platformWidth - 248
    });
  }

  blocks.push({
    x: segmentStart + 300,
    y: 120,
    width: 160,
    height: 40,
    floating: true,
    dx: 2,
    range: { min: segmentStart + 200, max: segmentStart + 400 }
  });

  if (segmentEnd >= nextCheckpoint && questionBank.length > usedQuestions.size) {
    const availableQuestions = questionBank.filter(q => !usedQuestions.has(q.question));
    if (availableQuestions.length > 0) {
      const q = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      usedQuestions.add(q.question);

      checkpoints.push({
        x: segmentEnd,
        y: groundY - 60,
        width: 60,
        height: 60,
        question: q.question,
        answer: q.answer,
        triggered: false
      });

      nextCheckpoint += 2000;
    }
  }

  lastSpawnX = segmentEnd;
}

function updatePlayer() {
  if (keys['ArrowRight']) {
    player.x += 4;
    player.direction = 'right';
  }
  if (keys['ArrowLeft']) {
    player.x -= 4;
    player.direction = 'left';
  }

  player.dy += 1.2;
  player.y += player.dy;

  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;
    player.dy = 0;
    player.grounded = true;
  }

  blocks.forEach(block => {
    const hitbox = {
      x: player.x + player.hitboxOffsetX,
      y: player.y + player.hitboxOffsetY,
      width: player.hitboxWidth,
      height: player.hitboxHeight
    };

    if (
      player.dy < 0 &&
      hitbox.y <= block.y + block.height &&
      hitbox.y + hitbox.height > block.y + block.height &&
      hitbox.x < block.x + block.width &&
      hitbox.x + hitbox.width > block.x
    ) {
      player.dy = 0;
      player.y = block.y + block.height - player.hitboxOffsetY;
    }

    if (
      player.dy >= 0 &&
      hitbox.y + hitbox.height >= block.y &&
      hitbox.y < block.y &&
      hitbox.x < block.x + block.width &&
      hitbox.x + hitbox.width > block.x
    ) {
      player.y = block.y - player.hitboxOffsetY - player.hitboxHeight;
      player.dy = 0;
      player.grounded = true;
    }
  });

  if (player.x + canvas.width > lastSpawnX - 400) {
    generateWorldSegment();
  }
}

function updateBlocks() {
  blocks.forEach(block => {
    if (block.floating) {
      block.x += block.dx;
      if (block.x < block.range.min || block.x > block.range.max) {
        block.dx *= -1;
      }
    }
  });
}

function updateEnemies() {
  enemies.forEach(en => {
    if (!en.active) return;

    const speed = 2 + Math.floor(player.x / 1000) * 0.5;
    en.x += en.dx >= 0 ? speed : -speed;

    if (en.patrolMin !== undefined && en.patrolMax !== undefined) {
      if (en.x < en.patrolMin || en.x > en.patrolMax) {
        en.dx *= -1;
        en.x = Math.max(en.patrolMin, Math.min(en.x, en.patrolMax));
      }
    }

    const playerHitbox = {
      x: player.x + player.hitboxOffsetX,
      y: player.y + player.hitboxOffsetY,
      width: player.hitboxWidth,
      height: player.hitboxHeight
    };

    const enemyHitbox = {
      x: en.x + en.hitboxOffsetX,
      y: en.y + en.hitboxOffsetY,
      width: en.hitboxWidth,
      height: en.hitboxHeight
    };

    if (detectCollision(playerHitbox, enemyHitbox)) {
      lives--;
      livesDisplay.textContent = lives;
      if (lives <= 0) {
        alert('¡Has perdido!');
        location.reload();
      } else {
        player.x = 100;
        player.y = groundY - player.height;
      }
    }
  });

  enemies = enemies.filter(en => en.hp > 0);
}

function updateCoins() {
  coins = coins.filter(coin => {
    if (detectCollision(player, coin)) {
      score += 5;
      scoreDisplay.textContent = score;
      return false;
    }
    return true;
  });
}

function checkCheckpoints() {
  checkpoints.forEach(cp => {
    if (!cp.triggered && detectCollision(player, cp)) {
      cp.triggered = true;
      const respuesta = prompt(cp.question);
      if (respuesta && respuesta.toLowerCase() === cp.answer.toLowerCase()) {
        alert("¡Progreso guardado!");
      } else {
        alert("Respuesta incorrecta.");
      }
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);

    // Suelo con textura
  if (groundTexture.complete && groundTexture.naturalWidth !== 0) {
    const pattern = ctx.createPattern(groundTexture, 'repeat-x');
    ctx.fillStyle = pattern;
    ctx.fillRect(player.x - canvas.width / 2, groundY, canvas.width * 2, canvas.height - groundY);
  } else {
    // Fallback marrón si la textura no carga
    ctx.fillStyle = '#654321';
    ctx.fillRect(player.x - canvas.width / 2, groundY, canvas.width * 2, canvas.height - groundY);
  }

  // Dibujar jugador
  const img = player.direction === 'right' ? playerRightImg : playerLeftImg;
  if (img.complete && img.naturalWidth !== 0) {
    ctx.drawImage(img, player.x, player.y, player.width, player.height);
  }

  // Bloques
  ctx.fillStyle = 'gray';
  blocks.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // Monedas
  ctx.fillStyle = 'gold';
  coins.forEach(c => ctx.fillRect(c.x, c.y, c.width, c.height));

  // Enemigos
  enemies.forEach(e => {
    const eImg = e.dx >= 0 ? enemyRightImg : enemyLeftImg;
    if (eImg.complete && eImg.naturalWidth !== 0) {
      ctx.drawImage(eImg, e.x, e.y, e.width, e.height);
    }
  });

  // Checkpoints
  ctx.fillStyle = 'purple';
  checkpoints.forEach(cp => ctx.fillRect(cp.x, cp.y, cp.width, cp.height));

  // Modo debug
  if (debugMode) {
    ctx.strokeStyle = 'red';
    ctx.strokeRect(
      player.x + player.hitboxOffsetX,
      player.y + player.hitboxOffsetY,
      player.hitboxWidth,
      player.hitboxHeight
    );

    ctx.strokeStyle = 'green';
    enemies.forEach(e => {
      ctx.strokeRect(
        e.x + e.hitboxOffsetX,
        e.y + e.hitboxOffsetY,
        e.hitboxWidth,
        e.hitboxHeight
      );
    });

    ctx.strokeStyle = 'gray';
    blocks.forEach(b => ctx.strokeRect(b.x, b.y, b.width, b.height));

    ctx.strokeStyle = 'gold';
    coins.forEach(c => ctx.strokeRect(c.x, c.y, c.width, c.height));

    ctx.strokeStyle = 'purple';
    checkpoints.forEach(cp => ctx.strokeRect(cp.x, cp.y, cp.width, cp.height));
  }

  ctx.restore();
}

function gameLoop() {
  if (!paused) {
    updatePlayer();
    updateBlocks();
    updateEnemies();
    updateCoins();
    checkCheckpoints();
    draw();
  }
  requestAnimationFrame(gameLoop);
}
