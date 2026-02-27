import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { get, set } from 'idb-keyval';
import './styles.css';

// ============================================================
// CONFIG & CONSTANTS
// ============================================================
const DB_KEY = 'sitepro_v4';
const EXPENSE_CATS = ['Materials','Labor','Equipment','Permits','Subcontractor','Transportation','Safety','Fuel','Rental','Other'];
const COLORS = ['#f5a623','#4fc3f7','#66bb6a','#ef5350','#ab47bc','#ff7043','#26c6da','#d4e157'];
const TABS = [
  { id:'photos', label:'Photos' },
  { id:'hours', label:'Hours' },
  { id:'expenses', label:'Expenses' },
  { id:'tasks', label:'Tasks' },
];

// ============================================================
// HELPERS
// ============================================================
const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2,5);
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = d => { const dt = new Date(d+'T00:00:00'); return dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
const fmtDateShort = d => { const dt = new Date(d+'T00:00:00'); return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'}); };
const fmtCur = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const fmtTime = t => { if(!t) return ''; const [h,m]=t.split(':'); const hr=parseInt(h); return `${hr===0?12:hr>12?hr-12:hr}:${m} ${hr>=12?'PM':'AM'}`; };
const calcH = (s,e) => { if(!s||!e) return 0; const [sh,sm]=s.split(':').map(Number); const [eh,em]=e.split(':').map(Number); let d=(eh*60+em)-(sh*60+sm); if(d<0) d+=1440; return Math.round(d/60*100)/100; };
const weekRange = ds => {
  const d=new Date(ds+'T00:00:00'), day=d.getDay(), mon=new Date(d);
  mon.setDate(d.getDate()-(day===0?6:day-1));
  const sun=new Date(mon); sun.setDate(mon.getDate()+6);
  return { start:mon.toISOString().split('T')[0], end:sun.toISOString().split('T')[0], label:`${fmtDateShort(mon.toISOString().split('T')[0])} – ${fmtDateShort(sun.toISOString().split('T')[0])}` };
};

// ============================================================
// ICONS (inline SVG components)
// ============================================================
const IC = {
  Plus:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,
  Cam:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Clk:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Dol:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  Chk:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Del:()=><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  Back:()=><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  Scan:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  Print:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Users:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  Edit:()=><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Sun:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Tag:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Cal:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Spin:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M12 2a10 10 0 0110 10"/></svg>,
  Img:()=><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
};
const TabIcon = ({id}) => {
  if(id==='photos') return <IC.Cam/>;
  if(id==='hours') return <IC.Clk/>;
  if(id==='expenses') return <IC.Dol/>;
  return <IC.Chk/>;
};

// ============================================================
// UI COMPONENTS
// ============================================================
function Modal({open,onClose,title,children,wide}) {
  if(!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide?'modal--wide':''}`} onClick={e=>e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Inp({label,...props}) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <input className="field__input" {...props} />
    </div>
  );
}

function Sel({label,children,...props}) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <select className="field__input" {...props}>{children}</select>
    </div>
  );
}

function Btn({children,onClick,disabled,style}) {
  return <button className={`btn-primary ${disabled?'btn--disabled':''}`} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}
function Btn2({children,onClick,style}) {
  return <button className="btn-secondary" onClick={onClick} style={style}>{children}</button>;
}
function BtnDel({onClick}) {
  return <button className="btn-delete" onClick={onClick}><IC.Del/></button>;
}

// Autocomplete for classifications
function AutoInput({label,value,onChange,suggestions,placeholder}) {
  const [open,setOpen]=useState(false);
  const filtered = value ? suggestions.filter(s=>s.toLowerCase().includes(value.toLowerCase())&&s.toLowerCase()!==value.toLowerCase()).slice(0,6) : [];
  return (
    <div className="field" style={{position:'relative'}}>
      <label className="field__label">{label}</label>
      <input className="field__input" value={value} onChange={e=>{onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder={placeholder} />
      {open && filtered.length>0 && (
        <div className="autocomplete-dropdown">
          {filtered.map((s,i)=><div key={i} className="autocomplete-item" onMouseDown={()=>{onChange(s);setOpen(false);}}>{s}</div>)}
        </div>
      )}
    </div>
  );
}

// Employee selector
function EmpSelect({employees,value,onChange,label='Employee'}) {
  const [search,setSearch]=useState('');
  const [open,setOpen]=useState(false);
  const sel = employees.find(e=>e.id===value);
  const filtered = search ? employees.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())) : employees;

  return (
    <div className="field" style={{position:'relative'}}>
      <label className="field__label">{label}</label>
      {sel && !open ? (
        <div className="emp-selected" onClick={()=>setOpen(true)}>
          <div><span className="emp-selected__name">{sel.name}</span>{sel.classification && <span className="emp-selected__cls">({sel.classification})</span>}</div>
          <span style={{color:'#888',fontSize:12}}>Change</span>
        </div>
      ) : (
        <>
          <input className="field__input" style={{borderColor:'#f5a623'}} value={search} onChange={e=>{setSearch(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder="Search or select employee..." autoFocus={open} />
          {open && (
            <div className="autocomplete-dropdown" style={{maxHeight:200,overflowY:'auto'}}>
              {filtered.length===0 && <div style={{padding:'12px 14px',color:'#777',fontSize:13}}>No employees found</div>}
              {filtered.map(emp=>(
                <div key={emp.id} className="autocomplete-item" style={{display:'flex',justifyContent:'space-between'}} onMouseDown={()=>{onChange(emp.id);setSearch('');setOpen(false);}}>
                  <div><span style={{fontWeight:600}}>{emp.name}</span>{emp.role&&<span style={{marginLeft:6,color:'#888',fontSize:11}}>{emp.role}</span>}</div>
                  {emp.classification && <span className="cls-badge-sm">{emp.classification}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// RECEIPT SCANNING
// ============================================================
async function scanReceipt(b64) {
  const mt = b64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const d = b64.split(',')[1];
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000,
      messages:[{role:'user',content:[
        {type:'image',source:{type:'base64',media_type:mt,data:d}},
        {type:'text',text:'Analyze this receipt. Return ONLY valid JSON:\n{"vendor":"store","description":"brief desc","amount":0.00,"category":"one of: Materials, Labor, Equipment, Permits, Subcontractor, Transportation, Safety, Fuel, Rental, Other","date":"YYYY-MM-DD or empty"}'}
      ]}]
    })
  });
  const data = await r.json();
  const txt = data.content.map(i=>i.text||'').join('');
  return JSON.parse(txt.replace(/```json|```/g,'').trim());
}

async function fetchWeather(loc) {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000,
        tools:[{type:'web_search_20250305',name:'web_search'}],
        messages:[{role:'user',content:`Today's weather for ${loc}? Return ONLY JSON: {"temp_f":0,"condition":"","humidity":0,"wind_mph":0,"high_f":0,"low_f":0,"location":"","date":"YYYY-MM-DD"}`}]
      })
    });
    const data = await r.json();
    const txt = data.content.filter(i=>i.type==='text').map(i=>i.text).join('');
    const m = txt.match(/\{[\s\S]*?\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

// ============================================================
// PRINT REPORTS
// ============================================================
const PS = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;padding:40px;color:#222;font-size:13px}h1{font-size:24px;margin-bottom:4px}h2{font-size:15px;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #e8891c;color:#333}.meta{color:#666;font-size:12px;margin-bottom:4px}.stats{display:flex;gap:28px;margin:16px 0;padding:14px 18px;background:#f8f8f8;border-radius:8px;flex-wrap:wrap}.stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888}.stat-value{font-size:20px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:8px}th{text-align:left;padding:7px 10px;background:#f0f0f0;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:2px solid #ddd}td{padding:7px 10px;border-bottom:1px solid #eee;font-size:12px}tr:nth-child(even){background:#fafafa}.total-row td{font-weight:700;border-top:2px solid #333;background:#f5f5f5}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}.done{color:#2e7d32;background:#e8f5e9}.pending{color:#e65100;background:#fff3e0}.high{color:#c62828}.medium{color:#e65100}.low{color:#2e7d32}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#999;text-align:center}.weather-bar{margin:12px 0;padding:10px 16px;background:#e3f2fd;border-radius:8px;font-size:13px;color:#1565c0}.emp-header{display:flex;justify-content:space-between;margin:20px 0 8px;padding:8px 12px;background:#f0f0f0;border-radius:6px}@media print{body{padding:20px}}`;

function wB(w){return w?`<div class="weather-bar"><strong>${w.temp_f}°F</strong> · ${w.condition} · Humidity ${w.humidity}% · Wind ${w.wind_mph} mph${w.high_f?` · H: ${w.high_f}°F / L: ${w.low_f}°F`:''}${w.location?` · ${w.location}`:''}</div>`:'';}
function openPrint(h){const w=window.open('','_blank');w.document.write(h);w.document.close();setTimeout(()=>w.print(),400);}

function printFull(proj,df,w) {
  const fH=df?proj.hours.filter(h=>h.date===df):proj.hours, fE=df?proj.expenses.filter(e=>e.date===df):proj.expenses, fT=df?proj.tasks.filter(t=>t.date===df):proj.tasks;
  const tH=fH.reduce((a,h)=>a+h.hours,0), tE=fE.reduce((a,e)=>a+e.amount,0), dl=df?fmtDate(df):'All Dates';
  openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${proj.name} Report</title><style>${PS}</style></head><body>
<h1>${proj.name} — Full Daily Report</h1><p class="meta">${proj.client?proj.client+' · ':''}${proj.address||''}</p><p class="meta">Report: ${dl} · Generated: ${new Date().toLocaleString()}</p>${wB(w)}
<div class="stats"><div><div class="stat-label">Total Hours</div><div class="stat-value">${tH.toFixed(1)}h</div></div><div><div class="stat-label">Total Expenses</div><div class="stat-value">${fmtCur(tE)}</div></div><div><div class="stat-label">Tasks</div><div class="stat-value">${fT.filter(t=>t.status==='Done').length}/${fT.length}</div></div></div>
<h2>Employee Hours</h2>${fH.length===0?'<p style="color:#999;padding:8px">No hours</p>':`<table><thead><tr><th>Employee</th><th>Classification</th><th>Date</th><th>Start</th><th>End</th><th>Hours</th><th>Notes</th></tr></thead><tbody>${fH.map(h=>`<tr><td><strong>${h.employee}</strong></td><td>${h.classification||'—'}</td><td>${fmtDate(h.date)}</td><td>${h.startTime?fmtTime(h.startTime):'—'}</td><td>${h.endTime?fmtTime(h.endTime):'—'}</td><td><strong>${h.hours}h</strong></td><td>${h.notes||'—'}</td></tr>`).join('')}<tr class="total-row"><td colspan="5">Total</td><td>${tH.toFixed(1)}h</td><td></td></tr></tbody></table>`}
<h2>Expenses</h2>${fE.length===0?'<p style="color:#999;padding:8px">No expenses</p>':`<table><thead><tr><th>Description</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th></tr></thead><tbody>${fE.map(e=>`<tr><td><strong>${e.description}</strong></td><td>${e.category}</td><td>${e.vendor||'—'}</td><td>${fmtDate(e.date)}</td><td><strong>${fmtCur(e.amount)}</strong></td></tr>`).join('')}<tr class="total-row"><td colspan="4">Total</td><td>${fmtCur(tE)}</td></tr></tbody></table>`}
<h2>Tasks</h2>${fT.length===0?'<p style="color:#999;padding:8px">No tasks</p>':`<table><thead><tr><th>Task</th><th>Assigned</th><th>Priority</th><th>Status</th><th>Date</th><th>Notes</th></tr></thead><tbody>${fT.map(t=>`<tr><td><strong>${t.name}</strong></td><td>${t.assignee||'—'}</td><td class="${t.priority.toLowerCase()}">${t.priority}</td><td><span class="badge ${t.status==='Done'?'done':'pending'}">${t.status}</span></td><td>${fmtDate(t.date)}</td><td>${t.notes||'—'}</td></tr>`).join('')}</tbody></table>`}
<div class="footer">SitePro · ${proj.name} · ${dl}</div></body></html>`);
}

function printHours(proj,df,w) {
  const fH=df?proj.hours.filter(h=>h.date===df):proj.hours, tH=fH.reduce((a,h)=>a+h.hours,0), dl=df?fmtDate(df):'All Dates';
  const byE={}; fH.forEach(h=>{if(!byE[h.employee])byE[h.employee]={entries:[],cls:h.classification||''};byE[h.employee].entries.push(h);if(h.classification)byE[h.employee].cls=h.classification;});
  openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hours - ${proj.name}</title><style>${PS}</style></head><body>
<h1>${proj.name} — Employee Hours</h1><p class="meta">${proj.client?proj.client+' · ':''}${proj.address||''}</p><p class="meta">Report: ${dl} · Generated: ${new Date().toLocaleString()}</p>${wB(w)}
<div class="stats"><div><div class="stat-label">Employees</div><div class="stat-value">${Object.keys(byE).length}</div></div><div><div class="stat-label">Total Hours</div><div class="stat-value">${tH.toFixed(1)}h</div></div></div>
${Object.entries(byE).map(([n,d])=>{const et=d.entries.reduce((a,h)=>a+h.hours,0);return`<div class="emp-header"><div><strong>${n}</strong>${d.cls?` <span style="color:#e8891c;font-size:12px">(${d.cls})</span>`:''}</div><div><strong>${et.toFixed(1)} hours</strong></div></div><table><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Hours</th><th>Notes</th></tr></thead><tbody>${d.entries.sort((a,b)=>b.date.localeCompare(a.date)).map(h=>`<tr><td>${fmtDate(h.date)}</td><td>${h.startTime?fmtTime(h.startTime):'—'}</td><td>${h.endTime?fmtTime(h.endTime):'—'}</td><td><strong>${h.hours}h</strong></td><td>${h.notes||'—'}</td></tr>`).join('')}<tr class="total-row"><td colspan="3">Subtotal</td><td>${et.toFixed(1)}h</td><td></td></tr></tbody></table>`;}).join('')}
<div style="margin-top:24px;padding:12px 18px;background:#f0f0f0;border-radius:8px;display:flex;justify-content:space-between;font-weight:700;font-size:15px"><span>Grand Total</span><span>${tH.toFixed(1)} hours</span></div>
<div class="footer">SitePro · ${proj.name} · Hours · ${dl}</div></body></html>`);
}

function printWeekly(projects,employees,ws,we,w) {
  const wl=`${fmtDate(ws)} – ${fmtDate(we)}`;
  const ed={}; employees.forEach(e=>{ed[e.id]={name:e.name,cls:e.classification||'',projects:{}};});
  projects.forEach(p=>{p.hours.forEach(h=>{if(h.date>=ws&&h.date<=we){const eid=Object.keys(ed).find(id=>ed[id].name===h.employee)||h.employee;if(!ed[eid])ed[eid]={name:h.employee,cls:h.classification||'',projects:{}};if(!ed[eid].projects[p.name])ed[eid].projects[p.name]={hours:0,entries:[]};ed[eid].projects[p.name].hours+=h.hours;ed[eid].projects[p.name].entries.push(h);}});});
  const act=Object.values(ed).filter(e=>Object.keys(e.projects).length>0);
  const gt=act.reduce((s,e)=>s+Object.values(e.projects).reduce((a,p)=>a+p.hours,0),0);
  openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Weekly - ${wl}</title><style>${PS} .proj-bar{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:#fff3e0;color:#e65100;margin-right:6px;}</style></head><body>
<h1>Weekly Employee Hours</h1><p class="meta">${wl} · Generated: ${new Date().toLocaleString()}</p>${wB(w)}
<div class="stats"><div><div class="stat-label">Week</div><div class="stat-value">${wl}</div></div><div><div class="stat-label">Employees</div><div class="stat-value">${act.length}</div></div><div><div class="stat-label">Total Hours</div><div class="stat-value">${gt.toFixed(1)}h</div></div></div>
<h2>Summary</h2><table><thead><tr><th>Employee</th><th>Classification</th><th>Projects</th><th>Total</th></tr></thead><tbody>${act.map(e=>{const t=Object.values(e.projects).reduce((a,p)=>a+p.hours,0);return`<tr><td><strong>${e.name}</strong></td><td>${e.cls||'—'}</td><td>${Object.keys(e.projects).map(p=>`<span class="proj-bar">${p}</span>`).join('')}</td><td><strong>${t.toFixed(1)}h</strong></td></tr>`;}).join('')}<tr class="total-row"><td colspan="3">Grand Total</td><td>${gt.toFixed(1)}h</td></tr></tbody></table>
${act.map(e=>{const et=Object.values(e.projects).reduce((a,p)=>a+p.hours,0);return`<div class="emp-header"><div><strong>${e.name}</strong>${e.cls?` <span style="color:#e8891c;font-size:12px">(${e.cls})</span>`:''}</div><div><strong>${et.toFixed(1)} hours</strong></div></div>${Object.entries(e.projects).map(([pn,pd])=>`<p style="font-size:12px;color:#555;margin:8px 0 4px;font-weight:600">📁 ${pn} — ${pd.hours.toFixed(1)}h</p><table><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Hours</th><th>Notes</th></tr></thead><tbody>${pd.entries.sort((a,b)=>a.date.localeCompare(b.date)).map(h=>`<tr><td>${fmtDate(h.date)}</td><td>${h.startTime?fmtTime(h.startTime):'—'}</td><td>${h.endTime?fmtTime(h.endTime):'—'}</td><td><strong>${h.hours}h</strong></td><td>${h.notes||'—'}</td></tr>`).join('')}</tbody></table>`).join('')}`;}).join('<hr style="margin:24px 0;border:none;border-top:1px solid #ddd">')}
<div class="footer">SitePro · Weekly · ${wl}</div></body></html>`);
}

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [data,setData]=useState({projects:[],employees:[],classifications:[]});
  const [active,setActive]=useState(null);
  const [tab,setTab]=useState('photos');
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [loaded,setLoaded]=useState(false);
  const [scanning,setScanning]=useState(false);
  const [scanPrev,setScanPrev]=useState(null);
  const [scanErr,setScanErr]=useState(null);
  const [rptDate,setRptDate]=useState(today());
  const [weather,setWeather]=useState(null);
  const [wLoading,setWLoading]=useState(false);
  const [wLoc,setWLoc]=useState('');
  const [empTab,setEmpTab]=useState('roster');
  const [editEmp,setEditEmp]=useState(null);
  const [weekDt,setWeekDt]=useState(today());
  const [online,setOnline]=useState(navigator.onLine);
  const [canInstall,setCanInstall]=useState(false);
  const deferRef=useRef(null);
  const fileRef=useRef(null);
  const rcptRef=useRef(null);

  // PWA Install
  useEffect(()=>{
    if(window.matchMedia('(display-mode: standalone)').matches) return;
    const h=e=>{e.preventDefault();deferRef.current=e;setCanInstall(true);};
    window.addEventListener('beforeinstallprompt',h);
    window.addEventListener('online',()=>setOnline(true));
    window.addEventListener('offline',()=>setOnline(false));
    return ()=>window.removeEventListener('beforeinstallprompt',h);
  },[]);

  const install = async ()=>{if(!deferRef.current)return;deferRef.current.prompt();const{outcome}=await deferRef.current.userChoice;if(outcome==='accepted'){setCanInstall(false);deferRef.current=null;}};

  // Load/Save
  useEffect(()=>{(async()=>{try{const d=await get(DB_KEY);if(d)setData(d);}catch(e){}setLoaded(true);})();},[]);
  useEffect(()=>{if(loaded)(async()=>{try{await set(DB_KEY,data);}catch(e){}})();},[data,loaded]);

  const up = fn => setData(prev=>{const next=JSON.parse(JSON.stringify(prev));fn(next);return next;});
  const proj = data.projects.find(p=>p.id===active);

  // CRUD
  const addProject=()=>{if(!form.name?.trim())return;up(d=>{d.projects.push({id:uid(),name:form.name.trim(),client:form.client||'',address:form.address||'',color:form.color||'#f5a623',photos:[],hours:[],expenses:[],tasks:[],createdAt:today()});});setModal(null);setForm({});};
  const delProject=id=>{up(d=>{d.projects=d.projects.filter(p=>p.id!==id);});if(active===id)setActive(null);};
  const delItem=(type,itemId)=>{up(d=>{const p=d.projects.find(p=>p.id===active);if(p)p[type]=p[type].filter(i=>i.id!==itemId);});};

  const handlePhoto=e=>{Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>{up(d=>{const p=d.projects.find(p=>p.id===active);if(p)p.photos.push({id:uid(),data:ev.target.result,name:f.name,date:today()});});};r.readAsDataURL(f);});e.target.value='';};

  const handleReceipt=async e=>{const f=e.target.files?.[0];if(!f)return;e.target.value='';const r=new FileReader();r.onload=async ev=>{const b=ev.target.result;setScanPrev(b);setScanning(true);setScanErr(null);setModal('scan');try{const res=await scanReceipt(b);setForm({description:res.description||'',amount:res.amount?.toString()||'',category:res.category||'Materials',vendor:res.vendor||'',date:res.date||today()});setScanning(false);}catch{setScanErr('Could not read receipt. Fill in manually.');setForm({date:today(),category:'Materials'});setScanning(false);}};r.readAsDataURL(f);};

  const saveEmp=()=>{if(!form.empName?.trim())return;const cls=form.empCls?.trim()||'';if(editEmp){up(d=>{d.employees=d.employees.map(e=>e.id===editEmp?{...e,name:form.empName.trim(),role:form.empRole||'',phone:form.empPhone||'',classification:cls}:e);if(cls&&!d.classifications.includes(cls))d.classifications.push(cls);});}else{up(d=>{d.employees.push({id:uid(),name:form.empName.trim(),role:form.empRole||'',phone:form.empPhone||'',classification:cls});if(cls&&!d.classifications.includes(cls))d.classifications.push(cls);});}setModal(null);setForm({});setEditEmp(null);};

  const loadW=async loc=>{if(!loc)return;setWLoading(true);const w=await fetchWeather(loc);setWeather(w);setWLoading(false);};

  if(!loaded) return (
    <div className="loading-screen">
      <div className="loading-logo"><svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#111" strokeWidth="2"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-5h6v5"/></svg></div>
      <div className="loading-spinner"/>
    </div>
  );

  // ============================================================
  // PROJECT LIST
  // ============================================================
  if(!active) return (
    <div className="app">
      {!online && <div className="offline-bar">⚡ You're offline — changes saved locally</div>}
      <div className="page">
        <div className="header">
          <div>
            <div className="header__brand">
              <div className="header__logo"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#111" strokeWidth="2"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-5h6v5"/></svg></div>
              <h1 className="header__title">SitePro</h1>
            </div>
            <p className="header__sub">Construction Project Manager</p>
          </div>
          <div className="header__actions">
            <Btn2 onClick={()=>{setEmpTab('roster');setModal('employees');}} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 14px'}}><IC.Users/> Employees</Btn2>
            <Btn onClick={()=>{setForm({color:'#f5a623'});setModal('addProject');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> New Project</span></Btn>
          </div>
        </div>

        {data.projects.length>0 && (
          <div className="stats-grid">
            {[
              {l:'Projects',v:data.projects.length,c:'#f5a623'},
              {l:'Employees',v:data.employees.length,c:'#ab47bc'},
              {l:'Total Hours',v:data.projects.reduce((s,p)=>s+p.hours.reduce((a,h)=>a+h.hours,0),0).toFixed(1),c:'#4fc3f7'},
              {l:'Expenses',v:fmtCur(data.projects.reduce((s,p)=>s+p.expenses.reduce((a,e)=>a+e.amount,0),0)),c:'#66bb6a'},
              {l:'Open Tasks',v:data.projects.reduce((s,p)=>s+p.tasks.filter(t=>t.status!=='Done').length,0),c:'#ef5350'},
            ].map((s,i)=><div key={i} className="stat-card"><div className="stat-card__label">{s.l}</div><div className="stat-card__value" style={{color:s.c}}>{s.v}</div></div>)}
          </div>
        )}

        {data.projects.length===0 ? (
          <div className="empty-state">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-5h6v5"/></svg>
            <p className="empty-state__title">No projects yet</p>
            <p className="empty-state__desc">Create your first project to get started</p>
          </div>
        ) : (
          <div className="project-grid">
            {data.projects.map(p=>{const tH=p.hours.reduce((a,h)=>a+h.hours,0),tE=p.expenses.reduce((a,e)=>a+e.amount,0),oT=p.tasks.filter(t=>t.status!=='Done').length;return(
              <div key={p.id} className="project-card" onClick={()=>{setActive(p.id);setTab('photos');}}>
                <div className="project-card__bar" style={{background:`linear-gradient(90deg,${p.color},${p.color}88)`}}/>
                <div className="project-card__body">
                  <div className="project-card__top">
                    <div>
                      <h3 className="project-card__name">{p.name}</h3>
                      {p.client&&<p className="project-card__client">{p.client}</p>}
                      {p.address&&<p className="project-card__addr">{p.address}</p>}
                    </div>
                    <BtnDel onClick={e=>{e.stopPropagation();if(confirm('Delete project?'))delProject(p.id);}}/>
                  </div>
                  <div className="project-card__stats">
                    <span>📷 {p.photos.length}</span><span>⏱ {tH}h</span><span>💰 {fmtCur(tE)}</span><span>✅ {oT} open</span>
                  </div>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>

      {/* Install banner */}
      {canInstall && <div className="install-banner">
        <div><div className="install-banner__title">Install SitePro</div><div className="install-banner__desc">Add to home screen for quick access</div></div>
        <button className="btn-primary" onClick={install} style={{padding:'10px 20px',whiteSpace:'nowrap'}}>Install</button>
        <button className="install-banner__x" onClick={()=>setCanInstall(false)}>×</button>
      </div>}

      {/* ADD PROJECT */}
      <Modal open={modal==='addProject'} onClose={()=>{setModal(null);setForm({});}} title="New Project">
        <Inp label="Project Name" placeholder="e.g. Smith Residence" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
        <Inp label="Client" placeholder="Client name" value={form.client||''} onChange={e=>setForm(f=>({...f,client:e.target.value}))} />
        <Inp label="Address" placeholder="Project address" value={form.address||''} onChange={e=>setForm(f=>({...f,address:e.target.value}))} />
        <div className="field"><label className="field__label">Color</label><div style={{display:'flex',gap:8}}>
          {COLORS.map(c=><div key={c} onClick={()=>setForm(f=>({...f,color:c}))} className="color-dot" style={{background:c,border:form.color===c?'3px solid #fff':'3px solid transparent'}}/>)}
        </div></div>
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});}}>Cancel</Btn2><Btn onClick={addProject} disabled={!form.name?.trim()}>Create Project</Btn></div>
      </Modal>

      {/* EMPLOYEES */}
      <Modal open={modal==='employees'} onClose={()=>{setModal(null);setForm({});setEditEmp(null);}} title="Employees & Classifications" wide>
        <div className="sub-tabs">
          {[{id:'roster',label:'Roster',icon:IC.Users},{id:'classifications',label:'Classifications',icon:IC.Tag}].map(t=>(
            <button key={t.id} className={`sub-tab ${empTab===t.id?'sub-tab--active':''}`} onClick={()=>setEmpTab(t.id)}><t.icon/> {t.label}</button>
          ))}
        </div>
        {empTab==='roster' && <>
          <div className="form-section">
            <div className="form-section__title">{editEmp?'Edit Employee':'Add Employee'}</div>
            <Inp label="Full Name" placeholder="John Smith" value={form.empName||''} onChange={e=>setForm(f=>({...f,empName:e.target.value}))} />
            <div className="field-row"><Inp label="Role" placeholder="Foreman" value={form.empRole||''} onChange={e=>setForm(f=>({...f,empRole:e.target.value}))} /><Inp label="Phone" placeholder="555-0123" value={form.empPhone||''} onChange={e=>setForm(f=>({...f,empPhone:e.target.value}))} /></div>
            <AutoInput label="Classification" placeholder="e.g. Journeyman Carpenter" value={form.empCls||''} onChange={v=>setForm(f=>({...f,empCls:v}))} suggestions={data.classifications} />
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              {editEmp&&<Btn2 onClick={()=>{setEditEmp(null);setForm({});}}>Cancel</Btn2>}
              <Btn onClick={saveEmp} disabled={!form.empName?.trim()}>{editEmp?'Update':'Add'}</Btn>
            </div>
          </div>
          {data.employees.map(e=><div key={e.id} className="list-item">
            <div><span className="list-item__name">{e.name}</span>{e.role&&<span className="list-item__sub">{e.role}</span>}<div className="list-item__meta">{e.classification&&<span style={{color:'#f5a623'}}>{e.classification}</span>}{e.phone&&<span style={{marginLeft:e.classification?8:0}}>{e.phone}</span>}</div></div>
            <div style={{display:'flex',gap:6}}><button className="btn-edit" onClick={()=>{setEditEmp(e.id);setForm({empName:e.name,empRole:e.role,empPhone:e.phone,empCls:e.classification});}}><IC.Edit/></button><BtnDel onClick={()=>{if(confirm(`Remove ${e.name}?`))up(d=>{d.employees=d.employees.filter(x=>x.id!==e.id);});}}/></div>
          </div>)}
        </>}
        {empTab==='classifications' && <>
          <div className="form-section">
            <div style={{display:'flex',gap:10}}><div style={{flex:1}}><Inp label="Classification Name" placeholder="e.g. Journeyman Electrician" value={form.clsName||''} onChange={e=>setForm(f=>({...f,clsName:e.target.value}))} /></div>
            <Btn onClick={()=>{const c=form.clsName?.trim();if(!c||data.classifications.includes(c))return;up(d=>{d.classifications.push(c);});setForm(f=>({...f,clsName:''}));}} disabled={!form.clsName?.trim()} style={{alignSelf:'flex-end',marginBottom:14}}>Add</Btn></div>
          </div>
          <p style={{fontSize:12,color:'#888',marginBottom:12}}>Auto-suggested when adding employees.</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {data.classifications.map((c,i)=><div key={i} className="cls-chip"><span>{c}</span><button onClick={()=>up(d=>{d.classifications=d.classifications.filter((_,j)=>j!==i);})} className="cls-chip__x">×</button></div>)}
            {data.classifications.length===0&&<p style={{color:'#555',fontSize:13}}>No classifications yet</p>}
          </div>
        </>}
      </Modal>
    </div>
  );

  // ============================================================
  // PROJECT DETAIL
  // ============================================================
  if(!proj) return null;
  return (
    <div className="app">
      {!online && <div className="offline-bar">⚡ Offline — changes saved locally</div>}
      <div className="page">
        <div className="detail-header">
          <button className="btn-back" onClick={()=>setActive(null)}><IC.Back/></button>
          <div style={{flex:1}}><h2 className="detail-header__name" style={{color:proj.color}}>{proj.name}</h2>{proj.client&&<span className="detail-header__sub">{proj.client}{proj.address?` · ${proj.address}`:''}</span>}</div>
          <Btn2 onClick={()=>{setEmpTab('roster');setModal('employees');}} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><IC.Users/></Btn2>
          <Btn2 onClick={()=>setModal('reports')} style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:6}}><IC.Print/> Reports</Btn2>
        </div>

        <div className="tabs">{TABS.map(t=>{const a=tab===t.id;return(<button key={t.id} className={`tab ${a?'tab--active':''}`} style={a?{background:proj.color,color:'#111'}:{}} onClick={()=>setTab(t.id)}><TabIcon id={t.id}/> {t.label}</button>);})}</div>

        {/* PHOTOS */}
        {tab==='photos'&&<div>
          <div className="section-header"><h3 className="section-title">Photos ({proj.photos.length})</h3><Btn onClick={()=>fileRef.current?.click()}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Cam/> Upload</span></Btn><input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{display:'none'}}/></div>
          {proj.photos.length===0?<div className="empty-state empty-state--sm"><IC.Img/><p className="empty-state__title">No photos yet</p></div>:
          <div className="photo-grid">{proj.photos.map(p=><div key={p.id} className="photo-card"><img src={p.data} alt="" className="photo-card__img"/><div className="photo-card__footer"><span className="mono-sm">{fmtDate(p.date)}</span><BtnDel onClick={()=>delItem('photos',p.id)}/></div></div>)}</div>}
        </div>}

        {/* HOURS */}
        {tab==='hours'&&<div>
          <div className="section-header"><div><h3 className="section-title">Employee Hours</h3><p className="section-sub">Total: <strong style={{color:'#4fc3f7'}}>{proj.hours.reduce((a,h)=>a+h.hours,0).toFixed(1)} hrs</strong></p></div><Btn onClick={()=>{setForm({date:today(),startTime:'07:00',endTime:'15:30'});setModal('addHours');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> Log Hours</span></Btn></div>
          {proj.hours.length===0?<div className="empty-state empty-state--sm"><p className="empty-state__title">No hours logged</p></div>:
          <div className="list">{[...proj.hours].sort((a,b)=>b.date.localeCompare(a.date)).map(e=><div key={e.id} className="list-item"><div style={{flex:1,minWidth:170}}><div className="list-item__name">{e.employee}{e.classification&&<span className="list-item__cls">({e.classification})</span>}</div><div className="mono-sm">{fmtDate(e.date)}{e.startTime?` · ${fmtTime(e.startTime)}`:''}{e.endTime?` – ${fmtTime(e.endTime)}`:''}</div>{e.notes&&<div className="list-item__note">{e.notes}</div>}</div><div style={{display:'flex',alignItems:'center',gap:12}}><span className="big-value" style={{color:'#4fc3f7'}}>{e.hours}h</span><BtnDel onClick={()=>delItem('hours',e.id)}/></div></div>)}</div>}
        </div>}

        {/* EXPENSES */}
        {tab==='expenses'&&<div>
          <div className="section-header"><div><h3 className="section-title">Expenses</h3><p className="section-sub">Total: <strong style={{color:'#66bb6a'}}>{fmtCur(proj.expenses.reduce((a,e)=>a+e.amount,0))}</strong></p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Btn2 onClick={()=>rcptRef.current?.click()} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 14px'}}><IC.Scan/> Scan Receipt</Btn2><input ref={rcptRef} type="file" accept="image/*" capture="environment" onChange={handleReceipt} style={{display:'none'}}/><Btn onClick={()=>{setForm({date:today(),category:'Materials'});setModal('addExpense');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> Add Expense</span></Btn></div></div>
          {proj.expenses.length===0?<div className="empty-state empty-state--sm"><p className="empty-state__title">No expenses recorded</p></div>:
          <div className="list">{[...proj.expenses].sort((a,b)=>b.date.localeCompare(a.date)).map(e=><div key={e.id} className="list-item" style={e.scanned?{borderLeft:'3px solid #ab47bc'}:{}}><div style={{flex:1,minWidth:170}}><div className="list-item__name">{e.description}{e.scanned&&<span className="scanned-badge">Scanned</span>}</div><div className="mono-sm">{fmtDate(e.date)} · <span style={{color:'#f5a623'}}>{e.category}</span>{e.vendor?` · ${e.vendor}`:''}</div></div><div style={{display:'flex',alignItems:'center',gap:12}}><span className="big-value" style={{color:'#66bb6a'}}>{fmtCur(e.amount)}</span><BtnDel onClick={()=>delItem('expenses',e.id)}/></div></div>)}</div>}
        </div>}

        {/* TASKS */}
        {tab==='tasks'&&<div>
          <div className="section-header"><div><h3 className="section-title">Tasks</h3><p className="section-sub">{proj.tasks.filter(t=>t.status==='Done').length}/{proj.tasks.length} completed</p></div><Btn onClick={()=>{setForm({date:today(),priority:'Medium'});setModal('addTask');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> Add Task</span></Btn></div>
          {proj.tasks.length===0?<div className="empty-state empty-state--sm"><p className="empty-state__title">No tasks yet</p></div>:
          <div className="list">{[...proj.tasks].sort((a,b)=>{if(a.status==='Done'&&b.status!=='Done')return 1;if(a.status!=='Done'&&b.status==='Done')return -1;return b.date.localeCompare(a.date);}).map(t=>{const done=t.status==='Done';const pc={High:'#ef5350',Medium:'#f5a623',Low:'#66bb6a'}[t.priority]||'#999';return(
            <div key={t.id} className="list-item" style={{opacity:done?.5:1}}>
              <button className={`task-check ${done?'task-check--done':''}`} style={done?{background:proj.color}:{}} onClick={()=>up(d=>{const p=d.projects.find(p=>p.id===active);if(p){const tk=p.tasks.find(x=>x.id===t.id);if(tk)tk.status=tk.status==='Done'?'Pending':'Done';}})}>
                {done&&<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
              <div style={{flex:1}}><div className="list-item__name" style={{textDecoration:done?'line-through':'none'}}>{t.name}</div><div className="mono-sm">{fmtDate(t.date)}{t.assignee?` · ${t.assignee}`:''}{t.notes?` · ${t.notes}`:''}</div></div>
              <span className="priority-badge" style={{color:pc,background:`${pc}18`}}>{t.priority}</span>
              <BtnDel onClick={()=>delItem('tasks',t.id)}/>
            </div>);})}</div>}
        </div>}
      </div>

      {/* ====== MODALS ====== */}

      {/* ADD HOURS */}
      <Modal open={modal==='addHours'} onClose={()=>{setModal(null);setForm({});}} title="Log Employee Hours">
        {data.employees.length>0?<EmpSelect employees={data.employees} value={form.selEmpId||''} onChange={id=>{const emp=data.employees.find(e=>e.id===id);setForm(f=>({...f,selEmpId:id,empName:emp?.name||'',empCls:emp?.classification||''}));}} />:<Inp label="Employee Name" placeholder="John Smith" value={form.empName||''} onChange={e=>setForm(f=>({...f,empName:e.target.value}))} />}
        {data.employees.length>0&&!form.selEmpId&&<Inp label="Or type name" placeholder="John Smith" value={form.empName||''} onChange={e=>setForm(f=>({...f,empName:e.target.value}))} />}
        <div className="field-row"><Inp label="Start Time" type="time" value={form.startTime||''} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} /><Inp label="End Time" type="time" value={form.endTime||''} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} /></div>
        {form.startTime&&form.endTime&&<div className="calc-box"><span style={{fontSize:12,color:'#999'}}>Calculated</span><span className="big-value" style={{color:'#4fc3f7'}}>{calcH(form.startTime,form.endTime)}h</span></div>}
        <div style={{fontSize:11,color:'#666',marginBottom:8,textAlign:'center'}}>— or enter manually —</div>
        <Inp label="Manual Hours" type="number" step="0.25" min="0" placeholder="Leave blank to use times" value={form.manHrs||''} onChange={e=>setForm(f=>({...f,manHrs:e.target.value}))} />
        <Inp label="Date" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
        <Inp label="Notes (optional)" placeholder="Work performed" value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});}}>Cancel</Btn2><Btn onClick={()=>{
          const name=form.empName?.trim();if(!name)return;
          const hrs=form.manHrs?parseFloat(form.manHrs):(form.startTime&&form.endTime?calcH(form.startTime,form.endTime):0);if(hrs<=0)return;
          const emp=data.employees.find(e=>e.id===form.selEmpId);
          up(d=>{const p=d.projects.find(p=>p.id===active);if(p)p.hours.push({id:uid(),employee:name,classification:emp?.classification||form.empCls||'',hours:form.manHrs?parseFloat(form.manHrs):hrs,startTime:form.manHrs?'':(form.startTime||''),endTime:form.manHrs?'':(form.endTime||''),date:form.date||today(),notes:form.notes||''});});
          setModal(null);setForm({});
        }} disabled={!form.empName?.trim()&&!form.selEmpId}>Save</Btn></div>
      </Modal>

      {/* ADD EXPENSE */}
      <Modal open={modal==='addExpense'} onClose={()=>{setModal(null);setForm({});}} title="Add Expense">
        <Inp label="Description" placeholder="Lumber, concrete, etc." value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
        <Inp label="Amount ($)" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount||''} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
        <Sel label="Category" value={form.category||'Materials'} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{c}</option>)}</Sel>
        <Inp label="Vendor (optional)" placeholder="Vendor" value={form.vendor||''} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} />
        <Inp label="Date" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});}}>Cancel</Btn2><Btn onClick={()=>{if(!form.description?.trim()||!form.amount)return;up(d=>{const p=d.projects.find(p=>p.id===active);if(p)p.expenses.push({id:uid(),description:form.description.trim(),amount:parseFloat(form.amount),category:form.category||'Materials',date:form.date||today(),vendor:form.vendor||''});});setModal(null);setForm({});}} disabled={!form.description?.trim()||!form.amount}>Save</Btn></div>
      </Modal>

      {/* SCAN RECEIPT */}
      <Modal open={modal==='scan'} onClose={()=>{setModal(null);setForm({});setScanPrev(null);setScanErr(null);setScanning(false);}} title="Scan Receipt" wide>
        <div style={{display:'grid',gridTemplateColumns:scanPrev?'150px 1fr':'1fr',gap:20,alignItems:'start'}}>
          {scanPrev&&<div style={{borderRadius:10,overflow:'hidden',border:'1px solid #333'}}><img src={scanPrev} alt="" style={{width:'100%',display:'block'}}/></div>}
          <div>{scanning?<div style={{textAlign:'center',padding:'40px 0'}}><IC.Spin/><p style={{color:'#f5a623',fontWeight:600,marginTop:12}}>Scanning receipt...</p></div>:<>
            {scanErr&&<div className="scan-error">{scanErr}</div>}
            <Inp label="Description" value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
            <Inp label="Amount ($)" type="number" step="0.01" value={form.amount||''} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
            <Sel label="Category" value={form.category||'Materials'} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{c}</option>)}</Sel>
            <Inp label="Vendor" value={form.vendor||''} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} />
            <Inp label="Date" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});setScanPrev(null);setScanErr(null);}}>Cancel</Btn2><Btn onClick={()=>{if(!form.description?.trim()||!form.amount)return;up(d=>{const p=d.projects.find(p=>p.id===active);if(p)p.expenses.push({id:uid(),description:form.description.trim(),amount:parseFloat(form.amount),category:form.category||'Materials',date:form.date||today(),vendor:form.vendor||'',scanned:true});});setModal(null);setForm({});setScanPrev(null);}} disabled={!form.description?.trim()||!form.amount}>Add Expense</Btn></div>
          </>}</div>
        </div>
      </Modal>

      {/* ADD TASK */}
      <Modal open={modal==='addTask'} onClose={()=>{setModal(null);setForm({});}} title="Add Task">
        <Inp label="Task Name" placeholder="Install drywall" value={form.taskName||''} onChange={e=>setForm(f=>({...f,taskName:e.target.value}))} />
        {data.employees.length>0?<EmpSelect employees={data.employees} value={form.assigneeId||''} onChange={id=>setForm(f=>({...f,assigneeId:id}))} label="Assign To" />:<Inp label="Assigned To" placeholder="Employee" value={form.assignee||''} onChange={e=>setForm(f=>({...f,assignee:e.target.value}))} />}
        <Sel label="Priority" value={form.priority||'Medium'} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{['High','Medium','Low'].map(p=><option key={p} value={p}>{p}</option>)}</Sel>
        <Inp label="Date" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
        <Inp label="Notes (optional)" placeholder="Details" value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});}}>Cancel</Btn2><Btn onClick={()=>{if(!form.taskName?.trim())return;const assignee=form.assigneeId?data.employees.find(e=>e.id===form.assigneeId)?.name||'':'';up(d=>{const p=d.projects.find(p=>p.id===active);if(p)p.tasks.push({id:uid(),name:form.taskName.trim(),assignee,priority:form.priority||'Medium',status:'Pending',date:form.date||today(),notes:form.notes||''});});setModal(null);setForm({});}} disabled={!form.taskName?.trim()}>Save</Btn></div>
      </Modal>

      {/* EMPLOYEES (from detail) */}
      <Modal open={modal==='employees'} onClose={()=>{setModal(null);setForm({});setEditEmp(null);}} title="Employees & Classifications" wide>
        <div className="sub-tabs">{[{id:'roster',label:'Roster',icon:IC.Users},{id:'classifications',label:'Classifications',icon:IC.Tag}].map(t=><button key={t.id} className={`sub-tab ${empTab===t.id?'sub-tab--active':''}`} onClick={()=>setEmpTab(t.id)}><t.icon/> {t.label}</button>)}</div>
        {empTab==='roster'&&<><div className="form-section"><div className="form-section__title">{editEmp?'Edit':'Add'} Employee</div><Inp label="Full Name" placeholder="John Smith" value={form.empName||''} onChange={e=>setForm(f=>({...f,empName:e.target.value}))} /><div className="field-row"><Inp label="Role" placeholder="Foreman" value={form.empRole||''} onChange={e=>setForm(f=>({...f,empRole:e.target.value}))} /><Inp label="Phone" placeholder="555-0123" value={form.empPhone||''} onChange={e=>setForm(f=>({...f,empPhone:e.target.value}))} /></div><AutoInput label="Classification" placeholder="e.g. Journeyman Carpenter" value={form.empCls||''} onChange={v=>setForm(f=>({...f,empCls:v}))} suggestions={data.classifications} /><div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>{editEmp&&<Btn2 onClick={()=>{setEditEmp(null);setForm({});}}>Cancel</Btn2>}<Btn onClick={saveEmp} disabled={!form.empName?.trim()}>{editEmp?'Update':'Add'}</Btn></div></div>{data.employees.map(e=><div key={e.id} className="list-item"><div><span className="list-item__name">{e.name}</span>{e.role&&<span className="list-item__sub">{e.role}</span>}<div className="list-item__meta">{e.classification&&<span style={{color:'#f5a623'}}>{e.classification}</span>}{e.phone&&<span style={{marginLeft:e.classification?8:0}}>{e.phone}</span>}</div></div><div style={{display:'flex',gap:6}}><button className="btn-edit" onClick={()=>{setEditEmp(e.id);setForm({empName:e.name,empRole:e.role,empPhone:e.phone,empCls:e.classification});}}><IC.Edit/></button><BtnDel onClick={()=>{if(confirm(`Remove ${e.name}?`))up(d=>{d.employees=d.employees.filter(x=>x.id!==e.id);});}}/></div></div>)}</>}
        {empTab==='classifications'&&<><div className="form-section"><div style={{display:'flex',gap:10}}><div style={{flex:1}}><Inp label="Classification" placeholder="e.g. Journeyman Electrician" value={form.clsName||''} onChange={e=>setForm(f=>({...f,clsName:e.target.value}))} /></div><Btn onClick={()=>{const c=form.clsName?.trim();if(!c||data.classifications.includes(c))return;up(d=>{d.classifications.push(c);});setForm(f=>({...f,clsName:''}));}} disabled={!form.clsName?.trim()} style={{alignSelf:'flex-end',marginBottom:14}}>Add</Btn></div></div><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{data.classifications.map((c,i)=><div key={i} className="cls-chip"><span>{c}</span><button onClick={()=>up(d=>{d.classifications=d.classifications.filter((_,j)=>j!==i);})} className="cls-chip__x">×</button></div>)}{data.classifications.length===0&&<p style={{color:'#555',fontSize:13}}>No classifications yet</p>}</div></>}
      </Modal>

      {/* REPORTS */}
      <Modal open={modal==='reports'} onClose={()=>setModal(null)} title="Print Reports" wide>
        <div className="form-section">
          <div className="form-section__title" style={{color:'#4fc3f7',display:'flex',alignItems:'center',gap:6}}><IC.Sun/> Weather</div>
          <div style={{display:'flex',gap:10}}><div style={{flex:1}}><Inp label="Location" placeholder="e.g. Dallas, TX" value={wLoc} onChange={e=>setWLoc(e.target.value)} /></div><Btn onClick={()=>loadW(wLoc)} disabled={!wLoc.trim()||wLoading} style={{alignSelf:'flex-end',marginBottom:14}}>{wLoading?<><IC.Spin/> Loading</>:'Get Weather'}</Btn></div>
          {weather&&<div className="weather-card"><span style={{fontSize:26}}>☀️</span><div><div style={{fontWeight:700,fontSize:16,color:'#4fc3f7'}}>{weather.temp_f}°F · {weather.condition}</div><div style={{fontSize:12,color:'#8bb8db'}}>Humidity {weather.humidity}% · Wind {weather.wind_mph} mph{weather.high_f?` · H: ${weather.high_f}°F / L: ${weather.low_f}°F`:''}</div></div></div>}
        </div>
        <Inp label="Filter by Date (daily reports)" type="date" value={rptDate} onChange={e=>setRptDate(e.target.value)} />
        <button onClick={()=>setRptDate('')} className="text-btn">Clear date (show all)</button>
        <div className="report-list">
          {[
            {label:'Full Daily Report',desc:'Hours, expenses, tasks',color:'#f5a623',icon:IC.Print,fn:()=>printFull(proj,rptDate,weather)},
            {label:'Employee Hours Report',desc:'By employee with notes',color:'#4fc3f7',icon:IC.Clk,fn:()=>printHours(proj,rptDate,weather)},
          ].map((r,i)=><button key={i} className="report-btn" onClick={()=>{r.fn();setModal(null);}}><div className="report-btn__icon" style={{background:`linear-gradient(135deg,${r.color},${r.color}aa)`}}><r.icon/></div><div><div className="report-btn__label">{r.label}</div><div className="report-btn__desc">{r.desc}</div></div></button>)}
          <div className="report-btn report-btn--inline">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}><div className="report-btn__icon" style={{background:'linear-gradient(135deg,#ab47bc,#ab47bcaa)'}}><IC.Cal/></div><div><div className="report-btn__label">Weekly Employee Report</div><div className="report-btn__desc">Hours per employee across all projects</div></div></div>
            <div style={{display:'flex',gap:10,alignItems:'flex-end'}}><div style={{flex:1}}><Inp label="Pick any date in the week" type="date" value={weekDt} onChange={e=>setWeekDt(e.target.value)} /></div><Btn onClick={()=>{const wr=weekRange(weekDt);printWeekly(data.projects,data.employees,wr.start,wr.end,weather);setModal(null);}} style={{marginBottom:14}}>Print Week</Btn></div>
            {weekDt&&<p style={{fontSize:12,color:'#ab47bc',marginTop:-6}}>Week: {weekRange(weekDt).label}</p>}
          </div>
        </div>
        <div style={{marginTop:18,textAlign:'right'}}><Btn2 onClick={()=>setModal(null)}>Close</Btn2></div>
      </Modal>

      {canInstall&&<div className="install-banner"><div><div className="install-banner__title">Install SitePro</div><div className="install-banner__desc">Add to home screen for quick access</div></div><button className="btn-primary" onClick={install} style={{padding:'10px 20px',whiteSpace:'nowrap'}}>Install</button><button className="install-banner__x" onClick={()=>setCanInstall(false)}>×</button></div>}
    </div>
  );
}

// ============================================================
// MOUNT
// ============================================================
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
