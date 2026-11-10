/* Smart Cash prototype — v0.7: per-person reminder scheduler + shareable payment card (individuals plan). Original implementation. */
(function(){
const SC = window.SC, H = SC.h, V = SC.VIEWS, UI = SC.UI, t = SC.t, esc = SC.esc, fmt = SC.fmt, ic = H.ic;
Object.assign(SCI18N.en,{rm_title:"Reminder",rm_set:"Schedule a reminder",rm_none:"No reminder set",rm_due:"Reminder on {d}",rm_date:"Reminder date",rm_clear:"Clear reminder",rm_send:"Send reminder on WhatsApp",rm_saved:"Reminder saved",rm_in:"In {n} days",rm_msg:"Friendly reminder: a balance of {a} {c} is due. Thank you.",card_share:"Share my payment details",card_hint:"Sends your bank details on WhatsApp so people can pay you directly. Smart Cash never holds the money."});
Object.assign(SCI18N.ar,{rm_title:"التذكير",rm_set:"برمجة تذكير",rm_none:"لا يوجد تذكير",rm_due:"التذكير في {d}",rm_date:"تاريخ التذكير",rm_clear:"إلغاء التذكير",rm_send:"إرسال التذكير عبر واتساب",rm_saved:"تم حفظ التذكير",rm_in:"بعد {n} أيام",rm_msg:"تذكير ودّي: يوجد رصيد مستحق {a} {c}. شكرًا لك.",card_share:"مشاركة بيانات الدفع الخاصة بي",card_hint:"يرسل بياناتك البنكية عبر واتساب ليدفع لك الناس مباشرة. سمارت كاش لا يحتفظ بالمال أبدًا."});
const addDays = n => { const d = new Date(Date.now()+n*864e5); return d.toISOString().slice(0,10) };
const contact = () => SC.S.contacts.find(x=>x.id===UI.p.id);
const bal = c => SC.r2(c.entries.reduce((s,e)=>s+(e.dir==="gave"?e.amt:-e.amt),0));
const basePerson = V.person;
V.person = () => { let h = basePerson(); const c = contact(); if(!c) return h;
  const b = bal(c), msg = t("rm_msg",{a:fmt(Math.abs(b)),c:SC.cur()});
  const card = `<div class="glass wpad rm-card"><div class="kv-row"><b>${ic("clock",18)} ${t("rm_title")}</b><span class="t2 num">${c.remind?t("rm_due",{d:c.remind}):t("rm_none")}</span></div>
   <div class="rm-acts"><button class="chip" data-act="sheet" data-v="remind">${t("rm_set")}</button>${c.remind?`<button class="chip" data-act="rmclear">${t("rm_clear")}</button>`:""}${b>0?`<a class="chip" target="_blank" rel="noopener" href="${esc(SC.waShare(c.phone,msg))}">${ic("wa",14)} ${t("rm_send")}</a>`:""}</div></div>`;
  const i = h.lastIndexOf('<div class="spacer">'); return i>=0 ? h.slice(0,i)+card+h.slice(i) : h };
const baseMe = V.me;
V.me = () => { let h = baseMe(); if(!SC.P()) return h; const ps = SC.payset(), holder = Array.isArray(ps.holder)?(SC.ui.lang==="ar"?ps.holder[0]:ps.holder[1]):ps.holder;
  const txt = `${t("app_name")}\n${holder||""}\n${ps.bank?SC.nm("bk_"+ps.bank)+"\n":""}IBAN: ${ps.iban||"—"}${ps.stc?"\nSTC Pay: "+ps.stc:""}`;
  const row = `<div class="glass list wpad"><a class="row" target="_blank" rel="noopener" href="${esc(SC.waShare("",txt))}"><span class="ico wa-ic">${ic("wa",20)}</span><div class="grow"><div class="t1">${t("card_share")}</div><div class="t2">${t("card_hint")}</div></div></a></div>`;
  const i = h.lastIndexOf('<div class="spacer">'); return i>=0 ? h.slice(0,i)+row+h.slice(i) : h };
const prev = SC.sheet2;
SC.sheet2 = (s, wrap, err) => { if(s.type!=="remind") return prev(s, wrap, err); const f = s.f || {};
  if(f.date===undefined){ f.date = contact()?.remind || addDays(3); s.f = f }
  return wrap(`${H.fld("date", t("rm_date"), 'dir="ltr"', "date")}<div class="calc-v">${[1,3,7,14,30].map(n=>`<button class="chip" data-act="rmpick" data-v="${n}">${t("rm_in",{n})}</button>`).join("")}</div>${err}<button class="btn btn-accent" data-act="dorm">${t("save")}</button>`, t("rm_set")) };
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if(!b) return; const a = b.dataset.act;
  if(a==="rmpick"){ UI.sheet.f.date = addDays(+b.dataset.v); SC.render(true) }
  else if(a==="dorm"){ const c = contact(), d = UI.sheet.f.date; if(!c||!d) return; c.remind = d; SC.save(); UI.sheet = null; H.toast(t("rm_saved")); SC.render(true) }
  else if(a==="rmclear"){ const c = contact(); if(c){ delete c.remind; SC.save(); SC.render(true) } } }, true);
})();
