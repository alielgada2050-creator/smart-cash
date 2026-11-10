/* Smart Cash prototype — individual & small-business screens, WhatsApp and ERP integrations, workspace picker. */
(function(){
const SC = window.SC, D = window.SCDATA, H = SC.h, V = SC.VIEWS, UI = SC.UI;
const t = SC.t, esc = SC.esc, fmt = SC.fmt, nm = SC.nm, ic = H.ic;

Object.assign(H.P, {
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  store:'<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12v8h13v-8M10 20v-5h4v5"/>',
  bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>', cap:'<path d="m2.5 9 9.5-4.5L21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.5 3.5 2 5.5 2s4-.5 5.5-2V11"/>',
  plug:'<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>', wa:'<path d="M4 20.5 5.3 16.6A8.3 8.3 0 1 1 8.3 19z"/><path d="M9 9.2c.3 2 2.2 4.4 4.8 5.3.6.2 1.4-.3 1.6-.9l.2-.6-1.8-.9-.8.8c-1-.4-2-1.4-2.4-2.4l.8-.8-.9-1.8-.6.2c-.6.2-1 .9-.9 1.1z"/>',
  api:'<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>', pie:'<path d="M12 3v9h9A9 9 0 1 1 12 3z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
});
Object.assign(H.TAB_ICON, {pexp:"pie", pcust:"wallet", integ:"plug"});
const PCI = {food:"bag", fuel:"fuel", bills:"comms", transport:"transport", health:"heart", education:"cap", shopping:"store", family:"users", rent:"home", other:"other"};
const noteOf = n => !n ? "" : D.NAMES[n] ? nm(n) : SC.tn(n);
const bal = c => c.entries.reduce((s,e)=>s+(e.dir==="gave"?e.amt:-e.amt),0);
const cname = c => c.n ? nm(c.n) : c.name;
const waBtn = (phone, text, label, cls="btn btn-wa") => phone ? `<a class="${cls}" href="${SC.waLink(phone, text)}" target="_blank" rel="noopener" data-act="wasent" data-v="link">${ic("wa",18)}${label}</a>` : "";

/* ------------------------------------------------------------------ tabs per plan */
SC.tabsFor = u => {
  if(SC.plan()==="personal") return ["home","ledger","pexp","pcust","me"];
  if(SC.plan()==="business") return u.role==="owner" ? ["home","approvals","advances","ledger","me"] : ["home","invoices","folders","me"];
  return null;
};

/* ------------------------------------------------------------------ workspace picker (login + panel) */
const WS = [["personal","user","ws_personal","ws_personal_sub"],["business","store","ws_business","ws_business_sub"],["enterprise","building","ws_enterprise","ws_enterprise_sub"]];
const wsPicker = (cls="") => `<div class="ws-pick ${cls}" role="tablist" aria-label="${t("ws_choose")}">${WS.map(([k,i,l,s])=>`<button class="ws-c ${SC.ws===k?"on":""}" role="tab" aria-selected="${SC.ws===k}" data-act="ws" data-v="${k}"><span class="ws-ic">${ic(i,20)}</span><b>${t(l)}</b><span>${t(s)}</span></button>`).join("")}</div>`;
const baseLogin = V.login;
V.login = () => baseLogin().replace('<h1 class="h1">', `<div class="sec-t">${t("ws_choose")}</div>${wsPicker()}<div class="ws-org">${ic(WS.find(w=>w[0]===SC.ws)[1],16)} ${esc(SC.orgName())}</div><h1 class="h1">`);
SC.afterRender = () => {
  const panel = document.getElementById("panel"); if(!panel) return;
  let el = document.getElementById("pn-ws");
  if(!el){ el = document.createElement("div"); el.id = "pn-ws"; panel.querySelector("#pn-ctrl")?.before(el) }
  el.innerHTML = `<div class="plabel">${t("ws_choose")}</div>${wsPicker("compact")}`;
};

/* ================================================================== INDIVIDUAL */
function pDaily(days=30){
  const end = new Date(); end.setUTCHours(23,59,59,999);
  const out = Array.from({length:days},()=>({v:0}));
  SC.P().expenses.forEach(e=>{ const k = days-1-Math.floor((end - new Date(e.t))/864e5); if(k>=0 && k<days) out[k].v += e.amt });
  return out;
}
const ledgerTotals = () => { const mine = SC.S.contacts.filter(c=>c.owner===SC.me().id); return {get:mine.reduce((s,c)=>s+Math.max(0,bal(c)),0), give:mine.reduce((s,c)=>s+Math.max(0,-bal(c)),0), mine} };
function budgetBars(mk, onlyUsed){
  const m = SC.pMonth(mk), B = SC.P().budgets;
  const rows = D.PCATS.map(c=>[c, m.by[c]||0, B[c]||0]).filter(r=>!onlyUsed || r[1]>0 || r[2]>0).sort((a,b)=>(b[1]/(b[2]||1e9))-(a[1]/(a[2]||1e9)) || b[1]-a[1]);
  return `<div class="glass card cbars">${rows.map(([c,v,b])=>{ const pct = b ? v/b : 0, lvl = pct>=1?"over":pct>=.8?"near":"ok";
    return `<button class="cb pcb" data-act="go" data-v="pexp:${c}"><span class="cb-l">${ic(PCI[c],16)} ${t("pc_"+c)}</span><span class="cb-b ${lvl}"><i style="width:${Math.min(100,b?pct*100:(v?100:0))}%"></i></span><span class="cb-v num">${SC.fmt0(v)}${b?`<small>/${SC.fmt0(b)}</small>`:""}</span></button>` }).join("")}</div>`;
}
function pActions(){
  const mk = SC.thisMonth(), m = SC.pMonth(mk), B = SC.P().budgets, out = [];
  D.PCATS.forEach(c=>{ const b = B[c], v = m.by[c]||0; if(b && v>=b*.8) out.push({icon:PCI[c], tone:v>=b?"bad":"warn", title:t(v>=b?"pa_over":"pa_near",{c:t("pc_"+c)}), sub:`${Math.round(v/b*100)}%`, act:"go", v:"pexp:"+c}) });
  SC.S.contacts.filter(c=>c.owner===SC.me().id && bal(c)>0).sort((a,b)=>bal(b)-bal(a)).slice(0,2).forEach(c=>out.push({icon:"wa", tone:"accent", title:t("pa_collect",{n:cname(c)}), sub:fmt(bal(c)), act:"go", v:"person:"+c.id}));
  SC.P().custodies.filter(c=>c.status==="open").forEach(c=>{ const st = SC.pcStats(c); if(st.balance < st.total*.2) out.push({icon:"wallet", tone:"warn", title:t("pa_custody_low",{n:noteOf(c.party)}), sub:fmt(st.balance), act:"go", v:"pcustody:"+c.id}) });
  if(!out.length) return `<div class="allclear glass">${ic("ok",18)}<span>${t("nothing_pending")}</span></div>`;
  return `<div class="sec-h"><span class="h2">${t("action_center")}</span><span class="t2 num">${out.length}</span></div><div class="hcards">${out.map(x=>`<button class="hcard glass tone-${x.tone}" data-act="${x.act}" data-v="${esc(x.v)}"><span class="hc-ic">${ic(x.icon,18)}</span><span class="hc-t">${esc(x.title)}</span><span class="hc-s num">${esc(x.sub)}</span></button>`).join("")}</div>`;
}
function pHome(){
  const mk = SC.thisMonth(), m = SC.pMonth(mk), B = SC.P().budgets, totB = Object.values(B).reduce((a,b)=>a+b,0), L = ledgerTotals();
  const held = SC.P().custodies.filter(c=>c.status==="open" && c.dir==="received").reduce((s,c)=>s+SC.pcStats(c).balance,0);
  const recent = [...SC.P().expenses.slice(-6).map(e=>({t:e.t, k:"e", e})), ...L.mine.flatMap(c=>c.entries.map(x=>({t:x.t, k:"l", c, x})))].sort((a,b)=>new Date(b.t)-new Date(a.t)).slice(0,6);
  const pct = totB ? Math.round(m.total/totB*100) : 0;
  return `<div class="page">${H.homeHeader()}
    <button class="hero" data-act="tab" data-v="pexp">
      <div class="hero-top"><span class="hero-l">${t("spent_this_month")}</span><span class="hero-chip">${H.ring(pct,100,30,4,"#fff",pct+"%").replace('class="ring"','class="ring mini"')} ${t("of_budget",{n:SC.fmt0(totB)})}</span></div>
      <div class="hero-big num">${fmt(m.total)}<span class="cur">${SC.cur()}</span></div>
      ${H.spark(pDaily())}<div class="hero-cap">${t("last_30_days")}</div>
      <div class="hero-stats"><div><span>${t("will_get")}</span><b class="num">${SC.fmt0(L.get)}</b></div><div><span>${t("will_give")}</span><b class="num">${SC.fmt0(L.give)}</b></div><div><span>${t("custody_held")}</span><b class="num">${SC.fmt0(held)}</b></div></div>
    </button>
    ${pActions()}
    <div class="bubbles">${H.bubble("plus",t("add_expense"),"sheet","pexp")}${H.bubble("up",t("gave"),"tab","ledger")}${H.bubble("wallet",t("new_custody"),"sheet","pcust")}${H.bubble("pie",t("budgets"),"sheet","budget")}${H.bubble("wa",t("whatsapp"),"go","integ")}</div>
    <div class="sec-h"><span class="h2">${t("budget_this_month")}</span><button class="link" data-act="tab" data-v="pexp">${t("see_all")}</button></div>${budgetBars(mk, true)}
    <div class="sec-h"><span class="h2">${t("recent")}</span></div>
    <div class="glass list">${recent.map(r=>r.k==="e"
      ? `<div class="row"><span class="ico">${ic(PCI[r.e.cat],20)}</span><div class="grow"><div class="t1">${esc(noteOf(r.e.note)||t("pc_"+r.e.cat))}</div><div class="t2">${t("pc_"+r.e.cat)} · <span class="num">${SC.dt(r.e.t)}</span></div></div><div class="amt num neg">−${fmt(r.e.amt)}</div></div>`
      : `<button class="row" data-act="go" data-v="person:${r.c.id}"><span class="avatar sm">${esc(cname(r.c).charAt(0))}</span><div class="grow"><div class="t1">${esc(cname(r.c))}</div><div class="t2">${t(r.x.dir)} · <span class="num">${SC.dt(r.x.t)}</span></div></div><div class="amt num ${r.x.dir==="gave"?"neg":"pos"}">${fmt(r.x.amt)}</div></button>`).join("")}</div>
    <div class="spacer"></div></div>`;
}
function pExpenses(){
  const now = SC.thisMonth(), d = new Date(); d.setUTCMonth(d.getUTCMonth()-1); const prev = SC.monthKey(d.toISOString());
  const mk = H.segv("pmonth", now), cat = UI.p.id || "", m = SC.pMonth(mk);
  let list = m.ex.slice().reverse(); if(cat) list = list.filter(e=>e.cat===cat);
  const days = {}; list.forEach(e=>{ const k = SC.dd(e.t); (days[k] ||= []).push(e) });
  return `<div class="page">${H.nav(cat?t("pc_"+cat):t("tab_pexp"), !!cat, `<button class="iconbtn glass" data-act="sheet" data-v="budget" aria-label="${t("budgets")}">${ic("pie",20)}</button>`)}
    ${H.seg("pmonth",[[now,t("this_month")],[prev,t("last_month")]],now)}
    <div class="totals"><div class="glass"><span>${cat?t("pc_"+cat):t("total")}</span><b class="num">${fmt(cat?(m.by[cat]||0):m.total)}</b></div><div class="glass"><span>${t("budget")}</span><b class="num">${SC.fmt0(cat?(SC.P().budgets[cat]||0):Object.values(SC.P().budgets).reduce((a,b)=>a+b,0))}</b></div></div>
    ${cat?"":`<div class="sec-h"><span class="h2">${t("by_category")}</span></div>${budgetBars(mk, false)}`}
    <div class="sec-h"><span class="h2">${t("expenses")}</span><span class="t2 num">${list.length}</span></div>
    ${list.length?Object.entries(days).map(([day, es])=>`<div class="dayh"><span class="num">${day}</span><span class="num">${fmt(es.reduce((s,e)=>s+e.amt,0))}</span></div><div class="glass list">${es.map(e=>`<div class="row"><span class="ico">${ic(PCI[e.cat],20)}</span><div class="grow"><div class="t1">${esc(noteOf(e.note)||t("pc_"+e.cat))}</div><div class="t2">${t("pc_"+e.cat)}${e.cust?` · <span class="num">${e.cust}</span>`:""}</div></div><div class="amt num">${fmt(e.amt)}</div></div>`).join("")}</div>`).join(""):H.empty("plot",t("no_expenses"))}
    <div class="spacer"></div><div class="footer"><button class="btn btn-accent" data-act="sheet" data-v="pexp">${ic("plus",18)}${t("add_expense")}</button></div></div>`;
}
function pCustodies(){
  const tab = H.segv("pcd","all"); let list = SC.P().custodies; if(tab!=="all") list = list.filter(c=>c.dir===tab);
  return `<div class="page">${H.nav(t("tab_pcust"), false, `<button class="iconbtn glass" data-act="sheet" data-v="pcust" aria-label="${t("new_custody")}">${ic("plus",20)}</button>`)}
    <p class="ctx">${t("pcust_hint")}</p>${H.seg("pcd",[["all",t("all")],["received",t("cust_received")],["given",t("cust_given")]],"all")}
    ${list.length?list.map(c=>{ const s = SC.pcStats(c), pct = s.total ? s.spent/s.total : 0; return `<button class="pcard glass" data-act="go" data-v="pcustody:${c.id}">
      <div class="ap-top"><span class="ico ${c.dir==="given"?"neg":"pos"}">${ic(c.dir==="given"?"up":"down",20)}</span><div class="grow"><div class="t1">${esc(noteOf(c.party))}</div><div class="t2">${t(c.dir==="given"?"cust_given":"cust_received")} · <span class="num">${c.id} · ${SC.dd(c.t)}</span></div></div>
      <div class="end"><div class="amt num">${fmt(s.balance)}</div><span class="pill ${c.status==="open"?"p-returned":"p-approved"}">${t(c.status==="open"?"cust_open":"cust_settled")}</span></div></div>
      <div class="bbar ${pct>.8?"near":""}"><i style="width:${Math.min(100,pct*100)}%"></i></div><div class="t2 num">${t("spent_of",{a:fmt(s.spent), b:fmt(s.total)})}</div></button>` }).join(""):H.empty("drawer",t("no_custodies"))}
    <div class="spacer"></div></div>`;
}
function pCustody(){
  const c = SC.P().custodies.find(x=>x.id===UI.p.id); if(!c) return pCustodies();
  const s = SC.pcStats(c), rows = [...c.moves.map(m=>({t:m.t, l:t("pmv_"+m.kind), amt:m.kind==="return"?-m.amt:m.amt, in:true})), ...c.spent.map(x=>({t:x.t, l:noteOf(x.note)||t("pc_"+x.cat), cat:x.cat, amt:-x.amt}))].sort((a,b)=>new Date(b.t)-new Date(a.t));
  return `<div class="page">${H.nav(esc(noteOf(c.party)), true, `<button class="iconbtn glass" data-act="xpcust" aria-label="${t("export_excel")}">${ic("sheet",20)}</button>`)}
    <div class="hero static"><div class="hero-top"><span class="hero-l">${t(c.dir==="given"?"cust_given":"cust_received")} · <span class="num">${c.id}</span></span><span class="hero-chip">${t(c.status==="open"?"cust_open":"cust_settled")}</span></div>
      <div class="hero-l">${t("remaining")}</div><div class="hero-big num">${fmt(s.balance)}<span class="cur">${SC.cur()}</span></div>
      <div class="hero-stats"><div><span>${t("issued")}</span><b class="num">${fmt(s.total)}</b></div><div><span>${t("spent")}</span><b class="num">${fmt(s.spent)}</b></div><div><span>${t("x_count")}</span><b class="num">${c.spent.length}</b></div></div></div>
    <div class="pad-x stack" style="margin-top:12px">${waBtn(c.phone, SC.waCustodyText(c), t("wa_send_statement"))}
      ${c.status==="open"?`<div class="two"><button class="btn btn-glass" data-act="sheet" data-v="ptopup">${ic("plus",18)}${t("topup")}</button><button class="btn btn-glass" data-act="dopsettle">${ic("ok",18)}${t("settle")}</button></div>`:""}</div>
    <div class="sec-h"><span class="h2">${t("custody_moves")}</span></div>
    <div class="glass list">${rows.map(r=>`<div class="row"><span class="ico ${r.in?"pos":""}">${ic(r.in?"down":PCI[r.cat]||"other",18)}</span><div class="grow"><div class="t1">${esc(r.l)}</div><div class="t2 num">${SC.dt(r.t)}</div></div><div class="amt num ${r.amt<0?"neg":"pos"}">${r.amt<0?"−":"+"}${fmt(Math.abs(r.amt))}</div></div>`).join("")}</div>
    <div class="spacer"></div>${c.status==="open"?`<div class="footer"><button class="btn btn-accent" data-act="sheet" data-v="pspend">${ic("plus",18)}${t(c.dir==="given"?"record_their_spend":"record_spend")}</button></div>`:""}</div>`;
}

/* ================================================================== SMALL BUSINESS */
function bHome(){
  const m = SC.me();
  if(m.role!=="owner") return baseHome().replace(/<button class="bubble" data-act="sheet" data-v="newpr">[\s\S]*?<\/button>/, "");
  const L = ledgerTotals(), advs = SC.S.advances.filter(a=>a.status==="active"), held = advs.reduce((s,a)=>s+SC.advStats(a).balance,0);
  const debtors = L.mine.filter(c=>bal(c)>0).sort((a,b)=>bal(b)-bal(a)).slice(0,3);
  return `<div class="page">${H.homeHeader()}
    <button class="hero" data-act="tab" data-v="ledger">
      <div class="hero-top"><span class="hero-l">${t("net_position")}</span><span class="hero-chip">${esc(SC.orgName())}</span></div>
      <div class="hero-big num">${fmt(L.get - L.give)}<span class="cur">${SC.cur()}</span></div>
      ${H.spark(SC.spendSeries(SC.S.invoices))}<div class="hero-cap">${t("staff_spend_30")}</div>
      <div class="hero-stats"><div><span>${t("will_get")}</span><b class="num">${SC.fmt0(L.get)}</b></div><div><span>${t("will_give")}</span><b class="num">${SC.fmt0(L.give)}</b></div><div><span>${t("with_staff")}</span><b class="num">${SC.fmt0(held)}</b></div></div>
    </button>
    ${H.heroApprover()}
    ${H.actionCenter()}
    <div class="bubbles">${H.bubble("wallet",t("issue_advance"),"sheet","issueadv")}${H.bubble("check",t("tab_approvals"),"tab","approvals",SC.inbox().length)}${H.bubble("book",t("tab_ledger"),"tab","ledger")}${H.bubble("plug",t("integrations"),"go","integ")}${H.bubble("sheet",t("export"),"go","export")}</div>
    ${debtors.length?`<div class="sec-h"><span class="h2">${t("top_debtors")}</span><button class="link" data-act="tab" data-v="ledger">${t("see_all")}</button></div>
      <div class="glass list">${debtors.map(c=>`<div class="row"><button class="grow row-b" data-act="go" data-v="person:${c.id}"><span class="avatar sm">${esc(cname(c).charAt(0))}</span><div class="grow"><div class="t1">${esc(cname(c))}</div><div class="t2">${t("owes_you")} · <span class="num pos">${fmt(bal(c))}</span></div></div></button>${c.phone?`<a class="iconbtn wa" href="${SC.waLink(c.phone, SC.waBalanceText(c))}" target="_blank" rel="noopener" data-act="wasent" data-v="${c.id}" aria-label="${t("remind")}">${ic("wa",18)}</a>`:""}</div>`).join("")}</div>`:""}
    <div class="sec-h"><span class="h2">${t("staff_advances")}</span><button class="link" data-act="tab" data-v="advances">${t("see_all")}</button></div>
    <div class="glass list">${advs.map(a=>{ const s = SC.advStats(a); return `<button class="row" data-act="go" data-v="advance:${a.id}">${H.avatar(a.holder,"sm")}<div class="grow"><div class="t1">${esc(SC.uname(a.holder))}</div><div class="t2">${t("under_review")} <span class="num">${fmt(s.review)}</span></div><div class="minibar"><i style="width:${s.issued?Math.max(0,s.balance/s.issued*100):0}%"></i></div></div><div class="amt num">${fmt(s.balance)}</div></button>` }).join("")}</div>
    ${H.activity()}<div class="spacer"></div></div>`;
}

/* ================================================================== INTEGRATIONS */
const API = [["GET","/v1/invoices?status=approved"],["POST","/v1/invoices"],["POST","/v1/approvals/{id}/decide"],["GET","/v1/folders/{no}/journal"],["POST","/v1/advances"],["GET","/v1/ledger/contacts/{id}/statement"]];
const HOOKS = ["invoice.submitted","invoice.approved","invoice.rejected","folder.closed","folder.approved","advance.issued","journal.exported"];
function vInteg(){
  const plan = SC.plan(), wa = SC.S.integrations.wa, erp = SC.erp(), admin = SC.can("integrations");
  const L = ledgerTotals(), owed = L.mine.filter(c=>bal(c)>0 && c.phone);
  let html = `<div class="page">${H.nav(t("integrations"))}<p class="ctx">${t(plan==="personal"?"integ_hint_personal":"integ_hint")}</p>`;
  /* WhatsApp links — everyone */
  html += `<div class="sec-h"><span class="h2">${ic("wa",18)} ${t("wa_links")}</span></div><p class="ctx">${t("wa_links_hint")}</p>
    ${owed.length?`<div class="glass list">${owed.map(c=>`<div class="row"><span class="avatar sm">${esc(cname(c).charAt(0))}</span><div class="grow"><div class="t1">${esc(cname(c))}</div><div class="t2">${t("owes_you")} <span class="num">${fmt(bal(c))}</span> · <span class="num" dir="ltr">${esc(c.phone)}</span></div></div><a class="btn btn-sm btn-wa" href="${SC.waLink(c.phone, SC.waBalanceText(c))}" target="_blank" rel="noopener" data-act="wasent" data-v="${c.id}">${ic("wa",15)} ${t("send")}</a></div>`).join("")}</div>`:`<div class="allclear glass">${ic("ok",18)}<span>${t("no_debtors")}</span></div>`}`;
  if(plan==="personal"){
    const open = SC.P().custodies.filter(c=>c.status==="open" && c.phone);
    if(open.length) html += `<div class="sec-h"><span class="h2">${t("tab_pcust")}</span></div><div class="glass list">${open.map(c=>`<div class="row"><span class="ico">${ic("wallet",18)}</span><div class="grow"><div class="t1">${esc(noteOf(c.party))}</div><div class="t2">${t("remaining")} <span class="num">${fmt(SC.pcStats(c).balance)}</span></div></div><a class="btn btn-sm btn-wa" href="${SC.waLink(c.phone, SC.waCustodyText(c))}" target="_blank" rel="noopener" data-act="wasent" data-v="${c.id}">${ic("wa",15)} ${t("send")}</a></div>`).join("")}</div>`;
    html += `<div class="banner b-info">${ic("info",18)}<span>${t("erp_for_business")}</span></div>`;
    return html + `<div class="spacer"></div></div>`;
  }
  /* WhatsApp Business API */
  html += `<div class="sec-h"><span class="h2">${ic("wa",18)} ${t("wa_business")}</span><span class="pill ${wa.connected?"p-approved":"p-withdrawn"}">${t(wa.connected?"connected":"not_connected")}</span></div>
    <div class="glass card stackc">${wa.connected?`<div class="kv-row"><span class="t2">${t("sender_number")}</span><b class="num" dir="ltr">${esc(wa.number)}</b></div>
      <div class="t2">${t("wa_events")}</div>
      ${Object.keys(wa.events).map(k=>`<div class="row inline"><div class="grow t1 wrap">${t("wae_"+k)}</div><button class="switch ${wa.events[k]?"on":""}" role="switch" aria-checked="${!!wa.events[k]}" data-act="watoggle" data-v="${k}" ${admin?"":"disabled"} aria-label="${esc(t("wae_"+k))}"></button></div>`).join("")}
      ${admin?`<button class="btn btn-glass" data-act="wadisconnect">${t("disconnect")}</button>`:""}`
    : `<p class="sub">${t("wa_business_hint")}</p>${admin?`<button class="btn btn-wa" data-act="sheet" data-v="waconnect">${ic("wa",18)}${t("connect_wa")}</button>`:""}`}</div>
    ${wa.connected?`<div class="sec-h"><span class="h2">${t("wa_outbox")}</span><span class="t2 num">${SC.S.waOutbox.length}</span></div>
      ${SC.S.waOutbox.length?`<div class="glass list">${SC.S.waOutbox.slice(0,8).map(m=>`<div class="row"><span class="ico wa-ic">${ic("wa",18)}</span><div class="grow"><div class="t1 wrap">${esc(SC.waText(m))}</div><div class="t2"><span class="num" dir="ltr">${esc(m.phone)}</span> · ${esc(SC.uname(m.to))} · ${esc(SC.ago(m.t))}</div></div><span class="pill p-approved">${t("wa_sent")}</span></div>`).join("")}</div>`:`<p class="ctx">${t("wa_outbox_empty")}</p>`}`:""}`;
  /* ERP */
  const list = SC.ERP.filter(x=>plan==="enterprise" || x.tier==="business").concat(plan==="business" ? SC.ERP.filter(x=>x.tier==="enterprise") : []);
  const pending = SC.erpPending();
  html += `<div class="sec-h"><span class="h2">${ic("building",18)} ${t("erp_systems")}</span><button class="link" data-act="sheet" data-v="mapping">${t("account_mapping")}</button></div>
    <p class="ctx">${t("erp_hint",{n:pending.length})}</p>
    ${list.map(x=>{ const c = erp.connections[x.k]; return `<div class="erp glass ${c?"on":""}"><div class="ap-top"><span class="erp-logo">${esc(x.name.charAt(0))}</span><div class="grow"><div class="t1">${esc(x.name)}</div><div class="t2">${esc(x.api)} · ${x.fmt.toUpperCase()}</div></div><span class="pill ${c?"p-approved":"p-withdrawn"}">${t(c?"connected":"not_connected")}</span></div>
      ${c?`<div class="t2"><span class="num" dir="ltr">${esc(c.url)}</span> · ${t("company_code")} <span class="num">${esc(c.company)}</span>${c.last?` · ${t("last_sync")} ${esc(SC.ago(c.last))}`:""}</div>
        ${admin?`<div class="erp-acts"><button class="btn btn-sm btn-primary" data-act="erppush" data-v="${x.k}" ${pending.length?"":"disabled"}>${ic("up",15)} ${t("erp_send",{n:pending.length})}</button><button class="btn btn-sm btn-glass" data-act="erpfile" data-v="${x.k}">${ic("sheet",15)} ${t("download_file")}</button><button class="btn btn-sm btn-glass" data-act="erpdisconnect" data-v="${x.k}">${t("disconnect")}</button></div>`:""}`
      : admin?`<div class="erp-acts"><button class="btn btn-sm btn-glass" data-act="sheet" data-v="erpconnect" data-k="${x.k}">${ic("link",15)} ${t("connect")}</button><button class="btn btn-sm btn-glass" data-act="erpfile" data-v="${x.k}">${ic("sheet",15)} ${t("download_file")}</button></div>`:""}</div>` }).join("")}
    ${erp.log.length?`<div class="sec-h"><span class="h2">${t("sync_log")}</span></div><div class="glass list">${erp.log.slice(0,8).map(e=>`<button class="row" data-act="go" data-v="folder:${e.folder}"><span class="ico">${ic(e.status==="ok"?"ok":"warn",18)}</span><div class="grow"><div class="t1 num">${SC.fno(e.folder)} → ${esc(SC.ERP.find(x=>x.k===e.sys)?.name||e.sys)}</div><div class="t2"><span class="num">${esc(e.ref)}</span> · ${t("lines_n",{n:e.lines})} · <span class="num">${SC.dt(e.t)}</span></div></div>${H.ic("lock",14)}</button>`).join("")}</div>`:""}
    <div class="sec-h"><span class="h2">${ic("api",18)} ${t("api_webhooks")}</span></div>
    <div class="glass card api">${API.map(([m,p])=>`<div class="api-r"><span class="api-m ${m.toLowerCase()}">${m}</span><code dir="ltr">${p}</code></div>`).join("")}
      <div class="t2" style="margin-top:8px">${t("webhooks")}</div><div class="chips">${HOOKS.map(h=>`<span class="chip num" dir="ltr">${h}</span>`).join("")}</div></div>
    <div class="banner b-info">${ic("info",18)}<span>${t("integ_demo_note")}</span></div><div class="spacer"></div></div>`;
  return html;
}

/* ------------------------------------------------------------------ view registration */
const baseHome = V.home, baseMe = V.me;
V.home = () => SC.plan()==="personal" ? pHome() : SC.plan()==="business" ? bHome() : baseHome();
const personalOnly = f => () => SC.P() ? f() : V.home();
V.pexp = personalOnly(pExpenses); V.pcust = personalOnly(pCustodies); V.pcustody = personalOnly(pCustody); V.integ = vInteg;
V.me = () => { let h = baseMe(); const row = `<button class="row" data-act="go" data-v="integ"><span class="ico">${ic("plug",20)}</span><div class="grow"><div class="t1">${t("integrations")}</div><div class="t2">${t("integ_short")}</div></div>${ic("chev",16,"flip")}</button>`;
  h = h.replace('<button class="row" data-act="go" data-v="export">', row + '<button class="row" data-act="go" data-v="export">');
  if(SC.plan()==="personal") h = h.replace(/<button class="row" data-act="go" data-v="folders">[\s\S]*?<\/button>/, "");
  return h.replace('<div class="sec-h"><span class="h2">', `<div class="ws-org me">${ic(WS.find(w=>w[0]===SC.ws)[1],16)} ${esc(SC.orgName())} · ${t("ws_"+SC.ws)}</div><div class="sec-h"><span class="h2">`) };
const baseHomeEnt = V.home;
/* enterprise finance/admin get an integrations bubble on the home screen */
V.home = () => { const h = baseHomeEnt(); const m = SC.me(); if(SC.plan()==="enterprise" && ["finance","admin"].includes(m.role)) return h.replace(/(<div class="bubbles">)([\s\S]*?)(<button class="bubble" data-act="go" data-v="(?:export|backup)">)/, `$1$2${H.bubble("plug",t("integrations"),"go","integ")}$3`).replace(/(<div class="bubbles">)((?:<button class="bubble"[\s\S]*?<\/button>){5})<button class="bubble"[\s\S]*?<\/button>/, "$1$2"); return h };

/* ------------------------------------------------------------------ sheets */
SC.sheet2 = (s, wrap, err) => {
  const f = s.f || {}, fld = H.fld, sel = H.sel;
  switch(s.type){
    case "pexp": return wrap(`<input id="f-amt" data-bind="amt" class="amount-in" inputmode="decimal" placeholder="0.00" value="${esc(f.amt||"")}" aria-label="${t("amount")}">
      <div class="catgrid">${D.PCATS.map(c=>`<button class="catb ${(f.cat||"food")===c?"on":""}" data-act="pickcat" data-v="${c}">${ic(PCI[c],20)}<span>${t("pc_"+c)}</span></button>`).join("")}</div>
      ${fld("note", t("x_note"))}${err}<button class="btn btn-accent" data-act="dopexp">${t("save")}</button>`, t("add_expense"));
    case "pcust": return wrap(`<div class="mini-seg full">${["received","given"].map(k=>`<button data-act="pickdir" data-v="${k}" aria-pressed="${(f.dir||"received")===k}">${t("cust_"+k)}</button>`).join("")}</div>
      <p class="sub small">${t((f.dir||"received")==="received"?"cust_received_hint":"cust_given_hint")}</p>
      ${fld("party", t((f.dir||"received")==="received"?"cust_from":"cust_to"))}${fld("phone", t("phone")+" (WhatsApp)", 'inputmode="tel" dir="ltr" placeholder="05xxxxxxxx"')}${fld("amount", `${t("amount")} (${SC.cur()})`, 'inputmode="decimal"')}${err}
      <button class="btn btn-primary" data-act="dopcust">${t("new_custody")}</button>`, t("new_custody"));
    case "pspend": return wrap(`<input id="f-amt" data-bind="amt" class="amount-in" inputmode="decimal" placeholder="0.00" value="${esc(f.amt||"")}" aria-label="${t("amount")}">
      <div class="catgrid">${D.PCATS.map(c=>`<button class="catb ${(f.cat||"food")===c?"on":""}" data-act="pickcat" data-v="${c}">${ic(PCI[c],20)}<span>${t("pc_"+c)}</span></button>`).join("")}</div>${fld("note", t("x_note"))}${err}<button class="btn btn-accent" data-act="dopspend">${t("save")}</button>`, t("record_spend"));
    case "ptopup": return wrap(`${fld("amount", `${t("amount")} (${SC.cur()})`, 'inputmode="decimal"')}${err}<button class="btn btn-accent" data-act="doptopup">${t("topup")}</button>`, t("topup"));
    case "budget": return wrap(`<p class="sub small">${t("budget_hint")}</p><div class="bgrid">${D.PCATS.map(c=>`<label class="fld"><span>${ic(PCI[c],14)} ${t("pc_"+c)}</span><input id="f-b-${c}" data-bind="b_${c}" inputmode="decimal" value="${esc(f["b_"+c] ?? SC.P().budgets[c] ?? "")}"></label>`).join("")}</div>${err}<button class="btn btn-primary" data-act="dobudget">${t("save")}</button>`, t("budgets"));
    case "waconnect": return wrap(`<p class="sub">${t("wa_connect_hint")}</p>${fld("number", t("sender_number"), 'inputmode="tel" dir="ltr" placeholder="+966 11 555 0100"')}${err}<button class="btn btn-wa" data-act="dowaconnect">${ic("wa",18)}${t("connect_wa")}</button>`, t("wa_business"));
    case "erpconnect": { const x = SC.ERP.find(e=>e.k===s.k); return wrap(`<p class="sub">${t("erp_connect_hint",{s:esc(x.name)})}</p>${fld("url", t("server_url"), 'inputmode="url" dir="ltr" placeholder="https://erp.company.com"')}${fld("company", t("company_code"), 'dir="ltr" placeholder="1000"')}${err}<button class="btn btn-primary" data-act="doerpconnect">${t("connect")}</button>`, x.name) }
    case "mapping": { const m = SC.erp().mapping; return wrap(`<p class="sub small">${t("mapping_hint")}</p><div class="bgrid">${[...D.CATS,"vat","advance"].map(c=>`<label class="fld"><span>${c==="vat"?t("vat_short"):c==="advance"?t("advance_label"):t("cat_"+c)}</span><input id="f-m-${c}" data-bind="m_${c}" inputmode="numeric" dir="ltr" value="${esc(f["m_"+c] ?? m[c] ?? "")}" ${SC.can("integrations")?"":"disabled"}></label>`).join("")}</div>${err}${SC.can("integrations")?`<button class="btn btn-primary" data-act="domapping">${t("save")}</button>`:""}`, t("account_mapping")) }
  }
  return "";
};

/* ------------------------------------------------------------------ events */
document.addEventListener("click", async e=>{
  const b = e.target.closest("[data-act]"); if(!b) return;
  const a = b.dataset.act, v = b.dataset.v, s = UI.sheet, F = s?.f || {};
  const num = x => { const n = Number(String(x??"").replace(/,/g,"").trim()); return isFinite(n) ? n : NaN };
  const err = k => { UI.sheet.err = k; SC.render(true) };
  const done = (msg) => { SC.save(); UI.sheet = null; if(msg) H.toast(t(msg)); SC.render(true) };
  switch(a){
    case "ws": { SC.switchWs(v); UI.stack = []; UI.sheet = null; UI.seg = {}; UI.f = {}; UI.q = ""; UI.loginErr = null; UI.screen = SC.me() ? (SC.me().mustChange ? "changepw" : "home") : "login"; UI.p = {}; SC.render(); document.getElementById("view")?.scrollTo(0,0); break }
    case "pickcat": UI.sheet.f.cat = v; SC.render(true); break;
    case "pickdir": UI.sheet.f.dir = v; SC.render(true); break;
    case "dopexp": { const r = SC.addPExpense({amt:SC.r2(num(F.amt)), cat:F.cat||"food", note:(F.note||"").trim()}); if(r){ err(r); break } done("toast_saved"); break }
    case "dopcust": { const r = SC.addCustody({dir:F.dir||"received", party:F.party, phone:(F.phone||"").trim(), amount:num(F.amount)}); if(r.err){ err(r.err); break } SC.save(); UI.sheet = null; H.go("pcustody:"+r.c.id); H.toast(t("toast_saved")); break }
    case "dopspend": { const c = SC.P().custodies.find(x=>x.id===UI.p.id); const r = SC.custodySpend(c, {amt:SC.r2(num(F.amt)), cat:F.cat||"food", note:(F.note||"").trim()}); if(r){ err(r); break } done("toast_saved"); break }
    case "doptopup": { const c = SC.P().custodies.find(x=>x.id===UI.p.id); const r = SC.custodyTopup(c, num(F.amount)); if(r){ err(r); break } done("toast_topup"); break }
    case "dopsettle": { const c = SC.P().custodies.find(x=>x.id===UI.p.id); SC.custodySettle(c); done("toast_settled"); break }
    case "dobudget": { for(const c of D.PCATS){ const raw = F["b_"+c]; if(raw===undefined) continue; const n = raw==="" ? 0 : num(raw); if(!(n>=0)){ err("enter_amount"); return } SC.P().budgets[c] = SC.r2(n) } done("toast_saved"); break }
    case "xpcust": { const c = SC.P().custodies.find(x=>x.id===UI.p.id); let run = 0;
      const rows = [...c.moves.map(m=>({t:m.t, d:t("pmv_"+m.kind), amt:m.kind==="return"?-m.amt:m.amt})), ...c.spent.map(x=>({t:x.t, d:noteOf(x.note)||t("pc_"+x.cat), amt:-x.amt}))].sort((x,y)=>new Date(x.t)-new Date(y.t))
        .map(r=>{ run = SC.r2(run+r.amt); return {[t("date")]:SC.dt(r.t), [t("x_desc")]:r.d, [t("x_in")]:r.amt>0?r.amt:"", [t("x_out")]:r.amt<0?-r.amt:"", [t("bal")]:run} });
      const r = await SC.xlsx(`${c.id}.xlsx`, [[t("x_statement"), rows]]); H.toast(r?t(r):t("toast_exported"), !!r); SC.render(true); break }
    case "dowaconnect": { const r = SC.waConnect(F.number); if(r){ err(r); break } done("toast_wa_connected"); break }
    case "wadisconnect": SC.waDisconnect(); SC.save(); SC.render(true); break;
    case "watoggle": { const ev = SC.S.integrations.wa.events; ev[v] = !ev[v]; SC.audit("au_wa_event", `${v}: ${ev[v]?"on":"off"}`); SC.save(); SC.render(true); break }
    case "doerpconnect": { const r = SC.erpConnect(s.k, {url:F.url, company:F.company}); if(r){ err(r); break } done("toast_erp_connected"); break }
    case "erpdisconnect": SC.erpDisconnect(v); SC.save(); SC.render(true); break;
    case "erppush": { const r = SC.erpPush(v); if(r.err){ H.toast(t(r.err), true); SC.render(true); break } SC.save(); H.toast(t("toast_erp_sent",{n:r.sent.length})); SC.render(true); break }
    case "erpfile": { const r = await SC.erpFile(v); SC.save(); H.toast(r?t(r):t("toast_exported"), !!r); SC.render(true); break }
    case "domapping": { const m = SC.erp().mapping; for(const k of [...D.CATS,"vat","advance"]){ const raw = F["m_"+k]; if(raw===undefined) continue; if(!/^\d{3,10}$/.test(String(raw).trim())){ err("err_gl"); return } m[k] = String(raw).trim() } SC.audit("au_mapping"); done("toast_saved"); break }
  }
});

})();
