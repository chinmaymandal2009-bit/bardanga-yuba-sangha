/**
 * Bardanga Yuba Sangha — Drive + Sheets backend.
 * Script Properties: GALLERY_FOLDER_ID, GALLERY_ADMIN_PIN, DATA_SPREADSHEET_ID.
 * Spreadsheet tabs/headers:
 * Members: Created | Name | Phone | Age | Role | Photo URL | PDF URL
 * Notices: Created | Title | Details | Attachment URL | PDF URL
 */
const MAX_FILE_BYTES = 8 * 1024 * 1024;
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "gallery";
    if (action === "members") return respond_(e,{ok:true,members:listRows_("Members")});
    if (action === "notices") return json_({ok:true,notices:listRows_("Notices")});
    if (action !== "gallery") throw new Error("Unknown action");
    const it = galleryFolder_().getFiles(), files = [];
    while (it.hasNext()) {
      const f = it.next(); if (f.isTrashed()) continue;
      files.push({id:f.getId(),name:f.getName(),mimeType:f.getMimeType(),url:f.getUrl(),
        thumbnailUrl:"https://drive.google.com/thumbnail?id="+encodeURIComponent(f.getId())+"&sz=w1200",
        downloadUrl:"https://drive.google.com/uc?export=download&id="+encodeURIComponent(f.getId()),
        updated:f.getLastUpdated().toISOString()});
    }
    files.sort((a,b)=>b.updated.localeCompare(a.updated));
    return json_({ok:true,files:files});
  } catch(err) { return json_({ok:false,error:String(err.message||err)}); }
}
function doPost(e) {
  try {
    const b=JSON.parse((e&&e.postData&&e.postData.contents)||"{}");
    const pin=PropertiesService.getScriptProperties().getProperty("GALLERY_ADMIN_PIN");
    if(!pin||String(b.pin||"")!==pin) throw new Error("Invalid admin PIN");
    if(b.action==="addMember"||b.action==="editMember") {
      const name=clean_(b.name,100), phone=clean_(b.phone,40), age=clean_(b.age,3), role=clean_(b.role,100), photo=clean_(b.photoUrl,500);
      if(!name) throw new Error("Member name is required");
      const pdf=createPdf_("Member Details - "+name,[["Member Details",""],["Name",name],["Phone",phone||"Not provided"],["Age",age||"Not provided"],["Role",role||"Not provided"],["Photo URL",photo||"Not provided"]]);
      const values=[new Date(),name,phone,age,role,photo,pdf.getUrl()];
      if(b.action==="addMember") sheet_("Members").appendRow(values); else updateRow_("Members",b.row,values);
      return json_({ok:true,pdfUrl:pdf.getUrl()});
    }
    if(b.action==="addNotice"||b.action==="editNotice") {
      const title=clean_(b.title,180), details=clean_(b.details,5000), attachment=clean_(b.fileUrl,500);
      if(!title||!details) throw new Error("Notice title and details are required");
      const pdf=createPdf_("Notice - "+title,[["Notice",""],["Title",title],["Date",new Date().toLocaleDateString()],["Details",details],["Attachment URL",attachment||"None"]]);
      const values=[new Date(),title,details,attachment,pdf.getUrl()];
      if(b.action==="addNotice") sheet_("Notices").appendRow(values); else updateRow_("Notices",b.row,values);
      return json_({ok:true,pdfUrl:pdf.getUrl()});
    }
    if(b.action==="deleteMember"||b.action==="deleteNotice") {
      const s=sheet_(b.action==="deleteMember"?"Members":"Notices"), row=Number(b.row);
      if(!Number.isInteger(row)||row<2||row>s.getLastRow()) throw new Error("Invalid row");
      s.deleteRow(row); return json_({ok:true});
    }
    if(b.action==="deleteFile") { DriveApp.getFileById(String(b.id||"")).setTrashed(true); return json_({ok:true}); }
    if(b.action==="upload") {
      if(!Array.isArray(b.files)||!b.files.length||b.files.length>10) throw new Error("Choose 1–10 files per upload");
      const uploaded=[];
      b.files.forEach(function(item){
        if(!item||typeof item.data!=="string"||typeof item.name!=="string") throw new Error("Invalid file");
        const bytes=Utilities.base64Decode(item.data);
        if(!bytes.length||bytes.length>MAX_FILE_BYTES) throw new Error("Each file must be under 8 MB");
        const mime=String(item.mimeType||"");
        if(!/^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime|ogg)|application\/pdf)$/i.test(mime)) throw new Error("Only images, videos and PDF files are supported");
        const name=item.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,"_").slice(0,180)||"upload";
        const f=galleryFolder_().createFile(Utilities.newBlob(bytes,mime,name));
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
        uploaded.push({id:f.getId(),name:f.getName(),mimeType:f.getMimeType(),url:f.getUrl(),downloadUrl:"https://drive.google.com/uc?export=download&id="+encodeURIComponent(f.getId())});
      });
      return json_({ok:true,uploaded:uploaded});
    }
    throw new Error("Unknown action");
  } catch(err) { return json_({ok:false,error:String(err.message||err)}); }
}
function listRows_(tab) {
  const s=sheet_(tab); if(s.getLastRow()<2) return [];
  const values=s.getRange(2,1,s.getLastRow()-1,s.getLastColumn()).getDisplayValues();
  return values.map(function(r,i){const row=i+2;return tab==="Members"
    ? {row:row,created:r[0]||"",name:r[1]||"",phone:r[2]||"",age:r[3]||"",role:r[4]||"",photoUrl:r[5]||"",pdfUrl:r[6]||""}
    : {row:row,created:r[0]||"",title:r[1]||"",details:r[2]||"",fileUrl:r[3]||"",pdfUrl:r[4]||""};}).reverse();
}
function createPdf_(title,pairs) {
  const esc=function(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");};
  const rows=pairs.map(function(p){return "<tr><th>"+esc(p[0])+"</th><td>"+esc(p[1]).replace(/\n/g,"<br>")+"</td></tr>";}).join("");
  const html='<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#23131b;padding:30px}h1{color:#6c1e3a;border-bottom:2px solid #d6aa52;padding-bottom:12px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd;vertical-align:top}th{width:28%;color:#6c1e3a}</style></head><body><h1>'+esc(title)+'</h1><table>'+rows+'</table><p>Generated by Bardanga Yuba Sangha</p></body></html>';
  const name=clean_(title,100).replace(/[^a-z0-9 -]/gi,"_");
  const blob=Utilities.newBlob(html,"text/html",name+".html").getAs("application/pdf").setName(name+".pdf");
  const file=galleryFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  return file;
}
function updateRow_(tab,rowValue,values) {
  const s=sheet_(tab),row=Number(rowValue);
  if(!Number.isInteger(row)||row<2||row>s.getLastRow()) throw new Error("Invalid row");
  s.getRange(row,1,1,values.length).setValues([values]);
}
function galleryFolder_(){const id=PropertiesService.getScriptProperties().getProperty("GALLERY_FOLDER_ID");if(!id)throw new Error("Set GALLERY_FOLDER_ID in Script Properties");return DriveApp.getFolderById(id);}
function sheet_(tab){const id=PropertiesService.getScriptProperties().getProperty("DATA_SPREADSHEET_ID");if(!id)throw new Error("Set DATA_SPREADSHEET_ID in Script Properties");const s=SpreadsheetApp.openById(id).getSheetByName(tab);if(!s)throw new Error("Create a spreadsheet tab named "+tab);return s;}
function clean_(v,n){return String(v==null?"":v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").trim().slice(0,n);}
function json_(d){return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON);}
function respond_(e,d){const cb=String((e&&e.parameter&&e.parameter.callback)||"");if(cb&&/^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(cb))return ContentService.createTextOutput(cb+"("+JSON.stringify(d)+");").setMimeType(ContentService.MimeType.JAVASCRIPT);return json_(d);}
