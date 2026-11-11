/* Smart Cash prototype — v0.7: app shell (phone / tablet / desktop), real-data mode (clear sample data), PWA registration. */
(function(){
const SC = window.SC, H = SC.h, V = SC.VIEWS, UI = SC.UI, t = SC.t, esc = SC.esc, ic = H.ic;
Object.assign(SCI18N.en,{lv_title:"Your data",lv_sample:"Sample data is loaded",lv_live:"Local demo data",lv_clear:"Clear sample data",lv_clear_hint:"Removes sample invoices, folders, advances, contacts, links, savings and notes. This prototype must not store real data.",lv_confirm:"Yes, clear sample data",lv_done:"Sample data cleared.",lv_restore:"Restore sample data",lv_name:"My name",lv_name_save:"Name saved",au_clear_samples:"Sample data cleared",lv_install:"Install the app",lv_install_hint:"On your phone or computer: open the browser menu and choose Install app / Add to Home Screen."});
Object.assign(SCI18N.ar,{lv_title:"بياناتك",lv_sample:"البيانات التجريبية محمّلة",lv_live:"بيانات تجريبية محلية",lv_clear:"مسح البيانات التجريبية",lv_clear_hint:"يحذف الفواتير والحوافظ والعهد والروابط والادخار والملاحظات التجريبية. لا تستخدم هذا النموذج لتخزين بيانات حقيقية.",lv_confirm:"نعم، امسح البيانات التجريبية",lv_done:"تم مسح البيانات التجريبية.",lv_restore:"استعادة البيانات التجريبية",lv_name:"اسمي",lv_name_save:"تم حفظ الاسم",au_clear_samples:"مسح البيانات التجريبية",lv_install:"ثبّت التطبيق",lv_install_hint:"على الجوال أو الكمبيوتر: افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»."});

SC.clearSamples = () => { if(!SC.DEMO_MODE) return; const S = SC.S;
  ["advances","folders","invoices","prs","pos","contacts","suppliers","notifs","requests","paylinks","waOutbox"].forEach(k=>{ if(Array.isArray(S[k])) S[k] = [] });
  S.audit = [];
  if(S.personal){ const p = S.personal; p.expenses = []; p.custodies = []; p.savings = []; p.cash = []; for(const k in (p.budgets||{})) p.budgets[k] = 0 }
  S.mode = "live"; SC.audit("au_clear_samples"); SC.save() };

const baseMe = V.me;
V.me = () => { let h = baseMe(); const live = SC.S.mode==="live", p = SC.P();
  const nm = p ? `<button class="row" data-act="sheet" data-v="myname"><span class="ico">${ic("user",20)}</span><div class="grow"><div class="t1">${t("lv_name")}</div><div class="t2">${esc(SC.first?SC.first(SC.me().id):"")}</div></div></button>` : "";
  const blk = `<div class="glass list wpad"><div class="row"><span class="ico ${live?"wa-ic":""}">${ic("shield",20)}</span><div class="grow"><div class="t1">${t("lv_title")}</div><div class="t2">${t(live?"lv_live":"lv_sample")}</div></div></div>${nm}
    ${live?`<button class="row" data-act="sheet" data-v="reset"><span class="ico">${ic("history",20)}</span><div class="grow"><div class="t1">${t("lv_restore")}</div></div></button>`
          :`<button class="row" data-act="sheet" data-v="clearconfirm"><span class="ico">${ic("checks",20)}</span><div class="grow"><div class="t1">${t("lv_clear")}</div></div></button>`}
    <div class="row"><span class="ico">${ic("phone",20)}</span><div class="grow"><div class="t1">${t("lv_install")}</div><div class="t2">${t("lv_install_hint")}</div></div></div></div>`;
  const i = h.lastIndexOf('<div class="spacer">'); return i>=0 ? h.slice(0,i)+blk+h.slice(i) : h };
const prev = SC.sheet2;
SC.sheet2 = (s, wrap, err) => {
  if(s.type==="clearconfirm") return wrap(`<p class="sub">${t("lv_clear_hint")}</p><button class="btn btn-neg-solid" data-act="doclear">${t("lv_confirm")}</button>`, t("lv_clear"));
  if(s.type==="myname"){ const f = s.f || {}; if(f.name===undefined){ f.name = SC.first(SC.me().id); s.f = f } return wrap(`${H.fld("name", t("lv_name"))}${err}<button class="btn btn-primary" data-act="donamesave">${t("save")}</button>`, t("lv_name")) }
  return prev(s, wrap, err) };
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if(!b) return; const a = b.dataset.act;
  if(a==="doclear"){ SC.clearSamples(); UI.sheet = null; UI.stack = []; H.toast(t("lv_done")); UI.screen = "home"; SC.render() }
  else if(a==="donamesave"){ const n = (UI.sheet.f.name||"").trim(); if(!n){ UI.sheet.err = "enter_name"; SC.render(true); return } SC.me().name = [n,n]; SC.save(); UI.sheet = null; H.toast(t("lv_name_save")); SC.render(true) } }, true);

/* app shell: full-screen on phones, centred column when installed on tablet/desktop */
const mq = window.matchMedia ? window.matchMedia("(max-width:760px)") : null, sa = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
const apply = () => document.documentElement.classList.toggle("app", !!((mq && mq.matches) || (sa && sa.matches) || /[?&]app=1/.test(location.search)));
apply(); mq && mq.addEventListener && mq.addEventListener("change", apply); sa && sa.addEventListener && sa.addEventListener("change", apply);
if("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
