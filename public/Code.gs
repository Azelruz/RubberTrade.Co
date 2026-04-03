/**
 * Rubber Latex Trading System - Google Sheets API
 * Deploy as Web App, Execute as: Me, Who has access: Anyone
 */

const SHEET_USERS = "Users";
const SHEET_SETTINGS = "Settings";
const SHEET_BUY = "Buy";
const SHEET_SELL = "Sell";
const SHEET_FARMERS = "Farmers";
const SHEET_EMPLOYEES = "Employees";
const SHEET_PRICE_HISTORY = "PriceHistory";
const SHEET_STAFF = "Staff";
const SHEET_EXPENSES = "Expenses";
const SHEET_WAGES = "Wages";
const SHEET_PROMOTIONS = "Promotions";

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheets = [SHEET_USERS, SHEET_SETTINGS, SHEET_BUY, SHEET_SELL, SHEET_FARMERS, SHEET_EMPLOYEES, SHEET_PRICE_HISTORY];
  sheets.forEach(name => {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  });

  // Setup Headers
  const buySheet = ss.getSheetByName(SHEET_BUY);
  if (buySheet.getLastRow() === 0) {
    buySheet.appendRow(["id", "date", "farmerName", "weight", "drc", "bonus", "pricePerKg", "total", "note", "timestamp"]);
  }

  const sellSheet = ss.getSheetByName(SHEET_SELL);
  if (sellSheet.getLastRow() === 0) {
    sellSheet.appendRow(["id", "date", "buyerName", "weight", "drc", "pricePerKg", "total", "receiptUrl", "note", "timestamp"]);
  }

  const usersSheet = ss.getSheetByName(SHEET_USERS);
  if (usersSheet.getLastRow() === 0) {
    usersSheet.appendRow(["username", "password", "role"]);
    usersSheet.appendRow(["admin", "admin123", "admin"]);
  }
  
  const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(["key", "value"]);
    settingsSheet.appendRow(["factoryName", "ร้านรับซื้อน้ำยางพารา (ชื่อบริษัท)"]);
    settingsSheet.appendRow(["basePrice", "50"]);
  }

  const farmersSheet = ss.getSheetByName(SHEET_FARMERS);
  if (farmersSheet.getLastRow() === 0) {
    farmersSheet.appendRow(["id", "name", "phone", "bankAccount", "bankName", "address", "note", "timestamp"]);
  }

  const employeesSheet = ss.getSheetByName(SHEET_EMPLOYEES);
  if (employeesSheet.getLastRow() === 0) {
    employeesSheet.appendRow(["id", "name", "phone", "bankAccount", "bankName", "profitSharePct", "farmerId", "note", "timestamp"]);
  }

  const priceHistorySheet = ss.getSheetByName(SHEET_PRICE_HISTORY);
  if (priceHistorySheet.getLastRow() === 0) {
    priceHistorySheet.appendRow(["date", "price", "timestamp"]);
  }

  const staffSheet = ss.getSheetByName(SHEET_STAFF);
  if (!staffSheet || staffSheet.getLastRow() === 0) {
    const s = staffSheet || ss.insertSheet(SHEET_STAFF);
    if (s.getLastRow() === 0) {
      s.appendRow(["id", "name", "address", "phone", "salary", "bonus", "note", "timestamp"]);
    }
  }

  // Expenses sheet
  if (!ss.getSheetByName(SHEET_EXPENSES)) ss.insertSheet(SHEET_EXPENSES);
  const expSheet = ss.getSheetByName(SHEET_EXPENSES);
  if (expSheet.getLastRow() === 0) {
    expSheet.appendRow(["id", "date", "category", "description", "amount", "note", "timestamp"]);
  }

  // Wages sheet
  if (!ss.getSheetByName(SHEET_WAGES)) ss.insertSheet(SHEET_WAGES);
  const wagesSheet = ss.getSheetByName(SHEET_WAGES);
  if (wagesSheet.getLastRow() === 0) {
    wagesSheet.appendRow(["id", "date", "staffId", "staffName", "workDays", "dailyWage", "bonus", "total", "note", "timestamp"]);
  }

  // Promotions sheet
  if (!ss.getSheetByName(SHEET_PROMOTIONS)) ss.insertSheet(SHEET_PROMOTIONS);
  const promoSheet = ss.getSheetByName(SHEET_PROMOTIONS);
  if (promoSheet.getLastRow() === 0) {
    promoSheet.appendRow(["id", "date", "farmerId", "farmerName", "pointsUsed", "rewardName", "timestamp"]);
  }
}

function doGet(e) {
  // Add CORS Headers directly since Web App doesn't fully support it by default
  const action = e.parameter.action;
  
  try {
    if (action === "getBuyRecords") {
      return responseJson(getRecords(SHEET_BUY));
    } else if (action === "getSellRecords") {
      return responseJson(getRecords(SHEET_SELL));
    } else if (action === "getSettings") {
      return responseJson(getSettings());
    } else if (action === "getFarmers") {
      return responseJson(getRecords(SHEET_FARMERS));
    } else if (action === "getEmployees") {
      return responseJson(getRecords(SHEET_EMPLOYEES));
    } else if (action === "getStaff") {
      return responseJson(getRecords(SHEET_STAFF));
    } else if (action === "getExpenses") {
      return responseJson(getRecords(SHEET_EXPENSES));
    } else if (action === "getWages") {
      return responseJson(getRecords(SHEET_WAGES));
    } else if (action === "getPromotions") {
      return responseJson(getRecords(SHEET_PROMOTIONS));
    } else if (action === "getDailyPrice") {
      return responseJson(getDailyPrice());
    } else if (action === "getDashboardData") {
      return responseJson(getDashboardData());
    } else if (action === "setup") {
      setupSheets();
      return responseJson({ status: "success", message: "Sheets setup completed!" });
    }
    return responseJson({ status: "error", message: "Invalid action" });
  } catch (error) {
    return responseJson({ status: "error", message: error.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "login") {
      return responseJson(handleLogin(data.username, data.password));
    } else if (action === "addBuyRecord") {
      return responseJson(addRecord(SHEET_BUY, data.payload));
    } else if (action === "addSellRecord") {
      return responseJson(addRecord(SHEET_SELL, data.payload));
    } else if (action === "addFarmer") {
      return responseJson(addRecord(SHEET_FARMERS, data.payload));
    } else if (action === "addEmployee") {
      return responseJson(addRecord(SHEET_EMPLOYEES, data.payload));
    } else if (action === "addStaff") {
      return responseJson(addRecord(SHEET_STAFF, data.payload));
    } else if (action === "addExpense") {
      return responseJson(addRecord(SHEET_EXPENSES, data.payload));
    } else if (action === "addWage") {
      return responseJson(addRecord(SHEET_WAGES, data.payload));
    } else if (action === "addBulkWages") {
      return responseJson(addBulkWages(SHEET_WAGES, data.payloads));
    } else if (action === "addPromotion") {
      return responseJson(addRecord(SHEET_PROMOTIONS, data.payload));
    } else if (action === "deleteRecord") {
      return responseJson(deleteRecord(data.sheetName, data.id));
    } else if (action === "updateSettings") {
      return responseJson(updateSettings(data.payload));
    } else if (action === "updateDailyPrice") {
      return responseJson(updateDailyPrice(data.payload.price));
    } else if (action === "saveReceiptImage") {
      return responseJson(saveReceiptImage(data.payload));
    } else if (action === "updateRecord") {
      return responseJson(updateRecord(data.sheetName, data.id, data.updates));
    } else if (action === "deleteReceiptFile") {
      return responseJson(deleteReceiptFile(data.fileUrl));
    }

    return responseJson({ status: "error", message: "Invalid POST action" });
  } catch (error) {
    return responseJson({ status: "error", message: error.toString() });
  }
}

// --- Handlers ---

function handleLogin(username, password) {
  const records = getRecords(SHEET_USERS);
  const user = records.find(r => r.username === username && r.password === password);
  if (user) {
    return { status: "success", user: { username: user.username, role: user.role } };
  }
  return { status: "error", message: "Invalid username or password" };
}

function getSettings() {
  const records = getRecords(SHEET_SETTINGS);
  const settings = {};
  records.forEach(r => {
    settings[r.key] = r.value;
  });
  return { status: "success", data: settings };
}

function getDailyPrice() {
  const records = getRecords(SHEET_PRICE_HISTORY);
  // Records are reversed, so the first one is the latest
  const latest = records.length > 0 ? records[0] : null;
  
  if (!latest) {
    // Fallback to basePrice from Settings if no history
    const settings = getSettings().data;
    return { status: "success", data: { price: settings.basePrice || "0", date: new Date().toISOString().split('T')[0] } };
  }
  
  return { status: "success", data: latest };
}

function updateDailyPrice(price) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRICE_HISTORY);
  const today = new Date().toISOString().split('T')[0];
  
  // Check if today's entry already exists
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    // Assuming date is in the first column
    const cellDate = data[i][0];
    if (cellDate) {
      try {
        const rowDate = new Date(cellDate).toISOString().split('T')[0];
        if (rowDate === today) {
          rowIndex = i + 1;
          break;
        }
      } catch (e) {
        // Skip invalid or empty dates peacefully
      }
    }
  }
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 2).setValue(price);
    sheet.getRange(rowIndex, 3).setValue(new Date().toISOString());
  } else {
    sheet.appendRow([today, price, new Date().toISOString()]);
  }
  
  // Also update basePrice in Settings for compatibility/fallback
  updateSettings({ basePrice: price });
  
  return { status: "success", message: "Daily price updated" };
}

function updateSettings(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  for (const [key, value] of Object.entries(payload)) {
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
            rowIndex = i + 1;
            break;
        }
    }
    if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 2).setValue(value);
    } else {
        sheet.appendRow([key, value]);
    }
  }
  return { status: "success", message: "Settings updated" };
}

function getRecords(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const record = {};
    headers.forEach((header, index) => {
      const val = row[index];
      // Convert Date objects to local timezone string to prevent UTC offset issues
      if (val instanceof Date && !isNaN(val.getTime())) {
        record[header] = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      } else {
        record[header] = val;
      }
    });
    records.push(record);
  }
  
  // Return reversed to show latest first
  return records.reverse();
}

// Returns only records with 'date' >= cutoffDateStr (yyyy-MM-dd), much faster for large sheets
function getRecentRecords(sheetName, cutoffDateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  const dateIndex = headers.indexOf('date');
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Fast pre-filter: skip rows older than cutoff before building full object
    if (cutoffDateStr && dateIndex !== -1) {
      const rawDate = row[dateIndex];
      let dateStr = '';
      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        dateStr = Utilities.formatDate(rawDate, tz, 'yyyy-MM-dd');
      } else {
        dateStr = String(rawDate || '');
      }
      if (dateStr < cutoffDateStr) continue;
    }
    
    const record = {};
    headers.forEach((header, index) => {
      const val = row[index];
      if (val instanceof Date && !isNaN(val.getTime())) {
        record[header] = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      } else {
        record[header] = val;
      }
    });
    records.push(record);
  }
  
  return records.reverse();
}

// Batch fetch all data needed by the Dashboard in a single API call
function getDashboardData() {
  const tz = Session.getScriptTimeZone();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // Last 90 days
  const cutoffStr = Utilities.formatDate(cutoffDate, tz, 'yyyy-MM-dd');
  
  return {
    buys:     getRecentRecords(SHEET_BUY,      cutoffStr),
    sells:    getRecentRecords(SHEET_SELL,     cutoffStr),
    expenses: getRecentRecords(SHEET_EXPENSES, cutoffStr),
    wages:    getRecentRecords(SHEET_WAGES,    cutoffStr),
    staff:    getRecords(SHEET_STAFF),
    dailyPrice: getDailyPrice().data
  };
}

function addRecord(sheetName, payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const newRow = headers.map(header => {
    if (header === 'id') {
      return sheetName === SHEET_BUY ? generateBuyId(sheet) : generateId();
    }
    if (header === 'timestamp') return new Date().toISOString();
    return payload[header] !== undefined ? payload[header] : '';
  });
  
  sheet.appendRow(newRow);
  return { status: "success", message: "Record added successfully", id: newRow[0] };
}

function addBulkWages(sheetName, payloads) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (!payloads || payloads.length === 0) {
      return { status: "error", message: "No payloads provided" };
  }

  const newRows = payloads.map(payload => {
    return headers.map(header => {
      if (header === 'id') return generateId();
      if (header === 'timestamp') return new Date().toISOString();
      return payload[header] !== undefined ? payload[header] : '';
    });
  });
  
  sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  return { status: "success", message: `${newRows.length} wage records added successfully` };
}

function deleteRecord(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet not found" };
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: "error", message: "No data in sheet" };
  
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) return { status: "error", message: "ID column not found" };
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Record deleted successfully" };
    }
  }
  return { status: "error", message: "Record not found (ID: " + id + ")" };
}

function updateRecord(sheetName, id, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet not found" };
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: "error", message: "No data in sheet" };
  
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) return { status: "error", message: "ID column not found" };
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === String(id).trim()) {
      for (const [k, v] of Object.entries(updates)) {
        let colIndex = headers.indexOf(k);
        if (colIndex === -1) {
          // adding a new header column dynamically
          colIndex = headers.length;
          sheet.getRange(1, colIndex + 1).setValue(k);
          headers.push(k);
        }
        sheet.getRange(i + 1, colIndex + 1).setValue(v !== undefined ? v : '');
      }
      return { status: "success", message: "Record updated" };
    }
  }
  return { status: "error", message: "Record not found (ID: " + id + ")" };
}

function saveReceiptImage(payload) {
  try {
    const filename = payload.filename || "receipt_" + new Date().getTime() + ".png";
    let base64Data = payload.base64Data;
    
    if (!base64Data) {
      return { status: "error", message: "No image data received" };
    }
    
    // Strip base64 header if present (e.g. "data:image/png;base64,")
    const commaIdx = base64Data.indexOf(',');
    if (commaIdx !== -1) {
      base64Data = base64Data.substring(commaIdx + 1);
    }
    
    // Remove any whitespace or line breaks that might corrupt base64 decoding
    base64Data = base64Data.replace(/\s/g, '');
    
    if (base64Data.length === 0) {
      return { status: "error", message: "Empty image data after parsing" };
    }
    
    const decoded = Utilities.base64Decode(base64Data, Utilities.Charset.UTF_8);
    if (!decoded || decoded.length < 100) {
      return { status: "error", message: "Decoded image too small, capture may have failed. Decoded bytes: " + (decoded ? decoded.length : 0) };
    }
    
    const blob = Utilities.newBlob(decoded, MimeType.PNG, filename);
    
    // Find or create "RubberReceipts" folder
    const folderName = "RubberReceipts";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    const file = folder.createFile(blob);
    // CRITICAL: make the file viewable by anyone with the link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { status: "success", message: "Image saved (" + decoded.length + " bytes)", url: file.getUrl() };
  } catch(e) {
    return { status: "error", message: "saveReceiptImage error: " + String(e) };
  }
}

// --- Utils ---
function generateId() {
  return Utilities.getUuid();
}

function generateBuyId(sheet) {
  // Format: yyyy-MM-dd-NNNN (e.g. 2026-03-08-0001)
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  const data = sheet.getDataRange().getValues();
  const headers = data.length > 0 ? data[0] : [];
  const idIndex = headers.indexOf('id');
  
  let maxNum = 0;
  if (idIndex !== -1) {
    for (let i = 1; i < data.length; i++) {
      const cellId = String(data[i][idIndex]);
      if (cellId.startsWith(today + '-')) {
        const parts = cellId.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }
  
  const nextNum = String(maxNum + 1).padStart(4, '0');
  return today + '-' + nextNum;
}

function deleteReceiptFile(fileUrl) {
  try {
    if (!fileUrl) return { status: "error", message: "No file URL provided" };
    // Extract file ID from Drive URL formats:
    // https://drive.google.com/file/d/FILE_ID/view
    // https://drive.google.com/open?id=FILE_ID
    const match = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (!match) return { status: "error", message: "Could not extract file ID from URL: " + fileUrl };
    
    const fileId = match[1];
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return { status: "success", message: "File moved to trash: " + fileId };
  } catch(e) {
    return { status: "error", message: "deleteReceiptFile error: " + String(e) };
  }
}

function responseJson(data) {
  // Add CORS headers for fetch/axios
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
