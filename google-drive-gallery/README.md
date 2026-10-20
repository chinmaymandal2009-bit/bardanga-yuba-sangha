# Bardanga Yuba Sangha — Google Drive Gallery Setup

## What this backend does
- Accepts batches of up to 10 images/videos.
- Saves files in a chosen Google Drive folder.
- Returns a list for a public gallery.
- Checks an admin PIN on the server before upload.
- Makes uploaded files viewable by anyone with the link (needed for a public gallery).

## Deploy it
1. Open https://script.google.com/ and create a new project.
2. Copy the contents of `Code.gs` from this folder into the Apps Script editor.
3. In Apps Script, open **Project Settings** → **Script Properties** and add:
   - `GALLERY_FOLDER_ID`: the ID of the Google Drive folder that should hold gallery files.
   - `GALLERY_ADMIN_PIN`: create a new, unique admin PIN. Do not reuse a PIN used elsewhere.
4. Save the project.
5. Choose **Deploy** → **New deployment** → gear icon → **Web app**.
6. Set **Execute as** to **Me**. Set access to the minimum option that still lets your public website call the gallery. Apps Script access choices may vary by account.
7. Deploy, authorize Drive access, and copy the Web App URL ending in `/exec`.

## Important
- This is the backend starter. The website still needs the deployed Web App URL connected to its gallery UI before upload/listing works end-to-end.
- Never add the admin PIN or private credentials to GitHub.
- Apps Script and browser request/response restrictions can affect cross-origin requests; test the deployed app before public use.
- The sample code sets uploaded files to **Anyone with the link — Viewer**. Do not upload sensitive/private files.
- The per-file limit in the code is 25 MB, but Google Apps Script has request limits; very large videos should be uploaded directly through Drive or handled by a more suitable upload service.
