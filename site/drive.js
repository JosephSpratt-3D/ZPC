import {googleClientId} from './google-config.js';
// Browser OAuth: client IDs are public; access tokens stay in memory only.
const SCOPE='https://www.googleapis.com/auth/drive.file';
let token='',expiresAt=0;
export function configured(){return !!clientId();}
function clientId(){const id=googleClientId.trim();return /^.+\.apps\.googleusercontent\.com$/.test(id)?id:'';}
export const connected=()=>!!token&&Date.now()<expiresAt;
export function disconnect(){if(token&&window.google?.accounts)window.google.accounts.oauth2.revoke(token,()=>{});token='';expiresAt=0;}
export function connect(){return new Promise((resolve,reject)=>{const id=clientId();if(!id)return reject(Error('Google sign-in setup is pending. The workspace owner needs to configure the website’s Google client ID.'));if(!window.google?.accounts?.oauth2)return reject(Error('Google sign-in has not loaded. Check your connection or content blocker, then try again.'));const client=window.google.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPE,callback:r=>{if(r.error)return reject(Error(r.error_description||r.error));token=r.access_token;expiresAt=Date.now()+(r.expires_in-60)*1000;resolve();},error_callback:e=>reject(Error(e.type==='popup_closed'?'Sign-in was closed.':e.message||'Google sign-in failed.'))});client.requestAccessToken({prompt:'select_account'});});}
async function request(path,options={}){if(!connected())throw Error('Connect Google Drive to continue.');const r=await fetch('https://www.googleapis.com/'+path,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});if(!r.ok){const e=await r.json().catch(()=>({}));if(r.status===401){token='';throw Error('Your Google session expired. Connect Drive again.');}throw Error(e.error?.message||`Google Drive request failed (${r.status}).`);}return r.status===204?null:r.json();}
export async function listBackups(){const q=encodeURIComponent("trashed = false and appProperties has { key='zpcType' and value='setup' }");const all=[];let next='';do{const r=await request(`drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,modifiedTime,appProperties,webViewLink)&pageSize=100&orderBy=modifiedTime%20desc${next?'&pageToken='+encodeURIComponent(next):''}`);all.push(...r.files);next=r.nextPageToken;}while(next);return all;}
async function upload(name,blob,type,extra={}){const boundary='zpc_'+crypto.randomUUID();const meta={name,mimeType:type,...extra};const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(meta),`\r\n--${boundary}\r\nContent-Type: ${type}\r\n\r\n`,blob,`\r\n--${boundary}--`]);return request('upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});}
export async function saveToDrive(sheet,pdf){
 const folder=await request('drive/v3/files?fields=id,name,webViewLink',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'ZPC - '+(sheet.partNumber||sheet.title)+' - '+new Date().toISOString().slice(0,16).replace(':','-'),mimeType:'application/vnd.google-apps.folder'})});
 const common={parents:[folder.id]};
 // Save portable source first: it includes photos, captions and PDF attachments.
 await upload('setup-sheet.zpc.json',new Blob([JSON.stringify({version:1,sheet})],{type:'application/json'}),'application/json',{...common,appProperties:{zpcType:'setup',sheetId:sheet.id,title:sheet.title.slice(0,120),revision:String(sheet.revision||'A').slice(0,100)}});
 await upload('setup-sheet.pdf',pdf,'application/pdf',common);
 for(let i=0;i<sheet.photos.length;i++){const p=sheet.photos[i];await upload(`${String(i+1).padStart(2,'0')}-${p.name.replace(/\.[^.]+$/,'')}.jpg`,await(await fetch(p.data)).blob(),'image/jpeg',common);}
 for(const a of sheet.attachments||[])await upload(a.name,await(await fetch(a.data)).blob(),'application/pdf',common);
 return `https://drive.google.com/drive/folders/${folder.id}`;
}
export async function restoreFromDrive(id){const r=await request(`drive/v3/files/${encodeURIComponent(id)}?alt=media`);if(r.version!==1||!r.sheet)throw Error('Unrecognized setup sheet format.');return r.sheet;}
