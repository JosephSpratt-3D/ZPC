import {pdfFonts} from './pdf-fonts.js';
import {normalizeSheet} from './data.js';
import {photoLabel} from './document.js';
// A4 form renderer. Tables wrap, split long rows, and repeat headers across pages.
export function createPDF(input){
 const sheet=normalizeSheet(input),enc=new TextEncoder(),objects=[null],pages=[];let commands=[],y=785,sectionNumber=0;
 const add=o=>{objects.push(o);return objects.length-1;};
 const embedded=pdfFonts.map(f=>{const bytes=Uint8Array.from(atob(f.data),c=>c.charCodeAt(0));const file=add({bytes,dict:'/Length1 '+bytes.length});const descriptor=add(`<< /Type /FontDescriptor /FontName /${f.name} /Flags 32 /FontBBox [${f.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${f.ascent} /Descent ${f.descent} /CapHeight 700 /StemV 80 /FontFile2 ${file} 0 R >>`);return add(`<< /Type /Font /Subtype /TrueType /BaseFont /${f.name} /FirstChar 32 /LastChar 126 /Widths [${f.widths.join(' ')}] /FontDescriptor ${descriptor} 0 R /Encoding /WinAnsiEncoding >>`);});const [font,bold]=embedded;
 const pageRoot=add(''),images=[];
 const ascii=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[–—•·]/g,'-').replace(/Ø/g,'D').replace(/×/g,'x').replace(/[^\x20-\x7e\n]/g,'?');
 const escape=s=>ascii(s).replace(/([\\()])/g,'\\$1');
 function text(s,x,yy,size=10,strong=false,color='0.12 0.15 0.14'){commands.push(`BT /${strong?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${yy} Tm (${escape(s)}) Tj ET`);}
 function rule(yy=y){commands.push(`0.84 0.87 0.83 RG 0.5 w 40 ${yy} m 555 ${yy} l S`);}
 function endPage(){rule(46);text('ZERO POINT CRYOGENICS / MANUFACTURING',40,30,7,true,'0.42 0.47 0.43');text(`${ascii(sheet.partNumber||'SETUP SHEET').slice(0,30)} / REV ${sheet.revision||'A'}`,300,30,7,false,'0.42 0.47 0.43');text('PAGE '+String(pages.length+1),515,30,7,true);const content=enc.encode(commands.join('\n'));const stream=add({bytes:content,dict:''});const page=add(`<< /Type /Page /Parent ${pageRoot} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> /XObject << ${images.map((x,i)=>`/Im${i} ${x} 0 R`).join(' ')} >> >> /Contents ${stream} 0 R >>`);pages.push(page);commands=[];y=785;}
 function nextPage(){endPage();commands.push('0.93 0.88 0.24 rg 40 783 4 17 re f');text('ZPC / MACHINIST SETUP SHEET',54,789,9,true);text(ascii(sheet.partNumber||'').slice(0,35),350,789,8,false,'0.42 0.47 0.43');rule(770);y=747;}
 function need(h){if(y-h<60)nextPage();}
 function wrap(s,width=515,size=10){const capacity=Math.max(3,Math.floor(width/(size*.59)));const result=[];for(const raw of ascii(s).split('\n')){let current='';for(let word of raw.split(/\s+/)){while(word.length>capacity){if(current){result.push(current);current='';}result.push(word.slice(0,capacity));word=word.slice(capacity);}if((current+' '+word).trim().length>capacity){result.push(current);current=word;}else current=(current+' '+word).trim();}result.push(current||' ');}return result;}
 function line(s,size=10,strong=false){for(const l of wrap(s,515,size)){need(size+7);text(l,40,y,size,strong);y-=size+7;}}
 function section(title){need(108);sectionNumber++;y-=6;commands.push(`0.93 0.88 0.24 rg 40 ${y-17} 23 23 re f`);text(String(sectionNumber).padStart(2,'0'),46,y-9,8,true);text(title.toUpperCase(),73,y-8,10,true);y-=37;}
 function info(label,value){line(`${label}: ${value||'-'}`,10);}
 function prose(value){line(value||'Not specified.',9);y-=8;}
 function details(pairs){for(let i=0;i<pairs.length;i+=2){const cells=pairs.slice(i,i+2).map(pair=>({label:pair[0],lines:wrap(pair[1]||'-',232,10)}));const rowHeight=26+Math.max(...cells.map(c=>c.lines.length))*14;need(rowHeight+8);cells.forEach((c,j)=>{const x=40+j*263;commands.push(`0.96 0.97 0.95 rg ${x} ${y-rowHeight+2} 252 ${rowHeight} re f`);text(c.label.toUpperCase(),x+10,y-10,7,true,'0.43 0.49 0.44');c.lines.forEach((l,k)=>text(l,x+10,y-27-k*14,10));});y-=rowHeight+7;}y-=3;}
 function table(headers,rows,widths){const size=8.5,leading=12.5,pad=8;let stripe=0;const xs=[40];widths.forEach(w=>xs.push(xs.at(-1)+w));
  function draw(cells,count,isHead=false){const h=count*leading+pad*2;let x=40;for(let j=0;j<cells.length;j++){commands.push(`${isHead?'0.16 0.20 0.18':stripe%2?'0.96 0.97 0.95':'1 1 1'} rg ${x} ${y-h} ${widths[j]} ${h} re f`);commands.push(`0.85 0.88 0.84 RG 0.4 w ${x} ${y-h} ${widths[j]} ${h} re S`);cells[j].forEach((l,k)=>text(l,x+pad,y-pad-size-k*leading,size,isHead,isHead?'1 1 1':'0.12 0.15 0.14'));x+=widths[j];}y-=h;if(!isHead)stripe++;}
  const header=headers.map((h,j)=>wrap(h,widths[j]-pad*2,size));const hh=Math.max(...header.map(h=>h.length));
  function heading(){need(hh*leading+pad*2+leading+pad*2);draw(header,hh,true);}
  heading();for(const row of rows){let cells=row.map((v,j)=>wrap(v||'-',widths[j]-pad*2,size));let remaining=Math.max(...cells.map(c=>c.length));const fullHeight=remaining*leading+pad*2;
   if(fullHeight<650&&y-fullHeight<60){nextPage();heading();}
   while(remaining>0){let fit=Math.floor((y-60-pad*2)/leading);if(fit<1){nextPage();heading();fit=Math.floor((y-60-pad*2)/leading);}const n=Math.min(remaining,fit);draw(cells.map(c=>c.slice(0,n)),n);cells=cells.map(c=>c.slice(n));remaining-=n;if(remaining>0){nextPage();heading();}}
  }y-=14;
 }
 // Branded cover header with a compact revision panel.
 commands.push('0.10 0.13 0.12 rg 40 700 515 104 re f','0.93 0.88 0.24 rg 40 700 5 104 re f');
 // Three chevrons echo the ZPC mark without adding raster assets.
 for(let i=0;i<3;i++){const yy=779-i*12;commands.push(`0.93 0.88 0.24 rg 58 ${yy} m 69 ${yy-7} l 80 ${yy} l 80 ${yy-7} l 69 ${yy-14} l 58 ${yy-7} l h f`);}
 text('ZERO POINT CRYOGENICS',94,778,9,true,'0.93 0.88 0.24');text('Machinist setup sheet',94,748,22,true,'1 1 1');text('MANUFACTURING / PROCESS DOCUMENTATION',94,725,7,false,'0.73 0.78 0.73');
 text('REVISION',469,778,7,true,'0.73 0.78 0.73');text(ascii(sheet.revision||'A').slice(0,8),469,749,18,true,'1 1 1');text(ascii(sheet.status).toUpperCase(),469,726,8,true,'0.93 0.88 0.24');
 y=674;line(sheet.title||'Untitled setup sheet',17,true);y-=5;
 if(sheet.sample){line('EXAMPLE ONLY - Verify all instructions before production.',9,true);y-=5;}
 section('PART INFORMATION');details([['Part number',sheet.partNumber],['Program name',sheet.program],['Created by',sheet.preparedBy],['Date',sheet.documentDate]]);
 section('MATERIAL INFORMATION');details([['Material',sheet.material],['Starting stock size',sheet.stock],['Material source',sheet.materialSource],['Operations',String(sheet.operations.length)]]);
 // Keep operation count explicit for both human readers and exported text.
 text(`Total Operations: ${sheet.operations.length}`,40,y,9,true);y-=22;
 section('WORKHOLDING & SETUP INFORMATION');table(['OP','Workholding / Fixture','Jaws / Clamping','Part Stick-Out','Setup Notes'],sheet.operations.map(o=>[o.number+(o.name?' - '+o.name:''),o.workholding,o.jaws,o.stickOut,o.setupNotes]),[60,120,110,85,140]);
 section('MACHINE, PROGRAM & DATUM');table(['OP','Machine','Program Name','Work Coordinate / Datum'],sheet.operations.map(o=>[o.number,o.machine,o.program,o.datum]),[60,125,110,220]);
 section('SPECIAL TOOLING NOTES');table(['Tool #','Description','Special Requirement'],(sheet.tools.length?sheet.tools:[{}]).map(t=>[t.number,t.description,t.specialRequirement]),[65,220,230]);
 if(sheet.tools.length){section('TOOL CUTTING DATA');table(['Tool #','Diameter','Holder','RPM','Feed / Units'],sheet.tools.map(t=>[t.number,t.diameter,t.holder,t.rpm,t.feed]),[65,100,160,80,110]);}
 if(sheet.photos.length){
  const photos=sheet.photos;
  section('SETUP PHOTOS');
  for(let i=0;i<photos.length;i+=2){
   const row=photos.slice(i,i+2);const captions=row.map(p=>wrap(photoLabel(sheet,p),223,8));const captionHeight=Math.max(...captions.map(c=>c.length))*12;const cardHeight=180+captionHeight+28;
   if(y-cardHeight<60){nextPage();section('SETUP PHOTOS / CONTINUED');}
   row.forEach((p,j)=>{const x=40+j*265;commands.push(`0.96 0.97 0.95 rg ${x} ${y-cardHeight} 250 ${cardHeight} re f`);
    const width=Number(p.width)||1200,height=Number(p.height)||900,scale=Math.min(230/width,164/height),w=width*scale,h=height*scale;
    const raw=atob(p.data.split(',')[1]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const im=add({bytes,dict:`/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`}),index=images.push(im)-1;
    commands.push(`q ${w} 0 0 ${h} ${x+(250-w)/2} ${y-10-(164-h)/2-h} cm /Im${index} Do Q`);
    text('PHOTO '+String(i+j+1).padStart(2,'0'),x+12,y-188,7,true,'0.43 0.49 0.44');captions[j].forEach((l,k)=>text(l,x+12,y-203-k*12,8));
   });y-=cardHeight+16;
  }
 }
 section('NOTES PER OPERATION');table(['Operation','Notes'],sheet.operations.map(o=>[o.number+(o.name?' - '+o.name:''),o.notes]),[100,415]);
 if(sheet.notes){section('GENERAL SETUP NOTES');prose(sheet.notes);}
 section('INSPECTION & QUALITY CHECKS');prose(sheet.inspection);
 section('LESSONS LEARNED / NEXT RUN IMPROVEMENTS');prose(sheet.lessons||'No improvements recorded yet.');
 if(sheet.attachments.length){section('REFERENCE ATTACHMENTS');sheet.attachments.forEach(a=>line(a.name));}
 section('REVIEW');info('Prepared By',sheet.preparedBy);info('Checked By',sheet.checkedBy);y-=12;line('Verify the current drawing, tooling, offsets, and first-article inspection before machining.',9);
 endPage();objects[pageRoot]=`<< /Type /Pages /Kids [${pages.map(p=>`${p} 0 R`).join(' ')}] /Count ${pages.length} >>`;const catalog=add(`<< /Type /Catalog /Pages ${pageRoot} 0 R >>`);
 const chunks=[enc.encode('%PDF-1.4\n')],offsets=[0];let length=chunks[0].length;const push=b=>{chunks.push(b);length+=b.length;};for(let i=1;i<objects.length;i++){offsets.push(length);push(enc.encode(`${i} 0 obj\n`));const o=objects[i];if(typeof o==='string')push(enc.encode(o));else{push(enc.encode(`<< ${o.dict} /Length ${o.bytes.length} >>\nstream\n`));push(o.bytes);push(enc.encode('\nendstream'));}push(enc.encode('\nendobj\n'));}const xref=length;push(enc.encode(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`));return new Blob(chunks,{type:'application/pdf'});
}
