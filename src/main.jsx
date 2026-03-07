import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import * as db from './supabase.js';
import './styles.css';

// ============================================================
// CONSTANTS & HELPERS
// ============================================================
const EXPENSE_CATS = ['Materials','Labor','Equipment','Permits','Subcontractor','Transportation','Safety','Fuel','Rental','Other'];
const COLORS = ['#f5a623','#4fc3f7','#66bb6a','#ef5350','#ab47bc','#ff7043','#26c6da','#d4e157'];
const TABS = [{id:'photos',label:'Photos'},{id:'hours',label:'Hours'},{id:'expenses',label:'Expenses'},{id:'tasks',label:'Tasks'},{id:'notes',label:'Notes'},{id:'files',label:'Files'}];
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = d => new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const fmtDateShort = d => new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
const fmtCur = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const fmtTime = t => { if(!t) return ''; const [h,m]=t.split(':'); const hr=parseInt(h); return `${hr===0?12:hr>12?hr-12:hr}:${m} ${hr>=12?'PM':'AM'}`; };
const calcH = (s,e) => { if(!s||!e) return 0; const [sh,sm]=s.split(':').map(Number); const [eh,em]=e.split(':').map(Number); let d=(eh*60+em)-(sh*60+sm); if(d<0) d+=1440; return Math.round(d/60*100)/100; };
const weekRange = ds => { const d=new Date(ds+'T00:00:00'),day=d.getDay(),mon=new Date(d); mon.setDate(d.getDate()-(day===0?6:day-1)); const sun=new Date(mon); sun.setDate(mon.getDate()+6); return{start:mon.toISOString().split('T')[0],end:sun.toISOString().split('T')[0],label:`${fmtDateShort(mon.toISOString().split('T')[0])} – ${fmtDateShort(sun.toISOString().split('T')[0])}`}; };

// ============================================================
// ICONS
// ============================================================
const IC={Plus:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,Cam:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,Clk:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,Dol:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,Chk:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,Del:()=><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,Back:()=><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,Scan:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,Print:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,Users:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,Edit:()=><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,Sun:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,Tag:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,Cal:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,Spin:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M12 2a10 10 0 0110 10"/></svg>,Img:()=><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>};
const TabIcon=({id})=>{if(id==='photos')return<IC.Cam/>;if(id==='hours')return<IC.Clk/>;if(id==='expenses')return<IC.Dol/>;if(id==='notes')return<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>;if(id==='files')return<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>;return<IC.Chk/>;};

// ============================================================
// UI COMPONENTS (same as before)
// ============================================================
function Modal({open,onClose,title,children,wide}){if(!open)return null;return(<div className="modal-overlay" onClick={onClose}><div className={`modal ${wide?'modal--wide':''}`} onClick={e=>e.stopPropagation()}><h3 className="modal__title">{title}</h3>{children}</div></div>);}
function Inp({label,...props}){return(<div className="field"><label className="field__label">{label}</label><input className="field__input" {...props}/></div>);}
function Sel({label,children,...props}){return(<div className="field"><label className="field__label">{label}</label><select className="field__input" {...props}>{children}</select></div>);}
function Btn({children,onClick,disabled,style}){return<button className={`btn-primary ${disabled?'btn--disabled':''}`} onClick={onClick} disabled={disabled} style={style}>{children}</button>;}
function Btn2({children,onClick,style}){return<button className="btn-secondary" onClick={onClick} style={style}>{children}</button>;}
function BtnDel({onClick}){return<button className="btn-delete" onClick={onClick}><IC.Del/></button>;}
function AutoInput({label,value,onChange,suggestions,placeholder}){const[open,setOpen]=useState(false);const filtered=value?suggestions.filter(s=>s.toLowerCase().includes(value.toLowerCase())&&s.toLowerCase()!==value.toLowerCase()).slice(0,6):[];return(<div className="field" style={{position:'relative'}}><label className="field__label">{label}</label><input className="field__input" value={value} onChange={e=>{onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder={placeholder}/>{open&&filtered.length>0&&<div className="autocomplete-dropdown">{filtered.map((s,i)=><div key={i} className="autocomplete-item" onMouseDown={()=>{onChange(s);setOpen(false);}}>{s}</div>)}</div>}</div>);}
function EmpSelect({employees,value,onChange,label='Employee'}){const[search,setSearch]=useState('');const[open,setOpen]=useState(false);const sel=employees.find(e=>e.id===value);const filtered=search?employees.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())):employees;return(<div className="field" style={{position:'relative'}}><label className="field__label">{label}</label>{sel&&!open?<div className="emp-selected" onClick={()=>setOpen(true)}><div><span className="emp-selected__name">{sel.name}</span>{sel.classification&&<span className="emp-selected__cls">({sel.classification})</span>}</div><span style={{color:'#888',fontSize:12}}>Change</span></div>:<><input className="field__input" style={{borderColor:'#f5a623'}} value={search} onChange={e=>{setSearch(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder="Search employee..." autoFocus={open}/>{open&&<div className="autocomplete-dropdown" style={{maxHeight:200,overflowY:'auto'}}>{filtered.length===0&&<div style={{padding:'12px 14px',color:'#777',fontSize:13}}>No employees found</div>}{filtered.map(emp=><div key={emp.id} className="autocomplete-item" style={{display:'flex',justifyContent:'space-between'}} onMouseDown={()=>{onChange(emp.id);setSearch('');setOpen(false);}}><div><span style={{fontWeight:600}}>{emp.name}</span>{emp.role&&<span style={{marginLeft:6,color:'#888',fontSize:11}}>{emp.role}</span>}</div>{emp.classification&&<span className="cls-badge-sm">{emp.classification}</span>}</div>)}</div>}</>}</div>);}

// ============================================================
// RECEIPT SCANNING & WEATHER (same as before)
// ============================================================
async function scanReceipt(b64){const mt=b64.startsWith('data:image/png')?'image/png':'image/jpeg';const d=b64.split(',')[1];const r=await fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:d,mediaType:mt})});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||'Scan failed');}return r.json();}
async function fetchWeather(loc){try{
  // Step 1: Geocode the location name to lat/lng using Open-Meteo
  const geoR=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=en&format=json`);
  if(!geoR.ok){console.error('Geocode failed:',geoR.status);return null;}
  const geoD=await geoR.json();
  if(!geoD.results||!geoD.results.length){console.error('No location found for:',loc);return null;}
  const{latitude:lat,longitude:lon,name:city,admin1:state,country}=geoD.results[0];
  // Step 2: Get current weather
  const wxR=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`);
  if(!wxR.ok){console.error('Weather API failed:',wxR.status);return null;}
  const wxD=await wxR.json();
  if(!wxD.current){console.error('No current weather data');return null;}
  const codes={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Light showers',81:'Showers',82:'Heavy showers',95:'Thunderstorm',96:'Thunderstorm w/ hail',99:'Severe thunderstorm'};
  return{temp_f:Math.round(wxD.current.temperature_2m),condition:codes[wxD.current.weather_code]||'Unknown',humidity:wxD.current.relative_humidity_2m,wind_mph:Math.round(wxD.current.wind_speed_10m),high_f:Math.round(wxD.daily.temperature_2m_max[0]),low_f:Math.round(wxD.daily.temperature_2m_min[0]),location:`${city}${state?', '+state:''}${country?', '+country:''}`,date:new Date().toISOString().split('T')[0]};
}catch(e){console.error('Weather error:',e);return null;}}

// ============================================================
// PRINT REPORTS (same as before)
// ============================================================
const PS=`*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;padding:40px;color:#222;font-size:13px}h1{font-size:24px;margin-bottom:4px}h2{font-size:15px;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #e8891c;color:#333}.meta{color:#666;font-size:12px;margin-bottom:4px}.stats{display:flex;gap:28px;margin:16px 0;padding:14px 18px;background:#f8f8f8;border-radius:8px;flex-wrap:wrap}.stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888}.stat-value{font-size:20px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:8px}th{text-align:left;padding:7px 10px;background:#f0f0f0;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:2px solid #ddd}td{padding:7px 10px;border-bottom:1px solid #eee;font-size:12px}tr:nth-child(even){background:#fafafa}.total-row td{font-weight:700;border-top:2px solid #333;background:#f5f5f5}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}.done{color:#2e7d32;background:#e8f5e9}.pending{color:#e65100;background:#fff3e0}.high{color:#c62828}.medium{color:#e65100}.low{color:#2e7d32}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#999;text-align:center}.weather-bar{margin:12px 0;padding:10px 16px;background:#e3f2fd;border-radius:8px;font-size:13px;color:#1565c0}.emp-header{display:flex;justify-content:space-between;margin:20px 0 8px;padding:8px 12px;background:#f0f0f0;border-radius:6px}@media print{body{padding:20px}}`;
function wB(w){return w?`<div class="weather-bar"><strong>${w.temp_f}°F</strong> · ${w.condition} · Humidity ${w.humidity}% · Wind ${w.wind_mph} mph${w.high_f?` · H: ${w.high_f}°F / L: ${w.low_f}°F`:''}${w.location?` · ${w.location}`:''}</div>`:'';}
function openPrint(h){const w=window.open('','_blank');w.document.write(h);w.document.close();setTimeout(()=>w.print(),400);}
function printFull(p,ds,de,w){const inRange=(d)=>!ds?true:(de&&de!==ds?(d>=ds&&d<=de):d===ds);const fH=p.hours.filter(h=>inRange(h.date)),fE=p.expenses.filter(e=>inRange(e.date)),fT=p.tasks.filter(t=>inRange(t.date)),tH=fH.reduce((a,h)=>a+Number(h.hours),0),tE=fE.reduce((a,e)=>a+Number(e.amount),0),dl=ds?(de&&de!==ds?`${fmtDate(ds)} – ${fmtDate(de)}`:fmtDate(ds)):'All Dates';const fN=(p.notes||[]).filter(n=>inRange(n.date));openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${p.name}</title><style>${PS}</style></head><body><h1>${p.name} — Full Report</h1><p class="meta">${p.client?p.client+' · ':''}${p.address||''}</p><p class="meta">${dl} · ${new Date().toLocaleString()}</p>${wB(w)}<div class="stats"><div><div class="stat-label">Hours</div><div class="stat-value">${tH.toFixed(1)}h</div></div><div><div class="stat-label">Expenses</div><div class="stat-value">${fmtCur(tE)}</div></div><div><div class="stat-label">Tasks</div><div class="stat-value">${fT.filter(t=>t.status==='Done').length}/${fT.length}</div></div></div>${fN.length>0?`<h2>Daily Notes</h2>${fN.map(n=>`<div style="margin:10px 0;padding:12px 16px;background:#f8f8f8;border-left:3px solid #e8891c;border-radius:4px"><div style="font-size:11px;color:#888;margin-bottom:4px">${fmtDate(n.date)}${n.author?' · '+n.author:''}</div><div style="font-size:13px;white-space:pre-wrap">${n.note}</div></div>`).join('')}`:''}<h2>Hours</h2>${fH.length===0?'<p style="color:#999">None</p>':`<table><thead><tr><th>Employee</th><th>Class</th><th>Date</th><th>Start</th><th>End</th><th>Hrs</th><th>Notes</th></tr></thead><tbody>${fH.map(h=>`<tr><td><b>${h.employee_name}</b></td><td>${h.classification||'—'}</td><td>${fmtDate(h.date)}</td><td>${h.start_time?fmtTime(h.start_time):'—'}</td><td>${h.end_time?fmtTime(h.end_time):'—'}</td><td><b>${h.hours}h</b></td><td>${h.notes||'—'}</td></tr>`).join('')}<tr class="total-row"><td colspan="5">Total</td><td>${tH.toFixed(1)}h</td><td></td></tr></tbody></table>`}<h2>Expenses</h2>${fE.length===0?'<p style="color:#999">None</p>':`<table><thead><tr><th>Desc</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th></tr></thead><tbody>${fE.map(e=>`<tr><td><b>${e.description}</b></td><td>${e.category}${e.subcategory?' / '+e.subcategory:''}</td><td>${e.vendor||'—'}</td><td>${fmtDate(e.date)}</td><td><b>${fmtCur(e.amount)}</b></td></tr>`).join('')}<tr class="total-row"><td colspan="4">Total</td><td>${fmtCur(tE)}</td></tr></tbody></table>`}<h2>Tasks</h2>${fT.length===0?'<p style="color:#999">None</p>':`<table><thead><tr><th>Task</th><th>Assigned</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead><tbody>${fT.map(t=>`<tr><td><b>${t.name}</b></td><td>${t.assignee||'—'}</td><td class="${t.priority.toLowerCase()}">${t.priority}</td><td><span class="badge ${t.status==='Done'?'done':'pending'}">${t.status}</span></td><td>${fmtDate(t.date)}</td></tr>`).join('')}</tbody></table>`}<div class="footer">SitePro · ${p.name} · ${dl}</div></body></html>`);}
function printHours(p,ds,de,w){const inRange=(d)=>!ds?true:(de&&de!==ds?(d>=ds&&d<=de):d===ds);const fH=p.hours.filter(h=>inRange(h.date)),tH=fH.reduce((a,h)=>a+Number(h.hours),0),dl=ds?(de&&de!==ds?`${fmtDate(ds)} – ${fmtDate(de)}`:fmtDate(ds)):'All Dates';const byE={};fH.forEach(h=>{if(!byE[h.employee_name])byE[h.employee_name]={entries:[],cls:h.classification||''};byE[h.employee_name].entries.push(h);if(h.classification)byE[h.employee_name].cls=h.classification;});openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hours - ${p.name}</title><style>${PS}</style></head><body><h1>${p.name} — Employee Hours</h1><p class="meta">${dl} · ${new Date().toLocaleString()}</p>${wB(w)}<div class="stats"><div><div class="stat-label">Employees</div><div class="stat-value">${Object.keys(byE).length}</div></div><div><div class="stat-label">Total</div><div class="stat-value">${tH.toFixed(1)}h</div></div></div>${Object.entries(byE).map(([n,d])=>{const et=d.entries.reduce((a,h)=>a+Number(h.hours),0);return`<div class="emp-header"><div><b>${n}</b>${d.cls?` <span style="color:#e8891c;font-size:12px">(${d.cls})</span>`:''}</div><div><b>${et.toFixed(1)}h</b></div></div><table><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Hrs</th><th>Notes</th></tr></thead><tbody>${d.entries.sort((a,b)=>b.date.localeCompare(a.date)).map(h=>`<tr><td>${fmtDate(h.date)}</td><td>${h.start_time?fmtTime(h.start_time):'—'}</td><td>${h.end_time?fmtTime(h.end_time):'—'}</td><td><b>${h.hours}h</b></td><td>${h.notes||'—'}</td></tr>`).join('')}<tr class="total-row"><td colspan="3">Subtotal</td><td>${et.toFixed(1)}h</td><td></td></tr></tbody></table>`;}).join('')}<div style="margin-top:24px;padding:12px 18px;background:#f0f0f0;border-radius:8px;display:flex;justify-content:space-between;font-weight:700;font-size:15px"><span>Grand Total</span><span>${tH.toFixed(1)}h</span></div><div class="footer">SitePro · ${p.name} · ${dl}</div></body></html>`);}
function printWeekly(projects,employees,ws,we,w){const wl=`${fmtDate(ws)} – ${fmtDate(we)}`;const ed={};employees.forEach(e=>{ed[e.id]={name:e.name,cls:e.classification||'',projects:{}};});projects.forEach(p=>{p.hours.forEach(h=>{if(h.date>=ws&&h.date<=we){const eid=Object.keys(ed).find(id=>ed[id].name===h.employee_name)||h.employee_name;if(!ed[eid])ed[eid]={name:h.employee_name,cls:h.classification||'',projects:{}};if(!ed[eid].projects[p.name])ed[eid].projects[p.name]={hours:0,entries:[]};ed[eid].projects[p.name].hours+=Number(h.hours);ed[eid].projects[p.name].entries.push(h);}});});const act=Object.values(ed).filter(e=>Object.keys(e.projects).length>0);const gt=act.reduce((s,e)=>s+Object.values(e.projects).reduce((a,p)=>a+p.hours,0),0);openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Weekly - ${wl}</title><style>${PS} .proj-bar{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:#fff3e0;color:#e65100;margin-right:6px}</style></head><body><h1>Weekly Employee Hours</h1><p class="meta">${wl} · ${new Date().toLocaleString()}</p>${wB(w)}<div class="stats"><div><div class="stat-label">Employees</div><div class="stat-value">${act.length}</div></div><div><div class="stat-label">Total</div><div class="stat-value">${gt.toFixed(1)}h</div></div></div><h2>Summary</h2><table><thead><tr><th>Employee</th><th>Class</th><th>Projects</th><th>Total</th></tr></thead><tbody>${act.map(e=>{const t=Object.values(e.projects).reduce((a,p)=>a+p.hours,0);return`<tr><td><b>${e.name}</b></td><td>${e.cls||'—'}</td><td>${Object.keys(e.projects).map(p=>`<span class="proj-bar">${p}</span>`).join('')}</td><td><b>${t.toFixed(1)}h</b></td></tr>`;}).join('')}<tr class="total-row"><td colspan="3">Grand Total</td><td>${gt.toFixed(1)}h</td></tr></tbody></table>${act.map(e=>{const et=Object.values(e.projects).reduce((a,p)=>a+p.hours,0);return`<div class="emp-header"><div><b>${e.name}</b>${e.cls?` <span style="color:#e8891c;font-size:12px">(${e.cls})</span>`:''}</div><div><b>${et.toFixed(1)}h</b></div></div>${Object.entries(e.projects).map(([pn,pd])=>`<p style="font-size:12px;color:#555;margin:8px 0 4px;font-weight:600">📁 ${pn} — ${pd.hours.toFixed(1)}h</p><table><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Hrs</th><th>Notes</th></tr></thead><tbody>${pd.entries.sort((a,b)=>a.date.localeCompare(b.date)).map(h=>`<tr><td>${fmtDate(h.date)}</td><td>${h.start_time?fmtTime(h.start_time):'—'}</td><td>${h.end_time?fmtTime(h.end_time):'—'}</td><td><b>${h.hours}h</b></td><td>${h.notes||'—'}</td></tr>`).join('')}</tbody></table>`).join('')}`;}).join('<hr style="margin:24px 0;border:none;border-top:1px solid #ddd">')}<div class="footer">SitePro · Weekly · ${wl}</div></body></html>`);}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // login | signup | confirm
  const saved = (() => { try { const s = localStorage.getItem('sb_remember'); return s ? JSON.parse(s) : null; } catch { return null; } })();
  const [email, setEmail] = useState(saved?.email || '');
  const [password, setPassword] = useState(saved?.password || '');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(!!saved);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await db.signUp(email, password, name);
        if (!res.access_token && res.user) { setMode('confirm'); }
        else { if(remember) localStorage.setItem('sb_remember',JSON.stringify({email,password})); else localStorage.removeItem('sb_remember'); onAuth(); }
      } else {
        await db.signIn(email, password);
        if(remember) localStorage.setItem('sb_remember',JSON.stringify({email,password})); else localStorage.removeItem('sb_remember');
        onAuth();
      }
    } catch (e) {
      setError(e.message || 'Something went wrong');
    }
    setLoading(false);
  };

  if (mode === 'confirm') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo"><div className="auth-logo__icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#111" strokeWidth="2"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-5h6v5"/></svg></div><div className="auth-logo__text">SitePro</div></div>
          <div className="auth-success">Check your email! Click the confirmation link to activate your account, then come back here and log in.</div>
          <div style={{marginTop:20}}><Btn onClick={()=>setMode('login')} style={{width:'100%'}}>Back to Login</Btn></div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo"><div className="auth-logo__icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#111" strokeWidth="2"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-5h6v5"/></svg></div><div className="auth-logo__text">SitePro</div></div>
        <div className="auth-subtitle">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</div>
        {error && <div className="auth-error">{error}</div>}
        {mode === 'signup' && <Inp label="Full Name" placeholder="John Smith" value={name} onChange={e=>setName(e.target.value)} />}
        <Inp label="Email" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <Inp label="Password" type="password" placeholder={mode==='signup'?'At least 6 characters':'Your password'} value={password} onChange={e=>setPassword(e.target.value)} />
        {mode==='login'&&<label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'#ccc',marginTop:4}}><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{accentColor:'#f5a623',width:16,height:16}} /> Remember me</label>}
        <Btn onClick={handleSubmit} disabled={loading || !email || !password || (mode==='signup'&&!name)} style={{width:'100%',marginTop:8}}>
          {loading ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><IC.Spin/> {mode==='login'?'Signing in...':'Creating account...'}</span> : mode==='login'?'Sign In':'Create Account'}
        </Btn>
        <div className="auth-toggle">
          {mode==='login' ? <>Don't have an account? <button onClick={()=>{setMode('signup');setError('');}}>Create Account</button></> : <>Already have an account? <button onClick={()=>{setMode('login');setError('');}}>Sign In</button></>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP (with Supabase data)
// ============================================================
function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [active, setActive] = useState(null);
  const [tab, setTab] = useState('photos');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPrev, setScanPrev] = useState(null);
  const [scanErr, setScanErr] = useState(null);
  const [rptDate, setRptDate] = useState(today());
  const [weather, setWeather] = useState(null);
  const [wLoading, setWLoading] = useState(false);
  const [wLoc, setWLoc] = useState('');
  const [empTab, setEmpTab] = useState('roster');
  const [editEmp, setEditEmp] = useState(null);
  const [weekDt, setWeekDt] = useState(today());
  const [isAdmin, setIsAdmin] = useState(false);
  const [appUsers, setAppUsers] = useState([]);
  const [expSubcats, setExpSubcats] = useState([]);
  const [editExpId, setEditExpId] = useState(null);
  const [openDate, setOpenDate] = useState(null);
  const fileRef = useRef(null);
  const rcptRef = useRef(null);
  const docRef = useRef(null);

  // Check existing session
  useEffect(() => { (async () => { const ok = await db.restoreSession(); setAuthed(ok); setChecking(false); })(); }, []);

  // Load data + check admin role when authed
  useEffect(() => { if (authed) { loadAll(); checkAdmin(); } }, [authed]);

  const checkAdmin = async () => {
    try {
      const user = db.getUser();
      if (!user) return;
      const profiles = await db.query('profiles', { filter: `id=eq.${user.id}` });
      if (profiles.length > 0 && profiles[0].role === 'admin') { setIsAdmin(true); }
      else {
        // First user auto-becomes admin if no admin exists
        const allProfiles = await db.query('profiles');
        const hasAdmin = allProfiles.some(p => p.role === 'admin');
        if (!hasAdmin && profiles.length > 0) {
          await db.update('profiles', user.id, { role: 'admin' });
          setIsAdmin(true);
        }
      }
      // Load all app users for role management
      const allUsers = await db.query('profiles');
      setAppUsers(allUsers);
    } catch (e) { console.log('Admin check:', e); }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prjs, emps, cls, subcats] = await Promise.all([
        db.query('projects', { order: 'created_at.desc' }),
        db.query('employees', { order: 'name.asc' }),
        db.query('classifications', { order: 'name.asc' }),
        db.query('expense_subcategories', { order: 'name.asc' }).catch(() => []),
      ]);
      // Load sub-data for each project
      const full = await Promise.all(prjs.map(async p => {
        const [photos, hours, expenses, tasks, notes, files] = await Promise.all([
          db.query('photos', { filter: `project_id=eq.${p.id}`, order: 'date.desc' }),
          db.query('hours', { filter: `project_id=eq.${p.id}`, order: 'date.desc' }),
          db.query('expenses', { filter: `project_id=eq.${p.id}`, order: 'date.desc' }),
          db.query('tasks', { filter: `project_id=eq.${p.id}`, order: 'date.desc' }),
          db.query('daily_notes', { filter: `project_id=eq.${p.id}`, order: 'date.desc' }).catch(() => []),
          db.query('files', { filter: `project_id=eq.${p.id}`, order: 'created_at.desc' }).catch(() => []),
        ]);
        return { ...p, photos, hours, expenses, tasks, notes: notes || [], files: files || [] };
      }));
      setProjects(full);
      setEmployees(emps);
      setClassifications(cls.map(c => c.name));
      setExpSubcats(subcats || []);
    } catch (e) { console.error('Load error:', e); }
    setLoading(false);
  };

  // Refresh just one project's sub-data
  const refreshProject = async (projId) => {
    const [photos, hours, expenses, tasks, notes, files] = await Promise.all([
      db.query('photos', { filter: `project_id=eq.${projId}`, order: 'date.desc' }),
      db.query('hours', { filter: `project_id=eq.${projId}`, order: 'date.desc' }),
      db.query('expenses', { filter: `project_id=eq.${projId}`, order: 'date.desc' }),
      db.query('tasks', { filter: `project_id=eq.${projId}`, order: 'date.desc' }),
      db.query('daily_notes', { filter: `project_id=eq.${projId}`, order: 'date.desc' }).catch(() => []),
      db.query('files', { filter: `project_id=eq.${projId}`, order: 'created_at.desc' }).catch(() => []),
    ]);
    setProjects(prev => prev.map(p => p.id === projId ? { ...p, photos, hours, expenses, tasks, notes: notes || [], files: files || [] } : p));
  };

  const handleLogout = async () => { await db.signOut(); setAuthed(false); setProjects([]); setEmployees([]); setClassifications([]); setActive(null); };

  // ---- PROJECT CRUD ----
  const addProject = async () => {
    if (!form.name?.trim()) return; setSaving(true);
    try {
      const [newP] = await db.insert('projects', { name: form.name.trim(), client: form.client || '', address: form.address || '', color: form.color || '#f5a623' });
      setProjects(prev => [{ ...newP, photos: [], hours: [], expenses: [], tasks: [], notes: [], files: [] }, ...prev]);
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false); setModal(null); setForm({});
  };

  const delProject = async (id) => {
    setSaving(true);
    try { await db.remove('projects', id); setProjects(prev => prev.filter(p => p.id !== id)); if (active === id) setActive(null); }
    catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const delItem = async (table, itemId) => {
    setSaving(true);
    try { await db.remove(table, itemId); await refreshProject(active); }
    catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  // ---- PHOTOS ----
  const handlePhoto = (e) => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = async (ev) => {
        setSaving(true);
        try { await db.insert('photos', { project_id: active, image_data: ev.target.result, name: f.name, date: today() }); await refreshProject(active); }
        catch (e) { alert('Error: ' + e.message); }
        setSaving(false);
      };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  };

  // ---- HOURS ----
  const addHoursEntry = async () => {
    const name = form.empName?.trim(); if (!name) return;
    let hrs;
    if (form.manHrs) {
      hrs = parseFloat(form.manHrs);
    } else if (form.startTime && form.endTime) {
      const raw = calcH(form.startTime, form.endTime);
      const lunchDed = form.deductLunch ? 0.5 : 0;
      const breakDed = form.deductBreaks ? 0.5 : 0;
      hrs = Math.max(0, raw - lunchDed - breakDed);
    } else { hrs = 0; }
    if (hrs <= 0) return; setSaving(true);
    const emp = employees.find(e => e.id === form.selEmpId);
    const breakNotes = [form.deductLunch && '30min lunch', form.deductBreaks && '2x15min breaks'].filter(Boolean).join(', ');
    const fullNotes = [form.notes, breakNotes ? `Breaks: ${breakNotes}` : ''].filter(Boolean).join(' | ');
    // Support multiple dates
    const dates = (form.extraDates && form.extraDates.length > 0) ? [form.date || today(), ...form.extraDates] : [form.date || today()];
    const uniqueDates = [...new Set(dates)].filter(Boolean);
    try {
      for (const d of uniqueDates) {
        await db.insert('hours', { project_id: active, employee_name: name, classification: emp?.classification || form.empCls || '', hours: Math.round(hrs * 100) / 100, start_time: form.manHrs ? '' : (form.startTime || ''), end_time: form.manHrs ? '' : (form.endTime || ''), date: d, notes: fullNotes });
      }
      await refreshProject(active);
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false); setModal(null); setForm({});
  };

  // ---- EXPENSES ----
  const addExpense = async (scanned = false) => {
    if (!form.description?.trim() || !form.amount) return; setSaving(true);
    try {
      if (editExpId) {
        await db.update('expenses', editExpId, { description: form.description.trim(), amount: parseFloat(form.amount), category: form.category || 'Materials', subcategory: form.subcategory || '', vendor: form.vendor || '', date: form.date || today() });
      } else {
        await db.insert('expenses', { project_id: active, description: form.description.trim(), amount: parseFloat(form.amount), category: form.category || 'Materials', subcategory: form.subcategory || '', vendor: form.vendor || '', date: form.date || today(), scanned });
      }
      await refreshProject(active);
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false); setModal(null); setForm({}); setScanPrev(null); setScanErr(null); setEditExpId(null);
  };

  const handleReceipt = async (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
    const r = new FileReader();
    r.onload = async (ev) => {
      const b = ev.target.result; setScanPrev(b); setScanning(true); setScanErr(null); setModal('scan');
      try { const res = await scanReceipt(b); setForm({ description: res.description || '', amount: res.amount?.toString() || '', category: res.category || 'Materials', vendor: res.vendor || '', date: res.date || today() }); setScanning(false); }
      catch { setScanErr('Could not read receipt.'); setForm({ date: today(), category: 'Materials' }); setScanning(false); }
    };
    r.readAsDataURL(f);
  };

  // ---- TASKS ----
  const addTask = async () => {
    if (!form.taskName?.trim()) return; setSaving(true);
    const assignee = form.assigneeId ? employees.find(e => e.id === form.assigneeId)?.name || '' : '';
    try {
      await db.insert('tasks', { project_id: active, name: form.taskName.trim(), assignee, priority: form.priority || 'Medium', status: 'Pending', date: form.date || today(), notes: form.notes || '' });
      await refreshProject(active);
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false); setModal(null); setForm({});
  };

  const toggleTask = async (taskId, currentStatus) => {
    setSaving(true);
    try { await db.update('tasks', taskId, { status: currentStatus === 'Done' ? 'Pending' : 'Done' }); await refreshProject(active); }
    catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  // ---- EMPLOYEES ----
  const saveEmp = async () => {
    if (!form.empName?.trim()) return; setSaving(true);
    const cls = form.empCls?.trim() || '';
    try {
      if (editEmp) {
        await db.update('employees', editEmp, { name: form.empName.trim(), role: form.empRole || '', phone: form.empPhone || '', classification: cls });
        setEmployees(prev => prev.map(e => e.id === editEmp ? { ...e, name: form.empName.trim(), role: form.empRole || '', phone: form.empPhone || '', classification: cls } : e));
      } else {
        const [emp] = await db.insert('employees', { name: form.empName.trim(), role: form.empRole || '', phone: form.empPhone || '', classification: cls });
        setEmployees(prev => [...prev, emp]);
      }
      if (cls && !classifications.includes(cls)) {
        await db.insert('classifications', { name: cls });
        setClassifications(prev => [...prev, cls]);
      }
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false); setModal(null); setForm({}); setEditEmp(null);
  };

  const loadW = async loc => { if (!loc) return; setWLoading(true); const w = await fetchWeather(loc); if(w){setWeather(w);}else{alert('Could not get weather for "'+loc+'". Try a city name like "Dallas" or "Los Angeles".');} setWLoading(false); };

  const toggleRole = async (userId, currentRole, userName) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    if (currentRole === 'admin' && !confirm(`Remove admin access from ${userName || 'this user'}?`)) return;
    setSaving(true);
    try {
      await db.update('profiles', userId, { role: newRole });
      setAppUsers(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const renderEmployeeModal = () => (
    <Modal open={modal==='employees'} onClose={()=>{setModal(null);setForm({});setEditEmp(null);}} title="Employees & Classifications" wide>
      <div className="sub-tabs">{[{id:'roster',label:'Roster',icon:IC.Users},{id:'classifications',label:'Classifications',icon:IC.Tag},isAdmin&&{id:'appusers',label:'App Users',icon:IC.Edit}].filter(Boolean).map(t=><button key={t.id} className={`sub-tab ${empTab===t.id?'sub-tab--active':''}`} onClick={()=>setEmpTab(t.id)}><t.icon/> {t.label}</button>)}</div>
      {empTab==='roster'&&<><div className="form-section"><div className="form-section__title">{editEmp?'Edit':'Add'} Employee</div><Inp label="Full Name" placeholder="John Smith" value={form.empName||''} onChange={e=>setForm(f=>({...f,empName:e.target.value}))}/><div className="field-row"><Inp label="Role" placeholder="Foreman" value={form.empRole||''} onChange={e=>setForm(f=>({...f,empRole:e.target.value}))}/><Inp label="Phone" placeholder="555-0123" value={form.empPhone||''} onChange={e=>setForm(f=>({...f,empPhone:e.target.value}))}/></div><AutoInput label="Classification" placeholder="e.g. Journeyman Carpenter" value={form.empCls||''} onChange={v=>setForm(f=>({...f,empCls:v}))} suggestions={classifications}/><div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>{editEmp&&<Btn2 onClick={()=>{setEditEmp(null);setForm({});}}>Cancel</Btn2>}<Btn onClick={saveEmp} disabled={!form.empName?.trim()||saving}>{editEmp?'Update':'Add'}</Btn></div></div>{employees.map(e=><div key={e.id} className="list-item"><div><span className="list-item__name">{e.name}</span>{e.role&&<span className="list-item__sub">{e.role}</span>}<div className="list-item__meta">{e.classification&&<span style={{color:'#f5a623'}}>{e.classification}</span>}{e.phone&&<span style={{marginLeft:e.classification?8:0}}>{e.phone}</span>}</div></div><div style={{display:'flex',gap:6}}><button className="btn-edit" onClick={()=>{setEditEmp(e.id);setForm({empName:e.name,empRole:e.role,empPhone:e.phone,empCls:e.classification});}}><IC.Edit/></button><BtnDel onClick={async()=>{if(confirm(`Remove ${e.name}?`)){setSaving(true);try{await db.remove('employees',e.id);setEmployees(prev=>prev.filter(x=>x.id!==e.id));}catch(er){alert(er.message);}setSaving(false);}}}/></div></div>)}</>}
      {empTab==='classifications'&&<><div className="form-section"><div style={{display:'flex',gap:10}}><div style={{flex:1}}><Inp label="Classification" placeholder="e.g. Journeyman Electrician" value={form.clsName||''} onChange={e=>setForm(f=>({...f,clsName:e.target.value}))}/></div><Btn onClick={async()=>{const c=form.clsName?.trim();if(!c||classifications.includes(c))return;setSaving(true);try{await db.insert('classifications',{name:c});setClassifications(prev=>[...prev,c]);}catch(e){alert(e.message);}setSaving(false);setForm(f=>({...f,clsName:''}));}} disabled={!form.clsName?.trim()||saving} style={{alignSelf:'flex-end',marginBottom:14}}>Add</Btn></div></div><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{classifications.map((c,i)=><div key={i} className="cls-chip"><span>{c}</span><button className="cls-chip__x" onClick={async()=>{setSaving(true);try{const all=await db.query('classifications',{filter:`name=eq.${encodeURIComponent(c)}`});if(all[0])await db.remove('classifications',all[0].id);setClassifications(prev=>prev.filter((_,j)=>j!==i));}catch(e){alert(e.message);}setSaving(false);}}>×</button></div>)}{classifications.length===0&&<p style={{color:'#555',fontSize:13}}>No classifications yet</p>}</div></>}
      {empTab==='appusers'&&isAdmin&&<>
        <p style={{fontSize:13,color:'#888',marginBottom:16}}>Manage who has admin access. Admins can see expense totals and amounts. Members can add expenses but cannot see costs.</p>
        {appUsers.length===0?<p style={{color:'#555',fontSize:13}}>No app users yet. Users appear here after they create an account.</p>:
        <div className="list">{appUsers.map(u=>{const isMe=u.id===db.getUser()?.id;return(<div key={u.id} className="list-item"><div><span className="list-item__name">{u.full_name||'(no name)'}{isMe&&<span style={{marginLeft:8,fontSize:10,color:'#4fc3f7'}}>(you)</span>}</span><div className="list-item__meta" style={{marginTop:4}}>{u.role==='admin'?<span style={{background:'#f5a623',color:'#111',padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700}}>ADMIN</span>:<span style={{background:'#333',color:'#999',padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:600}}>MEMBER</span>}</div></div>
          {!isMe&&<button className={u.role==='admin'?'btn-secondary':'btn-primary'} style={{padding:'6px 14px',fontSize:12,whiteSpace:'nowrap'}} onClick={()=>toggleRole(u.id,u.role,u.full_name)}>{u.role==='admin'?'Remove Admin':'Make Admin'}</button>}
        </div>);})}</div>}
      </>}
    </Modal>
  );

  // ---- RENDER ----
  if (checking) return <div className="loading-screen"><div className="loading-logo"><svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#111" strokeWidth="2"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-5h6v5"/></svg></div><div className="loading-spinner"/></div>;
  if (!authed) return <AuthScreen onAuth={() => { setAuthed(true); }} />;

  const user = db.getUser();
  const proj = projects.find(p => p.id === active);

  // ============================================================
  // DASHBOARD
  // ============================================================
  if (!active) return (
    <div className="app">
      {saving && <div className="loading-overlay"><IC.Spin/><div className="loading-overlay__text">Saving...</div></div>}
      {loading && <div className="loading-overlay"><IC.Spin/><div className="loading-overlay__text">Loading your data...</div></div>}
      <div className="page">
        <div className="header">
          <div>
            <div className="header__brand"><div className="header__logo"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#111" strokeWidth="2"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-5h6v5"/></svg></div><h1 className="header__title">SitePro</h1></div>
            <p className="header__sub">Construction Project Manager</p>
          </div>
          <div className="header__actions">
            <div className="user-bar">{isAdmin&&<span style={{background:'#f5a623',color:'#111',padding:'2px 6px',borderRadius:4,fontSize:9,fontWeight:800,letterSpacing:1}}>ADMIN</span>}<span className="user-bar__email">{user?.email}</span><button className="user-bar__logout" onClick={handleLogout}>Logout</button></div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          <Btn2 onClick={()=>{setEmpTab('roster');setModal('employees');}} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 14px'}}><IC.Users/> Employees</Btn2>
          <Btn onClick={()=>{setForm({color:'#f5a623'});setModal('addProject');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> New Project</span></Btn>
          <Btn2 onClick={loadAll} style={{padding:'10px 14px',fontSize:12}}>↻ Refresh</Btn2>
        </div>

        {projects.length > 0 && <div className="stats-grid">
          {[{l:'Projects',v:projects.length,c:'#f5a623'},{l:'Employees',v:employees.length,c:'#ab47bc'},{l:'Total Hours',v:projects.reduce((s,p)=>s+p.hours.reduce((a,h)=>a+Number(h.hours),0),0).toFixed(1),c:'#4fc3f7'},isAdmin&&{l:'Expenses',v:fmtCur(projects.reduce((s,p)=>s+p.expenses.reduce((a,e)=>a+Number(e.amount),0),0)),c:'#66bb6a'},{l:'Open Tasks',v:projects.reduce((s,p)=>s+p.tasks.filter(t=>t.status!=='Done').length,0),c:'#ef5350'}].filter(Boolean).map((s,i)=><div key={i} className="stat-card"><div className="stat-card__label">{s.l}</div><div className="stat-card__value" style={{color:s.c}}>{s.v}</div></div>)}
        </div>}

        {projects.length === 0 && !loading ? <div className="empty-state"><svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2"><path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-5h6v5"/></svg><p className="empty-state__title">No projects yet</p><p className="empty-state__desc">Create your first project to get started</p></div> :
        <div className="project-grid">{projects.map(p=>{const tH=p.hours.reduce((a,h)=>a+Number(h.hours),0),tE=p.expenses.reduce((a,e)=>a+Number(e.amount),0),oT=p.tasks.filter(t=>t.status!=='Done').length;return(<div key={p.id} className="project-card" onClick={()=>{setActive(p.id);setTab('photos');}}><div className="project-card__bar" style={{background:`linear-gradient(90deg,${p.color},${p.color}88)`}}/><div className="project-card__body"><div className="project-card__top"><div><h3 className="project-card__name">{p.name}</h3>{p.client&&<p className="project-card__client">{p.client}</p>}{p.address&&<p className="project-card__addr">{p.address}</p>}</div><BtnDel onClick={e=>{e.stopPropagation();if(confirm('Delete project?'))delProject(p.id);}}/></div><div className="project-card__stats"><span>📷 {p.photos.length}</span><span>⏱ {tH.toFixed(1)}h</span>{isAdmin&&<span>💰 {fmtCur(tE)}</span>}<span>✅ {oT} open</span></div></div></div>);})}</div>}
      </div>

      {/* ADD PROJECT */}
      <Modal open={modal==='addProject'} onClose={()=>{setModal(null);setForm({});}} title="New Project">
        <Inp label="Project Name" placeholder="e.g. Smith Residence" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
        <Inp label="Client" placeholder="Client name" value={form.client||''} onChange={e=>setForm(f=>({...f,client:e.target.value}))} />
        <Inp label="Address" placeholder="Project address" value={form.address||''} onChange={e=>setForm(f=>({...f,address:e.target.value}))} />
        <div className="field"><label className="field__label">Color</label><div style={{display:'flex',gap:8}}>{COLORS.map(c=><div key={c} onClick={()=>setForm(f=>({...f,color:c}))} className="color-dot" style={{background:c,border:form.color===c?'3px solid #fff':'3px solid transparent'}}/>)}</div></div>
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});}}>Cancel</Btn2><Btn onClick={addProject} disabled={!form.name?.trim()||saving}>Create</Btn></div>
      </Modal>

      {/* EMPLOYEES */}
      {renderEmployeeModal()}
    </div>
  );

  // ============================================================
  // PROJECT DETAIL
  // ============================================================
  if (!proj) return null;
  return (
    <div className="app">
      {saving && <div className="loading-overlay"><IC.Spin/><div className="loading-overlay__text">Saving...</div></div>}
      <div className="page">
        <div className="detail-header">
          <button className="btn-back" onClick={()=>setActive(null)}><IC.Back/></button>
          <div style={{flex:1}}><h2 className="detail-header__name" style={{color:proj.color}}>{proj.name}</h2>{proj.client&&<span className="detail-header__sub">{proj.client}{proj.address?` · ${proj.address}`:''}</span>}</div>
          <Btn2 onClick={()=>{setEmpTab('roster');setModal('employees');}} style={{padding:'8px 12px'}}><IC.Users/></Btn2>
          <Btn2 onClick={()=>setModal('reports')} style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:6}}><IC.Print/> Reports</Btn2>
          <Btn2 onClick={()=>refreshProject(active)} style={{padding:'8px 12px',fontSize:12}}>↻</Btn2>
        </div>

        <div className="tabs">{TABS.map(t=>{const a=tab===t.id;return <button key={t.id} className={`tab ${a?'tab--active':''}`} style={a?{background:proj.color,color:'#111'}:{}} onClick={()=>{setTab(t.id);setOpenDate(null);}}><TabIcon id={t.id}/> {t.label}</button>;})}</div>

        {/* PHOTOS */}
        {tab==='photos'&&<div>
          <div className="section-header"><h3 className="section-title">Photos ({proj.photos.length})</h3><Btn onClick={()=>fileRef.current?.click()}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Cam/> Upload</span></Btn><input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{display:'none'}}/></div>
          {proj.photos.length===0?<div className="empty-state empty-state--sm"><IC.Img/><p className="empty-state__title">No photos yet</p></div>:
          openDate&&tab==='photos'?(()=>{
            const dayPhotos=proj.photos.filter(p=>p.date===openDate);
            return <div>
              <button onClick={()=>setOpenDate(null)} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',color:'#f5a623',cursor:'pointer',fontFamily:'var(--font)',fontSize:14,fontWeight:600,padding:'8px 0',marginBottom:8}}><IC.Back/> Back to dates</button>
              <div style={{padding:'10px 14px',background:'var(--bg2)',borderRadius:10,marginBottom:12,border:'1px solid var(--brd)',fontWeight:700,fontSize:16,color:'#fff'}}>{fmtDate(openDate)} · {dayPhotos.length} photo{dayPhotos.length!==1?'s':''}</div>
              <div className="photo-grid">{dayPhotos.map(p=><div key={p.id} className="photo-card"><img src={p.image_data} alt="" className="photo-card__img"/><div className="photo-card__footer"><span className="mono-sm">{p.name||''}</span><BtnDel onClick={()=>delItem('photos',p.id)}/></div></div>)}</div>
            </div>;
          })():
          <div className="date-folders">{(()=>{
            const byDate={};proj.photos.forEach(p=>{if(!byDate[p.date])byDate[p.date]=[];byDate[p.date].push(p);});
            return Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>
              <div key={date} className="date-folder" onClick={()=>setOpenDate(date)} style={{padding:'14px 16px',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:12,marginBottom:8,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    {items[0]?.image_data&&<img src={items[0].image_data} alt="" style={{width:48,height:48,borderRadius:8,objectFit:'cover'}}/>}
                    <div><div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{fmtDate(date)}</div></div>
                  </div>
                  <div style={{fontSize:13,color:'#888'}}>{items.length} photo{items.length!==1?'s':''}</div>
                </div>
              </div>
            );
          })()}</div>}
        </div>}

        {/* HOURS */}
        {tab==='hours'&&<div>
          <div className="section-header"><div><h3 className="section-title">Employee Hours</h3><p className="section-sub">Total: <strong style={{color:'#4fc3f7'}}>{proj.hours.reduce((a,h)=>a+Number(h.hours),0).toFixed(1)} hrs</strong></p></div><Btn onClick={()=>{setForm({date:today(),startTime:'07:00',endTime:'15:30',deductLunch:true,deductBreaks:false});setModal('addHours');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> Log Hours</span></Btn></div>
          {proj.hours.length===0?<div className="empty-state empty-state--sm"><p className="empty-state__title">No hours logged</p></div>:
          openDate&&tab==='hours'?(()=>{
            const dayHours=proj.hours.filter(h=>h.date===openDate);
            const dayTotal=dayHours.reduce((a,h)=>a+Number(h.hours),0);
            return <div>
              <button className="date-folder-back" onClick={()=>setOpenDate(null)} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',color:'#f5a623',cursor:'pointer',fontFamily:'var(--font)',fontSize:14,fontWeight:600,padding:'8px 0',marginBottom:8}}><IC.Back/> Back to dates</button>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--bg2)',borderRadius:10,marginBottom:12,border:'1px solid var(--brd)'}}><div><span style={{fontWeight:700,fontSize:16,color:'#fff'}}>{fmtDate(openDate)}</span></div><span style={{color:'#4fc3f7',fontWeight:700}}>{dayTotal.toFixed(1)}h · {dayHours.length} entries</span></div>
              <div className="list">{dayHours.map(e=><div key={e.id} className="list-item"><div style={{flex:1,minWidth:170}}><div className="list-item__name">{e.employee_name}{e.classification&&<span className="list-item__cls">({e.classification})</span>}</div><div className="mono-sm">{e.start_time?`${fmtTime(e.start_time)}`:''}{e.end_time?` – ${fmtTime(e.end_time)}`:''}</div>{e.notes&&<div className="list-item__note">{e.notes}</div>}</div><div style={{display:'flex',alignItems:'center',gap:12}}><span className="big-value" style={{color:'#4fc3f7'}}>{e.hours}h</span><BtnDel onClick={()=>delItem('hours',e.id)}/></div></div>)}</div>
            </div>;
          })():
          <div className="date-folders">{(()=>{
            const byDate={};proj.hours.forEach(h=>{if(!byDate[h.date])byDate[h.date]=[];byDate[h.date].push(h);});
            return Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>{
              const total=items.reduce((a,h)=>a+Number(h.hours),0);
              const names=[...new Set(items.map(h=>h.employee_name))];
              return <div key={date} className="date-folder" onClick={()=>setOpenDate(date)} style={{padding:'14px 16px',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:12,marginBottom:8,cursor:'pointer',transition:'border-color .2s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{fmtDate(date)}</div><div style={{fontSize:12,color:'#888',marginTop:4}}>{names.length} worker{names.length!==1?'s':''}: {names.slice(0,3).join(', ')}{names.length>3?` +${names.length-3} more`:''}</div></div>
                  <div style={{textAlign:'right'}}><div className="big-value" style={{color:'#4fc3f7'}}>{total.toFixed(1)}h</div><div style={{fontSize:11,color:'#666'}}>{items.length} entries</div></div>
                </div>
              </div>;
            });
          })()}</div>}
        </div>}

        {/* EXPENSES — everyone can add, only admins see totals & amounts */}
        {tab==='expenses'&&<div>
          <div className="section-header"><div><h3 className="section-title">Expenses</h3>{isAdmin&&<p className="section-sub">Total: <strong style={{color:'#66bb6a'}}>{fmtCur(proj.expenses.reduce((a,e)=>a+Number(e.amount),0))}</strong></p>}{!isAdmin&&<p className="section-sub">{proj.expenses.length} expense{proj.expenses.length!==1?'s':''} recorded</p>}</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Btn2 onClick={()=>rcptRef.current?.click()} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 14px'}}><IC.Scan/> Scan</Btn2><input ref={rcptRef} type="file" accept="image/*" capture="environment" onChange={handleReceipt} style={{display:'none'}}/><Btn onClick={()=>{setForm({date:today(),category:'Materials'});setModal('addExpense');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> Add</span></Btn></div></div>
          {proj.expenses.length===0?<div className="empty-state empty-state--sm"><p className="empty-state__title">No expenses</p></div>:
          openDate&&tab==='expenses'?(()=>{
            const dayExp=proj.expenses.filter(e=>e.date===openDate);
            const dayTotal=dayExp.reduce((a,e)=>a+Number(e.amount),0);
            return <div>
              <button className="date-folder-back" onClick={()=>setOpenDate(null)} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',color:'#f5a623',cursor:'pointer',fontFamily:'var(--font)',fontSize:14,fontWeight:600,padding:'8px 0',marginBottom:8}}><IC.Back/> Back to dates</button>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--bg2)',borderRadius:10,marginBottom:12,border:'1px solid var(--brd)'}}><div><span style={{fontWeight:700,fontSize:16,color:'#fff'}}>{fmtDate(openDate)}</span></div>{isAdmin&&<span style={{color:'#66bb6a',fontWeight:700}}>{fmtCur(dayTotal)} · {dayExp.length} items</span>}{!isAdmin&&<span style={{color:'#888'}}>{dayExp.length} items</span>}</div>
              <div className="list">{dayExp.map(e=><div key={e.id} className="list-item" style={e.scanned?{borderLeft:'3px solid #ab47bc'}:{}}><div style={{flex:1,minWidth:170}}><div className="list-item__name">{e.description}{e.scanned&&<span className="scanned-badge">Scanned</span>}</div><div className="mono-sm"><span style={{color:'#f5a623'}}>{e.category}</span>{e.subcategory?` / ${e.subcategory}`:''}{e.vendor?` · ${e.vendor}`:''}</div></div><div style={{display:'flex',alignItems:'center',gap:8}}>{isAdmin&&<span className="big-value" style={{color:'#66bb6a'}}>{fmtCur(e.amount)}</span>}{isAdmin&&<button className="btn-edit" onClick={()=>{setEditExpId(e.id);setForm({description:e.description,amount:e.amount?.toString(),category:e.category,subcategory:e.subcategory||'',vendor:e.vendor,date:e.date});setModal('addExpense');}}><IC.Edit/></button>}{isAdmin&&<BtnDel onClick={()=>delItem('expenses',e.id)}/>}</div></div>)}</div>
            </div>;
          })():
          <div className="date-folders">{(()=>{
            const byDate={};proj.expenses.forEach(e=>{if(!byDate[e.date])byDate[e.date]=[];byDate[e.date].push(e);});
            return Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>{
              const total=items.reduce((a,e)=>a+Number(e.amount),0);
              const cats=[...new Set(items.map(e=>e.category))];
              return <div key={date} className="date-folder" onClick={()=>setOpenDate(date)} style={{padding:'14px 16px',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:12,marginBottom:8,cursor:'pointer',transition:'border-color .2s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{fmtDate(date)}</div><div style={{fontSize:12,color:'#888',marginTop:4}}>{cats.slice(0,3).join(', ')}{cats.length>3?` +${cats.length-3} more`:''}</div></div>
                  <div style={{textAlign:'right'}}>{isAdmin&&<div className="big-value" style={{color:'#66bb6a'}}>{fmtCur(total)}</div>}<div style={{fontSize:11,color:'#666'}}>{items.length} item{items.length!==1?'s':''}</div></div>
                </div>
              </div>;
            });
          })()}</div>}
        </div>}

        {/* TASKS */}
        {tab==='tasks'&&<div>
          <div className="section-header"><div><h3 className="section-title">Tasks</h3><p className="section-sub">{proj.tasks.filter(t=>t.status==='Done').length}/{proj.tasks.length} done</p></div><Btn onClick={()=>{setForm({date:today(),priority:'Medium'});setModal('addTask');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> Add Task</span></Btn></div>
          {proj.tasks.length===0?<div className="empty-state empty-state--sm"><p className="empty-state__title">No tasks yet</p></div>:
          openDate&&tab==='tasks'?(()=>{
            const dayTasks=proj.tasks.filter(t=>t.date===openDate);
            const done=dayTasks.filter(t=>t.status==='Done').length;
            return <div>
              <button onClick={()=>setOpenDate(null)} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',color:'#f5a623',cursor:'pointer',fontFamily:'var(--font)',fontSize:14,fontWeight:600,padding:'8px 0',marginBottom:8}}><IC.Back/> Back to dates</button>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--bg2)',borderRadius:10,marginBottom:12,border:'1px solid var(--brd)'}}><span style={{fontWeight:700,fontSize:16,color:'#fff'}}>{fmtDate(openDate)}</span><span style={{color:'#66bb6a',fontWeight:600}}>{done}/{dayTasks.length} done</span></div>
              <div className="list">{dayTasks.sort((a,b)=>{if(a.status==='Done'&&b.status!=='Done')return 1;if(a.status!=='Done'&&b.status==='Done')return -1;return 0;}).map(t=>{const dn=t.status==='Done';const pc={High:'#ef5350',Medium:'#f5a623',Low:'#66bb6a'}[t.priority]||'#999';return(<div key={t.id} className="list-item" style={{opacity:dn?.5:1}}><button className={`task-check ${dn?'task-check--done':''}`} style={dn?{background:proj.color}:{}} onClick={()=>toggleTask(t.id,t.status)}>{dn&&<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}</button><div style={{flex:1}}><div className="list-item__name" style={{textDecoration:dn?'line-through':'none'}}>{t.name}</div><div className="mono-sm">{t.assignee?t.assignee:''}{t.notes?` · ${t.notes}`:''}</div></div><span className="priority-badge" style={{color:pc,background:`${pc}18`}}>{t.priority}</span><BtnDel onClick={()=>delItem('tasks',t.id)}/></div>);})}</div>
            </div>;
          })():
          <div className="date-folders">{(()=>{
            const byDate={};proj.tasks.forEach(t=>{if(!byDate[t.date])byDate[t.date]=[];byDate[t.date].push(t);});
            return Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>{
              const done=items.filter(t=>t.status==='Done').length;
              return <div key={date} className="date-folder" onClick={()=>setOpenDate(date)} style={{padding:'14px 16px',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:12,marginBottom:8,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{fmtDate(date)}</div><div style={{fontSize:12,color:'#888',marginTop:4}}>{items.length} task{items.length!==1?'s':''}</div></div>
                  <div style={{textAlign:'right'}}><div style={{fontWeight:700,color:done===items.length?'#66bb6a':'#f5a623'}}>{done}/{items.length}</div><div style={{fontSize:11,color:'#666'}}>done</div></div>
                </div>
              </div>;
            });
          })()}</div>}
        </div>}

        {/* NOTES */}
        {tab==='notes'&&<div>
          <div className="section-header"><div><h3 className="section-title">Daily Notes</h3><p className="section-sub">{(proj.notes||[]).length} entries</p></div><Btn onClick={()=>{setForm({noteDate:today(),noteText:''});setModal('addNote');}}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> Add Note</span></Btn></div>
          {(!proj.notes||proj.notes.length===0)?<div className="empty-state empty-state--sm"><p className="empty-state__title">No notes yet</p><p className="empty-state__desc">Add daily observations, progress updates, or reminders</p></div>:
          openDate&&tab==='notes'?(()=>{
            const dayNotes=(proj.notes||[]).filter(n=>n.date===openDate);
            return <div>
              <button onClick={()=>setOpenDate(null)} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',color:'#f5a623',cursor:'pointer',fontFamily:'var(--font)',fontSize:14,fontWeight:600,padding:'8px 0',marginBottom:8}}><IC.Back/> Back to dates</button>
              <div style={{padding:'10px 14px',background:'var(--bg2)',borderRadius:10,marginBottom:12,border:'1px solid var(--brd)',fontWeight:700,fontSize:16,color:'#fff'}}>{fmtDate(openDate)} · {dayNotes.length} note{dayNotes.length!==1?'s':''}</div>
              <div className="list">{dayNotes.map(n=><div key={n.id} className="list-item" style={{flexDirection:'column',alignItems:'stretch',gap:6}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div className="mono-sm" style={{color:'#f5a623',fontWeight:600}}>{n.author||''}</div><div style={{display:'flex',gap:6}}><button className="btn-edit" onClick={()=>{setForm({noteDate:n.date,noteText:n.note,noteId:n.id});setModal('addNote');}}><IC.Edit/></button><BtnDel onClick={()=>delItem('daily_notes',n.id)}/></div></div><div style={{fontSize:14,color:'#ddd',lineHeight:1.5,whiteSpace:'pre-wrap'}}>{n.note}</div></div>)}</div>
            </div>;
          })():
          <div className="date-folders">{(()=>{
            const byDate={};(proj.notes||[]).forEach(n=>{if(!byDate[n.date])byDate[n.date]=[];byDate[n.date].push(n);});
            return Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>
              <div key={date} className="date-folder" onClick={()=>setOpenDate(date)} style={{padding:'14px 16px',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:12,marginBottom:8,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{fmtDate(date)}</div><div style={{fontSize:12,color:'#888',marginTop:4,maxWidth:280,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{items[0]?.note?.slice(0,60)}{items[0]?.note?.length>60?'...':''}</div></div>
                  <div style={{fontSize:13,color:'#888'}}>{items.length} note{items.length!==1?'s':''}</div>
                </div>
              </div>
            );
          })()}</div>}
        </div>}

        {/* FILES */}
        {tab==='files'&&<div>
          <div className="section-header"><div><h3 className="section-title">Files</h3><p className="section-sub">{(proj.files||[]).length} files</p></div><Btn onClick={()=>docRef.current?.click()}><span style={{display:'flex',alignItems:'center',gap:6}}><IC.Plus/> Upload File</span></Btn><input ref={docRef} type="file" multiple onChange={async(e)=>{const fileList=Array.from(e.target.files);e.target.value='';for(const f of fileList){const r=new FileReader();r.onload=async(ev)=>{setSaving(true);try{const user=db.getUser();await db.insert('files',{project_id:active,name:f.name,file_data:ev.target.result,file_type:f.type,file_size:f.size,uploaded_by:user?.user_metadata?.full_name||user?.email||'',date:today()});await refreshProject(active);}catch(err){alert('Error: '+err.message);}setSaving(false);};r.readAsDataURL(f);}}} style={{display:'none'}}/></div>
          {(!proj.files||proj.files.length===0)?<div className="empty-state empty-state--sm"><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg><p className="empty-state__title">No files yet</p><p className="empty-state__desc">Upload PDFs, documents, plans, or any files</p></div>:
          <div className="list">{(proj.files||[]).map(f=>{
            const ext=f.name?.split('.').pop()?.toLowerCase()||'';
            const icon=(['pdf'].includes(ext))?'📄':(['doc','docx'].includes(ext))?'📝':(['xls','xlsx','csv'].includes(ext))?'📊':(['jpg','jpeg','png','gif','webp'].includes(ext))?'🖼️':(['dwg','dxf'].includes(ext))?'📐':'📎';
            const size=f.file_size>1048576?`${(f.file_size/1048576).toFixed(1)} MB`:f.file_size>1024?`${(f.file_size/1024).toFixed(0)} KB`:`${f.file_size||0} B`;
            return <div key={f.id} className="list-item">
              <div style={{fontSize:28,marginRight:4}}>{icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="list-item__name" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div>
                <div className="mono-sm">{fmtDate(f.date)} · {size}{f.uploaded_by?` · ${f.uploaded_by}`:''}</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn-secondary" style={{padding:'6px 10px',fontSize:11}} onClick={()=>{const a=document.createElement('a');a.href=f.file_data;a.download=f.name;a.click();}}>Download</button>
                <BtnDel onClick={()=>delItem('files',f.id)}/>
              </div>
            </div>;
          })}</div>}
        </div>}
      </div>

      <Modal open={modal==='addHours'} onClose={()=>{setModal(null);setForm({});}} title="Log Hours">
        {employees.length>0?<EmpSelect employees={employees} value={form.selEmpId||''} onChange={id=>{const emp=employees.find(e=>e.id===id);setForm(f=>({...f,selEmpId:id,empName:emp?.name||'',empCls:emp?.classification||''}));}}/>:<Inp label="Employee" placeholder="John Smith" value={form.empName||''} onChange={e=>setForm(f=>({...f,empName:e.target.value}))}/>}
        {employees.length>0&&!form.selEmpId&&<Inp label="Or type name" placeholder="John Smith" value={form.empName||''} onChange={e=>setForm(f=>({...f,empName:e.target.value}))}/>}
        <div className="field-row"><Inp label="Start" type="time" value={form.startTime||''} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))}/><Inp label="End" type="time" value={form.endTime||''} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))}/></div>
        {form.startTime&&form.endTime&&(()=>{
          const raw=calcH(form.startTime,form.endTime);
          const lunchDed=form.deductLunch?0.5:0;
          const breakDed=form.deductBreaks?0.5:0;
          const net=Math.max(0,raw-lunchDed-breakDed);
          return <div className="calc-box" style={{flexDirection:'column',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',width:'100%'}}><span style={{fontSize:12,color:'#999'}}>Gross hours</span><span style={{fontSize:16,fontWeight:700,color:'#4fc3f7',fontFamily:'var(--mono)'}}>{raw}h</span></div>
            <div style={{display:'flex',gap:16,width:'100%',flexWrap:'wrap'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'#ccc'}}>
                <input type="checkbox" checked={!!form.deductLunch} onChange={e=>setForm(f=>({...f,deductLunch:e.target.checked}))} style={{accentColor:'#f5a623',width:18,height:18}} />
                Lunch (30 min)
              </label>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'#ccc'}}>
                <input type="checkbox" checked={!!form.deductBreaks} onChange={e=>setForm(f=>({...f,deductBreaks:e.target.checked}))} style={{accentColor:'#f5a623',width:18,height:18}} />
                Two 15-min breaks
              </label>
            </div>
            {(form.deductLunch||form.deductBreaks)&&<div style={{display:'flex',justifyContent:'space-between',width:'100%',paddingTop:6,borderTop:'1px solid #333'}}>
              <span style={{fontSize:12,color:'#999'}}>Deductions: {[form.deductLunch&&'30min lunch',form.deductBreaks&&'30min breaks'].filter(Boolean).join(' + ')}</span>
              <span style={{fontSize:10,color:'#ef5350',fontFamily:'var(--mono)'}}>-{(lunchDed+breakDed).toFixed(1)}h</span>
            </div>}
            <div style={{display:'flex',justifyContent:'space-between',width:'100%',paddingTop:4,borderTop:'1px solid #555'}}>
              <span style={{fontSize:13,color:'#eee',fontWeight:700}}>Net hours</span>
              <span className="big-value" style={{color:'#4fc3f7'}}>{net}h</span>
            </div>
          </div>;
        })()}
        <Inp label="Manual Hours (optional)" type="number" step="0.25" min="0" value={form.manHrs||''} onChange={e=>setForm(f=>({...f,manHrs:e.target.value}))}/>
        <Inp label="Date" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        <div style={{marginTop:-8,marginBottom:8}}>
          {(form.extraDates||[]).map((d,i)=><div key={i} style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}><input className="field__input" type="date" value={d} onChange={e=>{const ed=[...(form.extraDates||[])];ed[i]=e.target.value;setForm(f=>({...f,extraDates:ed}));}}/><button className="btn-delete" onClick={()=>{const ed=[...(form.extraDates||[])];ed.splice(i,1);setForm(f=>({...f,extraDates:ed}));}} style={{padding:6}}><IC.Del/></button></div>)}
          <button className="text-btn" style={{marginTop:6,fontSize:12}} onClick={()=>setForm(f=>({...f,extraDates:[...(f.extraDates||[]),today()]}))}>+ Add another day (same hours)</button>
        </div>
        <Inp label="Notes" placeholder="Work performed" value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});}}>Cancel</Btn2><Btn onClick={addHoursEntry} disabled={(!form.empName?.trim()&&!form.selEmpId)||saving}>Save</Btn></div>
      </Modal>

      <Modal open={modal==='addExpense'} onClose={()=>{setModal(null);setForm({});setEditExpId(null);}} title={editExpId?'Edit Expense':'Add Expense'}>
        <Inp label="Description" placeholder="Lumber, concrete..." value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
        <Inp label="Amount ($)" type="number" step="0.01" value={form.amount||''} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
        <Sel label="Category" value={form.category||'Materials'} onChange={e=>setForm(f=>({...f,category:e.target.value,subcategory:''}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{c}</option>)}</Sel>
        {(()=>{const subs=expSubcats.filter(s=>s.category===(form.category||'Materials'));return subs.length>0?<Sel label="Subcategory" value={form.subcategory||''} onChange={e=>setForm(f=>({...f,subcategory:e.target.value}))}><option value="">None</option>{subs.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</Sel>:<AutoInput label="Subcategory (optional)" placeholder="e.g. Framing lumber" value={form.subcategory||''} onChange={v=>setForm(f=>({...f,subcategory:v}))} suggestions={expSubcats.filter(s=>s.category===(form.category||'Materials')).map(s=>s.name)}/>;})()}
        <Inp label="Vendor" placeholder="Vendor" value={form.vendor||''} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))}/>
        <Inp label="Date" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        {form.subcategory?.trim()&&!expSubcats.some(s=>s.category===(form.category||'Materials')&&s.name===form.subcategory?.trim())&&<label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#999',marginTop:-4}}><input type="checkbox" checked={!!form.saveSubcat} onChange={e=>setForm(f=>({...f,saveSubcat:e.target.checked}))} style={{accentColor:'#f5a623'}} /> Save "{form.subcategory}" as subcategory for {form.category||'Materials'}</label>}
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});setEditExpId(null);}}>Cancel</Btn2><Btn onClick={async()=>{if(form.saveSubcat&&form.subcategory?.trim()){try{const[sc]=await db.insert('expense_subcategories',{category:form.category||'Materials',name:form.subcategory.trim()});setExpSubcats(prev=>[...prev,sc]);}catch(e){}}await addExpense(false);}} disabled={!form.description?.trim()||!form.amount||saving}>{editExpId?'Update':'Save'}</Btn></div>
      </Modal>

      <Modal open={modal==='scan'} onClose={()=>{setModal(null);setForm({});setScanPrev(null);setScanErr(null);setScanning(false);}} title="Scan Receipt" wide>
        <div style={{display:'grid',gridTemplateColumns:scanPrev?'150px 1fr':'1fr',gap:20,alignItems:'start'}}>
          {scanPrev&&<div style={{borderRadius:10,overflow:'hidden',border:'1px solid #333'}}><img src={scanPrev} alt="" style={{width:'100%',display:'block'}}/></div>}
          <div>{scanning?<div style={{textAlign:'center',padding:'40px 0'}}><IC.Spin/><p style={{color:'#f5a623',fontWeight:600,marginTop:12}}>Scanning...</p></div>:<>
            {scanErr&&<div className="scan-error">{scanErr}</div>}
            <Inp label="Description" value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
            <Inp label="Amount ($)" type="number" step="0.01" value={form.amount||''} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
            <Sel label="Category" value={form.category||'Materials'} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{c}</option>)}</Sel>
            <Inp label="Vendor" value={form.vendor||''} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))}/>
            <Inp label="Date" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
            <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});setScanPrev(null);}}>Cancel</Btn2><Btn onClick={()=>addExpense(true)} disabled={!form.description?.trim()||!form.amount||saving}>Add</Btn></div>
          </>}</div>
        </div>
      </Modal>

      <Modal open={modal==='addTask'} onClose={()=>{setModal(null);setForm({});}} title="Add Task">
        <Inp label="Task Name" placeholder="Install drywall" value={form.taskName||''} onChange={e=>setForm(f=>({...f,taskName:e.target.value}))}/>
        {employees.length>0?<EmpSelect employees={employees} value={form.assigneeId||''} onChange={id=>setForm(f=>({...f,assigneeId:id}))} label="Assign To"/>:<Inp label="Assigned To" value={form.assignee||''} onChange={e=>setForm(f=>({...f,assignee:e.target.value}))}/>}
        <Sel label="Priority" value={form.priority||'Medium'} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{['High','Medium','Low'].map(p=><option key={p} value={p}>{p}</option>)}</Sel>
        <Inp label="Date" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        <Inp label="Notes" placeholder="Details" value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});}}>Cancel</Btn2><Btn onClick={addTask} disabled={!form.taskName?.trim()||saving}>Save</Btn></div>
      </Modal>

      {/* NOTES */}
      <Modal open={modal==='addNote'} onClose={()=>{setModal(null);setForm({});}} title={form.noteId?'Edit Note':'Add Daily Note'}>
        <Inp label="Date" type="date" value={form.noteDate||today()} onChange={e=>setForm(f=>({...f,noteDate:e.target.value}))}/>
        <div className="field"><label className="field__label">Note</label><textarea className="field__input" rows={5} placeholder="Weather conditions, progress updates, issues, visitors on site..." value={form.noteText||''} onChange={e=>setForm(f=>({...f,noteText:e.target.value}))} style={{resize:'vertical',minHeight:100}}/></div>
        <div className="modal__actions"><Btn2 onClick={()=>{setModal(null);setForm({});}}>Cancel</Btn2><Btn onClick={async()=>{if(!form.noteText?.trim())return;setSaving(true);try{if(form.noteId){await db.update('daily_notes',form.noteId,{note:form.noteText.trim(),date:form.noteDate||today()});}else{const user=db.getUser();await db.insert('daily_notes',{project_id:active,note:form.noteText.trim(),date:form.noteDate||today(),author:user?.user_metadata?.full_name||user?.email||''});}await refreshProject(active);}catch(e){alert('Error: '+e.message);}setSaving(false);setModal(null);setForm({});}} disabled={!form.noteText?.trim()||saving}>{form.noteId?'Update':'Save'}</Btn></div>
      </Modal>

      {/* EMPLOYEES (shared modal) */}
      {renderEmployeeModal()}

      {/* REPORTS */}
      <Modal open={modal==='reports'} onClose={()=>setModal(null)} title="Reports" wide>
        <div className="form-section"><div className="form-section__title" style={{color:'#4fc3f7',display:'flex',alignItems:'center',gap:6}}><IC.Sun/> Weather</div><div style={{display:'flex',gap:10}}><div style={{flex:1}}><Inp label="Location" placeholder="Dallas, TX" value={wLoc} onChange={e=>setWLoc(e.target.value)}/></div><Btn onClick={()=>loadW(wLoc)} disabled={!wLoc.trim()||wLoading} style={{alignSelf:'flex-end',marginBottom:14}}>{wLoading?'Loading...':'Get Weather'}</Btn></div>{weather&&<div className="weather-card"><span style={{fontSize:26}}>☀️</span><div><div style={{fontWeight:700,fontSize:16,color:'#4fc3f7'}}>{weather.temp_f}°F · {weather.condition}</div><div style={{fontSize:12,color:'#8bb8db'}}>Humidity {weather.humidity}% · Wind {weather.wind_mph} mph</div></div></div>}</div>
        <div className="form-section"><div className="form-section__title">Date Range</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
          {[{l:'Today',fn:()=>{const t=today();setRptDate(t);setForm(f=>({...f,rptEnd:t}))}},
            {l:'This Week',fn:()=>{const wr=weekRange(today());setRptDate(wr.start);setForm(f=>({...f,rptEnd:wr.end}))}},
            {l:'Last 2 Weeks',fn:()=>{const e=today();const s=new Date();s.setDate(s.getDate()-13);setRptDate(s.toISOString().split('T')[0]);setForm(f=>({...f,rptEnd:e}))}},
            {l:'This Month',fn:()=>{const d=new Date();const s=new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0];setRptDate(s);setForm(f=>({...f,rptEnd:today()}))}},
            {l:'Last Month',fn:()=>{const d=new Date();const s=new Date(d.getFullYear(),d.getMonth()-1,1);const e=new Date(d.getFullYear(),d.getMonth(),0);setRptDate(s.toISOString().split('T')[0]);setForm(f=>({...f,rptEnd:e.toISOString().split('T')[0]}))}},
            {l:'All Time',fn:()=>{setRptDate('');setForm(f=>({...f,rptEnd:''}))}}
          ].map((p,i)=><button key={i} className="btn-secondary" style={{padding:'6px 12px',fontSize:11}} onClick={p.fn}>{p.l}</button>)}
        </div>
        <div className="field-row">
          <Inp label="From" type="date" value={rptDate} onChange={e=>setRptDate(e.target.value)}/>
          <Inp label="To" type="date" value={form.rptEnd||''} onChange={e=>setForm(f=>({...f,rptEnd:e.target.value}))}/>
        </div>
        {rptDate&&form.rptEnd&&<p style={{fontSize:12,color:'#f5a623',marginTop:-4}}>{fmtDate(rptDate)} – {fmtDate(form.rptEnd)}</p>}
        </div>
        <div className="report-list">
          <button className="report-btn" onClick={()=>{const ds=rptDate,de=form.rptEnd||rptDate;printFull(proj,ds,de,weather);setModal(null);}}><div className="report-btn__icon" style={{background:'linear-gradient(135deg,#f5a623,#f5a623aa)'}}><IC.Print/></div><div><div className="report-btn__label">Full Daily Report</div><div className="report-btn__desc">Hours, expenses, tasks, notes</div></div></button>
          <button className="report-btn" onClick={()=>{
            const ds=rptDate,de=form.rptEnd||rptDate;
            const inRange=(d)=>!ds?true:(de?(d>=ds&&d<=de):d===ds);
            const dl=ds?(de&&de!==ds?`${fmtDate(ds)} – ${fmtDate(de)}`:fmtDate(ds)):'All Dates';
            const fN=(proj.notes||[]).filter(n=>inRange(n.date));
            const fH=proj.hours.filter(h=>inRange(h.date));
            const fE=proj.expenses.filter(e=>inRange(e.date));
            const fT=proj.tasks.filter(t=>inRange(t.date));
            const tH=fH.reduce((a,h)=>a+Number(h.hours),0);
            const tE=fE.reduce((a,e)=>a+Number(e.amount),0);
            openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Daily Report - ${proj.name}</title><style>${PS}</style></head><body><h1>${proj.name} — General Daily Report</h1><p class="meta">${proj.client?proj.client+' · ':''}${dl} · ${new Date().toLocaleString()}</p>${wB(weather)}<div class="stats"><div><div class="stat-label">Hours</div><div class="stat-value">${tH.toFixed(1)}h</div></div><div><div class="stat-label">Workers</div><div class="stat-value">${new Set(fH.map(h=>h.employee_name)).size}</div></div>${isAdmin?`<div><div class="stat-label">Expenses</div><div class="stat-value">${fmtCur(tE)}</div></div>`:''}<div><div class="stat-label">Tasks Done</div><div class="stat-value">${fT.filter(t=>t.status==='Done').length}/${fT.length}</div></div></div>${fN.length>0?`<h2>Daily Notes</h2>${fN.map(n=>`<div style="margin:10px 0;padding:12px 16px;background:#f8f8f8;border-left:3px solid #e8891c;border-radius:4px"><div style="font-size:11px;color:#888;margin-bottom:4px">${fmtDate(n.date)}${n.author?' · '+n.author:''}</div><div style="font-size:13px;white-space:pre-wrap">${n.note}</div></div>`).join('')}`:''}<h2>Workforce</h2>${fH.length===0?'<p style="color:#999">No hours logged</p>':`<table><thead><tr><th>Employee</th><th>Class</th><th>Hours</th><th>Time</th></tr></thead><tbody>${fH.map(h=>`<tr><td><b>${h.employee_name}</b></td><td>${h.classification||'—'}</td><td><b>${h.hours}h</b></td><td>${h.start_time?fmtTime(h.start_time)+' – '+fmtTime(h.end_time):'—'}</td></tr>`).join('')}<tr class="total-row"><td colspan="2">Total</td><td>${tH.toFixed(1)}h</td><td></td></tr></tbody></table>`}<h2>Tasks</h2>${fT.length===0?'<p style="color:#999">None</p>':`<table><thead><tr><th>Task</th><th>Status</th><th>Assigned</th></tr></thead><tbody>${fT.map(t=>`<tr><td>${t.name}</td><td><span class="badge ${t.status==='Done'?'done':'pending'}">${t.status}</span></td><td>${t.assignee||'—'}</td></tr>`).join('')}</tbody></table>`}<div class="footer">SitePro · ${proj.name} · General Daily Report · ${dl}</div></body></html>`);
            setModal(null);
          }}><div className="report-btn__icon" style={{background:'linear-gradient(135deg,#66bb6a,#66bb6aaa)'}}><IC.Print/></div><div><div className="report-btn__label">General Daily Report</div><div className="report-btn__desc">Notes, workforce, tasks (no per-employee detail)</div></div></button>
          <button className="report-btn" onClick={()=>{const ds=rptDate,de=form.rptEnd||rptDate;printHours(proj,ds,de,weather);setModal(null);}}><div className="report-btn__icon" style={{background:'linear-gradient(135deg,#4fc3f7,#4fc3f7aa)'}}><IC.Clk/></div><div><div className="report-btn__label">Employee Hours</div><div className="report-btn__desc">By employee with notes</div></div></button>
          {isAdmin&&<button className="report-btn" onClick={()=>{
            const ds=rptDate,de=form.rptEnd||rptDate;
            const inRange=(d)=>!ds?true:(de?(d>=ds&&d<=de):d===ds);
            const dl=ds?(de&&de!==ds?`${fmtDate(ds)} – ${fmtDate(de)}`:fmtDate(ds)):'All Dates';
            const fE=proj.expenses.filter(e=>inRange(e.date));
            const tE=fE.reduce((a,e)=>a+Number(e.amount),0);
            const byCat={};fE.forEach(e=>{const k=e.category||'Other';if(!byCat[k])byCat[k]={items:[],total:0};byCat[k].items.push(e);byCat[k].total+=Number(e.amount);});
            openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Expenses - ${proj.name}</title><style>${PS}</style></head><body><h1>${proj.name} — Expense Report</h1><p class="meta">${proj.client?proj.client+' · ':''}${dl} · ${new Date().toLocaleString()}</p><div class="stats"><div><div class="stat-label">Total Expenses</div><div class="stat-value">${fmtCur(tE)}</div></div><div><div class="stat-label">Categories</div><div class="stat-value">${Object.keys(byCat).length}</div></div><div><div class="stat-label">Items</div><div class="stat-value">${fE.length}</div></div></div>${Object.entries(byCat).sort((a,b)=>b[1].total-a[1].total).map(([cat,d])=>`<h2>${cat} — ${fmtCur(d.total)}</h2><table><thead><tr><th>Description</th><th>Subcategory</th><th>Vendor</th><th>Date</th><th>Amount</th></tr></thead><tbody>${d.items.map(e=>`<tr><td><b>${e.description}</b></td><td>${e.subcategory||'—'}</td><td>${e.vendor||'—'}</td><td>${fmtDate(e.date)}</td><td><b>${fmtCur(e.amount)}</b></td></tr>`).join('')}<tr class="total-row"><td colspan="4">Subtotal</td><td>${fmtCur(d.total)}</td></tr></tbody></table>`).join('')}<div style="margin-top:24px;padding:12px 18px;background:#f0f0f0;border-radius:8px;display:flex;justify-content:space-between;font-weight:700;font-size:15px"><span>Grand Total</span><span>${fmtCur(tE)}</span></div><div class="footer">SitePro · ${proj.name} · Expenses · ${dl}</div></body></html>`);
            setModal(null);
          }}><div className="report-btn__icon" style={{background:'linear-gradient(135deg,#66bb6a,#66bb6aaa)'}}><IC.Dol/></div><div><div className="report-btn__label">Expense Report</div><div className="report-btn__desc">By category with subtotals</div></div></button>}
          <div className="report-btn report-btn--inline"><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}><div className="report-btn__icon" style={{background:'linear-gradient(135deg,#ab47bc,#ab47bcaa)'}}><IC.Cal/></div><div><div className="report-btn__label">Weekly Report</div><div className="report-btn__desc">Hours across all projects</div></div></div><div style={{display:'flex',gap:10,alignItems:'flex-end'}}><div style={{flex:1}}><Inp label="Any date in the week" type="date" value={weekDt} onChange={e=>setWeekDt(e.target.value)}/></div><Btn onClick={()=>{const wr=weekRange(weekDt);printWeekly(projects,employees,wr.start,wr.end,weather);setModal(null);}} style={{marginBottom:14}}>Print</Btn></div>{weekDt&&<p style={{fontSize:12,color:'#ab47bc',marginTop:-6}}>{weekRange(weekDt).label}</p>}</div>
        </div>
        <div style={{marginTop:18,textAlign:'right'}}><Btn2 onClick={()=>setModal(null)}>Close</Btn2></div>
      </Modal>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
