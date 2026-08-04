import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Trade, Account } from "./types";
import { TradeScreenshotModal } from "./components/TradeScreenshotModal";
import { RoutineTracker } from "./components/RoutineTracker";
import { TradeCalendar } from "./components/TradeCalendar";
import { DailyQuoteBanner } from "./components/DailyQuoteBanner";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";

const STRATEGIES = ["Breakout","Pullback","Reversal","Momentum","Scalp","Swing","News","FVG","SMC","Volume","Liquidity","Other"];
const SESSIONS = ["Asian","London","New York","London/NY Overlap","Other"];
const TRADES_KEY = "tj_trades_v2";
const ACCOUNTS_KEY = "tj_accounts_v1";

const C = {
  border: "#1f2937", text: "#e5e7eb", muted: "#9ca3af", header: "#0d0d0f",
  headerText: "#9ca3af", blue: "#6366f1", blueSoft: "rgba(99, 102, 241, 0.15)", green: "#10b981",
  red: "#f87171", amber: "#f59e0b", amberSoft: "rgba(245, 158, 11, 0.15)",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtMoney = (n: number) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate = (d: string) => new Date(d+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"2-digit",year:"2-digit"});
const clampPct = (n: number) => Math.max(0, Math.min(100, n));

function compressImage(file: File, maxWidth = 1200, maxHeight = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function computePnL(t: Trade){ const g = t.direction==="long" ? (t.exit-t.entry)*t.qty : (t.entry-t.exit)*t.qty; return g-(t.fees||0); }
function computeR(t: Trade,pnl: number){ if(!t.stop || t.stop===t.entry) return null; const risk=Math.abs(t.entry-t.stop)*t.qty; if(risk<=0) return null; return pnl/risk; }
function computePlannedR(t: Trade){ if(t.stop==null||t.takeProfit==null||t.stop===t.entry) return null; const risk=Math.abs(t.entry-t.stop); const reward=Math.abs(t.takeProfit-t.entry); if(risk<=0) return null; return reward/risk; }

function computePropStats(account: Account | null, accountTrades: Trade[]) {
  if (!account) return null;
  const sorted = [...accountTrades].sort((a,b)=>a.date.localeCompare(b.date));
  let runningBalance = account.startingBalance;
  let peakBalance = account.startingBalance;
  let maxDrawdownAmount = 0;
  const dailyAgg: Record<string, { pnl: number; startBalance: number; endBalance?: number }> = {};
  const dailyOrder: string[] = [];
  sorted.forEach(t => {
    const pnlVal = t.pnl || 0;
    if (!dailyAgg[t.date]) { dailyAgg[t.date] = { pnl: 0, startBalance: runningBalance }; dailyOrder.push(t.date); }
    runningBalance += pnlVal;
    dailyAgg[t.date].pnl += pnlVal;
    dailyAgg[t.date].endBalance = runningBalance;
    if (runningBalance > peakBalance) peakBalance = runningBalance;
    const dd = peakBalance - runningBalance;
    if (dd > maxDrawdownAmount) maxDrawdownAmount = dd;
  });
  const currentBalance = runningBalance;
  const currentDrawdown = Math.max(0, peakBalance - currentBalance);
  const maxDlBasisAmount = account.maxDlBasis === "trailing" ? peakBalance : account.startingBalance;
  const maxDlAllowed = account.maxDlPct ? maxDlBasisAmount * (account.maxDlPct/100) : null;
  const maxDlBreached = maxDlAllowed != null && currentDrawdown > maxDlAllowed;
  const dailyLossLimit = account.ddlPct ? account.startingBalance * (account.ddlPct/100) : null;
  const dailyBreaches: Array<{date: string, lossUsed: number}> = [];
  dailyOrder.forEach(date => {
    const day = dailyAgg[date];
    const lossUsed = Math.max(0, -day.pnl);
    if (dailyLossLimit != null && lossUsed > dailyLossLimit) dailyBreaches.push({date, lossUsed});
  });
  const todayStr = new Date().toISOString().slice(0,10);
  const today = dailyAgg[todayStr] || { pnl: 0 };
  const todayLossUsed = Math.max(0, -today.pnl);
  const profitTargetAmount = account.profitTargetPct ? account.startingBalance*(account.profitTargetPct/100) : null;
  const profitProgressAmount = currentBalance - account.startingBalance;
  return { currentBalance, peakBalance, currentDrawdown, maxDrawdownAmount, dailyLossLimit, todayLossUsed, dailyBreaches, maxDlAllowed, maxDlBreached, profitTargetAmount, profitProgressAmount };
}

const emptyForm = { date: new Date().toISOString().slice(0,10), symbol:"", direction:"long" as const, entry:"", exit:"", qty:"", stop:"", takeProfit:"", fees:"", strategies:[] as string[], session:"", notes:"", imageUrl:"" };
const emptyAccountForm = { name:"", type:"personal", startingBalance:"10000", ddlPct:"", maxDlPct:"", profitTargetPct:"", maxDlBasis:"initial", phase:"" };

function pctColor(pct: number){ if(pct>=90) return C.red; if(pct>=70) return C.amber; return C.blue; }

const Icon = ({ path, size=14, ...p }: { path: React.ReactNode, size?: number, [key: string]: any }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{path}</svg>
);
const IconPlus = (p: any) => <Icon {...p} path={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />;
const IconX = (p: any) => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const IconTrash = (p: any) => <Icon {...p} path={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>} />;
const IconPencil = (p: any) => <Icon {...p} path={<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>} />;
const IconDownload = (p: any) => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />;
const IconCheck = (p: any) => <Icon {...p} path={<polyline points="20 6 9 17 4 12"/>} />;
const IconArrowUpDown = (p: any) => <Icon {...p} path={<><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></>} />;
const IconTrendUp = (p: any) => <Icon {...p} path={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>} />;
const IconTarget = (p: any) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>} />;
const IconPercent = (p: any) => <Icon {...p} path={<><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></>} />;
const IconWallet = (p: any) => <Icon {...p} path={<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></>} />;
const IconFlame = (p: any) => <Icon {...p} path={<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>} />;
const IconSnow = (p: any) => <Icon {...p} path={<><line x1="12" y1="2" x2="12" y2="22"/><line x1="17.5" y1="4.5" x2="6.5" y2="19.5"/><line x1="20" y1="9" x2="4" y2="15"/><line x1="4" y1="9" x2="20" y2="15"/><line x1="6.5" y1="4.5" x2="17.5" y2="19.5"/></>} />;
const IconShieldAlert = (p: any) => <Icon {...p} path={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>} />;
const IconGauge = (p: any) => <Icon {...p} path={<><circle cx="12" cy="12" r="9"/><line x1="12" y1="12" x2="15.5" y2="8.5"/><line x1="12" y1="12" x2="12" y2="7" opacity="0"/></>} />;
const IconCamera = (p: any) => <Icon {...p} path={<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>} />;

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive?: boolean | null;
  neutral?: boolean;
}

function StatCard({ icon, label, value, positive, neutral }: StatCardProps) {
  const color = neutral ? C.text : positive ? C.green : C.red;
  return (
    <div className="tj-card">
      <div style={{display:"flex",alignItems:"center",gap:6,color:C.muted,marginBottom:8}}>{icon}<span className="tj-label" style={{margin:0}}>{label}</span></div>
      <div className="tj-mono" style={{fontSize:20,fontWeight:600,color}}>{value}</div>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <th className="tj-th" onClick={onClick} style={{padding:"10px 12px"}}><span style={{display:"inline-flex",alignItems:"center",gap:4}}>{children}<IconArrowUpDown size={11}/></span></th>;
}

interface EquityPoint {
  idx: number;
  equity: number;
}

function ProgressChart({ data }: { data: EquityPoint[] }) {
  const w = 760, h = 240, pad = { l: 54, r: 16, t: 14, b: 28 };
  if (!data.length) return null;
  const xs = data.map(d => d.idx), ys = data.map(d => d.equity);
  const minY = Math.min(0, ...ys), maxY = Math.max(0, ...ys);
  const spanY = (maxY - minY) || 1;
  const spanX = (Math.max(...xs) - Math.min(...xs)) || 1;
  const px = (x: number) => pad.l + ((x - Math.min(...xs)) / spanX) * (w - pad.l - pad.r);
  const py = (y: number) => pad.t + (1 - (y - minY) / spanY) * (h - pad.t - pad.b);
  const linePts = data.map(d => `${px(d.idx)},${py(d.equity)}`).join(" ");
  const areaPts = `${px(data[0].idx)},${py(0)} ` + linePts + ` ${px(data[data.length-1].idx)},${py(0)}`;
  const zeroY = py(0);
  const ticksY = 4;
  const yTickVals = Array.from({length: ticksY+1}, (_,i) => minY + (spanY/ticksY)*i);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:260}}>
      <defs>
        <linearGradient id="tjFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.blue} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={C.blue} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {yTickVals.map((v,i) => (
        <g key={i}>
          <line x1={pad.l} x2={w-pad.r} y1={py(v)} y2={py(v)} stroke={C.border} strokeDasharray="3 3" />
          <text x={pad.l-8} y={py(v)+3} textAnchor="end" fontSize="10" fill={C.muted} fontFamily="IBM Plex Mono, monospace">${Math.round(v)}</text>
        </g>
      ))}
      <line x1={pad.l} x2={w-pad.r} y1={zeroY} y2={zeroY} stroke={C.border} />
      <polygon points={areaPts} fill="url(#tjFill)" />
      <polyline points={linePts} fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d,i) => <circle key={i} cx={px(d.idx)} cy={py(d.equity)} r="3" fill={C.blue} />)}
      <text x={pad.l} y={h-4} fontSize="10" fill={C.muted}>Trade 1</text>
      <text x={w-pad.r} y={h-4} fontSize="10" fill={C.muted} textAnchor="end">Trade {data.length}</text>
    </svg>
  );
}

function DonutChart({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses || 1;
  const r = 52, cx = 70, cy = 70, stroke = 20;
  const circumference = 2 * Math.PI * r;
  const winLen = (wins/total) * circumference;
  return (
    <svg viewBox="0 0 140 140" style={{width:"100%",maxWidth:180,display:"block",margin:"0 auto"}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.blue} strokeWidth={stroke}
        strokeDasharray={`${winLen} ${circumference-winLen}`} strokeDashoffset={circumference*0.25} transform={`rotate(-90 ${cx} ${cy})`} />
    </svg>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"journal" | "routines">("journal");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);

  const [activeModalTrade, setActiveModalTrade] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);

  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterDir, setFilterDir] = useState("all");
  const [filterStrategy, setFilterStrategy] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let loadedAccounts: Account[] = [];
    let loadedTrades: Trade[] = [];
    try { const raw = localStorage.getItem(ACCOUNTS_KEY); if (raw) loadedAccounts = JSON.parse(raw); } catch(e) {}
    try { const raw = localStorage.getItem(TRADES_KEY); if (raw) loadedTrades = JSON.parse(raw); } catch(e) {}
    if (loadedAccounts.length === 0) {
      loadedAccounts = [{ id:"acc_default", name:"Personal", type:"personal", startingBalance:10000, ddlPct:null, maxDlPct:null, profitTargetPct:null, maxDlBasis:"initial", phase:"" }];
    }
    const migratedTrades = loadedTrades.map(t => ({
      ...t, accountId: t.accountId || loadedAccounts[0].id,
      strategies: Array.isArray(t.strategies) ? t.strategies : (t.strategy ? [t.strategy] : []),
      takeProfit: t.takeProfit === undefined ? null : t.takeProfit,
      session: t.session || "",
      imageUrl: t.imageUrl || "",
    }));
    setAccounts(loadedAccounts);
    setActiveAccountId(loadedAccounts[0].id);
    setTrades(migratedTrades as Trade[]);
    setLoaded(true);
  }, []);

  useEffect(() => { if (!loaded) return; try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch(e){ setError("Could not save accounts."); } }, [accounts, loaded]);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem(TRADES_KEY, JSON.stringify(trades)); } catch(e){ setError("Could not save trades."); } }, [trades, loaded]);

  const activeAccount = useMemo(() => accounts.find(a => a.id === activeAccountId) || null, [accounts, activeAccountId]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); };
  const toggleFormStrategy = (s: string) => setForm(p => ({...p, strategies: p.strategies.includes(s) ? p.strategies.filter(x=>x!==s) : [...p.strategies, s]}));

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm((prev) => ({ ...prev, imageUrl: compressed }));
    } catch (err) {
      setError("Failed to process image file.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(form.entry), exit = parseFloat(form.exit), qty = parseFloat(form.qty);
    if (!form.symbol.trim() || isNaN(entry) || isNaN(exit) || isNaN(qty) || qty<=0) { setError("Symbol, entry, exit, and a positive quantity are required."); return; }
    setError("");
    const payload: Trade = {
      id: editingId || uid(), accountId: activeAccountId || "acc_default", date: form.date, symbol: form.symbol.trim().toUpperCase(), direction: form.direction,
      entry, exit, qty, stop: form.stop==="" ? null : parseFloat(form.stop), takeProfit: form.takeProfit==="" ? null : parseFloat(form.takeProfit),
      fees: form.fees==="" ? 0 : parseFloat(form.fees), strategies: form.strategies.length ? form.strategies : ["Other"], session: form.session||"", notes: form.notes.trim(),
      imageUrl: form.imageUrl || "",
    };
    setTrades(prev => editingId ? prev.map(t => t.id===editingId ? payload : t) : [...prev, payload]);
    resetForm();
  };

  const startEdit = (t: Trade) => {
    setForm({ date:t.date, symbol:t.symbol, direction:t.direction, entry:String(t.entry), exit:String(t.exit), qty:String(t.qty),
      stop: t.stop==null?"":String(t.stop), takeProfit: t.takeProfit==null?"":String(t.takeProfit), fees:String(t.fees||0), strategies:t.strategies||[], session:t.session||"", notes:t.notes||"", imageUrl: t.imageUrl||"" });
    setEditingId(t.id); setFormOpen(true);
  };
  const promptDeleteTrade = (t: Trade) => setTradeToDelete(t);

  const resetAccountForm = () => { setAccountForm(emptyAccountForm); setEditingAccountId(null); setAccountFormOpen(false); };
  const startEditAccount = (a: Account) => {
    setAccountForm({ name:a.name, type:a.type, startingBalance:String(a.startingBalance),
      ddlPct: a.ddlPct==null?"":String(a.ddlPct), maxDlPct: a.maxDlPct==null?"":String(a.maxDlPct),
      profitTargetPct: a.profitTargetPct==null?"":String(a.profitTargetPct), maxDlBasis: a.maxDlBasis||"initial", phase: a.phase||"" });
    setEditingAccountId(a.id); setAccountFormOpen(true);
  };
  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startingBalance = parseFloat(accountForm.startingBalance);
    if (!accountForm.name.trim() || isNaN(startingBalance) || startingBalance<=0) { setError("Account name and a positive starting balance are required."); return; }
    setError("");
    const payload: Account = { id: editingAccountId || uid(), name: accountForm.name.trim(), type: accountForm.type, startingBalance,
      ddlPct: accountForm.ddlPct===""?null:parseFloat(accountForm.ddlPct), maxDlPct: accountForm.maxDlPct===""?null:parseFloat(accountForm.maxDlPct),
      profitTargetPct: accountForm.profitTargetPct===""?null:parseFloat(accountForm.profitTargetPct), maxDlBasis: accountForm.maxDlBasis, phase: accountForm.phase };
    if (editingAccountId) setAccounts(prev => prev.map(a => a.id===editingAccountId ? payload : a));
    else { setAccounts(prev => [...prev, payload]); setActiveAccountId(payload.id); }
    resetAccountForm();
  };
  const deleteAccount = (id: string) => {
    if (accounts.length<=1) return;
    if (!window.confirm("Delete this account and all its logged trades? This can't be undone.")) return;
    setAccounts(prev => { const next = prev.filter(a=>a.id!==id); if (activeAccountId===id) setActiveAccountId(next[0].id); return next; });
    setTrades(prev => prev.filter(t=>t.accountId!==id));
  };

  const accountTrades = useMemo(() => trades.filter(t=>t.accountId===activeAccountId), [trades, activeAccountId]);
  const enriched = useMemo(() => accountTrades.map(t => { const pnl = computePnL(t); return {...t, pnl, r: computeR(t,pnl), plannedR: computePlannedR(t)}; }), [accountTrades]);

  const stats = useMemo(() => {
    if (!enriched.length) return null;
    const sorted = [...enriched].sort((a,b)=>a.date.localeCompare(b.date));
    const wins = enriched.filter(t=>t.pnl>0), losses = enriched.filter(t=>t.pnl<=0);
    const totalPnL = enriched.reduce((s,t)=>s+(t.pnl||0),0);
    const winRate = (wins.length/enriched.length)*100;
    const grossWin = wins.reduce((s,t)=>s+(t.pnl||0),0), grossLoss = Math.abs(losses.reduce((s,t)=>s+(t.pnl||0),0));
    const profitFactor = grossLoss>0 ? grossWin/grossLoss : (wins.length?Infinity:0);
    const expectancy = totalPnL/enriched.length;
    const best = enriched.reduce((a,b)=>(b.pnl||0)>(a.pnl||0)?b:a, enriched[0]);
    const worst = enriched.reduce((a,b)=>(b.pnl||0)<(a.pnl||0)?b:a, enriched[0]);
    const byDateDesc = [...enriched].sort((a,b)=>b.date.localeCompare(a.date));
    let streak=0, streakType: boolean | null = null;
    for (const t of byDateDesc) { const isWin=(t.pnl||0)>0; if(streakType===null){streakType=isWin;streak=1;} else if(isWin===streakType) streak++; else break; }
    let cum=0;
    const equity = sorted.map((t,i)=>{ cum+=(t.pnl||0); return {idx:i+1, equity: Math.round(cum*100)/100}; });
    const byStrategy: Record<string, { strategy: string; count: number; wins: number; pnl: number }> = {};
    enriched.forEach(t => (t.strategies&&t.strategies.length?t.strategies:["Other"]).forEach(s => {
      if(!byStrategy[s]) byStrategy[s]={strategy:s,count:0,wins:0,pnl:0};
      byStrategy[s].count++; byStrategy[s].pnl+=(t.pnl||0); if((t.pnl||0)>0) byStrategy[s].wins++;
    }));
    return {totalPnL, winRate, profitFactor, expectancy, best, worst, streak, streakType, equity, byStrategy: Object.values(byStrategy).sort((a,b)=>b.pnl-a.pnl), wins: wins.length, losses: losses.length};
  }, [enriched]);

  const propStats = useMemo(() => computePropStats(activeAccount, enriched), [activeAccount, enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filterDir!=="all") list = list.filter(t=>t.direction===filterDir);
    if (filterStrategy!=="all") list = list.filter(t=>(t.strategies||[]).includes(filterStrategy));
    if (search.trim()) list = list.filter(t=>t.symbol.includes(search.trim().toUpperCase()));
    const dir = sortDir==="asc"?1:-1;
    return [...list].sort((a,b)=>{
      if (sortKey==="pnl") return ((a.pnl||0)-(b.pnl||0))*dir;
      if (sortKey==="symbol") return a.symbol.localeCompare(b.symbol)*dir;
      return a.date.localeCompare(b.date)*dir;
    });
  }, [enriched, filterDir, filterStrategy, search, sortKey, sortDir]);

  const toggleSort = (key: string) => { if (sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortKey(key); setSortDir("desc"); } };

  const exportCSV = useCallback(() => {
    const headers = ["date","symbol","direction","entry","exit","qty","stop","takeProfit","fees","pnl","r","plannedR","strategies","session","notes"];
    const rows = enriched.map(t => headers.map(h => {
      if (h==="r") return t.r==null ? "" : t.r.toFixed(2);
      if (h==="plannedR") return t.plannedR==null ? "" : t.plannedR.toFixed(2);
      if (h==="strategies") return `"${(t.strategies||[]).join(";")}"`;
      return t[h as keyof Trade] ?? "";
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`${(activeAccount?.name||"trading-journal").replace(/\s+/g,"-").toLowerCase()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [enriched, activeAccount]);

  const tickerItems = stats ? [
    `TOTAL P/L ${fmtMoney(stats.totalPnL)}`, `WIN RATE ${stats.winRate.toFixed(1)}%`,
    `PROFIT FACTOR ${stats.profitFactor===Infinity?"∞":stats.profitFactor.toFixed(2)}`,
    `EXPECTANCY ${fmtMoney(stats.expectancy)}`, `${stats.streakType?"WIN":"LOSS"} STREAK x${stats.streak}`, `TRADES ${enriched.length}`,
  ] : ["LOG YOUR FIRST TRADE TO START TRACKING YOUR PROGRESS"];

  const donutData = stats ? { wins: stats.wins, losses: stats.losses } : { wins:0, losses:0 };

  if (!loaded) return null;

  return (
    <div style={{minHeight:"100vh"}}>
      {/* Top Header */}
      <div style={{background:C.header}}>
        <div style={{maxWidth:1180, margin:"0 auto", padding:"18px 24px 0"}}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h1 className="tj-display" style={{fontSize:26,fontWeight:700,letterSpacing:"-0.01em",margin:0,color:"#FFFFFF"}}>
                Trading & Daily Habit Hub
              </h1>
              <p style={{color:"#9ca3af",fontSize:13,marginTop:4,marginBottom:16}}>
                Log trades with screenshots, enforce prop risk limits, and track boxing & study routines.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: "8px", background: "#111114", padding: "4px", borderRadius: "10px", border: "1px solid #1f2937" }}>
              <button
                className={`tj-focus-visible`}
                onClick={() => setActiveTab("journal")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "journal" ? "#4f46e5" : "transparent",
                  color: activeTab === "journal" ? "#fff" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>📊</span> Trading Journal
              </button>

              <button
                className={`tj-focus-visible`}
                onClick={() => setActiveTab("routines")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "routines" ? "#4f46e5" : "transparent",
                  color: activeTab === "routines" ? "#fff" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🥊</span> Daily Routines & Ticks
              </button>
            </div>
          </div>
        </div>

        {/* Ticker Bar */}
        <div style={{borderTop:`1px solid ${C.border}`, overflow:"hidden", padding:"9px 0"}}>
          <div className="tj-tape-track tj-mono" style={{fontSize:12.5,color:C.headerText,fontWeight:500}}>
            {[...tickerItems,...tickerItems,...tickerItems].map((item,i)=>(
              <span key={i} style={{marginRight:40}}>{item}<span style={{color:"#27272a",marginLeft:40}}>•</span></span>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1180, margin:"0 auto", padding:"24px 24px 60px"}}>
        <DailyQuoteBanner />

        {activeTab === "routines" ? (
          <RoutineTracker />
        ) : (
          <>
            {/* Accounts Bar */}
            <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4,marginBottom:18}}>
              {accounts.map(a => (
                <div key={a.id} className={`tj-acc-pill ${a.id===activeAccountId?"active":""}`} onClick={()=>setActiveAccountId(a.id)}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{a.name}</div>
                    <div style={{display:"flex",gap:5,marginTop:2}}>
                      <span className="tj-badge" style={{background:a.type==="prop"?C.blueSoft:"#1f2937", color:a.type==="prop"?C.blue:C.muted}}>{a.type==="prop"?"Prop firm":"Personal"}</span>
                      {a.phase && <span className="tj-badge" style={{background:C.amberSoft,color:C.amber}}>{a.phase}</span>}
                    </div>
                  </div>
                  {a.id===activeAccountId && (
                    <div style={{display:"flex",gap:4,marginLeft:4}}>
                      <button onClick={(e)=>{e.stopPropagation();startEditAccount(a);}} className="tj-focus-visible" style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:2}} title="Edit account"><IconPencil size={12}/></button>
                      {accounts.length>1 && <button onClick={(e)=>{e.stopPropagation();deleteAccount(a.id);}} className="tj-focus-visible" style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:2}} title="Delete account"><IconTrash size={12}/></button>}
                    </div>
                  )}
                </div>
              ))}
              <button className="tj-btn tj-btn-ghost tj-focus-visible" style={{flexShrink:0}} onClick={()=>{resetAccountForm();setAccountFormOpen(true);}}><IconPlus/> New account</button>
            </div>

            {accountFormOpen && (
              <form onSubmit={handleAccountSubmit} className="tj-card" style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <h2 className="tj-display" style={{fontSize:16,margin:0}}>{editingAccountId?"Edit account":"New account"}</h2>
                  <button type="button" onClick={resetAccountForm} className="tj-focus-visible" style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><IconX size={18}/></button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:12}}>
                  <div><label className="tj-label">Account name</label><input className="tj-input" placeholder="FTMO 100k Challenge" value={accountForm.name} onChange={e=>setAccountForm({...accountForm,name:e.target.value})} required/></div>
                  <div><label className="tj-label">Type</label>
                    <select className="tj-input" value={accountForm.type} onChange={e=>setAccountForm({...accountForm,type:e.target.value})}>
                      <option value="personal">Personal</option><option value="prop">Prop firm</option>
                    </select>
                  </div>
                  <div><label className="tj-label">Starting balance</label><input className="tj-input" type="number" step="any" placeholder="10000" value={accountForm.startingBalance} onChange={e=>setAccountForm({...accountForm,startingBalance:e.target.value})} required/></div>
                  {accountForm.type==="prop" && (
                    <>
                      <div><label className="tj-label">Phase</label>
                        <select className="tj-input" value={accountForm.phase} onChange={e=>setAccountForm({...accountForm,phase:e.target.value})}>
                          <option value="">—</option><option value="Evaluation">Evaluation</option><option value="Verification">Verification</option><option value="Funded">Funded</option>
                        </select>
                      </div>
                      <div><label className="tj-label">Daily drawdown limit % (DDL)</label><input className="tj-input" type="number" step="any" placeholder="e.g. 5" value={accountForm.ddlPct} onChange={e=>setAccountForm({...accountForm,ddlPct:e.target.value})}/></div>
                      <div><label className="tj-label">Max drawdown limit % (Max DL)</label><input className="tj-input" type="number" step="any" placeholder="e.g. 10" value={accountForm.maxDlPct} onChange={e=>setAccountForm({...accountForm,maxDlPct:e.target.value})}/></div>
                      <div><label className="tj-label">Max DL basis</label>
                        <select className="tj-input" value={accountForm.maxDlBasis} onChange={e=>setAccountForm({...accountForm,maxDlBasis:e.target.value})}>
                          <option value="initial">Static (from initial balance)</option><option value="trailing">Trailing (from peak balance)</option>
                        </select>
                      </div>
                      <div><label className="tj-label">Profit target %</label><input className="tj-input" type="number" step="any" placeholder="e.g. 8" value={accountForm.profitTargetPct} onChange={e=>setAccountForm({...accountForm,profitTargetPct:e.target.value})}/></div>
                    </>
                  )}
                </div>
                <div style={{marginTop:14,display:"flex",gap:8}}>
                  <button type="submit" className="tj-btn tj-btn-primary tj-focus-visible">{editingAccountId?"Save account":"Create account"}</button>
                  <button type="button" onClick={resetAccountForm} className="tj-btn tj-btn-ghost tj-focus-visible">Cancel</button>
                </div>
              </form>
            )}

            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:20}}>
              <button className="tj-btn tj-btn-ghost tj-focus-visible" onClick={exportCSV} disabled={!enriched.length} style={{opacity:enriched.length?1:0.4}}><IconDownload/> Export CSV</button>
              <button className="tj-btn tj-btn-primary tj-focus-visible" onClick={()=>{setFormOpen(v=>!v); if(formOpen) resetForm();}}><IconPlus/> {editingId?"Editing…":"Add trade"}</button>
            </div>

            {error && <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",color:C.red,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:16}}>{error}</div>}

            {/* Trade Log Form */}
            {formOpen && (
              <form onSubmit={handleSubmit} className="tj-card" style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <h2 className="tj-display" style={{fontSize:16,margin:0}}>{editingId?"Edit trade":"New trade"} <span style={{fontSize:12,color:C.muted,fontWeight:400}}>· {activeAccount?.name}</span></h2>
                  <button type="button" onClick={resetForm} className="tj-focus-visible" style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><IconX size={18}/></button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:12}}>
                  <div><label className="tj-label">Date</label><input className="tj-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></div>
                  <div><label className="tj-label">Symbol</label><input className="tj-input" placeholder="AAPL" value={form.symbol} onChange={e=>setForm({...form,symbol:e.target.value})} required/></div>
                  <div><label className="tj-label">Direction</label>
                    <select className="tj-input" value={form.direction} onChange={e=>setForm({...form,direction:e.target.value as "long"|"short"})}>
                      <option value="long">Long</option><option value="short">Short</option>
                    </select>
                  </div>
                  <div><label className="tj-label">Entry price</label><input className="tj-input" type="number" step="any" placeholder="0.00" value={form.entry} onChange={e=>setForm({...form,entry:e.target.value})} required/></div>
                  <div><label className="tj-label">Exit price</label><input className="tj-input" type="number" step="any" placeholder="0.00" value={form.exit} onChange={e=>setForm({...form,exit:e.target.value})} required/></div>
                  <div><label className="tj-label">Quantity</label><input className="tj-input" type="number" step="any" placeholder="0" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} required/></div>
                  <div><label className="tj-label">Stop loss (optional)</label><input className="tj-input" type="number" step="any" placeholder="For R-multiple" value={form.stop} onChange={e=>setForm({...form,stop:e.target.value})}/></div>
                  <div><label className="tj-label">Take profit (optional)</label><input className="tj-input" type="number" step="any" placeholder="Planned target" value={form.takeProfit} onChange={e=>setForm({...form,takeProfit:e.target.value})}/></div>
                  <div><label className="tj-label">Fees (optional)</label><input className="tj-input" type="number" step="any" placeholder="0.00" value={form.fees} onChange={e=>setForm({...form,fees:e.target.value})}/></div>
                  <div><label className="tj-label">Session (optional)</label>
                    <select className="tj-input" value={form.session} onChange={e=>setForm({...form,session:e.target.value})}>
                      <option value="">—</option>{SESSIONS.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{marginTop:14}}>
                  <label className="tj-label">Strategies (select all that apply)</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {STRATEGIES.map(s => {
                      const active = form.strategies.includes(s);
                      return (
                        <div key={s} className={`tj-chip tj-focus-visible ${active?"active":""}`} role="checkbox" aria-checked={active} tabIndex={0}
                          onClick={()=>toggleFormStrategy(s)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggleFormStrategy(s);}}}>
                          <span className="tj-chip-box">{active && <IconCheck size={10} color="#fff"/>}</span>{s}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Screenshot Upload / Image URL Input */}
                <div style={{marginTop:14}}>
                  <label className="tj-label">Trade Chart Screenshot (Optional)</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 240px" }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        style={{ display: "none" }}
                        id="trade-screenshot-file"
                      />
                      <label
                        htmlFor="trade-screenshot-file"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          padding: "10px 14px",
                          borderRadius: "7px",
                          border: "1px dashed #374151",
                          background: "#16161a",
                          cursor: "pointer",
                          color: "#9ca3af",
                          fontSize: "12.5px",
                        }}
                      >
                        <IconCamera size={16} /> Choose or Drop Image File
                      </label>
                    </div>

                    <div style={{ flex: "1 1 240px" }}>
                      <input
                        type="text"
                        className="tj-input"
                        placeholder="Or paste image URL (https://...)"
                        value={form.imageUrl}
                        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  {form.imageUrl && (
                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={form.imageUrl}
                        alt="Trade screenshot preview"
                        style={{ width: "80px", height: "50px", objectFit: "cover", borderRadius: "6px", border: "1px solid #374151" }}
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: "" })}
                        style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: "12px" }}
                      >
                        Remove Screenshot
                      </button>
                    </div>
                  )}
                </div>

                <div style={{marginTop:12}}>
                  <label className="tj-label">Notes</label>
                  <textarea className="tj-input" rows={2} placeholder="Setup, mistakes, lessons…" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{resize:"vertical"}}/>
                </div>
                <div style={{marginTop:14,display:"flex",gap:8}}>
                  <button type="submit" className="tj-btn tj-btn-primary tj-focus-visible">{editingId?"Save changes":"Log trade"}</button>
                  <button type="button" onClick={resetForm} className="tj-btn tj-btn-ghost tj-focus-visible">Cancel</button>
                </div>
              </form>
            )}

            {activeAccount && activeAccount.type==="prop" && propStats && (
              <div className="tj-card" style={{marginBottom:20, borderColor: (propStats.maxDlBreached || propStats.dailyBreaches.some(b=>b.date===new Date().toISOString().slice(0,10))) ? C.red : C.border}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14,flexWrap:"wrap",gap:8}}>
                  <h3 className="tj-display" style={{fontSize:15,margin:0,display:"flex",alignItems:"center",gap:6}}><IconGauge size={16} color={C.blue}/> Prop firm risk dashboard</h3>
                  <span className="tj-mono" style={{fontSize:13,color:C.muted}}>Balance <b style={{color:C.text}}>{fmtMoney(propStats.currentBalance)}</b></span>
                </div>
                {propStats.maxDlBreached && (
                  <div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",color:C.red,borderRadius:8,padding:"8px 12px",fontSize:12.5,marginBottom:12}}>
                    <IconShieldAlert size={15}/> Max drawdown limit breached — this account would be disqualified by most prop firms.
                  </div>
                )}
                {propStats.dailyBreaches.some(b=>b.date===new Date().toISOString().slice(0,10)) && (
                  <div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",color:C.red,borderRadius:8,padding:"8px 12px",fontSize:12.5,marginBottom:12}}>
                    <IconShieldAlert size={15}/> Today's loss has exceeded your daily drawdown limit. Stop trading for today.
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:16}}>
                  {propStats.dailyLossLimit!=null && (
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6}}>
                        <span>Daily drawdown (today)</span><span className="tj-mono">{fmtMoney(propStats.todayLossUsed)} / {fmtMoney(propStats.dailyLossLimit)}</span>
                      </div>
                      <div className="tj-gauge-track"><div className="tj-gauge-fill" style={{width:`${clampPct((propStats.todayLossUsed/propStats.dailyLossLimit)*100)}%`, background: pctColor((propStats.todayLossUsed/propStats.dailyLossLimit)*100)}}/></div>
                      <div style={{fontSize:11,color:C.muted,marginTop:4}}>{fmtMoney(Math.max(0,propStats.dailyLossLimit-propStats.todayLossUsed))} of room left today</div>
                    </div>
                  )}
                  {propStats.maxDlAllowed!=null && (
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6}}>
                        <span>Max drawdown ({activeAccount.maxDlBasis==="trailing"?"trailing":"static"})</span><span className="tj-mono">{fmtMoney(propStats.currentDrawdown)} / {fmtMoney(propStats.maxDlAllowed)}</span>
                      </div>
                      <div className="tj-gauge-track"><div className="tj-gauge-fill" style={{width:`${clampPct((propStats.currentDrawdown/propStats.maxDlAllowed)*100)}%`, background: pctColor((propStats.currentDrawdown/propStats.maxDlAllowed)*100)}}/></div>
                      <div style={{fontSize:11,color:C.muted,marginTop:4}}>{fmtMoney(Math.max(0,propStats.maxDlAllowed-propStats.currentDrawdown))} of cushion left</div>
                    </div>
                  )}
                  {propStats.profitTargetAmount!=null && (
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6}}>
                        <span>Profit target progress</span><span className="tj-mono">{fmtMoney(Math.max(0,propStats.profitProgressAmount))} / {fmtMoney(propStats.profitTargetAmount)}</span>
                      </div>
                      <div className="tj-gauge-track"><div className="tj-gauge-fill" style={{width:`${clampPct((propStats.profitProgressAmount/propStats.profitTargetAmount)*100)}%`, background: C.green}}/></div>
                      <div style={{fontSize:11,color:C.muted,marginTop:4}}>{clampPct((propStats.profitProgressAmount/propStats.profitTargetAmount)*100).toFixed(0)}% of target reached</div>
                    </div>
                  )}
                </div>
                {propStats.dailyBreaches.length>0 && (
                  <div style={{marginTop:16,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                    <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Daily limit breaches ({propStats.dailyBreaches.length})</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {propStats.dailyBreaches.map(b => <span key={b.date} className="tj-mono" style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:"rgba(248,113,113,0.15)",color:C.red}}>{fmtDate(b.date)}: -{fmtMoney(b.lossUsed)}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Trading Calendar Boxes (Green = Profit Day, Red = Loss Day) */}
            <TradeCalendar
              trades={enriched}
              onSelectDate={(dateStr) => {
                if (search === dateStr) setSearch("");
                else setSearch(dateStr);
              }}
              onAddTradeForDate={(dateStr) => {
                setForm({ ...emptyForm, date: dateStr });
                setEditingId(null);
                setFormOpen(true);
              }}
            />

            {stats ? (
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:12,marginBottom:20}}>
                  <StatCard icon={<IconWallet size={15}/>} label="Total P/L" value={fmtMoney(stats.totalPnL)} positive={stats.totalPnL>=0}/>
                  <StatCard icon={<IconPercent size={15}/>} label="Win rate" value={`${stats.winRate.toFixed(1)}%`} neutral/>
                  <StatCard icon={<IconTarget size={15}/>} label="Profit factor" value={stats.profitFactor===Infinity?"∞":stats.profitFactor.toFixed(2)} neutral/>
                  <StatCard icon={<IconTrendUp size={15}/>} label="Expectancy / trade" value={fmtMoney(stats.expectancy)} positive={stats.expectancy>=0}/>
                  <StatCard icon={stats.streakType?<IconFlame size={15}/>:<IconSnow size={15}/>} label="Current streak" value={`${stats.streak} ${stats.streakType?"win":"loss"}${stats.streak!==1?"s":""}`} positive={stats.streakType}/>
                </div>

                <div className="tj-card" style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
                    <h3 className="tj-display" style={{fontSize:15,margin:0}}>Progress over time</h3>
                    <span style={{fontSize:12,color:C.muted}}>Cumulative P/L by trade</span>
                  </div>
                  <ProgressChart data={stats.equity}/>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16,marginBottom:20}}>
                  <div className="tj-card">
                    <h3 className="tj-display" style={{fontSize:14,margin:"0 0 12px"}}>Performance by strategy</h3>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {stats.byStrategy.map(s => (
                        <div key={s.strategy} style={{display:"grid",gridTemplateColumns:"90px 1fr 70px 90px",alignItems:"center",gap:12,fontSize:13}}>
                          <span>{s.strategy}</span>
                          <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{width:`${(s.wins/s.count)*100}%`,height:"100%",background:s.pnl>=0?C.blue:C.red}}/></div>
                          <span className="tj-mono" style={{color:C.muted}}>{s.count} trades</span>
                          <span className="tj-mono" style={{textAlign:"right",color:s.pnl>=0?C.green:C.red}}>{fmtMoney(s.pnl)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="tj-card">
                    <h3 className="tj-display" style={{fontSize:14,margin:"0 0 12px"}}>Win / loss</h3>
                    <DonutChart wins={donutData.wins} losses={donutData.losses}/>
                    <div style={{display:"flex",justifyContent:"space-around",fontSize:12,marginTop:8}}>
                      <span style={{color:C.blue}}>● {stats.wins} wins</span><span style={{color:C.muted}}>● {stats.losses} losses</span>
                    </div>
                    <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:12,fontSize:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.muted}}>Best trade</span><span className="tj-mono" style={{color:C.green}}>{stats.best.symbol} {fmtMoney(stats.best.pnl || 0)}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.muted}}>Worst trade</span><span className="tj-mono" style={{color:C.red}}>{stats.worst.symbol} {fmtMoney(stats.worst.pnl || 0)}</span></div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="tj-card" style={{textAlign:"center",padding:"50px 20px",marginBottom:20,color:C.muted}}>
                <p className="tj-display" style={{fontSize:16,color:C.text,margin:"0 0 6px"}}>No trades yet on {activeAccount?.name}</p>
                <p style={{fontSize:13,margin:0}}>Add your first trade to start tracking your progress.</p>
              </div>
            )}

            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
              <input className="tj-input" style={{maxWidth:160}} placeholder="Filter symbol…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <select className="tj-input" style={{maxWidth:140}} value={filterDir} onChange={e=>setFilterDir(e.target.value)}>
                <option value="all">All directions</option><option value="long">Long</option><option value="short">Short</option>
              </select>
              <select className="tj-input" style={{maxWidth:160}} value={filterStrategy} onChange={e=>setFilterStrategy(e.target.value)}>
                <option value="all">All strategies</option>{STRATEGIES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <span style={{fontSize:12,color:C.muted,marginLeft:"auto"}}>{filtered.length} of {enriched.length} trades</span>
            </div>

            <div className="tj-card" style={{padding:0,overflow:"hidden"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${C.border}`,color:C.muted,textAlign:"left",background:C.header}}>
                      <Th onClick={()=>toggleSort("date")}>Date</Th>
                      <Th onClick={()=>toggleSort("symbol")}>Symbol</Th>
                      <th style={{padding:"10px 12px"}}>Dir</th>
                      <th style={{padding:"10px 12px"}}>Chart</th>
                      <th style={{padding:"10px 12px"}}>Entry</th>
                      <th style={{padding:"10px 12px"}}>Exit</th>
                      <th style={{padding:"10px 12px"}}>Qty</th>
                      <th style={{padding:"10px 12px"}}>R (plan)</th>
                      <th style={{padding:"10px 12px"}}>Tags</th>
                      <Th onClick={()=>toggleSort("pnl")}>P/L</Th>
                      <th style={{padding:"10px 12px"}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id} className="tj-row" style={{borderBottom:`1px solid ${C.border}`}}>
                        <td className="tj-mono" style={{padding:"10px 12px",color:C.muted}}>{fmtDate(t.date)}</td>
                        <td style={{padding:"10px 12px",fontWeight:600}}>{t.symbol}</td>
                        <td style={{padding:"10px 12px"}}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:t.direction==="long"?"rgba(16,185,129,0.15)":"rgba(248,113,113,0.15)",color:t.direction==="long"?C.green:C.red,textTransform:"uppercase"}}>{t.direction}</span></td>
                        
                        {/* Screenshot thumbnail / icon column */}
                        <td style={{padding:"10px 12px"}}>
                          {t.imageUrl ? (
                            <button
                              onClick={() => setActiveModalTrade(t)}
                              title="Click to view chart screenshot"
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <img
                                src={t.imageUrl}
                                alt="Chart preview"
                                style={{
                                  width: "36px",
                                  height: "24px",
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                  border: "1px solid #374151",
                                }}
                              />
                            </button>
                          ) : (
                            <span style={{ fontSize: "11px", color: C.muted }}>—</span>
                          )}
                        </td>

                        <td className="tj-mono" style={{padding:"10px 12px"}}>{t.entry}</td>
                        <td className="tj-mono" style={{padding:"10px 12px"}}>{t.exit}</td>
                        <td className="tj-mono" style={{padding:"10px 12px"}}>{t.qty}</td>
                        <td className="tj-mono" style={{padding:"10px 12px",color:C.muted}}>{t.r==null?"—":`${t.r.toFixed(1)}R`}{t.plannedR!=null && <span style={{color:C.muted}}> / {t.plannedR.toFixed(1)}R</span>}</td>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4,maxWidth:240}}>
                            {(t.strategies||[]).map(s=><span key={s} className="tj-tag">{s}</span>)}
                            {t.session && <span className="tj-tag-session">{t.session}</span>}
                          </div>
                        </td>
                        <td className="tj-mono" style={{padding:"10px 12px",fontWeight:600,color:(t.pnl||0)>=0?C.green:C.red}}>{fmtMoney(t.pnl || 0)}</td>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>startEdit(t)} className="tj-focus-visible" title="Edit" style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><IconPencil/></button>
                            <button onClick={()=>promptDeleteTrade(t)} className="tj-focus-visible" title="Cut / Delete Trade" style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><IconTrash/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length===0 && enriched.length>0 && <tr><td colSpan={11} style={{padding:24,textAlign:"center",color:C.muted}}>No trades match these filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <p style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:20}}>Saved automatically in this browser. Nobody else can see this journal.</p>
          </>
        )}
      </div>

      {/* Lightbox / Screenshot Modal */}
      {activeModalTrade && activeModalTrade.imageUrl && (
        <TradeScreenshotModal
          imageUrl={activeModalTrade.imageUrl}
          symbol={activeModalTrade.symbol}
          date={fmtDate(activeModalTrade.date)}
          direction={activeModalTrade.direction}
          pnl={activeModalTrade.pnl}
          onClose={() => setActiveModalTrade(null)}
        />
      )}

      {/* Confirmation Modal to Cut / Delete a Logged Trade */}
      <ConfirmDeleteModal
        isOpen={!!tradeToDelete}
        title="Cut / Remove Logged Trade"
        message={
          tradeToDelete
            ? `Are you sure you want to cut and remove this trade for ${tradeToDelete.symbol} (${tradeToDelete.direction.toUpperCase()}) logged on ${fmtDate(
                tradeToDelete.date
              )} with P/L of ${fmtMoney(tradeToDelete.pnl || 0)}? This action cannot be undone.`
            : ""
        }
        confirmText="Cut Trade"
        onConfirm={() => {
          if (tradeToDelete) {
            setTrades((prev) => prev.filter((t) => t.id !== tradeToDelete.id));
            setTradeToDelete(null);
          }
        }}
        onCancel={() => setTradeToDelete(null)}
      />
    </div>
  );
}
