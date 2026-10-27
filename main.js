const GRID = 20; // 격자 칸 수 (20x20)
const CELL = 20; // 한 칸 크기(px) → 400x400
// 난이도별 기본 이동 간격(ms)
const DIFFICULTY = { easy: 200, normal: 150, hard: 100, extreme: 50 };
const LEVEL_SCORE = 50; // 레벨업에 필요한 점수 간격
const LEVEL_SPEEDUP = 10; // 레벨업마다 줄어드는 간격(ms)
const MIN_INTERVAL = 30; // 이동 간격의 하한(ms)
const BEST_KEY = 'snakeBest';

// 요소 가져오기
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameOverEl = document.getElementById('game-over');
const levelEl = document.getElementById('level');
const difficultyEl = document.getElementById('difficulty');
const pauseBtn = document.getElementById('pause-btn');

let snake;
let direction;
let nextDirection;
let food;
let score;
let best = loadBest();
let timer = null;
let level = 1;
let baseInterval = DIFFICULTY.normal;
let playing = false; // 게임 진행 중 여부 (일시정지 포함)
let paused = false;

// 현재 레벨의 이동 간격(ms)
function currentInterval() {
  return Math.max(baseInterval - (level - 1) * LEVEL_SPEEDUP, MIN_INTERVAL);
}

// 현재 간격으로 타이머 (재)시작
function startTimer() {
  clearInterval(timer);
  timer = setInterval(tick, currentInterval());
}

// 일시정지 / 재개
function togglePause() {
  if (!playing) return;

  paused = !paused;
  if (paused) {
    clearInterval(timer);
    timer = null;
  } else {
    startTimer();
  }
  pauseBtn.textContent = paused ? '재개' : '일시정지';
}

// 최고 점수 불러오기
function loadBest() {
  try {
    return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
  } catch (e) {
    return 0;
  }
}

// 최고 점수 저장
function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, best);
  } catch (e) {
    // 저장 불가 시 무시
  }
}

// 게임 시작 (초기화)
function startGame() {
  clearInterval(timer);
  initAudio();
  soundStart();

  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = direction;
  score = 0;
  scoreEl.textContent = score;
  level = 1;
  levelEl.textContent = level;
  baseInterval = DIFFICULTY[difficultyEl.value];
  gameOverEl.classList.add('hidden');

  // 진행 중에는 난이도 변경 불가, 일시정지 사용 가능
  playing = true;
  paused = false;
  difficultyEl.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.textContent = '일시정지';

  placeFood();
  draw();
  startTimer();
}

// 뱀과 겹치지 않는 위치에 먹이 생성
function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
}

// 한 칸 이동
function tick() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // 벽 충돌
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    return gameOver();
  }

  const eating = head.x === food.x && head.y === food.y;

  // 자기 몸 충돌 (먹지 않으면 꼬리는 비켜나므로 제외)
  const body = eating ? snake : snake.slice(0, -1);
  if (body.some((s) => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  snake.unshift(head);

  if (eating) {
    // 먹이를 먹으면 길어지고 +10점
    score += 10;
    scoreEl.textContent = score;
    soundEat();
    placeFood();

    // 50점마다 레벨업 → 이동 간격 감소(속도 증가)
    const newLevel = Math.floor(score / LEVEL_SCORE) + 1;
    if (newLevel > level) {
      level = newLevel;
      levelEl.textContent = level;
      startTimer();
    }
  } else {
    snake.pop();
  }

  draw();
}

// 게임 오버
function gameOver() {
  clearInterval(timer);
  timer = null;
  playing = false;
  paused = false;
  difficultyEl.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = '일시정지';
  soundGameOver();

  // 최고 점수 갱신
  if (score > best) {
    best = score;
    bestEl.textContent = best;
    saveBest();
  }

  gameOverEl.classList.remove('hidden');
}

// 둥근 사각형 경로 (브라우저 호환을 위해 직접 구현)
function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 바둑판 무늬 배경
function drawBackground() {
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#1a1636' : '#15122e';
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

// 빛나는 먹이
function drawFood() {
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;

  ctx.save();
  ctx.shadowColor = '#ff4d6d';
  ctx.shadowBlur = 16;
  const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, CELL / 2 - 2);
  grad.addColorStop(0, '#ffb3c1');
  grad.addColorStop(1, '#ff2e55');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 머리의 눈
function drawEyes(s) {
  const cx = s.x * CELL + CELL / 2;
  const cy = s.y * CELL + CELL / 2;
  // 진행 방향에 수직인 방향으로 눈을 배치
  const px = direction.y !== 0 ? 4 : 0;
  const py = direction.x !== 0 ? 4 : 0;
  const fx = direction.x * 3;
  const fy = direction.y * 3;

  [-1, 1].forEach((side) => {
    const ex = cx + fx + px * side;
    const ey = cy + fy + py * side;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14112b';
    ctx.beginPath();
    ctx.arc(ex + direction.x * 0.8, ey + direction.y * 0.8, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 화면 그리기
function draw() {
  drawBackground();
  drawFood();

  // 뱀: 머리에서 꼬리로 갈수록 색이 어두워지는 둥근 마디
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const t = i / Math.max(snake.length - 1, 1);
    const r = Math.round(167 + (102 - 167) * t);
    const g = Math.round(139 + (126 - 139) * t);
    const b = Math.round(250 + (234 - 250) * t);

    ctx.save();
    if (i === 0) {
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    roundRectPath(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 8 : 6);
    ctx.fill();
    ctx.restore();
  }

  drawEyes(snake[0]);
}

// ---------- 소리 (Web Audio API, 별도 파일 없이 합성) ----------
let audioCtx = null;
let soundOn = true;

// 사용자 클릭 후에 오디오 컨텍스트 생성/재개
function initAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// 단일 음 재생
function playTone(freq, duration, type = 'sine', delay = 0, volume = 0.15) {
  if (!soundOn || !audioCtx) return;
  const start = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

// 효과음
function soundStart() {
  playTone(440, 0.1, 'triangle');
  playTone(660, 0.15, 'triangle', 0.1);
}

function soundEat() {
  playTone(660, 0.08, 'square', 0, 0.08);
  playTone(990, 0.12, 'square', 0.07, 0.08);
}

function soundGameOver() {
  playTone(400, 0.2, 'sawtooth', 0, 0.12);
  playTone(300, 0.2, 'sawtooth', 0.18, 0.12);
  playTone(200, 0.4, 'sawtooth', 0.36, 0.12);
}

// 소리 켜기/끄기 버튼
const soundBtn = document.getElementById('sound-btn');
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? '🔊' : '🔇';
  soundBtn.blur();
});

// 방향키 입력 (반대 방향으로는 전환 불가)
document.addEventListener('keydown', (e) => {
  const dirs = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };
  const next = dirs[e.key];
  if (!next) return;

  e.preventDefault(); // 방향키로 페이지가 스크롤되지 않게
  if (!timer) return;

  if (next.x !== -direction.x || next.y !== -direction.y) {
    nextDirection = next;
  }
});

startBtn.addEventListener('click', () => {
  startBtn.blur(); // 포커스를 풀어 스페이스/엔터 입력으로 재시작되는 것 방지
  startGame();
});
restartBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => {
  pauseBtn.blur();
  togglePause();
});

// 초기 화면: 시작 전에도 배경 격자를 그려 둔다
bestEl.textContent = best;
drawBackground();
