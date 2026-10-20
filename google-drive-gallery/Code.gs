/**
 * Bardanga Yuba Sangha — Google Drive Gallery backend
 *
 * Install in script.google.com as Code.gs.
 * Script Properties required:
 *   GALLERY_FOLDER_ID = your Google Drive gallery folder ID
 *   GALLERY_ADMIN_PIN = a new private admin PIN (do not put it in public GitHub code)
 *
 * Deploy as a Web App, execute as you, and choose access appropriate for your site.
 * The PIN is checked server-side. Do not use the old member-login PIN here.
 */
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file; Apps Script request limits may be lower.

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "list";
  if (action !== "list") return output_({ ok: false, error: "Unsupported action" });
  try {
    const folder = getGalleryFolder_();
    const files = [];
    const iterator = folder.getFiles();
    while (iterator.hasNext()) {
      const file = iterator.next();
      if (file.isTrashed()) continue;
      files.push({
        id: file.getId(),
        name: file.getName(),
        mimeType: file.getMimeType(),
        url: file.getUrl(),
        downloadUrl: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()),
        thumbnailUrl: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(file.getId()) + "&sz=w1200",
        updated: file.getLastUpdated().toISOString()
      });
    }
    files.sort((a, b) => b.updated.localeCompare(a.updated));
    return output_({ ok: true, files: files });
  } catch (err) {
    return output_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const expectedPin = PropertiesService.getScriptProperties().getProperty("GALLERY_ADMIN_PIN");
    if (!expectedPin || !body.pin || body.pin !== expectedPin) {
      return output_({ ok: false, error: "Invalid admin PIN" });
    }
    if (body.action !== "upload") return output_({ ok: false, error: "Unsupported action" });
    if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > 10) {
      return output_({ ok: false, error: "Select between 1 and 10 files per batch" });
    }

    const folder = getGalleryFolder_();
    const uploaded = [];
    body.files.forEach(function(item) {
      if (!item || typeof item.name !== "string" || typeof item.mimeType !== "string" || typeof item.data !== "string") {
        throw new Error("Invalid file data");
      }
      const bytes = Utilities.base64Decode(item.data);
      if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error("Each file must be under 25 MB");
      if (!/^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime|ogg))$/i.test(item.mimeType)) {
        throw new Error("Only common image and video formats are allowed");
      }
      const safeName = item.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "gallery-file";
      const blob = Utilities.newBlob(bytes, item.mimeType, safeName);
      const file = folder.createFile(blob);
      // Public gallery requirement: visitors with the link can view the uploaded media.
      // Change this policy if the gallery should be private.
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      uploaded.push({ id: file.getId(), name: file.getName(), url: file.getUrl() });
    });
    return output_({ ok: true, uploaded: uploaded });
  } catch (err) {
    return output_({ ok: false, error: String(err && err.message || err) });
  }
}

function getGalleryFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty("GALLERY_FOLDER_ID");
  if (!id) throw new Error("Set GALLERY_FOLDER_ID in Script Properties");
  return DriveApp.getFolderById(id);
}

function output_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
