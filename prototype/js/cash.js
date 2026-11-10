/* Smart Cash prototype — v0.7 individuals plan: cash book (income / expense), inspired by the common "cash book" pattern. Original implementation. */
(function(){
const SC = window.SC, H = SC.h, V = SC.VIEWS, UI = SC.UI, t = SC.t, esc = SC.esc, fmt = SC.fmt, ic = H.ic;
Object.assign(SCI18N.en,{cb_title:"Cash book",cb_in:"Income",cb_out:"Expense",cb_bal:"Balance",cb_in_m:"Income this month",cb_out_m:"Spent this month",cb_empty:"No entries yet. Tap Income or Expense below.",cb_note:"Note (optional)",cb_add_in:"Add income",cb_add_out:"Add expense",cb_report:"Share monthly report",cb_share:"Share",cb_saved:"Entry saved",cb_deleted:"Entry deleted",cb_del:"Delete",cb_amt_err:"Enter a valid amount",cb_rep_title:"Cash book report",cb_tour:"Quick tour"});
Object.assign(SCI18N.ar,{cb_title:"دفتر النقدية",cb_in:"دخل",cb_out:"مصروف",cb_bal:"الرصيد",cb_in_m:"دخل هذا الشهر",cb_out_m:"مصروف هذا الشهر",cb_empty:"لا توجد حركات بعد. اضغط دخل أو مصروف بالأسفل.",cb_note:"ملاحظة (اختياري)",cb_add_in:"إضافة دخل",cb_add_out:"إضافة مصروف",cb_report:"مشاركة تقرير الشهر",cb_share:"مشاركة",cb_saved:"تم حفظ الحركة",cb_deleted:"تم حذف الحركة",cb_del:"حذف",cb_amt_err:"أدخل مبلغًا صحيحًا",cb_rep_title:"تقرير دفتر النقدية",cb_tour:"جولة تعريفية"});
Object.assign(H.P,{minus:'<path d="M5 12h14"/>',trash:'<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',down:'<path d="M12 5v14M6 13l6 6 6-6"/>',up:'<path d="M12 19V5M6 11l6-6 6 6"/>',wa:'<path d="M4 20l1.4-4.2A8 8 0 1 1 8.3 18.7z"/><path d="M9 9c0 3 3 6 6 6l1.2-1.6-2-1-1 .6c-.8-.4-1.6-1.2-2-2l.6-1-1-2z"/>'});
const day = (m,d) => new Date(Date.UTC(2026,m-1,d,9)).toISOString();
const cash = () => { const p = SC.P(); if(!p.cash) p.cash = [
  {id:"CB-1",dir:"in",amt:9500,note:"الراتب",t:day(11,1)},{id:"CB-2",dir:"out",amt:620,note:"بقالة",t:day(11,3)},{id:"CB-3",dir:"out",amt:180,note:"وقود",t:day(11,5)},{id:"CB-4",dir:"in",amt:750,note:"عمل حر",t:day(11,7)}]; return p.cash };
const sum = (a,d) => SC.r2(a.filter(x=>x.dir===d).reduce((s,x)=>s+x.amt,0));
const ym = iso => String(iso).slice(0,7);
function report(){ const c = cash(), cur = ym(new Date().toISOString()), m = c.filter(x=>ym(x.t)===cur);
  return `${t("cb_rep_title")} — ${cur}\n${t("cb_in")}: ${fmt(sum(m,"in"))} ${SC.cur()}\n${t("cb_out")}: ${fmt(sum(m,"out"))} ${SC.cur()}\n${t("cb_bal")}: ${fmt(sum(c,"in")-sum(c,"out"))} ${SC.cur()}\n— ${t("app_name")}` }
V.cash = () => { if(!SC.P()) return V.home();
  const c = cash().slice().sort((a,b)=>new Date(b.t)-new Date(a.t)), bal = SC.r2(sum(c,"in")-sum(c,"out")), cur = ym(new Date().toISOString()), m = c.filter(x=>ym(x.t)===cur);
  return `<div class="page">${H.nav(t("cb_title"), true, `<a class="iconbtn glass" target="_blank" rel="noopener" href="${esc(SC.waShare("",report()))}" aria-label="${t("cb_report")}">${ic("wa",20)}</a>`)}
   <div class="hero static"><div class="hero-top"><span class="hero-l">${t("cb_bal")}</span></div><div class="hero-big num">${fmt(bal)}<span class="cur">${SC.cur()}</span></div>
    <div class="hero-stats"><div><span>${t("cb_in_m")}</span><b class="num">${SC.fmt0(sum(m,"in"))}</b></div><div><span>${t("cb_out_m")}</span><b class="num">${SC.fmt0(sum(m,"out"))}</b></div></div></div>
   ${c.length ? `<div class="glass list">${c.map(x=>`<div class="row"><span class="ico ${x.dir==="out"?"neg":""}">${ic(x.dir==="in"?"down":"up",18)}</span><div class="grow"><div class="t1">${esc(x.note||t(x.dir==="in"?"cb_in":"cb_out"))}</div><div class="t2 num">${SC.dt(x.t)}</div></div><b class="num ${x.dir==="in"?"pos":"neg"}">${x.dir==="in"?"+":"−"}${fmt(x.amt)}</b>
     <a class="iconbtn" target="_blank" rel="noopener" href="${esc(SC.waShare("",`${t(x.dir==="in"?"cb_in":"cb_out")}: ${fmt(x.amt)} ${SC.cur()}${x.note?" · "+x.note:""}\n${SC.dt(x.t)}`))}" aria-label="${t("cb_share")}">${ic("wa",16)}</a><button class="iconbtn" data-act="cbdel" data-v="${x.id}" aria-label="${t("cb_del")}">${ic("trash",16)}</button></div>`).join("")}</div>` : H.empty("wallet", t("cb_empty"))}
   <div class="spacer"></div><div class="footer cb-bar"><button class="btn cb-in" data-act="sheet" data-v="cbadd:in">${ic("plus",18)}${t("cb_in")}</button><button class="btn cb-out" data-act="sheet" data-v="cbadd:out">${ic("minus",18)}${t("cb_out")}</button></div></div>`;
};
const baseHome = V.home;
V.home = () => { let h = baseHome(); if(SC.P() && !h.includes('data-v="cash"')) h = h.replace(/(<div class="bubbles">[\s\S]*?)(<\/div>)/, `$1${H.bubble("wallet",t("cb_title"),"go","cash")}$2`); return h };
const prev = SC.sheet2;
SC.sheet2 = (s, wrap, err) => { if(s.type!=="cbadd") return prev(s, wrap, err); const f = s.f || {}, d = s.dir || "in";
  return wrap(`<label class="fld"><span>${t("amount")} (${SC.cur()})</span><input id="f-amt" data-bind="amt" class="amount-in" inputmode="decimal" placeholder="0.00" value="${esc(f.amt||"")}"></label>${H.fld("note", t("cb_note"))}${err}<button class="btn ${d==="in"?"btn-accent":"cb-out"}" data-act="docb" data-v="${d}">${t("save")}</button>`, t(d==="in"?"cb_add_in":"cb_add_out")) };
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if(!b) return; const a = b.dataset.act, v = b.dataset.v;
  if(a==="sheet" && String(v).startsWith("cbadd:")){ e.stopImmediatePropagation(); UI.sheet = {type:"cbadd", dir:v.slice(6), f:{}}; SC.render(true); return }
  if(a==="docb"){ const F = UI.sheet.f, n = SC.isExpr(F.amt) ? SC.calc(F.amt) : Number(SC.normDigits(F.amt||"")); if(!(n>0)){ UI.sheet.err = "cb_amt_err"; SC.render(true); return }
    cash().push({id:"CB-"+Date.now(), dir:v, amt:SC.r2(n), note:(F.note||"").trim(), t:new Date().toISOString()}); SC.save(); UI.sheet = null; H.toast(t("cb_saved")); SC.render(true) }
  if(a==="cbdel"){ const c = cash(), i = c.findIndex(x=>x.id===v); if(i>=0){ c.splice(i,1); SC.save(); H.toast(t("cb_deleted")); SC.render(true) } }
}, true);
SC.render(true);
})();
