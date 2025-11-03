// 🎮 1. Inicialización del Canvas y Elementos del DOM
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const attackSound = document.getElementById('attack-sound');
const coinSound = document.getElementById('coin-sound');
const winSound = document.getElementById('win-sound');

// 🧠 2. Variables Globales
let keys = {};
let paused = false;
let debugMode = false;
let groundY = canvas.height - 50;
let score = 0;
let lives = 3;
let lastSpawnX = 0;
let nextCheckpoint = 1000;

// 🧍 3. Jugador y Recursos
const player = {
  x: 100, y: groundY - 248, width: 248, height: 248,
  dy: 0, grounded: true, attack: false, direction: 'right',
  hitboxOffsetX: 80, hitboxOffsetY: 60, hitboxWidth: 88, hitboxHeight: 128
};

const playerRightImg = new Image(); playerRightImg.src = 'player-right.png';
const playerLeftImg = new Image(); playerLeftImg.src = 'player-left.png';
const enemyRightImg = new Image(); enemyRightImg.src = 'enemy-right.png';
const enemyLeftImg = new Image(); enemyLeftImg.src = 'enemy-left.png';

// 🧱 4. Entidades del Juego
let blocks = [], enemies = [], coins = [], checkpoints = [];

// 🕹️ 5. Eventos del Juego
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-menu').style.display = 'none';
  if (canvas.requestFullscreen) canvas.requestFullscreen();
  else if (canvas.webkitRequestFullscreen) canvas.webkitRequestFullscreen();
  else if (canvas.msRequestFullscreen) canvas.msRequestFullscreen();
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
    attackSound.play();
    setTimeout(() => player.attack = false, 300);
  }
  if (e.code === 'KeyP') paused = !paused;
  if (e.code === 'F5') {
    e.preventDefault();
    debugMode = !debugMode;
  }
});

// 🧩 6. Funciones de Utilidad
function detectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// 🌍 7. Generación del Mundo
function generateWorldSegment() {
  const segmentStart = lastSpawnX + 400;
  const segmentEnd = segmentStart + 800;

  for (let i = segmentStart + 100; i < segmentEnd; i += 400) {
    blocks.push({ x: i, y: groundY - player.hitboxHeight, width: 40, height: player.hitboxHeight });

    const platformX = i + 200;
    const platformWidth = 200;
    blocks.push({ x: platformX, y: 160, width: platformWidth, height: 40 });

    enemies.push({
      x: platformX + 20, y: 160 - 248, width: 248, height: 248,
      hitboxOffsetX: 80, hitboxOffsetY: 60, hitboxWidth: 88, hitboxHeight: 128,
      hp: 1, dx: 2, active: true, patrolMin: platformX, patrolMax: platformX + platformWidth - 248
    });
  }

  blocks.push({
    x: segmentStart + 300, y: 120, width: 160, height: 40,
    floating: true, dx: 2, range: { min: segmentStart + 200, max: segmentStart + 400 }
  });

  if (segmentEnd >= nextCheckpoint) {
    checkpoints.push({
      x: segmentEnd, y: groundY - 60, width: 60, height: 60,
      question: "¿Cuál es la capital de España?", answer: "Madrid", triggered: false
    });
    nextCheckpoint += 2000;
  }

  lastSpawnX = segmentEnd;
}

// 🔄 8. Actualización de Entidades
function updatePlayer() {
  if (keys['ArrowRight']) { player.x += 4; player.direction = 'right'; }
  if (keys['ArrowLeft']) { player.x -= 4; player.direction = 'left'; }

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

    if (player.dy < 0 && hitbox.y <= block.y + block.height &&
        hitbox.y + hitbox.height > block.y + block.height &&
        hitbox.x < block.x + block.width &&
        hitbox.x + hitbox.width > block.x) {
      player.dy = 0;
      player.y = block.y + block.height - player.hitboxOffsetY;
    }

    if (player.dy >= 0 && hitbox.y + hitbox.height >= block.y &&
        hitbox.y < block.y &&
        hitbox.x < block.x + block.width &&
        hitbox.x + hitbox.width > block.x) {
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
      coinSound.play();
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

// 🖼️ 9. Renderizado
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);

  const img = player.direction === 'right' ? playerRightImg : playerLeftImg;
  ctx.drawImage(img, player.x, player.y, player.width, player.height);

    ctx.fillStyle = 'gray';
  blocks.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  ctx.fillStyle = 'gold';
  coins.forEach(c => ctx.fillRect(c.x, c.y, c.width, c.height));

  enemies.forEach(e => {
    const img = e.dx >= 0 ? enemyRightImg : enemyLeftImg;
    ctx.drawImage(img, e.x, e.y, e.width, e.height);
  });

  ctx.fillStyle = 'purple';
  checkpoints.forEach(cp => {
    ctx.fillRect(cp.x, cp.y, cp.width, cp.height);
  });

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
    blocks.forEach(b => {
      ctx.strokeRect(b.x, b.y, b.width, b.height);
    });

    ctx.strokeStyle = 'gold';
    coins.forEach(c => {
      ctx.strokeRect(c.x, c.y, c.width, c.height);
    });

    ctx.strokeStyle = 'purple';
    checkpoints.forEach(cp => {
      ctx.strokeRect(cp.x, cp.y, cp.width, cp.height);
    });
  }

  ctx.restore();
}

// 🔁 10. Bucle Principal del Juego
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
