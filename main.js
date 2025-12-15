// ==== 覇者の塔 Web版：コマンド選択バトル版 ====

// localStorageキー
const STORAGE_KEY = "hasha_tower_player_v1";

// ランク順
const RANK_ORDER = [
  "見習い冒険者",
  "一人前の剣士",
  "上級騎士",
  "塔の守護者",
  "覇者",
];

// プレイヤー初期データ
function createDefaultPlayer() {
  return {
    name: "名無しの冒険者",
    floor: 1,
    maxFloor: 1,
    attack: 10,
    rank: "見習い冒険者",
    soloClear: 0,
    multiClear: 0,
    coins: 0,
    medals: 0,
    upgradeStones: 0,
    tickets: {
      beginner: 0,
      normal: 0,
      advanced: 0,
      hasha: 0,
    },
  };
}

// データ読み込み・保存
function loadPlayer() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const p = createDefaultPlayer();
    savePlayer(p);
    return p;
  }
  try {
    const parsed = JSON.parse(raw);
    const base = createDefaultPlayer();
    const merged = {
      ...base,
      ...parsed,
      tickets: {
        ...base.tickets,
        ...(parsed.tickets || {}),
      },
    };
    return merged;
  } catch (e) {
    console.error("プレイヤーデータ読み込み失敗。初期化します。", e);
    const p = createDefaultPlayer();
    savePlayer(p);
    return p;
  }
}

function savePlayer(player) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

// UI反映
function updateUI(player) {
  document.getElementById("player-name").textContent = player.name;
  document.getElementById("player-floor").textContent = player.floor;
  document.getElementById("player-max-floor").textContent = player.maxFloor;
  document.getElementById("player-attack").textContent = player.attack;
  document.getElementById("player-rank").textContent = player.rank;
  document.getElementById("player-solo-clear").textContent = player.soloClear;
  document.getElementById("player-multi-clear").textContent = player.multiClear;
  document.getElementById("player-coins").textContent = player.coins;
  document.getElementById("player-medals").textContent = player.medals;
  document.getElementById("player-upgrade-stones").textContent = player.upgradeStones;

  document.getElementById("ticket-beginner").textContent = player.tickets.beginner;
  document.getElementById("ticket-normal").textContent = player.tickets.normal;
  document.getElementById("ticket-advanced").textContent = player.tickets.advanced;
  document.getElementById("ticket-hasha").textContent = player.tickets.hasha;

  // バトル画面側のプレイヤーステータスも更新
  const basePlayerHp = calcPlayerMaxHp(player);
  document.getElementById("battle-player-hp").textContent =
    currentBattle ? currentBattle.playerHp : basePlayerHp;
  document.getElementById("battle-player-atk").textContent = player.attack;
  document.getElementById("battle-player-floor").textContent = player.floor;

  // 敵側
  if (currentBattle && !currentBattle.finished) {
    document.getElementById("battle-enemy-name").textContent = currentBattle.enemyName;
    document.getElementById("battle-enemy-hp").textContent = currentBattle.enemyHp;
    document.getElementById("battle-enemy-hp-max").textContent = currentBattle.enemyHpMax;
    document.getElementById("battle-enemy-atk").textContent = currentBattle.enemyAtk;
  } else {
    document.getElementById("battle-enemy-name").textContent = "（敵はいない）";
    document.getElementById("battle-enemy-hp").textContent = "-";
    document.getElementById("battle-enemy-hp-max").textContent = "-";
    document.getElementById("battle-enemy-atk").textContent = "-";
  }
}

// ランダム整数
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ランク関係
function rankIndex(rank) {
  const idx = RANK_ORDER.indexOf(rank);
  return idx === -1 ? 0 : idx;
}

function hasRankAtLeast(player, requiredRank) {
  return rankIndex(player.rank) >= rankIndex(requiredRank);
}

function updateRank(player) {
  const f = player.maxFloor;
  let newRank = "見習い冒険者";
  if (f >= 40) newRank = "覇者";
  else if (f >= 30) newRank = "塔の守護者";
  else if (f >= 20) newRank = "上級騎士";
  else if (f >= 10) newRank = "一人前の剣士";
  player.rank = newRank;
}

// ==== バトル関連 ====

// 現在のバトル状態
let currentBattle = null;

// プレイヤー最大HP（簡易計算）
function calcPlayerMaxHp(player) {
  return 30 + Math.floor(player.attack / 2);
}

// 新しい敵を生成
function createEnemyForFloor(floor) {
  const baseHp = 15 + floor * 5;
  const enemyHpMin = Math.floor(baseHp * 0.8);
  const enemyHpMax = Math.floor(baseHp * 1.2);
  const enemyHp = randInt(enemyHpMin, enemyHpMax);
  const enemyAtk = 5 + floor * 2;
  const enemyName = `${floor}階の魔物`;
  return {
    enemyName,
    enemyHp,
    enemyHpMax: enemyHp,
    enemyAtk,
  };
}

// バトル開始（敵がいない状態で「たたかう」が押されたら呼ぶ）
function startBattle(player) {
  const enemy = createEnemyForFloor(player.floor);
  currentBattle = {
    floor: player.floor,
    turn: 1,
    finished: false,
    playerHp: calcPlayerMaxHp(player),
    ...enemy,
  };

  const logEl = document.getElementById("solo-result");
  let log = "";
  log += `=== ソロバトル開始 ===\n`;
  log += `【敵】${enemy.enemyName}（HP: ${enemy.enemyHpMax}, 攻撃力: ${enemy.enemyAtk}）\n`;
  log += `【自分】攻撃力: ${player.attack}, HP: ${currentBattle.playerHp}\n`;
  logEl.textContent = log;

  updateUI(player);
}

// 1ターン分の「たたかう」
function handleBattleFight(player) {
  const logEl = document.getElementById("solo-result");

  // バトルがまだなければ新規開始
  if (!currentBattle || currentBattle.finished) {
    startBattle(player);
    return;
  }

  const b = currentBattle;
  let log = logEl.textContent || "";

  log += `\n--- ターン ${b.turn} ---\n`;

  // プレイヤーの攻撃
  const playerDmg = player.attack + randInt(0, b.floor);
  b.enemyHp -= playerDmg;
  if (b.enemyHp < 0) b.enemyHp = 0;
  log += `あなたの攻撃！ → ${playerDmg} ダメージ（敵HP: ${b.enemyHp}）\n`;

  // 敵撃破？
  if (b.enemyHp <= 0) {
    log += `敵を倒した！\n`;
    finishBattleVictory(player, b, log);
    return;
  }

  // 敵の反撃
  const enemyDmg = b.enemyAtk + randInt(0, Math.max(0, Math.floor(b.floor / 2)));
  b.playerHp -= enemyDmg;
  if (b.playerHp < 0) b.playerHp = 0;
  log += `敵の反撃！ → ${enemyDmg} ダメージ（自分HP: ${b.playerHp}）\n`;

  // プレイヤー死亡？
  if (b.playerHp <= 0) {
    log += `力尽きてしまった……。\n`;
    finishBattleDefeat(player, b, log);
    return;
  }

  b.turn += 1;
  logEl.textContent = log;
  updateUI(player);
}

// 勝利時処理
function finishBattleVictory(player, battle, log) {
  const logEl = document.getElementById("solo-result");

  const floor = battle.floor;
  const coinGain = 10 + floor * 3 + randInt(0, 5);
  player.coins += coinGain;
  player.soloClear += 1;

  log += `\n【結果】勝利！ コイン +${coinGain}\n`;

  // 強化素材ドロップ（30%）
  if (Math.random() < 0.3) {
    player.upgradeStones += 1;
    log += `強化素材を 1個 手に入れた！ （合計: ${player.upgradeStones}）\n`;
  }

  // 階層アップ（30%）
  if (Math.random() < 0.3) {
    player.floor += 1;
    log += `覇者の塔の階層が 1 上がった！ → 現在: ${player.floor} 階\n`;
  }

  // 最高到達階層更新
  if (player.floor > player.maxFloor) {
    player.maxFloor = player.floor;
    log += `最高到達階層を更新！ → ${player.maxFloor} 階\n`;
  }

  // ランク更新
  const oldRank = player.rank;
  updateRank(player);
  if (oldRank !== player.rank) {
    log += `階級が '${oldRank}' から '${player.rank}' に昇格した！\n`;
  }

  battle.finished = true;
  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// 敗北時処理
function finishBattleDefeat(player, battle, log) {
  const logEl = document.getElementById("solo-result");
  const consolation = 3;
  player.coins += consolation;
  log += `\n【結果】敗北……。しかしわずかなコイン +${consolation} を拾った。\n`;

  battle.finished = true;
  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// 「にげる」
function handleBattleRun(player) {
  const logEl = document.getElementById("solo-result");

  if (!currentBattle || currentBattle.finished) {
    logEl.textContent = "今は戦っていません。敵はいない……。";
    return;
  }

  let log = logEl.textContent || "";
  log += `\nあなたは戦いから逃げ出した！\n`;
  log += `【結果】戦闘終了。特に報酬はありません。\n`;
  currentBattle.finished = true;

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// ==== ガチャ ====

// コイン消費
function spendCoins(player, cost) {
  if (player.coins < cost) return false;
  player.coins -= cost;
  return true;
}

// 初級ガチャ
function handleBeginnerGacha(player) {
  const logEl = document.getElementById("gacha-result");
  const cost = 20;

  if (!spendCoins(player, cost)) {
    logEl.textContent = `コインが足りません。（必要: ${cost}, 所持: ${player.coins}）`;
    return;
  }

  const r = Math.random();
  let rarity, itemName, effectLog = "";

  if (r < 0.70) {
    rarity = "N";
    itemName = "さびた短剣";
    effectLog = "特に強くはない……。その辺で拾ったような短剣だ。";
  } else if (r < 0.95) {
    rarity = "R";
    itemName = "鉄の剣";
    player.attack += 1;
    effectLog = "攻撃力が 1 上がった！";
  } else if (r < 0.99) {
    rarity = "SR";
    itemName = "光るロングソード";
    player.attack += 3;
    effectLog = "攻撃力が 3 上がった！";
  } else {
    rarity = "SSR";
    itemName = "覇者の片翼（欠片）";
    player.attack += 5;
    effectLog = "攻撃力が 5 上がった！ 超レア！";
  }

  let log = `=== 初級ガチャ（${cost} コイン） ===\n`;
  log += `結果： [${rarity}] ${itemName}\n`;
  log += effectLog + "\n";

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// 中級ガチャ（ランク: 一人前の剣士 以上）
function handleNormalGacha(player) {
  const logEl = document.getElementById("gacha-result");
  const cost = 60;

  if (!hasRankAtLeast(player, "一人前の剣士")) {
    logEl.textContent = `階級が足りません。「一人前の剣士」以上で中級ガチャが解放されます。（現在: ${player.rank}）`;
    return;
  }

  if (!spendCoins(player, cost)) {
    logEl.textContent = `コインが足りません。（必要: ${cost}, 所持: ${player.coins}）`;
    return;
  }

  const r = Math.random();
  let rarity, itemName, effectLog = "";

  if (r < 0.60) {
    rarity = "R";
    itemName = "鋼の剣";
    player.attack += 2;
    effectLog = "攻撃力が 2 上がった！";
  } else if (r < 0.90) {
    rarity = "SR";
    itemName = "魔力を帯びた大剣";
    player.attack += 4;
    effectLog = "攻撃力が 4 上がった！";
  } else {
    rarity = "SSR";
    itemName = "覇者の剣の破片";
    player.attack += 6;
    player.upgradeStones += 2;
    effectLog = "攻撃力が 6 上がり、強化素材を 2個 手に入れた！";
  }

  let log = `=== 中級ガチャ（${cost} コイン） ===\n`;
  log += `結果： [${rarity}] ${itemName}\n`;
  log += effectLog + "\n";

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// 上級ガチャ（ランク: 上級騎士 以上）
function handleAdvancedGacha(player) {
  const logEl = document.getElementById("gacha-result");
  const cost = 150;

  if (!hasRankAtLeast(player, "上級騎士")) {
    logEl.textContent = `階級が足りません。「上級騎士」以上で上級ガチャが解放されます。（現在: ${player.rank}）`;
    return;
  }

  if (!spendCoins(player, cost)) {
    logEl.textContent = `コインが足りません。（必要: ${cost}, 所持: ${player.coins}）`;
    return;
  }

  const r = Math.random();
  let rarity, itemName, effectLog = "";

  if (r < 0.70) {
    rarity = "SR";
    itemName = "英雄の大剣";
    player.attack += 5;
    effectLog = "攻撃力が 5 上がった！";
  } else {
    rarity = "SSR";
    itemName = "覇者の大剣（未完成）";
    player.attack += 8;
    player.upgradeStones += 3;
    effectLog = "攻撃力が 8 上がり、強化素材を 3個 手に入れた！";
  }

  let log = `=== 上級ガチャ（${cost} コイン） ===\n`;
  log += `結果： [${rarity}] ${itemName}\n`;
  log += effectLog + "\n";

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// 覇者ガチャ（ランク: 塔の守護者 以上 & 覇者チケット）
function handleHashaGacha(player) {
  const logEl = document.getElementById("gacha-result");

  if (!hasRankAtLeast(player, "塔の守護者")) {
    logEl.textContent = `階級が足りません。「塔の守護者」以上で覇者ガチャが解放されます。（現在: ${player.rank}）`;
    return;
  }

  if (player.tickets.hasha <= 0) {
    logEl.textContent = `覇者チケットがありません。マルチボス討伐などで入手できる想定です。`;
    return;
  }

  player.tickets.hasha -= 1;

  const r = Math.random();
  let rarity, itemName, effectLog = "";

  if (r < 0.80) {
    rarity = "SSR";
    itemName = "覇者の剣";
    player.attack += 10;
    effectLog = "攻撃力が 10 上がった！";
  } else {
    rarity = "UR";
    itemName = "覇者の証（称号）";
    player.attack += 5;
    effectLog = "攻撃力が 5 上がった！ 将来的にDiscord上の特別ロールと連動する想定。";
  }

  let log = `=== 覇者ガチャ（覇者チケット 1枚消費） ===\n`;
  log += `結果： [${rarity}] ${itemName}\n`;
  log += effectLog + "\n";

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// ==== 剣の強化 ====
function handleUpgradeSword(player) {
  const logEl = document.getElementById("upgrade-result");
  const costStones = 3;

  if (player.upgradeStones < costStones) {
    logEl.textContent = `強化素材が足りません。（必要: ${costStones}, 所持: ${player.upgradeStones}）`;
    return;
  }

  player.upgradeStones -= costStones;
  player.attack += 1;

  let log = `=== 剣の強化 ===\n`;
  log += `強化素材 ${costStones}個 を消費して、攻撃力が 1 上がった！\n`;
  log += `現在の攻撃力: ${player.attack}, 残り強化素材: ${player.upgradeStones}\n`;

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// ==== 画面切り替え ====
function setupScreenSwitching() {
  const nav = document.getElementById("main-nav");
  const buttons = nav.querySelectorAll("button[data-screen-target]");
  const screens = document.querySelectorAll(".screen");

  function showScreen(name) {
    screens.forEach((sec) => {
      sec.classList.toggle("active", sec.dataset.screen === name);
    });
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.screenTarget === name);
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      showScreen(btn.dataset.screenTarget);
    });
  });

  // 初期表示はステータス
  showScreen("status");
}

// ==== 初期化 ====
window.addEventListener("DOMContentLoaded", () => {
  let player = loadPlayer();
  updateRank(player);
  savePlayer(player);
  updateUI(player);

  setupScreenSwitching();

  // バトルコマンド
  document.getElementById("battle-cmd-fight").addEventListener("click", () => {
    player = loadPlayer();
    handleBattleFight(player);
  });

  document.getElementById("battle-cmd-run").addEventListener("click", () => {
    player = loadPlayer();
    handleBattleRun(player);
  });

  // ガチャ
  document.getElementById("gacha-beginner-btn").addEventListener("click", () => {
    player = loadPlayer();
    handleBeginnerGacha(player);
  });
  document.getElementById("gacha-normal-btn").addEventListener("click", () => {
    player = loadPlayer();
    handleNormalGacha(player);
  });
  document.getElementById("gacha-advanced-btn").addEventListener("click", () => {
    player = loadPlayer();
    handleAdvancedGacha(player);
  });
  document.getElementById("gacha-hasha-btn").addEventListener("click", () => {
    player = loadPlayer();
    handleHashaGacha(player);
  });

  // 剣の強化
  document.getElementById("upgrade-sword-btn").addEventListener("click", () => {
    player = loadPlayer();
    handleUpgradeSword(player);
  });

  // データリセット
  document.getElementById("reset-data-btn").addEventListener("click", () => {
    if (confirm("本当にプレイヤーデータをリセットしますか？")) {
      player = createDefaultPlayer();
      currentBattle = null;
      savePlayer(player);
      updateUI(player);
      document.getElementById("solo-result").textContent = "";
      document.getElementById("gacha-result").textContent = "";
      document.getElementById("upgrade-result").textContent = "";
      alert("データをリセットしました。");
    }
  });
});
