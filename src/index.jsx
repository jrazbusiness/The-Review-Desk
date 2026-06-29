import React from 'react';
import ReactDOM from 'react-dom/client';
import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ════════════════════════════════════════════════════════════════════════════
//  ⚙️  SETUP — paste your two Supabase keys here (see setup guide)
// ════════════════════════════════════════════════════════════════════════════
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
const ADMIN_PIN = "1234"; // ← change this to your own PIN
// ════════════════════════════════════════════════════════════════════════════

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Config ───────────────────────────────────────────────────────────────────
const PLATFORMS = ["Google","Yelp","Facebook","Trustpilot","TripAdvisor","BBB","Other"];
const PALETTE   = ["#00E5A0","#FF6B6B","#4CC9F0","#F7B731","#A55EEA","#FF9F43","#26de81","#FC5C65","#FD79A8","#74B9FF"];
const EMOJIS    = ["🏢","🍕","🏥","🦷","🚗","💇","🐾","💆","🍔","🏋️","📸","🛒","🏨","☕","🍜","💅","🧹","🔧","🎓","👗"];

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:"#0F0F13", surface:"#1A1A22", card:"#22222D", border:"#2E2E3D",
  accent:"#00E5A0", text:"#FFFFFF", muted:"#8888A0",
  danger:"#FF5E5E", warn:"#FFB347", info:"#4CC9F0", purple:"#A55EEA",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genId    = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmt      = n  => n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${Number(n).toFixed(2)}`;
const initials = n  => n.trim().split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,2);
const today    = () => new Date().toISOString().slice(0,10);
const STATUS_LABEL = { live:"Live", taken_down:"Taken Down", replenished:"Replenished" };

// ─── Supabase data layer ──────────────────────────────────────────────────────
// Row shapes in the DB use snake_case; we map to/from the app's camelCase here.
const fromReviewRow = r => ({
  id:r.id, reviewerId:r.reviewer_id, businessId:r.business_id,
  clientName:r.client_name, platform:r.platform, status:r.status,
  notes:r.notes||"", date:r.date,
  paidOut:r.paid_out==null?"":String(r.paid_out),
  receivedIn:r.received_in==null?"":String(r.received_in),
});
const toReviewRow = r => ({
  id:r.id, reviewer_id:r.reviewerId, business_id:r.businessId,
  client_name:r.clientName, platform:r.platform, status:r.status,
  notes:r.notes||"", date:r.date,
  paid_out:r.paidOut===""||r.paidOut==null?null:Number(r.paidOut),
  received_in:r.receivedIn===""||r.receivedIn==null?null:Number(r.receivedIn),
});
const fromBizRow = b => ({ id:b.id, name:b.name, platform:b.platform, url:b.url||"", emoji:b.emoji||"🏢", defaultPay:b.default_pay==null?"":String(b.default_pay) });
const toBizRow   = b => ({ id:b.id, name:b.name, platform:b.platform, url:b.url||"", emoji:b.emoji||"🏢", default_pay:b.defaultPay===""||b.defaultPay==null?null:Number(b.defaultPay) });


// ─── Shared UI ────────────────────────────────────────────────────────────────
function Toast({ msg, color = T.accent }) {
  return (
    <div style={{ position:"fixed", bottom:96, left:"50%", transform:"translateX(-50%)",
      background:color, color:color===T.danger?"#fff":"#000",
      fontWeight:700, fontSize:14, padding:"12px 24px", borderRadius:40,
      boxShadow:"0 4px 24px rgba(0,0,0,0.5)", zIndex:9999, whiteSpace:"nowrap",
      animation:"fadeup 0.2s ease" }}>
      {msg}
    </div>
  );
}

function Sheet({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:500, display:"flex", alignItems:"flex-end" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:600, margin:"0 auto",
        background:T.surface, borderRadius:"22px 22px 0 0", paddingBottom:36,
        boxShadow:"0 -8px 40px rgba(0,0,0,0.6)", maxHeight:"94vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:T.border }} />
        </div>
        {title && <div style={{ fontSize:18, fontWeight:800, color:T.text, padding:"6px 20px 16px" }}>{title}</div>}
        <div style={{ padding:"0 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function Chips({ options, value, onChange, color = T.accent }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
      {options.map(o => {
        const v = typeof o==="string"?o:o.value;
        const l = typeof o==="string"?o:o.label;
        const on = value===v;
        return (
          <button key={v} onClick={()=>onChange(v)}
            style={{ padding:"9px 16px", borderRadius:40, border:`1.5px solid ${on?color:T.border}`,
              background:on?color:"transparent", color:on?"#000":T.muted,
              fontWeight:on?700:500, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s" }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

const inp = {
  width:"100%", padding:"14px 15px", border:`1.5px solid ${T.border}`,
  borderRadius:12, fontSize:15, color:T.text, background:T.card,
  outline:"none", fontFamily:"inherit", boxSizing:"border-box",
};

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:T.muted, marginBottom:8 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize:11, color:T.muted, marginTop:5 }}>{hint}</div>}
    </div>
  );
}

function BigBtn({ children, onClick, color=T.accent, disabled, textColor }) {
  const dark = !textColor && (color===T.accent||color==="#F7B731"||color==="#FF9F43"||color==="#26de81");
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width:"100%", padding:"16px", borderRadius:14, border:"none",
        background:disabled?T.border:color, color:disabled?T.muted:(textColor||(dark?"#000":"#fff")),
        fontSize:16, fontWeight:800, cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit" }}>
      {children}
    </button>
  );
}

function Avatar({ name, color, size=44 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:900, fontSize:size*0.36, color:"#000", letterSpacing:"-0.02em" }}>
      {initials(name)}
    </div>
  );
}

function Badge({ status }) {
  const cfg = {
    live:        { bg:"#00E5A015", color:T.accent, label:"Live" },
    taken_down:  { bg:"#FF5E5E15", color:T.danger, label:"Taken Down" },
    replenished: { bg:"#4CC9F015", color:T.info,   label:"Replenished" },
  }[status]||{ bg:T.border, color:T.muted, label:status };
  return <span style={{ padding:"3px 10px", borderRadius:40, background:cfg.bg, color:cfg.color, fontSize:11, fontWeight:700 }}>{cfg.label}</span>;
}

function TabBar({ tab, onChange }) {
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.surface,
      borderTop:`1px solid ${T.border}`, display:"flex", zIndex:200,
      paddingBottom:"env(safe-area-inset-bottom,10px)" }}>
      {[{id:"home",icon:"📊",label:"Overview"},{id:"reviews",icon:"⭐",label:"Reviews"},{id:"team",icon:"👥",label:"Team"}].map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)}
          style={{ flex:1, padding:"10px 0 6px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
            display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <span style={{ fontSize:22 }}>{t.icon}</span>
          <span style={{ fontSize:10, fontWeight:700, color:tab===t.id?T.accent:T.muted, letterSpacing:"0.04em" }}>{t.label.toUpperCase()}</span>
          {tab===t.id&&<div style={{ width:18, height:2, borderRadius:1, background:T.accent }} />}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DATE DRUM PICKER — thumb-friendly scrollable month/day/year
// ══════════════════════════════════════════════════════════════════════════════
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function DrumColumn({ items, selected, onSelect, width=72 }) {
  const ref = useRef(null);
  const ITEM_H = 44;
  const PAD = 2;

  useEffect(()=>{
    const idx = items.indexOf(selected);
    if (ref.current && idx >= 0) {
      ref.current.scrollTop = idx * ITEM_H;
    }
  }, [selected, items]);

  function onScroll(e) {
    const idx = Math.round(e.target.scrollTop / ITEM_H);
    if (items[idx] !== undefined) onSelect(items[idx]);
  }

  return (
    <div style={{ position:"relative", width, flexShrink:0 }}>
      {/* fade top */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:ITEM_H*PAD,
        background:`linear-gradient(${T.card}, transparent)`, zIndex:2, pointerEvents:"none" }} />
      {/* selection highlight */}
      <div style={{ position:"absolute", top:"50%", left:4, right:4, height:ITEM_H,
        transform:"translateY(-50%)", background:`${T.accent}18`, borderRadius:10,
        border:`1.5px solid ${T.accent}40`, zIndex:1, pointerEvents:"none" }} />
      {/* fade bottom */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:ITEM_H*PAD,
        background:`linear-gradient(transparent, ${T.card})`, zIndex:2, pointerEvents:"none" }} />
      <div ref={ref} onScroll={onScroll}
        style={{ height:ITEM_H*(PAD*2+1), overflowY:"scroll", scrollSnapType:"y mandatory",
          scrollbarWidth:"none", msOverflowStyle:"none" }}>
        <style>{`.drum-col::-webkit-scrollbar{display:none}`}</style>
        {/* padding items */}
        {Array(PAD).fill(null).map((_,i)=><div key={"t"+i} style={{ height:ITEM_H }} />)}
        {items.map(item=>(
          <div key={item} onClick={()=>onSelect(item)}
            style={{ height:ITEM_H, display:"flex", alignItems:"center", justifyContent:"center",
              scrollSnapAlign:"center", cursor:"pointer",
              fontSize:item===selected?17:14, fontWeight:item===selected?800:400,
              color:item===selected?T.accent:T.muted, transition:"all 0.1s", userSelect:"none" }}>
            {item}
          </div>
        ))}
        {Array(PAD).fill(null).map((_,i)=><div key={"b"+i} style={{ height:ITEM_H }} />)}
      </div>
    </div>
  );
}

function DateDrum({ value, onChange }) {
  // value: "YYYY-MM-DD"
  const parts  = value ? value.split("-") : today().split("-");
  const selYear  = parseInt(parts[0]);
  const selMonth = parseInt(parts[1]); // 1-based
  const selDay   = parseInt(parts[2]);

  const now      = new Date();
  const years    = Array.from({length:5}, (_,i) => now.getFullYear()-4+i);
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const days     = Array.from({length:daysInMonth}, (_,i)=>i+1);

  function update(y,m,d) {
    const safeD = Math.min(d, new Date(y,m,0).getDate());
    onChange(`${y}-${String(m).padStart(2,"0")}-${String(safeD).padStart(2,"0")}`);
  }

  return (
    <div style={{ background:T.card, borderRadius:14, border:`1.5px solid ${T.border}`, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"center", gap:0, padding:"0 12px" }}>
        <DrumColumn items={MONTHS} selected={MONTHS[selMonth-1]} width={80}
          onSelect={m=>update(selYear, MONTHS.indexOf(m)+1, selDay)} />
        <DrumColumn items={days} selected={selDay} width={64}
          onSelect={d=>update(selYear, selMonth, d)} />
        <DrumColumn items={years} selected={selYear} width={80}
          onSelect={y=>update(y, selMonth, selDay)} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SELF-REGISTRATION — new reviewer creates their own profile
// ══════════════════════════════════════════════════════════════════════════════
function SelfRegister({ onDone }) {
  const [step, setStep]   = useState(0); // 0=name, 1=color
  const [name, setName]   = useState("");
  const [color, setColor] = useState(PALETTE[Math.floor(Math.random()*PALETTE.length)]);
  const inputRef = useRef(null);
  useEffect(()=>{ if(step===0) inputRef.current?.focus(); },[step]);

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"28px 24px" }}>

      {step===0 && <>
        <div style={{ fontSize:48, marginBottom:16 }}>👋</div>
        <div style={{ fontSize:26, fontWeight:900, color:T.text, marginBottom:6, textAlign:"center" }}>First time here?</div>
        <div style={{ fontSize:15, color:T.muted, marginBottom:36, textAlign:"center" }}>Enter your name to create your profile.</div>
        <div style={{ width:"100%", maxWidth:340 }}>
          <input ref={inputRef} style={{ ...inp, fontSize:18, textAlign:"center", marginBottom:20 }}
            placeholder="Your name" value={name}
            onChange={e=>setName(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&name.trim()) setStep(1); }} />
          <BigBtn onClick={()=>setStep(1)} disabled={!name.trim()}>Continue →</BigBtn>
        </div>
      </>}

      {step===1 && <>
        <div style={{ marginBottom:20 }}>
          <Avatar name={name} color={color} size={80} />
        </div>
        <div style={{ fontSize:22, fontWeight:900, color:T.text, marginBottom:4 }}>Pick your color</div>
        <div style={{ fontSize:14, color:T.muted, marginBottom:28 }}>This is how you'll appear on the app.</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:14, justifyContent:"center", marginBottom:36, maxWidth:280 }}>
          {PALETTE.map(c=>(
            <button key={c} onClick={()=>setColor(c)}
              style={{ width:48, height:48, borderRadius:"50%", background:c, border:`4px solid ${color===c?"#fff":"transparent"}`,
                cursor:"pointer", outline:"none", transition:"border 0.12s", boxShadow:color===c?"0 0 0 3px rgba(255,255,255,0.15)":"none" }} />
          ))}
        </div>
        <div style={{ width:"100%", maxWidth:340, display:"flex", flexDirection:"column", gap:12 }}>
          <BigBtn onClick={()=>onDone({ id:genId(), name:name.trim(), color })} color={color}>
            Create Profile
          </BigBtn>
          <button onClick={()=>setStep(0)} style={{ padding:"14px", background:"transparent", border:`1.5px solid ${T.border}`,
            borderRadius:14, color:T.muted, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            ← Back
          </button>
        </div>
      </>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEWER PICKER — public landing, tap your name or create profile
// ══════════════════════════════════════════════════════════════════════════════
function ReviewerPicker({ reviewers, onPick, onAdmin, onRegister }) {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"36px 22px 16px" }}>
        <div style={{ fontSize:30, fontWeight:900, color:T.text, letterSpacing:"-0.02em" }}>⭐ The Review Desk</div>
        <div style={{ fontSize:15, color:T.muted, marginTop:4 }}>Who are you?</div>
      </div>

      <div style={{ flex:1, padding:"4px 22px 130px", overflowY:"auto" }}>
        {reviewers.length===0
          ? <div style={{ textAlign:"center", padding:"48px 0", color:T.muted, fontSize:14, lineHeight:1.6 }}>
              No profiles yet.<br/>Be the first — tap below to create yours.
            </div>
          : <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {reviewers.map(rv=>(
                <button key={rv.id} onClick={()=>onPick(rv.id)}
                  style={{ display:"flex", alignItems:"center", gap:16, padding:"18px", background:T.card,
                    border:`1.5px solid ${T.border}`, borderRadius:18, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                  <Avatar name={rv.name} color={rv.color} size={52} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:18, color:T.text }}>{rv.name}</div>
                  </div>
                  <div style={{ fontSize:26, color:T.muted }}>›</div>
                </button>
              ))}
            </div>
        }
      </div>

      <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"12px 22px 34px",
        background:`linear-gradient(transparent, ${T.bg} 40%)` }}>
        <button onClick={onRegister}
          style={{ width:"100%", padding:"15px", borderRadius:14, border:"none",
            background:T.accent, color:"#000", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
          + I'm new — create my profile
        </button>
        <button onClick={onAdmin}
          style={{ width:"100%", padding:"13px", borderRadius:14, border:`1.5px solid ${T.border}`,
            background:"transparent", color:T.muted, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          🔐 Manager Login
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEWER PORTAL — the submission experience after they pick themselves
// ══════════════════════════════════════════════════════════════════════════════
function ReviewerPortal({ reviewer, businesses, onSubmit, onBack }) {
  const [step, setStep]         = useState(0); // 0=pick biz, 1=details, 2=confirm, 3=done
  const [biz, setBiz]           = useState(null);
  const [platform, setPlatform] = useState("Google");
  const [clientName, setClient] = useState("");
  const [status, setStatus]     = useState("live");
  const [notes, setNotes]       = useState("");
  const [date, setDate]         = useState(today());

  function reset() { setBiz(null); setPlatform("Google"); setClient(""); setStatus("live"); setNotes(""); setDate(today()); setStep(0); }
  function submit() {
    onSubmit({ id:genId(), reviewerId:reviewer.id, businessId:biz.id, platform, clientName, status, notes, date, paidOut:"", receivedIn:"" });
    setStep(3);
  }

  // ── Step 0: pick business ─────────────────────────────────────────────────
  if (step===0) return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"22px 20px 10px", display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={onBack} style={{ background:T.card, border:"none", color:T.muted, borderRadius:10, padding:"8px 14px", cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>‹</button>
        <Avatar name={reviewer.name} color={reviewer.color} size={44} />
        <div>
          <div style={{ fontSize:20, fontWeight:900, color:T.text }}>Hey {reviewer.name.split(" ")[0]} 👋</div>
          <div style={{ fontSize:13, color:T.muted }}>Which page did you post on?</div>
        </div>
      </div>
      <div style={{ flex:1, padding:"8px 20px 20px", overflowY:"auto" }}>
        {businesses.length===0
          ? <div style={{ textAlign:"center", padding:"60px 0", color:T.muted, fontSize:15, lineHeight:1.7 }}>
              No business pages set up yet.<br/>Your manager needs to add them first.
            </div>
          : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {businesses.map(b=>(
                <button key={b.id} onClick={()=>{ setBiz(b); setStep(1); }}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"18px 16px", background:T.card,
                    border:`1.5px solid ${T.border}`, borderRadius:16, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                  <div style={{ width:46, height:46, borderRadius:12, background:`${reviewer.color}20`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
                    {b.emoji||"🏢"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:16, color:T.text }}>{b.name}</div>
                    <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{b.platform}</div>
                  </div>
                  <div style={{ fontSize:22, color:T.muted }}>›</div>
                </button>
              ))}
            </div>
        }
      </div>
    </div>
  );

  // ── Step 1: fill in details ───────────────────────────────────────────────
  if (step===1) return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"20px 20px 10px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>setStep(0)} style={{ background:T.card, border:"none", color:T.muted, borderRadius:10, padding:"8px 14px", cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>‹ Back</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:16, color:T.text }}>{biz.name}</div>
          <div style={{ fontSize:12, color:T.muted }}>{biz.platform}</div>
        </div>
        {biz.emoji && <span style={{ fontSize:28 }}>{biz.emoji}</span>}
      </div>

      <div style={{ flex:1, padding:"4px 20px 120px", overflowY:"auto" }}>
        <Field label="Which account was the review posted on?" hint="The profile name on Google, Yelp, etc.">
          <input style={inp} placeholder="e.g. Downtown Dental - Main St" value={clientName}
            onChange={e=>setClient(e.target.value)} autoFocus />
        </Field>
        <Field label="Platform">
          <Chips options={PLATFORMS} value={platform} onChange={setPlatform} color={reviewer.color} />
        </Field>
        <Field label="Status">
          <Chips options={[{value:"live",label:"✅ Live"},{value:"taken_down",label:"⚠️ Taken Down"},{value:"replenished",label:"🔁 Replenished"}]}
            value={status} onChange={setStatus} color={reviewer.color} />
        </Field>
        <Field label="Date posted">
          <DateDrum value={date} onChange={setDate} />
        </Field>
        <Field label="Notes (optional)">
          <textarea style={{ ...inp, minHeight:80, resize:"none" }}
            placeholder="Anything to flag for your manager..."
            value={notes} onChange={e=>setNotes(e.target.value)} />
        </Field>
      </div>

      <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"16px 20px 32px",
        background:`linear-gradient(transparent, ${T.bg} 40%)` }}>
        <BigBtn onClick={()=>setStep(2)} disabled={!clientName.trim()} color={reviewer.color}>
          Review &amp; Submit →
        </BigBtn>
      </div>
    </div>
  );

  // ── Step 2: confirm before submitting ─────────────────────────────────────
  if (step===2) {
    const [mo,dy,yr] = (() => { const p=date.split("-"); return [MONTHS[parseInt(p[1])-1], p[2], p[0]]; })();
    const statusCfg = { live:{icon:"✅",label:"Live"}, taken_down:{icon:"⚠️",label:"Taken Down"}, replenished:{icon:"🔁",label:"Replenished"} }[status];
    return (
      <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"22px 20px 10px", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>setStep(1)} style={{ background:T.card, border:"none", color:T.muted, borderRadius:10, padding:"8px 14px", cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>‹ Edit</button>
          <div style={{ fontWeight:800, fontSize:16, color:T.text }}>Confirm Review</div>
        </div>
        <div style={{ flex:1, padding:"8px 20px 120px" }}>
          <div style={{ background:T.card, borderRadius:18, border:`1.5px solid ${T.border}`, overflow:"hidden", marginBottom:16 }}>
            {[
              { label:"Business page", value:`${biz.emoji||"🏢"} ${biz.name}` },
              { label:"Account",       value:clientName },
              { label:"Platform",      value:platform },
              { label:"Status",        value:`${statusCfg.icon} ${statusCfg.label}` },
              { label:"Date",          value:`${mo} ${dy}, ${yr}` },
            ].map((row,i)=>(
              <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"15px 18px", borderTop:i>0?`1px solid ${T.border}`:"none" }}>
                <span style={{ fontSize:13, color:T.muted, fontWeight:600 }}>{row.label}</span>
                <span style={{ fontSize:14, color:T.text, fontWeight:700, textAlign:"right", maxWidth:"60%" }}>{row.value}</span>
              </div>
            ))}
            {notes && (
              <div style={{ padding:"12px 18px", borderTop:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.muted, fontWeight:600, marginBottom:4 }}>NOTES</div>
                <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>{notes}</div>
              </div>
            )}
          </div>
          <div style={{ fontSize:13, color:T.muted, textAlign:"center", lineHeight:1.5 }}>
            Look good? Tap submit to send it to your manager.
          </div>
        </div>
        <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"16px 20px 32px",
          background:`linear-gradient(transparent, ${T.bg} 40%)`, display:"flex", flexDirection:"column", gap:10 }}>
          <BigBtn onClick={submit} color={reviewer.color}>Submit ✓</BigBtn>
          <button onClick={()=>setStep(1)} style={{ padding:"13px", background:"transparent",
            border:`1.5px solid ${T.border}`, borderRadius:14, color:T.muted, fontSize:14,
            fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            ← Go back and edit
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: success ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", textAlign:"center" }}>
      <div style={{ fontSize:72, marginBottom:16, lineHeight:1 }}>🎉</div>
      <div style={{ fontSize:28, fontWeight:900, color:T.text, marginBottom:8 }}>Logged!</div>
      <div style={{ fontSize:15, color:T.muted, marginBottom:40, lineHeight:1.6 }}>
        <strong style={{ color:T.text }}>{clientName}</strong> on <strong style={{ color:T.text }}>{biz.name}</strong><br/>has been sent to your manager.
      </div>
      <div style={{ width:"100%", maxWidth:320, display:"flex", flexDirection:"column", gap:12 }}>
        <BigBtn onClick={reset} color={reviewer.color}>Log Another Review</BigBtn>
        <button onClick={onBack} style={{ padding:"14px", background:"transparent", border:`1.5px solid ${T.border}`,
          borderRadius:14, color:T.muted, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Review Card
// ══════════════════════════════════════════════════════════════════════════════
function ReviewCard({ r, businesses, reviewers, onStatusChange, onPay, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const biz  = businesses.find(b=>b.id===r.businessId);
  const rv   = reviewers.find(x=>x.id===r.reviewerId);
  const margin  = (parseFloat(r.receivedIn)||0)-(parseFloat(r.paidOut)||0);
  const needsPay = !r.paidOut && !r.receivedIn;
  const chipB = { padding:"9px 14px", borderRadius:40, border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" };

  return (
    <div style={{ background:T.card, borderRadius:16, overflow:"hidden", border:`1.5px solid ${needsPay?T.purple+"50":T.border}` }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"14px 16px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          {rv && <div style={{ width:8, height:8, borderRadius:"50%", background:rv.color, flexShrink:0 }} />}
          <div style={{ fontWeight:700, fontSize:15, color:T.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.clientName}</div>
          <Badge status={r.status} />
          <span style={{ color:T.muted, fontSize:14 }}>{open?"∧":"∨"}</span>
        </div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
          {biz && <span style={{ fontSize:12, fontWeight:600, color:T.accent, background:`${T.accent}15`, padding:"2px 8px", borderRadius:20 }}>{biz.emoji} {biz.name}</span>}
          <span style={{ fontSize:12, color:T.muted }}>{r.platform}</span>
          <span style={{ fontSize:12, color:T.muted }}>· {r.date}</span>
          {rv && <span style={{ fontSize:12, fontWeight:600, color:rv.color }}>· {rv.name.split(" ")[0]}</span>}
        </div>
        {needsPay
          ? <div style={{ marginTop:7, fontSize:11, fontWeight:700, color:T.purple }}>💰 Pay not entered yet</div>
          : <div style={{ display:"flex", gap:14, marginTop:7 }}>
              <span style={{ fontSize:13, color:T.danger, fontWeight:700 }}>−{fmt(parseFloat(r.paidOut)||0)}</span>
              <span style={{ fontSize:13, color:T.accent, fontWeight:700 }}>+{fmt(parseFloat(r.receivedIn)||0)}</span>
              <span style={{ fontSize:13, color:margin>=0?T.info:T.danger, fontWeight:800 }}>= {fmt(margin)}</span>
            </div>
        }
      </div>
      {open && (
        <div style={{ padding:"0 16px 14px", borderTop:`1px solid ${T.border}` }}>
          {r.notes && <div style={{ fontSize:13, color:T.muted, padding:"12px 0 8px", lineHeight:1.5 }}>{r.notes}</div>}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:6 }}>
            {r.status==="live"        && <button onClick={()=>onStatusChange(r.id,"taken_down")}  style={{ ...chipB, background:`${T.warn}20`,   color:T.warn   }}>Mark Taken Down</button>}
            {r.status==="taken_down"  && <button onClick={()=>onStatusChange(r.id,"replenished")} style={{ ...chipB, background:`${T.info}20`,   color:T.info   }}>Mark Replenished</button>}
            {r.status==="replenished" && <button onClick={()=>onStatusChange(r.id,"live")}        style={{ ...chipB, background:`${T.accent}20`, color:T.accent }}>Set Live</button>}
            {needsPay && <button onClick={()=>onPay(r)} style={{ ...chipB, background:`${T.purple}20`, color:T.purple }}>Enter Pay 💰</button>}
            <button onClick={()=>onEdit(r)} style={{ ...chipB, background:T.surface, color:T.muted }}>Edit</button>
            <button onClick={()=>onDelete(r.id)} style={{ ...chipB, background:`${T.danger}15`, color:T.danger }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Review Form Sheet
// ══════════════════════════════════════════════════════════════════════════════
function ReviewForm({ initial, reviewers, businesses, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    date:today(), platform:"Google", clientName:"",
    businessId:businesses[0]?.id||"", reviewerId:reviewers[0]?.id||"",
    paidOut:"", receivedIn:"", notes:"", status:"live"
  });
  const s = k => v => setForm(f=>({...f,[k]:v}));
  const valid = form.clientName.trim() && form.businessId && form.reviewerId;
  const margin = (parseFloat(form.receivedIn)||0)-(parseFloat(form.paidOut)||0);

  return (
    <Sheet onClose={onClose} title={initial?"Edit Review":"Add Review"}>
      <Field label="Reviewer">
        <Chips options={reviewers.map(r=>({value:r.id,label:r.name.split(" ")[0]}))} value={form.reviewerId} onChange={s("reviewerId")} />
      </Field>
      <Field label="Business page">
        <Chips options={businesses.map(b=>({value:b.id,label:`${b.emoji||"🏢"} ${b.name}`}))} value={form.businessId} onChange={s("businessId")} />
      </Field>
      <Field label="Account the review is under *">
        <input style={inp} placeholder="e.g. Downtown Dental - Main St" value={form.clientName} onChange={e=>s("clientName")(e.target.value)} autoFocus />
      </Field>
      <Field label="Platform">
        <Chips options={PLATFORMS} value={form.platform} onChange={s("platform")} />
      </Field>
      <Field label="Status">
        <Chips options={[{value:"live",label:"✅ Live"},{value:"taken_down",label:"⚠️ Down"},{value:"replenished",label:"🔁 Replenished"}]} value={form.status} onChange={s("status")} />
      </Field>
      <Field label="Date">
          <DateDrum value={form.date} onChange={s("date")} />
        </Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
        <Field label="Paid out ($)"><input type="number" style={inp} placeholder="0.00" min="0" step="0.01" value={form.paidOut} onChange={e=>s("paidOut")(e.target.value)} /></Field>
        <Field label="Received ($)"><input type="number" style={inp} placeholder="0.00" min="0" step="0.01" value={form.receivedIn} onChange={e=>s("receivedIn")(e.target.value)} /></Field>
      </div>
      {(form.paidOut||form.receivedIn) && (
        <div style={{ marginBottom:18, padding:"10px 14px", background:T.surface, borderRadius:10, fontSize:13, fontWeight:700, color:margin>=0?T.accent:T.danger }}>
          Margin: {fmt(margin)}
        </div>
      )}
      <Field label="Notes (optional)">
        <textarea style={{ ...inp, minHeight:70, resize:"none" }} value={form.notes} onChange={e=>s("notes")(e.target.value)} />
      </Field>
      <BigBtn onClick={()=>valid&&onSave(form)} disabled={!valid}>{initial?"Save Changes":"Add Review"}</BigBtn>
      <div style={{ height:8 }} />
    </Sheet>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Batch Pay Sheet (all unpaid reviews in one flow)
// ══════════════════════════════════════════════════════════════════════════════
function BatchPaySheet({ unpaid, businesses, onSaveAll, onClose }) {
  const [entries, setEntries] = useState(
    unpaid.map(r => ({ id:r.id, paidOut:r.paidOut||"", receivedIn:r.receivedIn||"", _r:r }))
  );
  const set = (id,field,val) => setEntries(prev=>prev.map(e=>e.id===id?{...e,[field]:val}:e));
  const filled = entries.filter(e=>e.paidOut||e.receivedIn).length;

  return (
    <Sheet onClose={onClose} title={`Enter Pay — ${unpaid.length} Review${unpaid.length!==1?"s":""}`}>
      <div style={{ fontSize:13, color:T.muted, marginBottom:16 }}>
        Fill in what you know. Tap Save All when done.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        {entries.map(e=>{
          const biz=businesses.find(b=>b.id===e._r.businessId);
          const m=(parseFloat(e.receivedIn)||0)-(parseFloat(e.paidOut)||0);
          const hasPay=e.paidOut||e.receivedIn;
          return (
            <div key={e.id} style={{ background:T.card, borderRadius:14, padding:"14px 14px",
              border:`1.5px solid ${hasPay?T.accent+"40":T.border}` }}>
              <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:2 }}>{e._r.clientName}</div>
              <div style={{ fontSize:12, color:T.muted, marginBottom:10 }}>
                {biz?.emoji} {biz?.name} · {e._r.platform} · {e._r.date}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:10, color:T.muted, fontWeight:700, marginBottom:5 }}>PAID OUT</div>
                  <input type="number" placeholder="0.00" min="0" step="0.01" value={e.paidOut}
                    onChange={ev=>set(e.id,"paidOut",ev.target.value)}
                    style={{ ...inp, padding:"10px 12px", fontSize:15 }} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:T.muted, fontWeight:700, marginBottom:5 }}>RECEIVED</div>
                  <input type="number" placeholder="0.00" min="0" step="0.01" value={e.receivedIn}
                    onChange={ev=>set(e.id,"receivedIn",ev.target.value)}
                    style={{ ...inp, padding:"10px 12px", fontSize:15 }} />
                </div>
              </div>
              {hasPay && (
                <div style={{ marginTop:8, fontSize:12, fontWeight:800, color:m>=0?T.accent:T.danger }}>
                  Margin: {fmt(m)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BigBtn onClick={()=>onSaveAll(entries)} disabled={filled===0}>
        Save {filled>0?`${filled} of ${entries.length}`:"Pay"}
      </BigBtn>
      <div style={{ height:8 }} />
    </Sheet>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Pay Sheet
// ══════════════════════════════════════════════════════════════════════════════
function PaySheet({ review, businesses, onSave, onClose }) {
  const [paidOut, setPO]    = useState(review.paidOut||"");
  const [receivedIn, setRI] = useState(review.receivedIn||"");
  const biz = businesses.find(b=>b.id===review.businessId);
  const m = (parseFloat(receivedIn)||0)-(parseFloat(paidOut)||0);
  return (
    <Sheet onClose={onClose} title="Enter Pay">
      <div style={{ marginBottom:18, padding:"12px 14px", background:T.card, borderRadius:12 }}>
        <div style={{ fontWeight:700, fontSize:15, color:T.text }}>{review.clientName}</div>
        <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{biz?.emoji} {biz?.name} · {review.platform} · {review.date}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
        <Field label="Paid out ($)"><input type="number" style={inp} placeholder="0.00" min="0" step="0.01" value={paidOut} onChange={e=>setPO(e.target.value)} autoFocus /></Field>
        <Field label="Received ($)"><input type="number" style={inp} placeholder="0.00" min="0" step="0.01" value={receivedIn} onChange={e=>setRI(e.target.value)} /></Field>
      </div>
      {(paidOut||receivedIn) && (
        <div style={{ marginBottom:18, padding:"10px 14px", background:T.surface, borderRadius:10, fontSize:14, fontWeight:800, color:m>=0?T.accent:T.danger }}>
          Margin: {fmt(m)}
        </div>
      )}
      <BigBtn onClick={()=>onSave({...review,paidOut,receivedIn})}>Save Pay</BigBtn>
      <div style={{ height:8 }} />
    </Sheet>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Business Page Sheet (admin-only creation)
// ══════════════════════════════════════════════════════════════════════════════
function BusinessSheet({ initial, onSave, onClose }) {
  const [name,       setName]       = useState(initial?.name||"");
  const [platform,   setPlatform]   = useState(initial?.platform||"Google");
  const [url,        setUrl]        = useState(initial?.url||"");
  const [emoji,      setEmoji]      = useState(initial?.emoji||"🏢");
  const [defaultPay, setDefaultPay] = useState(initial?.defaultPay||"");
  return (
    <Sheet onClose={onClose} title={initial?"Edit Business Page":"Add Business Page"}>
      <Field label="Business name *">
        <input style={inp} placeholder="e.g. Downtown Dental" value={name} onChange={e=>setName(e.target.value)} autoFocus />
      </Field>
      <Field label="What they pay you per review ($)" hint="Auto-fills Received when a review comes in">
        <input type="number" style={inp} placeholder="e.g. 25.00" min="0" step="0.01" value={defaultPay} onChange={e=>setDefaultPay(e.target.value)} />
      </Field>
      <Field label="Icon">
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {EMOJIS.map(em=>(
            <button key={em} onClick={()=>setEmoji(em)}
              style={{ width:44, height:44, borderRadius:10, fontSize:22, cursor:"pointer",
                background:emoji===em?`${T.accent}25`:T.card, border:`1.5px solid ${emoji===em?T.accent:T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              {em}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Primary platform">
        <Chips options={PLATFORMS} value={platform} onChange={setPlatform} />
      </Field>
      <Field label="URL (optional)">
        <input style={inp} placeholder="https://..." value={url} onChange={e=>setUrl(e.target.value)} />
      </Field>
      <BigBtn onClick={()=>name.trim()&&onSave({name:name.trim(),platform,url,emoji,defaultPay})} disabled={!name.trim()}>
        {initial?"Save Changes":"Add Page"}
      </BigBtn>
      <div style={{ height:8 }} />
    </Sheet>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Overview Tab
// ══════════════════════════════════════════════════════════════════════════════
function HomeTab({ reviewers, reviews, businesses, onSelectReviewer, onBatchPay }) {
  const g = useMemo(()=>{
    const live=reviews.filter(r=>r.status==="live").length;
    const down=reviews.filter(r=>r.status==="taken_down").length;
    const rep=reviews.filter(r=>r.status==="replenished").length;
    const paid=reviews.reduce((s,r)=>s+(parseFloat(r.paidOut)||0),0);
    const rec=reviews.reduce((s,r)=>s+(parseFloat(r.receivedIn)||0),0);
    const unp=reviews.filter(r=>!r.paidOut&&!r.receivedIn).length;
    return{live,down,rep,paid,rec,net:rec-paid,unp,total:reviews.length};
  },[reviews]);

  return (
    <div style={{ padding:"18px 16px 24px" }}>
      {/* Net profit hero */}
      <div style={{ background:T.card, borderRadius:20, padding:"22px 20px", marginBottom:14, border:`1px solid ${T.border}` }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:T.muted, marginBottom:4 }}>Net Profit — All Time</div>
        <div style={{ fontSize:46, fontWeight:900, color:g.net>=0?T.accent:T.danger, letterSpacing:"-0.02em", lineHeight:1 }}>{fmt(g.net)}</div>
        <div style={{ display:"flex", gap:22, marginTop:14 }}>
          <div><div style={{ fontSize:11, color:T.muted }}>Paid Out</div><div style={{ fontWeight:700, color:T.danger, fontSize:16 }}>{fmt(g.paid)}</div></div>
          <div><div style={{ fontSize:11, color:T.muted }}>Received</div><div style={{ fontWeight:700, color:T.accent, fontSize:16 }}>{fmt(g.rec)}</div></div>
          <div><div style={{ fontSize:11, color:T.muted }}>Total Reviews</div><div style={{ fontWeight:700, color:T.text, fontSize:16 }}>{g.total}</div></div>
        </div>
      </div>

      {/* Status row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
        {[{n:g.live,l:"Live",c:T.accent,i:"✅"},{n:g.down,l:"Down",c:T.warn,i:"⚠️"},{n:g.rep,l:"Replenished",c:T.info,i:"🔁"}].map(x=>(
          <div key={x.l} style={{ background:T.card, borderRadius:14, padding:"14px 10px", border:`1px solid ${T.border}`, textAlign:"center" }}>
            <div style={{ fontSize:18 }}>{x.i}</div>
            <div style={{ fontSize:24, fontWeight:900, color:x.c }}>{x.n}</div>
            <div style={{ fontSize:10, color:T.muted, fontWeight:600 }}>{x.l}</div>
          </div>
        ))}
      </div>

      {g.unp>0 && (
        <div style={{ background:`${T.purple}18`, border:`1.5px solid ${T.purple}40`, borderRadius:14, padding:"12px 16px", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <span style={{ fontSize:20 }}>💰</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, color:T.purple, fontSize:14 }}>{g.unp} review{g.unp!==1?"s":""} need pay entered</div>
            </div>
          </div>
          <button onClick={onBatchPay}
            style={{ width:"100%", padding:"11px", borderRadius:12, border:"none",
              background:T.purple, color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
            Enter All Pay at Once →
          </button>
        </div>
      )}

      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:T.muted, marginBottom:10 }}>Reviewers</div>
      {reviewers.length===0
        ? <div style={{ textAlign:"center", padding:"36px 0", color:T.muted, fontSize:14 }}>No reviewer profiles yet. They'll appear once someone registers.</div>
        : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {reviewers.map(rv=>{
              const myR=reviews.filter(r=>r.reviewerId===rv.id);
              const myLive=myR.filter(r=>r.status==="live").length;
              const myDown=myR.filter(r=>r.status==="taken_down").length;
              const myPaid=myR.reduce((s,r)=>s+(parseFloat(r.paidOut)||0),0);
              const myRec=myR.reduce((s,r)=>s+(parseFloat(r.receivedIn)||0),0);
              const myUnp=myR.filter(r=>!r.paidOut&&!r.receivedIn).length;
              return (
                <button key={rv.id} onClick={()=>onSelectReviewer(rv.id)}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:T.card,
                    border:`1.5px solid ${T.border}`, borderRadius:16, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                  <Avatar name={rv.name} color={rv.color} size={44} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:T.text }}>{rv.name}</div>
                    <div style={{ display:"flex", gap:10, marginTop:5, flexWrap:"wrap" }}>
                      <span style={{ fontSize:12, color:T.accent, fontWeight:700 }}>{myLive} live</span>
                      {myDown>0 && <span style={{ fontSize:12, color:T.warn, fontWeight:700 }}>⚠️ {myDown} down</span>}
                      {myUnp>0  && <span style={{ fontSize:12, color:T.purple, fontWeight:700 }}>💰 {myUnp} unpaid</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:15, fontWeight:800, color:myRec-myPaid>=0?T.accent:T.danger }}>{fmt(myRec-myPaid)}</div>
                    <div style={{ fontSize:11, color:T.muted }}>net</div>
                  </div>
                  <div style={{ color:T.muted, fontSize:18 }}>›</div>
                </button>
              );
            })}
          </div>
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Reviews Tab
// ══════════════════════════════════════════════════════════════════════════════
function ReviewsTab({ reviews, reviewers, businesses, onStatusChange, onPay, onEdit, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(()=>{
    let l=filter==="all"?reviews:reviews.filter(r=>r.status===filter);
    if(search.trim()){const q=search.toLowerCase();l=l.filter(r=>r.clientName.toLowerCase().includes(q)||(r.notes||"").toLowerCase().includes(q));}
    return [...l].sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[reviews,filter,search]);
  const net=filtered.reduce((s,r)=>s+(parseFloat(r.receivedIn)||0)-(parseFloat(r.paidOut)||0),0);

  return (
    <div style={{ padding:"14px 16px 24px" }}>
      <input style={{ ...inp, marginBottom:12 }} placeholder="🔍  Search reviews..." value={search} onChange={e=>setSearch(e.target.value)} />
      <div style={{ display:"flex", gap:8, marginBottom:14, overflowX:"auto", paddingBottom:2 }}>
        {[{v:"all",l:"All"},{v:"live",l:"✅ Live"},{v:"taken_down",l:"⚠️ Down"},{v:"replenished",l:"🔁 Replenished"}].map(o=>(
          <button key={o.v} onClick={()=>setFilter(o.v)}
            style={{ padding:"8px 14px", borderRadius:40, border:`1.5px solid ${filter===o.v?T.accent:T.border}`,
              background:filter===o.v?`${T.accent}15`:"transparent", color:filter===o.v?T.accent:T.muted,
              fontWeight:filter===o.v?700:500, fontSize:13, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
            {o.l}
          </button>
        ))}
      </div>
      {filtered.length===0
        ? <div style={{ textAlign:"center", padding:"48px 0", color:T.muted, fontSize:14 }}>No reviews match.</div>
        : <>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filtered.map(r=>(
                <ReviewCard key={r.id} r={r} businesses={businesses} reviewers={reviewers}
                  onStatusChange={onStatusChange} onPay={onPay} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
            <div style={{ marginTop:14, padding:"14px 16px", background:T.card, borderRadius:14, border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:8, fontWeight:600 }}>{filtered.length} reviews shown</div>
              <div style={{ display:"flex", gap:20 }}>
                <div><div style={{ fontSize:10, color:T.muted }}>PAID OUT</div><div style={{ fontWeight:800, color:T.danger }}>{fmt(filtered.reduce((s,r)=>s+(parseFloat(r.paidOut)||0),0))}</div></div>
                <div><div style={{ fontSize:10, color:T.muted }}>RECEIVED</div><div style={{ fontWeight:800, color:T.accent }}>{fmt(filtered.reduce((s,r)=>s+(parseFloat(r.receivedIn)||0),0))}</div></div>
                <div><div style={{ fontSize:10, color:T.muted }}>NET</div><div style={{ fontWeight:800, color:net>=0?T.info:T.danger }}>{fmt(net)}</div></div>
              </div>
            </div>
          </>
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Team Tab (reviewers list + business pages, admin-only biz creation)
// ══════════════════════════════════════════════════════════════════════════════
function TeamTab({ reviewers, reviews, businesses, onDeleteReviewer, onEditReviewerRate, onAddBusiness, onEditBusiness, onDeleteBusiness }) {
  const [editRateRv, setEditRateRv] = useState(null);
  const [rateVal,    setRateVal]    = useState("");

  return (
    <div style={{ padding:"16px 16px 24px" }}>

      {/* Reviewers — self-registered, but admin can set their rate */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ fontSize:15, fontWeight:800, color:T.text }}>Reviewers</div>
        <div style={{ fontSize:11, color:T.muted, fontWeight:600 }}>Self-registered</div>
      </div>
      {reviewers.length===0
        ? <div style={{ padding:"20px 16px", background:T.card, borderRadius:14, border:`1px solid ${T.border}`, color:T.muted, fontSize:14, textAlign:"center", marginBottom:24 }}>
            Reviewers create their own profiles from the home screen.
          </div>
        : <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
            {reviewers.map(rv=>{
              const ct=reviews.filter(r=>r.reviewerId===rv.id).length;
              return (
                <div key={rv.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px" }}>
                    <Avatar name={rv.name} color={rv.color} size={40} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{rv.name}</div>
                      <div style={{ fontSize:12, color:T.muted }}>{ct} review{ct!==1?"s":""}</div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ setEditRateRv(rv); setRateVal(rv.defaultRate||""); }}
                        style={{ padding:"7px 10px", background:`${T.accent}20`, color:T.accent, border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        Set Rate
                      </button>
                      <button onClick={()=>onDeleteReviewer(rv.id)}
                        style={{ padding:"7px 10px", background:`${T.danger}15`, color:T.danger, border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                  {rv.defaultRate && (
                    <div style={{ padding:"8px 16px", borderTop:`1px solid ${T.border}`, background:`${T.accent}08`, fontSize:12, color:T.accent, fontWeight:600 }}>
                      💸 Auto-pays {fmt(parseFloat(rv.defaultRate))} per review
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }

      {/* Rate edit sheet */}
      {editRateRv && (
        <Sheet onClose={()=>setEditRateRv(null)} title={`${editRateRv.name}'s Rate`}>
          <Field label="What you pay per review ($)" hint="Auto-fills Paid Out whenever they submit">
            <input type="number" style={inp} placeholder="e.g. 10.00" min="0" step="0.01"
              value={rateVal} onChange={e=>setRateVal(e.target.value)} autoFocus />
          </Field>
          <BigBtn onClick={()=>{ onEditReviewerRate(editRateRv.id, rateVal); setEditRateRv(null); }}>
            Save Rate
          </BigBtn>
          <div style={{ height:8 }} />
          <button onClick={()=>setEditRateRv(null)} style={{ width:"100%", padding:"13px", background:"transparent",
            border:`1.5px solid ${T.border}`, borderRadius:14, color:T.muted, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <div style={{ height:8 }} />
        </Sheet>
      )}

      {/* Business pages — admin creates these */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ fontSize:15, fontWeight:800, color:T.text }}>Business Pages</div>
        <button onClick={onAddBusiness}
          style={{ padding:"8px 16px", background:T.accent, color:"#000", border:"none", borderRadius:40, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
          + Add
        </button>
      </div>
      <div style={{ fontSize:12, color:T.muted, marginBottom:12, padding:"10px 14px", background:`${T.accent}10`, borderRadius:10, border:`1px solid ${T.accent}25` }}>
        🔒 Only you can add business pages. Reviewers pick from this list when they submit.
      </div>
      {businesses.length===0
        ? <div style={{ textAlign:"center", padding:"28px", color:T.muted, fontSize:14, background:T.card, borderRadius:14, border:`1px solid ${T.border}` }}>
            No pages yet. Add one above.
          </div>
        : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {businesses.map(b=>{
              const ct=reviews.filter(r=>r.businessId===b.id).length;
              return (
                <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:T.card, border:`1px solid ${T.border}`, borderRadius:14 }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:`${T.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{b.emoji||"🏢"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{b.name}</div>
                    <div style={{ fontSize:12, color:T.muted }}>{b.platform} · {ct} review{ct!==1?"s":""}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>onEditBusiness(b)} style={{ padding:"7px 10px", background:T.surface, color:T.muted, border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
                    <button onClick={()=>onDeleteBusiness(b.id)} style={{ padding:"7px 10px", background:`${T.danger}15`, color:T.danger, border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Reviewer Detail
// ══════════════════════════════════════════════════════════════════════════════
function ReviewerDetail({ reviewer, reviews, businesses, onBack, onStatusChange, onPay, onEdit, onDelete }) {
  const [filter, setFilter] = useState("all");
  const stats = useMemo(()=>{
    const live=reviews.filter(r=>r.status==="live").length;
    const down=reviews.filter(r=>r.status==="taken_down").length;
    const paid=reviews.reduce((s,r)=>s+(parseFloat(r.paidOut)||0),0);
    const rec=reviews.reduce((s,r)=>s+(parseFloat(r.receivedIn)||0),0);
    const unp=reviews.filter(r=>!r.paidOut&&!r.receivedIn).length;
    return{live,down,paid,rec,net:rec-paid,unp};
  },[reviews]);
  const filtered=useMemo(()=>[...( filter==="all"?reviews:reviews.filter(r=>r.status===filter))].sort((a,b)=>new Date(b.date)-new Date(a.date)),[reviews,filter]);

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"16px 16px 14px" }}>
        <button onClick={onBack} style={{ background:"transparent", border:"none", color:T.muted, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", padding:"0 0 10px" }}>‹ Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <Avatar name={reviewer.name} color={reviewer.color} size={50} />
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:T.text }}>{reviewer.name}</div>
            {reviewer.note && <div style={{ fontSize:13, color:T.muted }}>{reviewer.note}</div>}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[{v:stats.live,l:"Live",c:T.accent},{v:fmt(stats.paid),l:"Paid Out",c:T.danger},{v:fmt(stats.net),l:"Net",c:stats.net>=0?T.accent:T.danger}].map(x=>(
            <div key={x.l} style={{ background:T.card, borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:900, color:x.c }}>{x.v}</div>
              <div style={{ fontSize:10, color:T.muted, fontWeight:600 }}>{x.l}</div>
            </div>
          ))}
        </div>
        {stats.down>0 && <div style={{ marginTop:8, padding:"8px 12px", background:`${T.warn}18`, borderRadius:10, fontSize:13, fontWeight:700, color:T.warn }}>⚠️ {stats.down} taken down</div>}
        {stats.unp>0  && <div style={{ marginTop:6, padding:"8px 12px", background:`${T.purple}18`, borderRadius:10, fontSize:13, fontWeight:700, color:T.purple }}>💰 {stats.unp} need pay entered</div>}
      </div>
      <div style={{ padding:"14px 16px 80px" }}>
        <div style={{ display:"flex", gap:8, marginBottom:14, overflowX:"auto", paddingBottom:2 }}>
          {[{v:"all",l:"All"},{v:"live",l:"✅ Live"},{v:"taken_down",l:"⚠️ Down"},{v:"replenished",l:"🔁 Replenished"}].map(o=>(
            <button key={o.v} onClick={()=>setFilter(o.v)}
              style={{ padding:"8px 14px", borderRadius:40, border:`1.5px solid ${filter===o.v?reviewer.color:T.border}`,
                background:filter===o.v?`${reviewer.color}20`:"transparent", color:filter===o.v?reviewer.color:T.muted,
                fontWeight:filter===o.v?700:500, fontSize:13, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              {o.l}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(r=>(
            <ReviewCard key={r.id} r={r} businesses={businesses} reviewers={[reviewer]}
              onStatusChange={onStatusChange} onPay={onPay} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {filtered.length===0 && <div style={{ textAlign:"center", padding:"36px 0", color:T.muted, fontSize:14 }}>No reviews here.</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — PIN Keypad
// ══════════════════════════════════════════════════════════════════════════════
function PinGate({ onUnlock }) {
  const [pin, setPin]   = useState("");
  const [shake, setShake] = useState(false);
  function attempt(p) {
    if (p===ADMIN_PIN) onUnlock();
    else { setShake(true); setPin(""); setTimeout(()=>setShake(false),500); }
  }
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", fontFamily:"'Inter','Segoe UI',sans-serif", padding:"24px" }}>
      <div style={{ fontSize:36, marginBottom:10 }}>🔐</div>
      <div style={{ fontSize:22, fontWeight:900, color:T.text, marginBottom:4 }}>The Review Desk</div>
      <div style={{ fontSize:14, color:T.muted, marginBottom:36 }}>Enter your PIN</div>
      <div style={{ display:"flex", gap:14, marginBottom:36, transition:"transform 0.05s", transform:shake?"translateX(10px)":"none" }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{ width:14, height:14, borderRadius:"50%", background:pin.length>i?T.accent:T.border, transition:"background 0.1s" }} />
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, width:"100%", maxWidth:280 }}>
        {keys.map((d,i)=>(
          <button key={i} onClick={()=>{
            if(d==="⌫"){setPin(p=>p.slice(0,-1));return;}
            if(d==="")return;
            const next=pin+d; setPin(next);
            if(next.length===4) attempt(next);
          }}
          style={{ aspectRatio:"1", borderRadius:16, border:"none", background:d===""?"transparent":T.card,
            color:d==="⌫"?T.muted:T.text, fontSize:d==="⌫"?22:24, fontWeight:700,
            cursor:d===""?"default":"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:d===""?"none":"0 2px 8px rgba(0,0,0,0.3)" }}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [reviewers,  setReviewers]  = useState([]);
  const [reviews,    setReviews]    = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [ready,      setReady]      = useState(false);

  // mode: picker | register | portal | pin | admin
  const [mode,      setMode]      = useState("picker");
  const [portalId,  setPortalId]  = useState(null);
  const [adminTab,  setAdminTab]  = useState("home");
  const [detailRvId,setDetailRvId]= useState(null);

  // Sheets
  const [addReview,    setAddReview]    = useState(false);
  const [editReview,   setEditReview]   = useState(null);
  const [paySheet,     setPaySheet]     = useState(null);
  const [batchPayOpen, setBatchPayOpen] = useState(false);
  const [addBiz,       setAddBiz]       = useState(false);
  const [editBiz,      setEditBiz]      = useState(null);
  const [delConfirm,   setDelConfirm]   = useState(null);
  const [toast,        setToast]        = useState(null);

  // ── Load all data from Supabase + subscribe to live changes ───────────────
  useEffect(()=>{
    let active = true;

    async function fetchAll() {
      try {
        const [rvRes, reRes, bizRes] = await Promise.all([
          supabase.from("reviewers").select("*").order("created_at",{ascending:true}),
          supabase.from("reviews").select("*").order("date",{ascending:false}),
          supabase.from("businesses").select("*").order("created_at",{ascending:true}),
        ]);
        if (!active) return;
        if (rvRes.data)  setReviewers(rvRes.data.map(r=>({id:r.id,name:r.name,color:r.color,note:r.note||"",defaultRate:r.default_rate==null?"":String(r.default_rate)})));
        if (reRes.data)  setReviews(reRes.data.map(fromReviewRow));
        if (bizRes.data) setBusinesses(bizRes.data.map(fromBizRow));
      } catch(e) {
        console.error("Fetch error:", e);
      } finally {
        if (active) setReady(true);
      }
    }

    // Fetch data immediately — don't wait for realtime
    fetchAll();

    // Realtime subscription is non-blocking — if it fails, app still works
    let channel;
    try {
      channel = supabase
        .channel("review-desk-sync")
        .on("postgres_changes",{event:"*",schema:"public",table:"reviewers"},  fetchAll)
        .on("postgres_changes",{event:"*",schema:"public",table:"reviews"},    fetchAll)
        .on("postgres_changes",{event:"*",schema:"public",table:"businesses"}, fetchAll)
        .subscribe((status)=>{
          console.log("Realtime status:", status);
        });
    } catch(e) {
      console.error("Realtime error:", e);
    }

    return ()=>{ active=false; if(channel) supabase.removeChannel(channel); };
  },[]);

  function toast_(msg,color){ setToast({msg,color}); setTimeout(()=>setToast(null),2200); }

  // ── CRUD (writes to Supabase; realtime brings the change back to all devices)
  const addReviewer = async rv => {
    setReviewers(p=>[...p,rv]); // optimistic
    const { error } = await supabase.from("reviewers").insert({
      id:rv.id, name:rv.name, color:rv.color, note:rv.note||"",
      default_rate:rv.defaultRate===""||rv.defaultRate==null?null:Number(rv.defaultRate)
    });
    if (error) toast_("Save failed — check connection", T.danger);
    else toast_("Profile created ✓");
  };
  const delReviewer = async id => {
    setReviewers(p=>p.filter(r=>r.id!==id)); setReviews(p=>p.filter(r=>r.reviewerId!==id)); setDelConfirm(null);
    await supabase.from("reviews").delete().eq("reviewer_id",id);
    await supabase.from("reviewers").delete().eq("id",id);
    toast_("Removed",T.danger);
  };
  const saveRev = async form => {
    if (editReview) {
      const merged = {...form, id:editReview.id, reviewerId:editReview.reviewerId};
      setReviews(p=>p.map(r=>r.id===editReview.id?merged:r)); setEditReview(null);
      await supabase.from("reviews").update(toReviewRow(merged)).eq("id",merged.id);
    } else {
      const rec = {...form, id:genId()};
      setReviews(p=>[...p,rec]); setAddReview(false);
      await supabase.from("reviews").insert(toReviewRow(rec));
    }
    toast_("Saved ✓");
  };
  const statusChange = async (id,status) => {
    setReviews(p=>p.map(r=>r.id===id?{...r,status}:r));
    await supabase.from("reviews").update({ status }).eq("id",id);
    toast_(STATUS_LABEL[status]||status);
  };
  const savePay = async upd => {
    setReviews(p=>p.map(r=>r.id===upd.id?upd:r)); setPaySheet(null);
    await supabase.from("reviews").update({
      paid_out: upd.paidOut===""?null:Number(upd.paidOut),
      received_in: upd.receivedIn===""?null:Number(upd.receivedIn),
    }).eq("id",upd.id);
    toast_("Pay saved 💰");
  };
  const saveBatchPay = async entries => {
    const filled = entries.filter(e=>e.paidOut||e.receivedIn);
    setReviews(p=>p.map(r=>{
      const e=entries.find(x=>x.id===r.id);
      return e ? {...r, paidOut:e.paidOut, receivedIn:e.receivedIn} : r;
    }));
    setBatchPayOpen(false);
    await Promise.all(filled.map(e=>
      supabase.from("reviews").update({
        paid_out: e.paidOut===""?null:Number(e.paidOut),
        received_in: e.receivedIn===""?null:Number(e.receivedIn),
      }).eq("id",e.id)
    ));
    toast_(`Pay saved for ${filled.length} reviews 💰`);
  };
  const editReviewerRate = async (id, rate) => {
    setReviewers(p=>p.map(r=>r.id===id?{...r,defaultRate:rate}:r));
    await supabase.from("reviewers").update({ default_rate:rate===""||rate==null?null:Number(rate) }).eq("id",id);
    toast_("Rate saved ✓");
  };
    setReviews(p=>p.filter(r=>r.id!==id)); setDelConfirm(null);
    await supabase.from("reviews").delete().eq("id",id);
    toast_("Deleted",T.danger);
  };
  const saveBiz = async data => {
    if (editBiz) {
      const merged = {...editBiz,...data};
      setBusinesses(p=>p.map(b=>b.id===editBiz.id?merged:b)); setEditBiz(null);
      await supabase.from("businesses").update(toBizRow(merged)).eq("id",merged.id);
    } else {
      const rec = {...data, id:genId()};
      setBusinesses(p=>[...p,rec]); setAddBiz(false);
      await supabase.from("businesses").insert(toBizRow(rec));
    }
    toast_("Saved ✓");
  };
  const deleteBiz = async id => {
    setBusinesses(p=>p.filter(b=>b.id!==id)); setDelConfirm(null);
    await supabase.from("businesses").delete().eq("id",id);
    toast_("Removed",T.danger);
  };

  const keysMissing = SUPABASE_URL.includes("PASTE_YOUR") || SUPABASE_ANON_KEY.includes("PASTE_YOUR");

  if (keysMissing) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter','Segoe UI',sans-serif", padding:"24px" }}>
      <div style={{ maxWidth:380, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:14 }}>🔌</div>
        <div style={{ fontSize:20, fontWeight:900, color:T.text, marginBottom:8 }}>Almost there</div>
        <div style={{ fontSize:14, color:T.muted, lineHeight:1.6 }}>
          Paste your Supabase URL and anon key at the top of the code to connect The Review Desk to your database. See the setup guide.
        </div>
      </div>
    </div>
  );

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ fontSize:14, color:T.muted }}>Loading...</div>
    </div>
  );

  const CSS = `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}body{margin:0;background:${T.bg};}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.6);}@keyframes fadeup{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}title::before{content:"The Review Desk"}`;

  // ── Reviewer portal ──────────────────────────────────────────────────────
  if (mode==="portal" && portalId) {
    const rv=reviewers.find(r=>r.id===portalId);
    if(!rv){setMode("picker");return null;}
    const submitReview = async r => {
      const rv2 = reviewers.find(x=>x.id===r.reviewerId);
      const biz2 = businesses.find(x=>x.id===r.businessId);
      const withPay = {
        ...r,
        paidOut: rv2?.defaultRate || "",
        receivedIn: biz2?.defaultPay || "",
      };
      setReviews(p=>[...p,withPay]); // optimistic
      const { error } = await supabase.from("reviews").insert(toReviewRow(withPay));
      if (error) toast_("Submit failed — check connection", T.danger);
      else toast_("Logged 🎉");
    };
    return <>
      <style>{CSS}</style>
      <ReviewerPortal reviewer={rv} businesses={businesses} onSubmit={submitReview} onBack={()=>setMode("picker")} />
    </>;
  }

  // ── Self-register ────────────────────────────────────────────────────────
  if (mode==="register") return <>
    <style>{CSS}</style>
    <SelfRegister onDone={rv=>{ addReviewer(rv); setPortalId(rv.id); setMode("portal"); }} />
  </>;

  // ── Picker (public landing) ──────────────────────────────────────────────
  if (mode==="picker") return <>
    <style>{CSS}</style>
    <ReviewerPicker reviewers={reviewers} onPick={id=>{setPortalId(id);setMode("portal");}} onAdmin={()=>setMode("pin")} onRegister={()=>setMode("register")} />
  </>;

  // ── PIN ──────────────────────────────────────────────────────────────────
  if (mode==="pin") return <>
    <style>{CSS}</style>
    <PinGate onUnlock={()=>setMode("admin")} />
  </>;

  // ── Admin ────────────────────────────────────────────────────────────────
  const detailRv = reviewers.find(r=>r.id===detailRvId);
  return <>
    <style>{CSS}</style>

    {detailRv
      ? <ReviewerDetail
          reviewer={detailRv}
          reviews={reviews.filter(r=>r.reviewerId===detailRvId)}
          businesses={businesses}
          onBack={()=>setDetailRvId(null)}
          onStatusChange={statusChange}
          onPay={r=>setPaySheet(r)}
          onEdit={r=>setEditReview(r)}
          onDelete={id=>setDelConfirm({type:"review",id,label:"this review"})}
        />
      : <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif", paddingBottom:80 }}>
          <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"16px 16px 12px",
            display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
            <div style={{ fontWeight:900, fontSize:18, color:T.text }}>⭐ The Review Desk</div>
            <div style={{ display:"flex", gap:8 }}>
              {(adminTab==="reviews"||adminTab==="home") && (
                <button onClick={()=>setAddReview(true)}
                  style={{ padding:"8px 16px", background:T.accent, color:"#000", border:"none", borderRadius:40, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                  + Review
                </button>
              )}
              <button onClick={()=>setMode("picker")}
                style={{ padding:"8px 12px", background:T.card, border:`1px solid ${T.border}`, color:T.muted, borderRadius:40, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Exit
              </button>
            </div>
          </div>

          <div style={{ height:"calc(100vh - 112px)", overflowY:"auto" }}>
            {adminTab==="home"    && <HomeTab reviewers={reviewers} reviews={reviews} businesses={businesses} onSelectReviewer={id=>setDetailRvId(id)} onBatchPay={()=>setBatchPayOpen(true)} />}
            {adminTab==="reviews" && <ReviewsTab reviews={reviews} reviewers={reviewers} businesses={businesses}
              onStatusChange={statusChange} onPay={r=>setPaySheet(r)} onEdit={r=>setEditReview(r)}
              onDelete={id=>setDelConfirm({type:"review",id,label:"this review"})} />}
            {adminTab==="team"    && <TeamTab reviewers={reviewers} reviews={reviews} businesses={businesses}
              onDeleteReviewer={id=>setDelConfirm({type:"reviewer",id,label:"this reviewer and all their data"})}
              onEditReviewerRate={editReviewerRate}
              onAddBusiness={()=>setAddBiz(true)} onEditBusiness={b=>setEditBiz(b)}
              onDeleteBusiness={id=>setDelConfirm({type:"biz",id,label:"this business page"})} />}
          </div>
          <TabBar tab={adminTab} onChange={setAdminTab} />
        </div>
    }

    {/* Sheets */}
    {addReview  && <ReviewForm reviewers={reviewers} businesses={businesses} onSave={saveRev} onClose={()=>setAddReview(false)} />}
    {editReview && <ReviewForm initial={editReview} reviewers={reviewers} businesses={businesses} onSave={saveRev} onClose={()=>setEditReview(null)} />}
    {paySheet   && <PaySheet review={paySheet} businesses={businesses} onSave={savePay} onClose={()=>setPaySheet(null)} />}
    {batchPayOpen && (
      <BatchPaySheet
        unpaid={reviews.filter(r=>!r.paidOut&&!r.receivedIn)}
        businesses={businesses}
        onSaveAll={saveBatchPay}
        onClose={()=>setBatchPayOpen(false)}
      />
    )}
    {addBiz     && <BusinessSheet onSave={saveBiz} onClose={()=>setAddBiz(false)} />}
    {editBiz    && <BusinessSheet initial={editBiz} onSave={saveBiz} onClose={()=>setEditBiz(null)} />}

    {delConfirm && (
      <Sheet onClose={()=>setDelConfirm(null)} title="Delete?">
        <div style={{ fontSize:14, color:T.muted, marginBottom:20 }}>This permanently deletes {delConfirm.label}.</div>
        <BigBtn color={T.danger} textColor="#fff" onClick={()=>{
          if(delConfirm.type==="review")   deleteReview(delConfirm.id);
          if(delConfirm.type==="reviewer") delReviewer(delConfirm.id);
          if(delConfirm.type==="biz")      deleteBiz(delConfirm.id);
        }}>Delete</BigBtn>
        <div style={{ height:10 }} />
        <button onClick={()=>setDelConfirm(null)} style={{ width:"100%", padding:"14px", background:"transparent",
          border:`1.5px solid ${T.border}`, borderRadius:14, color:T.muted, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          Cancel
        </button>
        <div style={{ height:8 }} />
      </Sheet>
    )}

    {toast && <Toast msg={toast.msg} color={toast.color} />}
  </>;
}


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
