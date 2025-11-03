// 🎮 Elementos principales del juego
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');

// 🧠 Variables globales
let keys = {};
let paused = false;
let debugMode = false;
let score = 0;
let lives = 3;
let lastSpawnX = 0;
let nextCheckpoint = 100000; // Checkpoints cada 100,000 píxeles
let lastCheckpoint = { x: 50, y: 0 }; // Punto de reaparición

// 📏 Altura dinámica del suelo
let groundY;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  groundY = canvas.height - 50;
  if (lastCheckpoint.y === 0) {
    lastCheckpoint.y = groundY - 248;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 🧍 Configuración del jugador
const player = {
  x: lastCheckpoint.x,
  y: lastCheckpoint.y,
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

// 🖼️ Carga de imágenes
const playerRightImg = new Image();
playerRightImg.src = 'assets/player-right.png';
const playerLeftImg = new Image();
playerLeftImg.src = 'assets/player-left.png';
const enemyRightImg = new Image();
enemyRightImg.src = 'assets/enemy-right.png';
const enemyLeftImg = new Image();
enemyLeftImg.src = 'assets/enemy-left.png';

// 🧱 Elementos del mundo
let blocks = [];
let enemies = [];
let coins = [];
let checkpoints = [];

// ❓ Banco de preguntas
let questionBank = [];
let usedQuestions = new Set();

// 📦 Cargar preguntas
fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    questionBank = data;
  });

// 🧠 Cargar progreso guardado
const savedCheckpoint = localStorage.getItem('lastCheckpoint');
if (savedCheckpoint) {
  lastCheckpoint = JSON.parse(savedCheckpoint);
  player.x = lastCheckpoint.x;
  player.y = lastCheckpoint.y;
}

// ▶️ Botón de inicio
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-menu').style.display = 'none';
  generateWorldSegment();
  gameLoop();
});

// 🎹 Captura de teclas
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// 🕹️ Acciones del jugador
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

// 🔍 Colisión entre objetos
function detectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
// 🌍 Generación del mundo con obstáculos, enemigos, monedas y checkpoints
function generateWorldSegment() {
  const segmentStart = lastSpawnX;
  const segmentEnd = segmentStart + 800;

  // 🧱 Muro insuperable al inicio
  if (segmentStart === 0) {
    blocks.push({
      x: -100,
      y: groundY - 1000,
      width: 100,
      height: 2000
    });
  }

  // 🧱 Suelo como bloques
  for (let i = segmentStart; i < segmentEnd; i += 40) {
    blocks.push({
      x: i,
      y: groundY - 40,
      width: 40,
      height: 40
    });
  }

  // 🧗 Obstáculos superiores escalonados
  const upperPlatforms = [];
  for (let i = segmentStart + 200; i < segmentEnd; i += 200) {
    for (let level = 1; level <= 3; level++) {
      const y = groundY - (level * 160);
      const platform = {
        x: i + level * 40,
        y: y,
        width: 100,
        height: 40
      };
      blocks.push(platform);
      upperPlatforms.push(platform);

      // 👾 Enemigo sobre algunos obstáculos
      if (Math.random() < 0.3) {
        enemies.push({
          x: platform.x + 10,
          y: platform.y - 248,
          width: 248,
          height: 248,
          hitboxOffsetX: 80,
          hitboxOffsetY: 60,
          hitboxWidth: 88,
          hitboxHeight: 128,
          hp: 1,
          dx: 2,
          active: true,
          patrolMin: platform.x,
          patrolMax: platform.x + platform.width - 248
        });
      }

      // 💰 Moneda sobre el obstáculo
      coins.push({
        x: platform.x + 40,
        y: platform.y - 40,
        width: 20,
        height: 20,
        value: 10
      });
    }
  }

  // 👾 Enemigos sobre el suelo
  for (let i = segmentStart + 300; i < segmentEnd; i += 600) {
    enemies.push({
      x: i,
      y: groundY - 248,
      width: 248,
      height: 248,
      hitboxOffsetX: 80,
      hitboxOffsetY: 60,
      hitboxWidth: 88,
      hitboxHeight: 128,
      hp: 1,
      dx: 2,
      active: true,
      patrolMin: i - 100,
      patrolMax: i + 100
    });
  }

  // ❓ Checkpoints cada 100,000 píxeles
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
        triggered: false,
        value: 30
      });

      nextCheckpoint += 100000;
    }
  }

  lastSpawnX = segmentEnd;
}

// 💰 Monedas
function updateCoins() {
  coins = coins.filter(coin => {
    if (detectCollision(player, coin)) {
      score += coin.value || 10;
      scoreDisplay.textContent = score;
      return false;
    }
    return true;
  });
}

// ❓ Checkpoints con guardado de progreso
function checkCheckpoints() {
  checkpoints.forEach(cp => {
    if (!cp.triggered && detectCollision(player, cp)) {
      cp.triggered = true;
      const respuesta = prompt(cp.question);
      if (respuesta && respuesta.toLowerCase() === cp.answer.toLowerCase()) {
        alert("¡Progreso guardado!");
        score += cp.value || 30;
        scoreDisplay.textContent = score;

        // 🧠 Guardar progreso
        lastCheckpoint = {
          x: cp.x,
          y: cp.y - player.height
        };
        localStorage.setItem('lastCheckpoint', JSON.stringify(lastCheckpoint));
      } else {
        alert("Respuesta incorrecta.");
      }
    }
  });
}

// 🧍 Actualización del jugador
function updatePlayer() {
  if (keys['ArrowRight']) {
    player.x += 4;
    player.direction = 'right';
  }
  if (keys['ArrowLeft'] && player.x > 0) {
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

// 👾 Enemigos
function updateEnemies() {
  enemies.forEach(en => {
    if (!en.active) return;

    const speed = 2 + Math.floor(player.x / 1000) * 0.5;
    en.x += en.dx >= 0 ? speed : -speed;

    if (en.x < en.patrolMin || en.x > en.patrolMax) {
      en.dx *= -1;
      en.x = Math.max(en.patrolMin, Math.min(en.x, en.patrolMax));
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
        localStorage.removeItem('lastCheckpoint');
        location.reload();
      } else {
        player.x = lastCheckpoint.x;
        player.y = lastCheckpoint.y;
        player.dy = 0;
      }
    }
  });

  enemies = enemies.filter(en => en.hp > 0);
}

// 🖼️ Dibujo del juego (continuación y cierre)
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);

  // Jugador
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

    enemies.forEach(e => {
      ctx.strokeStyle = 'green';
      ctx.strokeRect(
        e.x + e.hitboxOffsetX,
        e.y + e.hitboxOffsetY,
        e.hitboxWidth,
        e.hitboxHeight
      );
    });

    checkpoints.forEach(cp => {
      ctx.strokeStyle = 'purple';
      ctx.strokeRect(cp.x, cp.y, cp.width, cp.height);
    });

    coins.forEach(c => {
      ctx.strokeStyle = 'orange';
      ctx.strokeRect(c.x, c.y, c.width, c.height);
    });
  }

  ctx.restore();
}

// 🔁 Bucle principal del juego
function gameLoop() {
  if (!paused) {
    updatePlayer();
    updateEnemies();
    updateCoins();
    checkCheckpoints();
    draw();
  }
  requestAnimationFrame(gameLoop);
}
