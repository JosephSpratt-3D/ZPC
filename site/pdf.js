// Dependency-free PDF with paginated text and embedded JPEG photos.
// Standard PDF fonts use ASCII; the browser Print view preserves other scripts.
export function createPDF(sheet){
 const enc=new TextEncoder(),objects=[null],pages=[];let commands=[],y=785;
 const add=o=>{objects.push(o);return objects.length-1;};
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const pageRoot=add('');const images=[];
 const ascii=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[–—•·]/g,'-').replace(/Ø/g,'D').replace(/[^\x20-\x7e\n]/g,'?');
 const escape=s=>ascii(s).replace(/([\\()])/g,'\\$1');
 function text(s,x,yy,size=10,strong=false){commands.push(`BT /${strong?'F2':'F1'} ${size} Tf 0.12 0.14 0.12 rg 1 0 0 1 ${x} ${yy} Tm (${escape(s)}) Tj ET`);}
 function endPage(){const n=pages.length+1;text(`ZPC MANUFACTURING  /  ${sheet.partNumber||sheet.title}  /  Rev ${sheet.revision||'A'}`,40,30,8);text(String(n),545,30,8);const content=enc.encode(commands.join('\n'));const stream=add({bytes:content,dict:''});const page=add(`<< /Type /Page /Parent ${pageRoot} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> /XObject << ${images.map((x,i)=>`/Im${i} ${x} 0 R`).join(' ')} >> >> /Contents ${stream} 0 R >>`);pages.push(page);commands=[];y=785;}
 function need(h){if(y-h<60){endPage();text('CNC SETUP SHEET / CONTINUED',40,y,10,true);y-=27;}}
 function line(s,size=10,strong=false){const capacity=Math.max(20,Math.floor(505/(size*.56)));for(const raw of ascii(s).split('\n')){const words=raw.split(/\s+/);let current='';for(let word of words){while(word.length>capacity){if(current){need(size+7);text(current,40,y,size,strong);y-=size+7;current='';}need(size+7);text(word.slice(0,capacity),40,y,size,strong);y-=size+7;word=word.slice(capacity);}if((current+' '+word).trim().length>capacity){need(size+7);text(current,40,y,size,strong);y-=size+7;current=word;}else current=(current+' '+word).trim();}need(size+7);text(current||' ',40,y,size,strong);y-=size+7;}}
 function section(title,body){need(55);y-=12;line(title.toUpperCase(),11,true);commands.push(`0.8 0.83 0.78 RG 40 ${y+4} m 555 ${y+4} l S`);y-=8;line(body||'Not specified');}
 line('ZERO POINT CRYOGENICS',10,true);y-=8;line('CNC SETUP SHEET',22,true);line(sheet.title,15,true);y-=5;line(`${sheet.partNumber||'No part number'} | REV ${sheet.revision||'A'} | ${sheet.operation||'No operation'} | ${sheet.status}`);
 if(sheet.sample)line('EXAMPLE ONLY - Verify all instructions before production.',10,true);
 section('Job & machine',`Machine: ${sheet.machine||'-'}\nMaterial: ${sheet.material||'-'}\nStock: ${sheet.stock||'-'}\nNC program: ${sheet.program||'-'}\nPrepared by: ${sheet.preparedBy||'-'}\nChecked by: ${sheet.checkedBy||'-'}`);
 section('Workholding & fixture',sheet.workholding);section('Work coordinate / datum',sheet.datum);
 section('Tool list',sheet.tools.length?'':'No tools specified.');for(const t of sheet.tools){need(55);line(`T${t.number}  ${t.description}`,10,true);line(`Diameter: ${t.diameter||'-'} | Holder: ${t.holder||'-'} | RPM: ${t.rpm||'-'} | Feed: ${t.feed||'-'}`,9);}
 section('Setup & machining notes',sheet.notes);section('Inspection & quality checks',sheet.inspection);
 if(sheet.attachments?.length)section('Reference PDF attachments',sheet.attachments.map(a=>a.name).join('\n'));
 if(sheet.photos.length){section('Setup photos','');for(const p of sheet.photos){const width=Math.min(505,p.width),height=width*p.height/p.width;const h=Math.min(310,height),w=h*p.width/p.height;need(h+50);const raw=atob(p.data.split(',')[1]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const im=add({bytes,dict:`/Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`});const index=images.push(im)-1;commands.push(`q ${w} 0 0 ${h} 40 ${y-h} cm /Im${index} Do Q`);y-=h+17;line(p.caption||p.name,9);y-=10;}}
 section('Release check','Confirm the current drawing, revision, tooling, offsets, and first-article inspection before machining.');endPage();objects[pageRoot]=`<< /Type /Pages /Kids [${pages.map(p=>`${p} 0 R`).join(' ')}] /Count ${pages.length} >>`;const catalog=add(`<< /Type /Catalog /Pages ${pageRoot} 0 R >>`);
 const chunks=[enc.encode('%PDF-1.4\n')],offsets=[0];let length=chunks[0].length;const push=b=>{chunks.push(b);length+=b.length;};for(let i=1;i<objects.length;i++){offsets.push(length);push(enc.encode(`${i} 0 obj\n`));const o=objects[i];if(typeof o==='string')push(enc.encode(o));else{push(enc.encode(`<< ${o.dict} /Length ${o.bytes.length} >>\nstream\n`));push(o.bytes);push(enc.encode('\nendstream'));}push(enc.encode('\nendobj\n'));}const xref=length;push(enc.encode(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`));return new Blob(chunks,{type:'application/pdf'});
}
