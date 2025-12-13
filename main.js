// ==== 覇者の塔 Web版：v1 基盤スクリプト ====

// ブラウザの localStorage に保存するキー
const STORAGE_KEY = "hasha_tower_player_v1";

// ランク順（弱い→強い）
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
    floor: 1,         // 現在の階層
    maxFloor: 1,      // 最高到達階層
    attack: 10,       // 剣の攻撃力
    rank: "見習い冒険者",
    soloClear: 0,
    multiClear: 0,    // Web単体では使わないが、Discord連携用に残しておく
    coins: 0,
    medals: 0,        // マルチ報酬想定
    upgradeStones: 0, // 剣強化用素材
    tickets: {
      beginner: 0,
      normal: 0,
      advanced: 0,
      hasha: 0,
    },
  };
}

// データ読み込み
function loadPlayer() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const p = createDefaultPlayer();
    savePlayer(p);
    return p;
  }
  try {
    const parsed = JSON.parse(raw);

    // フィールド拡張に備えてマージする
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
    console.error("プレイヤーデータの読み込みに失敗しました。初期化します。", e);
    const p = createDefaultPlayer();
    savePlayer(p);
    return p;
  }
}

// データ保存
function savePlayer(player) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

// UIへ反映
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
}

// ランダム整数ヘルパー
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ランクインデックス取得
function rankIndex(rank) {
  const idx = RANK_ORDER.indexOf(rank);
  return idx === -1 ? 0 : idx;
}

// 指定ランク以上かどうか
function hasRankAtLeast(player, requiredRank) {
  return rankIndex(player.rank) >= rankIndex(requiredRank);
}

// 最高到達階層に応じてランク更新
function updateRank(player) {
  const f = player.maxFloor;
  let newRank = "見習い冒険者";

  if (f >= 40) {
    newRank = "覇者";
  } else if (f >= 30) {
    newRank = "塔の守護者";
  } else if (f >= 20) {
    newRank = "上級騎士";
  } else if (f >= 10) {
    newRank = "一人前の剣士";
  } else {
    newRank = "見習い冒険者";
  }

  player.rank = newRank;
}

// ==== ソロバトル処理 ====
//
// ・階層に応じて敵HP/攻撃力が変化
// ・プレイヤーHPは簡易的に「30 + 攻撃力の半分」
// ・最大3ターンの殴り合い

function handleSoloBattle(player) {
  const logEl = document.getElementById("solo-result");
  const floor = player.floor;

  // 敵ステータス
  const baseHp = 15 + floor * 5;
  const enemyHpMin = Math.floor(baseHp * 0.8);
  const enemyHpMax = Math.floor(baseHp * 1.2);
  let enemyHp = randInt(enemyHpMin, enemyHpMax);
  const enemyAtk = 5 + floor * 2;
  const enemyName = `${floor}階の魔物`;

  // プレイヤーHP（戦闘ごとに全快）
  const basePlayerHp = 30 + Math.floor(player.attack / 2);
  let playerHp = basePlayerHp;

  let log = `=== ソロバトル ===\n`;
  log += `【敵】${enemyName}（HP: ${enemyHp}, 攻撃力: ${enemyAtk}）\n`;
  log += `【自分】攻撃力: ${player.attack}, HP: ${playerHp}\n\n`;

  let turn = 1;
  while (turn <= 3 && enemyHp > 0 && playerHp > 0) {
    log += `--- ターン ${turn} ---\n`;

    // プレイヤーの攻撃
    const playerDmg = player.attack + randInt(0, floor);
    enemyHp -= playerDmg;
    if (enemyHp < 0) enemyHp = 0;
    log += `あなたの攻撃！ → ${playerDmg} ダメージ（敵HP: ${enemyHp}）\n`;

    if (enemyHp <= 0) {
      log += `敵を倒した！\n`;
      break;
    }

    // 敵の反撃
    const enemyDmg = enemyAtk + randInt(0, Math.max(0, Math.floor(floor / 2)));
    playerHp -= enemyDmg;
    if (playerHp < 0) playerHp = 0;
    log += `敵の反撃！ → ${enemyDmg} ダメージ（自分HP: ${playerHp}）\n`;

    if (playerHp <= 0) {
      log += `力尽きてしまった……。\n`;
      break;
    }

    turn += 1;
    log += "\n";
  }

  // 戦闘結果判定
  if (enemyHp <= 0 && playerHp > 0) {
    // 勝利
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
    let floorUp = false;
    if (Math.random() < 0.3) {
      player.floor += 1;
      floorUp = true;
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
  } else if (playerHp <= 0) {
    // 敗北
    const consolation = 3;
    player.coins += consolation;
    log += `\n【結果】敗北……。しかしわずかなコイン +${consolation} を拾った。\n`;
  } else {
    // 引き分け（どちらも生きているままターン終了）
    const coinGain = 5;
    player.coins += coinGain;
    log += `\n【結果】決着がつかなかった……。コイン +${coinGain}\n`;
  }

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// ==== ガチャ処理 ====

// 共通：コイン消費チェック
function spendCoins(player, cost) {
  if (player.coins < cost) {
    return false;
  }
  player.coins -= cost;
  return true;
}

// 初級ガチャ（誰でも）
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
//
// 強化素材 3個 → 攻撃力 +1 （シンプルな仕様）

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

// ==== 初期化処理 ====
window.addEventListener("DOMContentLoaded", () => {
  let player = loadPlayer();

  // 将来のログイン連携までの間は、名前は固定のままでもOK
  updateRank(player); // 念のためランクを最新化
  savePlayer(player);
  updateUI(player);

  // ソロバトル
  document.getElementById("solo-battle-btn").addEventListener("click", () => {
    player = loadPlayer();
    handleSoloBattle(player);
  });

  // ガチャ各種
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

  // データリセット（テスト用）
  document.getElementById("reset-data-btn").addEventListener("click", () => {
    if (confirm("本当にプレイヤーデータをリセットしますか？")) {
      player = createDefaultPlayer();
      savePlayer(player);
      updateUI(player);
      document.getElementById("solo-result").textContent = "";
      document.getElementById("gacha-result").textContent = "";
      document.getElementById("upgrade-result").textContent = "";
      alert("データをリセットしました。");
    }
  });
});
