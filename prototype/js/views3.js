/* Smart Cash prototype — v0.6 screens: payment links, payer checkout preview, payment settings, savings goals,
   smart card + calculator, organisation policy, system check, technical support; WhatsApp share on every transaction. */
(function(){
const SC = window.SC, D = window.SCDATA, H = SC.h, V = SC.VIEWS, UI = SC.UI;
const t = SC.t, esc = SC.esc, fmt = SC.fmt, ic = H.ic;

Object.assign(H.P, {
  vault:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5v1M12 14.5v1M8.5 12h1M14.5 12h1M6 19.5v1.5M18 19.5v1.5"/>',
  plane:'<path d="M10.5 13.5 3 11l1.5-1.5 7.5.5 4-4.5c1-1 2.6-1.3 3.2-.7s.3 2.2-.7 3.2L14 12l.5 7.5L13 21l-2.5-7.5"/>',
  laptop:'<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 18.5h18"/>',
  tg:'<path d="M20.5 4.5 3.5 11.2l5.6 2 2 5.8 3.1-3.6 4.4 3.3z"/><path d="m9.1 13.2 7.7-5.6-5.7 7.4"/>',
  mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  headset:'<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3.5" y="13.5" width="4" height="6" rx="1.5"/><rect x="16.5" y="13.5" width="4" height="6" rx="1.5"/><path d="M18.5 19.5c0 1.2-1.5 2-4 2h-1.5"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
  bolt:'<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>', clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  card:'<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>', phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
  spark2:'<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.9L12 18.5l-1.8-5.8L4.5 10.8 10.2 9z"/>', cash:'<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
});
const RT = () => SC.lang().dir==="rtl";
const pill = s => `<span class="pill pl-${s}">${t("pls_"+s)}</span>`;
const bal = c => c.entries.reduce((s,e)=>s+(e.dir==="gave"?e.amt:-e.amt),0);
const cname = c => c.n ? SC.nm(c.n) : c.name;
const waA = (href, label, cls="btn btn-wa", v="share") => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener" data-act="wasent" data-v="${esc(v)}">${ic("wa",18)}${label}</a>`;
const waIcon = (href, label) => `<a class="iconbtn glass wa" href="${esc(href)}" target="_blank" rel="noopener" data-act="wasent" data-v="share" aria-label="${esc(label)}" title="${esc(label)}">${ic("wa",19)}</a>`;
const kv = (k, v) => `<div class="kv-row"><span class="t2">${k}</span><b>${v}</b></div>`;
const VIA = ["mada","applepay","stcpay","visa","bank","cash"];

/* ================================================================== SMART CARD */
function smartCard(){
  const L = SC.smart(); if(!L.length) return "";
  return `<div class="sec-h"><span class="h2">${ic("spark2",18)} ${t("smart_calc")}</span><button class="link" data-act="sheet" data-v="calc">${ic("calc",15)} ${t("calculator")}</button></div>
    <div class="smart glass">${L.map(x=>`<button class="sm tone-${x.tone}" ${x.go?`data-act="go" data-v="${esc(x.go)}"`:`tabindex="-1"`}><span class="sm-ic">${ic(x.icon,17)}</span><span class="sm-k">${t(x.k)}</span><b class="sm-v num" ${/^[≤<>]/.test(x.v)?'dir="ltr"':""}>${esc(x.v)}</b><span class="sm-s">${esc(x.sub||"")}</span></button>`).join("")}</div>`;
}
const insertBefore = (html, marker, add) => { const k = html.indexOf(marker); return k<0 ? html : html.slice(0,k) + add + html.slice(k) };
const afterBubbles = (html, add) => { const b = html.indexOf('<div class="bubbles">'); if(b<0) return insertBefore(html, '<div class="spacer">', add);
  const k = html.indexOf('<div class="sec-h">', b); return k<0 ? insertBefore(html, '<div class="spacer">', add) : html.slice(0,k) + add + html.slice(k) };

/* ================================================================== HOME additions */
function savingsCard(){
  const G = SC.savings(); if(!G.length) return "";
  return `<div class="sec-h"><span class="h2">${t("savings")}</span><button class="link" data-act="go" data-v="psave">${t("see_all")}</button></div>
    <div class="goals">${G.slice(0,3).map(g=>{ const s = SC.goalStats(g); return `<button class="goal glass" data-act="go" data-v="pgoal:${g.id}">${H.ring(Math.round(s.pct*100),100,44,5,s.done?"var(--pos)":"var(--accent)", Math.round(s.pct*100)+"%")}
      <span class="g-n">${esc(SC.goalName(g))}</span><span class="g-v num">${SC.fmt0(s.saved)}<small>/${SC.fmt0(g.target)}</small></span></button>` }).join("")}</div>`;
}
const baseHome = V.home;
V.home = () => {
  let h = baseHome(); const plan = SC.plan(), m = SC.me();
  if(plan==="personal"){
    h = h.replace(/<div class="bubbles">[\s\S]*?<\/div>/, `<div class="bubbles">${H.bubble("plus",t("add_expense"),"sheet","pexp")}${H.bubble("up",t("gave"),"tab","ledger")}${H.bubble("link",t("request_pay"),"sheet","newpl")}${H.bubble("vault",t("savings"),"go","psave")}${H.bubble("wallet",t("new_custody"),"sheet","pcust")}</div>`);
    h = afterBubbles(h, smartCard() + savingsCard());
  } else if(plan==="business" && m.role==="owner"){
    h = h.replace(/<button class="bubble" data-act="go" data-v="export">[\s\S]*?<\/button>/, H.bubble("link",t("request_pay"),"sheet","newpl"));
    h = afterBubbles(h, smartCard());
  } else {
    h = afterBubbles(h, smartCard());
  }
  return h;
};

/* ================================================================== ME additions */
const baseMe = V.me;
const meRow = (icon, title, sub, v) => `<button class="row" data-act="go" data-v="${v}"><span class="ico">${ic(icon,20)}</span><div class="grow"><div class="t1">${title}</div><div class="t2">${sub}</div></div>${ic("chev",16,"flip")}</button>`;
V.me = () => {
  let h = baseMe(); const rows = [];
  if(SC.canPay()) rows.push(meRow("link", t("pay_links"), t("pay_links_sub"), "pay"));
  if(SC.canPaySettings()) rows.push(meRow("card", t("pay_settings"), t("pay_settings_sub"), "payset"));
  if(SC.plan()==="personal") rows.push(meRow("vault", t("savings"), t("savings_sub"), "psave"));
  if(SC.canPolicy() && SC.plan()!=="personal") rows.push(meRow("building", t(SC.plan()==="business"?"org_settings":"control_center"), t(SC.plan()==="business"?"org_settings_sub":"control_center_sub"), "orgset"));
  const m = SC.me(); if(["personal","owner","finance","admin","accountant"].includes(m.role)) rows.push(meRow("shield", t("system_check"), SC.S.lastCheck ? t("last_check",{a:SC.S.lastCheck.ok, b:SC.S.lastCheck.n, d:SC.ago(SC.S.lastCheck.t)}) : t("system_check_sub"), "check"));
  rows.push(meRow("headset", t("support"), t("support_sub"), "support"));
  const marker = '<button class="row" data-act="go" data-v="integ">';
  return h.includes(marker) ? h.replace(marker, rows.join("") + marker) : insertBefore(h, '<div class="spacer">', `<div class="glass list">${rows.join("")}</div>`);
};

/* login: support link under the form */
const baseLogin = V.login;
V.login = () => { const h = baseLogin(), k = h.lastIndexOf("</div>"); return h.slice(0,k) + `<button class="sup-link" data-act="go" data-v="support">${ic("headset",16)} ${t("support_login")}</button>` + h.slice(k) };

/* ================================================================== PAYMENT LINKS */
function vPay(){
  if(!SC.canPay()) return V.home();
  const all = SC.plMine(), T = SC.plTotals(all), f = H.segv("plf","all");
  const list = f==="all" ? all : all.filter(p=>SC.plStatus(p)===f);
  const ready = SC.payReady();
  return `<div class="page">${H.nav(t("pay_links"), true, SC.canPaySettings()?`<button class="iconbtn glass" data-act="go" data-v="payset" aria-label="${t("pay_settings")}">${ic("card",20)}</button>`:"")}
    <div class="hero static"><div class="hero-top"><span class="hero-l">${t("awaiting_payment")}</span><span class="hero-chip">${t("links_n",{n:T.pendingN})}</span></div>
      <div class="hero-big num">${fmt(T.pending)}<span class="cur">${SC.cur()}</span></div>
      <div class="hero-stats"><div><span>${t("paid_this_month")}</span><b class="num">${SC.fmt0(T.paid)}</b></div><div><span>${t("pls_expired")}</span><b class="num">${T.expired}</b></div><div><span>${t("pay_methods")}</span><b>${[ready.link?SC.gwName():"", ready.bank?"IBAN":""].filter(Boolean).join(" · ")||"—"}</b></div></div></div>
    ${!ready.link && !ready.bank ? `<button class="banner b-warn" data-act="go" data-v="payset">${ic("warn",18)}<span>${t("pay_not_ready")}</span></button>` : ""}
    ${H.seg("plf",[["all",t("all")],["pending",t("pls_pending")],["paid",t("pls_paid")],["expired",t("pls_expired")]],"all")}
    ${list.length ? `<div class="glass list">${list.map(p=>`<button class="row" data-act="go" data-v="plink:${p.id}"><span class="ico ${p.status==="paid"?"pos":""}">${ic(p.kind==="invoice"?"receipt":p.kind==="custody"?"wallet":"link",19)}</span>
      <div class="grow"><div class="t1"><bdi>${esc(SC.plName(p))}</bdi></div><div class="t2"><span class="num">${p.id}</span> · ${esc(SC.ago(p.t))}${p.desc?` · ${esc(SC.nm(p.desc))}`:""}</div></div>
      <div class="end"><div class="amt num">${fmt(p.amt)}</div>${pill(SC.plStatus(p))}</div></button>`).join("")}</div>` : H.empty("relay", t("no_links"), t("no_links_sub"))}
    <div class="spacer"></div><div class="footer"><button class="btn btn-accent" data-act="sheet" data-v="newpl">${ic("plus",18)}${t("request_pay")}</button></div></div>`;
}
function vPlink(){
  const p = SC.PL().find(x=>x.id===UI.p.id); if(!p) return vPay();
  const st = SC.plStatus(p), ps = SC.payset(), msg = SC.plText(p);
  const ref = p.kind==="invoice" ? `<button class="link num" data-act="go" data-v="invoice:${p.ref}">${p.ref}</button>` : p.kind==="custody" ? `<button class="link num" data-act="go" data-v="pcustody:${p.ref}">${p.ref}</button>` : "";
  return `<div class="page">${H.nav(`<span class="num">${p.id}</span>`)}
    <div class="pl-head"><div class="pl-amt num">${fmt(p.amt)} <span class="cur">${SC.cur()}</span></div>${pill(st)}<div class="sub"><bdi>${esc(SC.plName(p))}</bdi>${p.desc?` · ${esc(SC.nm(p.desc))}`:""}</div></div>
    <div class="glass card stackc">
      ${kv(t("pl_method"), t("plm_"+p.method) + (p.method!=="bank" && p.gw ? ` · ${esc(D.GATEWAYS.find(g=>g.k===p.gw)?.name||"")}` : ""))}
      ${p.phone?kv(t("phone"), `<span class="num" dir="ltr">${esc(p.phone)}</span>`):""}
      ${kv(t("created"), `<span class="num">${SC.dt(p.t)}</span> · ${esc(SC.uname(p.by))}`)}
      ${st==="paid" ? kv(t("paid_on"), `<span class="num">${SC.dt(p.paidAt)}</span> · ${t("via_"+p.paidVia)}`) : kv(t("valid_until"), `<span class="num">${SC.dd(p.exp)}</span>`)}
      ${ref?kv(t("linked_to"), ref):""}
      ${p.method!=="bank"?`<div class="pl-url"><code dir="ltr">${esc(SC.plURL(p))}</code><button class="iconbtn" data-act="copytxt" data-v="url" aria-label="${t("copy")}">${ic("copy",17)}</button></div><div class="t2 small">${t("pl_url_demo")}</div>`:""}
      ${p.method!=="link"?`<div class="pl-url"><code dir="ltr">${esc(SC.ibanFmt(ps.iban))}</code><button class="iconbtn" data-act="copytxt" data-v="iban" aria-label="${t("copy")}">${ic("copy",17)}</button></div>`:""}
    </div>
    <div class="sec-h"><span class="h2">${t("message_preview")}</span><button class="link" data-act="copytxt" data-v="msg">${ic("copy",14)} ${t("copy")}</button></div>
    <div class="wa-bubble" dir="auto">${esc(st==="paid"?SC.plReceipt(p):msg).replace(/\n/g,"<br>")}</div>
    <div class="pad-x stack" style="margin-top:12px">
      ${st==="pending" ? waA(SC.waShare(p.phone, msg), t("send_wa"), "btn btn-wa", p.id) : st==="paid" ? waA(SC.waShare(p.phone, SC.plReceipt(p)), t("send_receipt"), "btn btn-wa", p.id) : ""}
      ${st==="pending" ? `<div class="two"><button class="btn btn-glass" data-act="go" data-v="paypage:${p.id}">${ic("phone",18)}${t("payer_view")}</button><button class="btn btn-glass" data-act="sheet" data-v="plpaid">${ic("ok",18)}${t("mark_paid")}</button></div>
        <button class="btn btn-text neg" data-act="plcancel">${t("cancel_link")}</button>` : ""}
      ${st==="expired" ? `<button class="btn btn-primary" data-act="plrenew">${ic("undo",18)}${t("renew_link")}</button>` : ""}
    </div><div class="spacer"></div></div>`;
}
/* what the customer sees when they open the link — a simulation of the gateway's hosted page */
function vPaypage(){
  const p = SC.PL().find(x=>x.id===UI.p.id); if(!p) return vPay();
  const st = SC.plStatus(p), g = D.GATEWAYS.find(x=>x.k===p.gw), ps = SC.payset();
  const methods = (g?.methods||[]).filter(k=>k!=="stcpay" || g.k==="moyasar");
  return `<div class="page paypage">${H.nav(t("payer_view"))}
    <div class="banner b-info">${ic("info",18)}<span>${t("payer_demo_note")}</span></div>
    <div class="checkout">
      <div class="co-org"><span class="co-logo">${esc(SC.orgName().charAt(0))}</span><div><b>${esc(SC.orgName())}</b><div class="t2">${t("pay_request_to",{n:esc(SC.plName(p))})}</div></div></div>
      <div class="co-amt num">${fmt(p.amt)} <span>${SC.cur()}</span></div>
      ${p.desc?`<div class="t2 center">${esc(SC.nm(p.desc))}</div>`:""}
      <div class="t2 center num">${p.id} · ${t("valid_until")} ${SC.dd(p.exp)}</div>
      ${st==="paid" ? `<div class="co-done">${ic("ok",34)}<b>${t("payment_done")}</b><span class="num">${SC.dt(p.paidAt)}</span></div>`
      : st!=="pending" ? `<div class="co-done bad">${ic("warn",30)}<b>${t("pls_"+st)}</b></div>`
      : `${p.method!=="bank"&&g?`<div class="co-methods">${methods.map(k=>`<button class="co-m" data-act="paynow" data-v="${k}">${ic(k==="applepay"?"phone":k==="stcpay"?"phone":"card",18)}<span>${t("via_"+k)}</span></button>`).join("")}</div>`:""}
        ${p.method!=="link"?`<div class="co-bank"><div class="t2">${t("or_transfer")}</div><b>${esc(Array.isArray(ps.holder)?(SC.ui.lang==="ar"?ps.holder[0]:ps.holder[1]):ps.holder)}</b><div>${esc(SC.nm("bk_"+ps.bank))}</div><code dir="ltr">${esc(SC.ibanFmt(ps.iban))}</code><div class="t2">${t("ref_label")} <span class="num">${p.id}</span></div><button class="btn btn-glass btn-sm" data-act="paynow" data-v="bank">${t("i_transferred")}</button></div>`:""}
        <div class="co-secure">${ic("lock",13)} ${t("secure_note",{g:esc(g?.name||t("bank_transfer"))})}</div>`}
    </div><div class="spacer"></div></div>`;
}
function vPayset(){
  if(!SC.canPaySettings()) return V.home();
  const ps = SC.payset(), g = ps.gateway, hn = Array.isArray(ps.holder) ? (SC.ui.lang==="ar"?ps.holder[0]:ps.holder[1]) : ps.holder;
  return `<div class="page">${H.nav(t("pay_settings"))}<p class="ctx">${t(SC.plan()==="personal"?"payset_hint_personal":"payset_hint")}</p>
    <div class="sec-h"><span class="h2">${ic("building",18)} ${t("bank_account")}</span><button class="link" data-act="sheet" data-v="payset">${ic("edit",14)} ${t("edit")}</button></div>
    <div class="glass card stackc">${kv(t("beneficiary"), esc(hn||"—"))}${kv(t("bank"), esc(ps.bank?SC.nm("bk_"+ps.bank):"—"))}${kv("IBAN", ps.iban?`<span class="num" dir="ltr">${esc(SC.ibanFmt(ps.iban))}</span> ${SC.ibanOk(ps.iban)?ic("ok",14):ic("warn",14)}`:"—")}${SC.plan()==="personal"?kv("STC Pay", ps.stc?`<span class="num" dir="ltr">${esc(ps.stc)}</span>`:"—"):""}</div>
    ${SC.plan()==="personal" ? `<div class="banner b-info">${ic("info",18)}<span>${t("gw_for_business")}</span></div>` : `
    <div class="sec-h"><span class="h2">${ic("card",18)} ${t("payment_gateway")}</span>${g?`<span class="pill p-approved">${t("connected")}</span>`:""}</div>
    <p class="ctx">${t("gw_hint")}</p>
    ${D.GATEWAYS.map(x=>{ const on = g?.k===x.k; return `<div class="erp glass ${on?"on":""}"><div class="ap-top"><span class="erp-logo">${esc(x.name.charAt(0))}</span><div class="grow"><div class="t1">${esc(x.name)}</div><div class="t2">${x.methods.map(k=>t("via_"+k)).join(" · ")}</div></div>${on?`<span class="pill p-approved">${t("connected")}</span>`:""}</div>
      ${on?`<div class="t2">${t("merchant_id")} <span class="num" dir="ltr">${esc(g.merchant.slice(0,6))}…</span> · <span class="num">${SC.dd(g.at)}</span></div><div class="erp-acts"><button class="btn btn-sm btn-glass" data-act="gwdisconnect">${t("disconnect")}</button></div>`
        : `<div class="erp-acts"><button class="btn btn-sm btn-glass" data-act="sheet" data-v="gwconnect" data-k="${x.k}">${ic("link",15)} ${t(g?"switch_to":"connect")}</button></div>`}</div>` }).join("")}
    <div class="banner b-info">${ic("info",18)}<span>${t("gw_demo_note")}</span></div>`}
    <div class="spacer"></div></div>`;
}

/* ================================================================== SAVINGS */
const GICON = ["vault","plane","laptop","home","cap","heart","store","star"];
function vSave(){
  if(!SC.P()) return V.home();
  const G = SC.savings(), total = SC.savedTotal(), monthly = SC.r2(G.reduce((s,g)=>{ const x = SC.goalStats(g); return s + (x.done?0:(x.monthly||0)) },0));
  return `<div class="page">${H.nav(t("savings"), true, `<button class="iconbtn glass" data-act="sheet" data-v="newgoal" aria-label="${t("new_goal")}">${ic("plus",20)}</button>`)}
    <div class="hero static save"><div class="hero-top"><span class="hero-l">${t("saved_total")}</span><span class="hero-chip">${t("goals_n",{n:G.length})}</span></div>
      <div class="hero-big num">${fmt(total)}<span class="cur">${SC.cur()}</span></div>
      <div class="hero-stats"><div><span>${t("monthly_needed")}</span><b class="num">${SC.fmt0(monthly)}</b></div><div><span>${t("target_total")}</span><b class="num">${SC.fmt0(G.reduce((s,g)=>s+g.target,0))}</b></div><div><span>${t("goals_done")}</span><b class="num">${G.filter(g=>SC.goalStats(g).done).length}</b></div></div></div>
    <p class="ctx">${t("savings_hint")}</p>
    ${G.length ? G.map(g=>{ const s = SC.goalStats(g); return `<button class="pcard glass" data-act="go" data-v="pgoal:${g.id}"><div class="ap-top"><span class="ico">${ic(g.icon||"vault",20)}</span><div class="grow"><div class="t1">${esc(SC.goalName(g))}</div><div class="t2">${g.deadline?`${t("by_date")} <span class="num">${SC.dd(g.deadline)}</span>`:t("no_deadline")}${s.monthly&&!s.done?` · ${t("per_month",{n:SC.fmt0(s.monthly)})}`:""}</div></div>
      <div class="end"><div class="amt num">${SC.fmt0(s.saved)}</div><div class="t2 num">/ ${SC.fmt0(g.target)}</div></div></div><div class="bbar save ${s.done?"done":""}"><i style="width:${s.pct*100}%"></i></div></button>` }).join("") : H.empty("vault", t("no_goals"))}
    <div class="spacer"></div><div class="footer"><button class="btn btn-accent" data-act="sheet" data-v="newgoal">${ic("plus",18)}${t("new_goal")}</button></div></div>`;
}
function vGoal(){
  const g = SC.savings().find(x=>x.id===UI.p.id); if(!g) return vSave(); const s = SC.goalStats(g);
  return `<div class="page">${H.nav(esc(SC.goalName(g)))}
    <div class="goal-hero">${H.ring(Math.round(s.pct*100),100,132,10,s.done?"var(--pos)":"var(--accent)", Math.round(s.pct*100)+"%")}<div class="pl-amt num">${fmt(s.saved)} <span class="cur">${SC.cur()}</span></div><div class="sub">${t("of_target",{n:SC.fmt0(g.target)})}</div></div>
    <div class="totals"><div class="glass"><span>${t("remaining")}</span><b class="num">${SC.fmt0(s.left)}</b></div><div class="glass"><span>${t("monthly_needed")}</span><b class="num">${s.monthly!==null?SC.fmt0(s.monthly):"—"}</b></div></div>
    ${s.done?`<div class="banner b-ok">${ic("ok",18)}<span>${t("goal_reached")}</span></div>`:""}
    <div class="two pad-x" style="margin-top:12px"><button class="btn btn-accent" data-act="sheet" data-v="goalmove" data-k="in">${ic("plus",18)}${t("add_savings")}</button><button class="btn btn-glass" data-act="sheet" data-v="goalmove" data-k="out">${ic("up",18)}${t("withdraw_savings")}</button></div>
    <div class="sec-h"><span class="h2">${t("history")}</span></div>
    <div class="glass list">${g.moves.slice().reverse().map(m=>`<div class="row"><span class="ico ${m.kind==="in"?"pos":""}">${ic(m.kind==="in"?"down":"up",18)}</span><div class="grow"><div class="t1">${t(m.kind==="in"?"sv_in":"sv_out")}</div><div class="t2 num">${SC.dt(m.t)}</div></div><div class="amt num ${m.kind==="in"?"pos":"neg"}">${m.kind==="in"?"+":"−"}${fmt(m.amt)}</div></div>`).join("") || `<div class="row t2">${t("no_entries")}</div>`}</div>
    <div class="pad-x"><button class="btn btn-text neg" data-act="goaldelete">${t("delete_goal")}</button></div><div class="spacer"></div></div>`;
}

/* ================================================================== ORGANISATION SETTINGS / CONTROL CENTER */
function vOrgset(){
  if(!SC.canPolicy() || SC.plan()==="personal") return V.home();
  const P = SC.orgPolicy(), O = SC.S.org, ent = SC.plan()==="enterprise";
  return `<div class="page">${H.nav(t(ent?"control_center":"org_settings"), true, `<button class="iconbtn glass" data-act="sheet" data-v="orgset" aria-label="${t("edit")}">${ic("edit",20)}</button>`)}
    <p class="ctx">${t(ent?"control_center_hint":"org_settings_hint")}</p>
    ${ent ? `<div class="sec-h"><span class="h2">${t("approval_policy")}</span></div>
      <div class="glass list">${[["fast",`≤ ${SC.fmt0(P.fast)}`,["supervisor","accountant"]],["std",`${SC.fmt0(P.fast)} – ${SC.fmt0(P.std)}`,["supervisor","engineer","pm","accountant","finance"]],["full",`> ${SC.fmt0(P.std)}`,["supervisor","engineer","pm","accountant","procurement","finance"]]].map(([k,r,steps])=>`<div class="row"><span class="ico">${ic(k==="fast"?"bolt":k==="std"?"checks":"shield",19)}</span><div class="grow"><div class="t1">${t("path_"+k+"_t")} · <span class="num" dir="ltr">${r}</span></div><div class="t2">${steps.map(s=>t("role_"+s)).join(RT()?" ← ":" → ")}</div></div></div>`).join("")}</div>
      <div class="sec-h"><span class="h2">${t("control_scope")}</span></div>
      <div class="glass list">${[["users",SC.S.users.length,"users"],["branches",SC.S.branches.length,"org"],["projects",SC.S.projects.length,"org"],["roles",Object.keys(D.PERMS).filter(r=>!["owner","personal"].includes(r)).length,"roles"]].map(([k,n,go])=>`<button class="row" data-act="tab" data-v="${go}"><div class="grow t1">${t("cc_"+k)}</div><b class="num">${SC.fmt0(n)}</b>${ic("chev",16,"flip")}</button>`).join("")}</div>`
    : `<div class="glass card stackc">${kv(t("org_name"), esc(SC.orgName()))}${kv(t("vat_no"), O.vat?`<span class="num" dir="ltr">${esc(O.vat)}</span>`:"—")}${kv(t("cr_no"), O.cr?`<span class="num" dir="ltr">${esc(O.cr)}</span>`:"—")}${kv(t("auto_approve"), P.auto?`<span class="num" dir="ltr">≤ ${SC.fmt0(P.auto)}</span> ${SC.cur()}`:t("off"))}</div>
      <p class="ctx">${t("auto_approve_hint")}</p>`}
    <div class="spacer"></div></div>`;
}

/* ================================================================== SYSTEM CHECK */
function vCheck(){
  const R = UI.checkRes, last = SC.S.lastCheck;
  return `<div class="page">${H.nav(t("system_check"))}<p class="ctx">${t("system_check_hint")}</p>
    ${R ? `<div class="check-sum glass ${R.every(r=>r.ok)?"ok":"bad"}">${H.ring(R.filter(r=>r.ok).length, R.length, 56, 6, R.every(r=>r.ok)?"var(--pos)":"var(--warn)", `${R.filter(r=>r.ok).length}/${R.length}`)}<div><b>${t(R.every(r=>r.ok)?"check_all_ok":"check_some_bad",{n:R.filter(r=>!r.ok).length})}</b><div class="t2 num">${SC.dt(last?.t)}</div></div></div>
      <div class="glass list">${R.map(r=>`<div class="row"><span class="ico ${r.ok?"pos":"neg"}">${ic(r.ok?"ok":"warn",18)}</span><div class="grow"><div class="t1 wrap">${t(r.k)}</div>${r.d?`<div class="t2 num wrap">${esc(r.d)}</div>`:""}</div></div>`).join("")}</div>`
      : `<div class="empty">${ic("shield",44)}<div class="sub">${last?t("last_check",{a:last.ok,b:last.n,d:SC.ago(last.t)}):t("never_checked")}</div></div>`}
    <div class="spacer"></div><div class="footer"><button class="btn btn-primary" data-act="runcheck">${ic("shield",18)}${t(R?"run_again":"run_check")}</button></div></div>`;
}

/* ================================================================== SUPPORT */
function vSupport(){
  const S = SC.SUPPORT;
  return `<div class="page">${H.nav(t("support"), true)}
    <div class="sup-hero"><span class="sup-ic">${ic("headset",30)}</span><h2 class="h2">${t("support_title")}</h2><p class="sub">${t("support_hint")}</p></div>
    <div class="sup-grid">
      <a class="sup-c wa" href="${esc(SC.supportWa())}" target="_blank" rel="noopener"><span class="sup-b">${ic("wa",24)}</span><b>${t("whatsapp")}</b><span class="num" dir="ltr">${S.phone}</span></a>
      <a class="sup-c tg" href="${esc(SC.supportTg())}" target="_blank" rel="noopener"><span class="sup-b">${ic("tg",24)}</span><b>${t("telegram")}</b><span class="num" dir="ltr">${S.phone}</span></a>
    </div>
    <div class="glass list" style="margin-top:12px">
      <div class="row"><span class="ico">${ic("phone",19)}</span><div class="grow"><div class="t2">${t("support_phone")}</div><div class="t1 num sel" dir="ltr">${S.phone}</div></div><button class="iconbtn" data-act="copytxt" data-v="phone" aria-label="${t("copy")}">${ic("copy",17)}</button></div>
      <div class="row"><span class="ico">${ic("mail",19)}</span><div class="grow"><div class="t2">${t("email")}</div><div class="t1 sel" dir="ltr">${S.email}</div></div><button class="iconbtn" data-act="copytxt" data-v="email" aria-label="${t("copy")}">${ic("copy",17)}</button></div>
    </div>
    <p class="ctx small">${t("support_mail_note")}</p>
    <div class="sec-h"><span class="h2">${t("faq")}</span></div>
    <div class="glass list faq">${[1,2,3,4,5].map(n=>`<details class="row-d"><summary>${t("faq_q"+n)}</summary><p>${t("faq_a"+n)}</p></details>`).join("")}</div>
    <div class="spacer"></div></div>`;
}

/* ================================================================== PERSON (ledger) — rebuilt with payment links and per-transaction sharing */
V.person = () => {
  const c = SC.S.contacts.find(x=>x.id===UI.p.id); if(!c) return V.ledger();
  const b = bal(c); let run = 0; const rows = c.entries.map(e=>{ run += e.dir==="gave"?e.amt:-e.amt; return {...e, run} }).reverse();
  const links = SC.plFor("contact", c.id).filter(p=>SC.plStatus(p)==="pending");
  return `<div class="page">${H.nav(`<bdi>${esc(cname(c))}</bdi>`, true, `<button class="iconbtn glass" data-act="convert" aria-label="${t("convert")}">${ic("swap",20)}</button>`)}
    <div class="person-head"><div class="sub">${t(b>0?"owes_you":b<0?"you_owe":"settled")} · ${t(c.kind==="customer"?"customer":"supplier_k")}${c.phone&&c.phone!=="—"?` · <span class="num" dir="ltr">${esc(c.phone)}</span>`:""}</div><div class="hero-amt ${b>0?"pos":b<0?"neg":""}">${H.money(Math.abs(b))}</div></div>
    <div class="acts3 pad-x">
      ${waA(SC.waShare(c.phone, SC.waBalanceText(c)), t("remind"), "btn btn-wa", c.id)}
      ${SC.canPay() && b>0 ? `<button class="btn btn-primary" data-act="sheet" data-v="newpl" data-k="${c.id}">${ic("link",18)}${t("request_pay")}</button>` : ""}
      <button class="btn btn-glass" data-act="xperson">${ic("sheet",18)}${t("ledger_statement")}</button></div>
    ${links.length?`<div class="sec-h"><span class="h2">${t("open_links")}</span></div><div class="glass list">${links.map(p=>`<button class="row" data-act="go" data-v="plink:${p.id}"><span class="ico">${ic("link",18)}</span><div class="grow"><div class="t1 num">${p.id}</div><div class="t2">${t("valid_until")} <span class="num">${SC.dd(p.exp)}</span></div></div><div class="amt num">${fmt(p.amt)}</div></button>`).join("")}</div>`:""}
    <div class="sec-h"><span class="h2">${t("transactions")}</span><span class="t2 num">${rows.length}</span></div>
    <div class="glass list">${rows.map(e=>`<div class="row"><span class="ico ${e.dir==="gave"?"neg":"pos"}">${ic(e.dir==="gave"?"up":"down",18)}</span><div class="grow"><div class="t1">${t(e.dir)}${e.note && /^PL-/.test(e.note)?` · <span class="num">${e.note}</span>`:""}</div><div class="t2">${t("bal")} <span class="num">${fmt(e.run)}</span> · <span class="num">${SC.dt(e.t)}</span></div></div><div class="amt num">${fmt(e.amt)}</div>
      <a class="iconbtn sm wa" href="${esc(SC.waShare(c.phone, SC.entryText(c, e, e.run)))}" target="_blank" rel="noopener" data-act="wasent" data-v="share" aria-label="${t("share_wa")}">${ic("wa",16)}</a></div>`).join("") || `<div class="row t2">${t("no_entries")}</div>`}</div>
    <div class="spacer"></div><div class="footer"><div class="acts two"><button class="btn btn-gave" data-act="sheet" data-v="entry" data-k="gave">${ic("up",18)}${t("gave")}</button><button class="btn btn-got" data-act="sheet" data-v="entry" data-k="got">${ic("down",18)}${t("got")}</button></div></div></div>`;
};

/* ================================================================== WhatsApp share + re-bill on invoice, folder, advance, custody */
const navShare = (h, href, label) => h.replace('<div class="nav-r">', `<div class="nav-r">${waIcon(href, label)}`);
const baseInv = V.invoice;
V.invoice = () => {
  let h = baseInv(); const i = SC.inv(UI.p.id); if(!i) return h;
  h = navShare(h, SC.waShare(null, SC.invShareText(i)), t("share_wa"));
  if(SC.canPay() && i.status==="approved"){
    const pl = SC.plFor("invoice", i.id).find(p=>SC.plStatus(p)!=="cancelled");
    const box = `<div class="rebill glass">${ic("link",19)}<div class="grow"><div class="t1">${t(pl?"rebilled":"rebill_title")}</div><div class="t2">${pl?`<span class="num">${pl.id}</span> · ${t("pls_"+SC.plStatus(pl))} · <bdi>${esc(SC.plName(pl))}</bdi>`:t("rebill_hint")}</div></div>
      ${pl?`<button class="btn btn-sm btn-glass" data-act="go" data-v="plink:${pl.id}">${t("open")}</button>`:`<button class="btn btn-sm btn-primary" data-act="sheet" data-v="rebill">${t("rebill")}</button>`}</div>`;
    h = insertBefore(h, `<div class="sec-h"><span class="h2">${t("comments")}`, box);
  }
  return h;
};
const baseFolder = V.folder;
V.folder = () => { const h = baseFolder(), f = SC.folder(UI.p.id); return f ? navShare(h, SC.waShare(null, SC.folderText(f)), t("share_wa")) : h };
const baseAdv = V.advance;
V.advance = () => { const h = baseAdv(), a = SC.adv(UI.p.id); return a ? navShare(h, SC.waShare(SC.user(a.holder)?.phone, SC.advText(a)), t("share_wa")) : h };
const baseCust = V.pcustody;
V.pcustody = () => { let h = baseCust(); const c = SC.P()?.custodies.find(x=>x.id===UI.p.id);
  if(c && c.dir==="given" && c.status==="open" && SC.pcStats(c).balance>0) h = h.replace('<div class="pad-x stack" style="margin-top:12px">', `<div class="pad-x stack" style="margin-top:12px"><button class="btn btn-primary" data-act="sheet" data-v="newpl" data-k="custody:${c.id}">${ic("link",18)}${t("request_return")}</button>`);
  return h };

Object.assign(V, {pay:vPay, plink:vPlink, paypage:vPaypage, payset:vPayset, psave:()=>SC.P()?vSave():V.home(), pgoal:()=>SC.P()?vGoal():V.home(), orgset:vOrgset, check:vCheck, support:vSupport});

/* ================================================================== SHEETS */
const CALC_KEYS = ["C","()","%","÷","7","8","9","×","4","5","6","−","1","2","3","+","0",".","="];
const prevSheet2 = SC.sheet2;
SC.sheet2 = (s, wrap, err) => {
  const f = s.f || {}, fld = H.fld, sel = H.sel;
  const radio = (key, opts, def) => `<div class="mini-seg full wrapseg">${opts.map(([k,l,dis])=>`<button data-act="pk" data-k="${key}" data-v="${k}" aria-pressed="${(f[key]??def)===k}" ${dis?"disabled":""}>${l}</button>`).join("")}</div>`;
  switch(s.type){
    case "newpl": {
      const ready = SC.payReady(); if(!ready.link && !ready.bank) return wrap(`<p class="sub">${t("pay_not_ready")}</p>${SC.canPaySettings()?`<button class="btn btn-primary" data-act="go" data-v="payset">${t("pay_settings")}</button>`:""}`, t("request_pay"));
      const custody = String(f.contact||"").startsWith("custody:");
      const mine = SC.S.contacts.filter(c=>c.owner===SC.me().id && c.kind==="customer");
      const def = ready.link && ready.bank ? "both" : ready.link ? "link" : "bank";
      return wrap(`${custody ? `<div class="kv-row"><span class="t2">${t("tab_pcust")}</span><b class="num">${esc(f.contact.slice(8))}</b></div>` :
        sel("contact", t("customer"), [["",t("choose")],...mine.map(c=>[c.id, cname(c)+(bal(c)>0?` · ${SC.fmt0(bal(c))}`:"")]),["__new",t("new_person")]], true)}
        ${f.contact==="__new"?fld("newName", t("x_name"))+fld("phone", t("phone")+" (WhatsApp)", 'inputmode="tel" dir="ltr" placeholder="05xxxxxxxx"'):""}
        <label class="fld"><span>${t("amount")} (${SC.cur()})</span><input id="f-amt" data-bind="amt" inputmode="decimal" value="${esc(f.amt??"")}" placeholder="0.00"></label>
        ${custody?"":fld("desc", t("pl_for"))}
        <div class="t2">${t("pl_method")}</div>${radio("method",[["both",t("plm_both"),!(ready.link&&ready.bank)],["link",t("plm_link"),!ready.link],["bank",t("plm_bank"),!ready.bank]], def)}
        <div class="t2">${t("valid_for")}</div>${radio("days",[["3",t("days_n",{n:3})],["7",t("days_n",{n:7})],["14",t("days_n",{n:14})],["30",t("days_n",{n:30})]],"7")}
        ${err}<button class="btn btn-accent" data-act="donewpl">${ic("link",18)}${t("create_link")}</button>`, t(custody?"request_return":"request_pay"));
    }
    case "rebill": { const i = SC.inv(UI.p.id); const mine = SC.S.contacts.filter(c=>c.owner===SC.me().id && c.kind==="customer"), mk = Number(f.markup)||0;
      return wrap(`<p class="sub small">${t("rebill_sheet_hint",{id:i.id})}</p>
        ${sel("contact", t("customer"), [["",t("choose")],...mine.map(c=>[c.id, cname(c)]),["__new",t("new_person")]], true)}
        ${f.contact==="__new"?fld("newName", t("x_name"))+fld("phone", t("phone")+" (WhatsApp)", 'inputmode="tel" dir="ltr" placeholder="05xxxxxxxx"'):""}
        ${radio("markup",[["0","0%"],["5","5%"],["10","10%"],["15","15%"]],"0")}
        <div class="kv-row"><span class="t2">${t("client_pays")}</span><b class="num">${fmt((i.total-SC.credited(i))*(1+mk/100))} ${SC.cur()}</b></div>
        ${err}<button class="btn btn-accent" data-act="dorebill">${ic("link",18)}${t("create_link")}</button>`, t("rebill_title")) }
    case "plpaid": return wrap(`<p class="sub small">${t("mark_paid_hint")}</p><div class="catgrid">${VIA.map(k=>`<button class="catb ${(f.via||"bank")===k?"on":""}" data-act="pk" data-k="via" data-v="${k}">${ic(k==="cash"?"cash":k==="bank"?"building":k==="mada"||k==="visa"?"card":"phone",20)}<span>${t("via_"+k)}</span></button>`).join("")}</div>${err}<button class="btn btn-accent" data-act="doplpaid">${t("mark_paid")}</button>`, t("mark_paid"));
    case "payset": { const ps = SC.payset(), hn = Array.isArray(ps.holder)?(SC.ui.lang==="ar"?ps.holder[0]:ps.holder[1]):ps.holder;
      if(f.holder===undefined){ f.holder = hn; f.bank = ps.bank; f.iban = SC.ibanFmt(ps.iban); f.stc = ps.stc; s.f = f }
      return wrap(`${fld("holder", t("beneficiary"))}${sel("bank", t("bank"), [["",t("choose")],...D.BANKS.map(b=>[b, SC.nm("bk_"+b)])])}${fld("iban", "IBAN", 'dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" autocapitalize="characters"')}
        ${SC.plan()==="personal"?fld("stc", "STC Pay", 'inputmode="tel" dir="ltr" placeholder="05xxxxxxxx"'):""}<p class="t2 small">${t("iban_hint")}</p>${err}<button class="btn btn-primary" data-act="dopayset">${t("save")}</button>`, t("bank_account")) }
    case "gwconnect": { const g = D.GATEWAYS.find(x=>x.k===s.k); return wrap(`<p class="sub">${t("gw_connect_hint",{g:esc(g.name)})}</p>${fld("merchant", t("merchant_id"), 'dir="ltr" placeholder="pk_live_…"')}<p class="t2 small">${t("gw_secret_note")}</p>${err}<button class="btn btn-primary" data-act="dogwconnect">${t("connect")}</button>`, g.name) }
    case "newgoal": return wrap(`${fld("name", t("goal_name"))}<label class="fld"><span>${t("target")} (${SC.cur()})</span><input id="f-target" data-bind="target" inputmode="decimal" value="${esc(f.target??"")}" placeholder="0.00"></label>
      <label class="fld"><span>${t("first_deposit")} (${SC.cur()})</span><input id="f-first" data-bind="first" inputmode="decimal" value="${esc(f.first??"")}" placeholder="0.00"></label>
      ${fld("deadline", t("deadline_opt"), 'dir="ltr"', "date")}
      <div class="t2">${t("icon")}</div><div class="iconpick">${GICON.map(k=>`<button class="${(f.icon||"vault")===k?"on":""}" data-act="pk" data-k="icon" data-v="${k}" aria-label="${k}">${ic(k,20)}</button>`).join("")}</div>
      ${err}<button class="btn btn-accent" data-act="donewgoal">${t("new_goal")}</button>`, t("new_goal"));
    case "goalmove": { const g = SC.savings().find(x=>x.id===UI.p.id); const st = SC.goalStats(g);
      return wrap(`<input id="f-amt" data-bind="amt" class="amount-in" inputmode="decimal" placeholder="0.00" value="${esc(f.amt||"")}" aria-label="${t("amount")}">
        ${s.k==="in"&&st.monthly?`<button class="chip" data-act="pk" data-k="amt" data-v="${st.monthly}">${t("suggested",{n:SC.fmt0(st.monthly)})}</button>`:""}
        ${s.k==="out"?`<p class="t2 small">${t("available_n",{n:fmt(st.saved)})}</p>`:""}${err}<button class="btn btn-accent" data-act="dogoalmove">${t(s.k==="in"?"add_savings":"withdraw_savings")}</button>`, t(s.k==="in"?"add_savings":"withdraw_savings")) }
    case "orgset": { const P = SC.orgPolicy(), O = SC.S.org;
      if(f.init===undefined){ Object.assign(f, {init:1, fast:P.fast, std:P.std, auto:P.auto, orgName:SC.orgName(), vat:O.vat||"", cr:O.cr||""}); s.f = f }
      return SC.plan()==="enterprise" ? wrap(`<p class="sub small">${t("thresholds_hint")}</p><label class="fld"><span>${t("path_fast_t")} ≤ (${SC.cur()})</span><input id="f-fast" data-bind="fast" inputmode="decimal" value="${esc(f.fast)}"></label><label class="fld"><span>${t("path_std_t")} ≤ (${SC.cur()})</span><input id="f-std" data-bind="std" inputmode="decimal" value="${esc(f.std)}"></label>${err}<button class="btn btn-primary" data-act="doorgset">${t("save")}</button>`, t("approval_policy"))
        : wrap(`${fld("orgName", t("org_name"))}${fld("vat", t("vat_no"), 'inputmode="numeric" dir="ltr" placeholder="3xxxxxxxxxxxxx3"')}${fld("cr", t("cr_no"), 'inputmode="numeric" dir="ltr"')}<label class="fld"><span>${t("auto_approve")} ≤ (${SC.cur()})</span><input id="f-auto" data-bind="auto" inputmode="decimal" value="${esc(f.auto??0)}"></label><p class="t2 small">${t("auto_approve_hint")}</p>${err}<button class="btn btn-primary" data-act="doorgset">${t("save")}</button>`, t("org_settings")) }
    case "calc": { const ex = f.expr||"", v = SC.calc(ex), ok = ex && isFinite(v), shown = ex||"0", sz = shown.length>14?"s3":shown.length>9?"s2":"";
      const kcls = k => k==="="||/[÷×−+]/.test(k)?"op":/^(C|\(\)|%)$/.test(k)?"fn":k==="0"?"zero":"";
      return wrap(`<div class="calc-pad"><div class="calc-d"><button class="calc-bs" data-act="ck" data-v="⌫" aria-label="⌫">⌫</button><div class="calc-r num" dir="ltr">${ok&&!/^-?[\d.]+$/.test(ex)?"= "+fmt(v):"&nbsp;"}</div><div class="calc-e num ${sz}" dir="ltr">${esc(shown)}</div></div>
        <div class="calc-k">${CALC_KEYS.map(k=>`<button class="ck ${kcls(k)}" data-act="ck" data-v="${esc(k)}">${k==="C"&&ex?"C":k==="C"?"AC":k}</button>`).join("")}</div></div>
        <div class="t2">${t("vat_tools")}</div><div class="calc-v"><button class="chip" data-act="ckvat" data-v="add" ${ok?"":"disabled"}>${t("vat_add")}</button><button class="chip" data-act="ckvat" data-v="remove" ${ok?"":"disabled"}>${t("vat_remove")}</button><button class="chip" data-act="ckvat" data-v="of" ${ok?"":"disabled"}>${t("vat_of")}</button><button class="chip" data-act="ckvat" data-v="split" ${ok?"":"disabled"}>${t("split_n",{n:f.split||2})}</button><button class="chip" data-act="cksplitn" aria-label="+">+1</button></div>
        ${ok&&f.vatRes?`<div class="calc-out">${f.vatRes}</div>`:""}<p class="t2 small">${t("calc_hint")}</p>`, t("calculator")) }
  }
  return prevSheet2(s, wrap, err);
};

/* ================================================================== EVENTS */
async function copyText(txt){ try{ await navigator.clipboard.writeText(txt); H.toast(t("copied")) }catch{ H.toast(t("copy_manual")) } SC.render(true) }
document.addEventListener("click", async e=>{
  const b = e.target.closest("[data-act]"); if(!b) return;
  const a = b.dataset.act, v = b.dataset.v, s = UI.sheet, F = s?.f || {};
  const err = k => { UI.sheet.err = k; SC.render(true) };
  const done = (msg) => { SC.save(); UI.sheet = null; if(msg) H.toast(t(msg)); SC.render(true) };
  const amt = x => SC.isExpr(x) ? SC.calc(x) : Number(SC.normDigits(x));
  const P = () => SC.PL().find(x=>x.id===UI.p.id);
  switch(a){
    case "pk": UI.sheet.f[b.dataset.k] = v; SC.render(true); break;
    case "donewpl": {
      const custody = String(F.contact||"").startsWith("custody:"), cid = custody ? F.contact.slice(8) : null;
      if(!custody && !F.contact){ err("err_choose_customer"); break }
      const c = !custody && F.contact!=="__new" ? SC.S.contacts.find(x=>x.id===F.contact) : null;
      const cu = custody ? SC.P().custodies.find(x=>x.id===cid) : null;
      const r = SC.createPayLink({contact:c?.id, newName:F.contact==="__new"?F.newName:null, phone:F.contact==="__new"?F.phone:(cu?.phone||c?.phone), name:cu?cu.party:undefined,
        amt:amt(F.amt), desc:F.desc, method:F.method, days:F.days||7, kind:custody?"custody":"contact", ref:cid});
      if(r.err){ err(r.err); break } SC.save(); UI.sheet = null; H.go("plink:"+r.p.id); H.toast(t("toast_link_created")); break }
    case "dorebill": { const i = SC.inv(UI.p.id); if(!F.contact){ err("err_choose_customer"); break }
      const r = SC.rebill(i, {contact:F.contact!=="__new"?F.contact:null, newName:F.contact==="__new"?F.newName:null, phone:F.contact==="__new"?F.phone:undefined, markup:F.markup});
      if(r.err){ err(r.err); break } SC.save(); UI.sheet = null; H.go("plink:"+r.p.id); H.toast(t("toast_link_created")); break }
    case "doplpaid": { const r = SC.plMarkPaid(P(), F.via||"bank"); if(r){ err(r); break } done("toast_paid"); break }
    case "plcancel": { const r = SC.plCancel(P()); SC.save(); H.toast(t(r||"toast_cancelled"), !!r); SC.render(true); break }
    case "plrenew": { const r = SC.plRenew(P()); SC.save(); H.toast(t(r||"toast_renewed"), !!r); SC.render(true); break }
    case "paynow": { const p = P(); const r = SC.plMarkPaid(p, v); SC.save(); H.toast(t(r||"toast_paid"), !!r); SC.render(true); break }
    case "copytxt": { const p = P(), S = SC.SUPPORT; const txt = v==="url" ? SC.plURL(p) : v==="iban" ? SC.ibanClean(SC.payset().iban) : v==="msg" ? (SC.plStatus(p)==="paid"?SC.plReceipt(p):SC.plText(p)) : v==="phone" ? S.phone : v==="email" ? S.email : ""; await copyText(txt); break }
    case "dopayset": { const r = SC.savePayset({holder:F.holder, bank:F.bank, iban:F.iban, stc:F.stc}); if(r){ err(r); break } done("toast_saved"); break }
    case "dogwconnect": { const r = SC.gwConnect(s.k, F.merchant); if(r){ err(r); break } done("toast_gw_connected"); break }
    case "gwdisconnect": SC.gwDisconnect(); SC.save(); SC.render(true); break;
    case "donewgoal": { const r = SC.addGoal({name:F.name, target:amt(F.target), first:F.first?amt(F.first):0, deadline:F.deadline, icon:F.icon}); if(r.err){ err(r.err); break } SC.save(); UI.sheet = null; H.go("pgoal:"+r.g.id); H.toast(t("toast_saved")); break }
    case "dogoalmove": { const g = SC.savings().find(x=>x.id===UI.p.id); const r = SC.goalMove(g, s.k, amt(F.amt)); if(r){ err(r); break } done(s.k==="in"?"toast_saved_in":"toast_saved"); break }
    case "goaldelete": { const g = SC.savings().find(x=>x.id===UI.p.id); if(!UI.confirmDel){ UI.confirmDel = true; H.toast(t("tap_again_delete"), true); SC.render(true); setTimeout(()=>UI.confirmDel=false, 4000); break }
      UI.confirmDel = false; SC.goalDelete(g); SC.save(); H.back(); break }
    case "doorgset": { const r = SC.setPolicy({fast:amt(F.fast), std:amt(F.std), auto:amt(F.auto||0), orgName:F.orgName, vat:F.vat, cr:F.cr}); if(r){ err(r); break } done("toast_saved"); break }
    case "runcheck": UI.checkRes = SC.selfCheck(); SC.save(); SC.render(true); break;
    case "ck": { let x = F.expr||"";
      if(v==="C") x = ""; else if(v==="⌫") x = x.slice(0,-1);
      else if(v==="=") { const r = SC.calc(x); if(isFinite(r)) x = String(Math.round(r*1e6)/1e6) }
      else if(v==="()") { const o = (x.match(/\(/g)||[]).length, c = (x.match(/\)/g)||[]).length; x += (o>c && /[\d.)%]$/.test(x)) ? ")" : "(" }
      else x += v;
      F.expr = x.slice(0,40); F.vatRes = ""; SC.render(true); break }
    case "cksplitn": F.split = Math.min(20, (F.split||2)+1); SC.render(true); break;
    case "ckvat": { const n = SC.calc(F.expr); if(!isFinite(n)) break;
      F.vatRes = v==="add" ? `${t("vat_add")}: <b class="num">${fmt(SC.vat.add(n))}</b>` : v==="remove" ? `${t("vat_remove")}: <b class="num">${fmt(SC.vat.remove(n))}</b> · ${t("vat_short")} <b class="num">${fmt(SC.vat.of(n))}</b>`
        : v==="of" ? `${t("vat_short")}: <b class="num">${fmt(SC.vat.of(n))}</b>` : `${t("split_n",{n:F.split||2})}: <b class="num">${fmt(SC.r2(n/(F.split||2)))}</b>`; SC.render(true); break }
    case "sheet": if(v==="newpl" && b.dataset.k && UI.sheet){ const k = b.dataset.k; UI.sheet.f.contact = k;
        if(k.startsWith("custody:")){ const cu = SC.P().custodies.find(x=>x.id===k.slice(8)); UI.sheet.f.amt = SC.pcStats(cu).balance }
        else { const c = SC.S.contacts.find(x=>x.id===k); if(c && bal(c)>0) UI.sheet.f.amt = SC.r2(bal(c) - SC.plFor("contact",c.id).filter(p=>SC.plStatus(p)==="pending").reduce((s2,p)=>s2+p.amt,0)) || SC.r2(bal(c)) }
        SC.render(true) } break;
  }
});
/* when the newpl contact changes, prefill the amount with what that person owes */
document.addEventListener("change", e=>{ const el = e.target; if(el.dataset?.bind==="contact" && UI.sheet?.type==="newpl"){ const c = SC.S.contacts.find(x=>x.id===el.value); if(c && bal(c)>0){ UI.sheet.f.amt = SC.r2(bal(c)); SC.render(true) } } });

/* smart amounts: type 120+35*2 in any amount field; the result replaces it when you leave the field */
document.addEventListener("input", e=>{
  const el = e.target; if(!(el instanceof HTMLInputElement) || el.inputMode!=="decimal") return;
  let hint = el.parentElement.querySelector(".calc-hint");
  if(SC.isExpr(el.value)){ const v = SC.calc(el.value); if(!hint){ hint = document.createElement("span"); hint.className = "calc-hint num"; el.insertAdjacentElement("afterend", hint) } hint.textContent = isFinite(v) ? "= " + SC.fmt(v) : t("calc_bad") }
  else hint?.remove();
}, true);
document.addEventListener("change", e=>{
  const el = e.target; if(!(el instanceof HTMLInputElement) || el.inputMode!=="decimal") return;
  const raw = el.value; if(!raw) return;
  const v = SC.isExpr(raw) ? SC.calc(raw) : Number(SC.normDigits(raw));
  if(isFinite(v) && String(v)!==raw){ el.value = String(v); if(el.dataset.bind && UI.sheet) UI.sheet.f[el.dataset.bind] = el.value }
  el.parentElement.querySelector(".calc-hint")?.remove();
}, true);

/* panel: support shortcut */
const prevAfter = SC.afterRender;
SC.afterRender = () => { prevAfter?.(); const panel = document.getElementById("panel"); if(!panel) return;
  let el = document.getElementById("pn-sup"); if(!el){ el = document.createElement("div"); el.id = "pn-sup"; panel.appendChild(el) }
  el.innerHTML = `<div class="plabel">${t("support")}</div><div class="pn-sup"><a class="chip" href="${esc(SC.supportWa())}" target="_blank" rel="noopener">${ic("wa",15)} ${t("whatsapp")}</a><a class="chip" href="${esc(SC.supportTg())}" target="_blank" rel="noopener">${ic("tg",15)} ${t("telegram")}</a><span class="chip sel" dir="ltr">${ic("mail",15)} ${SC.SUPPORT.email}</span></div>`; };

SC.boot();
})();
