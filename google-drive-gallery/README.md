# Bardanga Yuba Sangha — Google Drive, Members & Notices

## Backend features
- Lists public gallery files from a Google Drive folder.
- Admin PIN-protected upload for images, videos and PDF files (1–10 files per batch; 8 MB per file in this starter).
- Saves member records and notice text/attachment links in Google Sheets.
- Admin PIN-protected delete actions for members, notices and files.
- Public read endpoints for the members list, notice board and gallery.

## Setup
1. Create a Google Drive folder for gallery uploads.
2. Create a Google Sheet with two tabs named exactly `Members` and `Notices`.
   - Members columns in row 1: `Created | Name | Role | Phone | Photo URL`
   - Notices columns in row 1: `Created | Title | Details | File URL`
3. Open https://script.google.com/ and create a project.
4. Copy `Code.gs` from this folder into the Apps Script editor and save.
5. Open **Project Settings → Script Properties** and add:
   - `GALLERY_FOLDER_ID`: ID of the Drive folder for gallery uploads.
   - `DATA_SPREADSHEET_ID`: ID of the Google Sheet.
   - `GALLERY_ADMIN_PIN`: a new private PIN used only for this admin backend.
6. Deploy → **New deployment** → Web app. Set **Execute as: Me** and choose access that permits the public website to read the public endpoints. Authorize Drive and Sheets access.
7. Copy the deployed Web App URL ending in `/exec`. The website frontend must be configured with that URL to enable live reading and admin actions.

## Endpoints
- `GET /exec?action=gallery`
- `GET /exec?action=members`
- `GET /exec?action=notices`
- `POST` JSON body with `pin` and action `upload`, `addMember`, `addNotice`, `deleteMember`, `deleteNotice`, or `deleteFile`.

## Security and limits
- Never put the admin PIN in public GitHub code or share it in chat.
- Public gallery uploads are shared as **Anyone with the link — Viewer**. Do not upload sensitive/private files.
- This starter limits each file to 8 MB because Apps Script request payloads have practical limits. Larger videos should be uploaded directly to Drive or via a more suitable upload service.
- Apps Script cross-origin browser requests can have restrictions; verify the deployed endpoint and frontend integration before public use.
- Members' phone numbers are returned by the public read endpoint in this starter. Only store/publish phone numbers with members' consent; if those should be private, change the read policy before launch.
- The admin PIN gate is a basic shared secret, not a replacement for Google account authentication or a production admin identity system.
