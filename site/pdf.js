import {normalizeSheet} from './data.js';
import {materialSources,photoLabel} from './document.js';
// A4 form renderer. Tables wrap, split long rows, and repeat headers across pages.
export function createPDF(input){
 const sheet=normalizeSheet(input),enc=new TextEncoder(),objects=[null],pages=[];let commands=[],y=785;
 const add=o=>{objects.push(o);return objects.length-1;};
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const pageRoot=add(''),images=[];
 const ascii=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[–—•·]/g,'-').replace(/Ø/g,'D').replace(/×/g,'x').replace(/[^\x20-\x7e\n]/g,'?');
 const escape=s=>ascii(s).replace(/([\\()])/g,'\\$1');
 function text(s,x,yy,size=10,strong=false){commands.push(`BT /${strong?'F2':'F1'} ${size} Tf 0 0 0 rg 1 0 0 1 ${x} ${yy} Tm (${escape(s)}) Tj ET`);}
 function rule(yy=y){commands.push(`0.6 0.6 0.6 RG 0.5 w 40 ${yy} m 555 ${yy} l S`);}
 function endPage(){text(`ZPC / ${ascii(sheet.partNumber||sheet.title).slice(0,65)} / Rev ${sheet.revision||'A'}`,40,30,8);text(String(pages.length+1),545,30,8);const content=enc.encode(commands.join('\n'));const stream=add({bytes:content,dict:''});const page=add(`<< /Type /Page /Parent ${pageRoot} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> /XObject << ${images.map((x,i)=>`/Im${i} ${x} 0 R`).join(' ')} >> >> /Contents ${stream} 0 R >>`);pages.push(page);commands=[];y=785;}
 function nextPage(){endPage();text('MACHINIST SETUP SHEET / CONTINUED',40,y,9,true);y-=28;}
 function need(h){if(y-h<60)nextPage();}
 function wrap(s,width=515,size=10){const capacity=Math.max(3,Math.floor(width/(size*.59)));const result=[];for(const raw of ascii(s).split('\n')){let current='';for(let word of raw.split(/\s+/)){while(word.length>capacity){if(current){result.push(current);current='';}result.push(word.slice(0,capacity));word=word.slice(capacity);}if((current+' '+word).trim().length>capacity){result.push(current);current=word;}else current=(current+' '+word).trim();}result.push(current||' ');}return result;}
 function line(s,size=10,strong=false){for(const l of wrap(s,515,size)){need(size+7);text(l,40,y,size,strong);y-=size+7;}}
 function section(title){need(65);y-=10;rule();y-=25;line(title.toUpperCase(),10,true);y-=5;}
 function info(label,value){line(`${label}: ${value||'-'}`,10);}
 function prose(value){line(value||'Not specified.',10);y-=10;}
 function table(headers,rows,widths){const size=8,leading=12,pad=6;const xs=[40];widths.forEach(w=>xs.push(xs.at(-1)+w));
  function draw(cells,count,isHead=false){const h=count*leading+pad*2;let x=40;for(let j=0;j<cells.length;j++){if(isHead)commands.push(`0.96 0.96 0.96 rg ${x} ${y-h} ${widths[j]} ${h} re f`);commands.push(`0.4 0.4 0.4 RG 0.5 w ${x} ${y-h} ${widths[j]} ${h} re S`);cells[j].forEach((l,k)=>text(l,x+pad,y-pad-size-k*leading,size,isHead));x+=widths[j];}y-=h;}
  const header=headers.map((h,j)=>wrap(h,widths[j]-pad*2,size));const hh=Math.max(...header.map(h=>h.length));
  function heading(){need(hh*leading+pad*2+leading+pad*2);draw(header,hh,true);}
  heading();for(const row of rows){let cells=row.map((v,j)=>wrap(v||'-',widths[j]-pad*2,size));let remaining=Math.max(...cells.map(c=>c.length));const fullHeight=remaining*leading+pad*2;
   if(fullHeight<650&&y-fullHeight<60){nextPage();heading();}
   while(remaining>0){let fit=Math.floor((y-60-pad*2)/leading);if(fit<1){nextPage();heading();fit=Math.floor((y-60-pad*2)/leading);}const n=Math.min(remaining,fit);draw(cells.map(c=>c.slice(0,n)),n);cells=cells.map(c=>c.slice(n));remaining-=n;if(remaining>0){nextPage();heading();}}
  }y-=22;
 }
 text('ZERO POINT CRYOGENICS',221,y,8,true);y-=29;text('MACHINIST SETUP SHEET',164,y,17,true);y-=25;text(`${sheet.status} / REV ${sheet.revision||'A'}`,242,y,9);y-=25;
 if(sheet.sample){line('EXAMPLE ONLY - Verify all instructions before production.',10,true);y-=8;}
 if(sheet.confidential){section('CONFIDENTIAL PART');prose('This part is marked confidential. Follow the approved Standard Operating Procedure (SOP) and contact your supervisor before recording or sharing restricted information.');}
 section('PART INFORMATION');info('Part Number',sheet.partNumber);info('Part Description',sheet.title);info('Program Name',sheet.program);info('Revision',sheet.revision);info('Created By',sheet.preparedBy);info('Date',sheet.documentDate);y-=12;
 section('MATERIAL INFORMATION');info('Material',sheet.material);info('Starting Stock Size',sheet.stock);line('Material Source:',10);line(materialSources.map(s=>`${sheet.materialSource===s?'[X]':'[ ]'} ${s}`).join('  '),9);if(sheet.materialSource&&!materialSources.includes(sheet.materialSource))line(sheet.materialSource);y-=12;
 section('NUMBER OF OPERATIONS');line(`Total Operations: ${sheet.operations.length}`);y-=15;
 section('WORKHOLDING & SETUP INFORMATION');table(['OP','Workholding / Fixture','Jaws / Clamping','Part Stick-Out','Setup Notes'],sheet.operations.map(o=>[o.number+(o.name?' - '+o.name:''),o.workholding,o.jaws,o.stickOut,o.setupNotes]),[60,120,110,85,140]);
 section('MACHINE, PROGRAM & DATUM');table(['OP','Machine','Program Name','Work Coordinate / Datum'],sheet.operations.map(o=>[o.number,o.machine,o.program,o.datum]),[60,125,110,220]);
 section('SPECIAL TOOLING NOTES');prose('Record non-standard requirements: extended reach, unusual stick-out, special holders, long drills / reamers / taps, custom tools, and critical projection requirements.');table(['Tool #','Description','Special Requirement'],(sheet.tools.length?sheet.tools:[{}]).map(t=>[t.number,t.description,t.specialRequirement]),[65,220,230]);
 if(sheet.tools.length){section('TOOL CUTTING DATA');table(['Tool #','Diameter','Holder','RPM','Feed / Units'],sheet.tools.map(t=>[t.number,t.diameter,t.holder,t.rpm,t.feed]),[65,100,160,80,110]);}
 section('SETUP PHOTOS');if(!sheet.photos.length)prose('No setup photos attached.');for(const p of sheet.photos){const width=Number(p.width)||1200,height=Number(p.height)||900;const scale=Math.min(515/width,280/height,1),w=width*scale,h=height*scale;need(h+65);const raw=atob(p.data.split(',')[1]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const im=add({bytes,dict:`/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`});const index=images.push(im)-1;commands.push(`q ${w} 0 0 ${h} 40 ${y-h} cm /Im${index} Do Q`);y-=h+17;line(photoLabel(sheet,p),9);y-=15;}
 section('NOTES PER OPERATION');table(['Operation','Notes'],sheet.operations.map(o=>[o.number+(o.name?' - '+o.name:''),o.notes]),[100,415]);
 if(sheet.notes){section('GENERAL SETUP NOTES');prose(sheet.notes);}
 section('INSPECTION & QUALITY CHECKS');prose(sheet.inspection);
 section('LESSONS LEARNED / NEXT RUN IMPROVEMENTS');prose(sheet.lessons||'No improvements recorded yet.');
 if(sheet.attachments.length){section('REFERENCE ATTACHMENTS');sheet.attachments.forEach(a=>line(a.name));}
 section('REVIEW');info('Prepared By',sheet.preparedBy);info('Checked By',sheet.checkedBy);y-=12;line('Verify the current drawing, tooling, offsets, and first-article inspection before machining.',9);
 endPage();objects[pageRoot]=`<< /Type /Pages /Kids [${pages.map(p=>`${p} 0 R`).join(' ')}] /Count ${pages.length} >>`;const catalog=add(`<< /Type /Catalog /Pages ${pageRoot} 0 R >>`);
 const chunks=[enc.encode('%PDF-1.4\n')],offsets=[0];let length=chunks[0].length;const push=b=>{chunks.push(b);length+=b.length;};for(let i=1;i<objects.length;i++){offsets.push(length);push(enc.encode(`${i} 0 obj\n`));const o=objects[i];if(typeof o==='string')push(enc.encode(o));else{push(enc.encode(`<< ${o.dict} /Length ${o.bytes.length} >>\nstream\n`));push(o.bytes);push(enc.encode('\nendstream'));}push(enc.encode('\nendobj\n'));}const xref=length;push(enc.encode(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`));return new Blob(chunks,{type:'application/pdf'});
}
