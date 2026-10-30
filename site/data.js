export const templates = [
 {id:'mill',name:'3-axis milling',description:'A reliable starting point for prismatic parts, vise work, and plate machining.',machine:'Vertical machining center',workholding:'Precision vise with parallels. Indicate fixed jaw and confirm part seating.',datum:'G54 • X/Y at stock corner; Z at top of stock.',notes:'Confirm stock allowance and tool clearances. Run the first cycle in single block with reduced rapid override.',inspection:'Verify datum surfaces, critical dimensions, and deburr all edges before release.',tools:[{number:'1',description:'Face mill',diameter:'50 mm',holder:'Shell mill',rpm:'',feed:''},{number:'2',description:'Flat end mill',diameter:'10 mm',holder:'ER collet',rpm:'',feed:''}]},
 {id:'lathe',name:'CNC turning',description:'Document chucking, stick-out, tool stations, and turning operations.',machine:'CNC lathe',workholding:'3-jaw chuck with bored soft jaws. Confirm grip length and stock stick-out.',datum:'G54 • X0 on spindle centerline; Z0 at finished face.',notes:'Verify jaw clearance, spindle direction, and safe tool approach. Prove the program in single block.',inspection:'Inspect diameters, overall length, concentricity, and surface finish.',tools:[{number:'1',description:'OD turning tool',diameter:'',holder:'Turret station 1',rpm:'',feed:''},{number:'2',description:'Parting tool',diameter:'3 mm',holder:'Turret station 2',rpm:'',feed:''}]},
 {id:'blank',name:'Blank setup sheet',description:'Build your own process for a custom machine, fixture, or special operation.',machine:'',workholding:'',datum:'',notes:'',inspection:'',tools:[]}
];
export function newOperation(number='OP 10',values={}){return {id:crypto.randomUUID(),number,name:'',machine:'',program:'',workholding:'',jaws:'',stickOut:'',datum:'',setupNotes:'',notes:'',...values};}
export function normalizeSheet(input){
 const s=structuredClone(input);
 s.documentDate ||= String(s.createdAt||new Date().toISOString()).slice(0,10);
 s.materialSource ||= '';s.lessons ||= '';delete s.confidential;
 s.attachments ||= [];s.tools ||= [];s.photos ||= [];
 // Preserve legacy single-operation fields and migrate them into the first operation.
 if(!Array.isArray(s.operations))s.operations=[newOperation(s.operation||'OP 10',{machine:s.machine||'',program:s.program||'',workholding:s.workholding||'',datum:s.datum||'',notes:s.notes||''})];
 s.operations=s.operations.map(o=>({name:'',machine:'',program:'',workholding:'',jaws:'',stickOut:'',datum:'',setupNotes:'',notes:'',...o,id:o.id||crypto.randomUUID()}));
 return s;
}
export function newSheet(templateId='blank') { const t=templates.find(t=>t.id===templateId)||templates[2]; return normalizeSheet({id:crypto.randomUUID(),title:'',partNumber:'',revision:'A',operation:'OP 10',machine:t.machine,material:'',stock:'',program:'',workholding:t.workholding,datum:t.datum,notes:'',inspection:t.inspection,preparedBy:'',checkedBy:'',status:'Draft',templateId:t.id,tools:structuredClone(t.tools),photos:[],attachments:[],operations:[newOperation('OP 10',{machine:t.machine,workholding:t.workholding,datum:t.datum,notes:t.notes})],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sample:false}); }
export function demoSheets() { return [
 {...newSheet('mill'),id:'demo-cold-plate',title:'Mixing chamber plate',partNumber:'ZPC-MC-042',machine:'Haas VF-2',material:'OFHC copper',stock:'Ø160 × 18 mm',program:'O1042',operation:'OP 10 · Face & pocket',preparedBy:'Example operator',notes:'EXAMPLE ONLY — not a production instruction.\nFace stock, rough pockets, and finish bores. All feeds, speeds, and dimensions require engineering verification.',status:'Ready',sample:true,illustration:'plate'},
 {...newSheet('lathe'),id:'demo-flange',title:'Vacuum flange',partNumber:'ZPC-VF-018',machine:'Haas ST-20',material:'316L stainless steel',stock:'Ø80 × 45 mm',program:'O2018',operation:'OP 20 · Finish turn',preparedBy:'Example operator',notes:'EXAMPLE ONLY — not a production instruction.\nFinish face and bore. Protect sealing surfaces during handling. Verify current drawing and process before machining.',sample:true,illustration:'flange'},
 {...newSheet('mill'),id:'demo-bracket',title:'Thermal link bracket',partNumber:'ZPC-TL-006',machine:'Haas VF-2',material:'6061-T6 aluminum',stock:'100 × 60 × 25 mm',program:'O1006',operation:'OP 10 · Profile & drill',preparedBy:'Example operator',notes:'EXAMPLE ONLY — not a production instruction.\nConfirm orientation and fixture clearance. Verify current drawing and process before machining.',sample:true,illustration:'bracket'}
 ].map(s=>{delete s.operations;return normalizeSheet(s);}); }
let dbPromise;
function database(){return dbPromise ||= new Promise((resolve,reject)=>{const r=indexedDB.open('zpc-workspace',1);r.onupgradeneeded=()=>r.result.createObjectStore('sheets',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction(mode, action){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('sheets',mode);const r=action(tx.objectStore('sheets'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Storage transaction aborted'));});}
export const getSheets=async()=>(await transaction('readonly',s=>s.getAll())).map(normalizeSheet);
export const putSheet=sheet=>transaction('readwrite',s=>s.put(sheet));
export const deleteSheet=id=>transaction('readwrite',s=>s.delete(id));
export function validateSheet(s){if(!s||typeof s!=='object'||typeof s.id!=='string'||typeof s.title!=='string'||!s.title.trim()||!Array.isArray(s.tools)||!Array.isArray(s.photos))throw Error('This file is not a valid ZPC setup sheet.');if(s.photos.length>30||s.tools.length>100||(s.operations&&(!Array.isArray(s.operations)||s.operations.length>50)))throw Error('This setup sheet exceeds the import limits.');for(const p of s.photos){if(typeof p.data!=='string'||!/^data:image\/jpeg;base64,/.test(p.data))throw Error('Only embedded JPEG photos are accepted.');}for(const a of s.attachments||[]){if(typeof a.name!=='string'||typeof a.data!=='string'||!/^data:application\/pdf;base64,/.test(a.data))throw Error('Invalid PDF attachment.');}if(s.operations){const keys=['id','number','name','machine','program','workholding','jaws','stickOut','datum','setupNotes','notes'];const ids=new Set();for(const o of s.operations){if(!o||typeof o!=='object'||keys.some(k=>o[k]!==undefined&&typeof o[k]!=='string'))throw Error('Invalid operation data.');if(o.id&&ids.has(o.id))throw Error('Duplicate operation identifier.');ids.add(o.id);}}return normalizeSheet(s);}
// Use native image decoding first (including Safari's supported camera formats).
// ImageBitmap is a fallback, rather than a requirement for photo attachments.
export async function resizePhoto(file){
 const imageName=/\.(jpe?g|png|webp|heic|heif|avif|gif|bmp)$/i.test(file.name||'');
 if(!file.type.startsWith('image/')&&!imageName)throw Error('Choose an image such as a JPEG, PNG, or a supported camera photo.');
 if(file.size>25*1024*1024)throw Error('Photos must be smaller than 25 MB.');
 if(!file.size)throw Error('This photo is empty. Choose another photo.');
 const url=URL.createObjectURL(file);let source,release=()=>{};
 try{
  try{source=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Image decode failed'));img.src=url;});}
  catch{if(typeof createImageBitmap==='function'){source=await createImageBitmap(file);release=()=>source.close();}else throw Error('Image decode failed');}
  const width=source.naturalWidth||source.width,height=source.naturalHeight||source.height;
  if(!width||!height)throw Error('Image dimensions are unavailable');
  const scale=Math.min(1,1600/Math.max(width,height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(width*scale));c.height=Math.max(1,Math.round(height*scale));
  const ctx=c.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,0,0,c.width,c.height);
  const data=c.toDataURL('image/jpeg',.85);if(!data.startsWith('data:image/jpeg;base64,'))throw Error('Photo conversion failed');
  return {id:crypto.randomUUID(),name:file.name||'Camera photo.jpg',caption:'',data,width:c.width,height:c.height};
 }catch{throw Error(`Could not open ${file.name||'this photo'}. Try a JPEG or PNG, or on iPhone use Settings → Camera → Formats → Most Compatible for new photos.`);}
 finally{release();URL.revokeObjectURL(url);}
}
export const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function download(blob,name){const url=URL.createObjectURL(blob);const a=Object.assign(document.createElement('a'),{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export const filename=s=>(s.partNumber||s.title||'setup-sheet').replace(/[^a-z0-9_-]/gi,'-')+'-Rev-'+String(s.revision||'A').replace(/[^a-z0-9_-]/gi,'-');
