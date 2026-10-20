/**
 * Bardanga Yuba Sangha — Google Drive + Sheets backend
 * Deploy as an Apps Script Web App. Required Script Properties:
 * GALLERY_FOLDER_ID, GALLERY_ADMIN_PIN, DATA_SPREADSHEET_ID
 * Spreadsheet tabs: Members and Notices. Keep the admin PIN private.
 */
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "gallery";
    if (action === "members") return json_({ ok: true, members: listRows_("Members") });
    if (action === "notices") return json_({ ok: true, notices: listRows_("Notices") });
    if (action !== "gallery") return json_({ ok: false, error: "Unknown action" });
    const folder = galleryFolder_();
    const it = folder.getFiles();
    const files = [];
    while (it.hasNext()) {
      const f = it.next();
      if (f.isTrashed()) continue;
      files.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(),
        url: f.getUrl(), thumbnailUrl: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(f.getId()) + "&sz=w1200",
        downloadUrl: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(f.getId()),
        updated: f.getLastUpdated().toISOString() });
    }
    files.sort((a,b) => b.updated.localeCompare(a.updated));
    return json_({ ok: true, files: files });
  } catch (err) { return json_({ ok: false, error: String(err.message || err) }); }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const pin = PropertiesService.getScriptProperties().getProperty("GALLERY_ADMIN_PIN");
    if (!pin || String(body.pin || "") !== pin) throw new Error("Invalid admin PIN");
    if (body.action === "addMember") {
      const name = clean_(body.name, 100), role = clean_(body.role, 100);
      if (!name || !role) throw new Error("Member name and role are required");
      sheet_("Members").appendRow([new Date(), name, role, clean_(body.phone, 40), clean_(body.photoUrl, 500)]);
      return json_({ ok: true });
    }
    if (body.action === "addNotice") {
      const title = clean_(body.title, 180), details = clean_(body.details, 5000);
      if (!title || !details) throw new Error("Notice title and details are required");
      sheet_("Notices").appendRow([new Date(), title, details, clean_(body.fileUrl, 500)]);
      return json_({ ok: true });
    }
    if (body.action === "deleteMember" || body.action === "deleteNotice") {
      const tab = body.action === "deleteMember" ? "Members" : "Notices";
      const row = Number(body.row);
      const s = sheet_(tab);
      if (!Number.isInteger(row) || row < 2 || row > s.getLastRow()) throw new Error("Invalid row");
      s.deleteRow(row);
      return json_({ ok: true });
    }
    if (body.action === "deleteFile") {
      DriveApp.getFileById(String(body.id || "")).setTrashed(true);
      return json_({ ok: true });
    }
    if (body.action === "upload") {
      if (!Array.isArray(body.files) || !body.files.length || body.files.length > 10) throw new Error("Choose 1–10 files per upload");
      const folder = galleryFolder_(), uploaded = [];
      body.files.forEach(function(item) {
        if (!item || typeof item.data !== "string" || typeof item.name !== "string") throw new Error("Invalid file");
        const bytes = Utilities.base64Decode(item.data);
        if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error("Each file must be under 8 MB");
        const mime = String(item.mimeType || "");
        if (!/^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime|ogg)|application\/pdf)$/i.test(mime)) throw new Error("Only images, videos and PDF files are supported");
        const name = item.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "upload";
        const file = folder.createFile(Utilities.newBlob(bytes, mime, name));
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        uploaded.push({ id: file.getId(), name: file.getName(), mimeType: file.getMimeType(), url: file.getUrl(),
          downloadUrl: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()) });
      });
      return json_({ ok: true, uploaded: uploaded });
    }
    throw new Error("Unknown action");
  } catch (err) { return json_({ ok: false, error: String(err.message || err) }); }
}

function listRows_(tab) {
  const s = sheet_(tab);
  if (s.getLastRow() < 2) return [];
  const values = s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getDisplayValues();
  return values.map(function(r, i) {
    const row = i + 2;
    return tab === "Members"
      ? { row: row, created: r[0] || "", name: r[1] || "", role: r[2] || "", phone: r[3] || "", photoUrl: r[4] || "" }
      : { row: row, created: r[0] || "", title: r[1] || "", details: r[2] || "", fileUrl: r[3] || "" };
  }).reverse();
}
function galleryFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty("GALLERY_FOLDER_ID");
  if (!id) throw new Error("Set GALLERY_FOLDER_ID in Script Properties");
  return DriveApp.getFolderById(id);
}
function sheet_(tab) {
  const id = PropertiesService.getScriptProperties().getProperty("DATA_SPREADSHEET_ID");
  if (!id) throw new Error("Set DATA_SPREADSHEET_ID in Script Properties");
  const s = SpreadsheetApp.openById(id).getSheetByName(tab);
  if (!s) throw new Error("Create a spreadsheet tab named " + tab);
  return s;
}
function clean_(v, n) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
}
function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
