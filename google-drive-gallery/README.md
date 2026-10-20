# Bardanga Yuba Sangha — Drive + Sheets PDF Backend

## What it supports
- Saves member details in Google Sheets and automatically creates a PDF in Google Drive.
- Saves notice details in Google Sheets and automatically creates a PDF in Google Drive.
- Admin-PIN-protected add, edit and delete actions for members and notices.
- Admin-PIN-protected gallery uploads for images, videos and PDFs.
- Public read endpoints for gallery, members and notices.

## Prepare Google Drive and Sheets
1. Create a Google Drive folder for the gallery and generated PDFs.
2. Create a Google Spreadsheet with two tabs named exactly `Members` and `Notices`.
3. Put these headers in row 1:
   - **Members:** `Created | Name | Phone | Age | Role | Photo URL | PDF URL`
   - **Notices:** `Created | Title | Details | Attachment URL | PDF URL`
4. Open https://script.google.com/ and create a project. Copy `Code.gs` into the editor and save.
5. In **Project Settings → Script Properties**, add:
   - `GALLERY_FOLDER_ID`: the Drive folder ID.
   - `DATA_SPREADSHEET_ID`: the spreadsheet ID.
   - `GALLERY_ADMIN_PIN`: a new private PIN for backend admin actions.
6. Deploy → **New deployment** → **Web app**. Set **Execute as: Me**, choose access that allows public read requests, authorize Drive/Sheets, and deploy.
7. Copy the Web App URL ending in `/exec`. The website frontend still needs this URL configured before the forms can use the backend.

## Read endpoints
- `GET /exec?action=gallery`
- `GET /exec?action=members`
- `GET /exec?action=notices`

## Admin POST actions
Send JSON with `pin` and one of:
- `addMember`: `name`, `phone`, `age`, `role`, optional `photoUrl`
- `editMember`: same fields plus `row`
- `deleteMember`: `row`
- `addNotice`: `title`, `details`, optional `fileUrl`
- `editNotice`: same fields plus `row`
- `deleteNotice`: `row`
- `upload`: `files` array of `name`, `mimeType`, `data` (base64)
- `deleteFile`: Drive file `id`

Successful member/notice creation or editing returns `pdfUrl`. PDFs and uploaded files are saved to the Drive folder. Files are shared as **Anyone with the link — Viewer**, so do not store confidential member information or private notices in this public folder. Publish phone numbers and photos only with consent.

## Limits and security
- Each uploaded file is limited to 8 MB; Apps Script payload limits can be lower.
- Never commit or share the admin PIN.
- The PIN is a shared-secret check, not full identity-based authentication. For stronger security, use Google sign-in and server-side access controls.
- Apps Script cross-origin requests can be restricted; test the deployment before public launch.
