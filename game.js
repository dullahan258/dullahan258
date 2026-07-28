const BOARD_SIZE = 10;
const COLS = ['a','b','c','d','e','f','g','h','i','j'];

const DIRS = {
  N: { dx: 0, dy: 1, name: '北' },
  E: { dx: 1, dy: 0, name: '东' },
  S: { dx: 0, dy: -1, name: '南' },
  W: { dx: -1, dy: 0, name: '西' },
};

const PLAYER_COLORS = [
  '#e94560', '#00d9ff', '#ffc107', '#4caf50',
  '#9c27b0', '#ff5722', '#607d8b', '#795548'
];

const PLAYER_NAMES_CN = ['一','二','三','四','五','六','七','八'];

// 地形类型
// 'water'   水坑 - 移动路径经过时声音传播范围+1
// 'puddle'  水洼 - 踩中时提示，玩家事先不知位置
// 'pillar'  石柱 - 不可穿过
const TERRAIN_TYPES = { WATER: 'water', PUDDLE: 'puddle', PILLAR: 'pillar' };

// 角色定义：每个角色有独特的背景故事和技能
const CHARACTERS = [
  {
    id: 'hoodlum',
    name: '吴明卒',
    icon: '🔫',
    title: '混混',
    desc: '开局获得(玩家数-1)颗子弹；回合内可"开枪"，消耗1行动+1子弹，对直线上第一个敌人造成伤害；枪声会传播至整个地图',
    background: '自从在一家酒吧后门垃圾桶旁捡到一把貌似是真家伙的手枪后，他就一直在和他的同伴炫耀，显得一头红毛的他更像一只大公鸡。虽然他一直害怕这是个真家伙，但现在的他反而希望他手上这黑漆漆的东西不是玩具。',
    skillName: '无技巧的射击',
    skillDesc: '游戏开始时获得(玩家数-1)颗子弹。回合内可执行"开枪"行动：消耗1行动次数和1颗子弹，对一条直线上的第一个敌人造成伤害。子弹会被石柱阻挡。枪声会传播至整个地图，所有玩家都能听到方向。',
    skills: { canShoot: true }
  },
  {
    id: 'dog',
    name: '乔',
    icon: '🥊',
    title: '“野狗”',
    desc: '首次被攻击不立即死亡，进入假死跳过下回合且无法被攻击；苏醒后多1次行动且警惕性提高；苏醒3回合后或被再次攻击则死亡',
    background: '自从他记事起，他就开始打黑拳谋生。即便打拳几乎囊括了他的整个人生，他也只会寥寥几招，但无论输赢他总是能活着下擂台。',
    skillName: '求生意志',
    skillDesc: '首次被攻击时不立即死亡，进入假死：跳过自己的下一回合且无法被攻击。苏醒后可多执行一次行动，且警惕性提高（任何经过他所在格子的行动都会被"提防"）。苏醒3回合后或被再次攻击就会死亡。',
    skills: { survivalInstinct: true }
  },
  {
    id: 'maniac',
    name: '沙寇',
    icon: '😈',
    title: '疯子',
    desc: '无法静步；听到惨叫时精确得知位置；听到第一声惨叫后奔跑距离+2格且免疫遭遇击杀',
    background: '他总是能够吸引别人的目光，尤其是在他犯下多起案件还诡异地笑着的时候。',
    skillName: '欢乐！',
    skillDesc: '无法"静步"。听到惨叫时，能精确知道惨叫发出的位置（系统提示坐标）。听到第一声惨叫时越发兴奋：奔跑距离+2格，且其他玩家无法再通过遭遇击杀他。',
    skills: { noWalk: true, screamLocate: true, thrillSeeker: true }
  },
  {
    id: 'mimic',
    name: '“声带”',
    icon: '🎭',
    title: '模仿者',
    desc: '回合内可模仿任意声音（惨叫/脚步/枪响等），不消耗行动次数，每回合限1次',
    background: '关于"声带"的过去，没人说得清。他/她第一次出现时，只是站在阴影里模仿了一声猫叫，然后所有人都转过头去找那只不存在的猫。从那以后，江湖上流传着各种关于"声带"的传说——有人说他/她是个失败的演员，有人说他/她是个天才的骗子，还有人说他/她根本不是人类，而是某种以声音为食的存在。唯一确定的是：当"声带"开口时，你听到的永远不是真相。',
    skillName: '轻薄的假象',
    skillDesc: '回合内可模仿任意声音（系统给出所有声音选项），无论是惨叫、脚步，甚至是枪响都信手拈来。模仿声音不需要消耗行动次数，但一回合只能有一次。',
    skills: { canMimic: true }
  },
];

// 获取角色技能配置（默认值）
function getCharacterSkills(player) {
  if (!player || !player.characterId) return {};
  const char = CHARACTERS.find(c => c.id === player.characterId);
  return char ? char.skills : {};
}

const SoundSystem = {
  ctx: null,
  enabled: true,
  volume: 0.3,
  
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  },
  
  play(type) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = this.volume;
    masterGain.connect(this.ctx.destination);
    
    switch(type) {
      case 'run': this._playRun(now, masterGain); break;
      case 'walk': this._playWalk(now, masterGain); break;
      case 'attack': this._playAttack(now, masterGain); break;
      case 'hit': this._playHit(now, masterGain); break;
      case 'miss': this._playMiss(now, masterGain); break;
      case 'scream': this._playScream(now, masterGain); break;
      case 'wall': this._playWall(now, masterGain); break;
      case 'encounter': this._playEncounter(now, masterGain); break;
      case 'victory': this._playVictory(now, masterGain); break;
      case 'click': this._playClick(now, masterGain); break;
      case 'perception': this._playPerception(now, masterGain); break;
    }
  },
  
  _playNoise(duration, gain, type='brown') {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      } else if (type === 'pink') {
        data[i] = white * 0.5;
      } else {
        data[i] = white;
      }
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    return source;
  },
  
  _playRun(now, master) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.4, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    g.connect(master);
    
    const noise = this._playNoise(0.3, g, 'brown');
    noise.start(now);
    
    const step2 = this.ctx.createGain();
    step2.gain.setValueAtTime(0, now + 0.12);
    step2.gain.linearRampToValueAtTime(0.3, now + 0.14);
    step2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    step2.connect(master);
    const noise2 = this._playNoise(0.3, step2, 'brown');
    noise2.start(now + 0.12);
  },
  
  _playWalk(now, master) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    g.connect(master);
    const noise = this._playNoise(0.2, g, 'brown');
    noise.start(now);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
  },
  
  _playAttack(now, master) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.4, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.15);
    
    const noise = this._playNoise(0.08, master, 'white');
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.15, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    noise.connect(ng);
    ng.connect(master);
    noise.start(now);
  },
  
  _playHit(now, master) {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.5, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.25);
    
    const noise = this._playNoise(0.15, master, 'brown');
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.3, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    noise.connect(ng);
    ng.connect(master);
    noise.start(now);
  },
  
  _playMiss(now, master) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.15);
  },
  
  _playScream(now, master) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.4, now + 0.05);
    g.gain.setValueAtTime(0.4, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    const vibrato = this.ctx.createOscillator();
    vibrato.frequency.value = 15;
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = 50;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(now);
    vibrato.stop(now + 0.6);
    
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.6);
  },
  
  _playWall(now, master) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 120;
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.3, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.18);
  },
  
  _playEncounter(now, master) {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.4, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.25);
  },
  
  _playVictory(now, master) {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const t = now + i * 0.15;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.02);
      g.gain.setValueAtTime(0.3, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  },
  
  _playClick(now, master) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 600;
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.08);
  },
  
  _playPerception(now, master) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.18);
  },
  
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
};

let game = {
  players: [],
  currentPlayerIdx: 0,
  phase: 'setup',
  roundCount: 0,
  pendingEvents: [],
  pendingMessages: {},
  selectedAction: null,
  actionCount: 0,
  winner: null,
  aiThinkingTimer: null,
  gameMode: 'local',
  myPlayerIdx: 0,
  fireCircle: {
    enabled: false,
    cycle: 5,        // 扩散周期（回合数）
    currentRadius: 0, // 当前已燃烧层数（从外向内）
  },
  terrains: {}, // key: "x,y" -> 'water' | 'puddle' | 'pillar'
  // 当前奔跑的第一步方向（玩家选择奔跑后先选第一步方向，再选第二步方向）
  runFirstStepDir: null,
  // 动画队列：renderBoard 后刷新，存放 {type, x, y, className, duration, spawn}
  pendingAnimations: [],
};

/* ===== 动画辅助系统 ===== */

// 查找棋盘上指定坐标的 cell 元素
function getCellEl(x, y) {
  return document.querySelector(`#board .cell[data-x="${x}"][data-y="${y}"]`);
}

// 请求一个格子动画（在 renderBoard 后刷新）
function queueCellAnim(x, y, className, duration = 600) {
  game.pendingAnimations.push({ type: 'class', x, y, className, duration });
}

// 请求生成临时效果元素（如死亡爆裂、惨叫标记）
function queueSpawnEffect(x, y, effectClass, duration = 1200, content = null) {
  game.pendingAnimations.push({ type: 'spawn', x, y, effectClass, duration, content });
}

// 在 renderBoard 末尾刷新动画队列
function flushPendingAnimations() {
  if (!game.pendingAnimations.length) return;
  const queue = game.pendingAnimations.splice(0);
  // 双重 requestAnimationFrame 确保 DOM 已绘制
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      queue.forEach(anim => {
        const cell = getCellEl(anim.x, anim.y);
        if (!cell) return;
        if (anim.type === 'class') {
          cell.classList.add(anim.className);
          setTimeout(() => cell.classList.remove(anim.className), anim.duration);
        } else if (anim.type === 'spawn') {
          const el = document.createElement('div');
          el.className = anim.effectClass;
          if (anim.content) el.textContent = anim.content;
          cell.appendChild(el);
          setTimeout(() => el.remove(), anim.duration);
        }
      });
    });
  });
}

/* ===== 火圈机制 ===== */

// 判断格子是否在已燃烧的火圈内
function isInFireCircle(x, y, radius) {
  const r = (radius !== undefined) ? radius : game.fireCircle.currentRadius;
  if (!game.fireCircle.enabled || r <= 0) return false;
  return x < r || x >= BOARD_SIZE - r || y < r || y >= BOARD_SIZE - r;
}

// 判断格子是否在下一轮将燃烧的警告区
function isFireWarning(x, y) {
  if (!game.fireCircle.enabled) return false;
  const nextR = game.fireCircle.currentRadius + 1;
  if (nextR > Math.floor(BOARD_SIZE / 2)) return false;
  return x < nextR || x >= BOARD_SIZE - nextR || y < nextR || y >= BOARD_SIZE - nextR;
}

// 火圈扩散：层数 +1，强制移动受困玩家
function expandFireCircle() {
  if (!game.fireCircle.enabled) return;
  const maxRadius = Math.floor(BOARD_SIZE / 2);
  if (game.fireCircle.currentRadius >= maxRadius) return;

  const prevRadius = game.fireCircle.currentRadius;
  game.fireCircle.currentRadius++;
  const r = game.fireCircle.currentRadius;

  addActionLog(`🔥 火圈收缩！外围第 ${r} 层开始燃烧`, 'system');

  // 排队新燃烧格的爆燃动画（仅新点燃的外环）
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      const wasBurning = x < prevRadius || x >= BOARD_SIZE - prevRadius ||
                         y < prevRadius || y >= BOARD_SIZE - prevRadius;
      const isBurning = x < r || x >= BOARD_SIZE - r ||
                        y < r || y >= BOARD_SIZE - r;
      if (isBurning && !wasBurning) {
        queueCellAnim(x, y, 'fire-ignite', 800);
      }
    }
  }

  forceMoveFromFire();

  // 扩散后检查胜负
  const alivePlayers = game.players.filter(p => p.alive);
  if (alivePlayers.length <= 1 && !game.winner) {
    game.winner = alivePlayers[0] || null;
    game.phase = 'gameOver';
    if (game.winner) setTimeout(() => SoundSystem.play('victory'), 400);
  }
}

// 强制移动火圈内的玩家到相邻安全格，无路可逃则淘汰
function forceMoveFromFire() {
  game.players.forEach(player => {
    if (!player.alive) return;
    if (!isInFireCircle(player.x, player.y)) return;

    const safeCells = [];
    for (const dir of Object.keys(DIRS)) {
      const d = DIRS[dir];
      const nx = player.x + d.dx;
      const ny = player.y + d.dy;
      if (inBounds(nx, ny) && !isInFireCircle(nx, ny)) {
        const occupied = game.players.some(p => p.alive && p.id !== player.id && p.x === nx && p.y === ny);
        if (!occupied) safeCells.push({ x: nx, y: ny });
      }
    }

    if (safeCells.length > 0) {
      const oldX = player.x;
      const oldY = player.y;
      const target = safeCells[Math.floor(Math.random() * safeCells.length)];
      player.x = target.x;
      player.y = target.y;
      // 逼退动画（仅对当前观察者可见的玩家显示）
      if (shouldShowActionInfo(player)) {
        queueCellAnim(oldX, oldY, 'move-from', 400);
        queueCellAnim(target.x, target.y, 'move-to', 400);
        addActionLog(`${player.name} 被火圈逼退到 ${cellToStr(target.x, target.y)}`, 'system');
      }
    } else {
      if (shouldShowActionInfo(player)) {
        queueDeathEffects(player.x, player.y);
        addActionLog(`${player.name} 被火圈吞噬！`, 'system');
      }
      killPlayer(player);
    }
  });
}

/* ===== 特殊地形 ===== */

function terrainKey(x, y) { return `${x},${y}`; }

function getTerrainAt(x, y) {
  return game.terrains[terrainKey(x, y)] || null;
}

function isPillar(x, y) {
  return getTerrainAt(x, y) === TERRAIN_TYPES.PILLAR;
}

function isWater(x, y) {
  return getTerrainAt(x, y) === TERRAIN_TYPES.WATER;
}

function isPuddle(x, y) {
  return getTerrainAt(x, y) === TERRAIN_TYPES.PUDDLE;
}

// 一局开始时随机生成地形
// counts: { water, puddle, pillar } 各地形数量，默认 10/10/5
function generateTerrains(counts) {
  game.terrains = {};
  const waterCount = counts?.water ?? 10;
  const puddleCount = counts?.puddle ?? 10;
  const pillarCount = counts?.pillar ?? 5;

  const occupied = new Set();

  // 玩家初始位置不放置地形
  for (const p of game.players) {
    occupied.add(terrainKey(p.x, p.y));
  }

  const placeRandom = (type, count) => {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 500) {
      attempts++;
      const x = Math.floor(Math.random() * BOARD_SIZE);
      const y = Math.floor(Math.random() * BOARD_SIZE);
      const key = terrainKey(x, y);
      if (occupied.has(key)) continue;
      // 石柱不放在边界（避免完全堵塞）
      if (type === TERRAIN_TYPES.PILLAR) {
        if (x === 0 || x === BOARD_SIZE - 1 || y === 0 || y === BOARD_SIZE - 1) continue;
      }
      game.terrains[key] = type;
      occupied.add(key);
      placed++;
    }
  };

  placeRandom(TERRAIN_TYPES.WATER, waterCount);
  placeRandom(TERRAIN_TYPES.PUDDLE, puddleCount);
  placeRandom(TERRAIN_TYPES.PILLAR, pillarCount);
}

function initGame(playerNames, aiCount, characterIds, fireCircleConfig, enableSpecialChars, terrainCounts) {
  game.players = [];
  game.roundCount = 0;
  game.currentPlayerIdx = 0;
  game.phase = 'action';
  game.pendingEvents = [];
  game.pendingMessages = {};
  game.selectedAction = null;
  game.actionCount = 0;
  game.winner = null;
  game.pendingAnimations = [];

  // 火圈配置
  if (fireCircleConfig) {
    game.fireCircle = {
      enabled: fireCircleConfig.enabled,
      cycle: fireCircleConfig.cycle,
      currentRadius: 0,
    };
  } else {
    game.fireCircle = { enabled: false, cycle: 5, currentRadius: 0 };
  }

  const totalPlayers = playerNames.length;
  const humanCount = totalPlayers - (aiCount || 0);

  // 先生成地形（此时 players 为空，地形不会避让玩家位置）
  generateTerrains(terrainCounts);

  const usedCells = new Set();
  for (let i = 0; i < totalPlayers; i++) {
    let x, y;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * BOARD_SIZE);
      y = Math.floor(Math.random() * BOARD_SIZE);
      attempts++;
      // 玩家开局不生成在水坑/石柱上（水洼允许，因为玩家事先不知）
    } while ((usedCells.has(`${x},${y}`) || isWater(x, y) || isPillar(x, y)) && attempts < 500);
    usedCells.add(`${x},${y}`);

    const dirKeys = Object.keys(DIRS);
    const startDir = dirKeys[Math.floor(Math.random() * dirKeys.length)];

    const isAI = i >= humanCount;

    // 角色分配：仅在启用特殊角色时分配
    let characterId = null;
    let characterName = '';
    let characterIcon = '';

    if (enableSpecialChars) {
      const hasValidCharId = characterIds && characterIds[i];
      if (hasValidCharId) {
        characterId = characterIds[i];
      } else {
        // AI或未指定时从剩余角色中随机选择
        const usedIds = (characterIds || []).filter(c => c);
        const availableChars = CHARACTERS.filter(c => !usedIds.includes(c.id));
        characterId = availableChars.length > 0
          ? availableChars[Math.floor(Math.random() * availableChars.length)].id
          : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
      }
      const charData = CHARACTERS.find(c => c.id === characterId);
      if (charData) {
        characterName = charData.name;
        characterIcon = charData.icon;
      }
    }

    game.players.push({
      id: i,
      name: playerNames[i] || (isAI ? `电脑${PLAYER_NAMES_CN[i - humanCount]}` : `玩家${PLAYER_NAMES_CN[i]}`),
      color: PLAYER_COLORS[i],
      x, y,
      facing: startDir,
      alive: true,
      isAI: isAI,
      characterId: characterId,
      characterName: characterName,
      characterIcon: characterIcon,
      freeHitUsed: 0, // 狂战技能：本回合已使用的免费攻击次数
      marks: new Set(), // 玩家标记的格子（坐标字符串，如 "3,5"）
      // 新角色状态字段
      bullets: 0,              // 吴明卒：剩余子弹数
      fakeDeath: false,        // 乔：是否处于假死状态
      skipNextTurn: false,     // 乔：跳过下一回合
      wakeCount: 0,            // 乔：苏醒后的回合计数
      vigilance: false,        // 乔：苏醒后警惕性提高
      screamHeard: false,      // 沙寇：是否已听到过惨叫（触发兴奋）
      mimicUsedThisTurn: 0,    // 声带：本回合已使用模仿次数
      aiKnowledge: {
        suspectedTargets: [],
      },
    });

    // 吴明卒：开局获得（玩家数-1）颗子弹
    if (characterId === 'hoodlum') {
      game.players[game.players.length - 1].bullets = Math.max(0, totalPlayers - 1);
    }
    game.pendingMessages[i] = [];
  }

  game.phase = 'action';
  game.actionCount = 2;
  game.runFirstStepDir = null;
  if (shouldShowActionInfo(getCurrentPlayer())) {
    addActionLog(`${getCurrentPlayer().name} 的回合开始`, 'system');
  }
}

function getCurrentPlayer() {
  return game.players[game.currentPlayerIdx];
}

function cellToStr(x, y) {
  return COLS[x] + (y + 1);
}

function chebyshevDist(x1, y1, x2, y2) {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function getDirectionFromTo(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return null;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx >= absDy * 2) {
    return dx > 0 ? '东' : '西';
  } else if (absDy >= absDx * 2) {
    return dy > 0 ? '北' : '南';
  } else {
    let dir = '';
    if (dy > 0) dir += '北';
    else if (dy < 0) dir += '南';
    if (dx > 0) dir += '东';
    else if (dx < 0) dir += '西';
    return dir || '正';
  }
}

function getSoundDirection(listener, sourceX, sourceY) {
  return getDirectionFromTo(listener.x, listener.y, sourceX, sourceY);
}

function getVisionCells(player) {
  const skills = getCharacterSkills(player);
  const range = skills.visionRange || 2; // 默认2格深
  const width = skills.visionWidth || 3; // 默认3列（左前/正前/右前）

  const d = DIRS[player.facing];
  const leftDir = rotateLeft(player.facing);
  const rightDir = rotateRight(player.facing);
  const ld = DIRS[leftDir];
  const rd = DIRS[rightDir];

  const cells = {
    leftFront: [],
    front: [],
    rightFront: [],
  };

  for (let step = 1; step <= range; step++) {
    const fx = player.x + d.dx * step;
    const fy = player.y + d.dy * step;
    cells.front.push({ x: fx, y: fy });
    if (width >= 3) {
      cells.leftFront.push({ x: fx + ld.dx, y: fy + ld.dy });
      cells.rightFront.push({ x: fx + rd.dx, y: fy + rd.dy });
    }
  }
  return cells;
}

function getVisionZoneName(player, cellX, cellY) {
  const vision = getVisionCells(player);
  for (const c of vision.leftFront) {
    if (c.x === cellX && c.y === cellY) return '左前方';
  }
  for (const c of vision.front) {
    if (c.x === cellX && c.y === cellY) return '正前方';
  }
  for (const c of vision.rightFront) {
    if (c.x === cellX && c.y === cellY) return '右前方';
  }
  return null;
}

function isInVision(player, cellX, cellY) {
  return getVisionZoneName(player, cellX, cellY) !== null;
}

function rotateLeft(dir) {
  const order = ['N','W','S','E'];
  const idx = order.indexOf(dir);
  return order[(idx + 1) % 4];
}

function rotateRight(dir) {
  const order = ['N','E','S','W'];
  const idx = order.indexOf(dir);
  return order[(idx + 1) % 4];
}

function recordSoundEvent(sourceX, sourceY, radius, soundType, sourcePlayerId) {
  game.pendingEvents.push({
    type: 'sound',
    soundType,
    x: sourceX,
    y: sourceY,
    radius,
    sourcePlayerId,
    perceivedBy: new Set(),
  });
}

function recordGrassEvent(cells, sourcePlayerId) {
  game.pendingEvents.push({
    type: 'grass',
    cells: cells.map(c => ({ x: c.x, y: c.y })),
    sourcePlayerId,
    perceivedBy: new Set(),
  });
}

function recordScreamEvent(sourceX, sourceY, sourcePlayerId) {
  game.pendingEvents.push({
    type: 'scream',
    x: sourceX,
    y: sourceY,
    sourcePlayerId,
    perceivedBy: new Set(),
  });
}

function processPerceptionPhase(player) {
  const messages = [];
  const heardSounds = new Set();
  const seenGrassZones = new Set();
  const skills = getCharacterSkills(player);
  const hearingBonus = skills.hearingBonus || 0;

  for (const evt of game.pendingEvents) {
    if (evt.sourcePlayerId === player.id) continue;
    if (evt.perceivedBy.has(player.id)) continue;

    if (evt.type === 'sound') {
      const dist = chebyshevDist(player.x, player.y, evt.x, evt.y);
      // 巫师技能：听觉范围+1
      if (dist <= evt.radius + hearingBonus) {
        const dir = getSoundDirection(player, evt.x, evt.y);
        const key = `${dir}-${evt.soundType}`;
        if (!heardSounds.has(key)) {
          heardSounds.add(key);
          let soundName;
          if (evt.soundType === 'run') soundName = '奔跑';
          else if (evt.soundType === 'walk') soundName = '静步';
          else if (evt.soundType === 'gunshot') soundName = '枪响';
          else soundName = evt.soundType;
          messages.push({ type: 'sound', text: `${dir}方向发出过${soundName}的声音` });
        }
      }
    }

    if (evt.type === 'scream') {
      const dir = getSoundDirection(player, evt.x, evt.y);
      const key = `${dir}-scream`;
      if (!heardSounds.has(key)) {
        heardSounds.add(key);
        // 沙寇技能：精确知道惨叫位置
        if (skills.screamLocate) {
          const cellStr = cellToStr(evt.x, evt.y);
          messages.push({ type: 'sound', text: `${dir}方向 ${cellStr} 格发出过惨叫（精确位置）` });
          // 触发首次惨叫兴奋
          if (!player.screamHeard) {
            player.screamHeard = true;
            messages.push({ type: 'system', text: `你听到了第一声惨叫，越发兴奋！奔跑距离+2格，且免疫遭遇击杀` });
          }
        } else if (skills.screamDistance) {
          // 预言者技能：惨叫感知带距离
          const dist = chebyshevDist(player.x, player.y, evt.x, evt.y);
          const distDesc = dist <= 2 ? '极近' : dist <= 4 ? '较近' : dist <= 6 ? '较远' : '极远';
          messages.push({ type: 'sound', text: `${dir}方向（${distDesc}）发出过惨叫` });
        } else {
          messages.push({ type: 'sound', text: `${dir}方向发出过惨叫` });
        }
      }
    }

    if (evt.type === 'grass') {
      for (const cell of evt.cells) {
        if (inBounds(cell.x, cell.y) && isInVision(player, cell.x, cell.y)) {
          const zone = getVisionZoneName(player, cell.x, cell.y);
          if (zone && !seenGrassZones.has(zone)) {
            seenGrassZones.add(zone);
            messages.push({ type: 'vision', text: `自身${zone}有过高草丛在动` });
          }
        }
      }
    }

    evt.perceivedBy.add(player.id);
  }

  // 站在水坑上的其他玩家在视野内可见
  const seenWaterPlayers = new Set();
  for (const other of game.players) {
    if (other.id === player.id || !other.alive) continue;
    if (!isWater(other.x, other.y)) continue;
    if (!isInVision(player, other.x, other.y)) continue;
    const zone = getVisionZoneName(player, other.x, other.y);
    if (zone && !seenWaterPlayers.has(zone)) {
      seenWaterPlayers.add(zone);
      messages.push({ type: 'vision', text: `自身${zone}水坑中有一个身影` });
    }
  }

  return messages;
}

function clearRoundEvents() {
  game.pendingEvents = [];
}

function tryMove(player, direction, distance) {
  const d = DIRS[direction];
  const nx = player.x + d.dx * distance;
  const ny = player.y + d.dy * distance;

  if (!inBounds(nx, ny)) {
    return { success: false, reason: 'wall' };
  }

  // 石柱阻挡
  if (isPillar(nx, ny)) {
    return { success: false, reason: 'pillar' };
  }

  const grassCells = [];
  for (let i = 0; i <= distance; i++) {
    const cx = player.x + d.dx * i;
    const cy = player.y + d.dy * i;
    grassCells.push({ x: cx, y: cy });
  }

  const oldX = player.x;
  const oldY = player.y;
  player.x = nx;
  player.y = ny;

  return { success: true, oldX, oldY, newX: nx, newY: ny, grassCells };
}

// 奔跑：两步独立方向（可转弯）
// direction 参数为第二步方向；第一步方向存于 game.runFirstStepDir
// 若 game.runFirstStepDir 为 null，则本次调用仅记录第一步并返回 false（不消耗行动点）
function doRun(direction) {
  const player = getCurrentPlayer();

  // 第一步：仅记录方向，等待玩家选第二步
  if (game.runFirstStepDir === null) {
    const d1 = DIRS[direction];
    const midX = player.x + d1.dx;
    const midY = player.y + d1.dy;
    // 第一步越界或遇石柱
    if (!inBounds(midX, midY) || isPillar(midX, midY)) {
      if (shouldShowActionInfo(player)) {
        showWallHit();
        SoundSystem.play('wall');
      }
      return false;
    }
    game.runFirstStepDir = direction;
    renderBoard();
    updateActionBar();
    return false;
  }

  // 第二步：执行完整奔跑
  const firstDir = game.runFirstStepDir;
  const d1 = DIRS[firstDir];
  const d2 = DIRS[direction];
  const startX = player.x;
  const startY = player.y;
  const midX = startX + d1.dx;
  const midY = startY + d1.dy;
  const endX = midX + d2.dx;
  const endY = midY + d2.dy;

  // 清除第一步记录
  game.runFirstStepDir = null;

  // 第二步越界或遇石柱
  if (!inBounds(endX, endY) || isPillar(endX, endY)) {
    if (shouldShowActionInfo(player)) {
      showWallHit();
      SoundSystem.play('wall');
    }
    return false;
  }

  const grassCells = [
    { x: startX, y: startY },
    { x: midX, y: midY },
    { x: endX, y: endY },
  ];

  let hitPlayer = null;
  const midOccupant = game.players.find(p => p.alive && p.id !== player.id && p.x === midX && p.y === midY);
  if (midOccupant) {
    hitPlayer = midOccupant;
    player.x = midX;
    player.y = midY;
  } else {
    const endOccupant = game.players.find(p => p.alive && p.id !== player.id && p.x === endX && p.y === endY);
    if (endOccupant) {
      hitPlayer = endOccupant;
      player.x = endX;
      player.y = endY;
    } else {
      player.x = endX;
      player.y = endY;
    }
  }

  // 声音半径：基础 + 路径上水坑加成
  const skills = getCharacterSkills(player);
  let runSoundRadius = skills.runSoundRadius !== undefined ? skills.runSoundRadius : 3;
  if (isWater(midX, midY)) runSoundRadius += 1;
  if (isWater(endX, endY)) runSoundRadius += 1;

  recordSoundEvent(startX, startY, runSoundRadius, 'run', player.id);
  recordGrassEvent(grassCells, player.id);
  if (shouldShowActionInfo(player)) {
    const firstDirName = DIRS[firstDir].name;
    const secondDirName = DIRS[direction].name;
    const dirDesc = firstDir === direction
      ? `朝${firstDirName}方向奔跑`
      : `朝${firstDirName}→${secondDirName}方向奔跑`;
    addActionLog(`${player.name} ${dirDesc}`, 'action');
    SoundSystem.play('run');
  }

  // 排队动画：起点/落点高亮、路径草丛扰动、水洼溅起
  // 仅在当前行动对观察者可见时显示（AI 行动隐藏）
  if (shouldShowActionInfo(player)) {
    queueCellAnim(startX, startY, 'move-from', 400);
    queueCellAnim(player.x, player.y, 'move-to', 400);
    grassCells.forEach(c => queueCellAnim(c.x, c.y, 'grass-moved', 600));
    if (isPuddle(midX, midY)) queueCellAnim(midX, midY, 'puddle-splash', 600);
    if (isPuddle(endX, endY) && !(midX === endX && midY === endY)) {
      queueCellAnim(endX, endY, 'puddle-splash', 600);
    }
  }

  // 踩中水洼提示（仅玩家自己可见）
  if (shouldShowActionInfo(player)) {
    if (isPuddle(midX, midY)) {
      addActionLog(`踩中了水洼！`, 'system');
    }
    if (isPuddle(endX, endY) && !(midX === endX && midY === endY)) {
      addActionLog(`踩中了水洼！`, 'system');
    }
  }

  if (hitPlayer) {
    if (shouldShowActionInfo(player) || shouldShowActionInfo(hitPlayer)) {
      addActionLog(`奔跑途中撞上了 ${hitPlayer.name}！`, 'system');
      addActionLog(`${player.name} 被淘汰`, 'system');
      SoundSystem.play('encounter');
      queueDeathEffects(player.x, player.y);
    }
    killPlayer(player);
  }

  return true;
}

// 取消奔跑第一步选择
function cancelRunFirstStep() {
  if (game.runFirstStepDir !== null) {
    game.runFirstStepDir = null;
    renderBoard();
    updateActionBar();
  }
}

function doWalk(direction) {
  const player = getCurrentPlayer();
  const skills = getCharacterSkills(player);

  // 沙寇：无法静步
  if (skills.noWalk) {
    if (shouldShowActionInfo(player)) {
      addActionLog(`${player.name}（沙寇）无法静步，太过兴奋！`, 'system');
    }
    return false;
  }

  const oldX = player.x;
  const oldY = player.y;
  const result = tryMove(player, direction, 1);

  if (!result.success) {
    if (shouldShowActionInfo(player)) {
      if (result.reason === 'pillar') {
        addActionLog(`石柱挡住了去路`, 'system');
      } else {
        showWallHit();
      }
      SoundSystem.play('wall');
    }
    return false;
  }

  // 声音半径：基础 + 落点水坑加成
  let walkSoundRadius = skills.walkSoundRadius !== undefined ? skills.walkSoundRadius : 1;
  if (isWater(result.newX, result.newY)) walkSoundRadius += 1;

  recordSoundEvent(result.oldX, result.oldY, walkSoundRadius, 'walk', player.id);
  recordGrassEvent(result.grassCells, player.id);
  if (shouldShowActionInfo(player)) {
    addActionLog(`${player.name} 朝${DIRS[direction].name}方向静步`, 'action');
    SoundSystem.play('walk');
  }

  // 排队动画：起点 move-from、落点 move-to、路径草丛扰动、水洼溅起
  // 仅在当前行动对观察者可见时显示（AI 行动隐藏）
  if (shouldShowActionInfo(player)) {
    queueCellAnim(oldX, oldY, 'move-from', 400);
    queueCellAnim(result.newX, result.newY, 'move-to', 400);
    result.grassCells.forEach(c => queueCellAnim(c.x, c.y, 'grass-moved', 600));
    if (isPuddle(result.newX, result.newY)) {
      queueCellAnim(result.newX, result.newY, 'puddle-splash', 600);
    }
  }

  // 踩中水洼提示（仅玩家自己可见）
  if (shouldShowActionInfo(player) && isPuddle(result.newX, result.newY)) {
    addActionLog(`踩中了水洼！`, 'system');
  }

  checkEncounter(player, oldX, oldY);
  return true;
}

function doAttack(direction) {
  const player = getCurrentPlayer();
  const skills = getCharacterSkills(player);
  const attackRange = skills.attackRange || 1;
  const d = DIRS[direction];
  const tx = player.x + d.dx * attackRange;
  const ty = player.y + d.dy * attackRange;

  if (!inBounds(tx, ty)) {
    if (shouldShowActionInfo(player)) {
      showWallHit();
      SoundSystem.play('wall');
    }
    return false;
  }

  // 攻击路径上的格子都会晃动
  const grassCells = [];
  for (let step = 1; step <= attackRange; step++) {
    grassCells.push({ x: player.x + d.dx * step, y: player.y + d.dy * step });
  }
  recordGrassEvent(grassCells, player.id);
  if (shouldShowActionInfo(player)) {
    addActionLog(`${player.name} 朝${DIRS[direction].name}方向攻击`, 'action');
    SoundSystem.play('attack');
  }

  // 排队动画：攻击轨迹扫光 + 路径草丛扰动（仅行动可见时）
  if (shouldShowActionInfo(player)) {
    grassCells.forEach(c => {
      queueCellAnim(c.x, c.y, 'attack-trail', 400);
      queueCellAnim(c.x, c.y, 'grass-moved', 600);
    });
  }

  const targets = game.players.filter(p => p.alive && !p.fakeDeath && p.id !== player.id && p.x === tx && p.y === ty);
  if (targets.length > 0) {
    const visible = shouldShowActionInfo(player) || targets.some(t => shouldShowActionInfo(t));
    if (visible) {
      addActionLog('打中了！', 'system');
      SoundSystem.play('hit');
      for (const t of targets) {
        addActionLog(`${t.name} 被淘汰`, 'system');
      }
      // 命中闪光 + 死亡效果
      queueCellAnim(tx, ty, 'attack-hit', 500);
      queueDeathEffects(tx, ty);
    }
    // 狂战技能：命中时不消耗行动点（每回合限1次）
    if (skills.freeHitPerTurn && player.freeHitUsed < skills.freeHitPerTurn) {
      player.freeHitUsed++;
      player._freeHitThisAction = true; // 标记本次行动不消耗行动点
    }
    for (const t of targets) {
      killPlayer(t);
    }
  } else {
    if (shouldShowActionInfo(player)) {
      addActionLog('打空了！', 'system');
      SoundSystem.play('miss');
      // 落空闪烁动画
      queueCellAnim(tx, ty, 'attack-miss', 500);
    }
  }

  return true;
}

/* ===== 吴明卒：开枪行动 ===== */
// 对一条直线上的第一个敌人造成伤害
function doShoot(direction) {
  const player = getCurrentPlayer();
  if (player.bullets <= 0) {
    if (shouldShowActionInfo(player)) {
      addActionLog(`${player.name} 没有子弹了！`, 'system');
    }
    return false;
  }

  const d = DIRS[direction];
  // 沿直线搜索第一个敌人（最多搜索到地图边界）
  let targetX = -1, targetY = -1;
  let targetPlayer = null;
  const trailCells = [];

  for (let step = 1; step < BOARD_SIZE; step++) {
    const cx = player.x + d.dx * step;
    const cy = player.y + d.dy * step;
    if (!inBounds(cx, cy)) break; // 出界停止
    trailCells.push({ x: cx, y: cy });
    // 石柱阻挡子弹
    if (isPillar(cx, cy)) {
      if (shouldShowActionInfo(player)) {
        addActionLog(`子弹被石柱挡住了！`, 'system');
      }
      break;
    }
    // 查找该格上的玩家（跳过假死玩家）
    const hit = game.players.find(p => p.alive && !p.fakeDeath && p.id !== player.id && p.x === cx && p.y === cy);
    if (hit) {
      targetX = cx;
      targetY = cy;
      targetPlayer = hit;
      break;
    }
  }

  // 消耗子弹
  player.bullets--;

  // 枪声：全地图传播（半径20，确保覆盖10x10地图）
  recordSoundEvent(player.x, player.y, 20, 'gunshot', player.id);

  if (shouldShowActionInfo(player)) {
    addActionLog(`${player.name}（吴明卒）朝${DIRS[direction].name}方向开枪！`, 'action');
    SoundSystem.play('attack');
  }

  // 排队动画：枪击轨迹
  if (shouldShowActionInfo(player)) {
    trailCells.forEach(c => {
      queueCellAnim(c.x, c.y, 'attack-trail', 400);
      queueCellAnim(c.x, c.y, 'grass-moved', 600);
    });
  }

  if (targetPlayer) {
    const visible = shouldShowActionInfo(player) || shouldShowActionInfo(targetPlayer);
    if (visible) {
      addActionLog(`打中了！${targetPlayer.name} 被淘汰`, 'system');
      SoundSystem.play('hit');
      queueCellAnim(targetX, targetY, 'attack-hit', 500);
      queueDeathEffects(targetX, targetY);
    }
    killPlayer(targetPlayer);
  } else {
    if (shouldShowActionInfo(player)) {
      addActionLog('子弹打空了！', 'system');
      SoundSystem.play('miss');
    }
  }

  return true;
}

/* ===== “声带”：模仿声音 ===== */
// 模仿声音不消耗行动次数，但每回合限1次
function doMimic(soundType, direction) {
  const player = getCurrentPlayer();
  if (player.mimicUsedThisTurn >= 1) {
    if (shouldShowActionInfo(player)) {
      addActionLog(`${player.name} 本回合已使用过模仿`, 'system');
    }
    return false;
  }

  player.mimicUsedThisTurn++;
  const d = DIRS[direction];
  // 在玩家前方一格"制造"声音事件
  const fakeX = player.x + d.dx;
  const fakeY = player.y + d.dy;
  const fx = inBounds(fakeX, fakeY) ? fakeX : player.x;
  const fy = inBounds(fakeX, fakeY) ? fakeY : player.y;

  let soundName = '';
  if (soundType === 'scream') {
    recordScreamEvent(fx, fy, player.id);
    soundName = '惨叫';
    SoundSystem.play('scream');
  } else if (soundType === 'run') {
    recordSoundEvent(fx, fy, 3, 'run', player.id);
    soundName = '奔跑';
    SoundSystem.play('run');
  } else if (soundType === 'walk') {
    recordSoundEvent(fx, fy, 1, 'walk', player.id);
    soundName = '静步';
    SoundSystem.play('walk');
  } else if (soundType === 'gunshot') {
    recordSoundEvent(fx, fy, 20, 'gunshot', player.id); // 枪响全地图传播
    soundName = '枪响';
    SoundSystem.play('attack');
  }

  if (shouldShowActionInfo(player)) {
    addActionLog(`${player.name}（声带）模仿了${soundName}的声音`, 'action');
  }

  // 不消耗行动点，直接刷新
  game.selectedAction = null;
  updateActionBar();
  renderBoard();
  if (isHostMode()) broadcastGameState();
  return true;
}

function checkEncounter(movingPlayer, oldX, oldY) {
  const stationary = game.players.find(p => 
    p.alive && p.id !== movingPlayer.id && p.x === movingPlayer.x && p.y === movingPlayer.y
  );

  if (!stationary) return;

  const dx = movingPlayer.x - oldX;
  const dy = movingPlayer.y - oldY;
  let moveDir = null;
  for (const [key, d] of Object.entries(DIRS)) {
    if (d.dx === dx && d.dy === dy) {
      moveDir = key;
      break;
    }
  }

  const oppositeDirs = { N: 'S', S: 'N', E: 'W', W: 'E' };
  const entryDir = oppositeDirs[moveDir];
  
  let movingDead = false;
  let reason = '';

  // 守卫技能：相遇时必胜（stationary是守卫时，移动者必死）
  const stationarySkills = getCharacterSkills(stationary);
  const movingSkills = getCharacterSkills(movingPlayer);

  // 沙寇技能：听到惨叫后免疫遭遇击杀
  if (movingSkills.thrillSeeker && movingPlayer.screamHeard) {
    // 沙寇免疫，且不击杀对方（双方都活）
    if (shouldShowActionInfo(movingPlayer) || shouldShowActionInfo(stationary)) {
      addActionLog(`相遇！${movingPlayer.name}（沙寇）因兴奋而免疫遭遇击杀，双方都活着`, 'system');
      SoundSystem.play('encounter');
    }
    return; // 双方都不死
  }

  // 乔的警惕性：苏醒后任何经过他所在格子的行动都会被"提防"
  if (stationarySkills.survivalInstinct && stationary.vigilance) {
    movingDead = true;
    reason = `${stationary.name}（乔）警惕性提高，提防成功，${movingPlayer.name} 被淘汰`;
  } else if (stationarySkills.encounterAlwaysWin) {
    movingDead = true;
    reason = `${stationary.name}（守卫）反杀成功，${movingPlayer.name} 被淘汰`;
  } else if (entryDir === stationary.facing) {
    movingDead = true;
    reason = `${stationary.name} 提防成功，${movingPlayer.name} 被淘汰`;
  } else {
    movingDead = false;
    reason = `${movingPlayer.name} 偷袭成功，${stationary.name} 被淘汰`;
  }

  if (shouldShowActionInfo(movingPlayer) || shouldShowActionInfo(stationary)) {
    addActionLog(`相遇！${reason}`, 'system');
    SoundSystem.play('encounter');
  }

  if (movingDead) {
    if (shouldShowActionInfo(movingPlayer) || shouldShowActionInfo(stationary)) {
      queueDeathEffects(movingPlayer.x, movingPlayer.y);
    }
    killPlayer(movingPlayer);
  } else {
    if (shouldShowActionInfo(movingPlayer) || shouldShowActionInfo(stationary)) {
      queueDeathEffects(stationary.x, stationary.y);
    }
    killPlayer(stationary);
  }
}

function getMoveDirection(movingPlayer, stationaryPlayer) {
  const dx = movingPlayer.x - stationaryPlayer.x;
  const dy = movingPlayer.y - stationaryPlayer.y;
  
  for (const [key, d] of Object.entries(DIRS)) {
    if (d.dx === dx && d.dy === dy) {
      return key;
    }
  }
  return null;
}

function killPlayer(player) {
  // 乔的求生意志：首次被攻击时进入假死
  const skills = getCharacterSkills(player);
  if (skills.survivalInstinct && !player.fakeDeath && !player.vigilance && !player._survivalUsed) {
    // 首次攻击，进入假死
    player._survivalUsed = true;
    player.fakeDeath = true;
    player.skipNextTurn = true;
    recordScreamEvent(player.x, player.y, player.id); // 制造惨叫假象
    SoundSystem.play('scream');
    if (shouldShowActionInfo(player)) {
      addActionLog(`${player.name}（乔）触发求生意志，进入假死！`, 'system');
    }
    return; // 不真正死亡
  }

  // 乔苏醒后被再次攻击，或苏醒3回合后，正常死亡
  player.alive = false;
  player._deathTime = Date.now();
  recordScreamEvent(player.x, player.y, player.id);
  SoundSystem.play('scream');

  // 死亡爆裂 + 惨叫标记动画由调用方根据可见性决定是否排队
  const aliveCount = game.players.filter(p => p.alive).length;
  if (aliveCount <= 1) {
    game.winner = game.players.find(p => p.alive);
    game.phase = 'gameOver';
    setTimeout(() => SoundSystem.play('victory'), 600);
  }
}

// 排队死亡视觉效果（仅在死亡事件对当前观察者可见时调用）
function queueDeathEffects(x, y) {
  queueSpawnEffect(x, y, 'death-burst', 800);
  queueSpawnEffect(x, y, 'scream-mark', 1200, '💀');
}

function dirStrToKeys(dirStr) {
  const keys = [];
  if (dirStr.includes('北')) keys.push('N');
  if (dirStr.includes('南')) keys.push('S');
  if (dirStr.includes('东')) keys.push('E');
  if (dirStr.includes('西')) keys.push('W');
  return keys;
}

function createBeliefMap() {
  const map = [];
  for (let y = 0; y < 10; y++) {
    map[y] = [];
    for (let x = 0; x < 10; x++) {
      map[y][x] = 0;
    }
  }
  return map;
}

function cloneBeliefMap(map) {
  return map.map(row => row.slice());
}

function decayBeliefs(map, factor) {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      map[y][x] *= factor;
      if (map[y][x] < 0.01) map[y][x] = 0;
    }
  }
}

function addBeliefArea(map, cx, cy, radius, value, shape) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!inBounds(x, y)) continue;
      
      if (shape === 'chebyshev') {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (dist <= radius && dist > 0) {
          map[y][x] += value * (1 - dist / (radius + 1));
        }
      } else if (shape === 'cone') {
        map[y][x] += value;
      }
    }
  }
}

function getDirectionRange(dirKeys) {
  const ranges = { minDx: -10, maxDx: 10, minDy: -10, maxDy: 10 };
  if (dirKeys.includes('N')) { ranges.minDy = 1; }
  if (dirKeys.includes('S')) { ranges.maxDy = -1; }
  if (dirKeys.includes('E')) { ranges.minDx = 1; }
  if (dirKeys.includes('W')) { ranges.maxDx = -1; }
  return ranges;
}

function updateBeliefsFromSound(beliefMap, aiX, aiY, msg) {
  let soundType = 'unknown';
  let radius = 10;
  let minDist = 1;
  
  if (msg.text.includes('奔跑')) {
    soundType = 'run';
    radius = 3;
    minDist = 1;
  } else if (msg.text.includes('静步')) {
    soundType = 'walk';
    radius = 1;
    minDist = 1;
  } else if (msg.text.includes('惨叫')) {
    soundType = 'scream';
    radius = 10;
    minDist = 1;
  }
  
  const dirStr = msg.text.replace('方向发出过奔跑的声音', '')
    .replace('方向发出过静步的声音', '')
    .replace('方向发出过惨叫', '');
  const dirKeys = dirStrToKeys(dirStr);
  const range = getDirectionRange(dirKeys);
  
  let value = soundType === 'scream' ? 3.0 : (soundType === 'run' ? 1.5 : 0.8);
  
  for (let dy = -10; dy <= 10; dy++) {
    for (let dx = -10; dx <= 10; dx++) {
      const x = aiX + dx;
      const y = aiY + dy;
      if (!inBounds(x, y)) continue;
      
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist < minDist || dist > radius) continue;
      
      if (dx < range.minDx || dx > range.maxDx) continue;
      if (dy < range.minDy || dy > range.maxDy) continue;
      
      if (dirKeys.length === 2) {
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if (absDx < Math.floor(dist / 2) || absDy < Math.floor(dist / 2)) continue;
      }
      
      const falloff = 1 - (dist - 1) / radius;
      beliefMap[y][x] += value * Math.max(0.2, falloff);
    }
  }
}

function updateBeliefsFromVision(beliefMap, aiPlayer, msg) {
  const zoneName = msg.text.replace('自身', '').replace('有过高草丛在动', '');
  
  const vision = getVisionCells(aiPlayer);
  let cellList = [];
  if (zoneName === '左前方') cellList = vision.leftFront;
  else if (zoneName === '正前方') cellList = vision.front;
  else if (zoneName === '右前方') cellList = vision.rightFront;
  
  for (const cell of cellList) {
    if (inBounds(cell.x, cell.y)) {
      beliefMap[cell.y][cell.x] += 2.0;
    }
  }
}

function aiGetVisionCellsList(player) {
  const vision = getVisionCells(player);
  const list = [];
  for (const c of vision.leftFront) list.push({ ...c, zone: '左前方' });
  for (const c of vision.front) list.push({ ...c, zone: '正前方' });
  for (const c of vision.rightFront) list.push({ ...c, zone: '右前方' });
  return list;
}

function dirToChinese(dir) {
  const map = { N: '北', S: '南', E: '东', W: '西' };
  return map[dir] || dir;
}

function findHighestBeliefCell(beliefMap, excludeX, excludeY) {
  let bestX = -1, bestY = -1, bestVal = 0;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (x === excludeX && y === excludeY) continue;
      if (beliefMap[y][x] > bestVal) {
        bestVal = beliefMap[y][x];
        bestX = x;
        bestY = y;
      }
    }
  }
  return { x: bestX, y: bestY, value: bestVal };
}

function getTotalBelief(beliefMap) {
  let total = 0;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      total += beliefMap[y][x];
    }
  }
  return total;
}

function simulateMove(x, y, dir, dist) {
  const d = DIRS[dir];
  return { x: x + d.dx * dist, y: y + d.dy * dist };
}

function manhattanDist(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function evaluateActionRisk(actionType, dir, x, y, beliefMap) {
  const d = DIRS[dir];
  let risk = 0;

  if (actionType === 'run') {
    const midX = x + d.dx;
    const midY = y + d.dy;
    const endX = x + d.dx * 2;
    const endY = y + d.dy * 2;

    if (inBounds(midX, midY)) {
      risk += beliefMap[midY][midX] * 50;
      if (isInFireCircle(midX, midY)) risk += 500;
      else if (isFireWarning(midX, midY)) risk += 40;
    }
    if (inBounds(endX, endY)) {
      risk += beliefMap[endY][endX] * 30;
      if (isInFireCircle(endX, endY)) risk += 800;
      else if (isFireWarning(endX, endY)) risk += 60;
    }
  } else if (actionType === 'walk') {
    const endX = x + d.dx;
    const endY = y + d.dy;
    if (inBounds(endX, endY)) {
      risk += beliefMap[endY][endX] * 15;
      if (isInFireCircle(endX, endY)) risk += 800;
      else if (isFireWarning(endX, endY)) risk += 50;
    }
  } else if (actionType === 'attack') {
    risk += 5;
  }

  return risk;
}

function evaluateActionReward(actionType, dir, x, y, beliefMap, targetX, targetY, player) {
  let reward = 0;
  const d = DIRS[dir];

  if (actionType === 'attack') {
    // 支持刺客的2格攻击距离
    const skills = getCharacterSkills(player);
    const attackRange = skills.attackRange || 1;
    const tx = x + d.dx * attackRange;
    const ty = y + d.dy * attackRange;
    if (inBounds(tx, ty)) {
      const belief = beliefMap[ty][tx];
      const unknownPrior = (game.players.filter(p => p.alive).length - 1) / 99;
      if (belief > unknownPrior * 5) {
        reward += belief * 80;
      }
    }
    reward -= 8;
  } else {
    let newX, newY;
    if (actionType === 'run') {
      newX = x + d.dx * 2;
      newY = y + d.dy * 2;
      reward -= 5;
    } else {
      newX = x + d.dx;
      newY = y + d.dy;
      reward -= 2;
    }
    
    if (!inBounds(newX, newY)) return -Infinity;
    // 石柱阻挡：不可达
    if (isPillar(newX, newY)) return -Infinity;
    // 奔跑还需检查中点石柱
    if (actionType === 'run' && isPillar(x + d.dx, y + d.dy)) return -Infinity;

    // 火圈奖励：逃离燃烧/警告区
    const wasInFire = isInFireCircle(x, y);
    const wasInWarning = isFireWarning(x, y);
    const willBeInFire = isInFireCircle(newX, newY);
    const willBeInWarning = isFireWarning(newX, newY);
    if (wasInFire && !willBeInFire) reward += 300;
    else if (wasInWarning && !willBeInFire && !willBeInWarning) reward += 80;

    if (targetX >= 0 && targetY >= 0) {
      const oldDist = manhattanDist(x, y, targetX, targetY);
      const newDist = manhattanDist(newX, newY, targetX, targetY);
      if (newDist < oldDist) {
        reward += (oldDist - newDist) * 4;
      } else {
        reward -= (newDist - oldDist) * 2;
      }
    }
  }
  
  return reward;
}

function buildAIBeliefMap(aiPlayer, perceptionMsgs) {
  const beliefMap = createBeliefMap();
  const totalPlayersAlive = game.players.filter(p => p.alive).length;
  const unknownPrior = (totalPlayersAlive - 1) / 99;
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (x !== aiPlayer.x || y !== aiPlayer.y) {
        beliefMap[y][x] = unknownPrior;
      }
    }
  }
  
  for (const msg of perceptionMsgs) {
    if (msg.type === 'sound') {
      updateBeliefsFromSound(beliefMap, aiPlayer.x, aiPlayer.y, msg);
    } else if (msg.type === 'vision') {
      updateBeliefsFromVision(beliefMap, aiPlayer, msg);
    }
  }
  
  return beliefMap;
}

function aiChooseAction(aiPlayer, perceptionMsgs) {
  const dirKeys = ['N', 'E', 'S', 'W'];
  const beliefMap = buildAIBeliefMap(aiPlayer, perceptionMsgs);
  
  const best = findHighestBeliefCell(beliefMap, aiPlayer.x, aiPlayer.y);
  const unknownPrior = (game.players.filter(p => p.alive).length - 1) / 99;
  const hasTarget = best.value > unknownPrior * 3;
  const targetX = hasTarget ? best.x : -1;
  const targetY = hasTarget ? best.y : -1;
  
  const aggression = 0.5 + Math.random() * 0.5;
  
  let bestAction = null;
  let bestScore = -Infinity;
  
  for (const actionType of ['run', 'walk', 'attack']) {
    // 沙寇无法静步
    if (actionType === 'walk' && aiPlayer.characterId === 'maniac') continue;

    for (const dir of dirKeys) {
      const d = DIRS[dir];
      let valid = true;
      let newX = aiPlayer.x;
      let newY = aiPlayer.y;

      if (actionType === 'run') {
        newX = aiPlayer.x + d.dx * 2;
        newY = aiPlayer.y + d.dy * 2;
        const midX = aiPlayer.x + d.dx;
        const midY = aiPlayer.y + d.dy;
        if (!inBounds(newX, newY) || isPillar(midX, midY) || isPillar(newX, newY)) valid = false;
      } else if (actionType === 'walk') {
        newX = aiPlayer.x + d.dx;
        newY = aiPlayer.y + d.dy;
        if (!inBounds(newX, newY) || isPillar(newX, newY)) valid = false;
      } else if (actionType === 'attack') {
        const tx = aiPlayer.x + d.dx;
        const ty = aiPlayer.y + d.dy;
        if (!inBounds(tx, ty)) valid = false;
        if (valid) {
          const belief = beliefMap[ty][tx];
          if (belief < unknownPrior * 5 && !hasTarget) {
            valid = false;
          }
        }
      }
      
      if (!valid) continue;
      
      const risk = evaluateActionRisk(actionType, dir, aiPlayer.x, aiPlayer.y, beliefMap);
      const reward = evaluateActionReward(actionType, dir, aiPlayer.x, aiPlayer.y, beliefMap, targetX, targetY, aiPlayer);
      
      let score = reward - risk * (1 - aggression);
      
      if (actionType === 'attack' && hasTarget) {
        const tx = aiPlayer.x + d.dx;
        const ty = aiPlayer.y + d.dy;
        if (chebyshevDist(tx, ty, targetX, targetY) === 0) {
          score += 100;
        }
      }
      
      if (hasTarget && actionType !== 'attack') {
        const distAfter = chebyshevDist(newX, newY, targetX, targetY);
        const distBefore = chebyshevDist(aiPlayer.x, aiPlayer.y, targetX, targetY);
        if (distAfter < distBefore) {
          score += (distBefore - distAfter) * 5;
        }
        if (distAfter === 1 && actionType === 'walk') {
          score += 10;
        }
      }
      
      score += Math.random() * 2;
      
      if (score > bestScore) {
        bestScore = score;
        bestAction = { type: actionType, direction: dir };
      }
    }
  }
  
  if (!bestAction || bestScore < -15) {
    // 优先选择非火圈方向
    let validDirs = dirKeys.filter(d => {
      const nx = aiPlayer.x + DIRS[d].dx;
      const ny = aiPlayer.y + DIRS[d].dy;
      return inBounds(nx, ny) && !isInFireCircle(nx, ny);
    });
    // 若全被火圈占据则退而求其次
    if (validDirs.length === 0) {
      validDirs = dirKeys.filter(d => inBounds(aiPlayer.x + DIRS[d].dx, aiPlayer.y + DIRS[d].dy));
    }
    if (validDirs.length > 0) {
      const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)];
      bestAction = { type: 'walk', direction: randomDir };
    }
  }
  
  return bestAction;
}

function aiChooseFacing(aiPlayer, perceptionMsgs) {
  const dirKeys = ['N', 'E', 'S', 'W'];
  const beliefMap = buildAIBeliefMap(aiPlayer, perceptionMsgs);
  
  const best = findHighestBeliefCell(beliefMap, aiPlayer.x, aiPlayer.y);
  const unknownPrior = (game.players.filter(p => p.alive).length - 1) / 99;
  const hasTarget = best.value > unknownPrior * 3;
  const targetX = hasTarget ? best.x : -1;
  const targetY = hasTarget ? best.y : -1;
  
  let bestFaceDir = aiPlayer.facing;
  let bestFaceScore = -Infinity;
  
  for (const dir of dirKeys) {
    let score = 0;
    const tempPlayer = { x: aiPlayer.x, y: aiPlayer.y, facing: dir };
    const visionCells = aiGetVisionCellsList(tempPlayer);
    
    for (const cell of visionCells) {
      if (inBounds(cell.x, cell.y)) {
        score += beliefMap[cell.y][cell.x] * 10;
      }
    }
    
    if (hasTarget) {
      const targetDir = getDirectionFromTo(aiPlayer.x, aiPlayer.y, targetX, targetY);
      const dirChinese = dirToChinese(dir);
      if (targetDir === dirChinese) {
        score += 15;
      }
    }
    
    score += Math.random() * 2;
    
    if (score > bestFaceScore) {
      bestFaceScore = score;
      bestFaceDir = dir;
    }
  }
  
  return bestFaceDir;
}

function executeAITurn() {
  const aiPlayer = getCurrentPlayer();
  if (!aiPlayer.isAI || !aiPlayer.alive) return;
  
  if (game.phase === 'action') {
    executeAIAction();
  } else if (game.phase === 'ending') {
    executeAIEnding();
  }
}

function executeAIAction() {
  const aiPlayer = getCurrentPlayer();
  if (!aiPlayer.isAI || !aiPlayer.alive) return;
  if (game.phase !== 'action') return;
  if (game.actionCount <= 0) {
    enterEndingPhase();
    if (isHostMode()) broadcastGameState();
    setTimeout(executeAIEnding, 600);
    return;
  }

  const perceptionMsgs = game.pendingMessages[aiPlayer.id] || [];
  const action = aiChooseAction(aiPlayer, perceptionMsgs);

  if (!action) {
    enterEndingPhase();
    if (isHostMode()) broadcastGameState();
    setTimeout(executeAIEnding, 600);
    return;
  }

  let success = false;
  if (action.type === 'run') {
    // AI 奔跑：第一步设置方向，第二步使用同方向（直线奔跑）
    doRun(action.direction);            // 第一步：记录方向
    success = doRun(action.direction);  // 第二步：执行
  } else if (action.type === 'walk') {
    success = doWalk(action.direction);
  } else if (action.type === 'attack') {
    success = doAttack(action.direction);
  }

  if (game.phase === 'gameOver') {
    if (isHostMode()) broadcastGameState();
    showEndScreen();
    return;
  }

  if (success) {
    game.actionCount--;
    updateAll();
    if (isHostMode()) broadcastGameState();

    if (game.phase === 'gameOver') {
      showEndScreen();
      return;
    }

    if (game.actionCount <= 0) {
      setTimeout(() => {
        enterEndingPhase();
        if (isHostMode()) broadcastGameState();
        setTimeout(executeAIEnding, 600);
      }, 500);
    } else {
      game.selectedAction = null;
      setTimeout(executeAIAction, 800);
    }
  } else {
    setTimeout(executeAIAction, 600);
  }
}

function executeAIEnding() {
  const aiPlayer = getCurrentPlayer();
  if (!aiPlayer.isAI || !aiPlayer.alive) return;
  if (game.phase !== 'ending') return;
  
  const perceptionMsgs = game.pendingMessages[aiPlayer.id] || [];
  const facingDir = aiChooseFacing(aiPlayer, perceptionMsgs);
  
  endTurn(facingDir);
}

function showWallHit() {
  addActionLog('您撞到了墙壁！', 'system');
}

function useAction() {
  const player = getCurrentPlayer();
  // 狂战技能：命中时不消耗行动点
  if (player._freeHitThisAction) {
    player._freeHitThisAction = false;
    if (shouldShowActionInfo(player)) {
      addActionLog(`${player.characterName}技能触发：攻击不消耗行动点`, 'system');
    }
  } else {
    game.actionCount--;
  }
  updateActionBar();
  renderBoard();
  updateStatusBar();

  if (isHostMode()) broadcastGameState();

  if (game.actionCount <= 0) {
    setTimeout(() => {
      enterEndingPhase();
      if (isHostMode()) broadcastGameState();
    }, 500);
  } else {
    game.selectedAction = null;
    updateActionBar();
  }
}

function enterEndingPhase() {
  game.phase = 'ending';
  game.selectedAction = null;
  updateActionBar();
  if (shouldShowActionInfo(getCurrentPlayer())) {
    addActionLog('请选择朝向以结束回合', 'system');
  }
}

function endTurn(facingDirection) {
  const player = getCurrentPlayer();
  player.facing = facingDirection;
  if (shouldShowActionInfo(player)) {
    addActionLog(`${player.name} 朝向${DIRS[facingDirection].name}结束回合`, 'action');
  }

  const alivePlayers = game.players.filter(p => p.alive);
  if (alivePlayers.length <= 1) {
    game.winner = alivePlayers[0] || null;
    game.phase = 'gameOver';
    if (isHostMode()) broadcastGameState();
    showEndScreen();
    return;
  }

  advanceToNextPlayer();
}

function advanceToNextPlayer() {
  let nextIdx = (game.currentPlayerIdx + 1) % game.players.length;
  let checked = 0;

  // 跳过死亡玩家，以及假死或需跳过回合的玩家
  while (checked < game.players.length) {
    const p = game.players[nextIdx];
    if (!p.alive) {
      // 死亡玩家，跳过
    } else if (p.fakeDeath) {
      // 乔的假死：苏醒
      p.fakeDeath = false;
      p.vigilance = true; // 警惕性提高
      p.wakeCount = 0;
      if (shouldShowActionInfo(p)) {
        addActionLog(`${p.name}（乔）从假死中苏醒，警惕性提高！`, 'system');
      }
      // 苏醒后仍跳过当前回合（按技能描述"跳过自己的下一回合"）
    } else if (p.skipNextTurn) {
      // 跳过此回合
      p.skipNextTurn = false;
      if (shouldShowActionInfo(p)) {
        addActionLog(`${p.name} 跳过了本回合`, 'system');
      }
    } else {
      break;
    }
    nextIdx = (nextIdx + 1) % game.players.length;
    checked++;
  }

  if (nextIdx <= game.currentPlayerIdx) {
    game.roundCount++;
    // 新回合开始时检查火圈扩散
    if (game.fireCircle.enabled && game.roundCount > 0 &&
        game.roundCount % game.fireCircle.cycle === 0) {
      expandFireCircle();
      if (isHostMode()) broadcastGameState();
    }
  }

  // 若火圈导致游戏结束，直接返回
  if (game.phase === 'gameOver') {
    showEndScreen();
    return;
  }

  game.currentPlayerIdx = nextIdx;
  game.actionCount = 2;
  game.selectedAction = null;

  // 重置新玩家的技能使用计数
  const newPlayer = game.players[nextIdx];
  if (newPlayer) {
    newPlayer.freeHitUsed = 0;
    newPlayer._freeHitThisAction = false;
    newPlayer.mimicUsedThisTurn = 0; // 声带：每回合重置模仿次数
    // 乔：苏醒后警惕性提高，每回合累加 wakeCount，3 回合后死亡
    if (newPlayer.vigilance) {
      newPlayer.wakeCount++;
      if (newPlayer.wakeCount > 3) {
        if (shouldShowActionInfo(newPlayer)) {
          addActionLog(`${newPlayer.name}（乔）苏醒3回合后力竭死亡`, 'system');
        }
        killPlayer(newPlayer);
        // 递归到下一个玩家
        setTimeout(() => advanceToNextPlayer(), 100);
        return;
      }
    }
    // 沙寇：听到惨叫后兴奋，奔跑距离+2格（通过额外行动点实现，可多奔跑1次=2格）
    if (newPlayer.characterId === 'maniac' && newPlayer.screamHeard) {
      game.actionCount = 3; // 多1次行动，可用于奔跑达到4格
      if (shouldShowActionInfo(newPlayer)) {
        addActionLog(`${newPlayer.name}（沙寇）因惨叫而兴奋，多1次行动！`, 'system');
      }
    }
  }

  const isFirstTurnOfPlayer1 = (game.roundCount === 0 && nextIdx === 0);

  if (isFirstTurnOfPlayer1) {
    game.phase = 'action';
  } else {
    game.phase = 'perception';
  }

  showTurnMask();
}

function enterActionPhase() {
  game.phase = 'action';
  game.actionCount = 2;
  game.selectedAction = null;
  if (shouldShowActionInfo(getCurrentPlayer())) {
    addActionLog(`${getCurrentPlayer().name} 的回合开始`, 'system');
  }
  updateAll();
}

function startPerceptionPhase() {
  const player = getCurrentPlayer();
  const messages = processPerceptionPhase(player);
  game.pendingMessages[player.id] = messages;
  game.phase = 'perception';
  SoundSystem.play('perception');
  return messages;
}

function addActionLog(text, type = 'action') {
  const logEl = document.getElementById('action-log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = text;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function showPerceptionMessages(messages) {
  const logEl = document.getElementById('perception-log');
  logEl.innerHTML = '';

  if (messages.length === 0) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = '周围一片寂静...';
    entry.style.color = '#5a6a8a';
    logEl.appendChild(entry);
  } else {
    messages.forEach((msg, i) => {
      const entry = document.createElement('div');
      entry.className = `log-entry ${msg.type}`;
      entry.textContent = msg.text;
      entry.style.animationDelay = `${i * 0.08}s`;
      entry.style.opacity = '0';
      logEl.appendChild(entry);
      // 触发淡入
      requestAnimationFrame(() => {
        entry.style.transition = 'opacity 0.3s ease';
        entry.style.opacity = '1';
      });
    });
  }
}

function clearPerceptionLog() {
  document.getElementById('perception-log').innerHTML = '';
}

function updateAll() {
  renderBoard();
  updateActionBar();
  updateStatusBar();
  updateTurnInfo();
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  const colLabels = document.createElement('div');
  colLabels.className = 'board-col-labels';

  const corner = document.createElement('div');
  corner.className = 'col-label';
  colLabels.appendChild(corner);

  for (let i = 0; i < BOARD_SIZE; i++) {
    const label = document.createElement('div');
    label.className = 'col-label';
    label.textContent = COLS[i];
    colLabels.appendChild(label);
  }
  board.appendChild(colLabels);

  const grid = document.createElement('div');
  grid.className = 'board-grid';

  for (let row = BOARD_SIZE - 1; row >= 0; row--) {
    const rowEl = document.createElement('div');
    rowEl.className = 'board-row';

    const rowLabel = document.createElement('div');
    rowLabel.className = 'row-label';
    rowLabel.textContent = row + 1;
    rowEl.appendChild(rowLabel);

    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = col;
      cell.dataset.y = row;
      cell.addEventListener('click', () => onCellClick(col, row));
      // 右键标记
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleMark(col, row);
      });

      // 火圈视觉：已燃烧 / 警告区
      if (isInFireCircle(col, row)) {
        cell.classList.add('fire');
      } else if (isFireWarning(col, row)) {
        cell.classList.add('fire-warning');
      }

      // 地形视觉：水坑、石柱可见；水洼不可见
      const terrain = getTerrainAt(col, row);
      if (terrain === TERRAIN_TYPES.WATER) {
        cell.classList.add('water');
      } else if (terrain === TERRAIN_TYPES.PILLAR) {
        cell.classList.add('pillar');
        const pillarEl = document.createElement('div');
        pillarEl.className = 'pillar-marker';
        pillarEl.textContent = '⬛';
        cell.appendChild(pillarEl);
      }

      const player = game.players.find(p => p.alive && p.x === col && p.y === row);
      if (player && game.phase !== 'perception') {
        if (shouldShowPlayerPosition(player)) {
          cell.classList.add('player-cell');
          const marker = document.createElement('div');
          marker.className = `player-marker facing-${player.facing.toLowerCase()}`;
          marker.style.background = player.color;
          const arrow = document.createElement('div');
          arrow.className = 'arrow';
          marker.appendChild(arrow);
          cell.appendChild(marker);
        }
      }

      // 显示玩家标记（仅当前玩家可见，所有阶段都显示）
      const currentPlayer = getCurrentPlayer();
      if (currentPlayer && game.phase !== 'gameOver') {
        const isCurrentPlayerVisible = isLocalMode() ? !currentPlayer.isAI : currentPlayer.id === game.myPlayerIdx;
        if (isCurrentPlayerVisible) {
          const markKey = `${col},${row}`;
          if (currentPlayer.marks.has(markKey)) {
            cell.classList.add('marked-cell');
            const flag = document.createElement('div');
            flag.className = 'mark-flag';
            flag.textContent = '🚩';
            cell.appendChild(flag);
          }
        }
      }

      if (game.selectedAction && game.phase === 'action') {
        if (isHighlightedMove(col, row)) {
          cell.classList.add('highlight-move');
        }
        if (isHighlightedAttack(col, row)) {
          cell.classList.add('highlight-attack');
        }
      }

      rowEl.appendChild(cell);
    }

    grid.appendChild(rowEl);
  }

  board.appendChild(grid);

  // 刷新待播放动画（在 DOM 构建完成后）
  flushPendingAnimations();
}

function isHighlightedMove(x, y) {
  if (!game.selectedAction || game.phase !== 'action') return false;
  if (game.selectedAction.type !== 'run' && game.selectedAction.type !== 'walk') return false;

  const player = getCurrentPlayer();

  if (game.selectedAction.type === 'walk') {
    // 静步：相邻1格
    for (const dir of Object.keys(DIRS)) {
      const d = DIRS[dir];
      const tx = player.x + d.dx;
      const ty = player.y + d.dy;
      if (tx === x && ty === y && inBounds(tx, ty) && !isPillar(tx, ty)) return true;
    }
    return false;
  }

  // 奔跑
  if (game.runFirstStepDir === null) {
    // 第一步：相邻4格（不能是石柱）
    for (const dir of Object.keys(DIRS)) {
      const d = DIRS[dir];
      const tx = player.x + d.dx;
      const ty = player.y + d.dy;
      if (tx === x && ty === y && inBounds(tx, ty) && !isPillar(tx, ty)) return true;
    }
    return false;
  } else {
    // 第二步：从midX/midY出发的相邻4格（不能是石柱）
    const d1 = DIRS[game.runFirstStepDir];
    const midX = player.x + d1.dx;
    const midY = player.y + d1.dy;
    for (const dir of Object.keys(DIRS)) {
      const d = DIRS[dir];
      const tx = midX + d.dx;
      const ty = midY + d.dy;
      if (tx === x && ty === y && inBounds(tx, ty) && !isPillar(tx, ty)) return true;
    }
    return false;
  }
}

function isHighlightedAttack(x, y) {
  if (!game.selectedAction || game.phase !== 'action') return false;
  if (game.selectedAction.type !== 'attack') return false;
  
  const player = getCurrentPlayer();
  for (const dir of Object.keys(DIRS)) {
    const d = DIRS[dir];
    const tx = player.x + d.dx;
    const ty = player.y + d.dy;
    if (tx === x && ty === y && inBounds(tx, ty)) return true;
  }
  return false;
}

/**
 * 切换格子标记（右键/长按）
 * 类似扫雷的插旗功能，仅当前玩家可见
 */
function toggleMark(x, y) {
  if (!canMarkLocal()) return;

  const player = getCurrentPlayer();
  const key = `${x},${y}`;

  // 不能标记自己所在的位置
  if (player.x === x && player.y === y) return;

  if (player.marks.has(key)) {
    player.marks.delete(key);
  } else {
    player.marks.add(key);
  }

  SoundSystem.play('click');
  renderBoard();
}

function canMarkLocal() {
  if (game.phase === 'gameOver') return false;
  if (isLocalMode()) return true;
  if (isGuestMode()) return true; // 客机在任何阶段都可以标记
  if (isHostMode()) return true; // 主机在任何阶段都可以标记
  return false;
}

function onCellClick(x, y) {
  if (game.phase !== 'action' || !game.selectedAction) return;

  const player = getCurrentPlayer();

  // 攻击：相邻1格
  if (game.selectedAction.type === 'attack') {
    const dx = x - player.x;
    const dy = y - player.y;
    for (const [key, d] of Object.entries(DIRS)) {
      if (d.dx === dx && d.dy === dy) {
        executeSelectedAction(key);
        return;
      }
    }
    return;
  }

  // 开枪：沿直线方向（点击的格子决定方向）
  if (game.selectedAction.type === 'shoot') {
    const dx = x - player.x;
    const dy = y - player.y;
    // 必须是直线方向（dx=0 或 dy=0）
    for (const [key, d] of Object.entries(DIRS)) {
      if ((d.dx === 0 && dx === 0 && Math.sign(dy) === Math.sign(d.dy)) ||
          (d.dy === 0 && dy === 0 && Math.sign(dx) === Math.sign(d.dx))) {
        executeSelectedAction(key);
        return;
      }
    }
    return;
  }

  // 模仿声音：点击格子决定声音来源方向（相邻1格）
  if (game.selectedAction.type === 'mimic') {
    const dx = x - player.x;
    const dy = y - player.y;
    for (const [key, d] of Object.entries(DIRS)) {
      if (d.dx === dx && d.dy === dy) {
        executeSelectedAction(key);
        return;
      }
    }
    return;
  }

  // 静步：相邻1格
  if (game.selectedAction.type === 'walk') {
    const dx = x - player.x;
    const dy = y - player.y;
    for (const [key, d] of Object.entries(DIRS)) {
      if (d.dx === dx && d.dy === dy) {
        executeSelectedAction(key);
        return;
      }
    }
    return;
  }

  // 奔跑：两步独立方向
  if (game.selectedAction.type === 'run') {
    if (game.runFirstStepDir === null) {
      // 第一步：相对玩家相邻1格
      const dx = x - player.x;
      const dy = y - player.y;
      for (const [key, d] of Object.entries(DIRS)) {
        if (d.dx === dx && d.dy === dy) {
          executeSelectedAction(key);
          return;
        }
      }
    } else {
      // 第二步：相对midX/midY相邻1格
      const d1 = DIRS[game.runFirstStepDir];
      const midX = player.x + d1.dx;
      const midY = player.y + d1.dy;
      const dx = x - midX;
      const dy = y - midY;
      for (const [key, d] of Object.entries(DIRS)) {
        if (d.dx === dx && d.dy === dy) {
          executeSelectedAction(key);
          return;
        }
      }
    }
  }
}

function executeSelectedAction(direction) {
  if (!game.selectedAction) return;

  // 奔跑第一步：仅本地记录方向，不消耗行动点，不转发
  if (game.selectedAction.type === 'run' && game.runFirstStepDir === null && !isGuestMode()) {
    doRun(direction); // 返回 false，仅记录方向
    return;
  }

  // 客机模式：转发给主机
  if (isGuestMode()) {
    // 奔跑两步合并转发
    if (game.selectedAction.type === 'run' && game.runFirstStepDir !== null) {
      netDoRunTwoSteps(game.runFirstStepDir, direction);
      game.runFirstStepDir = null;
      game.selectedAction = null;
      updateActionBar();
      renderBoard();
      return;
    }
    // 模仿声音：转发 soundType
    if (game.selectedAction.type === 'mimic') {
      netDoAction('mimic', direction, game.selectedAction.soundType);
      game.selectedAction = null;
      updateActionBar();
      return;
    }
    netDoAction(game.selectedAction.type, direction);
    game.selectedAction = null;
    updateActionBar();
    return;
  }

  let success = false;
  if (game.selectedAction.type === 'run') {
    success = doRun(direction);
  } else if (game.selectedAction.type === 'walk') {
    success = doWalk(direction);
  } else if (game.selectedAction.type === 'attack') {
    success = doAttack(direction);
  } else if (game.selectedAction.type === 'shoot') {
    success = doShoot(direction);
  } else if (game.selectedAction.type === 'mimic') {
    // 模仿声音：direction 是方向，soundType 存在 selectedAction.soundType
    success = doMimic(game.selectedAction.soundType, direction);
    // 模仿不消耗行动点，直接返回
    return;
  }

  if (success) {
    useAction();

    if (game.phase === 'gameOver') {
      showEndScreen();
      return;
    }

    // 主机模式：广播状态
    if (isHostMode()) broadcastGameState();
  }
}

function updateActionBar() {
  const bar = document.getElementById('action-bar');
  bar.innerHTML = '';

  if (game.phase === 'perception') {
    const hint = document.createElement('div');
    hint.className = 'action-hint';
    hint.style.fontSize = '16px';
    hint.style.color = '#e94560';
    hint.textContent = '感知阶段 - 请查看左侧感知信息';
    bar.appendChild(hint);

    // 联机模式下，只有当前轮到的玩家可以切换阶段
    if (isLocalMode() || isMyTurn()) {
      const btn = document.createElement('button');
      btn.className = 'action-btn primary';
      btn.textContent = '进入行动阶段';
      btn.addEventListener('click', () => {
        if (isGuestMode()) {
          // 客机：通知主机切换阶段
          Net.sendToHost({ type: 'enterAction' });
          return;
        }
        game.phase = 'action';
        game.actionCount = 2;
        if (shouldShowActionInfo(getCurrentPlayer())) {
          addActionLog(`${getCurrentPlayer().name} 进入行动阶段`, 'system');
        }
        updateAll();
        if (isHostMode()) broadcastGameState();
      });
      bar.appendChild(btn);
    } else {
      const waitHint = document.createElement('div');
      waitHint.style.fontSize = '13px';
      waitHint.style.color = '#8892b0';
      waitHint.textContent = '等待当前玩家行动...';
      bar.appendChild(waitHint);
    }
    return;
  }

  if (game.phase === 'ending') {
    const hint = document.createElement('div');
    hint.className = 'action-hint';
    hint.style.fontSize = '16px';
    hint.textContent = '结束阶段 - 选择面朝方向';
    bar.appendChild(hint);

    const pad = document.createElement('div');
    pad.className = 'direction-pad';
    
    const upBtn = document.createElement('button');
    upBtn.className = 'dir-up';
    upBtn.textContent = '↑北';
    upBtn.addEventListener('click', () => finishTurn('N'));
    pad.appendChild(upBtn);

    const leftBtn = document.createElement('button');
    leftBtn.className = 'dir-left';
    leftBtn.textContent = '←西';
    leftBtn.addEventListener('click', () => finishTurn('W'));
    pad.appendChild(leftBtn);

    const center = document.createElement('button');
    center.className = 'dir-center';
    center.textContent = '●';
    center.disabled = true;
    pad.appendChild(center);

    const rightBtn = document.createElement('button');
    rightBtn.className = 'dir-right';
    rightBtn.textContent = '东→';
    rightBtn.addEventListener('click', () => finishTurn('E'));
    pad.appendChild(rightBtn);

    const downBtn = document.createElement('button');
    downBtn.className = 'dir-down';
    downBtn.textContent = '↓南';
    downBtn.addEventListener('click', () => finishTurn('S'));
    pad.appendChild(downBtn);

    bar.appendChild(pad);
    return;
  }

  if (game.phase === 'action') {
    const canAct = canActLocal();
    const player = getCurrentPlayer();
    const skills = getCharacterSkills(player);

    // 联机模式下非自己的回合显示等待提示
    if (!canAct && !isLocalMode()) {
      const waitHint = document.createElement('div');
      waitHint.className = 'action-hint';
      waitHint.style.fontSize = '15px';
      waitHint.style.color = '#8892b0';
      waitHint.textContent = `等待 ${getCurrentPlayer().name} 行动...`;
      bar.appendChild(waitHint);
      return;
    }

    const runBtn = document.createElement('button');
    runBtn.className = `action-btn ${game.selectedAction?.type === 'run' ? 'primary' : ''}`;
    runBtn.innerHTML = '🏃 奔跑<br><small>移动2格·可转弯</small>';
    runBtn.disabled = game.actionCount <= 0;
    runBtn.addEventListener('click', () => selectAction('run'));
    bar.appendChild(runBtn);

    // 奔跑第一步已选：提示选择第二步 + 取消按钮
    if (game.selectedAction?.type === 'run' && game.runFirstStepDir !== null) {
      const hint = document.createElement('div');
      hint.className = 'action-hint';
      hint.style.fontSize = '13px';
      hint.style.color = '#ffc107';
      hint.textContent = `已选第一步（${DIRS[game.runFirstStepDir].name}），请选择第二步方向`;
      bar.appendChild(hint);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'action-btn';
      cancelBtn.innerHTML = '↩️ 取消奔跑';
      cancelBtn.addEventListener('click', () => {
        cancelRunFirstStep();
        selectAction('run'); // 取消选中
      });
      bar.appendChild(cancelBtn);
    }

    const walkBtn = document.createElement('button');
    walkBtn.className = `action-btn ${game.selectedAction?.type === 'walk' ? 'primary' : ''}`;
    walkBtn.innerHTML = '🚶 静步<br><small>移动1格</small>';
    walkBtn.disabled = game.actionCount <= 0 || skills.noWalk; // 沙寇无法静步
    if (skills.noWalk) {
      walkBtn.title = '沙寇无法静步';
    }
    walkBtn.addEventListener('click', () => selectAction('walk'));
    bar.appendChild(walkBtn);

    const attackBtn = document.createElement('button');
    attackBtn.className = `action-btn ${game.selectedAction?.type === 'attack' ? 'primary' : ''}`;
    const attackRange = skills.attackRange || 1;
    attackBtn.innerHTML = `⚔️ 攻击<br><small>${attackRange > 1 ? `距离${attackRange}格` : '相邻1格'}</small>`;
    attackBtn.disabled = game.actionCount <= 0;
    attackBtn.addEventListener('click', () => selectAction('attack'));
    bar.appendChild(attackBtn);

    // 吴明卒：开枪按钮（仅有子弹时显示）
    if (skills.canShoot && player.bullets > 0) {
      const shootBtn = document.createElement('button');
      shootBtn.className = `action-btn ${game.selectedAction?.type === 'shoot' ? 'primary' : ''}`;
      shootBtn.innerHTML = `🔫 开枪<br><small>直线首个敌人·剩${player.bullets}发</small>`;
      shootBtn.disabled = game.actionCount <= 0;
      shootBtn.addEventListener('click', () => selectAction('shoot'));
      bar.appendChild(shootBtn);
    }

    // “声带”：模仿声音按钮（每回合1次，不消耗行动点）
    if (skills.canMimic && player.mimicUsedThisTurn < 1) {
      const mimicBtn = document.createElement('button');
      mimicBtn.className = `action-btn ${game.selectedAction?.type === 'mimic' ? 'primary' : ''}`;
      mimicBtn.innerHTML = '🎭 模仿<br><small>不耗行动·每回合1次</small>';
      mimicBtn.addEventListener('click', () => selectMimicAction());
      bar.appendChild(mimicBtn);
    }

    const skipBtn = document.createElement('button');
    skipBtn.className = 'action-btn';
    skipBtn.innerHTML = '⏭️ 结束<br><small>剩余行动放弃</small>';
    skipBtn.disabled = game.actionCount >= 2;
    skipBtn.addEventListener('click', () => {
      game.actionCount = 0;
      enterEndingPhase();
      if (isHostMode()) broadcastGameState();
    });
    bar.appendChild(skipBtn);
  }
}

function selectAction(type) {
  if (game.actionCount <= 0) return;
  if (!canActLocal()) return;
  if (game.selectedAction?.type === type) {
    game.selectedAction = null;
    // 取消奔跑时清除第一步
    game.runFirstStepDir = null;
  } else {
    game.selectedAction = { type };
    game.runFirstStepDir = null;
  }
  updateActionBar();
  renderBoard();
}

// “声带”模仿声音：弹出声音选择
function selectMimicAction() {
  if (!canActLocal()) return;
  // 显示声音选择子菜单
  const bar = document.getElementById('action-bar');
  bar.innerHTML = '';

  const hint = document.createElement('div');
  hint.className = 'action-hint';
  hint.style.fontSize = '14px';
  hint.style.color = '#ffc107';
  hint.textContent = '选择要模仿的声音：';
  bar.appendChild(hint);

  const soundTypes = [
    { type: 'scream', label: '😱 惨叫', desc: '让其他玩家以为有人被淘汰' },
    { type: 'run', label: '🏃 奔跑声', desc: '制造奔跑声音假象' },
    { type: 'walk', label: '🚶 静步声', desc: '制造静步声音假象' },
    { type: 'gunshot', label: '🔫 枪响', desc: '制造开枪声音假象' },
  ];

  soundTypes.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.innerHTML = `${s.label}<br><small>${s.desc}</small>`;
    btn.addEventListener('click', () => {
      game.selectedAction = { type: 'mimic', soundType: s.type };
      // 显示方向选择提示
      const hint2 = document.createElement('div');
      hint2.className = 'action-hint';
      hint2.style.fontSize = '13px';
      hint2.style.color = '#ffc107';
      hint2.textContent = `已选${s.label}，请点击棋盘格子选择声音来源方向`;
      bar.innerHTML = '';
      bar.appendChild(hint2);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'action-btn';
      cancelBtn.innerHTML = '↩️ 取消';
      cancelBtn.addEventListener('click', () => {
        game.selectedAction = null;
        updateActionBar();
      });
      bar.appendChild(cancelBtn);
    });
    bar.appendChild(btn);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'action-btn';
  cancelBtn.innerHTML = '↩️ 取消';
  cancelBtn.addEventListener('click', () => {
    game.selectedAction = null;
    updateActionBar();
  });
  bar.appendChild(cancelBtn);
}

function finishTurn(direction) {
  if (isGuestMode()) {
    netEndTurn(direction);
    return;
  }
  endTurn(direction);
}

function updateStatusBar() {
  const bar = document.getElementById('player-status-bar');
  bar.innerHTML = '';

  for (const p of game.players) {
    const chip = document.createElement('div');
    const isJustDied = !p.alive && p._deathTime && (Date.now() - p._deathTime < 600);
    chip.className = `player-chip ${p.alive ? '' : 'dead'} ${isJustDied ? 'just-died' : ''}`;

    const dot = document.createElement('span');
    dot.className = 'color-dot';
    dot.style.background = p.color;
    chip.appendChild(dot);

    const name = document.createElement('span');
    // 显示角色图标
    const iconPrefix = p.characterIcon ? `${p.characterIcon} ` : '';
    name.textContent = iconPrefix + p.name;
    chip.appendChild(name);

    // 吴明卒：显示剩余子弹
    if (p.alive && p.characterId === 'hoodlum' && p.bullets > 0) {
      const bulletInfo = document.createElement('span');
      bulletInfo.style.cssText = 'font-size:11px; color:#ffc107; margin-left:6px;';
      bulletInfo.textContent = `🔫×${p.bullets}`;
      chip.appendChild(bulletInfo);
    }

    // 乔：显示假死/警惕状态
    if (p.alive && p.characterId === 'dog') {
      if (p.fakeDeath) {
        const status = document.createElement('span');
        status.style.cssText = 'font-size:11px; color:#888; margin-left:6px;';
        status.textContent = '假死';
        chip.appendChild(status);
      } else if (p.vigilance) {
        const status = document.createElement('span');
        status.style.cssText = 'font-size:11px; color:#4caf50; margin-left:6px;';
        status.textContent = `警惕(${p.wakeCount}/3)`;
        chip.appendChild(status);
      }
    }

    // 沙寇：显示兴奋状态
    if (p.alive && p.characterId === 'maniac' && p.screamHeard) {
      const status = document.createElement('span');
      status.style.cssText = 'font-size:11px; color:#ff5722; margin-left:6px;';
      status.textContent = '兴奋';
      chip.appendChild(status);
    }

    if (p.alive && p.id === game.currentPlayerIdx) {
      chip.style.border = `2px solid ${p.color}`;
    }

    bar.appendChild(chip);
  }
}

function updateTurnInfo() {
  const player = getCurrentPlayer();
  const iconPrefix = player.characterIcon ? `${player.characterIcon} ` : '';
  document.getElementById('current-player-label').textContent = iconPrefix + player.name;
  document.getElementById('current-player-label').style.color = player.color;

  const phaseNames = {
    perception: '感知阶段',
    action: '行动阶段',
    ending: '结束阶段',
    gameOver: '游戏结束',
  };
  document.getElementById('turn-phase').textContent = phaseNames[game.phase] || '';
  document.getElementById('actions-left').textContent = `剩余行动: ${game.actionCount}`;
}

function showTurnMask() {
  const player = getCurrentPlayer();

  // 联机模式：不显示遮罩，直接处理
  if (!isLocalMode()) {
    if (isHostMode()) {
      handleHostTurnStart();
    }
    // 客机模式：等待主机发送状态
    return;
  }

  const mask = document.getElementById('turn-mask');
  const text = document.getElementById('turn-mask-text');
  const iconPrefix = player.characterIcon ? `${player.characterIcon} ` : '';
  const charSuffix = player.characterName ? `（${player.characterName}）` : '';
  text.textContent = `请将设备交给 ${iconPrefix}${player.name}${charSuffix}`;
  mask.classList.remove('hidden');
  clearPerceptionLog();
  document.getElementById('action-log').innerHTML = '';
}

/**
 * 主机：处理回合开始
 */
function handleHostTurnStart() {
  const player = getCurrentPlayer();

  if (player.isAI && player.alive) {
    // AI回合：执行感知阶段后进入行动
    if (game.phase === 'perception') {
      const messages = startPerceptionPhase();
      game.pendingMessages[player.id] = messages;
      broadcastGameState();
      setTimeout(() => {
        game.phase = 'action';
        game.actionCount = 2;
        game.selectedAction = null;
        if (shouldShowActionInfo(player)) {
          addActionLog(`${player.name} 进入行动阶段`, 'system');
        }
        updateAll();
        broadcastGameState();
        setTimeout(executeAITurn, 600);
      }, 1200);
    } else if (game.phase === 'action') {
      setTimeout(executeAITurn, 800);
    }
  } else {
    // 人类玩家回合
    if (game.phase === 'perception') {
      const messages = startPerceptionPhase();
      game.pendingMessages[player.id] = messages;

      if (player.id === 0) {
        // 主机自己：直接显示
        showPerceptionMessages(messages);
        if (shouldShowActionInfo(player)) {
          addActionLog(`${player.name} 进入感知阶段`, 'system');
        }
        updateAll();
      } else {
        // 客机：发送感知信息
        Net.sendToPlayer(player.id, {
          type: 'perception',
          messages: messages,
          playerIdx: player.id
        });
        // 广播公开状态（阶段信息等）
        broadcastGameState();
      }
    } else {
      broadcastGameState();
    }
  }
}

function onTurnMaskConfirm() {
  document.getElementById('turn-mask').classList.add('hidden');

  const player = getCurrentPlayer();

  if (game.phase === 'perception') {
    const messages = startPerceptionPhase();
    game.pendingMessages[player.id] = messages;
    showPerceptionMessages(messages);
    if (shouldShowActionInfo(player)) {
      addActionLog(`${player.name} 进入感知阶段`, 'system');
    }
  } else {
    clearPerceptionLog();
  }

  updateAll();

  if (player.isAI && player.alive) {
    if (game.phase === 'perception') {
      setTimeout(() => {
        game.phase = 'action';
        game.actionCount = 2;
        game.selectedAction = null;
        if (shouldShowActionInfo(player)) {
          addActionLog(`${player.name} 进入行动阶段`, 'system');
        }
        updateAll();
        setTimeout(executeAITurn, 600);
      }, 1200);
    } else if (game.phase === 'action') {
      setTimeout(executeAITurn, 800);
    }
  }
}

function showEndScreen() {
  document.getElementById('game-screen').classList.add('hidden');
  const endScreen = document.getElementById('end-screen');
  endScreen.classList.remove('hidden');
  endScreen.classList.remove('victory-flash');
  // 触发重排以重启动画
  void endScreen.offsetWidth;
  endScreen.classList.add('victory-flash');
  const winner = game.winner;
  const iconPrefix = winner?.characterIcon ? `${winner.characterIcon} ` : '';
  const charSuffix = winner?.characterName ? `（${winner.characterName}）` : '';
  document.getElementById('winner-text').innerHTML =
    `<span class="winner-name">${iconPrefix}${winner?.name || '无'}${charSuffix}</span> 获胜！`;
}

function setupPlayerCountSelector() {
  const buttons = document.querySelectorAll('.count-btn');
  let count = 4;
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      count = parseInt(btn.dataset.count);
      renderPlayerNameInputs(count);
      updateAIOptions(count);
    });
  });
  
  renderPlayerNameInputs(count);
}

function renderPlayerNameInputs(count) {
  const container = document.getElementById('player-names-list');
  container.innerHTML = '';

  const aiCount = getAICount();
  const humanCount = count - aiCount;

  // 追踪已选角色，避免重复
  const usedCharacters = new Set();

  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'name-input-wrapper';

    const row = document.createElement('div');
    row.className = 'name-input-row';

    const dot = document.createElement('span');
    dot.className = 'color-dot';
    dot.style.background = PLAYER_COLORS[i];
    row.appendChild(dot);

    const input = document.createElement('input');
    input.type = 'text';
    const isAI = i >= humanCount;
    if (isAI) {
      input.value = `电脑${PLAYER_NAMES_CN[i - humanCount]}`;
      input.disabled = true;
      input.style.opacity = '0.6';
    } else {
      input.value = `玩家${PLAYER_NAMES_CN[i]}`;
    }
    input.dataset.idx = i;
    input.maxLength = 10;
    row.appendChild(input);

    // 角色选择下拉框（仅在启用特殊角色时显示）
    if (isSpecialCharsEnabled()) {
      const charSelect = document.createElement('select');
      charSelect.className = 'char-select';
      charSelect.dataset.idx = i;

      // 默认选项
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '随机角色';
      charSelect.appendChild(defaultOpt);

      // 角色列表
      CHARACTERS.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.icon} ${c.title}—${c.name}`;
        charSelect.appendChild(opt);
      });

      // AI玩家默认随机
      if (isAI) {
        charSelect.disabled = true;
        charSelect.style.opacity = '0.6';
      } else {
        // 人类玩家选择角色时更新可用选项 + 显示角色详情
        charSelect.addEventListener('change', () => {
          updateCharacterOptions();
          showCharacterInfo(i, charSelect.value);
        });
      }
      charSelect.dataset.idx = i;
      row.appendChild(charSelect);
    }

    wrapper.appendChild(row);

    // 角色详情面板（选择角色后显示背景故事和技能）
    if (isSpecialCharsEnabled()) {
      const infoPanel = document.createElement('div');
      infoPanel.className = 'char-info-panel';
      infoPanel.id = `char-info-${i}`;
      wrapper.appendChild(infoPanel);
    }

    container.appendChild(wrapper);
  }
}

/**
 * 显示选中角色的背景故事和技能详情
 */
function showCharacterInfo(playerIdx, charId) {
  const panel = document.getElementById(`char-info-${playerIdx}`);
  if (!panel) return;

  if (!charId) {
    panel.innerHTML = '';
    panel.classList.remove('active');
    return;
  }

  const char = CHARACTERS.find(c => c.id === charId);
  if (!char) {
    panel.innerHTML = '';
    panel.classList.remove('active');
    return;
  }

  panel.classList.add('active');
  panel.innerHTML = `
    <div class="char-info-header">
      <span class="char-info-icon">${char.icon}</span>
      <div class="char-info-title">
        <span class="char-info-name">${char.title}—${char.name}</span>
      </div>
    </div>
    <div class="char-info-background">
      <span class="char-info-label">📖 背景故事</span>
      <p>${char.background}</p>
    </div>
    <div class="char-info-skill">
      <span class="char-info-label">⚡ 技能：${char.skillName}</span>
      <p>${char.skillDesc}</p>
    </div>
  `;
}

/**
 * 更新角色选择选项，避免人类玩家选择重复角色
 */
function updateCharacterOptions() {
  const selects = document.querySelectorAll('#player-names-list .char-select');
  const selected = {};
  selects.forEach(s => {
    if (s.value && !s.disabled) {
      selected[s.dataset.idx] = s.value;
    }
  });

  selects.forEach(s => {
    if (s.disabled) return;
    const currentVal = s.value;
    Array.from(s.options).forEach(opt => {
      if (!opt.value) return; // 跳过"随机角色"
      const isSelectedByOther = Object.values(selected).includes(opt.value) && selected[s.dataset.idx] !== opt.value;
      opt.disabled = isSelectedByOther;
      opt.style.color = isSelectedByOther ? '#555' : '';
    });
  });
}

/**
 * 获取已选择的角色ID列表
 */
function getSelectedCharacters() {
  const selects = document.querySelectorAll('#player-names-list .char-select');
  const characterIds = [];
  selects.forEach(s => {
    characterIds.push(s.value || null);
  });
  return characterIds;
}

function getPlayerNames() {
  const inputs = document.querySelectorAll('#player-names-list input');
  const names = [];
  inputs.forEach(inp => {
    names.push(inp.value.trim() || `玩家${PLAYER_NAMES_CN[inp.dataset.idx]}`);
  });
  return names;
}

function getAICount() {
  const select = document.getElementById('ai-count-select');
  return select ? parseInt(select.value) : 0;
}

// 是否启用特殊角色（本地）
function isSpecialCharsEnabled() {
  return document.getElementById('special-chars-enabled')?.checked || false;
}

// 是否启用特殊角色（联机大厅）
function isLobbySpecialCharsEnabled() {
  return document.getElementById('lobby-special-chars-enabled')?.checked || false;
}

// 读取火圈配置（本地设置界面）
function getFireCircleConfig() {
  const enabled = document.getElementById('fire-enabled')?.checked || false;
  const cycle = parseInt(document.getElementById('fire-cycle-select')?.value || 5);
  return { enabled, cycle };
}

// 读取联机大厅火圈配置（主机）
function getLobbyFireCircleConfig() {
  const enabled = document.getElementById('lobby-fire-enabled')?.checked || false;
  const cycle = parseInt(document.getElementById('lobby-fire-cycle')?.value || 5);
  return { enabled, cycle };
}

// 读取地形数量配置（本地设置界面）
function getTerrainCounts() {
  return {
    water: parseInt(document.getElementById('water-count')?.value || 10),
    puddle: parseInt(document.getElementById('puddle-count')?.value || 10),
    pillar: parseInt(document.getElementById('pillar-count')?.value || 5)
  };
}

// 读取联机大厅地形数量配置（主机）
function getLobbyTerrainCounts() {
  return {
    water: parseInt(document.getElementById('lobby-water-count')?.value || 10),
    puddle: parseInt(document.getElementById('lobby-puddle-count')?.value || 10),
    pillar: parseInt(document.getElementById('lobby-pillar-count')?.value || 5)
  };
}

function startGame() {
  const names = getPlayerNames();
  const aiCount = getAICount();
  const characterIds = getSelectedCharacters();
  const fireCircleConfig = getFireCircleConfig();
  const enableSpecialChars = isSpecialCharsEnabled();
  const terrainCounts = getTerrainCounts();
  initGame(names, aiCount, characterIds, fireCircleConfig, enableSpecialChars, terrainCounts);

  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');

  updateAll();

  const firstPlayer = getCurrentPlayer();
  if (firstPlayer.isAI) {
    setTimeout(executeAITurn, 1000);
  }
}

function restartGame() {
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
  game.phase = 'setup';
  game.gameMode = 'local';
  Net.disconnect();
}

/* ===== 联机模块 ===== */

function isLocalMode() { return game.gameMode === 'local'; }
function isHostMode() { return game.gameMode === 'online-host'; }
function isGuestMode() { return game.gameMode === 'online-guest'; }

function isMyTurn() {
  if (isLocalMode()) return true;
  return game.currentPlayerIdx === game.myPlayerIdx;
}

/**
 * 判断某玩家的行动信息（日志/音效/图标）是否对当前观察者可见
 * - 本地模式：当前操作者是人类时可见（AI回合隐藏）
 * - 联机模式：只有自己的行动可见
 */
function shouldShowActionInfo(player) {
  if (isLocalMode()) return !player.isAI;
  return player.id === game.myPlayerIdx;
}

/**
 * 判断某玩家的位置是否对当前观察者可见（用于棋盘渲染）
 * - 本地模式：当前回合玩家可见（AI回合隐藏）
 * - 联机模式：只有自己可见
 */
function shouldShowPlayerPosition(player) {
  if (isLocalMode()) return player.id === game.currentPlayerIdx && !player.isAI;
  return player.id === game.myPlayerIdx;
}

function canActLocal() {
  if (isLocalMode()) return true;
  if (isGuestMode()) return isMyTurn() && game.phase !== 'perception';
  if (isHostMode()) return isMyTurn() && game.phase !== 'perception';
  return false;
}

/**
 * 获取公开状态（广播用）
 * 为每个客机隐藏其他玩家的位置和朝向
 */
function getPublicState() {
  return {
    players: game.players.map(p => ({
      id: p.id, name: p.name, color: p.color,
      x: p.x, y: p.y, facing: p.facing,
      alive: p.alive, isAI: p.isAI,
      characterId: p.characterId,
      characterName: p.characterName,
      characterIcon: p.characterIcon,
      // 新角色状态字段同步
      bullets: p.bullets || 0,
      fakeDeath: p.fakeDeath || false,
      skipNextTurn: p.skipNextTurn || false,
      wakeCount: p.wakeCount || 0,
      vigilance: p.vigilance || false,
      screamHeard: p.screamHeard || false,
      mimicUsedThisTurn: p.mimicUsedThisTurn || 0,
      _survivalUsed: p._survivalUsed || false,
    })),
    currentPlayerIdx: game.currentPlayerIdx,
    phase: game.phase,
    actionCount: game.actionCount,
    roundCount: game.roundCount,
    winner: game.winner ? game.winner.id : null,
    fireCircle: { ...game.fireCircle },
    terrains: { ...game.terrains },
  };
}

/**
 * 主机：广播游戏状态
 */
function broadcastGameState() {
  if (!isHostMode()) return;
  Net.broadcast({ type: 'state', state: getPublicState() });
}

/**
 * 客机：应用远程状态
 * 隐藏除自己外其他玩家的真实位置和朝向
 */
function applyRemoteState(state) {
  game.players = state.players.map(p => {
    const isMe = p.id === game.myPlayerIdx;
    return {
      id: p.id, name: p.name, color: p.color,
      // 只有自己可见真实位置，其他人隐藏
      x: isMe ? p.x : -1,
      y: isMe ? p.y : -1,
      facing: isMe ? p.facing : 'N',
      alive: p.alive, isAI: p.isAI,
      characterId: p.characterId,
      characterName: p.characterName,
      characterIcon: p.characterIcon,
      freeHitUsed: 0,
      // 新角色状态字段
      bullets: p.bullets || 0,
      fakeDeath: p.fakeDeath || false,
      skipNextTurn: p.skipNextTurn || false,
      wakeCount: p.wakeCount || 0,
      vigilance: p.vigilance || false,
      screamHeard: p.screamHeard || false,
      mimicUsedThisTurn: p.mimicUsedThisTurn || 0,
      _survivalUsed: p._survivalUsed || false,
      aiKnowledge: { suspectedTargets: [] }
    };
  });
  game.currentPlayerIdx = state.currentPlayerIdx;
  game.phase = state.phase;
  game.actionCount = state.actionCount;
  game.roundCount = state.roundCount;
  game.winner = state.winner !== null ? game.players.find(p => p.id === state.winner) : null;
  // 同步火圈状态
  if (state.fireCircle) {
    game.fireCircle = { ...state.fireCircle };
  }
  // 同步地形（水坑/水洼/石柱）
  if (state.terrains) {
    game.terrains = { ...state.terrains };
  }
  // myPlayerIdx 不从 state 读取，客机保留自己的身份
  game.selectedAction = null;
  game.runFirstStepDir = null;

  updateAll();

  if (game.phase === 'gameOver') {
    showEndScreen();
  }
}

/**
 * 主机：向客机定向发送感知信息
 */
function sendPerceptionToGuests() {
  if (!isHostMode()) return;
  for (const player of game.players) {
    if (player.isAI || !player.alive) continue;
    if (player.id === 0) continue; // 主机自己不需要发送
    const msgs = game.pendingMessages[player.id] || [];
    if (msgs.length > 0) {
      Net.sendToPlayer(player.id, {
        type: 'perception',
        messages: msgs,
        playerIdx: player.id
      });
    }
  }
}

/**
 * 主机：处理客机消息
 */
function handleHostMessage(data, peerId) {
  if (data.type === 'action') {
    if (game.phase !== 'action') return;
    const guest = Object.values(Net.guests).find(g => g.peerId === peerId);
    if (!guest || guest.playerIdx !== game.currentPlayerIdx) return;

    let success = false;
    if (data.action === 'run') success = doRun(data.direction);
    else if (data.action === 'walk') success = doWalk(data.direction);
    else if (data.action === 'attack') success = doAttack(data.direction);
    else if (data.action === 'shoot') success = doShoot(data.direction);
    else if (data.action === 'mimic') {
      success = doMimic(data.soundType, data.direction);
      // 模仿不消耗行动点，直接广播
      if (isHostMode()) broadcastGameState();
      return;
    }

    if (success) {
      useAction();

      if (game.phase === 'gameOver') {
        if (isHostMode()) broadcastGameState();
        showEndScreen();
        return;
      }

      if (isHostMode()) broadcastGameState();
    }

  } else if (data.type === 'runTwoSteps') {
    // 客机转发的两步奔跑
    if (game.phase !== 'action') return;
    const guest = Object.values(Net.guests).find(g => g.peerId === peerId);
    if (!guest || guest.playerIdx !== game.currentPlayerIdx) return;

    game.runFirstStepDir = null;
    // 第一步
    doRun(data.firstDir);
    // 第二步
    const success = doRun(data.secondDir);

    if (success) {
      useAction();
      if (game.phase === 'gameOver') {
        if (isHostMode()) broadcastGameState();
        showEndScreen();
        return;
      }
      if (isHostMode()) broadcastGameState();
    }

  } else if (data.type === 'endTurn') {
    if (game.phase !== 'ending') return;
    const guest = Object.values(Net.guests).find(g => g.peerId === peerId);
    if (!guest || guest.playerIdx !== game.currentPlayerIdx) return;

    endTurn(data.facing);
  } else if (data.type === 'enterAction') {
    // 客机请求从感知阶段进入行动阶段
    if (game.phase !== 'perception') return;
    const guest = Object.values(Net.guests).find(g => g.peerId === peerId);
    if (!guest || guest.playerIdx !== game.currentPlayerIdx) return;

    game.phase = 'action';
    game.actionCount = 2;
    game.selectedAction = null;
    if (shouldShowActionInfo(getCurrentPlayer())) {
      addActionLog(`${getCurrentPlayer().name} 进入行动阶段`, 'system');
    }
    updateAll();
    broadcastGameState();
  }
}

/**
 * 客机：处理主机消息
 */
function handleGuestMessage(data) {
  if (data.type === 'state') {
    applyRemoteState(data.state);
  } else if (data.type === 'perception') {
    if (data.playerIdx === game.myPlayerIdx) {
      game.pendingMessages[game.myPlayerIdx] = data.messages;
      showPerceptionMessages(data.messages);
    }
  } else if (data.type === 'assign') {
    game.myPlayerIdx = data.playerIdx;
  } else if (data.type === 'lobby') {
    updateWaitingPlayerList(data.players);
  } else if (data.type === 'gameStart') {
    game.myPlayerIdx = data.myPlayerIdx;
    game.gameMode = 'online-guest';
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
  }
}

/**
 * 联机模式下的行动封装（客机用）
 */
function netDoAction(action, direction, soundType) {
  if (isGuestMode()) {
    Net.sendToHost({ type: 'action', action, direction, soundType });
  }
}

// 客机转发两步奔跑
function netDoRunTwoSteps(firstDir, secondDir) {
  if (isGuestMode()) {
    Net.sendToHost({ type: 'runTwoSteps', firstDir, secondDir });
  }
}

function netEndTurn(facing) {
  if (isGuestMode()) {
    Net.sendToHost({ type: 'endTurn', facing });
  }
}

/* ===== 联机UI ===== */

function showOnlineError(msg) {
  const el = document.getElementById('online-error');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

function hideOnlineError() {
  const el = document.getElementById('online-error');
  if (el) el.classList.add('hidden');
}

function switchSetupMode(mode) {
  const localSetup = document.getElementById('local-setup');
  const onlineSetup = document.getElementById('online-setup');
  if (mode === 'local') {
    localSetup.classList.remove('hidden');
    onlineSetup.classList.add('hidden');
  } else {
    localSetup.classList.add('hidden');
    onlineSetup.classList.remove('hidden');
  }
}

function renderLobbyPlayerList() {
  const list = document.getElementById('lobby-player-list');
  if (!list) return;
  list.innerHTML = '';

  const totalSlots = parseInt(document.querySelector('#lobby-player-count .count-btn.active')?.dataset.count || 4);
  const aiCount = parseInt(document.getElementById('lobby-ai-count').value || 0);
  const humanSlots = totalSlots - aiCount;

  // 主机
  const hostName = document.getElementById('online-name-input')?.value || '主机';
  const hostItem = createLobbyPlayerItem(hostName, PLAYER_COLORS[0], '主机', true);
  list.appendChild(hostItem);

  // 客机
  const guests = Object.values(Net.guests);
  guests.forEach((g, i) => {
    const item = createLobbyPlayerItem(g.name, PLAYER_COLORS[i + 1], '', false);
    list.appendChild(item);
  });

  // 空位
  const filledHumans = 1 + guests.length;
  for (let i = filledHumans; i < humanSlots; i++) {
    const empty = document.createElement('div');
    empty.className = 'lobby-player-item';
    empty.style.opacity = '0.4';
    empty.innerHTML = `<span class="player-color" style="background:#333"></span><span>等待加入...</span>`;
    list.appendChild(empty);
  }

  // AI
  for (let i = 0; i < aiCount; i++) {
    const item = createLobbyPlayerItem(`电脑${PLAYER_NAMES_CN[i]}`, PLAYER_COLORS[humanSlots + i], 'AI', false);
    list.appendChild(item);
  }
}

function createLobbyPlayerItem(name, color, tag, isHost) {
  const div = document.createElement('div');
  div.className = 'lobby-player-item';
  let tagHtml = '';
  if (tag) {
    tagHtml = `<span class="player-tag ${isHost ? 'host-tag' : ''}">${tag}</span>`;
  }
  div.innerHTML = `<span class="player-color" style="background:${color}"></span><span>${name}</span>${tagHtml}`;
  return div;
}

function updateWaitingPlayerList(players) {
  const list = document.getElementById('waiting-player-list');
  if (!list) return;
  list.innerHTML = '';
  for (const p of players) {
    const item = createLobbyPlayerItem(p.name, p.color, p.tag, p.isHost);
    list.appendChild(item);
  }
}

function createRoom() {
  const name = document.getElementById('online-name-input').value.trim() || '主机';
  hideOnlineError();

  Net.onConnected = () => {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('lobby-room-code').textContent = Net.roomCode;
    renderLobbyPlayerList();
  };

  Net.onGuestJoined = (guest) => {
    console.log('客机加入: ' + guest.name);
    renderLobbyPlayerList();
    // 向客机发送大厅玩家列表
    broadcastLobbyPlayerList();
  };

  Net.onGuestLeft = (guest) => {
    console.log('客机离开: ' + guest.name);
    renderLobbyPlayerList();
    broadcastLobbyPlayerList();
  };

  Net.onMessage = (data, peerId) => {
    handleHostMessage(data, peerId);
  };

  Net.onError = (msg) => {
    showOnlineError(msg);
  };

  Net.hostRoom();
}

/**
 * 广播大厅玩家列表给客机
 */
function broadcastLobbyPlayerList() {
  if (!isHostMode()) return;
  const totalSlots = parseInt(document.querySelector('#lobby-player-count .count-btn.active')?.dataset.count || 4);
  const aiCount = parseInt(document.getElementById('lobby-ai-count').value || 0);
  const humanSlots = totalSlots - aiCount;

  const players = [];
  const hostName = document.getElementById('online-name-input')?.value || '主机';
  players.push({ name: hostName, color: PLAYER_COLORS[0], tag: '主机', isHost: true });

  const guests = Object.values(Net.guests);
  guests.forEach((g, i) => {
    players.push({ name: g.name, color: PLAYER_COLORS[i + 1], tag: '', isHost: false });
  });

  for (let i = 1 + guests.length; i < humanSlots; i++) {
    players.push({ name: '等待加入...', color: '#333', tag: '', isHost: false });
  }

  for (let i = 0; i < aiCount; i++) {
    players.push({ name: `电脑${PLAYER_NAMES_CN[i]}`, color: PLAYER_COLORS[humanSlots + i], tag: 'AI', isHost: false });
  }

  Net.broadcast({ type: 'lobby', players: players });
}

function joinRoom() {
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  const name = document.getElementById('online-name-input').value.trim() || '玩家';
  if (code.length !== 6) {
    showOnlineError('请输入6位房间号');
    return;
  }
  hideOnlineError();

  Net.onConnected = () => {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('waiting-room-code').textContent = '房间: ' + code;
  };

  Net.onMessage = (data) => {
    handleGuestMessage(data);
  };

  Net.onError = (msg) => {
    showOnlineError(msg);
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
  };

  Net.joinRoom(code, name);
}

function leaveRoom() {
  Net.disconnect();
  document.getElementById('waiting-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
  game.gameMode = 'local';
}

function startOnlineGame() {
  if (!isHostMode()) return;

  const totalPlayers = parseInt(document.querySelector('#lobby-player-count .count-btn.active')?.dataset.count || 4);
  const aiCount = parseInt(document.getElementById('lobby-ai-count').value || 0);
  const guests = Object.values(Net.guests);
  const humanCount = totalPlayers - aiCount;

  if (guests.length + 1 < humanCount) {
    showOnlineError('还有空位未填满，请减少玩家人数或增加AI');
    return;
  }

  // 构建玩家名称
  const names = [];
  const hostName = document.getElementById('online-name-input').value.trim() || '主机';
  names.push(hostName);

  // 分配玩家索引给客机
  guests.forEach((g, i) => {
    names.push(g.name);
    Net.assignPlayerIdx(g.peerId, i + 1);
  });

  // AI玩家
  for (let i = 0; i < aiCount; i++) {
    names.push(`电脑${PLAYER_NAMES_CN[i]}`);
  }

  // 初始化游戏
  game.gameMode = 'online-host';
  game.myPlayerIdx = 0;
  // 联机模式下根据主机设置决定是否启用特殊角色（启用时随机分配）
  const fireCircleConfig = getLobbyFireCircleConfig();
  const enableSpecialChars = isLobbySpecialCharsEnabled();
  const terrainCounts = getLobbyTerrainCounts();
  initGame(names, aiCount, null, fireCircleConfig, enableSpecialChars, terrainCounts);

  // 通知客机游戏开始
  Net.broadcast({ type: 'gameStart', myPlayerIdx: -1 });
  guests.forEach((g) => {
    Net.sendTo(g.peerId, { type: 'gameStart', myPlayerIdx: g.playerIdx });
  });

  // 切换到游戏界面
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  updateAll();

  // 广播初始状态
  broadcastGameState();

  // 处理感知阶段
  if (game.phase === 'perception') {
    handleOnlinePerception();
  }

  // 如果第一个玩家是AI
  const firstPlayer = getCurrentPlayer();
  if (firstPlayer.isAI) {
    setTimeout(executeAITurn, 1000);
  }
}

/**
 * 处理联机感知阶段
 */
function handleOnlinePerception() {
  if (isLocalMode()) return;

  const player = getCurrentPlayer();

  if (isHostMode()) {
    // 主机：执行感知逻辑，发送给客机
    const messages = startPerceptionPhase();
    game.pendingMessages[player.id] = messages;

    if (player.isAI || player.id === 0) {
      // 主机自己或AI：直接处理
      if (player.id === 0 && !player.isAI) {
        showPerceptionMessages(messages);
      }
    } else {
      // 客机：发送感知信息
      Net.sendToPlayer(player.id, {
        type: 'perception',
        messages: messages,
        playerIdx: player.id
      });
    }
  }
  // 客机的感知信息由主机发送，客机收到后在handleGuestMessage中处理
}

document.addEventListener('DOMContentLoaded', () => {
  setupPlayerCountSelector();

  // 特殊角色开关切换时重新渲染玩家名称输入区
  const specialCharsToggle = document.getElementById('special-chars-enabled');
  if (specialCharsToggle) {
    specialCharsToggle.addEventListener('change', () => {
      const activeBtn = document.querySelector('#local-setup .player-count-selector .count-btn.active');
      const count = parseInt(activeBtn?.dataset.count || 4);
      renderPlayerNameInputs(count);
    });
  }

  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('turn-mask-btn').addEventListener('click', onTurnMaskConfirm);
  document.getElementById('restart-btn').addEventListener('click', restartGame);

  // 模式切换
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchSetupMode(btn.dataset.mode);
    });
  });

  // 联机
  document.getElementById('create-room-btn').addEventListener('click', () => {
    game.gameMode = 'online-host';
    createRoom();
  });
  document.getElementById('join-room-btn').addEventListener('click', () => {
    game.gameMode = 'online-guest';
    joinRoom();
  });
  document.getElementById('lobby-start-btn').addEventListener('click', startOnlineGame);
  document.getElementById('lobby-back-btn').addEventListener('click', () => {
    Net.disconnect();
    game.gameMode = 'local';
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
  });
  document.getElementById('waiting-back-btn').addEventListener('click', leaveRoom);
  document.getElementById('copy-code-btn').addEventListener('click', () => {
    const code = document.getElementById('lobby-room-code').textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
  });

  // 大厅玩家数量选择
  document.querySelectorAll('#lobby-player-count .count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#lobby-player-count .count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLobbyPlayerList();
    });
  });
  document.getElementById('lobby-ai-count').addEventListener('change', renderLobbyPlayerList);

  // 规则按钮
  document.getElementById('rules-btn').addEventListener('click', () => {
    document.getElementById('rules-modal').classList.remove('hidden');
  });
  const rulesBtnOnline = document.getElementById('rules-btn-online');
  if (rulesBtnOnline) {
    rulesBtnOnline.addEventListener('click', () => {
      document.getElementById('rules-modal').classList.remove('hidden');
    });
  }
  const rulesBtnGame = document.getElementById('rules-btn-game');
  if (rulesBtnGame) {
    rulesBtnGame.addEventListener('click', () => {
      document.getElementById('rules-modal').classList.remove('hidden');
    });
  }
  document.getElementById('rules-close-btn').addEventListener('click', () => {
    document.getElementById('rules-modal').classList.add('hidden');
  });

  document.getElementById('rules-modal').addEventListener('click', (e) => {
    if (e.target.id === 'rules-modal') {
      document.getElementById('rules-modal').classList.add('hidden');
    }
  });

  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const enabled = SoundSystem.toggle();
      soundBtn.textContent = enabled ? '🔊' : '🔇';
      if (enabled) SoundSystem.play('click');
    });
  }

  const aiSelect = document.getElementById('ai-count-select');
  if (aiSelect) {
    aiSelect.addEventListener('change', () => {
      const totalCount = document.querySelectorAll('.count-btn.active')[0]?.dataset.count || 4;
      updateAIOptions(parseInt(totalCount));
      renderPlayerNameInputs(parseInt(totalCount));
    });
  }
  updateAIOptions(4);

  // 设置面板折叠/展开
  document.querySelectorAll('.settings-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const panel = target ? document.getElementById(target) : null;
      if (!panel) return;
      const wrapper = panel.closest('.settings-panel');
      if (wrapper) {
        wrapper.classList.toggle('open');
        SoundSystem.play('click');
      }
    });
  });

  document.addEventListener('keydown', handleKeyboard);
});

function handleKeyboard(e) {
  if (game.phase === 'setup' || game.phase === 'gameOver') return;
  if (getCurrentPlayer()?.isAI) return;

  const key = e.key.toLowerCase();

  // M 键：清除所有标记（全局可用）
  if (key === 'm' && canMarkLocal()) {
    const player = getCurrentPlayer();
    if (player.marks.size > 0) {
      player.marks.clear();
      SoundSystem.play('click');
      renderBoard();
    }
    return;
  }

  if (game.phase === 'perception') {
    // 联机模式下客机不自行切换阶段
    if (isGuestMode()) return;
    if (isHostMode() && !isMyTurn()) return;

    if (key === 'enter' || key === ' ') {
      e.preventDefault();
      game.phase = 'action';
      game.actionCount = 2;
      game.selectedAction = null;
      if (shouldShowActionInfo(getCurrentPlayer())) {
        addActionLog(`${getCurrentPlayer().name} 进入行动阶段`, 'system');
      }
      updateAll();
      if (isHostMode()) broadcastGameState();
    }
    return;
  }

  if (!canActLocal()) return;

  if (game.phase === 'action') {
    if (key === '1') { selectAction('run'); return; }
    else if (key === '2') { selectAction('walk'); return; }
    else if (key === '3') { selectAction('attack'); return; }
    else if (key === '4') { selectAction('shoot'); return; }       // 吴明卒开枪
    else if (key === '5') { selectMimicAction(); return; }         // 声带模仿
    
    if (game.selectedAction) {
      let dir = null;
      if (key === 'w' || key === 'arrowup') { dir = 'N'; e.preventDefault(); }
      else if (key === 's' || key === 'arrowdown') { dir = 'S'; e.preventDefault(); }
      else if (key === 'a' || key === 'arrowleft') { dir = 'W'; e.preventDefault(); }
      else if (key === 'd' || key === 'arrowright') { dir = 'E'; e.preventDefault(); }
      
      if (dir) {
        executeSelectedAction(dir);
        return;
      }
      
      if (key === 'escape') {
        game.selectedAction = null;
        updateActionBar();
        renderBoard();
      }
    }
  }
  
  if (game.phase === 'ending') {
    let dir = null;
    if (key === 'w' || key === 'arrowup') { dir = 'N'; e.preventDefault(); }
    else if (key === 's' || key === 'arrowdown') { dir = 'S'; e.preventDefault(); }
    else if (key === 'a' || key === 'arrowleft') { dir = 'W'; e.preventDefault(); }
    else if (key === 'd' || key === 'arrowright') { dir = 'E'; e.preventDefault(); }
    
    if (dir) {
      finishTurn(dir);
    }
  }
}

function updateAIOptions(totalCount) {
  const select = document.getElementById('ai-count-select');
  if (!select) return;
  const currentVal = parseInt(select.value);
  select.innerHTML = '';
  for (let i = 0; i < totalCount; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    if (i === 0) opt.textContent = '0 人（纯本地多人）';
    else opt.textContent = `${i} 个电脑`;
    select.appendChild(opt);
  }
  const defaultAI = Math.min(2, totalCount - 1);
  select.value = Math.min(currentVal, totalCount - 1) >= 0 ? Math.min(currentVal, totalCount - 1) : defaultAI;
}
