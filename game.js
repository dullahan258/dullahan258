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
};

function initGame(playerNames, aiCount) {
  game.players = [];
  game.roundCount = 0;
  game.currentPlayerIdx = 0;
  game.phase = 'action';
  game.pendingEvents = [];
  game.pendingMessages = {};
  game.selectedAction = null;
  game.actionCount = 0;
  game.winner = null;

  const totalPlayers = playerNames.length;
  const humanCount = totalPlayers - (aiCount || 0);

  const usedCells = new Set();
  for (let i = 0; i < totalPlayers; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * BOARD_SIZE);
      y = Math.floor(Math.random() * BOARD_SIZE);
    } while (usedCells.has(`${x},${y}`));
    usedCells.add(`${x},${y}`);

    const dirKeys = Object.keys(DIRS);
    const startDir = dirKeys[Math.floor(Math.random() * dirKeys.length)];

    const isAI = i >= humanCount;

    game.players.push({
      id: i,
      name: playerNames[i] || (isAI ? `电脑${PLAYER_NAMES_CN[i - humanCount]}` : `玩家${PLAYER_NAMES_CN[i]}`),
      color: PLAYER_COLORS[i],
      x, y,
      facing: startDir,
      alive: true,
      isAI: isAI,
      aiKnowledge: {
        suspectedTargets: [],
      },
    });
    game.pendingMessages[i] = [];
  }

  game.phase = 'action';
  game.actionCount = 2;
  addActionLog(`${getCurrentPlayer().name} 的回合开始`, 'system');
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

  for (let step = 1; step <= 2; step++) {
    const fx = player.x + d.dx * step;
    const fy = player.y + d.dy * step;
    cells.front.push({ x: fx, y: fy });
    cells.leftFront.push({ x: fx + ld.dx, y: fy + ld.dy });
    cells.rightFront.push({ x: fx + rd.dx, y: fy + rd.dy });
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

  for (const evt of game.pendingEvents) {
    if (evt.sourcePlayerId === player.id) continue;
    if (evt.perceivedBy.has(player.id)) continue;

    if (evt.type === 'sound') {
      const dist = chebyshevDist(player.x, player.y, evt.x, evt.y);
      if (dist <= evt.radius) {
        const dir = getSoundDirection(player, evt.x, evt.y);
        const key = `${dir}-${evt.soundType}`;
        if (!heardSounds.has(key)) {
          heardSounds.add(key);
          const soundName = evt.soundType === 'run' ? '奔跑' : '静步';
          messages.push({ type: 'sound', text: `${dir}方向发出过${soundName}的声音` });
        }
      }
    }

    if (evt.type === 'scream') {
      const dir = getSoundDirection(player, evt.x, evt.y);
      const key = `${dir}-scream`;
      if (!heardSounds.has(key)) {
        heardSounds.add(key);
        messages.push({ type: 'sound', text: `${dir}方向发出过惨叫` });
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

function doRun(direction) {
  const player = getCurrentPlayer();
  const startX = player.x;
  const startY = player.y;
  const d = DIRS[direction];
  const midX = startX + d.dx;
  const midY = startY + d.dy;
  const endX = startX + d.dx * 2;
  const endY = startY + d.dy * 2;

  if (!inBounds(endX, endY)) {
    showWallHit();
    SoundSystem.play('wall');
    return false;
  }

  const grassCells = [
    { x: startX, y: startY },
    { x: midX, y: midY },
    { x: endX, y: endY },
  ];

  let hitPlayer = null;
  let hitPos = null;
  const midOccupant = game.players.find(p => p.alive && p.id !== player.id && p.x === midX && p.y === midY);
  if (midOccupant) {
    hitPlayer = midOccupant;
    hitPos = { x: midX, y: midY };
    player.x = midX;
    player.y = midY;
  } else {
    const endOccupant = game.players.find(p => p.alive && p.id !== player.id && p.x === endX && p.y === endY);
    if (endOccupant) {
      hitPlayer = endOccupant;
      hitPos = { x: endX, y: endY };
      player.x = endX;
      player.y = endY;
    } else {
      player.x = endX;
      player.y = endY;
    }
  }

  recordSoundEvent(startX, startY, 3, 'run', player.id);
  recordGrassEvent(grassCells, player.id);
  addActionLog(`${player.name} 朝${DIRS[direction].name}方向奔跑`, 'action');
  SoundSystem.play('run');

  if (hitPlayer) {
    addActionLog(`奔跑途中撞上了 ${hitPlayer.name}！`, 'system');
    addActionLog(`${player.name} 被淘汰`, 'system');
    SoundSystem.play('encounter');
    killPlayer(player);
  }

  return true;
}

function doWalk(direction) {
  const player = getCurrentPlayer();
  const oldX = player.x;
  const oldY = player.y;
  const result = tryMove(player, direction, 1);

  if (!result.success) {
    if (result.reason === 'wall') {
      showWallHit();
      SoundSystem.play('wall');
    }
    return false;
  }

  recordSoundEvent(result.oldX, result.oldY, 1, 'walk', player.id);
  recordGrassEvent(result.grassCells, player.id);
  addActionLog(`${player.name} 朝${DIRS[direction].name}方向静步`, 'action');
  SoundSystem.play('walk');

  checkEncounter(player, oldX, oldY);
  return true;
}

function doAttack(direction) {
  const player = getCurrentPlayer();
  const d = DIRS[direction];
  const tx = player.x + d.dx;
  const ty = player.y + d.dy;

  if (!inBounds(tx, ty)) {
    showWallHit();
    SoundSystem.play('wall');
    return false;
  }

  recordGrassEvent([{ x: tx, y: ty }], player.id);
  addActionLog(`${player.name} 朝${DIRS[direction].name}方向攻击`, 'action');
  SoundSystem.play('attack');

  const targets = game.players.filter(p => p.alive && p.id !== player.id && p.x === tx && p.y === ty);
  if (targets.length > 0) {
    addActionLog('打中了！', 'system');
    SoundSystem.play('hit');
    for (const t of targets) {
      addActionLog(`${t.name} 被淘汰`, 'system');
      killPlayer(t);
    }
  } else {
    addActionLog('打空了！', 'system');
    SoundSystem.play('miss');
  }

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

  if (entryDir === stationary.facing) {
    movingDead = true;
    reason = `${stationary.name} 提防成功，${movingPlayer.name} 被淘汰`;
  } else {
    movingDead = false;
    reason = `${movingPlayer.name} 偷袭成功，${stationary.name} 被淘汰`;
  }

  addActionLog(`相遇！${reason}`, 'system');
  SoundSystem.play('encounter');

  if (movingDead) {
    killPlayer(movingPlayer);
  } else {
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
  player.alive = false;
  recordScreamEvent(player.x, player.y, player.id);
  SoundSystem.play('scream');
  
  const aliveCount = game.players.filter(p => p.alive).length;
  if (aliveCount <= 1) {
    game.winner = game.players.find(p => p.alive);
    game.phase = 'gameOver';
    setTimeout(() => SoundSystem.play('victory'), 600);
  }
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
    }
    if (inBounds(endX, endY)) {
      risk += beliefMap[endY][endX] * 30;
    }
  } else if (actionType === 'walk') {
    const endX = x + d.dx;
    const endY = y + d.dy;
    if (inBounds(endX, endY)) {
      risk += beliefMap[endY][endX] * 15;
    }
  } else if (actionType === 'attack') {
    risk += 5;
  }
  
  return risk;
}

function evaluateActionReward(actionType, dir, x, y, beliefMap, targetX, targetY) {
  let reward = 0;
  const d = DIRS[dir];
  
  if (actionType === 'attack') {
    const tx = x + d.dx;
    const ty = y + d.dy;
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
    for (const dir of dirKeys) {
      const d = DIRS[dir];
      let valid = true;
      let newX = aiPlayer.x;
      let newY = aiPlayer.y;
      
      if (actionType === 'run') {
        newX = aiPlayer.x + d.dx * 2;
        newY = aiPlayer.y + d.dy * 2;
        if (!inBounds(newX, newY)) valid = false;
      } else if (actionType === 'walk') {
        newX = aiPlayer.x + d.dx;
        newY = aiPlayer.y + d.dy;
        if (!inBounds(newX, newY)) valid = false;
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
      const reward = evaluateActionReward(actionType, dir, aiPlayer.x, aiPlayer.y, beliefMap, targetX, targetY);
      
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
    const validDirs = dirKeys.filter(d => inBounds(aiPlayer.x + DIRS[d].dx, aiPlayer.y + DIRS[d].dy));
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
    setTimeout(executeAIEnding, 600);
    return;
  }
  
  const perceptionMsgs = game.pendingMessages[aiPlayer.id] || [];
  const action = aiChooseAction(aiPlayer, perceptionMsgs);
  
  if (!action) {
    enterEndingPhase();
    setTimeout(executeAIEnding, 600);
    return;
  }
  
  let success = false;
  if (action.type === 'run') success = doRun(action.direction);
  else if (action.type === 'walk') success = doWalk(action.direction);
  else if (action.type === 'attack') success = doAttack(action.direction);
  
  if (game.phase === 'gameOver') {
    showEndScreen();
    return;
  }
  
  if (success) {
    game.actionCount--;
    updateAll();
    
    if (game.phase === 'gameOver') {
      showEndScreen();
      return;
    }
    
    if (game.actionCount <= 0) {
      setTimeout(() => {
        enterEndingPhase();
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
  game.actionCount--;
  updateActionBar();
  renderBoard();
  updateStatusBar();
  
  if (game.actionCount <= 0) {
    setTimeout(() => enterEndingPhase(), 500);
  } else {
    game.selectedAction = null;
    updateActionBar();
  }
}

function enterEndingPhase() {
  game.phase = 'ending';
  game.selectedAction = null;
  updateActionBar();
  addActionLog('请选择朝向以结束回合', 'system');
}

function endTurn(facingDirection) {
  const player = getCurrentPlayer();
  player.facing = facingDirection;
  addActionLog(`${player.name} 朝向${DIRS[facingDirection].name}结束回合`, 'action');

  const alivePlayers = game.players.filter(p => p.alive);
  if (alivePlayers.length <= 1) {
    game.winner = alivePlayers[0] || null;
    showEndScreen();
    return;
  }

  advanceToNextPlayer();
}

function advanceToNextPlayer() {
  let nextIdx = (game.currentPlayerIdx + 1) % game.players.length;
  let checked = 0;
  
  while (!game.players[nextIdx].alive && checked < game.players.length) {
    nextIdx = (nextIdx + 1) % game.players.length;
    checked++;
  }

  if (nextIdx <= game.currentPlayerIdx) {
    game.roundCount++;
  }

  game.currentPlayerIdx = nextIdx;
  game.actionCount = 2;
  game.selectedAction = null;

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
  addActionLog(`${getCurrentPlayer().name} 的回合开始`, 'system');
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
    for (const msg of messages) {
      const entry = document.createElement('div');
      entry.className = `log-entry ${msg.type}`;
      entry.textContent = msg.text;
      logEl.appendChild(entry);
    }
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

      const player = game.players.find(p => p.alive && p.x === col && p.y === row);
      if (player && game.phase !== 'perception') {
        if (player.id === game.currentPlayerIdx) {
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
}

function isHighlightedMove(x, y) {
  if (!game.selectedAction || game.phase !== 'action') return false;
  if (game.selectedAction.type !== 'run' && game.selectedAction.type !== 'walk') return false;
  
  const player = getCurrentPlayer();
  const dist = game.selectedAction.type === 'run' ? 2 : 1;
  
  for (const dir of Object.keys(DIRS)) {
    const d = DIRS[dir];
    const tx = player.x + d.dx * dist;
    const ty = player.y + d.dy * dist;
    if (tx === x && ty === y && inBounds(tx, ty)) return true;
  }
  return false;
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

function onCellClick(x, y) {
  if (game.phase !== 'action' || !game.selectedAction) return;

  const player = getCurrentPlayer();
  const dx = x - player.x;
  const dy = y - player.y;

  let direction = null;
  for (const [key, d] of Object.entries(DIRS)) {
    if (game.selectedAction.type === 'attack') {
      if (d.dx === dx && d.dy === dy) {
        direction = key;
        break;
      }
    } else {
      const dist = game.selectedAction.type === 'run' ? 2 : 1;
      if (d.dx * dist === dx && d.dy * dist === dy) {
        direction = key;
        break;
      }
    }
  }

  if (!direction) return;

  executeSelectedAction(direction);
}

function executeSelectedAction(direction) {
  if (!game.selectedAction) return;

  let success = false;
  if (game.selectedAction.type === 'run') {
    success = doRun(direction);
  } else if (game.selectedAction.type === 'walk') {
    success = doWalk(direction);
  } else if (game.selectedAction.type === 'attack') {
    success = doAttack(direction);
  }

  if (success) {
    useAction();
    
    if (game.phase === 'gameOver') {
      showEndScreen();
      return;
    }
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

    const btn = document.createElement('button');
    btn.className = 'action-btn primary';
    btn.textContent = '进入行动阶段';
    btn.addEventListener('click', () => {
      game.phase = 'action';
      game.actionCount = 2;
      addActionLog(`${getCurrentPlayer().name} 进入行动阶段`, 'system');
      updateAll();
    });
    bar.appendChild(btn);
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
    const runBtn = document.createElement('button');
    runBtn.className = `action-btn ${game.selectedAction?.type === 'run' ? 'primary' : ''}`;
    runBtn.innerHTML = '🏃 奔跑<br><small>移动2格</small>';
    runBtn.disabled = game.actionCount <= 0;
    runBtn.addEventListener('click', () => selectAction('run'));
    bar.appendChild(runBtn);

    const walkBtn = document.createElement('button');
    walkBtn.className = `action-btn ${game.selectedAction?.type === 'walk' ? 'primary' : ''}`;
    walkBtn.innerHTML = '🚶 静步<br><small>移动1格</small>';
    walkBtn.disabled = game.actionCount <= 0;
    walkBtn.addEventListener('click', () => selectAction('walk'));
    bar.appendChild(walkBtn);

    const attackBtn = document.createElement('button');
    attackBtn.className = `action-btn ${game.selectedAction?.type === 'attack' ? 'primary' : ''}`;
    attackBtn.innerHTML = '⚔️ 攻击<br><small>相邻1格</small>';
    attackBtn.disabled = game.actionCount <= 0;
    attackBtn.addEventListener('click', () => selectAction('attack'));
    bar.appendChild(attackBtn);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'action-btn';
    skipBtn.innerHTML = '⏭️ 结束<br><small>剩余行动放弃</small>';
    skipBtn.disabled = game.actionCount >= 2;
    skipBtn.addEventListener('click', () => {
      game.actionCount = 0;
      enterEndingPhase();
    });
    bar.appendChild(skipBtn);
  }
}

function selectAction(type) {
  if (game.actionCount <= 0) return;
  if (game.selectedAction?.type === type) {
    game.selectedAction = null;
  } else {
    game.selectedAction = { type };
  }
  updateActionBar();
  renderBoard();
}

function finishTurn(direction) {
  endTurn(direction);
}

function updateStatusBar() {
  const bar = document.getElementById('player-status-bar');
  bar.innerHTML = '';
  
  for (const p of game.players) {
    const chip = document.createElement('div');
    chip.className = `player-chip ${p.alive ? '' : 'dead'}`;
    
    const dot = document.createElement('span');
    dot.className = 'color-dot';
    dot.style.background = p.color;
    chip.appendChild(dot);
    
    const name = document.createElement('span');
    name.textContent = p.name;
    chip.appendChild(name);
    
    if (p.alive && p.id === game.currentPlayerIdx) {
      chip.style.border = `2px solid ${p.color}`;
    }
    
    bar.appendChild(chip);
  }
}

function updateTurnInfo() {
  const player = getCurrentPlayer();
  document.getElementById('current-player-label').textContent = player.name;
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
  const mask = document.getElementById('turn-mask');
  const text = document.getElementById('turn-mask-text');
  text.textContent = `请将设备交给 ${player.name}`;
  mask.classList.remove('hidden');
  clearPerceptionLog();
  document.getElementById('action-log').innerHTML = '';
}

function onTurnMaskConfirm() {
  document.getElementById('turn-mask').classList.add('hidden');
  
  const player = getCurrentPlayer();
  
  if (game.phase === 'perception') {
    const messages = startPerceptionPhase();
    game.pendingMessages[player.id] = messages;
    showPerceptionMessages(messages);
    addActionLog(`${player.name} 进入感知阶段`, 'system');
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
        addActionLog(`${player.name} 进入行动阶段`, 'system');
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
  document.getElementById('end-screen').classList.remove('hidden');
  document.getElementById('winner-text').innerHTML = 
    `<span class="winner-name">${game.winner?.name || '无'}</span> 获胜！`;
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
  
  for (let i = 0; i < count; i++) {
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
    
    container.appendChild(row);
  }
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

function startGame() {
  const names = getPlayerNames();
  const aiCount = getAICount();
  initGame(names, aiCount);
  
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
}

document.addEventListener('DOMContentLoaded', () => {
  setupPlayerCountSelector();
  
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('turn-mask-btn').addEventListener('click', onTurnMaskConfirm);
  document.getElementById('restart-btn').addEventListener('click', restartGame);
  
  document.getElementById('rules-btn').addEventListener('click', () => {
    document.getElementById('rules-modal').classList.remove('hidden');
  });
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
  
  document.addEventListener('keydown', handleKeyboard);
});

function handleKeyboard(e) {
  if (game.phase === 'setup' || game.phase === 'gameOver') return;
  if (getCurrentPlayer()?.isAI) return;
  
  const key = e.key.toLowerCase();
  
  if (game.phase === 'perception') {
    if (key === 'enter' || key === ' ') {
      e.preventDefault();
      game.phase = 'action';
      game.actionCount = 2;
      game.selectedAction = null;
      addActionLog(`${getCurrentPlayer().name} 进入行动阶段`, 'system');
      updateAll();
    }
    return;
  }
  
  if (game.phase === 'action') {
    if (key === '1') { selectAction('run'); return; }
    else if (key === '2') { selectAction('walk'); return; }
    else if (key === '3') { selectAction('attack'); return; }
    
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
