// pages/index.js — SkolarPay Complete GUI
// All 8 modules: Auth, Wallet, Parent, Transactions,
// Expense Tracking, Semester Budget, Savings Goals, Reports
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

// ─── COLORS ──────────────────────────────────────────────────
const C = {
  p1:'#5B4FE8', p2:'#7B6FF0', p3:'#B0A8F8', pl:'#EEEDFD',
  c1:'#06B6D4', g1:'#10B981', g2:'#D1FAE5',
  r1:'#EF4444', r2:'#FEE2E2', a1:'#F59E0B', a2:'#FEF3C7',
  dark:'#0F0E1A', mid:'#1A1830', card:'rgba(255,255,255,0.06)',
  border:'rgba(255,255,255,0.09)', text:'#F1F0FF', sub:'rgba(241,240,255,0.5)',
  // category colors
  food:'#F59E0B', transport:'#3B82F6', education:'#8B5CF6',
  shopping:'#EC4899', entertainment:'#EF4444', health:'#10B981',
  utilities:'#F59E0B', transfer:'#06B6D4', savings:'#10B981',
  topup:'#8B5CF6', bank_transfer:'#EF4444', other:'#9CA3AF',
};

// ─── CATEGORY META ────────────────────────────────────────────
const CATS = {
  food:         { label:'Food',          emoji:'🍔', color:C.food },
  transport:    { label:'Transport',     emoji:'🚗', color:C.transport },
  education:    { label:'Education',     emoji:'📚', color:C.education },
  shopping:     { label:'Shopping',      emoji:'🛍️', color:C.shopping },
  entertainment:{ label:'Entertainment', emoji:'🎬', color:C.entertainment },
  health:       { label:'Health',        emoji:'🏥', color:C.health },
  utilities:    { label:'Utilities',     emoji:'⚡', color:C.utilities },
  transfer:     { label:'Transfer',      emoji:'💸', color:C.transfer },
  savings:      { label:'Savings',       emoji:'💰', color:C.savings },
  topup:        { label:'Topup',         emoji:'📱', color:C.topup },
  bank_transfer:{ label:'Bank',          emoji:'🏦', color:C.bank_transfer },
  other:        { label:'Other',         emoji:'📦', color:C.other },
};

// ─── API HELPER ───────────────────────────────────────────────
const api = {
  token: null,
  init() { if (typeof window !== 'undefined') this.token = localStorage.getItem('sk_token') || null; },
  save(t) { this.token = t; if (typeof window !== 'undefined') localStorage.setItem('sk_token', t); },
  clear() { this.token = null; if (typeof window !== 'undefined') localStorage.removeItem('sk_token'); },
  hdrs() { return { 'Content-Type':'application/json', ...(this.token ? { Authorization:`Bearer ${this.token}` } : {}) }; },
  async get(p) {
    const r = await fetch(`/api${p}`, { headers: this.hdrs() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  },
  async post(p, b) {
    const r = await fetch(`/api${p}`, { method:'POST', headers:this.hdrs(), body:JSON.stringify(b) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  },
  async patch(p) {
    const r = await fetch(`/api${p}`, { method:'PATCH', headers:this.hdrs() });
    return r.json();
  },
};

// ─── STYLE HELPERS ────────────────────────────────────────────
const glass  = (extra={}) => ({ background:C.card, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:`1px solid ${C.border}`, borderRadius:20, padding:20, ...extra });
const btn    = (col=C.p1) => ({ background:`linear-gradient(135deg,${col},${col}cc)`, color:'white', border:'none', borderRadius:14, padding:'13px 20px', fontSize:14, fontWeight:700, cursor:'pointer', width:'100%', transition:'all .2s', fontFamily:'inherit', boxShadow:`0 6px 20px ${col}44` });
const ghost  = (col=C.p1) => ({ background:`${col}12`, color:col, border:`1px solid ${col}30`, borderRadius:14, padding:'12px 20px', fontSize:13, fontWeight:700, cursor:'pointer', width:'100%', transition:'all .2s', fontFamily:'inherit' });
const inputS = { background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 16px', color:C.text, fontSize:14, fontWeight:500, width:'100%', outline:'none', fontFamily:'inherit' };
const labelS = { fontSize:11, fontWeight:700, color:C.sub, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 };

// ─── REUSABLE UI COMPONENTS ───────────────────────────────────
function Card({ children, style={}, onClick }) {
  return <div style={{ ...glass(), ...style }} onClick={onClick}>{children}</div>;
}
function Btn({ label, onClick, color=C.p1, ghost:g, icon, loading, style={} }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ ...(g ? ghost(color) : btn(color)), ...style }}>
      {loading ? '⏳ Loading…' : <>{icon && <span style={{marginRight:6}}>{icon}</span>}{label}</>}
    </button>
  );
}
function Field({ label, name, value, onChange, placeholder, type='text', hint, req, as }) {
  return (
    <div style={{marginBottom:12}}>
      <label style={labelS}>{label}{req && <span style={{color:C.r1}}> *</span>}</label>
      {as === 'select'
        ? <select name={name} value={value} onChange={onChange}
            style={{ ...inputS, appearance:'none' }}>
            {placeholder && <option value="">{placeholder}</option>}
          </select>
        : <input name={name} value={value||''} onChange={onChange}
            placeholder={placeholder} type={type} style={inputS}
            onFocus={e=>e.target.style.borderColor=C.p1}
            onBlur={e=>e.target.style.borderColor=C.border} />
      }
      {hint && <div style={{fontSize:11,color:C.sub,marginTop:4}}>{hint}</div>}
    </div>
  );
}
function ErrBox({ msg, onClose }) {
  if (!msg) return null;
  return <div style={{background:C.r2,border:`1px solid ${C.r1}44`,borderRadius:12,padding:'10px 14px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <span style={{fontSize:13,color:C.r1}}>⚠️ {msg}</span>
    {onClose && <span onClick={onClose} style={{cursor:'pointer',color:C.sub,fontSize:18,marginLeft:8}}>×</span>}
  </div>;
}
function OkBox({ msg }) {
  if (!msg) return null;
  return <div style={{background:C.g2,border:`1px solid ${C.g1}44`,borderRadius:12,padding:'10px 14px',marginBottom:14}}>
    <span style={{fontSize:13,color:C.g1}}>✅ {msg}</span>
  </div>;
}
function Spinner() { return <div style={{textAlign:'center',padding:40,color:C.sub}}>⏳ Loading…</div>; }
function Tag({ label, color=C.p1 }) {
  return <span style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:`${color}22`,color}}>{label}</span>;
}
function Avatar({ name='?', size=40, color=`linear-gradient(135deg,${C.p1},${C.p2})` }) {
  const ini = (name||'?').split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
  return <div style={{width:size,height:size,borderRadius:size*.3,background:color,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:size*.32,flexShrink:0}}>{ini}</div>;
}
function ProgBar({ pct, color=C.p1, h=8 }) {
  const p = Math.min(100, Math.max(0, pct));
  const col = p >= 90 ? C.r1 : p >= 75 ? C.a1 : color;
  return (
    <div style={{height:h,background:'rgba(255,255,255,0.08)',borderRadius:h/2,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${p}%`,background:`linear-gradient(90deg,${col},${col}cc)`,borderRadius:h/2,transition:'width 1s'}} />
    </div>
  );
}
function TxRow({ tx }) {
  const cat = CATS[tx.category] || CATS.other;
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:`1px solid ${C.border}`}}>
      <div style={{width:44,height:44,borderRadius:14,flexShrink:0,background:tx.type==='credit'?`${C.g1}18`:`${C.p1}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
        {cat.emoji}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:13,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}</div>
        <div style={{display:'flex',gap:6,marginTop:3,alignItems:'center',flexWrap:'wrap'}}>
          <Tag label={cat.label} color={cat.color} />
          <span style={{fontSize:11,color:C.sub}}>{new Date(tx.created_at).toLocaleDateString('en-PK',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
          {tx.channel && tx.channel !== 'internal' && <Tag label={tx.channel.toUpperCase()} color={C.c1} />}
        </div>
      </div>
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontWeight:800,fontSize:13,color:tx.type==='credit'?C.g1:C.r1}}>
          {tx.type==='credit'?'+':'-'}Rs.{tx.amount.toLocaleString()}
        </div>
        <div style={{fontSize:10,color:tx.status==='completed'?C.g1:C.a1,marginTop:1}}>
          {tx.status==='completed'?'✓ Done':'⏳ Pending'}
        </div>
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode,  setMode]  = useState(null); // null | 'student' | 'parent'
  const [tab,   setTab]   = useState('login');
  const [form,  setForm]  = useState({});
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      if (tab === 'login') {
        const d = await api.post('/auth/login', { phone: form.phone, pin: form.pin });
        api.save(d.token); onLogin(d.user);
      } else {
        if (form.pin !== form.pin2) throw new Error('PINs do not match');
        if (!/^\d{4}$/.test(form.pin)) throw new Error('PIN must be exactly 4 digits');
        const body = { name:form.name, phone:form.phone, cnic:form.cnic, pin:form.pin, role:mode,
          university:form.university, degree:form.degree, parent_phone:form.parent_phone };
        const d = await api.post('/auth/register', body);
        api.save(d.token); onLogin(d.user);
      }
    } catch(e) { setError(e.message); }
    setBusy(false);
  };

  if (!mode) return (
    <div style={{minHeight:'100vh',background:`radial-gradient(ellipse 70% 60% at 30% 20%,rgba(91,79,232,.22) 0%,transparent 60%),${C.dark}`,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{maxWidth:460,width:'100%',textAlign:'center'}}>
        <div style={{width:90,height:90,borderRadius:28,background:`linear-gradient(135deg,${C.p1},${C.p2})`,margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:42,boxShadow:`0 16px 48px ${C.p1}55`}}>🎓</div>
        <div style={{fontWeight:900,fontSize:42,color:C.text,letterSpacing:-2,background:`linear-gradient(135deg,#F1F0FF,${C.p3})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>SkolarPay</div>
        <div style={{color:C.sub,fontSize:14,margin:'8px 0 36px',fontWeight:500}}>Pakistan's first student digital wallet<br/>with parental oversight</div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {[{m:'student',icon:'🎒',title:"I'm a Student",sub:'Manage wallet, budget, track spending',col:C.p1},{m:'parent',icon:'👨‍👩‍👦',title:"I'm a Parent",sub:'Monitor spending, set limits, send allowance',col:C.a1}].map(o=>(
            <div key={o.m} onClick={()=>setMode(o.m)}
              style={{...glass({padding:'20px 22px',cursor:'pointer',border:`1px solid ${o.col}30`}),display:'flex',alignItems:'center',gap:16,textAlign:'left',transition:'all .2s'}}>
              <div style={{width:52,height:52,borderRadius:16,background:`linear-gradient(135deg,${o.col},${o.col}cc)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,boxShadow:`0 6px 20px ${o.col}44`,flexShrink:0}}>{o.icon}</div>
              <div style={{flex:1}}><div style={{fontWeight:800,fontSize:16,color:C.text}}>{o.title}</div><div style={{fontSize:12,color:C.sub,marginTop:3}}>{o.sub}</div></div>
              <span style={{color:o.col,fontSize:20}}>→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:`radial-gradient(ellipse 70% 60% at 30% 20%,rgba(91,79,232,.22) 0%,transparent 60%),${C.dark}`,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{maxWidth:420,width:'100%'}}>
        <button onClick={()=>setMode(null)} style={{...ghost(),width:'auto',padding:'8px 16px',fontSize:12,marginBottom:20}}>← Back</button>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontWeight:900,fontSize:24,color:C.text}}>{tab==='login'?'Welcome back':'Create account'}</div>
          <div style={{color:C.sub,fontSize:13,marginTop:4}}>{mode==='student'?'🎒 Student Account':'👨‍👩‍👦 Parent Account'}</div>
        </div>
        <Card style={{padding:28}}>
          <div style={{display:'flex',background:'rgba(255,255,255,0.05)',borderRadius:12,padding:4,marginBottom:22,gap:4}}>
            {['login','register'].map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{flex:1,padding:'9px 0',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all .2s',background:tab===t?`linear-gradient(135deg,${C.p1},${C.p2})`:'transparent',color:tab===t?'white':C.sub,fontFamily:'inherit'}}>
                {t==='login'?'Login':'Register'}
              </button>
            ))}
          </div>
          <ErrBox msg={error} onClose={()=>setError('')} />
          {tab==='register' && <>
            <Field label="Full Name" value={form.name||''} onChange={set('name')} placeholder="Ali Hassan" req />
            <Field label="CNIC" value={form.cnic||''} onChange={set('cnic')} placeholder="XXXXX-XXXXXXX-X" hint="13-digit national ID" req />
          </>}
          <Field label="Phone Number" value={form.phone||''} onChange={set('phone')} placeholder="03001234567" req />
          <Field label={tab==='login'?'PIN':'Set 4-digit PIN'} value={form.pin||''} onChange={set('pin')} placeholder="••••" type="password" req />
          {tab==='register' && <>
            <Field label="Confirm PIN" value={form.pin2||''} onChange={set('pin2')} placeholder="••••" type="password" req />
            {mode==='student' && <>
              <Field label="University (optional)" value={form.university||''} onChange={set('university')} placeholder="LUMS, FAST, NUST…" />
              <Field label="Degree (optional)" value={form.degree||''} onChange={set('degree')} placeholder="BS CS, BBA…" />
              <Field label="Parent's Phone (optional)" value={form.parent_phone||''} onChange={set('parent_phone')} placeholder="03001234567" hint="Links to parent account for oversight" />
            </>}
          </>}
          <div style={{marginTop:4}}><Btn label={tab==='login'?'Login →':'Create Account →'} onClick={submit} loading={busy} /></div>
        </Card>
      </div>
    </div>
  );
}

// ─── SIDEBAR LAYOUT ───────────────────────────────────────────
function Layout({ user, screen, setScreen, onLogout, children }) {
  const isParent = user?.role === 'parent';
  const nav = isParent
    ? [['p_dash','⊞','Overview'],['p_children','👦👧','My Children'],['p_send','💸','Send Money'],['p_reports','📊','Reports']]
    : [['dashboard','⊞','Home'],['wallet','💳','My Wallet'],['pay','⇄','Payments'],['budget','📅','Semester Plan'],['goals','🎯','Goals'],['analytics','◑','Analytics'],['reports','📊','Reports'],['profile','◉','Profile']];

  return (
    <div style={{display:'flex',minHeight:'100vh',background:C.dark,fontFamily:"'Plus Jakarta Sans','Inter',system-ui,sans-serif"}}>
      {/* Sidebar */}
      <div style={{width:224,flexShrink:0,background:'rgba(26,24,48,0.97)',backdropFilter:'blur(20px)',borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',padding:'20px 10px',gap:3,position:'sticky',top:0,height:'100vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 8px 18px',borderBottom:`1px solid ${C.border}`,marginBottom:8}}>
          <div style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${C.p1},${C.p2})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🎓</div>
          <div>
            <div style={{fontWeight:900,fontSize:15,color:C.text}}>SkolarPay</div>
            <div style={{fontSize:10,color:C.sub}}>{isParent?'Parent View':'Student Wallet'}</div>
          </div>
        </div>
        {nav.map(([id,icon,label])=>{
          const active = screen===id;
          return (
            <div key={id} onClick={()=>setScreen(id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,cursor:'pointer',transition:'all .2s',background:active?'rgba(91,79,232,0.18)':'transparent',border:active?`1px solid rgba(91,79,232,0.3)`:'1px solid transparent',marginBottom:1}}>
              <span style={{fontSize:16}}>{icon}</span>
              <span style={{fontWeight:active?700:500,fontSize:13,color:active?C.text:C.sub}}>{label}</span>
              {active&&<div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:C.p1}}/>}
            </div>
          );
        })}
        <div style={{marginTop:'auto',paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',marginBottom:6}}>
            <Avatar name={user?.name} size={32} />
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontWeight:700,fontSize:12,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name||'—'}</div>
              <div style={{fontSize:10,color:C.sub}}>{user?.role==='parent'?'Parent':user?.university||'Student'}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{...ghost(C.r1),padding:'9px 12px',fontSize:12}}>Logout 👋</button>
        </div>
      </div>
      {/* Main */}
      <div style={{flex:1,overflowY:'auto',overflowX:'hidden',
        background:`radial-gradient(ellipse 60% 40% at 20% 10%,rgba(91,79,232,.1) 0%,transparent 50%),radial-gradient(ellipse 40% 30% at 80% 80%,rgba(123,111,240,.07) 0%,transparent 50%),${C.dark}`}}>
        {children}
      </div>
    </div>
  );
}

// ─── STUDENT DASHBOARD (4.1) ──────────────────────────────────
function Dashboard({ user }) {
  const [bal,   setBal]   = useState(null);
  const [txns,  setTxns]  = useState([]);
  const [plan,  setPlan]  = useState(null);
  const [notifs,setNotifs]= useState([]);
  const [load,  setLoad]  = useState(true);
  const [showBal,setShowBal] = useState(true);

  const refresh = useCallback(async () => {
    setLoad(true);
    try {
      const [b, t, bu, n] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions?limit=5'),
        api.get('/budget/semester'),
        api.get('/notifications'),
      ]);
      setBal(b); setTxns(t.transactions);
      setPlan(bu.active); setNotifs(n.notifications?.filter(x=>!x.read)||[]);
    } catch {}
    setLoad(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (load) return <Spinner />;

  const limitPct = bal?.monthly_limit ? Math.min(100,(bal.monthly_spent||0)/bal.monthly_limit*100) : 0;

  return (
    <div style={{padding:'28px 32px',maxWidth:1100}}>
      {/* Greeting */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28}}>
        <div>
          <div style={{color:C.sub,fontSize:13}}>{new Date().toLocaleDateString('en-PK',{weekday:'long',month:'long',day:'numeric'})}</div>
          <div style={{fontWeight:900,fontSize:28,color:C.text,marginTop:4,letterSpacing:-.8}}>
            Asalam o Alaikum, {user.name?.split(' ')[0]} 👋
          </div>
          <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
            <Tag label="🎒 Student" color={C.p1} />
            {user.university && <Tag label={user.university} color={C.c1} />}
            {user.degree     && <Tag label={user.degree}     color={C.p2} />}
          </div>
        </div>
        {notifs.length > 0 && (
          <div style={{...glass({padding:'12px 16px'}),borderColor:`${C.a1}30`,background:`${C.a1}08`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.a1}}>🔔 {notifs.length} new alert{notifs.length>1?'s':''}</div>
            <div style={{fontSize:11,color:C.sub,marginTop:2}}>{notifs[0]?.title}</div>
          </div>
        )}
      </div>

      {/* Balance Hero */}
      <Card style={{marginBottom:20,background:'linear-gradient(135deg,rgba(91,79,232,.2),rgba(123,111,240,.12))',border:`1px solid rgba(91,79,232,.25)`,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,borderRadius:'50%',background:'rgba(91,79,232,.1)',pointerEvents:'none'}}/>
        <div style={{position:'relative'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
            <div>
              <div style={{color:C.sub,fontSize:13}}>Student Wallet Balance</div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                <div style={{fontWeight:900,fontSize:40,color:C.text,letterSpacing:-1.5}}>
                  {showBal ? `Rs. ${(bal?.balance||0).toLocaleString()}` : 'Rs. ●●●●●'}
                </div>
                <span onClick={()=>setShowBal(!showBal)} style={{fontSize:18,cursor:'pointer',opacity:.6}}>{showBal?'👁️':'🙈'}</span>
              </div>
              <div style={{color:C.sub,fontSize:12,marginTop:4}}>Account: <span style={{color:C.p3}}>{user.account_number}</span></div>
            </div>
            <div style={{minWidth:240}}>
              {bal?.monthly_limit ? (
                <>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:12,color:C.sub}}>Monthly Limit (Parent)</span>
                    <span style={{fontSize:12,fontWeight:800,color:limitPct>=80?C.r1:C.g1}}>
                      Rs.{(bal.monthly_spent||0).toLocaleString()} / Rs.{bal.monthly_limit.toLocaleString()}
                    </span>
                  </div>
                  <ProgBar pct={limitPct} />
                  <div style={{fontSize:11,color:C.sub,marginTop:4}}>{Math.round(limitPct)}% used this month</div>
                </>
              ) : (
                <div style={{...glass({padding:'12px 14px'}),fontSize:12,color:C.sub}}>
                  No monthly limit set by parent
                </div>
              )}
            </div>
          </div>
          {/* Mini stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:20}}>
            {[
              {label:'Received',value:`Rs.${(bal?.monthly_received||0).toLocaleString()}`,color:C.g1},
              {label:'Spent',   value:`Rs.${(bal?.monthly_spent||0).toLocaleString()}`,   color:C.r1},
              {label:'Net',     value:`Rs.${Math.max(0,(bal?.monthly_received||0)-(bal?.monthly_spent||0)).toLocaleString()}`,color:C.c1},
            ].map(s=>(
              <div key={s.label} style={{...glass({padding:'12px 14px',borderRadius:14})}}>
                <div style={{fontWeight:800,fontSize:16,color:s.color}}>{s.value}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>{s.label} this month</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Semester Plan Widget */}
      {plan && (
        <Card style={{marginBottom:20,border:`1px solid ${C.p1}25`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:C.text}}>📅 {plan.name}</div>
              <div style={{fontSize:12,color:C.sub,marginTop:2}}>Semester Budget Planner</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:900,fontSize:18,color:plan.on_track?C.g1:C.r1}}>
                Rs.{Math.round(plan.remaining).toLocaleString()}
              </div>
              <div style={{fontSize:11,color:C.sub}}>remaining</div>
            </div>
          </div>
          <ProgBar pct={((plan.total_spent||0)/plan.total_allowance)*100} />
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:14}}>
            {[
              {label:'Total',      value:`Rs.${plan.total_allowance.toLocaleString()}`},
              {label:'Spent',      value:`Rs.${Math.round(plan.total_spent||0).toLocaleString()}`},
              {label:'Monthly Lim',value:`Rs.${Math.round(plan.monthly_limit).toLocaleString()}`},
              {label:'Days Left',  value:plan.days_left},
            ].map(s=>(
              <div key={s.label} style={{textAlign:'center'}}>
                <div style={{fontWeight:800,fontSize:14,color:C.p3}}>{s.value}</div>
                <div style={{fontSize:10,color:C.sub,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
          {!plan.on_track && (
            <div style={{...glass({padding:'10px 14px',marginTop:12,borderRadius:12}),border:`1px solid ${C.r1}30`,background:`${C.r1}08`,fontSize:12,color:C.r1}}>
              ⚠️ You are spending faster than your semester budget allows. Slow down!
            </div>
          )}
        </Card>
      )}

      {/* Parent watching notice */}
      {user.parent_id && (
        <div style={{...glass({padding:'12px 16px',marginBottom:16}),border:`1px solid ${C.a1}30`,background:`${C.a1}08`}}>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <span style={{fontSize:18}}>👁️</span>
            <div>
              <div style={{fontWeight:700,fontSize:12,color:C.a1}}>Parent oversight active</div>
              <div style={{fontSize:11,color:C.sub}}>Your parent monitors all your transactions in real time.</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:16,color:C.text}}>Recent Transactions</div>
          <button onClick={refresh} style={{...ghost(),width:'auto',padding:'7px 14px',fontSize:12}}>↻ Refresh</button>
        </div>
        {txns.length === 0
          ? <div style={{textAlign:'center',padding:'32px 0',color:C.sub,fontSize:13}}>No transactions yet. Add money to get started!</div>
          : txns.map(tx=><TxRow key={tx.id} tx={tx}/>)
        }
      </Card>
    </div>
  );
}

// ─── WALLET SCREEN (4.1) ──────────────────────────────────────
function WalletScreen() {
  const [txns, setTxns] = useState([]);
  const [bal,  setBal]  = useState(null);
  const [page, setPage] = useState(1);
  const [total,setTotal]= useState(0);
  const [cat,  setCat]  = useState('');
  const [load, setLoad] = useState(true);

  const load_ = useCallback(async (p=1,c='') => {
    setLoad(true);
    try {
      const [b,t] = await Promise.all([
        api.get('/wallet/balance'),
        api.get(`/wallet/transactions?page=${p}&limit=15${c?`&category=${c}`:''}`),
      ]);
      setBal(b); setTxns(t.transactions); setTotal(t.pagination.total); setPage(p);
    } catch {}
    setLoad(false);
  }, []);

  useEffect(() => { load_(1,cat); }, [cat]);

  const catBtns = ['',...Object.keys(CATS)];

  return (
    <div style={{padding:'28px 32px',maxWidth:1000}}>
      <div style={{fontWeight:900,fontSize:26,color:C.text,marginBottom:6,letterSpacing:-.5}}>💳 My Wallet</div>
      <div style={{color:C.sub,fontSize:13,marginBottom:24}}>View balance, transaction history and spending</div>

      {/* Balance card */}
      {bal && (
        <Card style={{marginBottom:20,background:'linear-gradient(135deg,rgba(91,79,232,.18),rgba(6,182,212,.1))',border:`1px solid rgba(91,79,232,.2)`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{color:C.sub,fontSize:13}}>Available Balance</div>
              <div style={{fontWeight:900,fontSize:36,color:C.text,letterSpacing:-1.5,marginTop:4}}>Rs. {bal.balance.toLocaleString()}</div>
              <div style={{color:C.sub,fontSize:12,marginTop:4}}>{bal.account_number}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[{label:'Received',val:bal.monthly_received,col:C.g1},{label:'Spent',val:bal.monthly_spent,col:C.r1}].map(s=>(
                <div key={s.label} style={{...glass({padding:'11px 14px',borderRadius:14,textAlign:'center'})}}>
                  <div style={{fontWeight:800,fontSize:15,color:s.col}}>Rs.{(s.val||0).toLocaleString()}</div>
                  <div style={{fontSize:10,color:C.sub,marginTop:2}}>{s.label} this month</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Category filter */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        {catBtns.slice(0,8).map(c=>(
          <button key={c||'all'} onClick={()=>setCat(c)}
            style={{...(cat===c?btn(c?CATS[c]?.color||C.p1:C.p1):ghost(c?CATS[c]?.color||C.p1:C.p1)),width:'auto',padding:'8px 14px',fontSize:12,borderRadius:10}}>
            {c ? `${CATS[c]?.emoji} ${CATS[c]?.label}` : 'All'}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <Card>
        <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:16}}>
          Transaction History {total > 0 && <span style={{color:C.sub,fontWeight:500,fontSize:13}}>({total} total)</span>}
        </div>
        {load ? <Spinner /> : txns.length === 0
          ? <div style={{textAlign:'center',padding:'32px 0',color:C.sub}}>No transactions found</div>
          : <>
              {txns.map(tx=><TxRow key={tx.id} tx={tx}/>)}
              <div style={{display:'flex',gap:10,marginTop:16,justifyContent:'center'}}>
                <Btn label="← Prev" ghost onClick={()=>load_(page-1,cat)} style={{width:'auto',padding:'8px 16px',fontSize:13}} />
                <span style={{color:C.sub,fontSize:13,padding:'8px 0'}}>Page {page} of {Math.ceil(total/15)||1}</span>
                <Btn label="Next →" ghost onClick={()=>load_(page+1,cat)} style={{width:'auto',padding:'8px 16px',fontSize:13}} />
              </div>
            </>
        }
      </Card>
    </div>
  );
}

// ─── PAYMENTS SCREEN (4.1 transfers + bills + topup) ─────────
function PayScreen() {
  const [tab, setTab]   = useState('send');
  const [form, setForm] = useState({});
  const [err,  setErr]  = useState('');
  const [ok,   setOk]   = useState('');
  const [busy, setBusy] = useState(false);
  const [selB, setSelB] = useState(null);
  const [selW, setSelW] = useState(null);
  const [selBill, setSelBill] = useState(null);
  const [selNet,  setSelNet]  = useState(null);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const go = async (endpoint, body, msg) => {
    setErr(''); setOk(''); setBusy(true);
    try { await api.post(endpoint, body); setOk(msg); setForm({}); }
    catch(e) { setErr(e.message); }
    setBusy(false);
  };

  const BANKS = [{code:'HBL',name:'HBL',emoji:'🏦',color:'#006633'},{code:'UBL',name:'UBL',emoji:'🏛️',color:'#CC0000'},{code:'MEEZAN',name:'Meezan',emoji:'🕌',color:'#007A3D'},{code:'MCB',name:'MCB',emoji:'🏢',color:'#CC0000'},{code:'ALLIED',name:'Allied',emoji:'🏗️',color:'#003087'},{code:'FAYSAL',name:'Faysal',emoji:'🏪',color:'#8B0000'},{code:'NBP',name:'NBP',emoji:'🏛️',color:'#00529B'},{code:'ASKARI',name:'Askari',emoji:'⭐',color:'#006400'}];
  const WALLETS = [{id:'easypaisa',name:'Easypaisa',emoji:'💚',color:'#00A651'},{id:'jazzcash',name:'JazzCash',emoji:'🔴',color:'#E8000D'},{id:'nayapay',name:'NayaPay',emoji:'🟣',color:'#6C2BD9'},{id:'sadapay',name:'SadaPay',emoji:'⚫',color:'#1A1A1A'}];
  const BILLS = [{type:'electricity',label:'Electricity',emoji:'⚡',cos:['LESCO','HESCO','IESCO','MEPCO']},{type:'gas',label:'Gas',emoji:'🔥',cos:['SSGC','SNGPL']},{type:'internet',label:'Internet',emoji:'🌐',cos:['PTCL','StormFiber','Nayatel']},{type:'water',label:'Water',emoji:'💧',cos:['KWSB','WASA']},{type:'tuition',label:'Tuition Fee',emoji:'🎓',cos:['University Portal']},{type:'cable',label:'Cable TV',emoji:'📺',cos:['PTCL']}];
  const NETS = [{id:'jazz',emoji:'🔴',name:'Jazz'},{id:'telenor',emoji:'🔵',name:'Telenor'},{id:'zong',emoji:'🟣',name:'Zong'},{id:'ufone',emoji:'🟢',name:'Ufone'},{id:'ptcl',emoji:'🏢',name:'PTCL'},{id:'sco',emoji:'📡',name:'SCO'}];
  const TABS = [{id:'send',icon:'📤',label:'Send'},{id:'bank',icon:'🏦',label:'Bank/IBFT'},{id:'wallets',icon:'📲',label:'Wallets'},{id:'bills',icon:'🧾',label:'Bills'},{id:'topup',icon:'📱',label:'Topup'}];

  const resetTab = (id) => { setTab(id); setSelB(null); setSelW(null); setSelBill(null); setSelNet(null); setErr(''); setOk(''); setForm({}); };

  return (
    <div style={{padding:'28px 32px',maxWidth:960}}>
      <div style={{fontWeight:900,fontSize:26,color:C.text,marginBottom:6,letterSpacing:-.5}}>⇄ Payments & Transfers</div>
      <div style={{color:C.sub,fontSize:13,marginBottom:22}}>Send money, pay bills, mobile recharge</div>
      <div style={{display:'flex',gap:6,marginBottom:24,flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>resetTab(t.id)}
            style={{...(tab===t.id?btn():ghost()),width:'auto',padding:'10px 18px',fontSize:13,borderRadius:12,display:'flex',alignItems:'center',gap:6}}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <ErrBox msg={err} onClose={()=>setErr('')} /><OkBox msg={ok} />

      {/* SEND */}
      {tab==='send' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <Card>
            <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:16}}>📤 Send to SkolarPay User</div>
            <Field label="Receiver Phone" value={form.phone||''} onChange={set('phone')} placeholder="03001234567" req />
            <Field label="Amount (Rs.)" value={form.amount||''} onChange={set('amount')} placeholder="0" type="number" req />
            <Field label="Note (optional)" value={form.note||''} onChange={set('note')} placeholder="For lunch, books…" />
            <Field label="Confirm PIN" value={form.pin||''} onChange={set('pin')} placeholder="••••" type="password" req />
            <Btn label="Send Money →" loading={busy} onClick={()=>go('/transfer/internal',{to_phone:form.phone,amount:parseFloat(form.amount),pin:form.pin,note:form.note},`Rs.${form.amount} sent!`)} />
          </Card>
          <Card>
            <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:16}}>📥 Request Money</div>
            <Field label="Request From (Phone)" value={form.rphone||''} onChange={set('rphone')} placeholder="03001234567" />
            <Field label="Amount (Rs.)" value={form.ramount||''} onChange={set('ramount')} placeholder="0" type="number" />
            <Field label="Reason" value={form.rnote||''} onChange={set('rnote')} placeholder="Lunch split…" />
            <Btn label="Send Request 📨" ghost onClick={()=>setOk('Request sent! (Feature activates with real backend)')} />
          </Card>
        </div>
      )}

      {/* BANK */}
      {tab==='bank' && !selB && (
        <div>
          <div style={{...glass({padding:'11px 16px',borderRadius:14,marginBottom:18}),border:`1px solid ${C.c1}25`,background:`${C.c1}07`,fontSize:12,color:C.c1}}>
            ℹ️ IBFT — Free transfers to any Pakistani bank. Arrives within 2 hours. Limit: Rs.25,000/day (SBP).
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {BANKS.map(b=>(
              <div key={b.code} onClick={()=>setSelB(b)}
                style={{...glass({padding:'16px 10px',cursor:'pointer',textAlign:'center',transition:'all .2s'})}}>
                <div style={{width:46,height:46,borderRadius:14,margin:'0 auto 10px',background:`${b.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{b.emoji}</div>
                <div style={{fontWeight:700,fontSize:12,color:C.text}}>{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab==='bank' && selB && (
        <Card>
          <button onClick={()=>setSelB(null)} style={{...ghost(),width:'auto',padding:'8px 14px',fontSize:12,marginBottom:20}}>← Back</button>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22}}>
            <div style={{width:50,height:50,borderRadius:16,background:`${selB.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{selB.emoji}</div>
            <div><div style={{fontWeight:800,fontSize:17,color:C.text}}>{selB.name} Transfer</div><div style={{fontSize:12,color:C.g1}}>✓ IBFT · Free · ~2 hrs</div></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Account Title" value={form.title||''} onChange={set('title')} placeholder="Full name" req />
            <Field label="IBAN" value={form.iban||''} onChange={set('iban')} placeholder="PK36SCBL0000001123456702" hint="24-char PK IBAN" req />
            <Field label="Amount (Rs.)" value={form.amount||''} onChange={set('amount')} placeholder="0" type="number" req />
            <Field label="Purpose" value={form.purpose||''} onChange={set('purpose')} placeholder="Tuition, Rent…" />
            <div style={{gridColumn:'1/-1'}}><Field label="Confirm PIN" value={form.pin||''} onChange={set('pin')} placeholder="••••" type="password" req /></div>
          </div>
          <div style={{marginTop:8}}>
            <Btn label={`Transfer to ${selB.name} →`} loading={busy}
              onClick={()=>go('/transfer/ibft',{bank_code:selB.code,iban:form.iban,account_title:form.title,amount:parseFloat(form.amount),pin:form.pin,purpose:form.purpose},`Transfer to ${selB.name} initiated!`)} />
          </div>
        </Card>
      )}

      {/* WALLETS */}
      {tab==='wallets' && !selW && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
          {WALLETS.map(w=>(
            <div key={w.id} onClick={()=>setSelW(w)}
              style={{...glass({padding:'18px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s'})}}>
              <div style={{width:50,height:50,borderRadius:16,flexShrink:0,background:w.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,boxShadow:`0 6px 18px ${w.color}44`}}>{w.emoji}</div>
              <div><div style={{fontWeight:800,fontSize:15,color:C.text}}>{w.name}</div><div style={{fontSize:11,color:C.g1,marginTop:3}}>✓ Instant · Free</div></div>
            </div>
          ))}
        </div>
      )}
      {tab==='wallets' && selW && (
        <Card>
          <button onClick={()=>setSelW(null)} style={{...ghost(),width:'auto',padding:'8px 14px',fontSize:12,marginBottom:20}}>← Back</button>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:22}}>
            <div style={{width:54,height:54,borderRadius:18,background:selW.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,boxShadow:`0 8px 24px ${selW.color}44`}}>{selW.emoji}</div>
            <div><div style={{fontWeight:900,fontSize:18,color:C.text}}>Send to {selW.name}</div><div style={{fontSize:12,color:C.g1}}>✓ Instant · Free</div></div>
          </div>
          <Field label={`${selW.name} Phone`} value={form.phone||''} onChange={set('phone')} placeholder="03001234567" req />
          <Field label="Amount (Rs.)" value={form.amount||''} onChange={set('amount')} placeholder="0" type="number" req />
          <Field label="Confirm PIN" value={form.pin||''} onChange={set('pin')} placeholder="••••" type="password" req />
          <Btn label={`Send via ${selW.name} →`} loading={busy}
            onClick={()=>go(`/transfer/${selW.id}`,{mobile_number:form.phone,amount:parseFloat(form.amount),pin:form.pin},`Sent to ${selW.name}!`)} />
        </Card>
      )}

      {/* BILLS */}
      {tab==='bills' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div>
            <div style={{color:C.sub,fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:12}}>Select Bill Type</div>
            {BILLS.map((b,i)=>(
              <div key={i} onClick={()=>setSelBill(b)}
                style={{...glass({padding:'13px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,marginBottom:8,transition:'all .2s',border:selBill?.type===b.type?`1px solid ${C.p1}`:`1px solid ${C.border}`})}>
                <div style={{width:40,height:40,borderRadius:12,background:'rgba(91,79,232,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{b.emoji}</div>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.text}}>{b.label}</div><div style={{fontSize:11,color:C.sub}}>{b.cos.join(' · ')}</div></div>
                {selBill?.type===b.type && <span style={{color:C.p1}}>✓</span>}
              </div>
            ))}
          </div>
          {selBill ? (
            <Card>
              <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:18}}>{selBill.emoji} Pay {selBill.label}</div>
              <div style={{marginBottom:12}}>
                <label style={labelS}>Utility Company</label>
                <select style={{...inputS,appearance:'none'}} onChange={set('company')}>
                  {selBill.cos.map(c=><option key={c} value={c} style={{background:C.mid}}>{c}</option>)}
                </select>
              </div>
              <Field label="Reference / Consumer #" value={form.ref||''} onChange={set('ref')} placeholder="1234567890" req />
              <Field label="Amount (Rs.)" value={form.amount||''} onChange={set('amount')} placeholder="0" type="number" req />
              <Field label="Confirm PIN" value={form.pin||''} onChange={set('pin')} placeholder="••••" type="password" req />
              <Btn label={`Pay ${selBill.label} →`} loading={busy}
                onClick={()=>go('/bills/pay',{bill_type:selBill.type,reference_number:form.ref,amount:parseFloat(form.amount),pin:form.pin,utility_company:form.company||selBill.cos[0]},`${selBill.label} paid!`)} />
            </Card>
          ) : <div style={{display:'flex',alignItems:'center',justifyContent:'center',color:C.sub,fontSize:13}}>← Select a bill type</div>}
        </div>
      )}

      {/* TOPUP */}
      {tab==='topup' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <Card>
            <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:18}}>📱 Mobile Recharge</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:18}}>
              {NETS.map(n=>(
                <div key={n.id} onClick={()=>setSelNet(n)}
                  style={{...glass({padding:'12px 8px',textAlign:'center',cursor:'pointer',transition:'all .2s',border:selNet?.id===n.id?`1px solid ${C.p1}`:`1px solid ${C.border}`})}>
                  <div style={{fontSize:20,marginBottom:4}}>{n.emoji}</div>
                  <div style={{fontSize:11,fontWeight:700,color:C.text}}>{n.name}</div>
                </div>
              ))}
            </div>
            <Field label="Mobile Number" value={form.mobile||''} onChange={set('mobile')} placeholder="03001234567" req />
            <div style={{marginBottom:12}}>
              <label style={labelS}>Quick Amount</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {['100','200','500','1000'].map(a=>(
                  <button key={a} onClick={()=>setForm(f=>({...f,amount:a}))}
                    style={{...ghost(C.p1),padding:'10px 0',fontSize:13,borderRadius:10,background:form.amount===a?`${C.p1}20`:'rgba(255,255,255,0.06)',borderColor:form.amount===a?C.p1:C.border,color:form.amount===a?C.p3:C.sub}}>{a}</button>
                ))}
              </div>
            </div>
            <Field label="Custom Amount" value={form.amount||''} onChange={set('amount')} placeholder="0" type="number" />
            <Field label="Confirm PIN" value={form.pin||''} onChange={set('pin')} placeholder="••••" type="password" req />
            <Btn label="Recharge Now →" loading={busy}
              onClick={()=>{if(!selNet)return setErr('Select a network');go('/topup/recharge',{mobile_number:form.mobile,network:selNet.id,amount:parseFloat(form.amount),pin:form.pin},`Rs.${form.amount} recharged!`);}} />
          </Card>
          <Card>
            <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>🌐 Internet Packages</div>
            {[{l:'Daily 1GB',p:20,v:'1 Day'},{l:'Weekly 5GB',p:120,v:'7 Days',hot:true},{l:'Monthly 20GB',p:400,v:'30 Days'},{l:'Student Pack',p:250,v:'30 Days',hot:true,stu:true},{l:'Night Pack',p:60,v:'15 Days'}].map((pk,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',padding:'12px 0',borderBottom:i<4?`1px solid ${C.border}`:'none'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:700,fontSize:13,color:C.text}}>{pk.l}</span>
                    {pk.hot && <Tag label="Popular" color={C.p1} />}
                    {pk.stu && <Tag label="🎓" color={C.g1} />}
                  </div>
                  <div style={{fontSize:11,color:C.sub,marginTop:2}}>{pk.v}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontWeight:800,color:C.p3,fontSize:14}}>Rs.{pk.p}</span>
                  <button onClick={()=>setForm(f=>({...f,amount:String(pk.p)}))}
                    style={{...ghost(C.p1),width:30,height:30,borderRadius:8,padding:0,fontSize:16}}>+</button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── SEMESTER BUDGET PLANNER (4.4) ────────────────────────────
function BudgetScreen() {
  const [data,  setData]  = useState(null);
  const [load,  setLoad]  = useState(true);
  const [form,  setForm]  = useState({});
  const [err,   setErr]   = useState('');
  const [ok,    setOk]    = useState('');
  const [busy,  setBusy]  = useState(false);
  const [show,  setShow]  = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const load_ = useCallback(async () => {
    setLoad(true);
    try { const d = await api.get('/budget/semester'); setData(d); }
    catch {}
    setLoad(false);
  }, []);
  useEffect(() => { load_(); }, [load_]);

  const create = async () => {
    setErr(''); setBusy(true);
    try {
      await api.post('/budget/semester', { name:form.name, total_allowance:parseFloat(form.allowance), start_date:form.start, end_date:form.end });
      setOk('Semester plan created!'); setShow(false); setForm({}); load_();
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  if (load) return <Spinner />;
  const active = data?.active;

  return (
    <div style={{padding:'28px 32px',maxWidth:900}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <div style={{fontWeight:900,fontSize:26,color:C.text,letterSpacing:-.5}}>📅 Semester Budget Planner</div>
          <div style={{color:C.sub,fontSize:13,marginTop:4}}>Plan your semester finances, track spending trends</div>
        </div>
        <Btn label="+ New Plan" onClick={()=>setShow(!show)} style={{width:'auto',padding:'11px 20px'}} />
      </div>

      <ErrBox msg={err} onClose={()=>setErr('')} /><OkBox msg={ok} />

      {show && (
        <Card style={{marginBottom:20,border:`1px solid ${C.p1}30`}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:18}}>Create Semester Plan</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Semester Name" value={form.name||''} onChange={set('name')} placeholder="Fall 2025 / Spring 2026" req />
            <Field label="Total Allowance (Rs.)" value={form.allowance||''} onChange={set('allowance')} placeholder="120000" type="number" req />
            <Field label="Start Date" value={form.start||''} onChange={set('start')} type="date" req />
            <Field label="End Date" value={form.end||''} onChange={set('end')} type="date" req />
          </div>
          {form.allowance && form.start && form.end && (() => {
            const days = Math.ceil((new Date(form.end)-new Date(form.start))/86400000);
            const mo   = Math.round(parseFloat(form.allowance)/(days/30));
            const wk   = Math.round(parseFloat(form.allowance)/(days/7));
            return days > 0 ? (
              <div style={{...glass({padding:'14px',marginBottom:14,borderRadius:14}),border:`1px solid ${C.g1}25`,background:`${C.g1}07`}}>
                <div style={{fontWeight:700,fontSize:13,color:C.g1,marginBottom:10}}>📊 Calculated Limits</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                  {[{l:'Duration',v:`${days} days`},{l:'Monthly Limit',v:`Rs.${mo.toLocaleString()}`},{l:'Weekly Limit',v:`Rs.${wk.toLocaleString()}`}].map(s=>(
                    <div key={s.l} style={{textAlign:'center'}}><div style={{fontWeight:800,fontSize:15,color:C.p3}}>{s.v}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{s.l}</div></div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
          <div style={{display:'flex',gap:10}}>
            <Btn label="Create Plan" loading={busy} onClick={create} />
            <Btn label="Cancel" ghost onClick={()=>setShow(false)} />
          </div>
        </Card>
      )}

      {active ? (
        <>
          <Card style={{marginBottom:20,background:'linear-gradient(135deg,rgba(91,79,232,.18),rgba(123,111,240,.1))',border:`1px solid ${C.p1}25`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div>
                <div style={{fontWeight:900,fontSize:20,color:C.text}}>📅 {active.name}</div>
                <div style={{color:C.sub,fontSize:12,marginTop:4}}>
                  {new Date(active.start_date).toLocaleDateString('en-PK',{month:'short',day:'numeric'})} → {new Date(active.end_date).toLocaleDateString('en-PK',{month:'short',day:'numeric',year:'numeric'})}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:900,fontSize:28,color:active.on_track?C.g1:C.r1}}>Rs.{Math.round(active.remaining).toLocaleString()}</div>
                <div style={{fontSize:12,color:C.sub}}>remaining</div>
              </div>
            </div>
            <ProgBar pct={((active.total_spent||0)/active.total_allowance)*100} />
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginTop:18}}>
              {[
                {l:'Total Allowance',  v:`Rs.${active.total_allowance.toLocaleString()}`},
                {l:'Total Spent',      v:`Rs.${Math.round(active.total_spent||0).toLocaleString()}`},
                {l:'Monthly Limit',    v:`Rs.${Math.round(active.monthly_limit).toLocaleString()}`},
                {l:'Weekly Limit',     v:`Rs.${Math.round(active.weekly_limit).toLocaleString()}`},
                {l:'Days Left',        v:`${active.days_left} days`},
              ].map(s=>(
                <div key={s.l} style={{...glass({padding:'12px 10px',borderRadius:14,textAlign:'center'})}}>
                  <div style={{fontWeight:800,fontSize:14,color:C.p3}}>{s.v}</div>
                  <div style={{fontSize:10,color:C.sub,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            {!active.on_track && (
              <div style={{marginTop:14,...glass({padding:'12px 14px',borderRadius:12}),border:`1px solid ${C.r1}30`,background:`${C.r1}08`}}>
                <div style={{fontWeight:700,fontSize:13,color:C.r1}}>⚠️ Spending Warning!</div>
                <div style={{fontSize:12,color:C.sub,marginTop:3}}>
                  You have spent Rs.{Math.round((active.total_spent||0)-active.expected_spent).toLocaleString()} more than expected at this point in the semester. Reduce spending this week.
                </div>
              </div>
            )}
          </Card>

          {/* Past plans */}
          {data?.plans?.filter(p=>!p.is_active).length > 0 && (
            <Card>
              <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>Past Semester Plans</div>
              {data.plans.filter(p=>!p.is_active).map((p,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontWeight:600,fontSize:13,color:C.text}}>{p.name}</span>
                  <span style={{fontSize:12,color:C.sub}}>Rs.{p.total_allowance.toLocaleString()}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      ) : (
        <Card style={{textAlign:'center',padding:'48px 32px'}}>
          <div style={{fontSize:48,marginBottom:12}}>📅</div>
          <div style={{fontWeight:700,fontSize:18,color:C.text}}>No semester plan yet</div>
          <div style={{color:C.sub,fontSize:13,marginTop:6}}>Create your first semester budget plan to track spending limits</div>
        </Card>
      )}
    </div>
  );
}

// ─── SAVINGS GOALS (4.5) ──────────────────────────────────────
function GoalsScreen() {
  const [goals, setGoals] = useState([]);
  const [load,  setLoad]  = useState(true);
  const [show,  setShow]  = useState(false);
  const [form,  setForm]  = useState({});
  const [err,   setErr]   = useState('');
  const [ok,    setOk]    = useState('');
  const [busy,  setBusy]  = useState(false);
  const [ci,    setCi]    = useState(null); // contribute index
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const GOAL_CATS = [
    {id:'laptop',    label:'Laptop Purchase',    emoji:'💻'},
    {id:'course',    label:'Course Registration', emoji:'🎓'},
    {id:'books',     label:'Books & Supplies',   emoji:'📚'},
    {id:'trip',      label:'Educational Trip',   emoji:'✈️'},
    {id:'general',   label:'General Savings',    emoji:'💰'},
  ];

  const load_ = useCallback(async () => {
    setLoad(true);
    try { const d = await api.get('/savings/goals'); setGoals(d.goals); }
    catch {}
    setLoad(false);
  }, []);
  useEffect(()=>{load_();},[load_]);

  const create = async () => {
    setErr(''); setBusy(true);
    try {
      await api.post('/savings/goals',{name:form.name,target_amount:parseFloat(form.target),target_date:form.date,emoji:GOAL_CATS.find(g=>g.id===form.cat)?.emoji||'🎯',category:form.cat||'general'});
      setOk('Goal created!'); setShow(false); setForm({}); load_();
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  const contribute = async (goalId) => {
    setErr(''); setBusy(true);
    try {
      const d = await api.post('/savings/contribute',{goal_id:goalId,amount:parseFloat(form.cAmt),pin:form.cPin});
      setOk(d.message); setCi(null); setForm({}); load_();
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  if (load) return <Spinner />;
  const totalSaved  = goals.reduce((a,g)=>a+g.saved_amount,0);
  const totalTarget = goals.reduce((a,g)=>a+g.target_amount,0);

  return (
    <div style={{padding:'28px 32px',maxWidth:900}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <div style={{fontWeight:900,fontSize:26,color:C.text,letterSpacing:-.5}}>🎯 Savings Goals</div>
          <div style={{color:C.sub,fontSize:13,marginTop:4}}>{goals.length} goal{goals.length!==1?'s':''} · Rs.{totalSaved.toLocaleString()} saved of Rs.{totalTarget.toLocaleString()}</div>
        </div>
        <Btn label="+ New Goal" onClick={()=>setShow(!show)} style={{width:'auto',padding:'11px 20px'}} />
      </div>

      <ErrBox msg={err} onClose={()=>setErr('')} /><OkBox msg={ok} />

      {/* Goal categories quick-add */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {GOAL_CATS.map(gc=>(
          <button key={gc.id} onClick={()=>{setShow(true);setForm(f=>({...f,cat:gc.id,name:gc.label}));}}
            style={{...ghost(C.p1),width:'auto',padding:'8px 14px',fontSize:12,borderRadius:10,display:'flex',alignItems:'center',gap:5}}>
            {gc.emoji} {gc.label}
          </button>
        ))}
      </div>

      {show && (
        <Card style={{marginBottom:20,border:`1px solid ${C.p1}30`}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:16}}>Create Savings Goal</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div>
              <label style={labelS}>Category</label>
              <select style={{...inputS,appearance:'none'}} value={form.cat||''} onChange={set('cat')}>
                <option value="">Choose category…</option>
                {GOAL_CATS.map(gc=><option key={gc.id} value={gc.id} style={{background:C.mid}}>{gc.emoji} {gc.label}</option>)}
              </select>
            </div>
            <Field label="Goal Name" value={form.name||''} onChange={set('name')} placeholder="e.g. Dell Laptop" req />
            <Field label="Target Amount (Rs.)" value={form.target||''} onChange={set('target')} placeholder="0" type="number" req />
            <Field label="Target Date" value={form.date||''} onChange={set('date')} type="date" req />
          </div>
          <div style={{display:'flex',gap:10,marginTop:14}}>
            <Btn label="Create Goal" loading={busy} onClick={create} />
            <Btn label="Cancel" ghost onClick={()=>setShow(false)} />
          </div>
        </Card>
      )}

      {goals.length === 0 && !show ? (
        <Card style={{textAlign:'center',padding:'48px 32px'}}>
          <div style={{fontSize:48,marginBottom:12}}>🎯</div>
          <div style={{fontWeight:700,fontSize:18,color:C.text}}>No savings goals yet</div>
          <div style={{color:C.sub,fontSize:13,marginTop:6}}>Set a goal for laptop, courses, books or educational trips</div>
        </Card>
      ) : goals.map((g,i)=>{
        const pct = Math.min(100,Math.round((g.saved_amount/g.target_amount)*100));
        return (
          <Card key={g.id} style={{marginBottom:16,border:`1px solid ${g.completed?`${C.g1}25`:`${C.p1}18`}`}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
              <div style={{width:52,height:52,borderRadius:18,flexShrink:0,background:g.completed?`${C.g1}18`:`${C.p1}14`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{g.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:16,color:C.text}}>{g.name}</div>
                <div style={{display:'flex',gap:6,marginTop:4,alignItems:'center'}}>
                  <Tag label={GOAL_CATS.find(gc=>gc.id===g.category)?.label||g.category} color={C.p1} />
                  <span style={{fontSize:12,color:C.sub}}>Due: {new Date(g.target_date).toLocaleDateString('en-PK',{month:'short',year:'numeric'})}</span>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:900,fontSize:22,color:g.completed?C.g1:C.p1}}>{pct}%</div>
                {g.completed ? <Tag label="✅ Done!" color={C.g1} /> : <div style={{fontSize:11,color:C.sub}}>Rs.{(g.target_amount-g.saved_amount).toLocaleString()} left</div>}
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:700,color:C.p1}}>Rs.{g.saved_amount.toLocaleString()} saved</span>
              <span style={{fontSize:13,fontWeight:800,color:C.text}}>of Rs.{g.target_amount.toLocaleString()}</span>
            </div>
            <ProgBar pct={pct} color={g.completed?C.g1:C.p1} h={10} />
            {!g.completed && (
              <div style={{marginTop:12}}>
                {ci===i ? (
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    <input style={{...inputS,width:130,padding:'9px 12px',fontSize:13}} placeholder="Amount" type="number" onChange={e=>setForm(f=>({...f,cAmt:e.target.value}))} />
                    <input style={{...inputS,width:110,padding:'9px 12px',fontSize:13}} placeholder="PIN" type="password" onChange={e=>setForm(f=>({...f,cPin:e.target.value}))} />
                    <button style={{...btn(),width:'auto',padding:'9px 18px',fontSize:13}} onClick={()=>contribute(g.id)} disabled={busy}>{busy?'…':'Save 💰'}</button>
                    <button style={{...ghost(),width:'auto',padding:'9px 12px',fontSize:13}} onClick={()=>setCi(null)}>✕</button>
                  </div>
                ) : (
                  <Btn label="+ Contribute" ghost style={{width:'auto',padding:'9px 18px',fontSize:12}} onClick={()=>setCi(i)} />
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── ANALYTICS SCREEN (4.3 expense categorization) ────────────
function AnalyticsScreen() {
  const [rep,  setRep]  = useState(null);
  const [load, setLoad] = useState(true);

  useEffect(()=>{
    api.get('/reports/spending').then(d=>setRep(d)).catch(()=>{}).finally(()=>setLoad(false));
  },[]);

  if (load) return <Spinner />;

  const bycat = rep?.by_category || {};
  const total = rep?.total_spent || 0;
  const trend = rep?.monthly_trend || [];

  const healthScore = Math.min(100,
    (rep?.semester?.remaining > 0 ? 25 : 10) +
    (rep?.savings?.total_saved > 0 ? 25 : 10) +
    (total > 0 && (bycat.food||0)/total < 0.35 ? 25 : 15) +
    20
  );

  const tips = [];
  if (total > 0) {
    if ((bycat.food||0)/total > 0.4) tips.push('🍔 Food is over 40% of spending. Try university canteen instead of restaurants.');
    if ((bycat.entertainment||0)/total > 0.15) tips.push('🎬 Entertainment is high. Set a weekly entertainment budget.');
    if ((bycat.shopping||0)/total > 0.2) tips.push('🛍️ Shopping seems high. Wait 24 hours before non-essential purchases.');
    if ((bycat.education||0) > 0) tips.push('📚 Great! You are investing in education. Keep it up.');
    if (rep?.savings?.total_saved > 0) tips.push(`💰 Good job saving Rs.${rep.savings.total_saved.toLocaleString()}! You are ${rep.savings.progress_pct}% toward your goals.`);
  }
  if (tips.length === 0) tips.push('🌟 Your spending looks balanced. Keep tracking to see trends!');

  return (
    <div style={{padding:'28px 32px',maxWidth:1000}}>
      <div style={{fontWeight:900,fontSize:26,color:C.text,marginBottom:6,letterSpacing:-.5}}>◑ Spending Analytics</div>
      <div style={{color:C.sub,fontSize:13,marginBottom:24}}>Expense categorization & spending insights</div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {icon:'💸',label:'Total Spent',   val:`Rs.${total.toLocaleString()}`,             col:C.r1},
          {icon:'📥',label:'Total Received',val:`Rs.${(rep?.savings?.total_saved||0+total).toLocaleString()}`,col:C.g1},
          {icon:'🎯',label:'Goals Progress',val:`${rep?.savings?.progress_pct||0}%`,         col:C.c1},
          {icon:'❤️',label:'Health Score',  val:`${healthScore}/100`,                        col:C.p1},
        ].map(s=>(
          <Card key={s.label} style={{padding:'16px 18px'}}>
            <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
            <div style={{fontWeight:900,fontSize:20,color:s.col}}>{s.val}</div>
            <div style={{fontSize:12,color:C.sub,marginTop:3}}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:20,marginBottom:20}}>
        <Card>
          <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:20}}>Spending by Category (4.3)</div>
          {Object.keys(bycat).length === 0
            ? <div style={{textAlign:'center',padding:'32px 0',color:C.sub}}>No spending data yet</div>
            : Object.entries(bycat).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{
                const c = CATS[cat]||CATS.other;
                const pct = total > 0 ? (amt/total*100) : 0;
                return (
                  <div key={cat} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,alignItems:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:16}}>{c.emoji}</span>
                        <span style={{fontWeight:700,fontSize:13,color:C.text}}>{c.label}</span>
                      </div>
                      <div style={{display:'flex',gap:8,alignItems:'baseline'}}>
                        <span style={{fontWeight:800,fontSize:13,color:c.color}}>Rs.{amt.toLocaleString()}</span>
                        <span style={{fontSize:11,color:C.sub}}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <ProgBar pct={pct} color={c.color} />
                  </div>
                );
              })
          }
        </Card>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Card style={{background:`${C.p1}0A`,border:`1px solid ${C.p1}20`}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <span style={{fontSize:20}}>🤖</span>
              <span style={{fontWeight:800,fontSize:14,color:C.p3}}>Smart Tips</span>
            </div>
            {tips.map((t,i)=>(
              <div key={i} style={{...glass({padding:'10px 12px',borderRadius:12,marginBottom:8}),fontSize:12,color:C.sub,lineHeight:1.6}}>{t}</div>
            ))}
          </Card>

          <Card>
            <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:14}}>❤️ Health Score</div>
            <div style={{textAlign:'center',marginBottom:12}}>
              <div style={{fontWeight:900,fontSize:44,color:C.p1}}>{healthScore}</div>
              <div style={{fontSize:13,color:C.sub}}>/100 · {healthScore>=80?'Excellent 🌟':healthScore>=65?'Good 👍':healthScore>=50?'Fair ⚠️':'Needs Work 📉'}</div>
              <div style={{marginTop:10}}><ProgBar pct={healthScore} /></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Monthly trend */}
      {trend.length > 0 && (
        <Card>
          <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:18}}>📈 Monthly Spending Trend (last 6 months)</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120}}>
            {trend.map((m,i)=>{
              const max = Math.max(...trend.map(x=>x.amount),1);
              const h   = Math.max(8,(m.amount/max)*100);
              return (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <div style={{fontSize:10,color:C.sub,fontWeight:600}}>Rs.{(m.amount/1000).toFixed(0)}k</div>
                  <div style={{width:'100%',borderRadius:'6px 6px 0 0',background:`linear-gradient(180deg,${C.p1},${C.p2})`,height:`${h}%`,minHeight:8,transition:'height 1s'}}/>
                  <div style={{fontSize:10,color:C.sub}}>{m.month}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── REPORTS SCREEN (4.6) ─────────────────────────────────────
function ReportsScreen() {
  const [rep,  setRep]  = useState(null);
  const [load, setLoad] = useState(true);
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  const load_ = useCallback(async () => {
    setLoad(true);
    try {
      const q = `${from?`&from=${from}`:''}${to?`&to=${to}`:''}`;
      const d = await api.get(`/reports/spending?${q}`);
      setRep(d);
    } catch {}
    setLoad(false);
  }, [from, to]);

  useEffect(()=>{load_();},[load_]);

  return (
    <div style={{padding:'28px 32px',maxWidth:1000}}>
      <div style={{fontWeight:900,fontSize:26,color:C.text,marginBottom:6,letterSpacing:-.5}}>📊 Spending Reports</div>
      <div style={{color:C.sub,fontSize:13,marginBottom:20}}>Monthly expenses, category breakdown, savings progress</div>

      {/* Date filter */}
      <Card style={{marginBottom:20,padding:'16px 20px'}}>
        <div style={{display:'flex',gap:14,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:160}}>
            <label style={labelS}>From Date</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inputS} />
          </div>
          <div style={{flex:1,minWidth:160}}>
            <label style={labelS}>To Date</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inputS} />
          </div>
          <Btn label="Generate Report" onClick={load_} style={{width:'auto',padding:'13px 22px'}} />
          <Btn label="This Month" ghost onClick={()=>{const n=new Date();setFrom(new Date(n.getFullYear(),n.getMonth(),1).toISOString().slice(0,10));setTo(n.toISOString().slice(0,10));}} style={{width:'auto',padding:'12px 16px',fontSize:12}} />
        </div>
      </Card>

      {load ? <Spinner /> : rep && (
        <>
          {/* Summary */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            {[
              {icon:'💸',l:'Total Spent',    v:`Rs.${(rep.total_spent||0).toLocaleString()}`,           col:C.r1},
              {icon:'📦',l:'Categories',     v:Object.keys(rep.by_category||{}).length,                 col:C.c1},
              {icon:'🎯',l:'Savings Saved',  v:`Rs.${(rep.savings?.total_saved||0).toLocaleString()}`,  col:C.g1},
              {icon:'📅',l:'Budget Used',    v:rep.semester?`${Math.round((rep.semester.total_spent/rep.semester.total_allowance)*100)}%`:'N/A', col:C.p1},
            ].map(s=>(
              <Card key={s.l} style={{padding:'16px 18px'}}>
                <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                <div style={{fontWeight:900,fontSize:20,color:s.col}}>{s.v}</div>
                <div style={{fontSize:12,color:C.sub,marginTop:3}}>{s.l}</div>
              </Card>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
            {/* Category breakdown */}
            <Card>
              <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:16}}>Category-wise Spending</div>
              {Object.keys(rep.by_category||{}).length === 0
                ? <div style={{color:C.sub,fontSize:13,textAlign:'center',padding:'20px 0'}}>No spending in this period</div>
                : Object.entries(rep.by_category).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{
                    const c   = CATS[cat]||CATS.other;
                    const pct = rep.total_spent > 0 ? (amt/rep.total_spent*100) : 0;
                    return (
                      <div key={cat} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${C.border}`,alignItems:'center'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:32,height:32,borderRadius:10,background:`${c.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{c.emoji}</div>
                          <span style={{fontWeight:600,fontSize:13,color:C.text}}>{c.label}</span>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontWeight:800,fontSize:13,color:c.color}}>Rs.{amt.toLocaleString()}</div>
                          <div style={{fontSize:11,color:C.sub}}>{pct.toFixed(0)}%</div>
                        </div>
                      </div>
                    );
                  })
              }
            </Card>

            {/* Savings & semester */}
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <Card>
                <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>💰 Savings Progress</div>
                {rep.savings?.goals?.length > 0
                  ? <>
                      <div style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                          <span style={{fontSize:12,color:C.sub}}>Overall Progress</span>
                          <span style={{fontSize:12,fontWeight:800,color:C.g1}}>{rep.savings.progress_pct}%</span>
                        </div>
                        <ProgBar pct={rep.savings.progress_pct} color={C.g1} />
                        <div style={{fontSize:11,color:C.sub,marginTop:4}}>Rs.{rep.savings.total_saved.toLocaleString()} of Rs.{rep.savings.total_target.toLocaleString()}</div>
                      </div>
                      {rep.savings.goals.slice(0,3).map(g=>(
                        <div key={g.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                          <span style={{fontSize:12,color:C.text,fontWeight:600}}>{g.emoji} {g.name}</span>
                          <span style={{fontSize:12,color:C.g1,fontWeight:700}}>{Math.round((g.saved_amount/g.target_amount)*100)}%</span>
                        </div>
                      ))}
                    </>
                  : <div style={{color:C.sub,fontSize:13,textAlign:'center',padding:'16px 0'}}>No savings goals set</div>
                }
              </Card>

              {rep.semester && (
                <Card style={{border:`1px solid ${C.p1}25`}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>📅 Semester Budget</div>
                  <div style={{fontWeight:800,fontSize:18,color:C.text,marginBottom:4}}>{rep.semester.name}</div>
                  <ProgBar pct={(rep.semester.total_spent/rep.semester.total_allowance)*100} />
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}>
                    {[{l:'Allowance',v:`Rs.${rep.semester.total_allowance.toLocaleString()}`},{l:'Spent',v:`Rs.${Math.round(rep.semester.total_spent).toLocaleString()}`},{l:'Remaining',v:`Rs.${Math.round(rep.semester.remaining).toLocaleString()}`},{l:'Monthly Limit',v:`Rs.${Math.round(rep.semester.monthly_limit).toLocaleString()}`}].map(s=>(
                      <div key={s.l} style={{...glass({padding:'10px 12px',borderRadius:12,textAlign:'center'})}}>
                        <div style={{fontWeight:800,fontSize:13,color:C.p3}}>{s.v}</div>
                        <div style={{fontSize:10,color:C.sub,marginTop:2}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Recent transactions in report */}
          {rep.transactions?.length > 0 && (
            <Card>
              <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>Recent Transactions in Period</div>
              {rep.transactions.slice(0,10).map(tx=><TxRow key={tx.id} tx={tx}/>)}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────
function ProfileScreen({ user }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    api.get('/notifications').then(d=>setNotifs(d.notifications||[])).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  const markRead = async()=>{ await api.patch('/notifications'); setNotifs(n=>n.map(x=>({...x,read:true}))); };

  return (
    <div style={{padding:'28px 32px',maxWidth:800}}>
      <div style={{fontWeight:900,fontSize:26,color:C.text,marginBottom:24,letterSpacing:-.5}}>◉ My Profile</div>
      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Card style={{textAlign:'center'}}>
            <div style={{width:72,height:72,borderRadius:'50%',margin:'0 auto 12px',background:`linear-gradient(135deg,${C.p1},${C.p2})`,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:28,boxShadow:`0 8px 24px ${C.p1}44`}}>
              {(user.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
            </div>
            <div style={{fontWeight:800,fontSize:18,color:C.text}}>{user.name}</div>
            <div style={{color:C.sub,fontSize:12,marginTop:2}}>{user.phone}</div>
            <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center',marginTop:10}}>
              <Tag label="🎒 Student" color={C.p1} />
              {user.university && <Tag label={user.university} color={C.c1} />}
              {user.degree     && <Tag label={user.degree}     color={C.p2} />}
            </div>
            <div style={{marginTop:12,fontSize:12,color:C.p3,fontWeight:700}}>{user.account_number}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
              {[['Balance',`Rs.${(user.balance||0).toLocaleString()}`],['KYC',user.kyc_verified?'✅':'⏳']].map(([l,v])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontWeight:800,fontSize:13,color:C.p1}}>{v}</div>
                  <div style={{fontSize:10,color:C.sub,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
          </Card>
          {user.parent_id && (
            <div style={{...glass({padding:16,border:`1px solid ${C.a1}25`,background:`${C.a1}07`})}}>
              <div style={{fontWeight:700,fontSize:12,color:C.a1}}>👁️ Linked to Parent</div>
              <div style={{fontSize:11,color:C.sub,marginTop:4}}>Your parent monitors all your transactions and has set spending limits.</div>
            </div>
          )}
        </div>
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontWeight:800,fontSize:15,color:C.text}}>
              🔔 Notifications
              {notifs.filter(n=>!n.read).length > 0 && (
                <span style={{marginLeft:8,background:C.r1,color:'white',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:20}}>{notifs.filter(n=>!n.read).length}</span>
              )}
            </div>
            {notifs.some(n=>!n.read) && <button onClick={markRead} style={{...ghost(),width:'auto',padding:'5px 12px',fontSize:11}}>Mark all read</button>}
          </div>
          {loading ? <Spinner /> : notifs.length === 0
            ? <div style={{color:C.sub,fontSize:13,textAlign:'center',padding:'24px 0'}}>No notifications yet</div>
            : notifs.slice(0,10).map(n=>(
              <div key={n.id} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:`1px solid ${C.border}`,opacity:n.read?.5:1}}>
                <div style={{width:36,height:36,borderRadius:11,flexShrink:0,background:'rgba(91,79,232,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>
                  {n.type==='tx'?'💸':n.type==='limit_warning'?'⚠️':'📱'}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:12,color:C.text}}>{n.title}</div>
                  <div style={{fontSize:11,color:C.sub,marginTop:2}}>{n.body}</div>
                  <div style={{fontSize:10,color:C.sub,marginTop:2}}>{new Date(n.created_at).toLocaleDateString('en-PK',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                {!n.read && <div style={{width:8,height:8,borderRadius:'50%',background:C.p1,flexShrink:0,marginTop:4}}/>}
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}

// ─── PARENT DASHBOARD (4.2) ───────────────────────────────────
function ParentDash({ user }) {
  const [kids,  setKids]  = useState([]);
  const [load,  setLoad]  = useState(true);
  const [err,   setErr]   = useState('');
  const [ok,    setOk]    = useState('');
  const [busy,  setBusy]  = useState(false);
  const [modal, setModal] = useState(null); // {type, kidId, kidName}
  const [form,  setForm]  = useState({});
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const load_ = useCallback(async()=>{
    setLoad(true);
    try { const d = await api.get('/parent/children'); setKids(d.children||[]); }
    catch {}
    setLoad(false);
  },[]);
  useEffect(()=>{load_();},[load_]);

  const act = async(action, body, msg) => {
    setErr(''); setBusy(true);
    try {
      await api.post('/parent/children',{action,...body,pin:form.pin});
      setOk(msg); setModal(null); setForm({}); load_();
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  if (load) return <Spinner />;

  const totalSent  = kids.reduce((a,c)=>a+(c.monthly_spent||0),0);

  return (
    <div style={{padding:'28px 32px',maxWidth:1100}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28}}>
        <div>
          <div style={{color:C.sub,fontSize:13}}>Parent Dashboard · Live Monitoring 👁️</div>
          <div style={{fontWeight:900,fontSize:28,color:C.text,marginTop:4,letterSpacing:-.8}}>{user.name}</div>
          <Tag label="👨‍👩‍👦 Parent Account" color={C.a1} />
        </div>
        <div style={{...glass({padding:'10px 16px'}),border:`1px solid ${C.g1}25`,background:`${C.g1}07`}}>
          <div style={{fontSize:11,color:C.g1,fontWeight:700}}>● Live Monitoring</div>
          <div style={{fontSize:12,color:C.sub,marginTop:1}}>Watching {kids.length} child{kids.length!==1?'ren':''}</div>
        </div>
      </div>

      <ErrBox msg={err} onClose={()=>setErr('')}/><OkBox msg={ok}/>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
        {[
          {icon:'💰',l:'Your Balance',       v:`Rs.${(user.balance||0).toLocaleString()}`,col:C.g1},
          {icon:'👦👧',l:'Children Linked',  v:kids.length,                               col:C.p1},
          {icon:'📤',l:'Children Spent/mo',  v:`Rs.${totalSent.toLocaleString()}`,        col:C.r1},
        ].map(s=>(
          <Card key={s.l} style={{padding:'16px 18px'}}>
            <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
            <div style={{fontWeight:900,fontSize:22,color:s.col}}>{s.v}</div>
            <div style={{fontSize:12,color:C.sub,marginTop:3}}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* Children cards */}
      {kids.length === 0 ? (
        <Card style={{textAlign:'center',padding:'48px 32px'}}>
          <div style={{fontSize:48,marginBottom:12}}>👦👧</div>
          <div style={{fontWeight:700,fontSize:18,color:C.text}}>No children linked yet</div>
          <div style={{color:C.sub,fontSize:13,marginTop:6}}>Ask your child to register with your phone number as parent phone</div>
        </Card>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:20}}>
          {kids.map((child)=>{
            const pct = child.monthly_limit ? Math.min(100,(child.monthly_spent/child.monthly_limit)*100) : 0;
            const over = pct >= 80;
            return (
              <Card key={child.id} style={{border:`1px solid ${over?`${C.r1}30`:`${C.p1}18`}`}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <Avatar name={child.name} size={50} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:16,color:C.text}}>{child.name}</div>
                    <div style={{fontSize:12,color:C.sub}}>{child.university||'Student'}{child.degree?` · ${child.degree}`:''}</div>
                    <div style={{display:'flex',gap:6,marginTop:4}}>
                      <Tag label={child.is_blocked?'🔒 Blocked':'✅ Active'} color={child.is_blocked?C.r1:C.g1}/>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:900,fontSize:20,color:C.p1}}>Rs.{(child.balance||0).toLocaleString()}</div>
                    <div style={{fontSize:10,color:C.sub}}>balance</div>
                  </div>
                </div>

                {child.monthly_limit && (
                  <div style={{...glass({padding:'11px 14px',marginBottom:14,borderRadius:12})}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:12,color:C.sub}}>Monthly Spending</span>
                      <span style={{fontSize:12,fontWeight:800,color:over?C.r1:C.g1}}>
                        Rs.{(child.monthly_spent||0).toLocaleString()} / Rs.{child.monthly_limit.toLocaleString()} ({Math.round(pct)}%)
                      </span>
                    </div>
                    <ProgBar pct={pct}/>
                  </div>
                )}

                {/* Category breakdown for this child */}
                {Object.keys(child.spending_by_category||{}).length > 0 && (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:C.sub,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Spending by Category</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {Object.entries(child.spending_by_category).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([cat,amt])=>{
                        const c = CATS[cat]||CATS.other;
                        return <Tag key={cat} label={`${c.emoji} Rs.${amt.toLocaleString()}`} color={c.color}/>;
                      })}
                    </div>
                  </div>
                )}

                {/* Recent txns */}
                {child.recent_transactions?.length > 0 && (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:C.sub,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Recent Activity</div>
                    {child.recent_transactions.slice(0,3).map(tx=>(
                      <div key={tx.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                        <span style={{color:C.sub,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>{CATS[tx.category]?.emoji||'📦'} {tx.description}</span>
                        <span style={{color:tx.type==='debit'?C.r1:C.g1,fontWeight:700,flexShrink:0}}>
                          {tx.type==='debit'?'-':'+'}Rs.{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[
                    {l:'💸 Send',    act:()=>setModal({type:'pm',   kidId:child.id, kidName:child.name})},
                    {l:'📋 Limit',   act:()=>setModal({type:'limit',kidId:child.id, kidName:child.name})},
                    {l:child.is_blocked?'✅ Unblock':'🔒 Block', act:()=>setModal({type:'block', kidId:child.id, kidName:child.name, blocked:!child.is_blocked})},
                  ].map(b=>(
                    <button key={b.l} onClick={b.act}
                      style={{...ghost(C.p1),padding:'9px 4px',fontSize:11,borderRadius:10}}>
                      {b.l}
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
          <Card style={{width:'100%',maxWidth:400,background:C.mid}}>
            <div style={{fontWeight:800,fontSize:16,color:C.text,marginBottom:16}}>
              {modal.type==='pm'?`💸 Send to ${modal.kidName}`:modal.type==='limit'?`📋 Set Limit for ${modal.kidName}`:`${modal.blocked?'✅ Unblock':'🔒 Block'} ${modal.kidName}`}
            </div>
            <ErrBox msg={err} onClose={()=>setErr('')}/>
            {modal.type==='pm'    && <Field label="Amount (Rs.)" value={form.amount||''} onChange={set('amount')} placeholder="0" type="number" req />}
            {modal.type==='limit' && <Field label="Monthly Limit (Rs.)" value={form.limit||''} onChange={set('limit')} placeholder="15000" type="number" req />}
            {modal.type==='block' && <div style={{...glass({padding:'12px',marginBottom:12,borderRadius:12}),fontSize:13,color:C.sub}}>{modal.blocked?`This will block ${modal.kidName}'s spending.`:`This will restore ${modal.kidName}'s spending.`}</div>}
            <Field label="Confirm Your PIN" value={form.pin||''} onChange={set('pin')} placeholder="••••" type="password" req />
            <div style={{display:'flex',gap:10,marginTop:4}}>
              <Btn label="Confirm" loading={busy}
                onClick={()=>{
                  if (modal.type==='pm')    act('send_pocket_money',{child_id:modal.kidId,amount:parseFloat(form.amount||0)},`Rs.${form.amount} sent!`);
                  if (modal.type==='limit') act('set_limit',{child_id:modal.kidId,limit:parseFloat(form.limit||0)},`Limit set to Rs.${form.limit}!`);
                  if (modal.type==='block') act('set_block',{child_id:modal.kidId,blocked:modal.blocked},modal.blocked?'Student blocked.':'Student unblocked.');
                }} />
              <Btn label="Cancel" ghost onClick={()=>setModal(null)} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── PARENT CHILDREN DETAIL / REPORTS ─────────────────────────
function ParentReports() {
  const [kids, setKids] = useState([]);
  const [sel,  setSel]  = useState(null);
  const [rep,  setRep]  = useState(null);
  const [load, setLoad] = useState(true);

  useEffect(()=>{
    api.get('/parent/children').then(d=>{ setKids(d.children||[]); if(d.children?.length) setSel(d.children[0]); }).finally(()=>setLoad(false));
  },[]);

  useEffect(()=>{
    if (!sel) return;
    // For parent reports we use the spending endpoint — in production you'd have /parent/children/:id/report
    // For now showing the child's spending breakdown we already have
    setRep(sel);
  },[sel]);

  if (load) return <Spinner />;

  return (
    <div style={{padding:'28px 32px',maxWidth:1000}}>
      <div style={{fontWeight:900,fontSize:26,color:C.text,marginBottom:6,letterSpacing:-.5}}>📊 Child Spending Reports</div>
      <div style={{color:C.sub,fontSize:13,marginBottom:20}}>Access spending reports for each child</div>

      {kids.length === 0 ? <div style={{color:C.sub,fontSize:13}}>No children linked.</div> : (
        <>
          {/* Child selector */}
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {kids.map(k=>(
              <button key={k.id} onClick={()=>setSel(k)}
                style={{...(sel?.id===k.id?btn():ghost()),width:'auto',padding:'10px 18px',fontSize:13,borderRadius:12}}>
                {k.name}
              </button>
            ))}
          </div>

          {rep && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <Card>
                <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>
                  {rep.name} — Monthly Summary
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                  {[{l:'Balance',v:`Rs.${(rep.balance||0).toLocaleString()}`,col:C.g1},{l:'Spent/mo',v:`Rs.${(rep.monthly_spent||0).toLocaleString()}`,col:C.r1},{l:'Limit',v:rep.monthly_limit?`Rs.${rep.monthly_limit.toLocaleString()}`:'None',col:C.p1},{l:'Status',v:rep.is_blocked?'Blocked':'Active',col:rep.is_blocked?C.r1:C.g1}].map(s=>(
                    <div key={s.l} style={{...glass({padding:'11px 12px',borderRadius:12,textAlign:'center'})}}>
                      <div style={{fontWeight:800,fontSize:14,color:s.col}}>{s.v}</div>
                      <div style={{fontSize:10,color:C.sub,marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {rep.monthly_limit && <><ProgBar pct={Math.min(100,(rep.monthly_spent/rep.monthly_limit)*100)} /><div style={{fontSize:11,color:C.sub,marginTop:4}}>{Math.round((rep.monthly_spent/rep.monthly_limit)*100)}% of monthly limit used</div></>}
              </Card>
              <Card>
                <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>Spending by Category</div>
                {Object.keys(rep.spending_by_category||{}).length === 0
                  ? <div style={{color:C.sub,fontSize:13,textAlign:'center',padding:'20px 0'}}>No spending this month</div>
                  : Object.entries(rep.spending_by_category).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{
                      const c = CATS[cat]||CATS.other;
                      return (
                        <div key={cat} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}><span>{c.emoji}</span><span style={{fontSize:13,color:C.text,fontWeight:600}}>{c.label}</span></div>
                          <span style={{fontWeight:800,fontSize:13,color:c.color}}>Rs.{amt.toLocaleString()}</span>
                        </div>
                      );
                    })
                }
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── PARENT SEND MONEY ────────────────────────────────────────
function ParentSend({ user }) {
  const [kids, setKids]  = useState([]);
  const [form, setForm]  = useState({});
  const [err,  setErr]   = useState('');
  const [ok,   setOk]    = useState('');
  const [busy, setBusy]  = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  useEffect(()=>{ api.get('/parent/children').then(d=>setKids(d.children||[])).catch(()=>{}); },[]);

  const send = async() => {
    setErr(''); setBusy(true);
    try {
      await api.post('/parent/children',{action:'send_pocket_money',child_id:form.child,amount:parseFloat(form.amount),pin:form.pin});
      setOk(`Rs.${form.amount} sent!`); setForm({});
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div style={{padding:'28px 32px',maxWidth:600}}>
      <div style={{fontWeight:900,fontSize:26,color:C.text,marginBottom:6,letterSpacing:-.5}}>💸 Send Allowance</div>
      <div style={{color:C.sub,fontSize:13,marginBottom:24}}>Send pocket money or allowance to your children</div>
      <ErrBox msg={err} onClose={()=>setErr('')}/><OkBox msg={ok}/>
      <Card>
        <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:16}}>Send Pocket Money</div>
        <div style={{marginBottom:12}}>
          <label style={labelS}>Select Child</label>
          <select style={{...inputS,appearance:'none'}} value={form.child||''} onChange={set('child')}>
            <option value="">Choose child…</option>
            {kids.map(k=><option key={k.id} value={k.id} style={{background:C.mid}}>{k.name} (Balance: Rs.{(k.balance||0).toLocaleString()})</option>)}
          </select>
        </div>
        <Field label="Amount (Rs.)" value={form.amount||''} onChange={set('amount')} placeholder="0" type="number" req />
        <Field label="Your PIN" value={form.pin||''} onChange={set('pin')} placeholder="••••" type="password" req />
        <div style={{marginTop:4}}><Btn label="Send Allowance 💸" loading={busy} onClick={send}/></div>
      </Card>
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────
export default function SkolarPay() {
  const [user,   setUser]   = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [booted, setBooted] = useState(false);

  useEffect(()=>{
    api.init();
    if (api.token) {
      api.get('/auth/me').then(d=>{ setUser(d.user); }).catch(()=>{ api.clear(); }).finally(()=>setBooted(true));
    } else { setBooted(true); }
  },[]);

  if (!booted) return (
    <div style={{minHeight:'100vh',background:C.dark,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>🎓</div>
  );

  if (!user) return <AuthScreen onLogin={u=>{setUser(u); setScreen(u.role==='parent'?'p_dash':'dashboard');}} />;

  const logout = () => { api.clear(); setUser(null); setScreen('dashboard'); };
  const isParent = user.role === 'parent';

  const renderScreen = () => {
    if (isParent) {
      switch(screen) {
        case 'p_dash':     return <ParentDash user={user} />;
        case 'p_children': return <ParentDash user={user} />;
        case 'p_send':     return <ParentSend user={user} />;
        case 'p_reports':  return <ParentReports />;
        default:           return <ParentDash user={user} />;
      }
    }
    switch(screen) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'wallet':    return <WalletScreen />;
      case 'pay':       return <PayScreen />;
      case 'budget':    return <BudgetScreen />;
      case 'goals':     return <GoalsScreen />;
      case 'analytics': return <AnalyticsScreen />;
      case 'reports':   return <ReportsScreen />;
      case 'profile':   return <ProfileScreen user={user} />;
      default:          return <Dashboard user={user} />;
    }
  };

  return (
    <>
      <Head>
        <title>SkolarPay — Smart Money for Smart Students</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <Layout user={user} screen={screen} setScreen={setScreen} onLogout={logout}>
        {renderScreen()}
      </Layout>
    </>
  );
}
