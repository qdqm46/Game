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
let nextCheckpoint = 1000;

// 📏 Altura dinámica del suelo según pantalla
let groundY;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  groundY = canvas.height - 50;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Inicializa el canvas al cargar

// 🧍 Configuración del jugador
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
let blocks = [];       // Obstáculos y suelo
let enemies = [];      // Enemigos
let coins = [];        // Monedas (si se usan)
let checkpoints = [];  // Preguntas interactivas

// ❓ Banco de preguntas
let questionBank = [];
let usedQuestions = new Set();

// 📦 Carga de preguntas desde archivo JSON
fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    questionBank = data;
  });

// ▶️ Botón de inicio
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-menu').style.display = 'none';
  generateWorldSegment(); // Genera el primer segmento del mundo
  gameLoop();             // Inicia el bucle del juego
});

// 🎹 Captura de teclas
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// 🕹️ Acciones especiales del jugador
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && player.grounded) {
    player.dy = -28; // Salto
    player.grounded = false;
  }
  if (e.code === 'KeyF') {
    player.attack = true; // Ataque
    setTimeout(() => player.attack = false, 300);
  }
  if (e.code === 'KeyP') paused = !paused; // Pausa
  if (e.code === 'F5') {
    e.preventDefault();
    debugMode = !debugMode; // Modo debug
  }
});

// 🔍 Detección de colisiones entre dos objetos
function detectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
// 🧱 Generación del mundo: suelo, obstáculos y enemigos
function generateWorldSegment() {
  const segmentStart = lastSpawnX + 400;
  const segmentEnd = segmentStart + 800;

  // 🧱 Suelo como bloques simples
  for (let i = segmentStart; i < segmentEnd; i += 40) {
    blocks.push({
      x: i,
      y: groundY - 40,
      width: 40,
      height: 40
    });
  }

  // 🧗 Obstáculos superiores (máximo 2 por segmento)
  let upperObstacles = 0;
  const upperPlatforms = [];
  for (let i = segmentStart + 100; i < segmentEnd; i += 200) {
    if (Math.random() < 0.5 && upperObstacles < 2) {
      const platform = {
        x: i,
        y: groundY - 200,
        width: 100,
        height: 40
      };
      blocks.push(platform);
      upperPlatforms.push(platform);
      upperObstacles++;
    }
  }

  // 👾 Enemigos sobre el suelo
  for (let i = segmentStart + 150; i < segmentEnd; i += 400) {
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

  // 👾 Enemigos sobre obstáculos superiores
  upperPlatforms.forEach(platform => {
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
  });

  // ❓ Checkpoint con pregunta
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

// 🧍 Actualización del jugador
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

  // Colisiones con bloques
  blocks.forEach(block => {
    const hitbox = {
      x: player.x + player.hitboxOffsetX,
      y: player.y + player.hitboxOffsetY,
      width: player.hitboxWidth,
      height: player.hitboxHeight
    };

    // Colisión superior
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

    // Colisión inferior
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

  // Generar nuevo segmento si se acerca al borde
  if (player.x + canvas.width > lastSpawnX - 400) {
    generateWorldSegment();
  }
}

// 🔁 Actualización de enemigos
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

// ❓ Verifica si el jugador activa un checkpoint
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

// 🖼️ Dibuja todos los elementos del juego
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
  }

  ctx.restore();
}

// 🔁 Bucle principal del juego
function gameLoop() {
  if (!paused) {
    updatePlayer();
    updateEnemies();
    checkCheckpoints();
    draw();
  }
  requestAnimationFrame(gameLoop);
}
