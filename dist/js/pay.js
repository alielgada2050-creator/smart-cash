/* Smart Cash prototype — v0.6 rules: payment links and payment settings, sharing transactions on WhatsApp,
   savings goals, smart calculations, per-organisation policy, system self-check, support contacts. */
(function(){
const SC = window.SC, D = window.SCDATA;
const t = (k,v) => SC.t(k,v), r2 = SC.r2;
const pick = n => Array.isArray(n) ? (SC.ui.lang==="ar" ? n[0] : n[1]) : (n || "");
const nameOf = k => D.NAMES[k] ? SC.nm(k) : (k || "");
const daysBetween = (a,b) => (new Date(b) - new Date(a)) / 864e5;

/* ------------------------------------------------------------------ support */
SC.SUPPORT = {phone:"0597778853", intl:"966597778853", email:"asas.today2030@gmail.com"};
SC.supportWa = () => `https://wa.me/${SC.SUPPORT.intl}?text=${encodeURIComponent(t("support_wa_text",{ws:t("ws_"+SC.ws), v:"0.6", who:SC.me()?SC.uname(SC.me().id):"—"}))}`;
SC.supportTg = () => `https://t.me/+${SC.SUPPORT.intl}`;
SC.supportMail = () => `mailto:${SC.SUPPORT.email}?subject=${encodeURIComponent(t("support_mail_subject"))}`;

/* ------------------------------------------------------------------ smart amounts: "120+35*2", Arabic-Indic digits, "15%" */
SC.normDigits = s => String(s??"").replace(/[٠-٩]/g, d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d))
  .replace(/[×xX]/g,"*").replace(/÷/g,"/").replace(/٫/g,".").replace(/[٬,،]/g,"").replace(/−/g,"-").trim();
SC.isExpr = s => /\d\s*[-+*/%]\s*[\d(]|\d%|\(/.test(SC.normDigits(s));
SC.calc = (input) => {
  const s = SC.normDigits(input); if(!s) return NaN;
  if(!/^[\d.+\-*/()%\s]+$/.test(s)) return NaN;
  let i = 0; const peek = () => s[i], skip = () => { while(s[i]===" ") i++ };
  function num(){ skip(); let j = i; while(/[\d.]/.test(s[i]||"")) i++; if(j===i) throw 0; let v = Number(s.slice(j,i)); if(!isFinite(v)) throw 0; skip(); if(peek()==="%"){ i++; v = v/100 } return v }
  function atom(){ skip(); if(peek()==="-"){ i++; return -atom() } if(peek()==="+"){ i++; return atom() } if(peek()==="("){ i++; const v = expr(); skip(); if(peek()!==")") throw 0; i++; skip(); return v } return num() }
  function term(){ let v = atom(); for(;;){ skip(); const c = peek(); if(c==="*"){ i++; v *= atom() } else if(c==="/"){ i++; const d = atom(); if(d===0) throw 0; v /= d } else return v } }
  function expr(){ let v = term(); for(;;){ skip(); const c = peek(); if(c==="+"){ i++; const x = term(); v += x } else if(c==="-"){ i++; v -= term() } else return v } }
  try{ const v = expr(); skip(); if(i!==s.length) return NaN; return Math.round(v*100)/100 }catch{ return NaN }
};
/* "100 + 15%" reads as 100 plus 15% of 100 — how people type it on a phone calculator */
const baseCalc = SC.calc;
SC.calc = (input) => { const s = SC.normDigits(input), m = s.match(/^([\d.]+)\s*([+\-])\s*([\d.]+)%$/); if(m){ const a = +m[1], p = +m[3]/100; return r2(m[2]==="+" ? a*(1+p) : a*(1-p)) } return baseCalc(input) };
SC.vat = {add:x=>r2(x*1.15), remove:x=>r2(x/1.15), of:x=>r2(x-x/1.15)};

/* ------------------------------------------------------------------ IBAN */
SC.ibanClean = s => String(s||"").replace(/\s+/g,"").toUpperCase();
SC.ibanOk = s => { const x = SC.ibanClean(s); if(!/^SA\d{22}$/.test(x)) return false;
  const r = (x.slice(4)+x.slice(0,4)).replace(/[A-Z]/g, c=>String(c.charCodeAt(0)-55)); let m = 0; for(const ch of r) m = (m*10 + +ch) % 97; return m===1 };
SC.ibanFmt = s => SC.ibanClean(s).replace(/(.{4})/g,"$1 ").trim();

/* ------------------------------------------------------------------ payment settings */
SC.payset = () => (SC.S.payset ||= {holder:SC.S.org?.name||"", bank:"", iban:"", stc:"", gateway:null});
SC.payReady = () => { const p = SC.payset(); return {link:!!p.gateway, bank:SC.ibanOk(p.iban)} };
SC.canPay = () => { const m = SC.me(); if(!m) return false; if(SC.plan()!=="enterprise") return m.role==="personal" || m.role==="owner"; return ["finance","accountant","pm"].includes(m.role) };
SC.canPaySettings = () => { const m = SC.me(); return !!m && (m.role==="personal" || m.role==="owner" || m.role==="finance") };
SC.savePayset = (d) => {
  if(!SC.canPaySettings()) return "err_not_allowed";
  const iban = SC.ibanClean(d.iban);
  if(iban && !SC.ibanOk(iban)) return "err_iban";
  if(!String(d.holder||"").trim()) return "err_name";
  if(d.stc && !/^\+?\d[\d\s]{8,}$/.test(String(d.stc).trim())) return "err_phone";
  const p = SC.payset(); p.holder = String(d.holder).trim(); p.bank = d.bank||""; p.iban = iban; p.stc = String(d.stc||"").trim();
  SC.audit("au_payset", p.bank+" · "+(iban?iban.slice(0,6)+"…"+iban.slice(-4):"—")); return null;
};
SC.gwConnect = (k, merchant) => {
  if(!SC.canPaySettings() || SC.plan()==="personal") return "err_not_allowed";
  if(!D.GATEWAYS.some(g=>g.k===k)) return "err_not_allowed";
  if(String(merchant||"").trim().length < 6) return "err_merchant";
  SC.payset().gateway = {k, merchant:String(merchant).trim(), at:SC.now()}; SC.audit("au_gw_connect", k); return null;
};
SC.gwDisconnect = () => { const g = SC.payset().gateway; SC.payset().gateway = null; SC.audit("au_gw_disconnect", g?.k||"") };
SC.gwName = () => D.GATEWAYS.find(g=>g.k===SC.payset().gateway?.k)?.name || "";

/* ------------------------------------------------------------------ payment links */
SC.PL = () => (SC.S.paylinks ||= []);
SC.plStatus = p => p.status==="pending" && Date.now() > new Date(p.exp).getTime() ? "expired" : p.status;
SC.plURL = p => `https://pay.smartcash.example/${p.id.toLowerCase()}`;
SC.plMine = () => { const m = SC.me(); if(!m) return []; const all = SC.PL();
  if(SC.plan()!=="enterprise" || ["finance","admin"].includes(m.role)) return all;
  return all.filter(p=>p.by===m.id || SC.S.contacts.find(c=>c.id===p.contact)?.owner===m.id) };
SC.plFor = (kind, id) => SC.PL().filter(p=>(kind==="contact" ? p.contact===id : p.kind===kind && p.ref===id));
SC.plName = p => nameOf(p.name);
SC.plTotals = list => { const L = list || SC.plMine(), mk = SC.thisMonth();
  return {pending:r2(L.filter(p=>SC.plStatus(p)==="pending").reduce((s,p)=>s+p.amt,0)), pendingN:L.filter(p=>SC.plStatus(p)==="pending").length,
    paid:r2(L.filter(p=>p.status==="paid" && SC.monthKey(p.paidAt)===mk).reduce((s,p)=>s+p.amt,0)), expired:L.filter(p=>SC.plStatus(p)==="expired").length} };
SC.createPayLink = (d) => {
  if(!SC.canPay()) return {err:"err_not_allowed"};
  const amt = r2(Number(d.amt)); if(!(amt>0)) return {err:"enter_amount"};
  if(amt > 1000000) return {err:"err_amount_high"};
  const ready = SC.payReady(), method = d.method || (ready.link && ready.bank ? "both" : ready.link ? "link" : "bank");
  if((method==="link"||method==="both") && !ready.link) return {err:"err_no_gateway"};
  if((method==="bank"||method==="both") && !ready.bank) return {err:"err_no_iban"};
  let c = d.contact ? SC.S.contacts.find(x=>x.id===d.contact) : null;
  if(!c && d.newName){ const name = String(d.newName).trim(); if(!name) return {err:"err_name"};
    c = {id:"c"+Date.now().toString(36), name, kind:"customer", owner:SC.me().id, phone:String(d.phone||"").trim(), entries:[]}; SC.S.contacts.push(c) }
  if(d.contact && !c) return {err:"err_name"};
  const phone = String(d.phone || c?.phone || "").trim();
  if(phone && phone!=="—" && !/^\+?\d[\d\s]{8,}$/.test(phone)) return {err:"err_phone"};
  const days = Math.min(30, Math.max(1, Number(d.days)||7));
  SC.S.seq.pl = (SC.S.seq.pl||0) + 1;
  const p = {id:"PL-"+String(SC.S.seq.pl).padStart(6,"0"), kind:d.kind||"contact", ref:d.ref||null, contact:c?.id||null,
    name:c ? (c.n || c.name) : String(d.name||"").trim(), phone:phone==="—"?"":phone, amt, desc:String(d.desc||"").trim(), method,
    gw:SC.payset().gateway?.k||null, status:"pending", by:SC.me().id, t:SC.now(), exp:new Date(Date.now()+days*864e5).toISOString(), paidAt:null, paidVia:null};
  if(d.addEntry && c) c.entries.push({dir:"gave", amt, t:SC.now(), note:d.entryNote||p.id});
  SC.PL().unshift(p); SC.audit("au_paylink", `${p.id} · ${SC.fmt(amt)}`);
  return {p, c};
};
/* re-bill a supplier invoice to a client: adds what the client owes in the ledger and creates the payment link */
SC.rebill = (inv, d) => {
  if(!SC.canPay()) return {err:"err_not_allowed"};
  if(inv.status!=="approved") return {err:"err_rebill_status"};
  if(SC.plFor("invoice", inv.id).some(p=>SC.plStatus(p)!=="cancelled")) return {err:"err_rebill_dup"};
  const markup = Math.max(0, Math.min(100, Number(d.markup)||0));
  const amt = r2((inv.total - SC.credited(inv)) * (1 + markup/100));
  const r = SC.createPayLink({...d, amt, kind:"invoice", ref:inv.id, desc:d.desc || t("rebill_desc",{id:inv.id}), addEntry:true, entryNote:"rebill:"+inv.id});
  if(!r.err) SC.addHist(inv, "rebilled", {pl:r.p.id, amt});
  return r;
};
SC.plMarkPaid = (p, via) => {
  if(SC.plStatus(p)!=="pending") return "err_pl_closed";
  p.status = "paid"; p.paidAt = SC.now(); p.paidVia = via || "manual";
  const c = p.contact && SC.S.contacts.find(x=>x.id===p.contact);
  if(c) c.entries.push({dir:"got", amt:p.amt, t:p.paidAt, note:p.id});
  if(p.kind==="custody"){ const cu = SC.P()?.custodies.find(x=>x.id===p.ref); if(cu && cu.status==="open") SC.custodySettle(cu) }
  /* the payment is reported by the gateway (or recorded by hand), so the creator is always told, even when they recorded it */
  SC.S.notifs.unshift({id:"N"+(++SC.S.seq.n), to:p.by, k:"n_paid", ref:{type:"paylink", id:p.id}, by:null, t:SC.now(), read:false, amt:p.amt});
  SC.audit("au_paid", `${p.id} · ${p.paidVia}`); return null;
};
SC.plCancel = p => { if(SC.plStatus(p)!=="pending") return "err_pl_closed"; p.status = "cancelled"; p.cancelledAt = SC.now(); SC.audit("au_pl_cancel", p.id); return null };
SC.plRenew = p => { if(!["expired"].includes(SC.plStatus(p))) return "err_pl_closed"; p.exp = new Date(Date.now()+7*864e5).toISOString(); SC.audit("au_pl_renew", p.id); return null };

SC.plText = (p) => {
  const ps = SC.payset(), lines = [];
  lines.push(t("pl_msg_head",{name:SC.plName(p), org:SC.orgName()}));
  if(p.desc) lines.push(t("pl_msg_for",{d:nameOf(p.desc)}));
  lines.push(t("pl_msg_amt",{amt:SC.fmt(p.amt), cur:SC.cur()}));
  if(p.method!=="bank") lines.push(t("pl_msg_link",{url:SC.plURL(p)}));
  if(p.method!=="link") lines.push(t("pl_msg_bank",{holder:pick(ps.holder), bank:SC.nm("bk_"+ps.bank), iban:SC.ibanFmt(ps.iban), ref:p.id}));
  if(SC.plan()==="personal" && ps.stc) lines.push(t("pl_msg_stc",{n:ps.stc}));
  lines.push(t("pl_msg_exp",{d:SC.dd(p.exp)}));
  return lines.join("\n");
};
SC.plReceipt = p => t("pl_msg_paid",{name:SC.plName(p), amt:SC.fmt(p.amt), cur:SC.cur(), ref:p.id, d:SC.dd(p.paidAt), org:SC.orgName()});

/* ------------------------------------------------------------------ share transactions on WhatsApp */
SC.waShare = (phone, text) => phone && phone!=="—" ? SC.waLink(phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`;
SC.invShareText = i => {
  const f = i.folder ? `${SC.fno(i.folder)} #${i.seq}` : "—";
  const lines = [t("sh_invoice",{id:i.id}), `${t("supplier")}: ${i.supName||SC.supNm(i.sup)}`, `${t("total")}: ${SC.fmt(i.total)} ${SC.cur()}${i.vat?` · ${t("vat_short")} ${SC.fmt(i.vat)}`:""}`,
    `${t("x_kind")}: ${t("kind_"+i.kind)} · ${t("cat_"+i.cat)}`, `${t("folder")}: ${f}`, `${t("x_status")}: ${t("st_"+i.status)}${i.status==="review"?` · ${t("waiting_for",{r:t("role_"+i.steps[i.idx])})}`:""}`, `${t("date")}: ${SC.dd(i.date)}`];
  return lines.join("\n") + "\n— " + SC.orgName();
};
SC.entryText = (c, e, run) => t(e.dir==="gave"?"sh_entry_gave":"sh_entry_got", {name:SC.nm(c.n)||c.name, amt:SC.fmt(e.amt), cur:SC.cur(), d:SC.dd(e.t), bal:SC.fmt(Math.abs(run)), side:t(run>0?"owes_you":run<0?"you_owe":"settled"), org:SC.orgName()});
SC.folderText = f => { const L = SC.folderInv(f.no), tot = r2(L.filter(i=>i.status!=="withdrawn" && i.status!=="rejected").reduce((s,i)=>s+i.total,0));
  return t("sh_folder",{f:SC.fno(f.no), n:L.length, amt:SC.fmt(tot), cur:SC.cur(), st:t("fs_"+(f.status==="review"?"in_review":f.status)), who:SC.uname(SC.adv(f.adv)?.holder)}) };
SC.advText = a => { const s = SC.advStats(a); return t("sh_advance",{id:a.id, who:SC.uname(a.holder), issued:SC.fmt(s.issued), spent:SC.fmt(s.approved), rev:SC.fmt(s.review), bal:SC.fmt(s.balance), cur:SC.cur()}) };

/* ------------------------------------------------------------------ savings goals (individuals) */
SC.savings = () => (SC.P() ? (SC.P().savings ||= []) : []);
SC.goalName = g => g.n ? SC.nm(g.n) : g.name;
SC.goalStats = g => { const saved = r2(g.moves.reduce((s,m)=>s+(m.kind==="in"?m.amt:-m.amt),0)), left = r2(Math.max(0, g.target-saved));
  const months = g.deadline ? Math.max(1, Math.ceil(daysBetween(SC.now(), g.deadline)/30.4)) : null;
  return {saved, left, pct: g.target ? Math.min(1, saved/g.target) : 0, months, monthly: months ? r2(left/months) : null, done: saved >= g.target} };
SC.addGoal = d => { const name = String(d.name||"").trim(); if(!name) return {err:"err_name"}; const target = r2(Number(d.target)); if(!(target>0)) return {err:"enter_amount"};
  if(d.deadline && !(new Date(d.deadline) > new Date())) return {err:"err_deadline"};
  const g = {id:"SV-"+String(SC.savings().length+1).padStart(2,"0")+Date.now().toString(36).slice(-3), name, icon:d.icon||"vault", target, deadline:d.deadline?new Date(d.deadline+"T12:00:00Z").toISOString():null, moves:[]};
  const first = r2(Number(d.first)||0); if(first>0) g.moves.push({kind:"in", amt:first, t:SC.now()});
  SC.savings().push(g); return {g} };
SC.goalMove = (g, kind, amt) => { amt = r2(Number(amt)); if(!(amt>0)) return "enter_amount"; if(kind==="out" && amt > SC.goalStats(g).saved + 0.001) return "err_goal_balance";
  g.moves.push({kind, amt, t:SC.now()}); return null };
SC.goalDelete = g => { const L = SC.savings(); const k = L.indexOf(g); if(k>=0) L.splice(k,1) };
SC.savedTotal = () => r2(SC.savings().reduce((s,g)=>s+SC.goalStats(g).saved,0));

/* ------------------------------------------------------------------ per-organisation policy */
SC.orgPolicy = () => (SC.S.policy ||= SC.plan()==="enterprise" ? {fast:500, std:5000} : SC.plan()==="business" ? {auto:0} : {});
SC.canPolicy = () => { const m = SC.me(); return !!m && (m.role==="owner" || m.role==="finance" || m.role==="admin") };
SC.setPolicy = d => {
  if(!SC.canPolicy()) return "err_not_allowed";
  const P = SC.orgPolicy();
  if(SC.plan()==="enterprise"){ const fast = Number(d.fast), std = Number(d.std); if(!(fast>0) || !(std>fast)) return "err_thresholds"; P.fast = r2(fast); P.std = r2(std) }
  if(SC.plan()==="business"){ const auto = Number(d.auto||0); if(!(auto>=0) || auto>5000) return "err_auto"; P.auto = r2(auto);
    const name = String(d.orgName||"").trim(); if(name) SC.S.org.name = [name, name];
    if(d.vat && !/^3\d{13}3$/.test(String(d.vat).trim())) return "err_vat"; if(d.cr && !/^\d{10}$/.test(String(d.cr).trim())) return "err_cr";
    SC.S.org.vat = String(d.vat||"").trim(); SC.S.org.cr = String(d.cr||"").trim(); }
  SC.audit("au_policy", JSON.stringify(P)); return null;
};
const PROC = D.PROC_CATS;
SC.pathFor = (total, cat) => {
  if(SC.S.plan==="business") return ["owner"];
  const P = SC.orgPolicy();
  if(total <= P.fast) return ["supervisor","accountant"];
  if(total <= P.std) return ["supervisor","engineer","pm","accountant", ...(PROC.includes(cat)?["procurement"]:[]), "finance"];
  return ["supervisor","engineer","pm","accountant","procurement","finance"];
};
const baseNew = SC.newInvoice;
SC.newInvoice = (d) => {
  const r = baseNew(d); if(r.err || SC.plan()!=="business") return r;
  const inv = r.inv, auto = SC.orgPolicy().auto || 0;
  if(auto>0 && inv.total <= auto && inv.total <= SC.advStats(SC.adv(inv.adv)).balance + 0.001){
    inv.idx = inv.steps.length; inv.status = "approved"; SC.addHist(inv, "auto_approved", {limit:auto}); SC.addHist(inv, "posted");
    SC.S.notifs = SC.S.notifs.filter(n=>!(n.k==="n_inbox" && n.ref?.id===inv.id));
    SC.audit("au_auto_approve", `${inv.id} ≤ ${auto}`); r.auto = true;
  }
  return r;
};

/* ------------------------------------------------------------------ smart calculations */
const riyNow = () => new Date(Date.now() + 3*36e5);
SC.runway = () => {
  const m = SC.me(); if(!m || SC.plan()==="personal") return [];
  const since = Date.now() - 30*864e5, spent = new Map();
  SC.S.invoices.forEach(i=>{ if(i.status!=="rejected" && i.status!=="withdrawn" && new Date(i.date).getTime()>=since) spent.set(i.adv, (spent.get(i.adv)||0) + i.total) });
  const scope = D.SCOPE[m.role];
  const list = SC.S.advances.filter(a=>a.status==="active" && spent.has(a.id) && (scope==="company" || (scope==="self" ? a.holder===m.id : scope==="branch" ? a.branch===m.branch : a.project===m.project)));
  return list.map(a=>{ const burn = spent.get(a.id)/30, bal = SC.advStats(a).balance - SC.advStats(a).review; return {a, burn:r2(burn), bal:r2(bal), days: burn>0 ? Math.max(0, Math.floor(bal/burn)) : null} })
    .filter(x=>x.days!==null).sort((x,y)=>x.days-y.days);
};
SC.smart = () => {
  const m = SC.me(); if(!m) return [];
  const out = [], now = riyNow(), dayN = now.getUTCDate(), dim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 0)).getUTCDate();
  if(SC.plan()==="personal"){
    const mk = SC.thisMonth(), cur = SC.pMonth(mk), B = SC.P().budgets, totB = Object.values(B).reduce((a,b)=>a+b,0);
    const forecast = r2(cur.total / dayN * dim);
    out.push({icon:"plot", tone: totB && forecast > totB ? "warn" : "ok", k:"sm_forecast", v:SC.fmt0(forecast), sub: totB ? t(forecast>totB?"sm_over_by":"sm_under_by",{n:SC.fmt0(Math.abs(totB-forecast))}) : ""});
    const monthlySave = r2(SC.savings().reduce((s,g)=>{ const st = SC.goalStats(g); return s + (st.done ? 0 : (st.monthly||0)) },0));
    const safe = r2(Math.max(0, (totB - cur.total - monthlySave) / (dim - dayN + 1)));
    out.push({icon:"wallet", tone: safe>0 ? "accent" : "bad", k:"sm_safe_day", v:SC.fmt0(safe), sub:t("sm_safe_sub",{n:dim-dayN+1})});
    const pd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 1)), pk = `${pd.getUTCFullYear()}-${String(pd.getUTCMonth()+1).padStart(2,"0")}`;
    const prevBy = {}; SC.P().expenses.filter(e=>SC.monthKey(e.t)===pk && new Date(new Date(e.t).getTime()+3*36e5).getUTCDate()<=dayN).forEach(e=>prevBy[e.cat]=(prevBy[e.cat]||0)+e.amt);
    let best = null; D.PCATS.forEach(c=>{ const a = cur.by[c]||0, b = prevBy[c]||0, d = a-b; if(a>=100 && d>0 && (!best || d>best.d)) best = {c, d, pct: b ? Math.round(d/b*100) : null} });
    if(best) out.push({icon:"up", tone:"warn", k:"sm_rise", v:"+"+SC.fmt0(best.d), sub:best.pct!==null ? t("sm_rise_sub",{c:t("pc_"+best.c), p:best.pct+"%"}) : t("sm_rise_new",{c:t("pc_"+best.c)}), go:"pexp:"+best.c});
    if(monthlySave>0) out.push({icon:"vault", tone:"accent", k:"sm_save_month", v:SC.fmt0(monthlySave), sub:t("sm_save_sub",{n:SC.savings().filter(g=>!SC.goalStats(g).done).length}), go:"psave"});
    const T = SC.plTotals(); if(T.pendingN) out.push({icon:"link", tone:"accent", k:"sm_expected", v:SC.fmt0(T.pending), sub:t("sm_links_n",{n:T.pendingN}), go:"pay"});
    return out;
  }
  const T = SC.plTotals();
  if(SC.canPay() && (T.pendingN || T.expired)) out.push({icon:"link", tone:T.expired?"warn":"accent", k:"sm_expected", v:SC.fmt0(T.pending), sub:t("sm_links_n",{n:T.pendingN}) + (T.expired?" · "+t("sm_expired_n",{n:T.expired}):""), go:"pay"});
  const R = SC.runway();
  if(R.length){ const x = R[0]; out.push({icon:"wallet", tone:x.days<7?"bad":x.days<14?"warn":"ok", k: x.a.holder===m.id ? "sm_my_runway" : "sm_runway", v:t("days_n",{n:x.days}), sub: x.a.holder===m.id ? t("sm_burn",{n:SC.fmt0(x.burn)}) : t("sm_runway_sub",{n:SC.uname(x.a.holder), b:SC.fmt0(x.burn)}), go:"advance:"+x.a.id});
    const low = R.filter(x=>x.days<7).length; if(low>1) out.push({icon:"warn", tone:"warn", k:"sm_low_adv", v:String(low), sub:t("sm_low_adv_sub"), go:"advances"}) }
  const vis = SC.visibleInvoices().filter(i=>i.status==="approved");
  const hrs = vis.map(i=>{ const a = i.hist.find(h=>h.ev==="captured"), b = i.hist.find(h=>h.ev==="posted"); return a&&b ? daysBetween(a.t,b.t)*24 : null }).filter(x=>x!==null && x>=0);
  if(hrs.length >= 3) out.push({icon:"clock", tone:"ok", k:"sm_cycle", v:t("hours_n",{n:Math.round(hrs.reduce((a,b)=>a+b,0)/hrs.length)}), sub:t("sm_cycle_sub",{n:hrs.length})});
  if(SC.plan()==="business"){ const auto = SC.orgPolicy().auto||0; out.push({icon:"bolt", tone:"ok", k:"sm_auto", v: auto ? "≤ "+SC.fmt0(auto) : t("off"), sub:t("sm_auto_sub"), go:"orgset"}) }
  return out;
};

/* ------------------------------------------------------------------ system self-check */
SC.selfCheck = () => {
  const S = SC.S, res = [], add = (k, ok, d) => res.push({k, ok:!!ok, d:d||""});
  const eps = 0.011;
  if(SC.plan()!=="personal"){
    const badSeq = S.folders.filter(f=>{ const L = SC.folderInv(f.no); return L.some((i,k)=>i.seq!==k+1) || L.length>30 });
    add("ck_folder_seq", !badSeq.length, badSeq.map(f=>SC.fno(f.no)).join(", "));
    const badSum = S.invoices.filter(i=>Math.abs(i.sub + i.vat - i.total) > eps);
    add("ck_inv_sum", !badSum.length, badSum.slice(0,5).map(i=>i.id).join(", "));
    const badVat = S.invoices.filter(i=>i.kind && !i.kind.startsWith("tax") && i.vat > 0);
    add("ck_vat_regular", !badVat.length, badVat.slice(0,5).map(i=>i.id).join(", "));
    const negAdv = S.advances.filter(a=>a.status==="active" && SC.advStats(a).balance < -eps);
    add("ck_adv_balance", !negAdv.length, negAdv.slice(0,5).map(a=>a.id).join(", "));
    const sod = S.invoices.filter(i=>i.hist.some(h=>h.ev==="approved" && h.by===i.by));
    add("ck_sod", !sod.length, sod.slice(0,5).map(i=>i.id).join(", "));
    const apprOk = S.invoices.filter(i=>i.status==="approved" && !i.hist.some(h=>h.ev==="auto_approved") && i.hist.filter(h=>h.ev==="approved").length < i.steps.length);
    add("ck_full_path", !apprOk.length, apprOk.slice(0,5).map(i=>i.id).join(", "));
    const lockedCredit = S.invoices.filter(i=>{ const f = SC.folder(i.folder); return f?.locked && (i.credits||[]).some(c=>new Date(c.t) > new Date(f.lockedAt||0)) });
    add("ck_locked", !lockedCredit.length, lockedCredit.slice(0,5).map(i=>i.id).join(", "));
    const dupNo = new Map(), dups = []; S.invoices.filter(i=>i.invNo && i.status!=="rejected" && i.status!=="withdrawn").forEach(i=>{ const k = (i.sup||i.supName)+"|"+i.invNo; if(dupNo.has(k)) dups.push(i.id); else dupNo.set(k, i.id) });
    add("ck_dup_number", !dups.length, dups.slice(0,5).join(", "));
  }
  if(SC.plan()==="personal"){
    const neg = SC.P().custodies.filter(c=>SC.pcStats(c).balance < -eps); add("ck_custody", !neg.length, neg.map(c=>c.id).join(", "));
    const goals = SC.savings().filter(g=>SC.goalStats(g).saved < -eps); add("ck_goals", !goals.length, goals.map(g=>g.id).join(", "));
    const bud = Object.entries(SC.P().budgets).filter(([,v])=>!(v>=0)); add("ck_budgets", !bud.length, bud.map(b=>b[0]).join(", "));
  }
  const badEntries = S.contacts.filter(c=>c.entries.some(e=>!(e.amt>0) || !["gave","got"].includes(e.dir)));
  add("ck_ledger", !badEntries.length, badEntries.map(c=>c.id).join(", "));
  const paidNoEntry = SC.PL().filter(p=>p.status==="paid" && p.contact && !S.contacts.find(c=>c.id===p.contact)?.entries.some(e=>e.dir==="got" && Math.abs(e.amt-p.amt)<eps));
  add("ck_paylinks", !paidNoEntry.length, paidNoEntry.map(p=>p.id).join(", "));
  const ps = SC.payset(); add("ck_iban", !ps.iban || SC.ibanOk(ps.iban), ps.iban ? "" : t("ck_iban_empty"));
  const ord = S.audit.every((a,k)=>k===0 || new Date(S.audit[k-1].t) >= new Date(a.t) - 1000); add("ck_audit_order", ord, "");
  let size = 0; try{ size = JSON.stringify(S).length }catch{} add("ck_storage", size < 4.5e6, SC.fmt0(size/1024)+" KB");
  S.lastCheck = {t:SC.now(), ok:res.filter(r=>r.ok).length, n:res.length};
  SC.audit("au_selfcheck", `${S.lastCheck.ok}/${S.lastCheck.n}`);
  return res;
};
})();
