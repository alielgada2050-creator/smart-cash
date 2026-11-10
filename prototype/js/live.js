/* Smart Cash prototype — v0.7: app shell (phone / tablet / desktop), real-data mode (clear sample data), PWA registration. */
(function(){
const SC = window.SC, H = SC.h, V = SC.VIEWS, UI = SC.UI, t = SC.t, esc = SC.esc, ic = H.ic;
Object.assign(SCI18N.en,{lv_title:"Your data",lv_sample:"Sample data is loaded",lv_live:"Live mode: only your own data",lv_clear:"Clear sample data",lv_clear_hint:"Removes all sample invoices, folders, advances, contacts, links, savings and notes. Accounts, roles and settings stay. You can restore the samples anytime from Reset.",lv_confirm:"Yes, clear sample data",lv_done:"Sample data cleared. You can start with your own data.",lv_restore:"Restore sample data",lv_name:"My name",lv_name_save:"Name saved",au_clear_samples:"Sample data cleared",lv_start:"Start with my own data",lv_start_hint:"Clears the sample data and signs you in so you can enter real entries.",lv_install:"Install the app",lv_install_hint:"On your phone or computer: open the browser menu and choose Install app / Add to Home Screen."});
Object.assign(SCI18N.ar,{lv_title:"بياناتك",lv_sample:"البيانات التجريبية محمّلة",lv_live:"الوضع الحقيقي: بياناتك أنت فقط",lv_clear:"مسح البيانات التجريبية",lv_clear_hint:"يحذف كل الفواتير والحوافظ والعهد وجهات الاتصال والروابط والادخار والملاحظات التجريبية. تبقى الحسابات والأدوار والإعدادات. يمكنك استعادة التجريبي في أي وقت من «إعادة».",lv_confirm:"نعم، امسح البيانات التجريبية",lv_done:"تم مسح البيانات التجريبية. ابدأ ببياناتك.",lv_restore:"استعادة البيانات التجريبية",lv_name:"اسمي",lv_name_save:"تم حفظ الاسم",au_clear_samples:"مسح البيانات التجريبية",lv_start:"ابدأ ببياناتي أنا",lv_start_hint:"يمسح البيانات التجريبية ويدخلك لتبدأ بتسجيل بياناتك الحقيقية.",lv_install:"ثبّت التطبيق",lv_install_hint:"على الجوال أو الكمبيوتر: افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»."});

SC.clearSamples = () => { const S = SC.S;
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
const baseLogin = V.login;
V.login = () => { let h = baseLogin(); const btn = `<button class="btn btn-accent" data-act="startlive" style="margin:10px 18px 24px;width:calc(100% - 36px)">${t("lv_start")}</button><p class="t2 center-t" style="margin:-14px 18px 24px">${t("lv_start_hint")}</p>`;
  const i = h.lastIndexOf('</div>'); return i>=0 ? h.slice(0,i)+btn+h.slice(i) : h+btn };
const prev = SC.sheet2;
SC.sheet2 = (s, wrap, err) => {
  if(s.type==="clearconfirm") return wrap(`<p class="sub">${t("lv_clear_hint")}</p><button class="btn btn-neg-solid" data-act="doclear">${t("lv_confirm")}</button>`, t("lv_clear"));
  if(s.type==="myname"){ const f = s.f || {}; if(f.name===undefined){ f.name = SC.first(SC.me().id); s.f = f } return wrap(`${H.fld("name", t("lv_name"))}${err}<button class="btn btn-primary" data-act="donamesave">${t("save")}</button>`, t("lv_name")) }
  return prev(s, wrap, err) };
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if(!b) return; const a = b.dataset.act;
  if(a==="startlive"){ const U = SC.S.users, u = U.find(x=>x.role==="admin")||U.find(x=>x.role==="owner")||U[0]; if(!u) return; SC.clearSamples(); SC.login(u.id,"password"); SC.save(); UI.sheet = null; UI.stack = []; UI.screen = "home"; SC.render(); H.toast(t("lv_done")) }
  else if(a==="doclear"){ SC.clearSamples(); UI.sheet = null; UI.stack = []; H.toast(t("lv_done")); UI.screen = "home"; SC.render() }
  else if(a==="donamesave"){ const n = (UI.sheet.f.name||"").trim(); if(!n){ UI.sheet.err = "enter_name"; SC.render(true); return } SC.me().name = [n,n]; SC.save(); UI.sheet = null; H.toast(t("lv_name_save")); SC.render(true) } }, true);

/* app shell: full-screen on phones, centred column when installed on tablet/desktop */
const mq = window.matchMedia ? window.matchMedia("(max-width:760px)") : null, sa = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
const apply = () => document.documentElement.classList.toggle("app", !!((mq && mq.matches) || (sa && sa.matches) || /[?&]app=1/.test(location.search)));
apply(); mq && mq.addEventListener && mq.addEventListener("change", apply); sa && sa.addEventListener && sa.addEventListener("change", apply);
if("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
