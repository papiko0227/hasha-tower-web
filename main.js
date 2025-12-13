// ==== 覇者の塔 Web版：基盤スクリプト ====

// ブラウザの localStorage に保存するキー
const STORAGE_KEY = "hasha_tower_player";

// プレイヤー初期データ
function createDefaultPlayer() {
  return {
    name: "名無しの冒険者",
    floor: 1,
    attack: 10,
    rank: "見習い冒険者",
    soloClear: 0,
    multiClear: 0,
    coins: 0,
    medals: 0,
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

    // 将来フィールドを増やしたとき用の保険（欠けているものを埋める）
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
  document.getElementById("player-attack").textContent = player.attack;
  document.getElementById("player-rank").textContent = player.rank;
  document.getElementById("player-solo-clear").textContent = player.soloClear;
  document.getElementById("player-multi-clear").textContent = player.multiClear;
  document.getElementById("player-coins").textContent = player.coins;
  document.getElementById("player-medals").textContent = player.medals;

  document.getElementById("ticket-beginner").textContent = player.tickets.beginner;
  document.getElementById("ticket-normal").textContent = player.tickets.normal;
  document.getElementById("ticket-advanced").textContent = player.tickets.advanced;
  document.getElementById("ticket-hasha").textContent = player.tickets.hasha;
}

// ランダム整数ヘルパー
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==== ソロバトル処理（超簡易版） ====
//
// ・階層に応じて敵のHPが上がる
// ・プレイヤーの攻撃力 >= 敵HP なら勝ち（ワンパン判定の簡易版）
// ・勝つとコインとソロ討伐数が増える
// ・たまに階層が上がる（仮）

function handleSoloBattle(player) {
  const logEl = document.getElementById("solo-result");

  // 敵のステータス（仮仕様）
  const enemyHp = randInt(5 + player.floor * 2, 10 + player.floor * 3);
  const enemyName = `階層の魔物（HP ${enemyHp}）`;

  let log = `=== ソロバトル ===\n`;
  log += `敵が現れた！：${enemyName}\n`;

  if (player.attack >= enemyHp) {
    // 勝利
    const coinGain = randInt(5, 10 + player.floor);
    player.coins += coinGain;
    player.soloClear += 1;

    // 一定確率で階層アップ（仮の演出）
    let floorUp = false;
    if (Math.random() < 0.3) {
      player.floor += 1;
      floorUp = true;
    }

    log += `あなたの攻撃力 ${player.attack} は敵のHP ${enemyHp} を上回った！\n`;
    log += `⇒ 勝利！ コイン +${coinGain}\n`;
    if (floorUp) {
      log += `⇒ 覇者の塔の階層が 1 上がった！（現在: ${player.floor} 階）\n`;
    }
  } else {
    // 敗北
    log += `あなたの攻撃力 ${player.attack} では敵のHP ${enemyHp} に届かなかった……\n`;
    log += `⇒ 敗北。特にペナルティはありません。\n`;
  }

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// ==== 初級ガチャ ====
//
// ・コインを消費して引く（例: 20コイン）
// ・将来的には「チケット消費」に変更予定
// ・今は簡単なレア度と結果テキストだけ

function handleBeginnerGacha(player) {
  const logEl = document.getElementById("gacha-result");
  const cost = 20;

  if (player.coins < cost) {
    logEl.textContent = `コインが足りません。（必要: ${cost}, 所持: ${player.coins}）`;
    return;
  }

  player.coins -= cost;

  // ガチャ結果テーブル
  // 確率は適当：ノーマル70%, レア25%, SR4%, SSR1% くらい
  const r = Math.random();
  let rarity, itemName, effectLog = "";

  if (r < 0.70) {
    rarity = "N";
    itemName = "さびた短剣";
    // 一応何かしらの効果をつけても良いが、基盤なので見た目だけでもOK
    effectLog = "特に強くはない……。コレクション用かもしれない。";
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
    itemName = "覇者の片翼";
    player.attack += 5;
    effectLog = "攻撃力が 5 上がった！ 超レア！";
  }

  let log = `=== 初級ガチャ（${cost} コイン消費） ===\n`;
  log += `結果： [${rarity}] ${itemName}\n`;
  log += effectLog + "\n";

  logEl.textContent = log;
  savePlayer(player);
  updateUI(player);
}

// ==== 初期化処理 ====
window.addEventListener("DOMContentLoaded", () => {
  let player = loadPlayer();

  // 初回起動時に名前を簡易設定（ブラウザ名を使うのも手だが、ここでは固定）
  // 将来：ログイン機能やDiscord連携で上書き予定
  if (!player.name || player.name === "名無しの冒険者") {
    // ブラウザ側で一時的な名前変更ダイアログを出しても良い
    // 今回はそのままにしておく
  }

  updateUI(player);

  // ソロバトルボタン
  document.getElementById("solo-battle-btn").addEventListener("click", () => {
    player = loadPlayer(); // 念のため最新を読み直し
    handleSoloBattle(player);
  });

  // 初級ガチャボタン
  document.getElementById("gacha-beginner-btn").addEventListener("click", () => {
    player = loadPlayer();
    handleBeginnerGacha(player);
  });

  // データリセット（テスト用）
  document.getElementById("reset-data-btn").addEventListener("click", () => {
    if (confirm("本当にプレイヤーデータをリセットしますか？")) {
      player = createDefaultPlayer();
      savePlayer(player);
      updateUI(player);
      document.getElementById("solo-result").textContent = "";
      document.getElementById("gacha-result").textContent = "";
      alert("データをリセットしました。");
    }
  });
});
