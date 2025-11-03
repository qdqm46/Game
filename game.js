// 🎮 Elementos principales
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');

// 🧠 Variables globales
let walkSpeed = 4;
let runSpeed = 20;
let keys = {};
let paused = false;
let debugMode = false;
let score = 0;
let lives = 3;
let dying = false;
let deathTimer = 0;
let lastSpawnX = 0;
let nextCheckpoint = 100000;
let checkpointsResueltos = 0;
let lastCheckpoint = { x: 50, y: 0 };

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

// 🧍 Jugador
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

// 🖼️ Imágenes
const playerRightImg = new Image();
playerRightImg.src = 'assets/player-right.png';
const playerLeftImg = new Image();
playerLeftImg.src = 'assets/player-left.png';
const enemyRightImg = new Image();
enemyRightImg.src = 'assets/enemy-right.png';
const enemyLeftImg = new Image();
enemyLeftImg.src = 'assets/enemy-left.png';

// 🧱 Mundo
let blocks = [];
let enemies = [];
let coins = [];
let checkpoints = [];

// ❓ Preguntas
let questionBank = [];
let usedQuestions = new Set();

// 📦 Cargar preguntas
fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    questionBank = data;
  });

// 🧠 Cargar progreso
const savedCheckpoint = localStorage.getItem('lastCheckpoint');
if (savedCheckpoint) {
  lastCheckpoint = JSON.parse(savedCheckpoint);
  player.x = lastCheckpoint.x;
  player.y = lastCheckpoint.y;
}

// 🔍 Colisión
function detectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// 🌍 Generar mundo
function generateWorldSegment() {
  const segmentStart = lastSpawnX;
  const segmentEnd = segmentStart + 800;

  // 🧱 Pared izquierda infinita
  if (segmentStart === 0) {
    blocks.push({
      x: 0,
      y: 0,
      width: 40,
      height: canvas.height * 2 // altura infinita simulada
    });
  }

  for (let i = segmentStart; i < segmentEnd; i += 40) {
    blocks.push({ x: i, y: groundY - 40, width: 40, height: 40 });
  }

  // ... resto del código sin cambios


  for (let i = segmentStart + 400; i < segmentEnd; i += 800) {
    if (Math.random() < 0.3) {
      const skyY = groundY - 600 - Math.floor(Math.random() * 200);
      blocks.push({ x: i, y: skyY, width: 100, height: 40 });
      coins.push({ x: i + 40, y: skyY - 40, width: 20, height: 20, value: 10 });
    }
  }

  for (let i = segmentStart + 600; i < segmentEnd; i += 1200) {
    if (Math.random() < 0.4) {
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
        dx: 1,
        active: true
      });
    }
  }

  for (let i = segmentStart + 200; i < segmentEnd; i += 300) {
  if (Math.random() < 0.7) { // alta frecuencia
    const wallHeight = player.height * 2.5; // más alto que el jugador
    blocks.push({
      x: i,
      y: groundY - wallHeight,
      width: 40,
      height: wallHeight
    });
  }
}
  if (segmentEnd >= nextCheckpoint && questionBank.length > usedQuestions.size) {
    const available = questionBank.filter(q => !usedQuestions.has(q.question));
    if (available.length > 0) {
      const q = available[Math.floor(Math.random() * available.length)];
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

// ▶️ Iniciar juego
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-menu').style.display = 'none';
  fetchLeaderboardFromGitHub();
  generateWorldSegment();
  gameLoop();
});

// 🎹 Teclas
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// 🕹️ Acciones
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && player.grounded && !dying && !paused) {
    player.dy = -28;
    player.grounded = false;
  }
  if (e.code === 'KeyF' && !paused) {
    player.attack = true;
    setTimeout(() => player.attack = false, 300);
  }
  if (e.code === 'KeyP') {
    if (paused && document.getElementById('pause-menu').style.display === 'flex') {
      closePauseMenu();
    } else {
      openPauseMenu();
    }
  }
  if (e.code === 'F5') {
    e.preventDefault();
    debugMode = !debugMode;
  }
});
function updatePlayer() {
  if (player.x < 40) {
  player.x = 40;
  }
  const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
const speed = isRunning ? runSpeed : walkSpeed;

if (keys['ArrowRight']) {
  player.x += speed;
  player.direction = 'right';
}
if (keys['ArrowLeft']) {
  player.x -= speed;
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

function updateEnemies() {
  enemies.forEach(en => {
    if (!en.active || dying) return;

    const speed = 2;

    // 🧠 Dirección hacia el jugador
    en.dx = player.x > en.x ? 1 : -1;
    en.x += en.dx * speed;

    // 🧱 Rebotar si chocan con bloques o pared izquierda
    const nextX = en.x + (en.dx > 0 ? en.width : -5);
    const nextY = en.y + en.height - 5;
    const blocked = blocks.some(block =>
      nextX < block.x + block.width &&
      nextX + 5 > block.x &&
      nextY < block.y + block.height &&
      nextY + 5 > block.y
    );

    if (blocked || en.x < 40) {
      en.x -= en.dx * speed; // retroceder si bloqueado
    }

    // 🎯 Colisión con el jugador
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

    if (detectCollision(playerHitbox, enemyHitbox) && !dying) {
      lives--;
      livesDisplay.textContent = lives;
      dying = true;
      deathTimer = 0;
      const penalty = Math.floor(player.x / 1000) * 100;
      score = Math.max(0, score - penalty);
      scoreDisplay.textContent = score;
    }
  });

  enemies = enemies.filter(en => en.hp > 0);
}


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

function checkCheckpoints() {
  checkpoints.forEach(cp => {
    if (!cp.triggered && detectCollision(player, cp)) {
      cp.triggered = true;
      const respuesta = prompt(cp.question);
      if (respuesta && respuesta.toLowerCase() === cp.answer.toLowerCase()) {
        alert("¡Progreso guardado!");
        score += cp.value || 30;
        scoreDisplay.textContent = score;
        lastCheckpoint = { x: cp.x, y: cp.y - player.height };
        localStorage.setItem('lastCheckpoint', JSON.stringify(lastCheckpoint));
        checkpointsResueltos++;
        if (checkpointsResueltos % 5 === 0) {
          lives++;
          livesDisplay.textContent = lives;
        }
      } else {
        alert("Respuesta incorrecta.");
      }
    }
  });
}

function handleDeathAnimation() {
  deathTimer++;
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);
  ctx.globalAlpha = Math.max(0, 1 - deathTimer / 60);
  const img = player.direction === 'right' ? playerRightImg : playerLeftImg;
  ctx.drawImage(img, player.x, player.y, player.width, player.height);
  ctx.restore();

  if (deathTimer >= 60) {
    dying = false;
    if (lives <= 0) {
      showGameOver();
    } else {
      player.x = lastCheckpoint.x;
      player.y = lastCheckpoint.y;
      player.dy = 0;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);

  if (!dying) {
    const img = player.direction === 'right' ? playerRightImg : playerLeftImg;
    ctx.drawImage(img, player.x, player.y, player.width, player.height);
  }

  ctx.fillStyle = 'gray';
  blocks.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  ctx.fillStyle = 'gold';
  coins.forEach(c => ctx.fillRect(c.x, c.y, c.width, c.height));

  enemies.forEach(e => {
    const eImg = e.dx >= 0 ? enemyRightImg : enemyLeftImg;
    ctx.drawImage(eImg, e.x, e.y, e.width, e.height);
  });

  ctx.fillStyle = 'purple';
  checkpoints.forEach(cp => ctx.fillRect(cp.x, cp.y, cp.width, cp.height));

  ctx.restore();
}

function gameLoop() {
  if (!paused) {
    if (dying) {
      draw();
      handleDeathAnimation();
    } else {
      updatePlayer();
      updateEnemies();
      updateCoins();
      checkCheckpoints();
      draw();
    }
  }
  requestAnimationFrame(gameLoop);
}

// 🏁 Game Over y clasificación
function showGameOver() {
  document.getElementById('final-score').textContent = score;
  document.getElementById('game-over-screen').style.display = 'flex';
  paused = true;
  renderLeaderboard();
}

function submitScore() {
  const name = document.getElementById('player-name').value.trim() || 'Jugador';
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');

  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  const top10 = leaderboard.slice(0, 10);

  localStorage.setItem('leaderboard', JSON.stringify(top10));
  renderLeaderboard();
  uploadLeaderboardToGitHub();
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboard');
  list.innerHTML = '';
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  leaderboard.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.name} — ${entry.score} pts`;
    list.appendChild(li);
  });
}

function restartGame() {
  localStorage.removeItem('lastCheckpoint');
  location.reload();
}

function openPauseMenu() {
  document.getElementById('pause-score').textContent = score;
  document.getElementById('pause-coins').textContent = Math.floor(score / 10);
  document.getElementById('pause-distance').textContent = Math.floor(player.x);

  const list = document.getElementById('pause-leaderboard');
  list.innerHTML = '';
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  leaderboard.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.name} — ${entry.score} pts`;
    list.appendChild(li);
  });

  document.getElementById('pause-menu').style.display = 'flex';
  paused = true;
}

function closePauseMenu() {
  document.getElementById('pause-menu').style.display = 'none';
  paused = false;
}

async function fetchLeaderboardFromGitHub() {
  const owner = 'qdqm46';
  const repo = 'Game';
  const filePath = 'leaderboard.json';

  try {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`);
    if (!res.ok) throw new Error('No se pudo cargar la clasificación');
    const data = await res.json();
        localStorage.setItem('leaderboard', JSON.stringify(data));
    renderLeaderboard();
  } catch (error) {
    console.error('Error al cargar la clasificación desde GitHub:', error);
  }
}

// 🚀 Subir clasificación a GitHub (versión de prueba)
const token = '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';

async function uploadLeaderboardToGitHub() {
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  const content = JSON.stringify(leaderboard, null, 2);
  const owner = 'qdqm46';
  const repo = 'Game';
  const filePath = 'leaderboard.json';

  try {
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const fileData = await getRes.json();
    const sha = fileData.sha;

    const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Actualizar clasificación desde el juego',
        content: btoa(unescape(encodeURIComponent(content))),
        sha: sha
      })
    });

    if (updateRes.ok) {
      console.log('Clasificación actualizada en GitHub');
    } else {
      console.error('Error al subir la clasificación:', await updateRes.text());
    }
  } catch (error) {
    console.error('Error al conectar con GitHub:', error);
  }
}





