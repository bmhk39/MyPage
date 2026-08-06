const fetch = require("node-fetch") || global.fetch;
const PROFILE_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR65BlNYQQyo3eRms3k9Y0mx4yu8A9uTskhQ34LKYpkHOHLdhCmn2uNX_wGiC4meYEycikSYdnOpciR/pub?output=csv";

function normalizeCsvUrl(url) {
  if (!url) return "";
  if (url.includes("/pub?") || url.includes("output=csv")) {
    return url;
  }
  return url.replace(/\/edit(\?.*)?$/, "/export?format=csv");
}

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

async function loadProfileData() {
  const csvUrl = normalizeCsvUrl(PROFILE_SPREADSHEET_URL);
  const response = await fetch(csvUrl);
  const csvText = await response.text();
  const rows = parseCsvRows(csvText);
  
  const profileData = {};
  rows.forEach(row => {
    if (row.length >= 2) {
      profileData[row[0].trim()] = row[1].trim();
    }
  });
  console.log("Parsed Data:", profileData);
}
loadProfileData();
