/**
 * Google Spreadsheet Profile Fetcher
 */

// 配信者が指定するスプレッドシートのURL（Web公開CSV URL または 通常の共有リンクの両方に対応）
const PROFILE_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR65BlNYQQyo3eRms3k9Y0mx4yu8A9uTskhQ34LKYpkHOHLdhCmn2uNX_wGiC4meYEycikSYdnOpciR/pub?output=csv";

/**
 * URLを自動判定し、CORSエラーを回避できるGoogle Visualization APIのCSV出力URLに正規化する
 */
function normalizeCsvUrl(url) {
  if (!url) return "";
  
  const match = url.match(/\/d\/e\/([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  
  const id = match[1];
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
}

/**
 * 改行やカンマを含む引用符付きCSVを正しく解釈するパーサー
 */
function parseCsvRows(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // エスケープされたダブルクォート
      } else {
        inQuotes = !inQuotes; // 引用符の開閉切り替え
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // \r\n のスキップ
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * スプレッドシートからデータをフェッチして画面に描画
 */
async function loadProfileData() {
  let csvUrl = normalizeCsvUrl(PROFILE_SPREADSHEET_URL);
  if (!csvUrl) return;
  // キャッシュ回避用のパラメータを追加
  csvUrl += (csvUrl.includes("?") ? "&" : "?") + "t=" + new Date().getTime();

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("HTTP error " + response.status);
    const csvText = await response.text();

    const rows = parseCsvRows(csvText);
    const profileData = {};

    rows.forEach(row => {
      if (row.length >= 2) {
        // 先頭のBOM（\uFEFF）などの不可視文字を確実に除去してキーにする
        const key = row[0].replace(/^\uFEFF/, '').trim();
        const value = row[1].trim();
        profileData[key] = value;
      }
    });

    renderProfile(profileData);
  } catch (err) {
    console.error("Failed to load profile data:", err);
    document.getElementById("profile-name").textContent = "データの読み込みに失敗しました";
  }
}

/**
 * 読み込んだデータをHTMLに適用
 */
function renderProfile(data) {
  // 既存のプロフィールレンダリング
  if (data["名前"]) {
    const nameEl = document.getElementById("profile-name");
    nameEl.textContent = data["名前"];
    nameEl.classList.remove("skeleton-text");
    document.title = `${data["名前"]} | Portfolio`;
  }
  if (data["キャッチフレーズ"] || data["キャッチコピー"]) {
    const catchphrase = data["キャッチフレーズ"] || data["キャッチコピー"];
    const catchEl = document.getElementById("profile-catchphrase");
    catchEl.textContent = catchphrase;
    catchEl.classList.remove("skeleton-text", "skeleton-sub");
  }
  if (data["プロフィール文"]) {
    const bioEl = document.getElementById("profile-bio");
    bioEl.textContent = data["プロフィール文"];
    bioEl.classList.remove("skeleton-block");
  }
  if (data["X"]) {
    const xLink = document.getElementById("link-x");
    xLink.href = data["X"];
    xLink.classList.remove("hidden");
  }
}

// ---------------------------------------------------------
// Portal Features Initialization
// ---------------------------------------------------------

function initSchedule() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const events = ['Off', '20:00 雑談', '21:00 ゲーム', 'Off', '21:00 歌枠', '18:00 参加型', '21:00 コラボ'];
  const grid = document.getElementById('scheduleGrid');
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // Mon=0, Sun=6

  days.forEach((day, index) => {
    const el = document.createElement('div');
    el.className = `schedule-day ${index === todayIndex ? 'active' : ''}`;
    el.innerHTML = `<span class="day-name">${day}</span><span class="event">${events[index]}</span>`;
    grid.appendChild(el);
  });
}

function initMerch() {
  const merchData = [
    { title: "アクリルスタンド", price: "¥1,500" },
    { title: "オリジナルTシャツ", price: "¥3,500" },
    { title: "ステッカーセット", price: "¥800" },
    { title: "ボイスパック", price: "¥1,000" }
  ];
  const carousel = document.getElementById('merchCarousel');
  
  merchData.forEach(item => {
    const el = document.createElement('a');
    el.href = "#";
    el.className = 'merch-card';
    el.innerHTML = `
      <div class="merch-img"><i data-lucide="image"></i></div>
      <div class="merch-title">${item.title}</div>
      <div class="merch-price">${item.price}</div>
    `;
    carousel.appendChild(el);
  });
}

function initSongs() {
  const songs = [
    { title: "千本桜", artist: "黒うさP" },
    { title: "アイドル", artist: "YOASOBI" },
    { title: "シャルル", artist: "バルーン" },
    { title: "ドライフラワー", artist: "優里" }
  ];
  const list = document.getElementById('songList');
  
  songs.forEach(song => {
    const el = document.createElement('div');
    el.className = 'song-item';
    el.innerHTML = `
      <div class="song-info">
        <span class="song-title">${song.title}</span>
        <span class="song-artist">${song.artist}</span>
      </div>
      <button class="req-btn" onclick="copyRequest('${song.title}')">
        <i data-lucide="copy"></i> リクエスト
      </button>
    `;
    list.appendChild(el);
  });
}

// 1-Tap Copy to Clipboard
window.copyRequest = function(songTitle) {
  const text = `${songTitle} をリクエストします！ #ToraLive`;
  navigator.clipboard.writeText(text).then(() => {
    alert(`コピーしました！YouTubeのコメント欄に貼り付けてください。\n\n「${text}」`);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  loadProfileData();
  
  // Initialize practical features
  initSchedule();
  initMerch();
  initSongs();
});
