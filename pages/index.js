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
  topup:'#8B5CF6', bank_transfer:'#EF4444'
};

const CATEGORIES = [
  { id:'food', label:'Food & Cafeteria', color:C.food, icon:'🍔' },
  { id:'transport', label:'Transport / Fuel', color:C.transport, icon:'🚌' },
  { id:'education', label:'Education & Books', color:C.education, icon:'📚' },
  { id:'shopping', label:'Shopping', color:C.shopping, icon:'🛍️' },
  { id:'entertainment', label:'Entertainment', color:C.entertainment, icon:'🎬' },
  { id:'utilities', label:'Bills & Utilities', color:C.utilities, icon:'💡' },
  { id:'transfer', label:'Peer Transfer', color:C.transfer, icon:'💸' },
  { id:'topup', label:'Mobile Topup', color:C.topup, icon:'📱' },
  { id:'savings', label:'Savings Allocation', color:C.savings, icon:'🐷' }
];

const NETS = [
  { id:'jazz', name:'Jazz', emoji:'🔴', color:'#E61C24' },
  { id:'telenor', name:'Telenor', emoji:'🔵', color:'#00A5EC' },
  { id:'zong', name:'Zong', emoji:'🟢', color:'#77B823' },
  { id:'ufone', name:'Ufone', emoji:'🟠', color:'#F37023' }
];

const BILLS = [
  { id:'iesco', label:'IESCO Electricity', type:'Electricity', icon:'⚡' },
  { id:'sngpl', label:'SNGPL Gas', type:'Gas', icon:'🔥' },
  { id:'wasa', label:'WASA Water', type:'Water', icon:'🚰' },
  { id:'nayatel', label:'Nayatel Internet', type:'Internet', icon:'🌐' }
];

// ─── GLASSMORPHISM HELPERS ───────────────────────────────────
const glass = (more={}) => ({
  background: C.card,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  ...more
});

const ghost = (color, pad='10px 16px') => ({
  background: 'transparent',
  border: `1px solid ${color}`,
  color: color,
  padding: pad,
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 600,
  transition: 'all 0.2s ease'
});

const filled = (color, pad='10px 16px') => ({
  background: color,
  border: `1px solid ${color}`,
  color: color===C.pl ? C.dark : '#fff',
  padding: pad,
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 700,
  transition: 'all 0.2s ease'
});

// ─── CUSTOM REUSABLE COMPONENTS ──────────────────────────────
function Card({ children, style={}, title, action }) {
  return (
    <div style={glass({ padding: 24, marginBottom: 20, ...style })}>
      {(title || action) && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          {title && <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text }}>{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Input({ label, type='text', value, onChange, placeholder, disabled=false }) {
  return (
    <div style={{ marginBottom: 16, display:'flex', flexDirection:'column' }}>
      {label && <label style={{ fontSize:13, fontWeight:600, color:C.sub, marginBottom:6 }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '12px 14px',
          color: C.text,
          fontSize: 14,
          outline: 'none',
          transition: 'all 0.2s'
        }}
      />
    </div>
  );
}

function Alert({ text, type='warn' }) {
  const bg = type==='error'?C.r2 : type==='success'?C.g2 : C.a2;
  const col = type==='error'?C.r1 : type==='success'?C.g1 : C.a1;
  if(!text) return null;
  return (
    <div style={{ background:bg, color:col, padding:'12px 16px', borderRadius:10, fontSize:13, fontWeight:600, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
      <span>{type==='error'?'🛑':'⚠️'}</span> {text}
    </div>
  );
}

// ─── MAIN CONTAINER ──────────────────────────────────────────
export default function MainApp() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('dashboard'); // p_dash, wallet, pay, budget, goals, analytics, reports, profile

  // Trigger login check on mount
  useEffect(() => {
    const t = localStorage.getItem('sp_token');
    if (t) {
      setToken(t);
      fetchProfile(t);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (t) => {
    try {
      const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${t}` } });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        if(data.user.role === 'parent') setScreen('p_dash');
      } else {
        logout();
      }
    } catch (e) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sp_token');
    setToken(null);
    setUser(null);
    setScreen('dashboard');
  };

  if (loading) {
    return (
      <div style={{ background:C.dark, minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:C.text, fontFamily:'"Plus Jakarta Sans", sans-serif' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:28, fontWeight:900, background:`linear-gradient(135deg, ${C.pl}, ${C.p1})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:10 }}>SkolarPay</div>
          <div style={{ color:C.sub, fontSize:13 }}>Loading secure ledger environment...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return <AuthScreen onLogin={(t) => { setToken(t); fetchProfile(t); }} />;
  }

  return (
    <div style={{ background:C.dark, minHeight:'100vh', color:C.text, fontFamily:'"Plus Jakarta Sans", sans-serif', display:'flex' }}>
      {/* SIDEBAR NAVIGATION */}
      <div style={{ width:260, background:C.mid, borderRight:`1px solid ${C.border}`, padding:'30px 20px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, background:`linear-gradient(135deg, ${C.pl}, ${C.p1})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:35, paddingLeft:10 }}>SkolarPay</div>
          
          <div style={{ color:C.sub, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, paddingLeft:10, marginBottom:12 }}>Workspace</div>
          
          {user.role === 'parent' ? (
            <>
              <NavBtn active={screen==='p_dash'} icon="👨‍👩‍👦" label="Parent Dashboard" onClick={() => setScreen('p_dash')} />
              <NavBtn active={screen==='p_reports'} icon="📈" label="Spending Reports" onClick={() => setScreen('p_reports')} />
            </>
          ) : (
            <>
              <NavBtn active={screen==='dashboard'} icon="🔮" label="Overview" onClick={() => setScreen('dashboard')} />
              <NavBtn active={screen==='wallet'} icon="💳" label="Digital Wallet" onClick={() => setScreen('wallet')} />
              <NavBtn active={screen==='pay'} icon="⚡" label="Bills & Topup" onClick={() => setScreen('pay')} />
              <NavBtn active={screen==='budget'} icon="📅" label="Semester Budget" onClick={() => setScreen('budget')} />
              <NavBtn active={screen==='goals'} icon="🎯" label="Savings Goals" onClick={() => setScreen('goals')} />
              <NavBtn active={screen==='analytics'} icon="📊" label="Analytics" onClick={() => setScreen('analytics')} />
              <NavBtn active={screen==='reports'} icon="📝" label="Statements" onClick={() => setScreen('reports')} />
            </>
          )}
          <NavBtn active={screen==='profile'} icon="⚙️" label="Account Security" onClick={() => setScreen('profile')} />
        </div>

        {/* USER TAG AT BOTTOM */}
        <div style={glass({ padding:14, display:'flex', alignItems:'center', justifyContent:'space-between' })}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:user.role==='parent'?C.c1:C.p1, display:'flex', justifyContent:'center', alignItems:'center', fontWeight:700, fontSize:13 }}>
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
              <div style={{ fontSize:11, color:C.sub, textTransform:'capitalize' }}>{user.role} account</div>
            </div>
          </div>
          <button onClick={logout} style={{ background:'none', border:'none', color:C.r1, cursor:'pointer', fontSize:16 }}>🚪</button>
        </div>
      </div>

      {/* MAIN DATA VIEW AREA */}
      <div style={{ flex:1, padding:40, overflowY:'auto', maxHeight:'100vh' }}>
        {renderScreen()}
      </div>
    </div>
  );

  function NavBtn({ active, icon, label, onClick }) {
    return (
      <div onClick={onClick} style={{
        display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, cursor:'pointer', marginBottom:6, fontSize:14, fontWeight:active?700:500,
        background: active ? 'rgba(91,79,232,0.15)' : 'transparent',
        color: active ? C.pl : C.sub,
        transition: 'all 0.2s'
      }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        {label}
      </div>
    );
  }

  function renderScreen() {
    if (user.role === 'parent') {
      switch(screen) {
        case 'p_dash':     return <ParentDash token={token} user={user} />;
        case 'p_reports':  return <ParentReports token={token} /> ;
        case 'profile':   return <ProfileScreen user={user} token={token} onUpdate={fetchProfile} />;
        default:           return <ParentDash token={token} user={user} />;
      }
    }
    switch(screen) {
      case 'dashboard': return <DashboardHome token={token} user={user} setScreen={setScreen} />;
      case 'wallet':    return <WalletScreen token={token} />;
      case 'pay':       return <PayScreen token={token} />;
      case 'budget':    return <BudgetScreen token={token} />;
      case 'goals':     return <GoalsScreen token={token} />;
      case 'analytics': return <AnalyticsScreen token={token} />;
      case 'reports':   return <ReportsScreen token={token} />;
      case 'profile':   return <ProfileScreen user={user} token={token} onUpdate={fetchProfile} />;
      default:          return <DashboardHome token={token} user={user} setScreen={setScreen} />;
    }
  }
}

// ─── AUTHENTICATION MODULE ───────────────────────────────────
function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('student'); // student, parent
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if(!phone || !pin || (isRegister && !name)) { setErr('Fill out all core fields.'); return; }
    
    const url = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister ? { role, name, phone, pin, parent_phone: role==='student'?parentPhone:undefined } : { phone, pin };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server rejected request');
      
      if (isRegister) {
        setMsg('Account provisioned successfully. Proceeding to login.');
        setIsRegister(false);
      } else {
        localStorage.setItem('sp_token', data.token);
        onLogin(data.token);
      }
    } catch(e) {
      setErr(e.message);
    }
  };

  return (
    <div style={{ background:C.dark, minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center', fontFamily:'"Plus Jakarta Sans", sans-serif', padding:20 }}>
      <div style={glass({ width:420, padding:35 })}>
        <div style={{ textAlign:'center', marginBottom:30 }}>
          <div style={{ fontSize:26, fontWeight:900, background:`linear-gradient(135deg, ${C.pl}, ${C.p1})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:6 }}>SkolarPay</div>
          <div style={{ color:C.sub, fontSize:13 }}>Distributed Student Fiscal Protocol</div>
        </div>

        <Alert text={err} type="error" />
        <Alert text={msg} type="success" />

        <div style={{ display:'flex', background:'rgba(255,255,255,0.03)', borderRadius:12, padding:4, marginBottom:24 }}>
          <button type="button" onClick={() => { setIsRegister(false); setErr(''); }} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', background: !isRegister?C.card:'transparent', color: !isRegister?C.text:C.sub }}>Sign In</button>
          <button type="button" onClick={() => { setIsRegister(true); setErr(''); }} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', background: isRegister?C.card:'transparent', color: isRegister?C.text:C.sub }}>Provision Node</button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.sub, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:8 }}>System Actor Role</label>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={() => setRole('student')} style={{ flex:1, ... (role==='student'?filled(C.p1,'10px'):ghost(C.sub,'10px')), fontSize:13 }}>Student</button>
                <button type="button" onClick={() => setRole('parent')} style={{ flex:1, ... (role==='parent'?filled(C.c1,'10px'):ghost(C.sub,'10px')), fontSize:13 }}>Parent / Guardian</button>
              </div>
            </div>
          )}

          {isRegister && <Input label="Full Identity Name" value={name} onChange={setName} placeholder="e.g., Sultan Ahmed" />}
          <Input label="Mobile Phone Identifier" value={phone} onChange={setPhone} placeholder="e.g., 03001112223" />
          <Input label="Secure Secret PIN (4-Digits)" type="password" value={pin} onChange={setPin} placeholder="••••" />
          
          {isRegister && role === 'student' && (
            <Input label="Associated Parent Phone Identifier" value={parentPhone} onChange={setParentPhone} placeholder="e.g., 03009998887" />
          )}

          <button type="submit" style={{ width:'100%', marginTop:10, ...filled(role==='parent'?C.c1:C.p1, '14px') }}>
            {isRegister ? 'Execute Registration' : 'Authenticate Session'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── STUDENT OVERVIEW / DASHBOARD HOME ────────────────────────
function DashboardHome({ token, user, setScreen }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/wallet/balance', { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(setData);
  }, [token]);

  if(!data) return <div style={{ color:C.sub }}>Fetching ledger snapshot...</div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:35 }}>
        <div>
          <h1 style={{ margin:0, fontSize:28, fontWeight:800 }}>Welcome back, {user.name}!</h1>
          <div style={{ color:C.sub, fontSize:14, marginTop:4 }}>Secure Token Ledger Active</div>
        </div>
        <div style={{ fontSize:13, fontWeight:600, background:C.card, padding:'8px 16px', borderRadius:20, border:`1px solid ${C.border}` }}>
          🔴 Network Node Live
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:24 }}>
        <div>
          {/* BALANCE DISPLAY HEADER */}
          <Card style={{ background:`linear-gradient(135deg, rgba(91,79,232,0.2), rgba(15,14,26,0.5))`, border:`1px solid rgba(91,79,232,0.3)`, padding:30 }}>
            <div style={{ color:C.sub, fontSize:14, fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>Available Escrow Liquidity</div>
            <div style={{ fontSize:42, fontWeight:900, marginTop:10, color:C.text }}>Rs. {data.balance.toLocaleString()}.00</div>
            <div style={{ display:'flex', gap:14, marginTop:25 }}>
              <button onClick={() => setScreen('wallet')} style={filled(C.p1)}>Send Money</button>
              <button onClick={() => setScreen('pay')} style={ghost(C.pl)}>Pay Bills</button>
            </div>
          </Card>

          {/* QUICK LINKS GRID */}
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Fiduciary Accelerators</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginBottom:24 }}>
            <QuickLink icon="📱" label="Mobile Recharge" sub="Instant network topup" onClick={() => setScreen('pay')} />
            <QuickLink icon="📅" label="Semester Budget" sub="Tracking allocations" onClick={() => setScreen('budget')} />
            <QuickLink icon="🎯" label="Savings System" sub="Fund strategic goals" onClick={() => setScreen('goals')} />
          </div>

          {/* TRANSACTION SUBSET */}
          <Card title="Recent Ledger Clearances" action={<button onClick={() => setScreen('wallet')} style={{ background:'none', border:'none', color:C.p2, fontWeight:600, cursor:'pointer' }}>View All History</button>}>
            <TransactionList transactions={data.recentTransactions} />
          </Card>
        </div>

        <div>
          {/* STATUS WIDGET: SPENDING LIMIT */}
          <Card title="Monthly Spending Limit">
            <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:6 }}>
              Rs. {data.spentThisMonth.toLocaleString()} <span style={{ fontSize:14, color:C.sub, fontWeight:500 }}>spent</span>
            </div>
            {data.spendingLimit ? (
              <>
                <div style={{ fontSize:12, color:C.sub, marginBottom:10 }}>Ceiling Threshold: Rs. {data.spendingLimit.toLocaleString()}</div>
                <ProgressBar value={data.spentThisMonth} max={data.spendingLimit} color={data.spentThisMonth > data.spendingLimit ? C.r1 : C.p1} />
                {data.spentThisMonth > data.spendingLimit && <div style={{ color:C.r1, fontSize:11, fontWeight:600, marginTop:8 }}>⚠️ Limit Exceeded. Parent node alerted.</div>}
              </>
            ) : (
              <div style={{ fontSize:12, color:C.sub, fontStyle:'italic' }}>No constraint limit imposed by parent node.</div>
            )}
          </Card>

          {/* SYSTEM MESSAGES / NOTIFICATIONS */}
          <NotificationsBox token={token} />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ icon, label, sub, onClick }) {
  return (
    <div onClick={onClick} style={glass({ padding:16, cursor:'pointer', transition:'transform 0.2s', ':hover':{ transform:'translateY(-2px)' } })}>
      <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{label}</div>
      <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{sub}</div>
    </div>
  );
}

// ─── DIGITAL WALLET MODULE ───────────────────────────────────
function WalletScreen({ token }) {
  const [data, setData] = useState(null);
  const [destPhone, setDestPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const refreshWallet = useCallback(() => {
    let url = '/api/wallet/transactions';
    if(catFilter !== 'all') url += `?category=${catFilter}`;
    fetch(url, { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(setData);
  }, [token, catFilter]);

  useEffect(() => { refreshWallet(); }, [refreshWallet]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setErr(''); setSuccess('');
    try {
      const res = await fetch('/api/transfer/internal', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dest_phone:destPhone, amount:parseFloat(amount), pin, description:desc })
      });
      const resData = await res.json();
      if(!res.ok) throw new Error(resData.error || 'Transfer failed');
      setSuccess(`Cleared! Transaction hash ID: ${resData.transactionId}`);
      setDestPhone(''); setAmount(''); setPin(''); setDesc('');
      refreshWallet();
    } catch(e) { setErr(e.message); }
  };

  if(!data) return <div style={{ color:C.sub }}>Compiling secure balance matrices...</div>;

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, marginBottom:30 }}>Digital Wallet Ledger</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* PEER TO PEER DISPATCHER */}
        <div>
          <Card title="Execute Peer Trust Transfer">
            <Alert text={err} type="error" />
            <Alert text={success} type="success" />
            <form onSubmit={handleTransfer}>
              <Input label="Recipient Phone Identifier" value={destPhone} onChange={setDestPhone} placeholder="03XXXXXXXXX" />
              <Input label="Value Amount (Rs.)" type="number" value={amount} onChange={setAmount} placeholder="Minimum Rs.10" />
              <Input label="Transaction Manifest/Description" value={desc} onChange={setDesc} placeholder="e.g., Shared cafeteria meal" />
              <Input label="Secure Secret PIN Validation" type="password" value={pin} onChange={setPin} placeholder="••••" />
              <button type="submit" style={{ width:'100%', marginTop:10, ...filled(C.p1, '13px') }}>Dispatch Internal Escrow</button>
            </form>
          </Card>
        </div>

        {/* BANK DEPOSIT / HISTORY OVERVIEW */}
        <div>
          <Card style={{ background:`linear-gradient(135deg, rgba(6,182,212,0.15), transparent)`, border:`1px solid rgba(6,182,212,0.2)` }}>
            <div style={{ color:C.sub, fontSize:13, fontWeight:600 }}>Total Cumulative Liquidity</div>
            <div style={{ fontSize:32, fontWeight:900, marginTop:6 }}>Rs. {data.balance.toLocaleString()}.00</div>
          </Card>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:24, marginBottom:12 }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:0 }}>Audit History Logs</h3>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ background:C.mid, color:C.text, border:`1px solid ${C.border}`, padding:'6px 12px', borderRadius:8, fontSize:12, outline:'none' }}>
              <option value="all">Filter: All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>

          <Card style={{ maxHeight:400, overflowY:'auto', padding:16 }}>
            <TransactionList transactions={data.transactions} />
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── BILL PAYMENTS & RECHARGE MODULE ─────────────────────────
function PayScreen({ token }) {
  const [activeTab, setActiveTab] = useState('recharge'); // recharge, bill
  const [mobile, setMobile] = useState('');
  const [selNet, setSelNet] = useState(null);
  const [selBill, setSelBill] = useState(null);
  const [consumerNum, setConsumerNum] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setMobile(''); setSelNet(null); setSelBill(null); setConsumerNum(''); setAmount(''); setPin(''); setErr(''); setSuccess('');
  };

  const handleAction = async (e) => {
    e.preventDefault();
    setErr(''); setSuccess('');
    const url = activeTab === 'recharge' ? '/api/topup/recharge' : '/api/bills/pay';
    const body = activeTab === 'recharge' 
      ? { mobile, network: selNet?.id, amount: parseFloat(amount), pin }
      : { provider: selBill?.id, consumer_number: consumerNum, amount: parseFloat(amount), pin };

    try {
      const res = await fetch(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Payment transaction rejected');
      setSuccess(`Transaction authorized successfully! Clearance Ref: ${data.transactionId}`);
      if(activeTab==='recharge') { setMobile(''); setAmount(''); } else { setConsumerNum(''); setAmount(''); }
      setPin('');
    } catch(e) { setErr(e.message); }
  };

  return (
    <div style={{ maxWidth:650, margin:'0 auto' }}>
      <h1 style={{ fontSize:26, fontWeight:800, marginBottom:30 }}>Micro-Utility Clearinghouse</h1>
      
      <div style={{ display:'flex', background:'rgba(255,255,255,0.03)', borderRadius:12, padding:4, marginBottom:24 }}>
        <button onClick={() => { setActiveTab('recharge'); resetForm(); }} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', fontSize:14, fontWeight:600, cursor:'pointer', background: activeTab==='recharge'?C.card:'transparent', color: activeTab==='recharge'?C.text:C.sub }}>📱 Mobile Airtime Recharge</button>
        <button onClick={() => { setActiveTab('bill'); resetForm(); }} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', fontSize:14, fontWeight:600, cursor:'pointer', background: activeTab==='bill'?C.card:'transparent', color: activeTab==='bill'?C.text:C.sub }}>⚡ Utility Bill Settlement</button>
      </div>

      <Card title={activeTab==='recharge'?'Mobile Network Topup Protocol':'Institutional Utility Ledger'}>
        <Alert text={err} type="error" />
        <Alert text={success} type="success" />

        <form onSubmit={handleAction}>
          {activeTab === 'recharge' ? (
            <>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.sub, display:'block', marginBottom:8 }}>Select Cellular Operator Network</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
                  {NETS.map(n => (
                    <div key={n.id} onClick={() => setSelNet(n)}
                         style={{ ...glass({ padding:'12px 8px' }), textAlign:'center', cursor:'pointer', transition:'all 0.2s', border: selNet?.id===n.id?`2px solid ${C.p1}`:`1px solid ${C.border}` }}>
                      <div style={{ fontSize:20, marginBottom:4 }}>{n.emoji}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:C.text }}>{n.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Input label="Mobile Line Endpoint Number" value={mobile} onChange={setMobile} placeholder="03XXXXXXXXX" />
            </>
          ) : (
            <>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.sub, display:'block', marginBottom:8 }}>Select Utility Distribution Node</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }}>
                  {BILLS.map(b => (
                    <div key={b.id} onClick={() => setSelBill(b)}
                         style={{ ...glass({ padding:'13px' }), display:'flex', alignItems:'center', gap:12, cursor:'pointer', transition:'all 0.2s', border: selBill?.id===b.id?`2px solid ${C.p1}`:`1px solid ${C.border}` }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:'rgba(91,79,232,0.15)', display:'flex', justifyContent:'center', alignItems:'center', fontSize:18 }}>{b.icon}</div>
                      <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:13, color:C.text }}>{b.label}</div></div>
                      {selBill?.id===b.id && <span style={{ color:C.p1 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
              <Input label="Consumer / Account Identifier Number" value={consumerNum} onChange={setConsumerNum} placeholder="Enter exact manifest number" />
            </>
          )}

          <Input label="Settlement Amount (Rs.)" type="number" value={amount} onChange={setAmount} placeholder="Enter clearing value" />
          <Input label="Secure Secret PIN Validation" type="password" value={pin} onChange={setPin} placeholder="••••" />

          <button type="submit" style={{ width:'100%', marginTop:10, ...filled(activeTab==='bill'?C.c1:C.p1, '14px') }}>
            Authorize Escrow Discharge
          </button>
        </form>
      </Card>
    </div>
  );
}

// ─── SEMESTER BUDGET PLANNER MODULE ──────────────────────────
function BudgetScreen({ token }) {
  const [plan, setPlan] = useState(null);
  const [totalAllowance, setTotalAllowance] = useState('');
  const [months, setMonths] = useState('4');
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');

  const fetchBudget = useCallback(() => {
    fetch('/api/budget/semester', { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if(d.plan) setPlan(d.plan); });
  }, [token]);

  useEffect(() => { fetchBudget(); }, [fetchBudget]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await fetch('/api/budget/semester', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ title, total_allowance: parseFloat(totalAllowance), duration_months: parseInt(months) })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Failed to create budget structure');
      fetchBudget();
    } catch(e) { setErr(e.message); }
  };

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, marginBottom:30 }}>Semester Fiscal Budget Architect</h1>
      
      {plan ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <Card title={`Active Configuration: ${plan.title}`}>
            <div style={{ color:C.sub, fontSize:13 }}>Total Allotted Term Capital</div>
            <div style={{ fontSize:28, fontWeight:800, color:C.text, marginTop:4, marginBottom:20 }}>Rs. {plan.totalAllowance.toLocaleString()}</div>
            
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              <div style={glass({ padding:14 })}>
                <div style={{ fontSize:11, color:C.sub, textTransform:'uppercase' }}>Monthly Cap Ceiling</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.p2, marginTop:4 }}>Rs. {plan.monthlyLimit.toLocaleString()}</div>
              </div>
              <div style={glass({ padding:14 })}>
                <div style={{ fontSize:11, color:C.sub, textTransform:'uppercase' }}>Weekly Safe Run-rate</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.c1, marginTop:4 }}>Rs. {plan.weeklyLimit.toLocaleString()}</div>
              </div>
            </div>

            <div style={{ color:C.sub, fontSize:12, marginBottom:6 }}>Term Liquidity Depth Remaining:</div>
            <ProgressBar value={plan.remainingBalance} max={plan.totalAllowance} color={C.g1} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.sub, marginTop:6 }}>
              <span>Spent: Rs. {(plan.totalAllowance - plan.remainingBalance).toLocaleString()}</span>
              <span>Available: Rs. {plan.remainingBalance.toLocaleString()}</span>
            </div>
          </Card>

          <Card title="Pace Velocity Metrics">
            <div style={{ fontSize:14, lineHeight:'1.6', color:C.text }}>
              Your current spending vector is operating inside standard limits. 
              Keep weekly outlays underneath <strong style={{ color:C.c1 }}>Rs. {plan.weeklyLimit}</strong> to shield term endowments from premature exhaustion.
            </div>
            <div style={{ marginTop:24, background:'rgba(255,255,255,0.02)', padding:16, borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:4, color:C.g1 }}>💡 Optimization Advisory</div>
              <div style={{ fontSize:12, color:C.sub }}>Allocating surplus weekly run-rate margins into an active savings goal node compounds capital shielding.</div>
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ maxWidth:500, margin:'0 auto' }}>
          <Card title="Initialize New Semester Constraints">
            <Alert text={err} type="error" />
            <form onSubmit={handleCreate}>
              <Input label="Academic Term Title" value={title} onChange={setTitle} placeholder="e.g., Fall Semester 2026" />
              <Input label="Total Expected Escrow Allocation (Rs.)" type="number" value={totalAllowance} onChange={setTotalAllowance} placeholder="Total term pocket money" />
              <Input label="Term Duration Scale (Months)" type="number" value={months} onChange={setMonths} placeholder="Standard scale is 4-5 months" />
              <button type="submit" style={{ width:'100%', marginTop:10, ...filled(C.p1, '13px') }}>Instantiate Budget Blueprint</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── SAVINGS GOALS MODULE ────────────────────────────────────
function GoalsScreen({ token }) {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [type, setType] = useState('LAPTOP');
  const [contribAmount, setContribAmount] = useState('');
  const [selGoalId, setSelGoalId] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const fetchGoals = useCallback(() => {
    fetch('/api/savings/goals', { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if(d.goals) setGoals(d.goals); });
  }, [token]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErr(''); setSuccess('');
    try {
      const res = await fetch('/api/savings/goals', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ title, target_amount: parseFloat(target), type })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Goal provision rejected');
      setSuccess(`Goal node "${title}" instantiated.`);
      setTitle(''); setTarget('');
      fetchGoals();
    } catch(e) { setErr(e.message); }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    setErr(''); setSuccess('');
    if(!selGoalId) { setErr('Select a target node.'); return; }
    try {
      const res = await fetch('/api/savings/contribute', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ goal_id: selGoalId, amount: parseFloat(contribAmount), pin })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Contribution matrix clearance failure');
      setSuccess(`Transferred Rs. ${contribAmount} to active vault allocation.`);
      setContribAmount(''); setPin('');
      fetchGoals();
    } catch(e) { setErr(e.message); }
  };

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, marginBottom:30 }}>Strategic Savings Vaults</h1>
      <Alert text={err} type="error" />
      <Alert text={success} type="success" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* GOALS PROVISIONING MATRIX */}
        <div>
          <Card title="Instantiate Vault Goal Objective">
            <form onSubmit={handleCreate}>
              <Input label="Goal Descriptive Title" value={title} onChange={setTitle} placeholder="e.g., Next-Gen Core i9 Laptop" />
              <Input label="Target Value Matrix (Rs.)" type="number" value={target} onChange={setTarget} placeholder="Target funding ceiling" />
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:C.sub, display:'block', marginBottom:6 }}>Goal Domain Taxonomy</label>
                <select value={type} onChange={e => setType(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.04)', color:C.text, border:`1px solid ${C.border}`, padding:12, borderRadius:10, outline:'none' }}>
                  <option value="LAPTOP">💻 Educational Computing Terminal</option>
                  <option value="BOOKS">📚 Term Enrollment Syllabus/Books</option>
                  <option value="REGISTRATION">🎓 Course Enrollment/Registration Fees</option>
                  <option value="TRIP">🚌 Academic Research Symposium/Trip</option>
                  <option value="GENERAL">🐷 Default Capital Buffer Vault</option>
                </select>
              </div>
              <button type="submit" style={{ width:'100%', ...filled(C.p1, '12px') }}>Provision Sinking Vault</button>
            </form>
          </Card>

          {/* ASSET ALLOCATION PROTOCOL */}
          {goals.length > 0 && (
            <Card title="Execute Trust Vault Capitalization" style={{ marginTop:20 }}>
              <form onSubmit={handleContribute}>
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:C.sub, display:'block', marginBottom:6 }}>Target Destination Node</label>
                  <select value={selGoalId} onChange={e => setSelGoalId(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.04)', color:C.text, border:`1px solid ${C.border}`, padding:12, borderRadius:10, outline:'none' }}>
                    <option value="">-- Choose Target Allocation Node --</option>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.title} (Current: Rs. {g.currentAmount})</option>)}
                  </select>
                </div>
                <Input label="Funding Injection Amount (Rs.)" type="number" value={contribAmount} onChange={setContribAmount} placeholder="Value to deduct from wallet balance" />
                <Input label="Secure Secret PIN Validation" type="password" value={pin} onChange={setPin} placeholder="••••" />
                <button type="submit" style={{ width:'100%', ...filled(C.g1, '12px') }}>Inject Sovereign Allocation</button>
              </form>
            </Card>
          )}
        </div>

        {/* ACTIVE GOALS PERFORMANCE LIST */}
        <div>
          <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 16px 0' }}>Sinking Vault Matrix Pipelines</h3>
          {goals.length === 0 ? (
            <div style={{ color:C.sub, fontStyle:'italic' }}>No active savings vectors initialized. Use the form to spin up a node pipeline.</div>
          ) : (
            goals.map(g => {
              const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
              return (
                <Card key={g.id} title={g.title} action={<span style={{ fontSize:12, fontWeight:700, color:C.g1, background:'rgba(16,185,129,0.12)', padding:'4px 10px', borderRadius:12 }}>{pct.toFixed(0)}% Vaulted</span>}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
                    <span style={{ color:C.sub }}>Current: <strong>Rs. {g.currentAmount.toLocaleString()}</strong></span>
                    <span style={{ color:C.sub }}>Target: Rs. {g.targetAmount.toLocaleString()}</span>
                  </div>
                  <ProgressBar value={g.currentAmount} max={g.targetAmount} color={C.g1} />
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ANALYTICS MODULE ────────────────────────────────────────
function AnalyticsScreen({ token }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/reports/spending', { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(setData);
  }, [token]);

  if(!data) return <div style={{ color:C.sub }}>Synthesizing category expense data pipelines...</div>;

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, marginBottom:30 }}>Vector Analytics Breakdown</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:24 }}>
        <Card title="Structural Outlay Ratios">
          {data.breakdown && data.breakdown.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {data.breakdown.map(b => {
                const catObj = CATEGORIES.find(c => c.id === b.category) || { icon:'💸', label:b.category, color:C.p2 };
                return (
                  <div key={b.category}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600 }}>
                        <span>{catObj.icon}</span> {catObj.label}
                      </span>
                      <span style={{ fontWeight:700 }}>Rs. {b._sum.amount.toLocaleString()}</span>
                    </div>
                    <ProgressBar value={b._sum.amount} max={data.totalSpent || 1} color={catObj.color} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color:C.sub, fontStyle:'italic' }}>No vector allocations discovered in structural history logs. Outlays display blank.</div>
          )}
        </Card>

        <Card title="System Ledger Macro Analysis">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
            <div style={glass({ padding:16, borderLeft:`4px solid ${C.p1}` })}>
              <div style={{ fontSize:12, color:C.sub }}>Gross Outflow Volume</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.text, marginTop:4 }}>Rs. {data.totalSpent?.toLocaleString() || 0}</div>
            </div>
            <div style={glass({ padding:16, borderLeft:`4px solid ${C.c1}` })}>
              <div style={{ fontSize:12, color:C.sub }}>Clearance Frequency Count</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.text, marginTop:4 }}>{data.transactionCount || 0} entries</div>
            </div>
          </div>
          <div style={{ padding:16, background:'rgba(255,255,255,0.02)', borderRadius:12, border:`1px solid ${C.border}`, fontSize:13, color:C.sub, lineHeight:1.6 }}>
            📊 Macro analytics parse real-time categorizations derived directly from transactional strings. This isolates velocity deviations before constraints break.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── AUDIT STATEMENTS / REPORTS SCREEN ────────────────────────
function ReportsScreen({ token }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState('30');

  useEffect(() => {
    fetch(`/api/reports/spending?days=${days}`, { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(setData);
  }, [token, days]);

  if(!data) return <div style={{ color:C.sub }}>Exporting fiscal transaction logs...</div>;

  return (
    <div style={{ maxWidth:800, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30 }}>
        <h1 style={{ fontSize:26, fontWeight:800, margin:0 }}>Sovereign Audit Statement</h1>
        <select value={days} onChange={e => setDays(e.target.value)} style={{ background:C.mid, color:C.text, border:`1px solid ${C.border}`, padding:'8px 16px', borderRadius:10, fontSize:13, outline:'none' }}>
          <option value="7">Trailing 7 Days Range</option>
          <option value="30">Trailing 30 Days Range</option>
          <option value="90">Trailing 90 Days Range</option>
        </select>
      </div>

      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${C.border}`, paddingBottom:20, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800 }}>SkolarPay Fiscal Verification Manifest</div>
            <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>Scope: Past {days} Days Ledger Execution Logs</div>
          </div>
          <button onClick={() => window.print()} style={ghost(C.pl, '6px 14px')}>Print Statement</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11, color:C.sub, textTransform:'uppercase' }}>Total Debit Outflows</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.r1, marginTop:2 }}>Rs. {data.totalSpent?.toLocaleString() || 0}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:C.sub, textTransform:'uppercase' }}>Clearing Events Issued</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.text, marginTop:2 }}>{data.transactionCount || 0} Logs</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:C.sub, textTransform:'uppercase' }}>Ledger Authentication Status</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.g1, marginTop:2 }}>VERIFIED ✓</div>
          </div>
        </div>

        <h4 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px 0' }}>Chronological Clearance Logs</h4>
        <div style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          {data.rawTransactions && data.rawTransactions.length > 0 ? (
            data.rawTransactions.map((t, idx) => (
              <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:idx%2===0?'rgba(255,255,255,0.01)':'transparent', borderBottom:idx===data.rawTransactions.length-1?'none':`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{t.description || 'System Allocation Transfer'}</div>
                  <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{new Date(t.createdAt).toLocaleDateString()} • Ref: {t.id.slice(-8).toUpperCase()}</div>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:C.text }}>Rs. {t.amount.toLocaleString()}</div>
              </div>
            ))
          ) : (
            <div style={{ padding:20, color:C.sub, textAlign:'center', fontSize:13 }}>No logs match constraints inside this calendar depth block.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── PROFILE / ACCOUNT SECURITY SCREEN ───────────────────────
function ProfileScreen({ user, token, onUpdate }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const handlePinChange = async (e) => {
    e.preventDefault();
    setErr(''); setSuccess('');
    if(newPin.length !== 4 || isNaN(newPin)) { setErr('New security PIN must be exactly 4 digits.'); return; }
    
    try {
      const res = await fetch('/api/parent/children', { // sharing same backend update pipeline
        method:'PATCH',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ current_pin: currentPin, new_pin: newPin, action:'UPDATE_PIN' })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Authentication credential block modification rejected');
      setSuccess('Vault authorization credentials successfully updated.');
      setCurrentPin(''); setNewPin('');
      if(onUpdate) onUpdate(token);
    } catch(e) { setErr(e.message); }
  };

  return (
    <div style={{ maxWidth:500, margin:'0 auto' }}>
      <h1 style={{ fontSize:26, fontWeight:800, marginBottom:30 }}>Account Node Security Settings</h1>
      
      <Card title="Node Credentials Profile">
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24, background:'rgba(255,255,255,0.02)', padding:16, borderRadius:12 }}>
          <div style={{ fontSize:13 }}><span style={{ color:C.sub }}>Actor Identity name:</span> <strong style={{ color:C.text }}>{user.name}</strong></div>
          <div style={{ fontSize:13 }}><span style={{ color:C.sub }}>Registered Network Line ID:</span> <strong style={{ color:C.text }}>{user.phone}</strong></div>
          <div style={{ fontSize:13 }}><span style={{ color:C.sub }}>System Authority Level:</span> <span style={{ color:user.role==='parent'?C.c1:C.p2, fontWeight:700, textTransform:'uppercase', fontSize:11 }}>{user.role} Authorization Node</span></div>
        </div>
      </Card>

      <Card title="Modify Encryption Key PIN">
        <Alert text={err} type="error" />
        <Alert text={success} type="success" />
        <form onSubmit={handlePinChange}>
          <Input label="Current Active Validation PIN" type="password" value={currentPin} onChange={setCurrentPin} placeholder="••••" />
          <Input label="New 4-Digit Encryption Key PIN" type="password" value={newPin} onChange={setNewPin} placeholder="••••" />
          <button type="submit" style={{ width:'100%', marginTop:10, ...filled(C.p1, '12px') }}>Update Fiduciary Signature PIN</button>
        </form>
      </Card>
    </div>
  );
}

// ─── PARENT MONITORING DASHBOARD MODULE ──────────────────────
function ParentDash({ token, user }) {
  const [children, setChildren] = useState([]);
  const [sendAmount, setSendAmount] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [selChildId, setSelChildId] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [activeAction, setActiveAction] = useState('send'); // send, limit, status

  const fetchChildren = useCallback(() => {
    fetch('/api/parent/children', { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if(d.children) setChildren(d.children); });
  }, [token]);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setSuccess('');
    if(!selGoalId) { /* keeping structural signature compatibility with older stubs */ }
    if(!selChildId) { setErr('Select an active student dependent node.'); return; }

    let payload = { child_id: selChildId, pin, action:'' };
    if(activeAction === 'send') {
      payload.action = 'SEND_POCKET_MONEY';
      payload.amount = parseFloat(sendAmount);
    } else if(activeAction === 'limit') {
      payload.action = 'SET_SPENDING_LIMIT';
      payload.amount = parseFloat(limitAmount);
    } else if(activeAction === 'status') {
      payload.action = 'TOGGLE_BLOCK_STATUS';
    }

    try {
      const res = await fetch('/api/parent/children', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if(!res.ok) throw new Error(resData.error || 'Fiduciary constraint command rejected');
      setSuccess('Instruction packet validated and synced to student database block.');
      setSendAmount(''); setLimitAmount(''); setPin('');
      fetchChildren();
    } catch(e) { setErr(e.message); }
  };

  return (
    <div>
      <div style={{ marginBottom:35 }}>
        <h1 style={{ margin:0, fontSize:28, fontWeight:800 }}>Guardian Command Console</h1>
        <div style={{ color:C.sub, fontSize:14, marginTop:4 }}>Authority Entity: {user.name}</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:24 }}>
        {/* DEPENDENT NODES STATUS LIST */}
        <div>
          <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 16px 0' }}>Linked Student Dependent Pipelines</h3>
          {children.length === 0 ? (
            <div style={{ color:C.sub, fontStyle:'italic' }}>No student accounts are currently linked with your parent line number identifier.</div>
          ) : (
            children.map(c => (
              <Card key={c.id} title={c.name} action={<span style={{ fontSize:11, fontWeight:700, color:c.isBlocked?C.r1:C.g1, background:c.isBlocked?'rgba(239,68,68,0.12)':'rgba(16,185,129,0.12)', padding:'4px 10px', borderRadius:12 }}>{c.isBlocked?'SPENDING LOCKED':'OPERATIONAL'}</span>}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginTop:10 }}>
                  <div>
                    <div style={{ fontSize:11, color:C.sub }}>Escrow Liquid Balance</div>
                    <div style={{ fontSize:16, fontWeight:700, color:C.text, marginTop:2 }}>Rs. {c.wallet?.balance || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:C.sub }}>Ceiling Constraint</div>
                    <div style={{ fontSize:16, fontWeight:700, color:C.p3, marginTop:2 }}>{c.wallet?.spendingLimit ? `Rs. ${c.wallet.spendingLimit}` : 'None Set'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:C.sub }}>Outflows Issued</div>
                    <div style={{ fontSize:16, fontWeight:700, color:C.c1, marginTop:2 }}>Rs. {c.spentThisMonth || 0}</div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* CONSTRAINT OVERRIDE CONTROL CENTER */}
        <div>
          <Card title="Fiduciary Directive Controls">
            <div style={{ display:'flex', gap:6, background:'rgba(255,255,255,0.02)', padding:4, borderRadius:10, marginBottom:20 }}>
              <button type="button" onClick={() => setActiveAction('send')} style={{ flex:1, padding:6, fontSize:12, fontWeight:600, border:'none', borderRadius:6, cursor:'pointer', background:activeAction==='send'?C.card:'transparent', color:activeAction==='send'?C.text:C.sub }}>Dispense Pocket Money</button>
              <button type="button" onClick={() => setActiveAction('limit')} style={{ flex:1, padding:6, fontSize:12, fontWeight:600, border:'none', borderRadius:6, cursor:'pointer', background:activeAction==='limit'?C.card:'transparent', color:activeAction==='limit'?C.text:C.sub }}>Impose Ceiling Cap</button>
              <button type="button" onClick={() => setActiveAction('status')} style={{ flex:1, padding:6, fontSize:12, fontWeight:600, border:'none', borderRadius:6, cursor:'pointer', background:activeAction==='status'?C.card:'transparent', color:activeAction==='status'?C.text:C.sub }}>Lock/Unlock Node</button>
            </div>

            <Alert text={err} type="error" />
            <Alert text={success} type="success" />

            {children.length > 0 ? (
              <form onSubmit={handleActionSubmit}>
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:C.sub, display:'block', marginBottom:6 }}>Target Student Node Pipeline</label>
                  <select value={selChildId} onChange={e => setSelChildId(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.04)', color:C.text, border:`1px solid ${C.border}`, padding:12, borderRadius:10, outline:'none' }}>
                    <option value="">-- Choose Target Node --</option>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>

                {activeAction === 'send' && <Input label="Disbursement Amount (Rs.)" type="number" value={sendAmount} onChange={setSendAmount} placeholder="Value to add to dependent node balance" />}
                {activeAction === 'limit' && <Input label="Monthly Outflow Ceiling Cap (Rs.)" type="number" value={limitAmount} onChange={setLimitAmount} placeholder="Enter ceiling constraint threshold value" />}
                {activeAction === 'status' && (
                  <div style={{ fontSize:13, color:C.sub, padding:14, background:'rgba(255,255,255,0.01)', borderRadius:10, border:`1px solid ${C.border}`, marginBottom:16 }}>
                    ℹ️ Executing this packet instructions swaps the current operational state of the target student wallet between active and locked.
                  </div>
                )}

                <Input label="Secure Secret Guardian PIN Verification" type="password" value={pin} onChange={setPin} placeholder="••••" />
                <button type="submit" style={{ width:'100%', marginTop:10, ...filled(activeAction==='status'?C.r1 : activeAction==='limit'?C.p2 : C.c1, '13px') }}>
                  {activeAction === 'send' ? 'Execute Sovereign Transfer' : activeAction === 'limit' ? 'Impose Ceiling Packet' : 'Toggle Operational Privilege'}
                </button>
              </form>
            ) : (
              <div style={{ fontSize:12, color:C.sub, fontStyle:'italic' }}>No targets available to accept instruction flags.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── PARENT REPORTS MODULE ────────────────────────────────────
function ParentReports({ token }) {
  const [reports, setReports] = useState([]);
  useEffect(() => {
    fetch('/api/parent/children?action=GET_REPORTS', { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if(d.reports) setReports(d.reports); });
  }, [token]);

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, marginBottom:30 }}>Linked Account Audit Pipelines</h1>
      <Card title="Structural Outflow Reports — Dependent Ecosystem">
        {reports.length === 0 ? (
          <div style={{ color:C.sub, fontStyle:'italic' }}>No transaction data blocks have compiled from matching child nodes yet.</div>
        ) : (
          reports.map(r => (
            <div key={r.childId} style={{ marginBottom:25, borderBottom:`1px solid ${C.border}`, paddingBottom:20 }}>
              <h4 style={{ margin:'0 0 10px 0', fontSize:15, color:C.text }}>Log Tracking Stream for: {r.name}</h4>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:20 }}>
                <div style={glass({ padding:14 })}>
                  <div style={{ fontSize:11, color:C.sub }}>Gross Expenditures Vol</div>
                  <div style={{ fontSize:20, fontWeight:800, color:C.r1, marginTop:4 }}>Rs. {r.totalSpent?.toLocaleString() || 0}</div>
                </div>
                <div style={glass({ padding:14 })}>
                  <div style={{ fontSize:11, color:C.sub }}>Active Transaction Logs Trace</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                    {r.transactions && r.transactions.length > 0 ? (
                      r.transactions.map(t => (
                        <div key={t.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                          <span style={{ color:C.sub }}>{t.description || 'Outflow Clearance'}</span>
                          <span style={{ fontWeight:700 }}>Rs. {t.amount}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontStyle:'italic', color:C.sub, fontSize:11 }}>No transactional outlays logged.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

// ─── ATOMIC SHARED INTERFACE REUSABLE PARTS ───────────────────
function ProgressBar({ value, max, color }) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width:'100%', height:8, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
      <div style={{ width:`${percentage}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
    </div>
  );
}

function TransactionList({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return <div style={{ color:C.sub, fontStyle:'italic', padding:10, fontSize:13 }}>No cryptographic clearances found on ledger line.</div>;
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {transactions.map(t => {
        const matchingCat = CATEGORIES.find(c => c.id === t.category) || { icon:'💸', color:C.p3, label:t.category || 'Transfer' };
        return (
          <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.01)', padding:12, borderRadius:12, border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:'rgba(255,255,255,0.03)', display:'flex', justifyContent:'center', alignItems:'center', fontSize:16, border:`1px solid ${C.border}` }}>{matchingCat.icon}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{t.description || `${matchingCat.label} Outflow`}</div>
                <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{new Date(t.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:C.text }}>Rs. {t.amount.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}

function NotificationsBox({ token }) {
  const [alerts, setAlerts] = useState([]);
  const fetchAlerts = useCallback(() => {
    fetch('/api/notifications', { headers:{ 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if(d.notifications) setAlerts(d.notifications); });
  }, [token]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const clearAlerts = async () => {
    await fetch('/api/notifications', { method:'PATCH', headers:{ 'Authorization': `Bearer ${token}` } });
    fetchAlerts();
  };

  return (
    <Card title="System Telemetry Alerts" action={alerts.length > 0 && <button onClick={clearAlerts} style={{ background:'none', border:'none', color:C.sub, fontSize:11, cursor:'pointer', fontWeight:600 }}>Clear Streams</button>}>
      {alerts.length === 0 ? (
        <div style={{ fontSize:12, color:C.sub, fontStyle:'italic' }}>Ecosystem runtime telemetry quiet. No active alerts flagged.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:200, overflowY:'auto' }}>
          {alerts.map(a => (
            <div key={a.id} style={{ background:a.type==='CRITICAL'?'rgba(239,68,68,0.06)':'rgba(245,158,11,0.06)', border:`1px solid ${a.type==='CRITICAL'?C.r1:C.a1}`, padding:10, borderRadius:10, fontSize:12 }}>
              <div style={{ fontWeight:700, color:a.type==='CRITICAL'?C.r1:C.a1, display:'flex', gap:6, alignItems:'center', marginBottom:2 }}>
                <span>{a.type==='CRITICAL'?'🚨 SYSTEM IMPOSING LIMIT':'⚠️ CONSTRAINT RE-ROUTE ALERT'}</span>
              </div>
              <div style={{ color:C.text, lineHeight:1.4 }}>{a.message}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}