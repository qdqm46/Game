const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const attackSound = document.getElementById('attack-sound');
const coinSound = document.getElementById('coin-sound');
const winSound = document.getElementById('win-sound');

let keys = {};
let paused = false;
let levelWidth = 3000;
let groundY = canvas.height - 50;
let score = 0;
let lives = 3;

const player = {
  x: 100,
  y: groundY - 40,
  width: 40,
  height: 40,
  dy: 0,
  grounded: true,
  attack: false,
  direction: 'right'
};

const playerRightImg = new Image();
playerRightImg.src = 'player-right.png';

const playerLeftImg = new Image();
playerLeftImg.src = 'player-left.png';

const enemyRightImg = new Image();
enemyRightImg.src = 'enemy-right.png';

const enemyLeftImg = new Image();
enemyLeftImg.src = 'enemy-left.png';

let blocks = [], enemies = [], coins = [], goal = {};

document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && player.grounded) {
    player.dy = -12;
    player.grounded = false;
  }
  if (e.code === 'KeyF') {
    player.attack = true;
    attackSound.play();
    setTimeout(() => player.attack = false, 300);
  }
  if (e.code === 'KeyP') {
    togglePause();
  }
});

function togglePause() {
  paused = !paused;
}

function detectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function setupLevel() {
  blocks = [];
  enemies = [];
  coins = [];
  score = 0;
  lives = 3;
  player.x = 100;
  player.y = groundY - 40;

  for (let i = 400; i < levelWidth - 400; i += 400) {
    blocks.push({ x: i, y: 200 + (i % 300), width: 50, height: 20 });
    coins.push({ x: i + 100, y: 150 + (i % 200), width: 20, height: 20 });
  }

  for (let i = 800; i < levelWidth - 800; i += 800) {
    enemies.push({
      x: i,
      y: groundY - 40,
      width: 40,
      height: 40,
      hp: 1,
      dx: Math.random() < 0.5 ? -1 : 1
    });
  }

  goal = { x: levelWidth - 200, y: groundY - 40, width: 40, height: 40 };
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

  player.dy += 0.6;
  player.y += player.dy;

  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;
    player.dy = 0;
    player.grounded = true;
  }

  blocks.forEach(block => {
    if (detectCollision(player, block) && player.dy >= 0 &&
        player.y + player.height <= block.y + player.dy) {
      player.y = block.y - player.height;
      player.dy = 0;
      player.grounded = true;
    }
    if (detectCollision(player, block) && player.dy < 0 &&
        player.y >= block.y + block.height - player.dy) {
      player.dy = 0;
    }
  });

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > levelWidth) player.x = levelWidth - player.width;
}

function updateEnemies() {
  enemies.forEach(en => {
    en.x += en.dx;
    if (en.x < 0 || en.x > levelWidth - en.width) en.dx *= -1;

    const dist = Math.abs(player.x - en.x);
    if (dist < 200) en.dx = player.x < en.x ? -2 : 2;

    if (player.attack && detectCollision(player, en)) {
      en.hp = 0;
      score += 10;
      scoreDisplay.textContent = score;
    }

    if (detectCollision(player, en) && !player.attack) {
      lives--;
      livesDisplay.textContent = lives;
      if (lives <= 0) {
        alert('¡Has perdido!');
        location.reload();
      } else {
        player.x = 100;
        player.y = groundY - 40;
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

function checkVictory() {
  if (detectCollision(player, goal)) {
    winSound.play();
    document.getElementById('victory-screen').style.display = 'block';
    canvas.style.display = 'none';
    document.getElementById('hud').style.display = 'none';
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);

  const playerImg = player.direction === 'right' ? playerRightImg : playerLeftImg;
