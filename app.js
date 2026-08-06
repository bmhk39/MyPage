/**
 * Google Spreadsheet Profile Fetcher
 */

// 配信者が指定するスプレッドシートのURL（Web公開CSV URL または 通常の共有リンクの両方に対応）
const PROFILE_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR65BlNYQQyo3eRms3k9Y0mx4yu8A9uTskhQ34LKYpkHOHLdhCmn2uNX_wGiC4meYEycikSYdnOpciR/pub?output=csv";

/**
 * URLを自動判定し、CSV出力URLに正規化する
 */
function normalizeCsvUrl(url) {
  if (!url) return "";
  if (url.includes("/pub?") || url.includes("output=csv")) {
    return url;
  }
  // 通常の共有URLの場合: /edit... を /export?format=csv に置換
  return url.replace(/\/edit(\?.*)?$/, "/export?format=csv");
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
  // 名前
  if (data["名前"]) {
    const nameEl = document.getElementById("profile-name");
    nameEl.textContent = data["名前"];
    nameEl.classList.remove("skeleton-text");
    document.title = `${data["名前"]} | Portfolio`;
  }

  // キャッチフレーズ
  if (data["キャッチフレーズ"] || data["キャッチコピー"]) {
    const catchphrase = data["キャッチフレーズ"] || data["キャッチコピー"];
    const catchEl = document.getElementById("profile-catchphrase");
    catchEl.textContent = catchphrase;
    catchEl.classList.remove("skeleton-text", "skeleton-sub");
  }

  // プロフィール文
  if (data["プロフィール文"]) {
    const bioEl = document.getElementById("profile-bio");
    bioEl.textContent = data["プロフィール文"];
    bioEl.classList.remove("skeleton-block");
  }

  // X (Twitter)
  if (data["X"]) {
    const xLink = document.getElementById("link-x");
    xLink.href = data["X"];
    xLink.classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  loadProfileData();
});
