/* Smart Cash prototype — screens, sheets and event handling. */
(function(){
const SC = window.SC, D = window.SCDATA;
const t = SC.t, esc = SC.esc, fmt = SC.fmt, nm = SC.nm;

/* ------------------------------------------------------------------ UI state */
const UI = SC.UI = {screen: SC.S.session ? (SC.me()?.mustChange ? "changepw" : "home") : "login", p:{}, stack:[], sheet:null, toast:null, seg:{}, q:"", draft:null, busy:null, loginErr:null, otp:{}, sel:null, open:{}, limit:40, f:{}};

const TABS = {
  technician:["home","invoices","folders","ledger","me"],
  supervisor:["home","approvals","invoices","folders","me"],
  engineer:["home","approvals","invoices","supplies","me"],
  pm:["home","approvals","myproject","supplies","me"],
  accountant:["home","approvals","folders","invoices","me"],
  procurement:["home","approvals","supplies","invoices","me"],
  finance:["home","approvals","advances","org","me"],
  admin:["home","users","org","audit","me"],
};
const tabsOf = u => (u && SC.tabsFor && SC.tabsFor(u)) || (u && TABS[u.role]) || [];
const TAB_ICON = {home:"home", approvals:"check", invoices:"receipt", folders:"folder", supplies:"box", ledger:"book", me:"user", users:"users", roles:"key", audit:"list", advances:"wallet", org:"building", myproject:"building"};

/* ------------------------------------------------------------------ icons */
const P = {
  home:'<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>', check:'<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>', folder:'<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  box:'<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>', book:'<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v16H5.5A1.5 1.5 0 0 0 4 20.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H19"/><path d="M8 7h7M8 11h5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l2.5 2.5M14.5 8.5 17 11"/>', list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  wallet:'<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="17" height="12" rx="2"/><path d="M16.5 14h.01"/>',
  building:'<path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21M14 9h4.5A1.5 1.5 0 0 1 20 10.5V21M3 21h18M7.5 8h3M7.5 12h3M7.5 16h3M17 13h.01M17 17h.01"/>',
  camera:'<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.5-2.5h5.4L16.2 7h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>', bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  fuel:'<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3.5 21h13M5 10h10"/><path d="m15 8 3 2.5V17a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/>',
  parts:'<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L3.5 17.5l3 3 5.7-5.7a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  hosp:'<path d="M4 10h13v3a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3"/>',
  tools:'<path d="M4 20 14 10M15.5 3.5l5 5-3 3-5-5zM3 7l4-4 3 3-4 4z"/>', transport:'<path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  office:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/>', site:'<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/>',
  comms:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>', emergency:'<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/>', other:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
  back:'<path d="m15 5-7 7 7 7"/>', chev:'<path d="m9 5 7 7-7 7"/>', close:'<path d="M6 6l12 12M18 6 6 18"/>', flash:'<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  qr:'<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>', ok:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  warn:'<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>', msg:'<path d="M4 19.5 5.3 16A8 8 0 1 1 8 18.7z"/>',
  file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', up:'<path d="M12 19V5M6 11l6-6 6 6"/>', down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18"/>', moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', unlock:'<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 7.8-1.2"/>',
  sheet:'<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9h17M3.5 14.5h17M9.5 3.5v17"/>', cloud:'<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"/><path d="M12 11v6M9.5 13.5 12 11l2.5 2.5"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', logout:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  swap:'<path d="M4 8h14l-3-3M20 16H6l3 3"/>', undo:'<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-2"/>', star:'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>', g:'<circle cx="12" cy="12" r="9"/><path d="M16.5 12H12M16.5 12a4.5 4.5 0 1 1-1.3-3.2"/>',
  history:'<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/><path d="M3.5 4v4.5H8M12 8v4l3 2"/>', truck:'<path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', pin:'<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  checks:'<path d="m2.5 12.5 4 4 8-9M10 15.5l1 1 8-9"/>', send:'<path d="M4 12 20 4l-4 16-4-6.5z"/><path d="m12 13.5 8-9.5"/>', copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  shield:'<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.3 7.5 9.5 4.3-1.2 7.5-5 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>', chart:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
};
const ic = (k, s=22, cls="") => `<svg class="${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k]||P.other}</svg>`;

/* ------------------------------------------------------------------ small parts */
const money = (n, cls="") => `<span class="num ${cls}">${fmt(n)}</span> <span class="cur">${SC.cur()}</span>`;
const pill = s => `<span class="pill p-${s}">${t("st_"+s)}</span>`;
const initials = id => esc(SC.uname(id).trim().charAt(0));
const avatar = (id, size="") => { const u = SC.user(id); return `<span class="avatar ${size} r-${u?.role||""}" aria-hidden="true">${initials(id)}</span>` };
const supName = i => i.supName || SC.supNm(i.sup);
const nav = (title, back=true, right="") => `<div class="nav">${back?`<button class="iconbtn" data-act="back" aria-label="${t("back")}">${ic("back",20,"flip")}</button>`:""}<div class="nav-t">${title}</div><div class="nav-r">${right}</div></div>`;
const langSelect = (id="lang-select") => `<label class="langsel">${ic("globe",16)}<select id="${id}" data-change="lang" aria-label="${t("p_lang")}">${SC.LANGS.map(l=>`<option value="${l.code}" ${l.code===SC.ui.lang?"selected":""}>${l.native}</option>`).join("")}</select>${ic("chev",14,"rot90")}</label>`;
const bubble = (icon, label, act, v="", badge=0) => `<button class="bubble" data-act="${act}" data-v="${v}"><span class="b-ic">${ic(icon,24)}${badge?`<span class="badge">${badge}</span>`:""}</span><span class="b-l">${label}</span></button>`;
const empty = (fig, title, sub="", btn="") => `<div class="empty"><div class="fig" data-fig="${fig}" data-label="${esc(title)}"></div><div class="h2">${title}</div>${sub?`<div class="sub">${sub}</div>`:""}${btn}</div>`;
const seg = (key, opts, def) => { const v = UI.seg[key] ?? def; return `<div class="seg" role="tablist">${opts.map(([k,l,n])=>`<button role="tab" data-act="seg" data-k="${key}" data-v="${k}" aria-selected="${v===k}">${l}${n?` <span class="segn">${n}</span>`:""}</button>`).join("")}</div>` };
const segv = (key, def) => UI.seg[key] ?? def;
const pathName = i => i.steps.length===1 ? "path_owner" : i.steps.length===2 ? "path_fast" : i.total<=5000 ? "path_std" : "path_full";
const stepbar = i => `<div class="stepbar">${i.steps.map((s,k)=>`<i class="${k<i.idx||i.status==="approved"?"on":k===i.idx&&i.status==="review"?"cur":""}" title="${esc(t("role_"+s))}"></i>`).join("")}</div>`;
const locale = () => (SC.ui.lang==="fil" ? "fil" : SC.ui.lang) + "-u-nu-latn";
const today = () => { try{ return new Intl.DateTimeFormat(locale(), {weekday:"long", day:"numeric", month:"long", timeZone:"Asia/Riyadh"}).format(new Date()) }catch{ return SC.dd(SC.now()) } };
const noteText = n => n ? SC.tn(n) : "";
const roleLabel = r => r ? t("role_"+r) : t("unassigned");
const scopeText = u => { const s = D.SCOPE[u.role]; return s==="self" ? t("scope_self") : s==="team" ? t("scope_team") : s==="project" ? SC.projName(u.project) : s==="branch" ? SC.branchName(u.branch) : t("scope_company") };
const bound = k => UI.sheet?.f?.[k] ?? "";
const fld = (key, label, attrs="", type="text") => `<label class="fld"><span>${label}</span><input id="f-${key}" data-bind="${key}" type="${type}" value="${esc(bound(key))}" ${attrs}></label>`;
const sel = (key, label, opts, rerender=false) => `<label class="fld"><span>${label}</span><select id="f-${key}" data-bind="${key}" ${rerender?'data-rerender="1"':""}>${opts.map(([v,l])=>`<option value="${esc(v)}" ${String(bound(key))===String(v)?"selected":""}>${esc(l)}</option>`).join("")}</select></label>`;
const geoPicker = (rk="region", gk="gov") => { const r = bound(rk) || "riyadh"; const reg = SC.region(r) || SC.GEO[0];
  return `<div class="two">${sel(rk, t("region"), SC.GEO.map(x=>[x.k, SC.ui.lang==="ar"?x.ar:x.en]), true)}${sel(gk, t("governorate"), [["",t("choose")]].concat(reg.gov.map(g=>[g[0], SC.ui.lang==="ar"?g[1]:g[2]])))}</div>` };
const roleOpts = (none) => (none?[["",t("choose")]]:[]).concat(D.ROLE_ORDER.map(r=>[r, t("role_"+r)]));
const branchOpts = (none) => (none?[["",t("choose")]]:[]).concat(SC.S.branches.map(b=>[b.id, `${SC.branchName(b.id)} · ${SC.govName(b.gov)}`]));
const projectOpts = (branch, none=true) => (none?[["",t("none")]]:[]).concat(SC.S.projects.filter(p=>!branch || p.branch===branch).map(p=>[p.id, `${p.id} · ${SC.projName(p.id)}`]));
const managerOpts = (role, project, branch) => {
  const want = {technician:["supervisor"], supervisor:["engineer"], engineer:["pm"], pm:["accountant"], accountant:["finance"], procurement:["procurement","finance"], finance:["finance"], admin:["admin","finance"]}[role] || [];
  return [["",t("none")]].concat(SC.S.users.filter(u=>u.status==="active" && want.includes(u.role) && (!project || !["supervisor","engineer","pm"].includes(u.role) || u.project===project) && (u.role!=="accountant" || !branch || u.branch===branch)).slice(0,200).map(u=>[u.id, `${SC.uname(u.id)} · ${t("role_"+u.role)}`]));
};

/* ------------------------------------------------------------------ hairline figures */
let HL = null; const phoneFigs = [];
const hlReady = Promise.resolve();
function mountFigs(root, keep){ hlReady.then(()=>{ if(!HL) return; root.querySelectorAll("[data-fig]:not([data-mounted])").forEach(el=>{ const fn = HL[el.dataset.fig]; if(!fn) return; el.dataset.mounted = "1";
  const f = fn(el, {play: el.dataset.play==="1", intensity:.55, label: el.dataset.label||""}); if(!keep) phoneFigs.push(f) }) }) }
const clearFigs = () => { while(phoneFigs.length){ try{ phoneFigs.pop().destroy() }catch{} } };

/* ================================================================== LOGIN & PASSWORDS */
function authApiBase(){
  try{
    const url = new URL(String(window.SC_AUTH_API||"").trim());
    if((url.protocol!=="https:" && !["localhost","127.0.0.1"].includes(url.hostname)) || url.username || url.password || url.search || url.hash) return null;
    return url.href.replace(/\/+$/,"");
  }catch{ return null }
}
function vOtpLogin(){
  const o = UI.otp || {}, api = authApiBase();
  if(o.user) return `<div class="glass card"><div class="t1">${t("otp_verified")}</div><div class="t2">${esc(o.user.name)} · ${esc(o.user.email)}</div><p class="sub">${t("otp_demo_limit")}</p><button class="btn btn-glass" type="button" data-act="otp-logout">${t("sign_out")}</button></div>`;
  return `<div class="glass card form">
    <div><div class="t1">${t("otp_sign_in")}</div><p class="sub">${t("prototype_warning")}</p></div>
    ${api?`<form class="form" data-form="otp-request" novalidate><label class="fld"><span>${t("email")}</span><input id="otp-email" type="email" autocomplete="email" maxlength="254" required value="${esc(o.email||"")}"></label>
      <button class="btn btn-accent" type="submit" ${UI.busy==="otp-request"?"disabled":""}>${t("otp_send")}</button></form>`
      :`<p class="sub">${t("otp_configure")}</p>`}
    ${o.requested?`<form class="form" data-form="otp-verify" novalidate><label class="fld"><span>${t("otp_code")}</span><input id="otp-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
      <button class="btn btn-primary" type="submit" ${UI.busy==="otp-verify"?"disabled":""}>${t("otp_verify")}</button></form>`:""}
    ${o.error?`<div class="err" role="alert">${t(o.error)}</div>`:""}
    ${o.notice?`<div class="banner b-info" role="status">${t(o.notice)}</div>`:""}
  </div>`;
}
function vLogin(){
  const demoUsers = SC.DEMO_MODE ? SC.S.users.filter(u=>u.demo) : [];
  return `<div class="login">
    <div class="login-top"><div class="brand"><span class="brand-mark">${ic("wallet",18)}</span>${t("app_name")}</div>${langSelect("lang-login")}</div>
    <div class="lang-bubbles" aria-label="${t("p_lang")}">${SC.LANGS.map((l,i)=>`<button class="lb ${l.code===SC.ui.lang?"on":""}" style="--i:${i}" data-act="lang" data-v="${l.code}" lang="${l.code}">${l.native}</button>`).join("")}</div>
    <h1 class="h1">${t("welcome_title")}</h1><p class="sub lead">${t("welcome_sub")}</p>
    ${vOtpLogin()}
    ${SC.DEMO_MODE?`<div class="banner b-warn">${t("demo_only_warning")}</div>
    <div class="demo"><div class="sec-t">${t("demo_accounts")}</div><div class="sub small">${t("demo_preview_hint")}</div>
      <div class="demo-grid">${demoUsers.map(u=>`<button class="demo-u glass" data-act="demo" data-v="${u.id}">${avatar(u.id)}<span class="du-r">${t("role_"+u.role)}</span><span class="du-n">${esc(SC.first(u.id))}</span></button>`).join("")}</div>
      ${SC.plan()!=="enterprise"?"":`<div class="sub small center-t">${t("company_size",{n:SC.S.users.filter(u=>u.status!=="pending").length.toLocaleString("en-US"), b:SC.S.branches.length, p:SC.S.projects.length})}</div>`}</div>`:""}
  </div>`;
}
function vChangePw(){
  const m = SC.me(), forced = m.mustChange;
  return `<div class="page">${forced?`<div class="nav"><div class="nav-t">${t("set_password")}</div></div>`:nav(t("change_password"))}
    <div class="center-ic">${ic("shield",44)}</div>
    <p class="ctx center-t">${forced?t("must_change_note"):t("change_pw_note")}</p>
    <form class="glass card form" data-form="changepw" novalidate>
      ${forced?"":`<label class="fld"><span>${t("current_password")}</span><input id="pw-old" type="password" autocomplete="current-password"></label>`}
      <label class="fld"><span>${t("new_password")}</span><input id="pw-new" type="password" autocomplete="new-password"></label>
      <label class="fld"><span>${t("confirm_password")}</span><input id="pw-conf" type="password" autocomplete="new-password"></label>
      <ul class="rules"><li>${t("pw_rule_len")}</li><li>${t("pw_rule_mix")}</li><li>${t("pw_rule_new")}</li></ul>
      ${UI.pwErr?`<div class="err" role="alert">${t(UI.pwErr)}</div>`:""}
      <button class="btn btn-primary" type="submit">${t("save_password")}</button>
      ${forced?`<button type="button" class="link center-t" data-act="logout">${t("sign_out")}</button>`:""}
    </form></div>`;
}

/* ================================================================== HOME */
function homeHeader(){
  const m = SC.me(), n = SC.unread();
  return `<div class="hh"><div class="grow"><div class="hh-date">${esc(today())}</div><h1 class="h1">${t("hello",{n:esc(SC.first(m.id))})}</h1></div>
    <div class="hh-r"><button class="iconbtn glass" data-act="go" data-v="notifications" aria-label="${t("notifications")}">${ic("bell",20)}${n?`<span class="nbadge num">${n>9?"9+":n}</span>`:""}</button>
      <button class="me-bubble" data-act="sheet" data-v="account" aria-label="${t("switch_account")}">${avatar(m.id,"sm")}</button></div></div>
    <div class="role-chip">${ic("shield",14)} ${t("role_"+m.role)} · ${esc(scopeText(m))}${m.branch?` · ${esc(SC.branchName(m.branch))}`:""}</div>`;
}
let sparkN = 0;
function spark(series, h=56){
  const W = 300, max = Math.max(1, ...series.map(s=>s.v)), pts = series.map((s,k)=>[k*(W/(series.length-1)), h - 4 - (s.v/max)*(h-12)]);
  const line = pts.map((p,k)=>(k?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" "), last = pts.at(-1), gid = "sg"+(++sparkN);
  return `<svg class="spark" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#276EF1" stop-opacity=".55"/><stop offset="1" stop-color="#276EF1" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${W} ${h} L0 ${h}Z" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="#5B91F5" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="#fff" stroke="#276EF1" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}
function ring(n, of=30, size=46, stroke=5, color="var(--accent)", label){ const r = (size-stroke)/2, c = 2*Math.PI*r; return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c*Math.min(1,n/of)} ${c}" transform="rotate(-90 ${size/2} ${size/2})"/><text x="50%" y="50%" dy=".36em" text-anchor="middle" font-size="${size/3.8}" font-weight="800" fill="currentColor" font-family="Figtree,sans-serif">${label ?? n}</text></svg>` }
function actionItems(){
  const m = SC.me(), out = [];
  const push = (icon, tone, title, sub, act, v="") => out.push({icon, tone, title, sub, act, v});
  const ret = SC.S.invoices.filter(i=>i.by===m.id && i.status==="returned").length; if(ret) push("undo","warn",t("ac_returned",{n:ret}),t("tap_to_fix"),"invfilter","returned");
  const ib = SC.inbox().length; if(ib) push("check","accent",t("ac_inbox",{n:ib}),t("review_now"),"tab","approvals");
  const po = SC.poInbox().length; if(po) push("truck","accent",t("ac_po",{n:po}),t("approve_po"),"tab","approvals");
  if(SC.can("sign_folder")){ const n = SC.S.folders.filter(f=>SC.folderVisible(f) && ["closed","in_review"].includes(f.status)).length; if(n) push("folder","accent",t("ac_sign",{n}),t("tab_folders"),"go","folders") }
  if(SC.can("approve_accounts")){ const a = SC.pendingAccounts().length, r = SC.openResets().length, l = SC.lockedUsers().length;
    if(a) push("users","accent",t("ac_accounts",{n:a}),t("approve_account"),"useg","pending"); if(r) push("key","warn",t("ac_resets",{n:r}),t("reset_password"),"useg","resets"); if(l) push("lock","bad",t("ac_locked",{n:l}),t("unlock_reset"),"useg","locked") }
  if(SC.can("create_po")){ const n = SC.S.prs.filter(p=>p.status==="new").length; if(n) push("box","accent",t("ac_prs",{n}),t("supplies"),"go","supplies") }
  if(SC.can("match_invoice")||SC.can("audit")){ const n = SC.S.pos.filter(p=>p.status==="mismatch").length; if(n) push("warn","bad",t("ac_mismatch",{n}),t("three_way"),"go","supplies") }
  const projs = m.role==="finance"||m.role==="admin" ? SC.S.projects : SC.S.projects.filter(p=>p.id===m.project);
  if(["finance","pm","engineer","admin"].includes(m.role)) projs.forEach(p=>{ const s = SC.projectStats(p.id); if(s.level!=="ok") push("chart", s.level==="over"?"bad":"warn", t(s.level==="over"?"ac_budget_over":"ac_budget_near",{p:SC.projName(p.id)}), `${Math.round(s.pct*100)}%`, "go", "project:"+p.id) });
  const un = SC.unread(); if(un) push("bell","accent",t("ac_unread",{n:un}),t("notifications"),"go","notifications");
  return out;
}
function actionCenter(){
  const items = actionItems(); if(!items.length) return `<div class="allclear glass">${ic("ok",18)}<span>${t("nothing_pending")}</span></div>`;
  return `<div class="sec-h"><span class="h2">${t("action_center")}</span><span class="t2 num">${items.length}</span></div>
    <div class="hcards">${items.map(x=>`<button class="hcard glass tone-${x.tone}" data-act="${x.act}" data-v="${esc(x.v)}"><span class="hc-ic">${ic(x.icon,18)}</span><span class="hc-t">${esc(x.title)}</span><span class="hc-s">${esc(x.sub)}</span></button>`).join("")}</div>`;
}
function heroTech(a){
  const s = SC.advStats(a), f = SC.currentFolder(a.id), n = f ? SC.folderStats(f.no).n : 0;
  return `<button class="hero" data-act="go" data-v="advance:${a.id}">
    <div class="hero-top"><span class="hero-l">${t("advance_label")} <span class="num">${a.id}</span></span><span class="hero-chip">${esc(SC.projName(a.project))}</span></div>
    <div class="hero-l">${t("remaining")}</div><div class="hero-big num">${fmt(s.balance)}<span class="cur">${SC.cur()}</span></div>
    ${spark(SC.spendSeries(SC.S.invoices.filter(i=>i.adv===a.id)))}<div class="hero-cap">${t("last_30_days")}</div>
    <div class="hero-stats"><div><span>${t("under_review")}</span><b class="num">${fmt(s.review)}</b></div><div><span>${t("returned")}</span><b class="num">${fmt(s.returned)}</b></div><div><span>${t("current_folder")}</span><b class="num">${n}/30</b></div></div>
  </button>`;
}
function heroApprover(){
  const ib = SC.inbox(), total = ib.reduce((s,i)=>s+i.total,0);
  return `<div class="hero">
    <div class="hero-top"><span class="hero-l">${t("waiting")}</span>${SC.can("bulk_approve")&&ib.length>1?`<button class="hero-chip btnish" data-act="bulkmode">${ic("checks",14)} ${t("bulk_approve")}</button>`:""}</div>
    <div class="hero-big num">${ib.length}<span class="cur">${t("requests")} · ${fmt(total)} ${SC.cur()}</span></div>
    <div class="hero-list">${ib.slice(0,3).map(i=>`<button class="hl-row" data-act="go" data-v="invoice:${i.id}">${avatar(i.by,"xs")}<span class="grow"><b>${esc(SC.first(i.by))}</b> · ${esc(supName(i))}</span><span class="num">${fmt(i.total)}</span></button>`).join("") || `<div class="hero-cap">${t("inbox_empty")}</div>`}</div>
    ${ib.length?`<button class="hero-cta" data-act="tab" data-v="approvals">${t("review_all")} ${ic("chev",16,"flip")}</button>`:""}
  </div>`;
}
function heroFinance(){
  const act = SC.S.advances.filter(a=>a.status==="active"), advs = act.map(SC.advStats), bal = advs.reduce((s,x)=>s+x.balance,0);
  return `<button class="hero" data-act="tab" data-v="advances">
    <div class="hero-top"><span class="hero-l">${t("open_balance")}</span><span class="hero-chip num">${act.length} ${t("advances_short")}</span></div>
    <div class="hero-big num">${SC.fmt0(bal)}<span class="cur">${SC.cur()}</span></div>
    ${spark(SC.spendSeries(SC.S.invoices))}<div class="hero-cap">${t("company_spend_30")}</div>
    <div class="hero-stats"><div><span>${t("under_review")}</span><b class="num">${SC.fmt0(advs.reduce((s,x)=>s+x.review,0))}</b></div><div><span>${t("approved")}</span><b class="num">${SC.fmt0(advs.reduce((s,x)=>s+x.approved,0))}</b></div><div><span>${t("rejected")}</span><b class="num">${SC.fmt0(advs.reduce((s,x)=>s+x.rejected,0))}</b></div></div>
  </button>`;
}
function heroAdmin(){
  const us = SC.S.users, act = us.filter(u=>u.status==="active").length;
  return `<button class="hero" data-act="tab" data-v="users">
    <div class="hero-top"><span class="hero-l">${t("active_users")}</span><span class="hero-chip">${SC.S.branches.length} ${t("branches")} · ${SC.S.projects.length} ${t("projects")}</span></div>
    <div class="hero-big num">${act.toLocaleString("en-US")}<span class="cur">/ ${us.length.toLocaleString("en-US")}</span></div>
    <div class="hero-stats"><div><span>${t("us_pending")}</span><b class="num">${SC.pendingAccounts().length}</b></div><div><span>${t("reset_requests")}</span><b class="num">${SC.openResets().length}</b></div><div><span>${t("us_locked")}</span><b class="num">${SC.lockedUsers().length}</b></div></div>
  </button>`;
}
function budgetCard(pid, big){
  const s = SC.projectStats(pid), pct = Math.round(s.pct*100), col = s.level==="over"?"var(--neg)":s.level==="near"?"var(--warn)":"var(--accent)";
  return `<button class="w glass budget ${big?"wide-card":""}" data-act="go" data-v="project:${pid}">${ring(pct,100,big?84:64,big?9:7,col,pct+"%")}<div class="grow"><div class="w-t">${t("project_budget")}</div><div class="t2">${esc(SC.projName(pid))}</div>
    <div class="t2 num">${SC.fmt0(s.used)} / ${SC.fmt0(s.p.budget)} ${SC.cur()}</div>${s.level!=="ok"?`<span class="pill ${s.level==="over"?"p-rejected":"p-review"}">${t(s.level==="over"?"budget_over":"budget_near")}</span>`:""}</div></button>`;
}
function insights(invs){
  const rows = SC.byCategory(invs).slice(0,5); if(!rows.length) return "";
  const max = Math.max(...rows.map(r=>r[1]));
  return `<div class="sec-h"><span class="h2">${t("spend_by_category")}</span></div><div class="glass card cbars">${rows.map(([c,v])=>`<div class="cb"><span class="cb-l">${ic(c,16)} ${t("cat_"+c)}</span><span class="cb-b"><i style="width:${v/max*100}%"></i></span><span class="cb-v num">${SC.fmt0(v)}</span></div>`).join("")}</div>`;
}
function branchBars(){
  const by = SC.S.branches.map(b=>[b.id, SC.S.advances.filter(a=>a.branch===b.id && a.status==="active").reduce((s,a)=>s+SC.advStats(a).balance,0)]), max = Math.max(1,...by.map(x=>x[1]));
  return `<div class="sec-h"><span class="h2">${t("balance_by_branch")}</span></div><div class="glass card cbars">${by.map(([b,v])=>`<div class="cb"><span class="cb-l">${esc(SC.branchName(b))}</span><span class="cb-b"><i style="width:${v/max*100}%"></i></span><span class="cb-v num">${SC.fmt0(v)}</span></div>`).join("")}</div>`;
}
function activity(limit=5){
  const ev = []; SC.visibleInvoices().forEach(i=>i.hist.forEach(h=>{ if(["approved","returned","rejected","credit","resubmitted","withdrawn","commented"].includes(h.ev)) ev.push({i,h}) }));
  ev.sort((a,b)=>new Date(b.h.t)-new Date(a.h.t)); if(!ev.length) return "";
  return `<div class="sec-h"><span class="h2">${t("activity")}</span></div><div class="glass list">${ev.slice(0,limit).map(({i,h})=>`<button class="row" data-act="go" data-v="invoice:${i.id}">${avatar(h.by,"sm")}
    <div class="grow"><div class="t1">${evText(h)}</div><div class="t2"><span class="num">${i.id}</span> · ${esc(supName(i))} · ${esc(SC.ago(h.t))}</div></div><div class="amt num">${fmt(i.total)}</div></button>`).join("")}</div>`;
}
const wpad = s => `<div class="wpad">${s}</div>`;
function vHome(){
  const m = SC.me(), scoped = SC.visibleInvoices().slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  let hero = "", bub = [], extra = "";
  if(m.role==="technician"){
    const a = SC.advOf(m.id);
    hero = a ? heroTech(a) : `<div class="hero static"><div class="hero-l">${t("advance_label")}</div><div class="hero-big">${t("no_advance")}</div><div class="hero-cap">${t("no_advance_sub")}</div></div>`;
    bub = [bubble("camera",t("scan"),"go","scan"), bubble("image",t("import"),"pick","gallery"), bubble("box",t("request_purchase"),"sheet","newpr"), bubble("book",t("tab_ledger"),"tab","ledger"), bubble("sheet",t("export"),"go","export")];
    extra = (m.project?wpad(budgetCard(m.project)):"") + (scoped.length?`<div class="sec-h"><span class="h2">${t("recent")}</span><button class="link" data-act="tab" data-v="invoices">${t("see_all")}</button></div><div class="glass list">${scoped.slice(0,4).map(invRow).join("")}</div>`:"");
  } else if(m.role==="admin"){
    hero = heroAdmin();
    bub = [bubble("plus",t("add_user"),"sheet","adduser"), bubble("users",t("users"),"tab","users"), bubble("building",t("org"),"tab","org"), bubble("key",t("roles"),"go","roles"), bubble("cloud",t("backup"),"go","backup")];
    extra = `<div class="sec-h"><span class="h2">${t("audit")}</span><button class="link" data-act="tab" data-v="audit">${t("see_all")}</button></div><div class="glass list">${SC.S.audit.slice(0,5).map(auditRow).join("")}</div>`;
  } else if(m.role==="finance"){
    hero = heroFinance() + heroApprover();
    bub = [bubble("wallet",t("issue_advance"),"sheet","issueadv"), bubble("check",t("tab_approvals"),"tab","approvals",SC.inbox().length), bubble("folder",t("tab_folders"),"go","folders"), bubble("building",t("org"),"tab","org"), bubble("sheet",t("export"),"go","export")];
    extra = branchBars() + insights(SC.S.invoices.filter(i=>i.folder>=88)) + activity();
  } else {
    hero = heroApprover();
    bub = [bubble("check",t("tab_approvals"),"tab","approvals",SC.inbox().length+SC.poInbox().length)];
    if(["supervisor","accountant"].includes(m.role)) bub.push(bubble("folder",t("tab_folders"),"go","folders"));
    if(["engineer","pm","procurement"].includes(m.role)) bub.push(bubble("box",t("supplies"),"go","supplies"));
    if(SC.can("add_supplier")) bub.push(bubble("plus",t("add_supplier"),"sheet","addsupplier"));
    if(SC.can("request_purchase")) bub.push(bubble("truck",t("request_purchase"),"sheet","newpr"));
    bub.push(bubble("users",t("team"),"go","team")); bub.push(bubble("sheet",t("export"),"go","export"));
    bub = bub.slice(0,5);
    extra = (m.project ? wpad(budgetCard(m.project)) : "") + insights(scoped) + activity();
  }
  return `<div class="page">${homeHeader()}${hero}${actionCenter()}<div class="bubbles">${bub.join("")}</div>${extra}<div class="spacer"></div></div>`;
}

/* ================================================================== INVOICES */
function invRow(i){
  return `<button class="row" data-act="go" data-v="invoice:${i.id}"><span class="ico">${ic(i.cat,21)}</span>
    <div class="grow"><div class="t1"><bdi>${esc(supName(i))}</bdi>${i.comments?.length?` <span class="t2">${ic("msg",12)}${i.comments.length}</span>`:""}</div><div class="t2"><span class="num">${SC.fno(i.folder)} · #${i.seq}</span> · <span class="num">${SC.dt(i.date)}</span></div></div>
    <div class="end"><div class="amt">${money(i.total)}</div>${pill(i.status)}</div></button>`;
}
function vInvoices(){
  const all = SC.visibleInvoices().slice().sort((a,b)=>new Date(b.date)-new Date(a.date)), f = segv("inv","all"), q = UI.q.trim().toLowerCase();
  const cnt = s => all.filter(i=>i.status===s).length;
  let list = f==="all" ? all : all.filter(i=>i.status===f);
  if(q) list = list.filter(i=> [i.id, i.invNo, supName(i), SC.fno(i.folder), i.vatNo, SC.uname(i.by)].join(" ").toLowerCase().includes(q));
  return `<div class="page">${nav(t("tab_invoices"), !tabsOf(SC.me()).includes("invoices"), SC.can("scan")?`<button class="iconbtn glass" data-act="go" data-v="scan" aria-label="${t("scan")}">${ic("camera",20)}</button>`:"")}
    <label class="search glass">${ic("search",18)}<input id="inv-q" data-change="q" placeholder="${esc(t("search_hint"))}" value="${esc(UI.q)}"></label>
    <div class="hscroll">${seg("inv",[["all",t("all")],["review",t("st_review"),cnt("review")],["returned",t("st_returned"),cnt("returned")],["approved",t("st_approved")],["rejected",t("st_rejected")],["withdrawn",t("st_withdrawn")]],"all")}</div>
    ${list.length ? `<div class="glass list">${list.slice(0,UI.limit).map(invRow).join("")}</div>${list.length>UI.limit?`<button class="btn btn-glass more" data-act="more">${t("show_more",{n:list.length-UI.limit})}</button>`:""}` : empty("loupe", t("no_results"))}
    <div class="spacer"></div></div>`;
}
function evText(h){ return t("ev_"+h.ev, {who:esc(SC.uname(h.by)), role:h.step?t("role_"+h.step):"", folder:h.folder?SC.fno(h.folder):"", seq:h.seq||"", cn:h.cn||"", amt:h.amt?fmt(h.amt):""}) }
function commentsBlock(kind, rec){
  const list = rec.comments || [];
  return `<div class="sec-h"><span class="h2">${t("comments")}</span><span class="t2 num">${list.length}</span></div>
    <div class="glass card comments">${list.map(c=>`<div class="cm ${c.by===SC.me().id?"mine":""}">${avatar(c.by,"xs")}<div class="cm-b"><div class="cm-h"><b>${esc(SC.uname(c.by))}</b> · <span class="t2">${t("role_"+SC.roleOf(c.by))} · ${esc(SC.ago(c.t))}</span></div><div class="cm-t">${esc(noteText(c.text))}</div></div></div>`).join("") || `<div class="t2">${t("no_comments")}</div>`}
      <div class="cm-in"><input id="cm-text" placeholder="${esc(t("write_comment"))}" aria-label="${esc(t("write_comment"))}"><button class="iconbtn send" data-act="comment" data-v="${kind}" aria-label="${t("send")}">${ic("send",18,"flip")}</button></div>
      <div class="t2 small">${t("comment_notifies")}</div></div>`;
}
function vInvoice(){
  const i = SC.inv(UI.p.id); if(!i) return vInvoices();
  const m = SC.me(), credited = SC.credited(i), f = SC.folder(i.folder);
  const timeline = i.hist.filter(h=>h.ev!=="commented").map(h=>`<div class="tl done ${["returned","rejected"].includes(h.ev)?"bad":h.ev==="credit"?"cr":""}"><span class="dot">${ic(h.ev==="returned"?"undo":h.ev==="rejected"?"close":h.ev==="credit"?"undo":"ok",12)}</span>
    <div class="grow"><div class="t1">${evText(h)}</div><div class="t2 num">${SC.dt(h.t)}</div>${h.note?`<div class="note">${esc(noteText(h.note))}</div>`:""}</div></div>`).join("")
    + (i.status==="review" ? i.steps.slice(i.idx).map((s,k)=>`<div class="tl ${k===0?"cur":""}"><span class="dot"></span><div class="grow"><div class="t1">${t("role_"+s)}${k===0?` · ${esc(SC.approversFor(i,s).slice(0,2).map(SC.first).join(" / "))}`:""}</div><div class="t2">${k===0?t("waiting_for",{r:t("role_"+s)}):t("awaiting")}</div></div></div>`).join("")
      + `<div class="tl"><span class="dot"></span><div class="grow"><div class="t1">${t("ev_posted")}</div><div class="t2">${t("awaiting")}</div></div></div>` : "");
  const acts = [];
  if(SC.mayDecide(i)) acts.push(`<button class="btn btn-neg" data-act="sheet" data-v="reject">${t("reject")}</button><button class="btn btn-glass" data-act="sheet" data-v="return">${t("ret")}</button><button class="btn btn-primary" data-act="approve">${t("approve")}</button>`);
  if(SC.mayEdit(i)) acts.push(`<button class="btn ${i.status==="returned"?"btn-accent":"btn-glass"} wide" data-act="sheet" data-v="resubmit">${ic("edit",18)}${t(i.status==="returned"?"fix_resubmit":"edit_invoice")}</button>`);
  if(SC.mayWithdraw(i)) acts.push(`<button class="btn btn-glass wide" data-act="sheet" data-v="withdraw">${t("withdraw")}</button>`);
  if(SC.mayCredit(i)) acts.push(`<button class="btn btn-glass wide" data-act="sheet" data-v="credit">${ic("undo",18)}${t("purchase_return")}</button>`);
  const self = i.status==="review" && i.steps[i.idx]===m.role && i.by===m.id;
  return `<div class="page">${nav(`<span class="num">${i.id}</span>`)}
    <div class="inv-hero"><div class="thumb-wrap">${i.img?`<img id="inv-img" alt="${esc(t("invoice_photo"))}">`:miniReceipt(i)}</div>
      <div class="grow"><div class="t2">${t("kind_"+i.kind)} · ${t("cat_"+i.cat)}</div><div class="h2"><bdi>${esc(supName(i))}</bdi></div><div class="hero-amt">${money(i.total)}</div>${pill(i.status)}${credited?` <span class="pill p-returned">${t("credited")} ${fmt(credited)}</span>`:""}</div></div>
    <button class="folder-link glass" data-act="go" data-v="folder:${i.folder}">${ic("folder",18)}<span>${t("in_folder")}</span><b class="num">${SC.fno(i.folder)} · #${i.seq}</b>${f?.locked?ic("lock",14):""}${ic("chev",16,"flip")}</button>
    ${self?`<div class="banner b-info">${ic("info",18)}<span>${t("sod_note")}</span></div>`:""}
    <div class="kv glass">
      <div class="r"><span class="k">${t("inv_no")}</span><span class="v num">${esc(i.invNo||"—")}</span></div><div class="r"><span class="k">${t("vat_no")}</span><span class="v num">${esc(i.vatNo||t("not_shown"))}</span></div>
      <div class="r"><span class="k">${t("date")}</span><span class="v num">${SC.dt(i.date)}</span></div><div class="r"><span class="k">${t("x_by")}</span><span class="v">${esc(SC.uname(i.by))}</span></div>
      <div class="r"><span class="k">${t("project")}</span><span class="v">${esc(SC.projName(i.project))} · ${esc(SC.branchName(i.branch))}</span></div><div class="r"><span class="k">${t("x_path")}</span><span class="v">${t(pathName(i))}</span></div></div>
    <div class="kv glass">${i.items.map(([n,q,p,tt])=>`<div class="r"><span class="k">${esc(nm(n))} <span class="num">× ${q}</span></span><span class="v num">${fmt(tt)}</span></div>`).join("")}
      <div class="r"><span class="k">${t("subtotal")}</span><span class="v num">${fmt(i.sub)}</span></div><div class="r"><span class="k">${t("vat")}</span><span class="v num">${i.vat?fmt(i.vat):t("not_applicable")}</span></div>
      <div class="r tot"><span class="k">${t("total")}</span><span class="v">${money(i.total)}</span></div>
      ${i.credits.map(c=>`<div class="r"><span class="k"><span class="num">${c.cn}</span> · ${esc(noteText(c.reason))}</span><span class="v num pos">−${fmt(c.amt)}</span></div>`).join("")}</div>
    <div class="sec-h"><span class="h2">${t("lifecycle")}</span>${i.status==="review"?`<span class="t2">${t("step",{a:i.idx+1,b:i.steps.length})}</span>`:""}</div>
    <div class="timeline glass">${timeline}</div>
    ${commentsBlock("invoice", i)}
    <div class="spacer"></div>
    ${acts.length?`<div class="footer"><div class="acts ${acts[0].includes("btn-neg")?"three":""}">${acts.join("")}</div></div>`:""}
  </div>`;
}
function miniReceipt(i){ return `<div class="mini-rc"><b>${esc(supName(i)).slice(0,18)}</b>${"<i></i>".repeat(5)}<span class="num">${fmt(i.total)}</span>${i.kind?.startsWith("tax")?`<span class="mqr">${ic("qr",22)}</span>`:""}</div>` }

/* ================================================================== APPROVALS */
function apCard(i){
  const sim = SC.S.invoices.some(x=>x!==i && x.sup===i.sup && Math.abs(x.total-i.total)<.01 && x.status!=="rejected");
  const bulk = !!UI.sel, on = UI.sel?.has(i.id);
  return `<button class="apcard glass ${on?"selected":""}" data-act="${bulk?"togglesel":"go"}" data-v="${bulk?i.id:"invoice:"+i.id}">
    <div class="ap-top">${bulk?`<span class="cbx ${on?"on":""}">${on?ic("ok",14):""}</span>`:avatar(i.by,"sm")}<div class="grow"><div class="t2"><bdi>${esc(SC.uname(i.by))}</bdi> · ${t("role_"+SC.roleOf(i.by))}</div><div class="t1">${t("cat_"+i.cat)} · <bdi>${esc(supName(i))}</bdi></div></div><div class="ap-amt num">${fmt(i.total)}</div></div>
    ${stepbar(i)}
    <div class="ap-bot"><span class="t2">${t(pathName(i))} · ${t("step",{a:i.idx+1,b:i.steps.length})} · <span class="num">${SC.fno(i.folder)} #${i.seq}</span></span>${sim?`<span class="flag warn">${ic("warn",15)}${t("flag_similar")}</span>`:i.comments?.length?`<span class="flag">${ic("msg",14)}${i.comments.length}</span>`:`<span class="flag ok">${ic("ok",15)}</span>`}</div>
  </button>`;
}
function poCard(p){
  return `<button class="apcard glass" data-act="go" data-v="po:${p.id}">
    <div class="ap-top"><span class="ico">${ic("truck",20)}</span><div class="grow"><div class="t1 num">${p.id}</div><div class="t2"><bdi>${esc(SC.supNm(p.sup))}</bdi> · ${esc(nm(p.lines[0].item))}${p.lines.length>1?` +${p.lines.length-1}`:""}</div></div><div class="ap-amt num">${fmt(SC.poTotal(p))}</div></div>
    <div class="ap-bot"><span class="pill p-po-${p.status}">${t("po_"+p.status)}</span><span class="match3">${["po","gr","inv"].map((k,j)=>`<span class="m3 ${j===0?"ok":j===1?(p.lines.every(l=>l.rec>=l.qty)?"ok":p.lines.some(l=>l.rec)?"part":""):(p.invoice?(p.status==="matched"?"ok":"bad"):"")}">${t("m3_"+k)}</span>`).join("")}</span></div>
  </button>`;
}
function vApprovals(){
  const m = SC.me(), ib = SC.inbox(), po = SC.poInbox(), tab = segv("ap","inv");
  const head = nav(t("tab_approvals"), false, SC.can("bulk_approve") && ib.length>1 ? `<button class="btn btn-sm ${UI.sel?"btn-primary":"btn-glass"}" data-act="bulkmode">${ic("checks",16)} ${UI.sel?t("cancel"):t("select")}</button>` : "")
    + `<p class="ctx">${t("approving_as",{r:t("role_"+m.role), s:esc(scopeText(m))})}${m.limit?` · ${t("limit")} <span class="num">${fmt(m.limit)}</span>`:""}</p>`;
  const s = m.role==="pm" ? seg("ap",[["inv",t("x_invoices"),ib.length],["po",t("x_pos"),po.length]],"inv") : "";
  if(!SC.can("approve")) return `<div class="page">${head}${empty("padlock", t("no_approval_role"))}</div>`;
  if(tab==="po" && m.role==="pm") return `<div class="page">${head}${s}${po.length?po.map(poCard).join(""):empty("sieve",t("inbox_empty"),t("inbox_empty_sub"))}<div class="spacer"></div></div>`;
  if(!ib.length) return `<div class="page">${head}${s}${empty("sieve", t("inbox_empty"), t("inbox_empty_sub"), `<button class="btn btn-glass auto" data-act="go" data-v="decided">${t("approved_by_you")}</button>`)}</div>`;
  const n = UI.sel?.size || 0, sum = n ? ib.filter(i=>UI.sel.has(i.id)).reduce((a,i)=>a+i.total,0) : 0;
  return `<div class="page">${head}${s}${UI.sel?`<div class="bulkbar glass"><button class="link" data-act="selall">${n===ib.length?t("select_none"):t("select_all")}</button><span class="t2">${t("selected_n",{n})} · <span class="num">${fmt(sum)}</span></span></div>`:""}
    ${ib.map(apCard).join("")}<div class="spacer"></div>
    ${UI.sel?`<div class="footer"><button class="btn btn-primary" data-act="bulkapprove" ${n?"":"disabled"}>${ic("checks",18)}${t("approve_n",{n})}</button></div>`:""}</div>`;
}
function vDecided(){
  const m = SC.me(), list = SC.S.invoices.filter(i=>i.hist.some(h=>["approved","returned","rejected"].includes(h.ev) && h.by===m.id)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  return `<div class="page">${nav(t("approved_by_you"))}${list.length?`<div class="glass list">${list.slice(0,UI.limit).map(invRow).join("")}</div>`:empty("sieve",t("no_results"))}<div class="spacer"></div></div>`;
}

/* ================================================================== FOLDERS */
function vFolders(){
  const list = SC.S.folders.filter(SC.folderVisible).sort((a,b)=>b.no-a.no);
  return `<div class="page">${nav(t("tab_folders"), !tabsOf(SC.me()).includes("folders"))}<p class="ctx">${t("folders_rule")}</p>
    ${list.length?list.map(f=>{ const s = SC.folderStats(f.no), a = SC.adv(f.adv); return `<button class="fcard glass" data-act="go" data-v="folder:${f.no}">${ring(s.n,30,52,5)}
      <div class="grow"><div class="t1 num">${SC.fno(f.no)} ${f.locked?ic("lock",13):""}</div><div class="t2"><bdi>${esc(SC.uname(a.holder))}</bdi> · <span class="num">${a.id}</span></div><div class="t2 num">${SC.dd(s.from)} – ${SC.dd(s.to)}</div></div>
      <div class="end"><div class="amt">${money(s.total)}</div><span class="pill p-f-${f.status}">${t("fs_"+f.status)}</span></div></button>` }).join(""):empty("drawer",t("no_folders"))}
    <div class="spacer"></div></div>`;
}
function vFolder(){
  const f = SC.folder(UI.p.id); if(!f) return vFolders();
  const s = SC.folderStats(f.no), a = SC.adv(f.adv), inv = SC.folderInv(f.no), m = SC.me();
  const slots = Array.from({length:30},(_,k)=>{ const i = inv[k]; return `<i class="${i?"s-"+i.status:""}" title="${i?`#${i.seq} · ${esc(t("st_"+i.status))}`:""}"></i>` }).join("");
  const mayClose = f.status==="open" && s.n>0 && ((SC.can("close_own_folder") && a.holder===m.id) || SC.can("close_folder"));
  const sigRole = m.role==="owner" ? "owner" : m.role==="finance" ? "finance" : m.role==="accountant" ? "accountant" : null;
  const maySign = sigRole && SC.can("sign_folder") && ["closed","in_review"].includes(f.status) && !f.sigs[sigRole];
  const mayJournal = SC.can("journal") && f.status==="approved";
  const sig = (r, lab) => `<div class="sig glass"><span>${t(lab)}</span>${f.sigs[r]?`<span class="pos small">${ic("ok",14)} ${esc(SC.uname(f.sigs[r].by))} · <span class="num">${SC.dt(f.sigs[r].t)}</span></span>`:`<span class="t2">${t("awaiting")}</span>`}</div>`;
  return `<div class="page">${nav(`<span class="num">${SC.fno(f.no)}</span>`, true, `<button class="iconbtn glass" data-act="xfolder" data-v="${f.no}" aria-label="${t("export_excel")}">${ic("sheet",20)}</button>`)}
    <section class="fold"><div class="fold-h"><div><div class="fold-no num">${a.id} · <bdi>${esc(SC.uname(a.holder))}</bdi></div><div class="fold-c num">${s.n}<small> / 30</small></div></div><span class="pill p-f-${f.status}">${f.locked?ic("lock",12)+" ":""}${t(f.locked?"locked":"fs_"+f.status)}</span></div>
      <div class="slots" aria-label="${t("invoices_count",{n:s.n})}">${slots}</div>
      <div class="legend">${["approved","review","returned","rejected","withdrawn"].map(k=>`<span><i class="s-${k}"></i>${t("st_"+k)}</span>`).join("")}</div>
      <div class="fold-note">${f.status==="open"?t("auto_close_note"):`${t("closed_on")} <span class="num">${SC.dt(f.closedAt)}</span> · ${t("r_"+f.reason)}${f.note?` · ${esc(f.note)}`:""}`}${f.locked?`<br>${t("locked_note")}`:""}</div></section>
    <div class="totals"><div class="glass"><span>${t("total")}</span><b class="num">${fmt(s.total)}</b></div><div class="glass"><span>${t("vat_short")}</span><b class="num">${fmt(s.vat)}</b></div>
      <div class="glass"><span>${t("approved")}</span><b class="num pos">${fmt(s.approved)}</b></div><div class="glass"><span>${t("pending")}</span><b class="num">${fmt(s.pending)}</b></div>
      <div class="glass"><span>${t("rejected")}</span><b class="num neg">${fmt(s.rejected)}</b></div><div class="glass"><span>${t("x_period")}</span><b class="num small">${SC.dd(s.from)}<br>${SC.dd(s.to)}</b></div></div>
    <div class="sec-h"><span class="h2">${t("signatures")}</span></div><div class="sigs">${SC.plan()==="business" ? sig("owner","role_owner") : sig("accountant","r_accountant_sig")+sig("finance","r_finance_sig")}</div>
    <div class="pad-x stack">${maySign?`<button class="btn btn-primary" data-act="sign" data-v="${f.no}">${ic("ok",18)}${t("sign_as",{r:t("role_"+m.role)})}</button>`:""}
      ${mayClose?`<button class="btn btn-glass" data-act="sheet" data-v="closefolder">${ic("lock",18)}${t("close_early")}</button>`:""}
      ${mayJournal?`<button class="btn btn-accent" data-act="xjournal" data-v="${f.no}">${ic("sheet",18)}${t(f.locked?"journal_again":"journal_lock")}</button>`:""}
      <button class="btn btn-glass" data-act="xfolder" data-v="${f.no}">${ic("sheet",18)}${t("export_excel")}</button></div>
    <div class="sec-h"><span class="h2">${t("x_invoices")}</span><span class="t2">${t("in_sequence")}</span></div>
    <div class="glass list">${inv.map(i=>`<button class="row" data-act="go" data-v="invoice:${i.id}"><span class="seqno num">${String(i.seq).padStart(2,"0")}</span>
      <div class="grow"><div class="t1"><bdi>${esc(supName(i))}</bdi></div><div class="t2"><span class="num">${i.id} · ${SC.dd(i.date)}</span> · ${t("kind_"+i.kind)}</div></div>
      <div class="end"><div class="amt">${fmt(i.total)}</div>${pill(i.status)}</div></button>`).join("") || `<div class="row t2">${t("folder_empty")}</div>`}</div>
    <div class="spacer"></div></div>`;
}

/* ================================================================== ADVANCES */
function vAdvances(){
  const q = UI.q.trim().toLowerCase(), br = segv("advb","all");
  let list = SC.S.advances.filter(a=>SC.can("issue_advance") || SC.sees({holder:a.holder, project:a.project, branch:a.branch}));
  if(br!=="all") list = list.filter(a=>a.branch===br);
  if(q) list = list.filter(a=>[a.id, SC.uname(a.holder), SC.user(a.holder)?.emp, a.project].join(" ").toLowerCase().includes(q));
  const tot = list.reduce((s,a)=>s+SC.advStats(a).balance,0);
  return `<div class="page">${nav(t("advances"), !tabsOf(SC.me()).includes("advances"), SC.can("issue_advance")?`<button class="iconbtn glass" data-act="sheet" data-v="issueadv" aria-label="${t("issue_advance")}">${ic("plus",20)}</button>`:"")}
    <label class="search glass">${ic("search",18)}<input id="adv-q" data-change="q" placeholder="${esc(t("search_advances"))}" value="${esc(UI.q)}"></label>
    <div class="hscroll">${seg("advb",[["all",t("all")]].concat(SC.S.branches.map(b=>[b.id, SC.branchName(b.id)])),"all")}</div>
    <p class="ctx">${t("advances_total",{n:list.length})} · <b class="num">${fmt(tot)}</b> ${SC.cur()}</p>
    <div class="glass list">${list.slice(0,UI.limit).map(a=>{ const s = SC.advStats(a), pct = s.issued ? (s.balance/s.issued) : 0; return `<button class="row" data-act="go" data-v="advance:${a.id}">${avatar(a.holder,"sm")}
      <div class="grow"><div class="t1">${esc(SC.uname(a.holder))}</div><div class="t2"><span class="num">${a.id}</span> · ${t("ct_"+a.type)} · ${esc(SC.branchName(a.branch))}</div><div class="minibar"><i style="width:${Math.max(0,Math.round(pct*100))}%"></i></div></div>
      <div class="end"><div class="amt num">${fmt(s.balance)}</div><div class="t2 num">/ ${SC.fmt0(s.issued)}</div></div></button>` }).join("")}</div>
    ${list.length>UI.limit?`<button class="btn btn-glass more" data-act="more">${t("show_more",{n:list.length-UI.limit})}</button>`:""}
    <div class="spacer"></div></div>`;
}
function vAdvance(){
  const a = SC.adv(UI.p.id); if(!a) return vHome(); const s = SC.advStats(a), f = SC.currentFolder(a.id);
  return `<div class="page">${nav(`<span class="num">${a.id}</span>`, true, `<button class="iconbtn glass" data-act="xstatement" data-v="${a.id}" aria-label="${t("export_excel")}">${ic("sheet",20)}</button>`)}
    <div class="hero static"><div class="hero-top"><span class="hero-l">${esc(SC.uname(a.holder))} · ${t("ct_"+a.type)}</span><span class="hero-chip">${esc(SC.projName(a.project))}</span></div>
      <div class="hero-l">${t("remaining")}</div><div class="hero-big num">${fmt(s.balance)}<span class="cur">${SC.cur()}</span></div>
      ${spark(SC.spendSeries(SC.S.invoices.filter(i=>i.adv===a.id)))}
      <div class="hero-stats"><div><span>${t("issued")}</span><b class="num">${SC.fmt0(s.issued)}</b></div><div><span>${t("approved")}</span><b class="num">${SC.fmt0(s.approved)}</b></div><div><span>${t("under_review")}</span><b class="num">${SC.fmt0(s.review)}</b></div></div></div>
    <div class="totals"><div class="glass"><span>${t("x_credit")}</span><b class="num pos">${fmt(s.credits)}</b></div><div class="glass"><span>${t("rejected")}</span><b class="num neg">${fmt(s.rejected)}</b></div>
      <div class="glass"><span>${t("settle_due")}</span><b class="num small">${esc(a.due||"—")}</b></div><div class="glass"><span>${t("current_folder")}</span><b class="num small">${f?SC.fno(f.no):"—"}</b></div></div>
    ${SC.can("topup")?`<div class="pad-x stack" style="margin-top:12px"><button class="btn btn-accent" data-act="sheet" data-v="topup">${ic("plus",18)}${t("topup")}</button></div>`:""}
    <div class="sec-h"><span class="h2">${t("advance_moves")}</span></div>
    <div class="glass list">${a.moves.slice().reverse().map(mv=>`<div class="row"><span class="ico">${ic(mv.kind==="refund"?"up":"down",20)}</span><div class="grow"><div class="t1">${t("mv_"+mv.kind)}${mv.note?` · <span class="num">${esc(mv.note)}</span>`:""}</div><div class="t2">${esc(SC.uname(mv.by))} · <span class="num">${SC.dt(mv.t)}</span></div></div><div class="amt pos num">+${fmt(mv.amt)}</div></div>`).join("")}</div>
    <div class="pad-x stack" style="margin-top:12px"><button class="btn btn-glass" data-act="xstatement" data-v="${a.id}">${ic("sheet",18)}${t("statement_excel")}</button></div>
    <div class="spacer"></div></div>`;
}

/* ================================================================== ORG: branches & projects */
function vOrg(){
  const tab = segv("org","projects"), q = UI.q.trim().toLowerCase();
  const right = tab==="branches" ? (SC.can("add_branch")?`<button class="iconbtn glass" data-act="sheet" data-v="addbranch" aria-label="${t("add_branch")}">${ic("plus",20)}</button>`:"")
    : (SC.can("add_project")?`<button class="iconbtn glass" data-act="sheet" data-v="addproject" aria-label="${t("add_project")}">${ic("plus",20)}</button>`:"");
  let body = "";
  if(tab==="branches") body = `<div class="glass list">${SC.S.branches.map(b=>{ const n = SC.S.users.filter(u=>u.branch===b.id && u.status!=="pending").length, pr = SC.S.projects.filter(p=>p.branch===b.id).length;
    return `<button class="row" data-act="seg" data-k="orgb" data-v="${b.id}"><span class="ico">${ic("pin",20)}</span><div class="grow"><div class="t1">${esc(SC.branchName(b.id))}</div><div class="t2">${esc(SC.regionName(b.region))} · ${esc(SC.govName(b.gov))}</div></div><div class="end"><div class="amt num">${n.toLocaleString("en-US")}</div><div class="t2">${pr} ${t("projects")}</div></div></button>` }).join("")}</div>`;
  else {
    const br = segv("orgb","all"); let list = SC.S.projects.filter(p=>br==="all"||p.branch===br);
    if(q) list = list.filter(p=>[p.id, SC.projName(p.id), SC.uname(p.pm), SC.govName(p.gov)].join(" ").toLowerCase().includes(q));
    body = `<label class="search glass">${ic("search",18)}<input id="org-q" data-change="q" placeholder="${esc(t("search_projects"))}" value="${esc(UI.q)}"></label>
      <div class="hscroll">${seg("orgb",[["all",t("all")]].concat(SC.S.branches.map(b=>[b.id, SC.branchName(b.id)])),"all")}</div>
      ${list.map(p=>{ const s = SC.projectStats(p.id), pct = Math.round(s.pct*100); return `<button class="pcard glass" data-act="go" data-v="project:${p.id}">
        <div class="ap-top"><div class="grow"><div class="t2 num">${p.id} · ${esc(SC.govName(p.gov))}</div><div class="t1">${esc(SC.projName(p.id))}</div><div class="t2">${t("role_pm")}: ${esc(SC.uname(p.pm)||t("none"))} · ${s.team} ${t("people")}</div></div>
        <div class="end"><div class="amt num">${pct}%</div><div class="t2 num">${SC.fmt0(p.budget)}</div></div></div>
        <div class="bbar ${s.level}"><i style="width:${Math.min(100,pct)}%"></i></div></button>` }).join("")}`;
  }
  return `<div class="page">${nav(t("org"), !tabsOf(SC.me()).includes("org"), right)}${seg("org",[["projects",t("projects")],["branches",t("branches")]],"projects")}${body}<div class="spacer"></div></div>`;
}
function vProject(){
  const id = UI.p.id || SC.me().project, p = SC.project(id); if(!p) return `<div class="page">${nav(t("project"), false)}${empty("drawer",t("no_project"))}</div>`;
  const s = SC.projectStats(id), team = SC.S.users.filter(u=>u.project===id && u.status!=="pending"), by = r => team.filter(u=>u.role===r);
  const advs = SC.S.advances.filter(a=>a.project===id), isTab = UI.screen==="myproject";
  return `<div class="page">${nav(esc(SC.projName(id)), !isTab, SC.can("add_project")?`<button class="iconbtn glass" data-act="sheet" data-v="editproject" aria-label="${t("edit")}">${ic("edit",20)}</button>`:"")}
    <p class="ctx num">${p.id} · ${esc(SC.branchName(p.branch))} · ${esc(SC.govName(p.gov))}</p>
    ${wpad(budgetCard(id, true))}
    <div class="totals"><div class="glass"><span>${t("spent_invoices")}</span><b class="num">${SC.fmt0(s.spent)}</b></div><div class="glass"><span>${t("spent_orders")}</span><b class="num">${SC.fmt0(s.pos)}</b></div>
      <div class="glass"><span>${t("under_review")}</span><b class="num">${SC.fmt0(s.pending)}</b></div><div class="glass"><span>${t("advances_issued")}</span><b class="num">${SC.fmt0(s.issued)}</b></div></div>
    <div class="sec-h"><span class="h2">${t("chain")}</span><span class="t2 num">${s.team} ${t("people")}</span></div>
    <div class="glass list">
      ${[["accountant", SC.S.users.filter(u=>u.role==="accountant" && u.branch===p.branch)],["pm", p.pm?[SC.user(p.pm)]:[]],["engineer",by("engineer")],["supervisor",by("supervisor")],["technician",by("technician")]].map(([r,l])=>`<button class="row" data-act="${l.length===1?"go":"teamof"}" data-v="${l.length===1?"user:"+l[0].id:r+"|"+id}"><span class="ico">${ic(r==="technician"?"users":"user",20)}</span><div class="grow"><div class="t1">${t("role_"+r)}</div><div class="t2">${l.slice(0,3).map(u=>esc(SC.uname(u.id))).join(" · ")}${l.length>3?` +${l.length-3}`:""}</div></div><span class="amt num">${l.length}</span>${ic("chev",16,"flip")}</button>`).join("")}
    </div>
    <div class="sec-h"><span class="h2">${t("advances")}</span>${SC.can("issue_advance")?`<button class="link" data-act="sheet" data-v="issueadv">${t("issue_advance")}</button>`:""}</div>
    <div class="glass list">${advs.slice(0,8).map(a=>{ const st = SC.advStats(a); return `<button class="row" data-act="go" data-v="advance:${a.id}">${avatar(a.holder,"sm")}<div class="grow"><div class="t1">${esc(SC.uname(a.holder))}</div><div class="t2 num">${a.id}</div></div><div class="amt num">${fmt(st.balance)}</div></button>` }).join("") || `<div class="row t2">${t("no_advances")}</div>`}</div>
    <div class="spacer"></div></div>`;
}

/* ================================================================== SUPPLIES */
function vSupplies(){
  const tab = segv("sup", SC.me().role==="procurement" ? "pr" : "po");
  const s = seg("sup",[["pr",t("x_requests"),SC.S.prs.filter(p=>p.status==="new").length],["po",t("x_pos")],["sup",t("suppliers")]], tab);
  let body = "";
  if(tab==="pr") body = SC.S.prs.map(p=>{ const best = p.quotes.slice().sort((a,b)=>a.price-b.price)[0]; return `<button class="apcard glass" data-act="go" data-v="pr:${p.id}">
      <div class="ap-top"><span class="ico">${ic("box",20)}</span><div class="grow"><div class="t1 num">${p.id}</div><div class="t2">${p.lines.map(l=>`${esc(nm(l.item))} × ${l.qty}`).join(" · ")}</div></div><span class="pill p-pr-${p.status}">${t("pr_"+p.status)}</span></div>
      <div class="ap-bot"><span class="t2"><bdi>${esc(SC.uname(p.by))}</bdi> · <span class="num">${SC.dd(p.t)}</span></span><span class="t2">${t("best")}: <bdi>${esc(SC.supNm(best.sup))}</bdi> <span class="num">${fmt(best.price)}</span></span></div></button>` }).join("");
  if(tab==="po") body = SC.S.pos.map(poCard).join("");
  if(tab==="sup") body = `<label class="search glass">${ic("search",18)}<input id="sup-q" data-change="q" placeholder="${esc(t("search_suppliers"))}" value="${esc(UI.q)}"></label>
    <div class="glass list">${SC.S.suppliers.filter(sp=>!UI.q || [SC.supNm(sp.k), sp.vat, SC.govName(sp.gov)].join(" ").toLowerCase().includes(UI.q.toLowerCase())).map(sp=>{ const inv = SC.S.invoices.filter(i=>i.sup===sp.k && i.status==="approved"); return `<button class="row" data-act="go" data-v="supplier:${sp.k}"><span class="avatar sm">${esc(SC.supNm(sp.k).charAt(0))}</span>
      <div class="grow"><div class="t1"><bdi>${esc(SC.supNm(sp.k))}</bdi>${sp.by?` <span class="pill p-returned">${t("new")}</span>`:""}</div><div class="t2">${sp.cats.map(c=>t("cat_"+c)).join(" · ")} · ${esc(SC.govName(sp.gov))}</div></div>
      <div class="end"><div class="amt num">${SC.fmt0(inv.reduce((s,i)=>s+i.total,0))}</div><div class="t2">${sp.rating?`${ic("star",12)} <span class="num">${sp.rating}</span>`:"—"}</div></div></button>` }).join("")}</div>`;
  const right = tab==="sup" && SC.can("add_supplier") ? `<button class="iconbtn glass" data-act="sheet" data-v="addsupplier" aria-label="${t("add_supplier")}">${ic("plus",20)}</button>`
    : SC.can("request_purchase") ? `<button class="iconbtn glass" data-act="sheet" data-v="newpr" aria-label="${t("request_purchase")}">${ic("plus",20)}</button>` : "";
  return `<div class="page">${nav(t("supplies"), !tabsOf(SC.me()).includes("supplies"), right)}${s}${body}<div class="spacer"></div></div>`;
}
function vPR(){
  const p = SC.pr(UI.p.id); if(!p) return vSupplies();
  const qs = p.quotes.slice().sort((a,b)=>a.price-b.price), qty = p.lines.reduce((s,l)=>s+l.qty,0);
  return `<div class="page">${nav(`<span class="num">${p.id}</span>`)}
    <div class="kv glass"><div class="r"><span class="k">${t("x_by")}</span><span class="v">${esc(SC.uname(p.by))} · ${t("role_"+SC.roleOf(p.by))}</span></div><div class="r"><span class="k">${t("project")}</span><span class="v">${esc(SC.projName(p.project))}</span></div>
      ${p.lines.map(l=>`<div class="r"><span class="k">${esc(nm(l.item))}</span><span class="v num">× ${l.qty}</span></div>`).join("")}<div class="r"><span class="k">${t("x_status")}</span><span class="v"><span class="pill p-pr-${p.status}">${t("pr_"+p.status)}</span></span></div></div>
    <div class="sec-h"><span class="h2">${t("quotes")}</span><span class="t2">${t("quotes_n",{n:qs.length})}</span></div>
    ${qs.map((q,k)=>`<div class="quote glass ${k===0?"best":""}"><div class="grow"><div class="t1"><bdi>${esc(SC.supNm(q.sup))}</bdi>${k===0?` <span class="pill p-approved">${t("best_price")}</span>`:""}</div>
      <div class="t2">${t("unit_price")} <span class="num">${fmt(q.price)}</span> · ${t("delivery_days",{n:q.days})}</div></div><div class="end"><div class="amt num">${fmt(q.price*qty)}</div>
      ${p.status==="new" && SC.can("create_po")?`<button class="btn btn-sm ${k===0?"btn-accent":"btn-glass"}" data-act="createpo" data-v="${q.sup}">${t("create_po")}</button>`:""}</div></div>`).join("")}
    ${p.po?`<button class="folder-link glass" data-act="go" data-v="po:${p.po}">${ic("truck",18)}<span>${t("x_po")}</span><b class="num">${p.po}</b>${ic("chev",16,"flip")}</button>`:""}
    ${p.status==="new" && SC.can("create_po")?`<div class="pad-x" style="margin-top:10px"><button class="btn btn-neg" data-act="sheet" data-v="rejectpr">${t("reject_request")}</button></div>`:""}
    ${p.status==="new" && !SC.can("create_po")?`<div class="banner b-info">${ic("info",18)}<span>${t("pr_waiting_proc")}</span></div>`:""}
    ${commentsBlock("pr", p)}<div class="spacer"></div></div>`;
}
function vPO(){
  const p = SC.po(UI.p.id); if(!p) return vSupplies(); const m = SC.me();
  const mayRecv = SC.can("receive_goods") && ["ordered","partial"].includes(p.status), mayMatch = SC.can("match_invoice") && ["received","partial","mismatch"].includes(p.status), mayApprove = m.role==="pm" && p.status==="pending";
  return `<div class="page">${nav(`<span class="num">${p.id}</span>`)}
    <div class="inv-hero"><span class="ico big">${ic("truck",26)}</span><div class="grow"><div class="t2">${t("supplier")}</div><div class="h2"><bdi>${esc(SC.supNm(p.sup))}</bdi></div><div class="hero-amt">${money(SC.poTotal(p))}</div><span class="pill p-po-${p.status}">${t("po_"+p.status)}</span></div></div>
    <div class="sec-h"><span class="h2">${t("three_way")}</span></div>
    <div class="tablewrap glass"><table class="tbl"><thead><tr><th>${t("item")}</th><th>${t("m3_po")}</th><th>${t("m3_gr")}</th><th>${t("m3_inv")}</th><th></th></tr></thead>
      <tbody>${p.lines.map(l=>{ const mt = SC.lineMatch(l); return `<tr><td>${esc(nm(l.item))}<div class="t2 num">${fmt(l.price)}</div></td><td class="num">${l.qty}</td><td class="num">${l.rec}</td><td class="num">${l.inv||"—"}</td><td>${mt==="ok"?`<span class="pos">${ic("ok",16)}</span>`:mt==="bad"?`<span class="neg">${ic("warn",16)}</span>`:""}</td></tr>` }).join("")}</tbody></table></div>
    ${p.status==="mismatch"?`<div class="banner b-warn">${ic("warn",18)}<span>${t("mismatch_note")}</span></div>`:""}
    <div class="kv glass"><div class="r"><span class="k">${t("x_request")}</span><span class="v num">${p.pr}</span></div><div class="r"><span class="k">${t("project")}</span><span class="v">${esc(SC.projName(p.project))}</span></div>
      <div class="r"><span class="k">${t("x_by")}</span><span class="v">${esc(SC.uname(p.by))} · <span class="num">${SC.dt(p.t)}</span></span></div>
      ${p.receipts.map(r=>`<div class="r"><span class="k">${t("received_by")}</span><span class="v">${esc(SC.uname(r.by))} · <span class="num">${SC.dt(r.t)}</span></span></div>`).join("")}
      ${p.invoice?`<div class="r"><span class="k">${t("supplier_invoice")}</span><span class="v num">${esc(p.invoice.no)} · ${fmt(p.invoice.total)}</span></div>`:""}</div>
    <div class="spacer"></div>
    ${(mayRecv||mayMatch||mayApprove)?`<div class="footer"><div class="acts">${mayApprove?`<button class="btn btn-primary wide" data-act="approvepo">${t("approve_po")}</button>`:""}${mayRecv?`<button class="btn btn-accent wide" data-act="sheet" data-v="receive">${t("record_receipt")}</button>`:""}${mayMatch?`<button class="btn btn-primary wide" data-act="sheet" data-v="match">${t("match_invoice")}</button>`:""}</div></div>`:""}
  </div>`;
}
function vSupplier(){
  const sp = SC.sup(UI.p.id); if(!sp) return vSupplies();
  const inv = SC.S.invoices.filter(i=>i.sup===sp.k && i.status==="approved"), items = {};
  inv.forEach(i=>i.items.forEach(([n,q,p])=>{ (items[n] ||= []).push(p) }));
  const others = item => { const all = SC.S.invoices.filter(i=>i.status==="approved" && i.sup!==sp.k).flatMap(i=>i.items.filter(x=>x[0]===item).map(x=>x[2])); return all.length ? all.reduce((a,b)=>a+b,0)/all.length : null };
  return `<div class="page">${nav(`<bdi>${esc(SC.supNm(sp.k))}</bdi>`)}
    <div class="kv glass"><div class="r"><span class="k">${t("vat_no")}</span><span class="v num">${sp.vat||t("not_registered")}</span></div><div class="r"><span class="k">${t("x_cr")}</span><span class="v num">${sp.cr||"—"}</span></div>
      <div class="r"><span class="k">${t("governorate")}</span><span class="v">${esc(SC.govName(sp.gov))}</span></div><div class="r"><span class="k">${t("phone")}</span><span class="v num" dir="ltr">${esc(sp.phone)}</span></div>
      ${sp.by?`<div class="r"><span class="k">${t("added_by")}</span><span class="v">${esc(SC.uname(sp.by))} · <span class="num">${SC.dd(sp.t)}</span></span></div>`:""}</div>
    <div class="totals"><div class="glass"><span>${t("total_spend")}</span><b class="num">${fmt(inv.reduce((s,i)=>s+i.total,0))}</b></div><div class="glass"><span>${t("x_invoices")}</span><b class="num">${inv.length}</b></div></div>
    <div class="sec-h"><span class="h2">${t("price_compare")}</span></div>
    <div class="tablewrap glass"><table class="tbl"><thead><tr><th>${t("item")}</th><th>${t("avg_here")}</th><th>${t("avg_others")}</th></tr></thead><tbody>
      ${Object.entries(items).map(([k,ps])=>{ const a = ps.reduce((x,y)=>x+y,0)/ps.length, o = others(k); return `<tr><td>${esc(nm(k))}</td><td class="num">${fmt(a)}</td><td class="num ${o!==null&&a>o*1.05?"neg":o!==null&&a<o*.95?"pos":""}">${o===null?"—":fmt(o)}</td></tr>` }).join("") || `<tr><td colspan="3" class="t2">—</td></tr>`}</tbody></table></div>
    ${inv.length?`<div class="sec-h"><span class="h2">${t("recent")}</span></div><div class="glass list">${inv.slice(-6).reverse().map(invRow).join("")}</div>`:""}
    <div class="spacer"></div></div>`;
}

/* ================================================================== LEDGER */
const bal = c => c.entries.reduce((s,e)=>s+(e.dir==="gave"?e.amt:-e.amt),0);
const cname = c => c ? (c.n ? nm(c.n) : c.name) : "";
function vLedger(){
  const mine = SC.S.contacts.filter(c=>c.owner===SC.me().id);
  const get = mine.reduce((s,c)=>s+Math.max(0,bal(c)),0), give = mine.reduce((s,c)=>s+Math.max(0,-bal(c)),0);
  return `<div class="page">${nav(t("ledger_title"), !tabsOf(SC.me()).includes("ledger"), `<button class="iconbtn glass" data-act="sheet" data-v="addcontact" aria-label="${t("add_person")}">${ic("plus",20)}</button>`)}
    <div class="totals"><div class="glass"><span>${t("will_get")}</span><b class="num pos">${fmt(get)}</b></div><div class="glass"><span>${t("will_give")}</span><b class="num neg">${fmt(give)}</b></div></div>
    ${mine.length?`<div class="glass list">${mine.map(c=>{ const b = bal(c); return `<button class="row" data-act="go" data-v="person:${c.id}"><span class="avatar sm">${esc(cname(c).trim().charAt(0))}</span>
      <div class="grow"><div class="t1"><bdi>${esc(cname(c))}</bdi></div><div class="t2">${t(c.kind==="customer"?"customer":"supplier_k")} · <span class="num">${SC.dd(c.entries.at(-1)?.t)}</span></div></div>
      <div class="end"><div class="amt num ${b>0?"pos":b<0?"neg":""}">${fmt(Math.abs(b))}</div><div class="t2">${t(b>0?"owes_you":b<0?"you_owe":"settled")}</div></div></button>` }).join("")}</div>`
      : empty("drawer", t("ledger_empty"), "", `<button class="btn btn-glass auto" data-act="sheet" data-v="addcontact">${t("add_person")}</button>`)}<div class="spacer"></div></div>`;
}
function vPerson(){
  const c = SC.S.contacts.find(x=>x.id===UI.p.id); if(!c) return vLedger();
  const b = bal(c); let run = 0; const rows = c.entries.map(e=>{ run += e.dir==="gave"?e.amt:-e.amt; return {...e, run} }).reverse();
  return `<div class="page">${nav(`<bdi>${esc(cname(c))}</bdi>`, true, `<button class="iconbtn glass" data-act="convert" aria-label="${t("convert")}">${ic("swap",20)}</button>`)}
    <div class="person-head"><div class="sub">${t(b>0?"owes_you":b<0?"you_owe":"settled")} · ${t(c.kind==="customer"?"customer":"supplier_k")}</div><div class="hero-amt ${b>0?"pos":b<0?"neg":""}">${money(Math.abs(b))}</div></div>
    <div class="two pad-x">${c.phone?`<a class="btn btn-wa" href="${SC.waLink(c.phone, SC.waBalanceText(c))}" target="_blank" rel="noopener" data-act="wasent" data-v="${c.id}">${ic("msg",18)}${t("remind")}</a>`:`<button class="btn btn-glass" data-act="remind">${ic("msg",18)}${t("remind")}</button>`}<button class="btn btn-glass" data-act="xperson">${ic("sheet",18)}${t("statement_excel")}</button></div>
    <div class="glass list" style="margin-top:12px">${rows.map(e=>`<div class="row"><span class="ico ${e.dir==="gave"?"neg":"pos"}">${ic(e.dir==="gave"?"up":"down",18)}</span><div class="grow"><div class="t1">${t(e.dir)}</div><div class="t2">${t("bal")} <span class="num">${fmt(e.run)}</span> · <span class="num">${SC.dt(e.t)}</span></div></div><div class="amt num">${fmt(e.amt)}</div></div>`).join("") || `<div class="row t2">${t("no_entries")}</div>`}</div>
    <div class="spacer"></div><div class="footer"><div class="acts two"><button class="btn btn-gave" data-act="sheet" data-v="entry" data-k="gave">${ic("up",18)}${t("gave")}</button><button class="btn btn-got" data-act="sheet" data-v="entry" data-k="got">${ic("down",18)}${t("got")}</button></div></div></div>`;
}

/* ================================================================== SCAN / IMPORT / REVIEW */
function vScan(){
  const tax = (UI.sample||"tax")==="tax";
  return `<div class="camera"><div class="cam-top"><button class="round" data-act="back" aria-label="${t("close")}">${ic("close",20)}</button><span class="cam-t">${t("scan")}</span><button class="round" aria-label="flash">${ic("flash",20)}</button></div>
    <div class="viewfinder"><div class="corners"><i></i><i></i><i></i><i></i></div>${sampleReceipt(tax)}</div><div class="camhint">${t("camera_hint")}</div>
    <div class="camseg"><button data-act="sample" data-v="tax" aria-pressed="${tax}">${t("sample_tax")}</button><button data-act="sample" data-v="regular" aria-pressed="${!tax}">${t("sample_regular")}</button></div>
    <div class="shutter-row"><button class="cam-side" data-act="pick" data-v="gallery">${ic("image",22)}<span>${t("import")}</span></button><button class="shutter" data-act="capture" aria-label="${t("capture")}"><i></i></button><button class="cam-side" data-act="pick" data-v="camera">${ic("camera",22)}<span>${t("phone_camera")}</span></button></div></div>`;
}
const QR = (()=>{ const n=25; let s=7; const r=()=> (s=(s*16807)%2147483647)/2147483647; let d=""; for(let y=0;y<n;y++)for(let x=0;x<n;x++){ const f=(x<8&&y<8)||(x>16&&y<8)||(x<8&&y>16); if(!f && r()>.52) d+=`M${x} ${y}h1v1h-1z` } [[0,0],[18,0],[0,18]].forEach(([x,y])=>d+=`M${x} ${y}h7v7h-7zM${x+1} ${y+1}v5h5v-5zM${x+2} ${y+2}h3v3h-3z`); return `<svg class="qr" viewBox="0 0 25 25" shape-rendering="crispEdges"><path fill="#111" fill-rule="evenodd" d="${d}"/></svg>` })();
function sampleReceipt(tax){
  return tax ? `<div class="receipt"><div class="rt">AL NAKHEEL STATION</div><div class="rs">محطة النخيل · Riyadh</div><div class="rs">Simplified Tax Invoice · فاتورة ضريبية مبسطة</div>
      <div class="rl"><span>VAT</span><span>300512345600003</span></div><div class="rl"><span>Inv</span><span>NAK-31950</span></div><div class="rl"><span>Date</span><span>2026-11-06 14:20</span></div><hr>
      <div class="rl"><span>Gasoline 91 · 55.05 L</span><span>120.00</span></div><hr><div class="rl"><span>Excl. VAT</span><span>104.35</span></div><div class="rl"><span>VAT 15%</span><span>15.65</span></div><div class="rl" style="font-weight:800"><span>TOTAL SAR</span><span>120.00</span></div>${QR}</div>`
    : `<div class="receipt hand"><div class="rt">AL FAHD WORKSHOP</div><div class="rs">ورشة الفهد</div><div class="rs">Cash invoice · فاتورة نقدية</div><div class="rl"><span>No.</span><span>4471</span></div><div class="rl"><span>Date</span><span>06/11/2026</span></div><hr>
      <div class="rl"><span>Brake pads x2</span><span>170.00</span></div><div class="rl"><span>Oil filter x1</span><span>35.00</span></div><hr><div class="rl" style="font-weight:800"><span>Total</span><span>205.00</span></div><div class="rs" style="margin-top:10px">Thank you</div></div>`;
}
const sampleDraft = tax => tax ? {src:"qr", via:"camera", sup:"nakheel", supName:null, vatNo:"300512345600003", invNo:"NAK-31950", kind:"tax_simplified", cat:"fuel", date:"2026-11-06T11:20:00.000Z", items:[["i_fuel",55.05,2.18,120]], total:120, vat:15.65, low:[]}
  : {src:"ai", via:"camera", sup:"fahd", supName:null, vatNo:null, invNo:"4471", kind:"regular", cat:"parts", date:"2026-11-06T09:00:00.000Z", items:[["i_pads",2,85,170],["i_oilf",1,35,35]], total:205, vat:0, low:["date","items","total"]};
function vReading(){ const st = UI.readSteps || [];
  return `<div class="page center"><div class="fig wide" data-fig="loupe" data-play="1" data-label="${esc(t("reading"))}"></div><div class="h2">${t("reading")}</div>
    <div class="steps">${["st_photo","st_hash","st_qr","st_ai","st_dup"].map((k,i)=>`<div class="${st[i]==="done"?"done":st[i]==="skip"?"skip":""}">${ic(st[i]==="skip"?"info":"ok",18)}<span>${t(k)}</span></div>`).join("")}</div></div>` }
function vReview(){
  const d = UI.draft; if(!d) return vScan();
  const flags = SC.checks(d), crit = flags.some(f=>f.sev==="critical"), a = SC.advOf(SC.me().id);
  const nextNo = a ? SC.nextFolderNo(a.id) : SC.S.seq.folder, nextSeq = a && SC.currentFolder(a.id) ? SC.folderInv(nextNo).length+1 : 1;
  const low = k => d.low?.includes(k) ? "low" : "";
  const banner = d.src==="qr" ? `<div class="banner b-ok">${ic("qr",18)}<span>${t("qr_read")}</span></div>` : d.src==="ai" ? `<div class="banner b-info">${ic("info",18)}<span>${t("ocr_read")}${d.conf?` · ${t("confidence")} <span class="num">${Math.round(d.conf*100)}%</span>`:""}</span></div>` : `<div class="banner b-info">${ic("info",18)}<span>${t(d.aiErr||"manual_entry")}</span></div>`;
  return `<div class="page">${nav(t("review_title"))}${banner}
    <div class="inv-hero">${d.imgUrl?`<img class="thumb-wrap" src="${d.imgUrl}" alt="${esc(t("invoice_photo"))}">`:`<div class="thumb-wrap">${miniReceipt({supName:d.supName, sup:d.sup, total:d.total, kind:d.kind})}</div>`}
      <div class="grow"><div class="t2">${t("will_be_in")}</div><div class="t1 num">${SC.fno(nextNo)} · #${nextSeq}</div><div class="t2">${t("folder_at_payment")}</div></div></div>
    <div class="form glass card">
      <label class="fld"><span>${t("x_kind")}</span><select id="rv-kind" data-change="draft" data-f="kind">${D.KINDS.map(k=>`<option value="${k}" ${k===d.kind?"selected":""}>${t("kind_"+k)}</option>`).join("")}</select></label>
      <label class="fld"><span>${t("supplier")}</span><select id="rv-sup" data-change="draft" data-f="sup"><option value="">${t("other_supplier")}</option>${SC.S.suppliers.map(s=>`<option value="${s.k}" ${s.k===d.sup?"selected":""}>${esc(SC.supNm(s.k))}</option>`).join("")}</select></label>
      ${!d.sup?`<label class="fld"><span>${t("supplier_name")}</span><input id="rv-supname" data-change="draft" data-f="supName" value="${esc(d.supName||"")}"></label>`:""}
      <div class="two"><label class="fld ${low("vat")}"><span>${t("vat_no")}</span><input id="rv-vatno" inputmode="numeric" data-change="draft" data-f="vatNo" value="${esc(d.vatNo||"")}" placeholder="3xxxxxxxxxxxxx3"></label><label class="fld"><span>${t("inv_no")}</span><input id="rv-invno" data-change="draft" data-f="invNo" value="${esc(d.invNo||"")}"></label></div>
      <div class="two"><label class="fld ${low("total")}"><span>${t("total")} (${SC.cur()})</span><input id="rv-total" inputmode="decimal" data-change="draft" data-f="total" value="${d.total||""}"></label><label class="fld"><span>${t("vat_short")}</span><input id="rv-vat" inputmode="decimal" data-change="draft" data-f="vat" value="${d.vat||0}"></label></div>
      <label class="fld"><span>${t("category")}</span><select id="rv-cat" data-change="draft" data-f="cat">${D.CATS.map(k=>`<option value="${k}" ${k===d.cat?"selected":""}>${t("cat_"+k)}</option>`).join("")}</select></label>
      ${d.items?.length?`<div class="items ${low("items")}">${d.items.map(([n,q,p,tt])=>`<div class="r"><span>${esc(nm(n))} <span class="num">× ${q}</span></span><span class="num">${fmt(tt)}</span></div>`).join("")}</div>`:""}
    </div>
    ${flags.length?flags.map(f=>`<div class="banner ${f.sev==="critical"?"b-bad":"b-warn"}">${ic("warn",18)}<span>${t(f.k, f.v)}</span></div>`).join(""):`<div class="banner b-ok">${ic("ok",18)}<span>${t("no_flags")}</span></div>`}
    <div class="kv glass"><div class="r"><span class="k">${t("x_path")}</span><span class="v">${t(pathName({steps:SC.pathFor(d.total||0, d.cat), total:d.total||0}))}</span></div><div class="r"><span class="k">${t("first_approver")}</span><span class="v">${t("role_"+SC.pathFor(d.total||0, d.cat)[0])} · ${esc(SC.uname(SC.me().reportsTo)||"—")}</span></div></div>
    <div class="spacer"></div><div class="footer"><button class="btn btn-accent" data-act="submit" ${crit?"disabled":""}>${crit?t("fix_flags"):t("submit")}</button></div></div>`;
}

/* ================================================================== ME / TEAM / USERS / ROLES / AUDIT */
function vMe(){
  const m = SC.me(), chain = []; let u = m; while(u && u.reportsTo && chain.length<8){ u = SC.user(u.reportsTo); if(u) chain.push(u) }
  const row = (icon, label, target) => `<button class="row" data-act="go" data-v="${target}"><span class="ico">${ic(icon,20)}</span><div class="grow t1">${label}</div>${ic("chev",16,"flip")}</button>`;
  return `<div class="page">${nav(t("tab_me"), false)}
    <div class="profile glass card">${avatar(m.id,"lg")}<div class="grow"><div class="h2">${esc(SC.uname(m.id))}</div><div class="t2">${t("role_"+m.role)} · <span class="num">${m.emp}</span></div><div class="t2">${esc(scopeText(m))}${m.branch?` · ${esc(SC.branchName(m.branch))}`:""}</div><div class="t2">${m.limit?`${t("limit")} <span class="num">${fmt(m.limit)}</span>`:m.limit===null?t("unlimited"):""}</div></div></div>
    <div class="sec-h"><span class="h2">${t("preferences")}</span></div>
    <div class="glass list"><div class="row"><span class="ico">${ic("globe",20)}</span><div class="grow t1">${t("p_lang")}</div>${langSelect("lang-me")}</div>
      <div class="row"><span class="ico">${ic("moon",20)}</span><div class="grow t1">${t("p_theme")}</div><div class="mini-seg">${["system","light","dark"].map(x=>`<button data-act="theme" data-v="${x}" aria-pressed="${x===SC.ui.theme}">${t(x==="system"?"sys":x)}</button>`).join("")}</div></div></div>
    <div class="sec-h"><span class="h2">${t("security")}</span></div>
    <div class="glass list"><button class="row" data-act="go" data-v="changepw"><span class="ico">${ic("key",20)}</span><div class="grow"><div class="t1">${t("change_password")}</div><div class="t2">${m.pwAt?`${t("changed_on")} <span class="num">${SC.dd(m.pwAt)}</span>`:t("pw_company_set")}</div></div>${ic("chev",16,"flip")}</button>
      ${row("history", t("login_history"), "sessions")}</div>
    <div class="sec-h"><span class="h2">${t("my_chain")}</span><button class="link" data-act="go" data-v="team">${t("org_chart")}</button></div>
    <div class="glass list">${chain.length?chain.map(c=>`<button class="row" data-act="go" data-v="user:${c.id}">${avatar(c.id,"sm")}<div class="grow"><div class="t1">${esc(SC.uname(c.id))}</div><div class="t2">${t("role_"+c.role)}</div></div>${ic("chev",16,"flip")}</button>`).join(""):`<div class="row t2">${t("top_of_chain")}</div>`}</div>
    <div class="sec-h"><span class="h2">${t("data")}</span></div>
    <div class="glass list">
      ${m.role!=="admin"?row("folder", t("tab_folders"), "folders"):""}
      ${SC.can("issue_advance")||m.role==="accountant"?row("wallet", t("advances"), "advances"):""}
      ${["finance","accountant","admin"].includes(m.role)?row("box", t("supplies"), "supplies"):""}
      ${m.role==="admin"?row("key", t("roles"), "roles"):""}
      ${row("sheet", t("export_center"), "export")}
      <button class="row" data-act="go" data-v="backup"><span class="ico">${ic("cloud",20)}</span><div class="grow"><div class="t1">${t("backup")}</div><div class="t2">${SC.S.backups.last?`${t("last_backup")} <span class="num">${SC.dt(SC.S.backups.last)}</span>`:t("never_backed")}</div></div>${ic("chev",16,"flip")}</button></div>
    <div class="pad-x stack" style="margin-top:16px"><button class="btn btn-glass" data-act="sheet" data-v="account">${ic("swap",18)}${t("switch_account")}</button><button class="btn btn-neg" data-act="logout">${ic("logout",18)}${t("sign_out")}</button><button class="link center-t" data-act="sheet" data-v="reset">${t("reset_demo")}</button></div>
    <p class="t2 center-t" style="margin-block:16px">${t("about")}</p></div>`;
}
function vSessions(){ const m = SC.me(); return `<div class="page">${nav(t("login_history"))}<div class="glass list">${m.sessions.map((s,k)=>`<div class="row"><span class="ico">${ic(s.via==="google"?"g":"key",20)}</span><div class="grow"><div class="t1">${t(s.device)}${k===0&&SC.S.session?` · <span class="pos">${t("this_session")}</span>`:""}</div><div class="t2">${t("via_"+s.via)} · ${esc(s.place)} · <span class="num">${SC.dt(s.t)}</span></div></div></div>`).join("")}</div></div>` }
const userRow = u => `<button class="row" data-act="go" data-v="user:${u.id}">${avatar(u.id,"sm")}<div class="grow"><div class="t1">${esc(SC.uname(u.id))}</div><div class="t2">${roleLabel(u.role)} · <span class="num">${u.emp||"—"}</span>${u.project?` · ${esc(u.project)}`:u.branch?` · ${esc(SC.branchName(u.branch))}`:""}${u.google?` · ${ic("g",12)}`:""}</div></div>${u.status!=="active"?`<span class="pill p-us-${u.status}">${t("us_"+u.status)}</span>`:""}${ic("chev",16,"flip")}</button>`;
function orgNode(u, depth=0){
  const kids = SC.S.users.filter(x=>x.reportsTo===u.id && x.status!=="pending"), open = UI.open[u.id] ?? depth<1;
  const techs = kids.filter(k=>k.role==="technician"), shown = techs.length>6 ? kids.filter(k=>k.role!=="technician").concat(techs.slice(0,6)) : kids;
  return `<div class="org"><div class="org-n glass">${kids.length?`<button class="org-tg" data-act="toggleorg" data-v="${u.id}" data-o="${open?1:0}" aria-expanded="${open}" aria-label="${t("expand")}">${ic("chev",14,open?"rot90":"flip")}</button>`:`<span class="org-tg"></span>`}
    <button class="org-b" data-act="go" data-v="user:${u.id}">${avatar(u.id,"sm")}<div class="grow"><div class="t1">${esc(SC.uname(u.id))}${u.id===SC.me().id?` <span class="pill p-returned">${t("you")}</span>`:""}</div><div class="t2">${t("role_"+u.role)}${u.project?` · ${esc(u.project)}`:u.branch?` · ${esc(SC.branchName(u.branch))}`:""}</div></div>${kids.length?`<span class="t2 num">${kids.length}</span>`:""}${u.status!=="active"?`<span class="pill p-us-${u.status}">${t("us_"+u.status)}</span>`:""}</button></div>
    ${open && kids.length?`<div class="org-k">${shown.map(k=>orgNode(k, depth+1)).join("")}${techs.length>6?`<button class="org-more t2" data-act="teamof" data-v="technician||${u.id}">${t("and_more",{n:techs.length-6})}</button>`:""}</div>`:""}</div>`;
}
function vTeam(){
  const q = UI.q.trim().toLowerCase();
  const search = `<label class="search glass">${ic("search",18)}<input id="team-q" data-change="q" placeholder="${esc(t("search_users"))}" value="${esc(UI.q)}"></label>`;
  if(q){ const res = SC.S.users.filter(u=>[SC.uname(u.id), u.emp, u.email].join(" ").toLowerCase().includes(q)).slice(0,40); return `<div class="page">${nav(t("org_chart"))}${search}<div class="glass list">${res.map(userRow).join("")}</div><div class="spacer"></div></div>` }
  const roots = SC.S.users.filter(u=>!u.reportsTo && u.status!=="pending");
  return `<div class="page">${nav(t("org_chart"))}<p class="ctx">${t("org_hint_big",{n:SC.S.users.filter(u=>u.status!=="pending").length.toLocaleString("en-US")})}</p>${search}${roots.map(r=>orgNode(r)).join("")}<div class="spacer"></div></div>`;
}
function vTeamOf(){
  const [role, project, mgr] = String(UI.p.id).split("|");
  const list = SC.S.users.filter(u=>u.role===role && (!project || u.project===project) && (!mgr || u.reportsTo===mgr) && u.status!=="pending");
  return `<div class="page">${nav(`${t("role_"+role)} · <span class="num">${list.length}</span>`)}<div class="glass list">${list.slice(0,UI.limit).map(userRow).join("")}</div>${list.length>UI.limit?`<button class="btn btn-glass more" data-act="more">${t("show_more",{n:list.length-UI.limit})}</button>`:""}<div class="spacer"></div></div>`;
}
function vUser(){
  const u = SC.user(UI.p.id); if(!u) return vTeam(); const admin = SC.can("users");
  if(u.status==="pending") return vPending(u);
  const opt = (list, cur) => list.map(([v,l])=>`<option value="${esc(v)}" ${v===(cur||"")?"selected":""}>${esc(l)}</option>`).join("");
  return `<div class="page">${nav(esc(SC.uname(u.id)))}
    <div class="profile glass card">${avatar(u.id,"lg")}<div class="grow"><div class="h2">${esc(SC.uname(u.id))}</div><div class="t2">${roleLabel(u.role)} · <span class="num">${u.emp}</span></div><div class="t2">${esc(scopeText(u))}</div>${u.status!=="active"?`<span class="pill p-us-${u.status}">${t("us_"+u.status)}</span>`:""}</div></div>
    ${admin?`<div class="form glass card">
      <label class="fld"><span>${t("x_role")}</span><select id="ud-role" data-change="uedit" data-f="role">${opt(roleOpts(), u.role)}</select></label>
      <label class="fld"><span>${t("x_branch")}</span><select id="ud-branch" data-change="uedit" data-f="branch">${opt(branchOpts(true), u.branch)}</select></label>
      <label class="fld"><span>${t("project")}</span><select id="ud-project" data-change="uedit" data-f="project">${opt(projectOpts(u.branch), u.project)}</select></label>
      <label class="fld"><span>${t("x_reports_to")}</span><select id="ud-mgr" data-change="uedit" data-f="reportsTo">${opt(managerOpts(u.role, u.project, u.branch), u.reportsTo)}</select></label>
      <label class="fld"><span>${t("x_limit")} (${SC.cur()})</span><input id="ud-limit" inputmode="decimal" data-change="uedit" data-f="limit" value="${u.limit===null?"":u.limit}" placeholder="${esc(t("unlimited"))}"></label>
    </div>`:`<div class="kv glass"><div class="r"><span class="k">${t("x_reports_to")}</span><span class="v">${u.reportsTo?esc(SC.uname(u.reportsTo)):"—"}</span></div><div class="r"><span class="k">${t("x_limit")}</span><span class="v num">${u.limit===null?t("unlimited"):fmt(u.limit)}</span></div></div>`}
    <div class="kv glass"><div class="r"><span class="k">${t("email")}</span><span class="v">${esc(u.email)}</span></div><div class="r"><span class="k">${t("phone")}</span><span class="v num" dir="ltr">${esc(u.phone)}</span></div>
      <div class="r"><span class="k">${t("last_login")}</span><span class="v num">${SC.dt(u.sessions[0]?.t)||"—"}</span></div>
      ${admin?`<div class="r"><span class="k">${t("password")}</span><span class="v">${u.mustChange?t("pw_temp"):u.pwAt?`${t("changed_on")} <span class="num">${SC.dd(u.pwAt)}</span>`:t("pw_company_set")}${u.fails?` · ${t("failed_n",{n:u.fails})}`:""}</span></div>`:""}</div>
    ${admin?`<div class="pad-x stack" style="margin-top:12px">
      <button class="btn btn-accent" data-act="adminreset" data-v="${u.id}">${ic("key",18)}${t(u.status==="locked"?"unlock_reset":"reset_password")}</button>
      ${u.id!==SC.me().id?`<button class="btn ${u.status==="disabled"?"btn-glass":"btn-neg"}" data-act="setstatus" data-v="${u.status==="disabled"?"active":"disabled"}">${ic(u.status==="disabled"?"unlock":"lock",18)}${t(u.status==="disabled"?"enable_account":"disable_account")}</button>`:""}
      </div>`:""}
    <div class="sec-h"><span class="h2">${t("permissions")}</span></div><div class="chips pad-x">${(D.PERMS[u.role]||[]).map(p=>`<span class="chip">${t("perm_"+p)}</span>`).join("")}</div>
    ${u.demo && u.id!==SC.me().id?`<div class="pad-x stack" style="margin-top:16px"><button class="btn btn-glass" data-act="demo" data-v="${u.id}">${ic("swap",18)}${t("sign_in_as",{n:esc(SC.first(u.id))})}</button></div>`:""}
    <div class="spacer"></div></div>`;
}
function vPending(u){
  return `<div class="page">${nav(t("account_request"))}
    <div class="profile glass card">${avatar(u.id,"lg")}<div class="grow"><div class="h2">${esc(SC.uname(u.id))}</div><div class="t2">${esc(u.email)}</div><span class="pill p-us-pending">${t("us_pending")}</span></div></div>
    <div class="kv glass"><div class="r"><span class="k">${t("requested_on")}</span><span class="v num">${SC.dt(u.request?.t)}</span></div><div class="r"><span class="k">${t("wanted_role")}</span><span class="v">${roleLabel(u.request?.wantRole)}</span></div>
      <div class="r"><span class="k">${t("x_branch")}</span><span class="v">${esc(SC.branchName(u.branch))}</span></div><div class="r"><span class="k">${t("phone")}</span><span class="v num" dir="ltr">${esc(u.phone)}</span></div>
      ${u.request?.note?`<div class="r"><span class="k">${t("x_note")}</span><span class="v">${esc(noteText(u.request.note))}</span></div>`:""}</div>
    ${SC.can("approve_accounts")?`<div class="pad-x stack" style="margin-top:12px"><button class="btn btn-primary" data-act="sheet" data-v="approveacct">${ic("ok",18)}${t("approve_account")}</button><button class="btn btn-neg" data-act="rejectacct">${t("reject_account")}</button></div>`:""}
    <div class="spacer"></div></div>`;
}
function vUsers(){
  const tab = segv("users","all"), q = UI.q.trim().toLowerCase(), rf = UI.f.role||"", bf = UI.f.branch||"";
  let list = tab==="pending" ? SC.pendingAccounts() : tab==="locked" ? SC.lockedUsers() : tab==="resets" ? SC.openResets().map(r=>SC.user(r.user)).filter(Boolean) : tab==="disabled" ? SC.S.users.filter(u=>u.status==="disabled") : SC.S.users.filter(u=>u.status!=="pending");
  if(rf) list = list.filter(u=>u.role===rf); if(bf) list = list.filter(u=>u.branch===bf);
  if(q) list = list.filter(u=>[SC.uname(u.id), u.email, u.emp, u.google, u.project].join(" ").toLowerCase().includes(q));
  return `<div class="page">${nav(t("users"), !tabsOf(SC.me()).includes("users"), `<button class="iconbtn glass" data-act="sheet" data-v="adduser" aria-label="${t("add_user")}">${ic("plus",20)}</button>`)}
    <div class="hscroll">${seg("users",[["all",t("all"),SC.S.users.filter(u=>u.status!=="pending").length.toLocaleString("en-US")],["pending",t("us_pending"),SC.pendingAccounts().length],["resets",t("reset_requests"),SC.openResets().length],["locked",t("us_locked"),SC.lockedUsers().length],["disabled",t("us_disabled")]],"all")}</div>
    <label class="search glass">${ic("search",18)}<input id="user-q" data-change="q" placeholder="${esc(t("search_users"))}" value="${esc(UI.q)}"></label>
    <div class="filters"><label class="fsel">${ic("shield",14)}<select data-change="ufilter" data-f="role" aria-label="${t("x_role")}"><option value="">${t("all_roles")}</option>${D.ROLE_ORDER.map(r=>`<option value="${r}" ${r===rf?"selected":""}>${t("role_"+r)}</option>`).join("")}</select></label>
      <label class="fsel">${ic("pin",14)}<select data-change="ufilter" data-f="branch" aria-label="${t("x_branch")}"><option value="">${t("all_branches")}</option>${SC.S.branches.map(b=>`<option value="${b.id}" ${b.id===bf?"selected":""}>${esc(SC.branchName(b.id))}</option>`).join("")}</select></label></div>
    <p class="ctx num">${t("results_n",{n:list.length.toLocaleString("en-US")})}</p>
    ${list.length?`<div class="glass list">${list.slice(0,UI.limit).map(userRow).join("")}</div>${list.length>UI.limit?`<button class="btn btn-glass more" data-act="more">${t("show_more",{n:(list.length-UI.limit).toLocaleString("en-US")})}</button>`:""}`:empty("sieve",t("no_results"))}
    <div class="spacer"></div></div>`;
}
function vRoles(){
  const R = D.ROLE_ORDER;
  return `<div class="page">${nav(t("roles"))}<p class="ctx">${t("roles_hint")}</p>
    <div class="tablewrap glass"><table class="tbl matrix"><thead><tr><th>${t("permissions")}</th>${R.map(r=>`<th><span class="vert">${t("role_"+r)}</span></th>`).join("")}</tr></thead><tbody>
      ${D.ALL_PERMS.map(p=>`<tr><td>${t("perm_"+p)}</td>${R.map(r=>`<td>${(D.PERMS[r]||[]).includes(p)?`<span class="pos">${ic("ok",15)}</span>`:`<span class="t3">·</span>`}</td>`).join("")}</tr>`).join("")}
      <tr class="sep"><td>${t("scope")}</td>${R.map(r=>`<td class="small">${t("scope_"+D.SCOPE[r])}</td>`).join("")}</tr>
      <tr><td>${t("x_limit")}</td>${R.map(r=>`<td class="num small">${D.DEFAULT_LIMIT[r]===null?"∞":D.DEFAULT_LIMIT[r]?SC.fmt0(D.DEFAULT_LIMIT[r]):"—"}</td>`).join("")}</tr>
      <tr><td>${t("headcount")}</td>${R.map(r=>`<td class="num small">${SC.S.users.filter(u=>u.role===r).length}</td>`).join("")}</tr></tbody></table></div>
    <div class="banner b-info">${ic("info",18)}<span>${t("sod_rule")}</span></div><div class="fig wide" data-fig="padlock" data-label="${esc(t("roles"))}"></div><div class="spacer"></div></div>`;
}
const auditRow = a => `<div class="row"><span class="ico">${ic(/login|locked|pw|reset/.test(a.ev)?"key":/export|backup|lock$/.test(a.ev)?"sheet":/role|user|account|status/.test(a.ev)?"users":"history",18)}</span><div class="grow"><div class="t1">${t(a.ev)}</div><div class="t2">${esc(SC.uname(a.by)||"—")} · <span class="num">${SC.dt(a.t)}</span>${a.d?` · <span class="num">${esc(SC.tn(a.d))}</span>`:""}</div></div></div>`;
function vAudit(){ return `<div class="page">${nav(t("audit"), !tabsOf(SC.me()).includes("audit"))}<p class="ctx">${t("audit_hint")}</p><div class="glass list">${SC.S.audit.slice(0,UI.limit*2).map(auditRow).join("")}</div>${SC.S.audit.length>UI.limit*2?`<button class="btn btn-glass more" data-act="more">${t("show_more",{n:SC.S.audit.length-UI.limit*2})}</button>`:""}<div class="spacer"></div></div>` }
function vExport(){
  const m = SC.me(), a = SC.advOf(m.id), f = a && SC.currentFolder(a.id);
  const item = (icon, title, sub, act, v="") => `<button class="row" data-act="${act}" data-v="${v}"><span class="ico">${ic(icon,20)}</span><div class="grow"><div class="t1">${title}</div><div class="t2">${sub}</div></div>${ic("chev",16,"flip")}</button>`;
  return `<div class="page">${nav(t("export_center"))}<p class="ctx">${t(SC.can("export_all")?"export_scope_all":"export_scope_mine")}</p>
    <div class="glass list">${item("sheet", t("x_all_workbook"), t(SC.can("export_all")?"x_all_sub_admin":"x_all_sub"), "xall")}${f?item("folder", t("x_folder_book",{f:SC.fno(f.no)}), t("x_folder_sub"), "xfolder", f.no):""}${a?item("receipt", t("statement_excel"), a.id, "xstatement", a.id):""}</div>
    <div class="banner b-info">${ic("info",18)}<span>${t("download_note")}</span></div><div class="spacer"></div></div>`;
}
function vBackup(){
  const b = SC.S.backups;
  return `<div class="page">${nav(t("backup"))}<div class="fig wide" data-fig="drawer" data-label="${esc(t("backup"))}"></div>
    <div class="kv glass"><div class="r"><span class="k">${t("last_backup")}</span><span class="v num">${b.last?SC.dt(b.last):t("never_backed")}</span></div><div class="r"><span class="k">${t("backup_contents")}</span><span class="v">${t("backup_contents_v",{n:(SC.can("backup_all")||SC.can("export_all")?SC.S.invoices:SC.visibleInvoices()).length})}</span></div></div>
    <div class="glass list"><div class="row"><span class="ico">${ic("cloud",20)}</span><div class="grow"><div class="t1">${t("auto_backup")}</div><div class="t2">${t("auto_backup_sub")}</div></div><button class="switch ${b.auto?"on":""}" role="switch" aria-checked="${b.auto}" data-act="toggleauto" aria-label="${t("auto_backup")}"></button></div></div>
    <div class="pad-x stack" style="margin-top:14px"><button class="btn btn-primary" data-act="backup" ${UI.busy?"disabled":""}>${ic("cloud",18)}${UI.busy==="backup"?t("working"):t("backup_now")}</button>
      <button class="btn btn-glass" data-act="backupphotos" ${UI.busy?"disabled":""}>${ic("image",18)}${UI.busy==="photos"?t("working"):t("export_photos")}</button><button class="btn btn-glass" data-act="pick" data-v="restore">${ic("undo",18)}${t("restore")}</button></div>
    <div class="banner b-info">${ic("info",18)}<span>${t("backup_note")}</span></div><div class="spacer"></div></div>`;
}
const refTarget = r => r ? ({invoice:"invoice:", pr:"pr:", po:"po:", advance:"advance:", folder:"folder:", user:"user:", project:"project:", supplier:"supplier:", pcat:"pexp:", pcust:"pcustody:", paylink:"plink:"}[r.type]||"") + r.id : "";
function vNotifications(){
  const list = SC.myNotifs(), un = list.filter(n=>!n.read).length;
  const refLabel = r => !r ? "" : r.type==="folder" ? SC.fno(r.id) : r.type==="user" ? (SC.user(r.id)?.email||"") : r.type==="project" ? SC.projName(r.id) : r.type==="supplier" ? SC.supNm(r.id) : r.type==="pcat" ? t("pc_"+r.id) : r.id;
  return `<div class="page">${nav(t("notifications"), true, un?`<button class="btn btn-sm btn-glass" data-act="readall">${ic("checks",16)} ${t("mark_all_read")}</button>`:"")}
    ${list.length?`<div class="glass list">${list.slice(0,UI.limit).map(n=>`<button class="row notif ${n.read?"":"unread"}" data-act="opennotif" data-v="${n.id}">${n.by?avatar(n.by,"sm"):`<span class="ico">${ic("bell",18)}</span>`}
      <div class="grow"><div class="t1 wrap">${t(n.k,{who:esc(SC.uname(n.by)||t("system")), amt:n.amt?fmt(n.amt):""})}</div><div class="t2"><span class="num">${esc(refLabel(n.ref))}</span> · ${esc(SC.ago(n.t))}</div></div>${n.read?"":`<span class="udot"></span>`}</button>`).join("")}</div>`:empty("sieve",t("no_notifications"))}<div class="spacer"></div></div>`;
}

/* ================================================================== SHEETS */
function sheet(){
  const s = UI.sheet; if(!s) return "";
  const wrap = (inner, title) => `<div class="scrim${s.shown?"":" fresh"}" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div><div class="h2">${title}</div>${inner}</div></div>`;
  const err = s.err ? `<div class="err" role="alert">${t(s.err)}</div>` : "", i = UI.p.id && SC.inv(UI.p.id), f = s.f || {};
  switch(s.type){
    case "reject": case "return": return wrap(`<textarea id="sh-note" placeholder="${esc(t("reason_ph"))}"></textarea>${err}<div class="two"><button class="btn btn-glass" data-act="close">${t("cancel")}</button><button class="btn ${s.type==="reject"?"btn-neg-solid":"btn-primary"}" data-act="decide" data-v="${s.type}">${t(s.type==="reject"?"reject":"ret")}</button></div>`, t(s.type==="reject"?"reason_title_reject":"reason_title_return"));
    case "withdraw": return wrap(`<p class="sub">${t("withdraw_note")}</p><div class="two"><button class="btn btn-glass" data-act="close">${t("cancel")}</button><button class="btn btn-neg-solid" data-act="dowithdraw">${t("withdraw")}</button></div>`, t("withdraw_q"));
    case "resubmit": return wrap(`<label class="fld"><span>${t("total")} (${SC.cur()})</span><input id="sh-total" inputmode="decimal" value="${i.total}"></label><label class="fld"><span>${t("inv_no")}</span><input id="sh-invno" value="${esc(i.invNo)}"></label>
      <label class="fld"><span>${t("category")}</span><select id="sh-cat">${D.CATS.map(k=>`<option value="${k}" ${k===i.cat?"selected":""}>${t("cat_"+k)}</option>`).join("")}</select></label>
      <textarea id="sh-note" placeholder="${esc(t("resubmit_ph"))}"></textarea>${err}<button class="btn btn-accent" data-act="doresubmit">${t(i.status==="returned"?"resubmit":"save")}</button>`, t(i.status==="returned"?"fix_resubmit":"edit_invoice"));
    case "credit": { const left = SC.r2(i.total - SC.credited(i)); return wrap(`<p class="sub">${t("credit_note_hint",{n:fmt(left)})}</p><label class="fld"><span>${t("amount")} (${SC.cur()})</span><input id="sh-amt" inputmode="decimal" placeholder="0.00"></label>
      <label class="fld"><span>${t("reason")}</span><select id="sh-reason">${["cn_defective","cn_short","cn_price","cn_other"].map(k=>`<option value="${k}">${t(k)}</option>`).join("")}</select></label>${err}<button class="btn btn-primary" data-act="docredit">${t("issue_credit")}</button>`, t("purchase_return")) }
    case "closefolder": return wrap(`<p class="sub">${t("close_sub")}</p><div class="glass list">${["month","settle","except"].map(r=>`<button class="row" data-act="pickreason" data-v="${r}"><div class="grow t1">${t("r_"+r)}</div><span class="radio ${s.reason===r?"on":""}"></span></button>`).join("")}</div>
      <textarea id="sh-note" placeholder="${esc(t("close_note_ph"))}"></textarea>${err}<button class="btn btn-primary" data-act="doclose">${t("close_btn")}</button>`, t("close_title"));
    case "account": { const m = SC.me(); return wrap(`<div class="glass list">${SC.S.users.filter(u=>u.demo).map(u=>`<button class="row" data-act="demo" data-v="${u.id}">${avatar(u.id,"sm")}<div class="grow"><div class="t1">${esc(SC.uname(u.id))}</div><div class="t2">${t("role_"+u.role)}</div></div>${u.id===m?.id?`<span class="pill p-approved">${t("current")}</span>`:""}</button>`).join("")}</div><button class="btn btn-neg" data-act="logout">${ic("logout",18)}${t("sign_out")}</button>`, t("switch_account")) }
    case "newpr": return wrap(`<label class="fld"><span>${t("item")}</span><select id="sh-item">${["i_helmet","i_gloves","i_pads","i_oilf","i_oil","i_cable","i_drill","i_tape","i_paper","i_water"].map(k=>`<option value="${k}">${esc(nm(k))}</option>`).join("")}</select></label><label class="fld"><span>${t("qty")}</span><input id="sh-qty" inputmode="numeric" value="10"></label>${err}<button class="btn btn-accent" data-act="donewpr">${t("send_request")}</button>`, t("request_purchase"));
    case "rejectpr": return wrap(`<textarea id="sh-note" placeholder="${esc(t("reason_ph"))}"></textarea>${err}<button class="btn btn-neg-solid" data-act="dorejectpr">${t("reject_request")}</button>`, t("reject_request"));
    case "receive": case "match": { const p = SC.po(UI.p.id); return wrap(`${s.type==="match"?`<label class="fld"><span>${t("supplier_invoice")}</span><input id="sh-invno" placeholder="${p.sup.slice(0,3).toUpperCase()}-00000"></label>`:""}
      ${p.lines.map((l,k)=>`<label class="fld"><span>${esc(nm(l.item))} · ${t(s.type==="match"?"qty_invoiced":"qty_received")} (${t("m3_po")} ${l.qty})</span><input id="sh-q${k}" inputmode="numeric" value="${s.type==="match"?l.rec:l.qty-l.rec}"></label>`).join("")}${err}
      <button class="btn btn-accent" data-act="${s.type==="match"?"domatch":"doreceive"}">${t(s.type==="match"?"match_invoice":"record_receipt")}</button>`, t(s.type==="match"?"match_invoice":"record_receipt")) }
    case "entry": return wrap(`<input id="sh-amt" class="amount-in" inputmode="decimal" placeholder="0.00" aria-label="${t("amount")}">${err}<button class="btn ${s.k==="gave"?"btn-gave":"btn-got"}" data-act="doentry">${t("save")}</button>`, `${t(s.k)} · ${esc(cname(SC.S.contacts.find(c=>c.id===UI.p.id)))}`);
    case "addcontact": return wrap(`<label class="fld"><span>${t("x_name")}</span><input id="sh-name"></label><label class="fld"><span>${t("phone")} (WhatsApp)</span><input id="sh-phone" inputmode="tel" placeholder="05xxxxxxxx" dir="ltr"></label><div class="mini-seg full">${["customer","supplier_k"].map(k=>`<button data-act="pickkind" data-v="${k}" aria-pressed="${(s.kind||"customer")===k}">${t(k)}</button>`).join("")}</div>${err}<button class="btn btn-primary" data-act="doaddcontact">${t("save")}</button>`, t("add_person"));
    case "reset": return wrap(`<p class="sub">${t("reset_note")}</p><div class="two"><button class="btn btn-glass" data-act="close">${t("cancel")}</button><button class="btn btn-neg-solid" data-act="doreset">${t("reset_demo")}</button></div>`, t("reset_demo"));
    case "forgot": return wrap(s.done ? `<div class="banner b-ok">${ic("ok",18)}<span>${t("forgot_done")}</span></div><button class="btn btn-primary" data-act="close">${t("ok")}</button>`
      : `<p class="sub">${t("forgot_note")}</p>${fld("ident", t("login_id"), 'autocomplete="username"')}${err}<button class="btn btn-primary" data-act="doforgot">${t("send_request")}</button>`, t("forgot_pw"));
    case "requestacct": return wrap(s.done ? `<div class="banner b-ok">${ic("ok",18)}<span>${t("request_done")}</span></div><button class="btn btn-primary" data-act="close">${t("ok")}</button>`
      : `<p class="sub">${t("request_note")}</p>${fld("name", t("full_name"))}${fld("email", t("work_email"), 'inputmode="email"', "email")}${fld("phone", t("phone"), 'inputmode="tel"')}
        ${sel("branch", t("x_branch"), branchOpts(true))}${sel("role", t("wanted_role"), roleOpts(true).filter(([v])=>v!=="admin"))}${fld("note", t("x_note"))}${err}<button class="btn btn-primary" data-act="dorequestacct">${t("send_request")}</button>`, t("request_account"));
    case "adduser": return wrap(`${fld("name", t("name_en"))}${fld("nameAr", t("name_ar"))}${fld("email", t("work_email"), 'inputmode="email"', "email")}${fld("phone", t("phone"), 'inputmode="tel"')}
      ${sel("role", t("x_role"), roleOpts(true), true)}${sel("branch", t("x_branch"), branchOpts(true), true)}${["technician","supervisor","engineer","pm"].includes(f.role)?sel("project", t("project"), projectOpts(f.branch), true):""}
      ${f.role?sel("reportsTo", t("x_reports_to"), managerOpts(f.role, f.project, f.branch)):""}<div class="banner b-info">${ic("info",18)}<span>${t("temp_pw_note")}</span></div>${err}<button class="btn btn-primary" data-act="doadduser">${t("create_account")}</button>`, t("add_user"));
    case "approveacct": return wrap(`${sel("role", t("x_role"), roleOpts(true), true)}${sel("branch", t("x_branch"), branchOpts(true), true)}${["technician","supervisor","engineer","pm"].includes(f.role)?sel("project", t("project"), projectOpts(f.branch), true):""}
      ${f.role?sel("reportsTo", t("x_reports_to"), managerOpts(f.role, f.project, f.branch)):""}<div class="banner b-info">${ic("info",18)}<span>${t("temp_pw_note")}</span></div>${err}<button class="btn btn-primary" data-act="doapproveacct">${t("approve_account")}</button>`, t("approve_account"));
    case "temppw": return wrap(`<div class="banner b-ok">${ic("ok",18)}<span>${t(s.k||"temp_reset",{n:esc(SC.uname(s.user))})}</span></div>
      <div class="kv glass" style="margin:0"><div class="r"><span class="k">${t("login_id")}</span><span class="v">${esc(SC.user(s.user).email)}</span></div><div class="r"><span class="k">${t("x_emp")}</span><span class="v num">${esc(SC.user(s.user).emp)}</span></div></div>
      <div class="temppw"><span class="num" id="temp-pw">${esc(s.temp)}</span><button class="btn btn-sm btn-glass" data-act="copytemp">${ic("copy",16)} ${t("copy")}</button></div>
      <p class="sub small">${t("temp_pw_hint")}</p><button class="btn btn-primary" data-act="close">${t("done")}</button>`, t("temp_password"));
    case "addbranch": return wrap(`${fld("nameAr", t("name_ar"))}${fld("nameEn", t("name_en"))}${fld("code", t("branch_code"), 'maxlength="4" placeholder="QSM"')}${geoPicker()}${err}<button class="btn btn-primary" data-act="doaddbranch">${t("add_branch")}</button>`, t("add_branch"));
    case "addproject": case "editproject": { const edit = s.type==="editproject";
      const pms = [["",t("none")]].concat(SC.S.users.filter(u=>u.role==="pm" && u.status==="active").map(u=>[u.id, `${SC.uname(u.id)} · ${u.project||t("unassigned")}`]));
      return wrap(`${edit?"":fld("nameAr", t("name_ar"))+fld("nameEn", t("name_en"))+sel("branch", t("x_branch"), branchOpts(true), true)+geoPicker()}
        ${fld("budget", `${t("budget")} (${SC.cur()})`, 'inputmode="decimal"')}${sel("pm", t("role_pm"), pms)}<p class="sub small">${t("new_pm_hint")}</p>${err}<button class="btn btn-primary" data-act="${edit?"doeditproject":"doaddproject"}">${t(edit?"save":"add_project")}</button>`, t(edit?"edit_project":"add_project")) }
    case "issueadv": { const q = (f.q||"").toLowerCase(), proj = (UI.screen==="project"||UI.screen==="myproject") ? (UI.p.id || SC.me().project) : null;
      const cand = q.length>=2 || proj ? SC.S.users.filter(u=>u.status==="active" && ["technician","supervisor","engineer","pm","procurement","accountant"].includes(u.role) && (!proj || u.project===proj) && (!q || [SC.uname(u.id), u.emp].join(" ").toLowerCase().includes(q))).slice(0,8) : [];
      const h = f.holder && SC.user(f.holder);
      return wrap(`${h?`<div class="picked glass">${avatar(h.id,"sm")}<div class="grow"><div class="t1">${esc(SC.uname(h.id))}</div><div class="t2">${t("role_"+h.role)} · <span class="num">${h.emp}</span> · ${esc(h.project||SC.branchName(h.branch))}</div></div><button class="link" data-act="pickholder" data-v="">${t("change")}</button></div>${SC.advOf(h.id)?`<div class="banner b-warn">${ic("warn",18)}<span>${t("err_unsettled")}</span></div>`:""}`
        : `${fld("q", t("find_employee"), 'autocomplete="off" data-live="1"')}<div class="glass list picklist">${cand.map(u=>`<button class="row" data-act="pickholder" data-v="${u.id}">${avatar(u.id,"xs")}<div class="grow"><div class="t1">${esc(SC.uname(u.id))}</div><div class="t2">${t("role_"+u.role)} · <span class="num">${u.emp}</span>${SC.advOf(u.id)?` · ${t("has_advance")}`:""}</div></div></button>`).join("") || `<div class="row t2">${t("type_to_search")}</div>`}</div>`}
        ${sel("type", t("advance_type"), D.CUSTODY_TYPES.map(c=>[c, t("ct_"+c)]))}${fld("amount", `${t("amount")} (${SC.cur()})`, 'inputmode="decimal"')}${fld("due", t("settle_due"), "", "date")}${fld("note", t("x_note"))}
        ${err}<button class="btn btn-primary" data-act="doissueadv" ${h && !SC.advOf(h.id)?"":"disabled"}>${t("issue_advance")}</button>`, t("issue_advance")) }
    case "topup": return wrap(`${fld("amount", `${t("amount")} (${SC.cur()})`, 'inputmode="decimal"')}${fld("note", t("x_note"))}${err}<button class="btn btn-accent" data-act="dotopup">${t("topup")}</button>`, t("topup"));
    default: { const x = SC.sheet2?.(s, wrap, err); if(x) return x; break }
    case "addsupplier": return wrap(`${fld("nameAr", t("name_ar"))}${fld("nameEn", t("name_en"))}<div class="two">${fld("vat", t("vat_no"), 'inputmode="numeric" placeholder="3xxxxxxxxxxxxx3"')}${fld("cr", t("x_cr"), 'inputmode="numeric" placeholder="1010xxxxxx"')}</div>
      ${sel("cat", t("category"), D.CATS.map(c=>[c, t("cat_"+c)]))}${geoPicker()}${fld("phone", t("phone"), 'inputmode="tel"')}${err}<button class="btn btn-primary" data-act="doaddsupplier">${t("add_supplier")}</button>`, t("add_supplier"));
  }
  return "";
}

/* ================================================================== RENDER */
const statusbar = (dark) => `<div class="statusbar ${dark?"on-dark":""}"><span>${(()=>{ const d = new Date(Date.now()+3*3600e3); return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}` })()}</span><span class="sb-r"><svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor"/><rect x="23.5" y="4" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".5"/></svg></span></div>`;
function dock(){
  const m = SC.me(), tabs = tabsOf(m);
  const badge = k => k==="approvals" ? SC.inbox().length + SC.poInbox().length : k==="invoices" && m.role==="technician" ? SC.S.invoices.filter(i=>i.by===m.id && i.status==="returned").length : k==="users" ? SC.pendingAccounts().length + SC.openResets().length + SC.lockedUsers().length : 0;
  return `<nav class="dock">${tabs.map(k=>`<button class="tab" data-act="tab" data-v="${k}" ${UI.screen===k?'aria-current="page"':""}>${ic(TAB_ICON[k],22)}<span>${t("tab_"+k)}</span>${badge(k)?`<span class="badge">${badge(k)}</span>`:""}</button>`).join("")}</nav>`;
}
const VIEWS = {login:vLogin, changepw:vChangePw, home:vHome, approvals:vApprovals, decided:vDecided, invoices:vInvoices, invoice:vInvoice, folders:vFolders, folder:vFolder, advances:vAdvances, advance:vAdvance,
  org:vOrg, project:vProject, myproject:vProject, supplies:vSupplies, pr:vPR, po:vPO, supplier:vSupplier, ledger:vLedger, person:vPerson, scan:vScan, reading:vReading, review:vReview,
  me:vMe, sessions:vSessions, team:vTeam, teamof:vTeamOf, user:vUser, users:vUsers, roles:vRoles, audit:vAudit, export:vExport, backup:vBackup, notifications:vNotifications};
let toastTimer = null;
function render(keepScroll){
  const L = SC.lang(); document.documentElement.lang = L.code; document.documentElement.dir = L.dir;
  const r = document.documentElement; if(SC.ui.theme==="system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", SC.ui.theme);
  const me = SC.me();
  if(!me && !["login","support"].includes(UI.screen)) UI.screen = "login";
  if(me && me.mustChange && UI.screen!=="changepw") UI.screen = "changepw";
  clearFigs(); sparkN = 0;
  const phone = document.getElementById("phone"), prev = phone.querySelector(".view"), y = prev ? prev.scrollTop : 0;
  const active = document.activeElement, focusId = active && phone.contains(active) && active.id && /INPUT|TEXTAREA/.test(active.tagName) ? active.id : null, caret = focusId ? active.selectionStart : null;
  const tabbed = me && !me.mustChange && tabsOf(me).includes(UI.screen), dark = UI.screen==="scan";
  phone.className = "phone" + (dark ? " dark-screen" : "") + (UI.screen==="login" ? " is-login" : "") + (tabbed ? " has-dock" : "");
  phone.innerHTML = `${statusbar(dark)}<main class="view${!keepScroll && UI.navDir ? " enter-"+UI.navDir : ""}" id="view">${SC.DEMO_MODE?`<div class="banner b-warn">${t("demo_only_warning")}</div>`:""}${(VIEWS[UI.screen]||vHome)()}</main>${tabbed?dock():""}${sheet()}${UI.toast?`<div class="toast ${UI.toast.bad?"bad":""}" role="status">${ic(UI.toast.bad?"warn":"ok",18)}<span>${UI.toast.msg}</span></div>`:""}`;
  if(keepScroll) phone.querySelector(".view").scrollTop = y;
  if(!keepScroll) UI.navDir = null;
  if(UI.sheet) UI.sheet.shown = true;
  if(focusId){ const n = document.getElementById(focusId); if(n){ n.focus(); try{ if(caret!=null) n.setSelectionRange(caret, caret) }catch{} } }
  mountFigs(phone);
  if(UI.screen==="invoice"){ const i = SC.inv(UI.p.id); if(i?.img) SC.imgGet(i.id).then(b=>{ const el = document.getElementById("inv-img"); if(b && el) el.src = URL.createObjectURL(b) }) }
  const f = phone.querySelector(".sheet input, .sheet textarea"); if(f && UI.sheet && !UI.sheet.focused){ UI.sheet.focused = true; setTimeout(()=>f.focus(), 30) }
  renderPanel(); SC.afterRender?.(); SC.store.set("lang", SC.ui.lang); SC.store.set("theme", SC.ui.theme);
}
SC.render = render;
function toast(msg, bad){ UI.toast = {msg, bad}; clearTimeout(toastTimer); toastTimer = setTimeout(()=>{ UI.toast = null; document.querySelector(".toast")?.remove() }, 3600) }
function go(target, p, push=true){
  let screen = target, id; const k = String(target).indexOf(":"); if(k>0){ screen = target.slice(0,k); id = target.slice(k+1); if(screen==="folder") id = +id }
  if(push && (UI.screen!==screen || UI.p.id!==id)) UI.stack.push({screen:UI.screen, p:UI.p, q:UI.q, limit:UI.limit});
  UI.navDir = push ? "fwd" : "tab";
  UI.screen = screen; UI.p = p || (id!==undefined ? {id} : {}); UI.sheet = null; UI.q = ""; UI.limit = 40; UI.sel = null;
  render(); document.getElementById("view")?.scrollTo(0,0);
}
function back(){ UI.navDir = "back"; const s = UI.stack.pop(); if(s){ UI.screen = s.screen; UI.p = s.p; UI.q = s.q||""; UI.limit = s.limit||40 } else UI.screen = "home"; UI.sheet = null; UI.sel = null; render() }
function tab(k){ UI.stack = []; UI.q = ""; UI.sel = null; UI.f = {}; go(k, {}, false) }
const commit = () => SC.save();
const openSheet = (type, f={}, extra={}) => { UI.sheet = {type, f, ...extra}; render(true) };

/* ------------------------------------------------------------------ side panel */
function renderPanel(){
  const el = document.getElementById("panel"); if(!el) return;
  if(!el.dataset.ready){ el.innerHTML = `<div id="pn-top"></div><div class="panel-fig" data-fig="exploded" data-play="1" data-label="Smart Cash"></div><div id="pn-ctrl"></div>`; el.dataset.ready = "1"; mountFigs(el, true) }
  const m = SC.me();
  el.querySelector("#pn-top").innerHTML = `<div class="brand"><span class="brand-mark">${ic("wallet",18)}</span>${t("app_name")}</div><p>${t("panel_desc")}</p>`;
  el.querySelector("#pn-ctrl").innerHTML = `<div><div class="plabel">${t("p_lang")}</div>${langSelect("lang-panel")}</div>
    <div><div class="plabel">${t("p_theme")}</div><div class="chips">${["system","light","dark"].map(x=>`<button class="chip" data-act="theme" data-v="${x}" aria-pressed="${x===SC.ui.theme}">${t(x==="system"?"sys":x)}</button>`).join("")}</div></div>
    ${SC.DEMO_MODE?`<div><div class="plabel">${t("demo_accounts")}</div><div class="pn-users">${SC.S.users.filter(u=>u.demo).map(u=>`<button class="pn-u ${m?.id===u.id?"on":""}" data-act="demo" data-v="${u.id}">${avatar(u.id,"xs")}<span>${t("role_"+u.role)}</span><span class="t2">${esc(SC.first(u.id))}</span></button>`).join("")}</div></div>`:`<p class="sub">${t("prototype_warning")}</p>`}
    <div class="pn-row">${SC.DEMO_MODE?`<button class="chip" data-act="sheet" data-v="reset">${t("reset_demo")}</button>`:""}${m?`<button class="chip" data-act="logout">${t("sign_out")}</button>`:""}</div>`;
}

/* ------------------------------------------------------------------ file inputs */
function pickFile(kind){ const el = document.getElementById(kind==="restore" ? "file-restore" : kind==="camera" ? "file-camera" : "file-gallery"); el.value = ""; el.click() }
async function importInvoice(file){
  if(!SC.can("scan")){ toast(t("err_not_allowed"), true); render(true); return }
  if(!SC.advOf(SC.me().id)){ toast(t("err_no_advance"), true); render(true); return }
  UI.readSteps = []; go("reading");
  const step = (k, v="done") => { UI.readSteps[k] = v; render(true) };
  const isImg = /^image\//.test(file.type); let blob = file, canvas = null;
  if(isImg){ const s = await SC.shrink(file); if(s){ blob = s.blob; canvas = s.canvas } }
  step(0); const hash = await SC.sha256(file); step(1);
  const d = {src:"manual", via:"import", sup:null, supName:"", vatNo:null, invNo:"", kind:"regular", cat:"other", date:SC.now(), items:[], total:0, vat:0, low:["total"], hash, img:blob, imgUrl: isImg ? URL.createObjectURL(blob) : null};
  const qr = canvas ? SC.readQR(canvas) : null;
  if(qr){ const known = SC.S.suppliers.find(s=>s.vat===qr.vatNo); Object.assign(d, {src:"qr", supName: known ? null : qr.supName, sup: known?.k || null, vatNo:qr.vatNo, date:qr.date, total:SC.r2(qr.total), vat:SC.r2(qr.vat), kind:"tax_simplified", cat: known?.cats[0] || "other", low:["items"]}); step(2) } else step(2, "skip");
  const ai = isImg ? await SC.aiAvailable() : null;
  if(ai){ const r = await SC.aiRead(ai, blob);
    if(r){ const known = SC.S.suppliers.find(s=>s.vat && s.vat===(qr?.vatNo||r.vatNo));
      if(qr) Object.assign(d, {items:r.items, invNo:r.invNo||d.invNo, cat:r.cat||d.cat, low:[]});
      else Object.assign(d, {src:"ai", sup: known?.k||null, supName: known ? null : r.supName, vatNo:r.vatNo, invNo:r.invNo, date:r.date, kind:r.kind, cat:r.cat, items:r.items, total:r.total, vat:r.vat, conf:r.conf, low: r.conf<0.8 ? ["total","items","vat"] : []});
      step(3) } else { d.aiErr = qr ? null : "ai_failed"; step(3,"skip") } }
  else { if(!qr) d.aiErr = "ai_unavailable"; step(3,"skip") }
  step(4); setTimeout(()=>{ UI.draft = d; go("review", {}, false) }, 400);
}

/* ------------------------------------------------------------------ events */
const doLogin = () => { UI.loginErr = null; UI.stack = []; UI.sheet = null; UI.q = ""; UI.seg = {}; UI.f = {}; UI.sel = null; commit();
  const m = SC.me(); go(m.mustChange ? "changepw" : "home", {}, false); if(!m.mustChange) toast(t("signed_in_as",{n:esc(SC.uname(m.id)), r:t("role_"+m.role)})) };
document.addEventListener("click", async (e)=>{
  const b = e.target.closest("[data-act]"); if(!b) return;
  const a = b.dataset.act, v = b.dataset.v;
  if(a==="scrim" && e.target!==b) return;
  const s = UI.sheet, m = SC.me(), F = s?.f || {};
  const val = id => document.getElementById(id)?.value ?? "";
  const num = x => { const n = Number(String(x??"").replace(/,/g,"").trim()); return isFinite(n) ? n : NaN };
  const err = k => { UI.sheet.err = k; render(true) };
  switch(a){
    case "noop": break;
    case "lang": SC.ui.lang = v; UI.toast = null; render(true); break;
    case "theme": SC.ui.theme = v; render(true); break;
    case "back": back(); break;
    case "tab": tab(v); break;
    case "go": go(v); break;
    case "more": UI.limit += 40; render(true); break;
    case "invfilter": UI.seg.inv = v; if(tabsOf(m).includes("invoices")) tab("invoices"); else go("invoices"); break;
    case "useg": UI.seg.users = v; tab("users"); break;
    case "seg": UI.seg[b.dataset.k] = v; if(b.dataset.k==="orgb" && UI.screen==="org") UI.seg.org = "projects"; UI.limit = 40; render(true); break;
    case "teamof": go("teamof", {id:v}); break;
    case "toggleorg": UI.open[v] = b.dataset.o!=="1"; render(true); break;
    case "sheet": { const pre = {};
      if(v==="editproject"){ const p = SC.project(UI.p.id || m.project); Object.assign(pre, {budget:p.budget, pm:p.pm||""}) }
      if(v==="addproject"||v==="addbranch"||v==="addsupplier") Object.assign(pre, {region:"riyadh"});
      if(v==="approveacct"){ const u = SC.user(UI.p.id); Object.assign(pre, {role:u.request?.wantRole||"", branch:u.branch||""}) }
      if(v==="issueadv") pre.type = "technician";
      openSheet(v, pre, {k:b.dataset.k}); break }
    case "close": case "scrim": UI.sheet = null; render(true); break;
    case "demo": if(!SC.DEMO_MODE || !SC.login(v, "password")){ toast(t("err_demo_only"), true); break } doLogin(); break;
    case "logout": SC.logout(); UI.sheet = null; UI.stack = []; go("login", {}, false); break;
    case "otp-logout": {
      const token = UI.otp?.token, base = authApiBase();
      UI.otp = {};
      if(token && base){
        try{
          const response = await fetch(`${base}/api/auth/logout`, {method:"POST", headers:{Authorization:`Bearer ${token}`}});
          if(!response.ok) throw new Error("logout_failed");
        }
        catch{ UI.otp.error = "otp_logout_warning" }
      }
      render(true); break;
    }
    case "doreset": SC.reset(); UI.sheet = null; UI.stack = []; UI.seg = {}; go(SC.me()?"home":"login", {}, false); toast(t("reset_done")); break;
    /* accounts */
    case "doforgot": { if(!String(F.ident||"").trim()){ err("err_login_id"); break } SC.requestReset(F.ident); UI.sheet.done = true; UI.sheet.err = null; render(true); break }
    case "dorequestacct": { if(!F.branch){ err("err_branch"); break } const r = SC.requestAccount({name:(F.name||"").trim(), email:F.email, phone:F.phone, branch:F.branch, role:F.role, note:F.note}); if(r){ err(r); break } UI.sheet.done = true; UI.sheet.err = null; render(true); break }
    case "doadduser": { if(!F.role){ err("err_role"); break } if(!F.branch && !["finance","procurement","admin"].includes(F.role)){ err("err_branch"); break }
      const r = await SC.createUser({name:(F.name||"").trim(), nameAr:(F.nameAr||"").trim(), email:F.email, phone:F.phone, role:F.role, branch:F.branch, project:F.project, reportsTo:F.reportsTo}); if(r.err){ err(r.err); break }
      commit(); UI.sheet = {type:"temppw", temp:r.temp, user:r.user.id, k:"temp_created"}; render(true); break }
    case "doapproveacct": { if(!F.role){ err("err_role"); break } const id = UI.p.id; const r = await SC.approveAccount(id, {role:F.role, branch:F.branch, project:F.project, reportsTo:F.reportsTo}); if(r.err){ err(r.err); break } commit(); UI.sheet = {type:"temppw", temp:r.temp, user:id, k:"temp_approved"}; render(true); break }
    case "rejectacct": { const r = SC.rejectAccount(UI.p.id); if(r){ toast(t(r), true); render(true); break } toast(t("toast_rejected_acct")); back(); break }
    case "adminreset": { const r = await SC.adminReset(v); if(r.err){ toast(t(r.err), true); render(true); break } commit(); UI.sheet = {type:"temppw", temp:r.temp, user:v, k:"temp_reset"}; render(true); break }
    case "setstatus": { const r = SC.setStatus(UI.p.id, v); if(r){ toast(t(r), true); render(true); break } commit(); toast(t("toast_saved")); render(true); break }
    case "copytemp": { try{ await navigator.clipboard.writeText(s.temp); toast(t("copied")) }catch{ const r = document.createRange(); r.selectNodeContents(document.getElementById("temp-pw")); getSelection().removeAllRanges(); getSelection().addRange(r); toast(t("copy_manual")) } render(true); break }
    /* scanning */
    case "sample": UI.sample = v; render(); break;
    case "capture": { if(!SC.advOf(m.id)){ toast(t("err_no_advance"), true); render(true); break } UI.readSteps = []; go("reading");
      const tax = (UI.sample||"tax")==="tax";
      [0,1,2,3,4].forEach(k=>setTimeout(()=>{ if(UI.screen!=="reading") return; UI.readSteps[k] = (k===2 && !tax) || (k===3 && tax) ? "skip" : "done"; render(true) }, 300+k*320));
      setTimeout(()=>{ if(UI.screen!=="reading") return; UI.draft = sampleDraft(tax); go("review", {}, false) }, 2000); break }
    case "pick": pickFile(v); break;
    case "submit": { const d = UI.draft; if(SC.checks(d).some(f=>f.sev==="critical")) break;
      const r = SC.newInvoice(d); if(r.err){ toast(t(r.err), true); render(true); break }
      if(d.img) await SC.imgPut(r.inv.id, d.img);
      commit(); UI.draft = null; UI.stack = [{screen:"home", p:{}}]; go("invoice:"+r.inv.id, null, false);
      toast(r.closed ? t("toast_folder_full",{f:SC.fno(r.closed)}) : t("toast_sent",{f:SC.fno(r.inv.folder), n:r.inv.seq})); break }
    /* workflow */
    case "approve": { const i = SC.inv(UI.p.id), r = SC.approve(i); if(r){ toast(t(r), true); render(true); break } commit(); toast(i.status==="approved" ? t("toast_final") : t("toast_approved",{r:t("role_"+i.steps[i.idx])})); back(); break }
    case "bulkmode": if(UI.screen!=="approvals"){ tab("approvals") } UI.sel = UI.sel ? null : new Set(); render(true); break;
    case "togglesel": UI.sel.has(v) ? UI.sel.delete(v) : UI.sel.add(v); render(true); break;
    case "selall": { const ib = SC.inbox(); UI.sel = UI.sel.size===ib.length ? new Set() : new Set(ib.map(i=>i.id)); render(true); break }
    case "bulkapprove": { const r = SC.bulkApprove([...UI.sel]); commit(); UI.sel = null; toast(r.fail ? t("bulk_partial",{ok:r.ok, fail:r.fail}) : t("bulk_done",{n:r.ok}), !!r.fail); render(); break }
    case "decide": { const n = val("sh-note").trim(); if(!n){ err("reason_needed"); break } const i = SC.inv(UI.p.id); const r = v==="reject" ? SC.reject(i, n) : SC.returnInv(i, n); if(r){ err(r); break } commit(); UI.sheet = null; toast(t(v==="reject"?"toast_rejected":"toast_returned")); back(); break }
    case "dowithdraw": { const r = SC.withdraw(SC.inv(UI.p.id)); if(r){ err(r); break } commit(); UI.sheet = null; toast(t("toast_withdrawn")); render(true); break }
    case "doresubmit": { const tot = num(val("sh-total")); if(!(tot>0)){ err("enter_amount"); break } const i = SC.inv(UI.p.id), was = i.status; const r = SC.resubmit(i, {total:SC.r2(tot), cat:val("sh-cat"), invNo:val("sh-invno").trim(), note:val("sh-note").trim()}); if(r){ err(r); break } commit(); UI.sheet = null; toast(t(was==="returned"?"toast_resubmitted":"toast_saved")); render(true); break }
    case "docredit": { const r = SC.credit(SC.inv(UI.p.id), SC.r2(num(val("sh-amt"))), val("sh-reason")); if(r){ err(r); break } commit(); UI.sheet = null; toast(t("toast_credit")); render(true); break }
    case "comment": { const r = SC.comment(v, UI.p.id, val("cm-text")); if(r){ toast(t(r), true); render(true); break } commit(); toast(t("toast_comment")); render(true); break }
    /* folders & money */
    case "pickreason": UI.sheet.reason = v; UI.sheet.err = null; render(true); break;
    case "doclose": { if(!s.reason){ err("reason_needed"); break } const f = SC.folder(UI.p.id); SC.closeFolder(f, s.reason, val("sh-note").trim()); commit(); UI.sheet = null; toast(t("toast_closed",{f:SC.fno(f.no)})); render(true); break }
    case "sign": SC.signFolder(SC.folder(+v)); commit(); toast(t("toast_signed")); render(true); break;
    case "xfolder": { const r = await SC.exportFolder(+v); commit(); toast(r?t(r):t("toast_exported"), !!r); render(true); break }
    case "xjournal": { const r = await SC.exportJournal(+v); commit(); toast(r?t(r):t("toast_journal"), !!r); render(true); break }
    case "xall": { const r = await SC.exportAll(); commit(); toast(r?t(r):t("toast_exported"), !!r); render(true); break }
    case "xstatement": { const r = await SC.exportStatement(v); commit(); toast(r?t(r):t("toast_exported"), !!r); render(true); break }
    case "xperson": { const c = SC.S.contacts.find(x=>x.id===UI.p.id); let run = 0; const rows = c.entries.map(e=>{ run = SC.r2(run + (e.dir==="gave"?e.amt:-e.amt)); return {[t("date")]:SC.dt(e.t), [t("x_desc")]:t(e.dir), [t("amount")]:e.amt, [t("bal")]:run} });
      const r = await SC.xlsx(`${cname(c)}.xlsx`, [[t("x_statement"), rows]]); toast(r?t(r):t("toast_exported"), !!r); render(true); break }
    case "pickholder": UI.sheet.f.holder = v || null; if(!v) UI.sheet.f.q = ""; UI.sheet.err = null; render(true); break;
    case "doissueadv": { const r = SC.issueAdvance({holder:F.holder, type:F.type, amount:SC.r2(num(F.amount)), due:F.due, note:F.note}); if(r.err){ err(r.err); break } commit(); UI.sheet = null; toast(t("toast_advance",{id:r.adv.id})); go("advance:"+r.adv.id); break }
    case "dotopup": { const r = SC.topUp(UI.p.id, SC.r2(num(F.amount)), F.note); if(r){ err(r); break } commit(); UI.sheet = null; toast(t("toast_topup")); render(true); break }
    case "doaddbranch": { const r = SC.addBranch({nameAr:F.nameAr, nameEn:F.nameEn, code:F.code, gov:F.gov}); if(r){ err(r); break } commit(); UI.sheet = null; UI.seg.org = "branches"; toast(t("toast_branch")); render(true); break }
    case "doaddproject": { const r = SC.addProject({nameAr:F.nameAr, nameEn:F.nameEn, branch:F.branch, gov:F.gov, pm:F.pm, budget:num(F.budget)}); if(r.err){ err(r.err); break } commit(); UI.sheet = null; toast(t("toast_project",{id:r.project.id})); go("project:"+r.project.id); break }
    case "doeditproject": { const r = SC.updateProject(UI.p.id || m.project, {budget:num(F.budget), pm:F.pm}); if(r){ err(r); break } commit(); UI.sheet = null; toast(t("toast_saved")); render(true); break }
    case "doaddsupplier": { const r = SC.addSupplier({nameAr:F.nameAr, nameEn:F.nameEn, vat:F.vat, cr:F.cr, cat:F.cat||"fuel", gov:F.gov, phone:F.phone}); if(r.err){ err(r.err); break } commit(); UI.sheet = null; toast(t("toast_supplier")); go("supplier:"+r.supplier.k); break }
    /* backup */
    case "backup": case "backupphotos": { UI.busy = a==="backup" ? "backup" : "photos"; render(true); const r = await SC.backup(a==="backupphotos"); UI.busy = null; commit(); toast(r?t(r):t("toast_backup"), !!r); render(true); break }
    case "toggleauto": SC.S.backups.auto = !SC.S.backups.auto; commit(); render(true); break;
    /* procurement */
    case "donewpr": { const q = Math.round(num(val("sh-qty"))); if(!(q>0)){ err("enter_amount"); break } const pr = SC.newPR(val("sh-item"), q); commit(); UI.sheet = null; UI.seg.sup = "pr"; go("pr:"+pr.id); toast(t("toast_pr",{id:pr.id})); break }
    case "dorejectpr": { const n = val("sh-note").trim(); if(!n){ err("reason_needed"); break } const r = SC.rejectPR(SC.pr(UI.p.id), n); if(r){ err(r); break } commit(); UI.sheet = null; toast(t("toast_pr_rejected")); render(true); break }
    case "createpo": { const po = SC.createPO(SC.pr(UI.p.id), v); commit(); go("po:"+po.id, null, false); toast(t(po.status==="pending"?"toast_po_pending":"toast_po",{id:po.id})); break }
    case "approvepo": SC.approvePO(SC.po(UI.p.id)); commit(); toast(t("toast_po_approved")); render(true); break;
    case "doreceive": { const p = SC.po(UI.p.id); SC.receivePO(p, p.lines.map((_,k)=>Math.max(0,Math.round(num(val("sh-q"+k))||0)))); commit(); UI.sheet = null; toast(t("toast_received")); render(true); break }
    case "domatch": { const p = SC.po(UI.p.id), no = val("sh-invno").trim(); if(!no){ err("err_inv_no"); break } SC.matchPO(p, no, p.lines.map((_,k)=>Math.max(0,Math.round(num(val("sh-q"+k))||0)))); commit(); UI.sheet = null; toast(t(p.status==="matched"?"toast_matched":"toast_mismatch"), p.status!=="matched"); render(true); break }
    /* ledger */
    case "doentry": { const amt = num(val("sh-amt")); if(!(amt>0)){ err("enter_amount"); break } SC.S.contacts.find(c=>c.id===UI.p.id).entries.push({dir:s.k, amt:SC.r2(amt), t:SC.now()}); commit(); UI.sheet = null; render(true); break }
    case "remind": toast(t("err_no_phone"), true); render(true); break;
    case "wasent": SC.audit("au_wa_link", v); commit(); break;
    case "convert": { const c = SC.S.contacts.find(x=>x.id===UI.p.id); c.kind = c.kind==="customer"?"supplier":"customer"; commit(); toast(t("toast_converted")); render(true); break }
    case "pickkind": UI.sheet.kind = v; render(true); break;
    case "doaddcontact": { const n = val("sh-name").trim(); if(!n){ err("err_name"); break } SC.S.contacts.push({id:"c"+Date.now().toString(36), name:n, phone:val("sh-phone").trim(), kind:(s.kind||"customer")==="customer"?"customer":"supplier", owner:m.id, entries:[]}); commit(); UI.sheet = null; render(true); break }
    /* notifications */
    case "opennotif": { const n = SC.S.notifs.find(x=>x.id===v); if(n){ n.read = true; commit(); const tg = refTarget(n.ref); if(tg) go(tg); else render(true) } break }
    case "readall": SC.markAllRead(); commit(); render(true); break;
  }
});
document.addEventListener("input", e=>{
  const el = e.target;
  if(el.matches('[data-change="q"]')){ UI.q = el.value; UI.limit = 40; render(true); return }
  if(el.dataset.bind && UI.sheet){ (UI.sheet.f ||= {})[el.dataset.bind] = el.value; if(el.dataset.live) render(true) }
});
document.addEventListener("change", e=>{
  const el = e.target;
  if(el.dataset.bind && UI.sheet){ UI.sheet.f[el.dataset.bind] = el.value;
    if(el.dataset.bind==="region") UI.sheet.f.gov = "";
    if(el.dataset.bind==="branch"){ UI.sheet.f.project = ""; UI.sheet.f.reportsTo = ""; const b = SC.branch(el.value); if(b && UI.sheet.type==="addproject"){ UI.sheet.f.region = b.region; UI.sheet.f.gov = b.gov } }
    if(el.dataset.bind==="role"||el.dataset.bind==="project") UI.sheet.f.reportsTo = "";
    if(el.dataset.rerender) render(true); return }
  const c = el.closest("[data-change]"); if(!c) return; const k = c.dataset.change;
  if(k==="lang"){ SC.ui.lang = c.value; UI.toast = null; render(true); return }
  if(k==="ufilter"){ UI.f[c.dataset.f] = c.value; UI.limit = 40; render(true); return }
  if(k==="draft"){ const d = UI.draft, f = c.dataset.f; let v = c.value;
    if(f==="total"||f==="vat") v = SC.r2(Number(String(v).replace(/,/g,""))||0); if(f==="vatNo") v = v.replace(/\s/g,"") || null;
    d[f] = v; d.low = (d.low||[]).filter(x=>x!==f && !(f==="vatNo"&&x==="vat"));
    if(f==="kind" && !d.kind.startsWith("tax") && d.kind!=="purchase") d.vat = 0; if(f==="kind" && d.kind.startsWith("tax") && !d.vat) d.vat = D.vatOf(d.total, d.kind);
    if(f==="total" && d.kind.startsWith("tax")) d.vat = D.vatOf(d.total, d.kind);
    if(f==="sup"){ const sp = SC.sup(v); d.sup = v||null; if(sp){ d.vatNo = sp.vat; d.cat = sp.cats[0]; d.supName = null } }
    render(true); return }
  if(k==="uedit"){ const u = SC.user(UI.p.id), f = c.dataset.f; let v = c.value;
    if(f==="limit") v = v==="" ? null : SC.r2(Number(v)||0); if(["reportsTo","project","branch"].includes(f)) v = v || null;
    if(f==="reportsTo" && v){ let x = SC.user(v); while(x){ if(x.id===u.id){ toast(t("err_cycle"), true); render(true); return } x = SC.user(x.reportsTo) } }
    const before = u[f]; u[f] = v; if(f==="role") u.limit = D.DEFAULT_LIMIT[v] ?? 0; if(f==="branch") u.project = null; if(f==="project"&&v) u.branch = SC.project(v).branch;
    SC.audit("au_role", `${u.emp} · ${f}: ${before??"—"} → ${v??"—"}`); commit(); toast(t("toast_saved")); render(true); return }
});
document.addEventListener("submit", async e=>{
  const f = e.target.closest("[data-form]"); if(!f) return; e.preventDefault();
  if(f.dataset.form==="otp-request"){
    const emailInput = document.getElementById("otp-email"), email = emailInput.value.trim().toLowerCase(), base = authApiBase();
    if(!emailInput.checkValidity()){ UI.otp = {email, error:"otp_invalid_email"}; render(true); return }
    UI.busy = "otp-request"; UI.otp = {email}; render(true);
    if(!base){ UI.busy = null; UI.otp.error = "otp_configure"; render(true); return }
    try{
      const response = await fetch(`${base}/api/auth/request-code`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email})});
      if(!response.ok) throw new Error("request_failed");
      UI.otp = {email, requested:true, notice:"otp_request_sent"};
    }catch{ UI.otp = {email, error:"otp_unavailable"} }
    UI.busy = null; render(true); return;
  }
  if(f.dataset.form==="otp-verify"){
    const email = UI.otp?.email, code = document.getElementById("otp-code").value.trim(), base = authApiBase();
    if(!email || !base){ UI.otp.error = "otp_configure"; render(true); return }
    if(!/^\d{6}$/.test(code)){ UI.otp.error = "otp_invalid_code"; render(true); return }
    UI.busy = "otp-verify"; UI.otp.error = null; render(true);
    let accessToken = "";
    try{
      const response = await fetch(`${base}/api/auth/verify-code`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email, code})});
      if(!response.ok) throw new Error("invalid_code");
      const result = await response.json();
      accessToken = result.accessToken;
      const sessionResponse = await fetch(`${base}/api/auth/me`, {headers:{Authorization:`Bearer ${accessToken}`}});
      if(!sessionResponse.ok) throw new Error("invalid_code");
      const session = await sessionResponse.json();
      UI.otp = {email, token:accessToken, user:session.user};
    }catch(error){
      if(accessToken){
        try{ await fetch(`${base}/api/auth/logout`, {method:"POST", headers:{Authorization:`Bearer ${accessToken}`}}) }
        catch{ UI.otp.logoutFailed = true }
      }
      UI.otp.error = UI.otp.logoutFailed ? "otp_logout_warning" : error instanceof Error && error.message==="invalid_code" ? "otp_invalid" : "otp_unavailable";
    }
    UI.busy = null; render(true); return;
  }
  if(f.dataset.form==="login"){ UI.loginU = document.getElementById("login-u").value; const pw = document.getElementById("login-p").value; UI.busy = "login"; render(true);
    const r = await SC.passwordLogin(UI.loginU, pw); UI.busy = null;
    if(r && r!=="must_change"){ UI.loginErr = r; render(true); return } doLogin(); return }
  if(f.dataset.form==="changepw"){ const r = await SC.changePassword(document.getElementById("pw-old")?.value, document.getElementById("pw-new").value, document.getElementById("pw-conf").value);
    if(r){ UI.pwErr = r; render(true); return } UI.pwErr = null; UI.stack = []; go("home", {}, false); toast(t("toast_pw_changed")); return }
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && UI.sheet){ UI.sheet = null; render(true) } if(e.key==="Enter" && e.target.id==="cm-text"){ e.preventDefault(); document.querySelector('[data-act="comment"]')?.click() } });
["file-gallery","file-camera"].forEach(id=>document.getElementById(id)?.addEventListener("change", e=>{ const f = e.target.files?.[0]; if(f) importInvoice(f) }));
document.getElementById("file-restore")?.addEventListener("change", async e=>{ const f = e.target.files?.[0]; if(!f) return; const r = await SC.restore(f); toast(r?t(r):t("toast_restored"), !!r); UI.stack = []; go(SC.me()?"home":"login", {}, false) });

SC.h = {P, TAB_ICON, heroTech, heroApprover, ic, nav, money, pill, avatar, bubble, empty, seg, segv, spark, ring, fld, sel, invRow, langSelect, homeHeader, actionCenter, activity, toast, go, back, tab, openSheet, commit, today, TABS, wpad, budgetCard};
SC.VIEWS = VIEWS;
SC.boot = render;
})();
