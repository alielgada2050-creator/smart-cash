/* Smart Cash prototype — v0.7 intro slides (5). Original artwork, no third-party branding. ar/en written by hand; other languages fall back to English. */
(function(){
const SC = window.SC;
const TX = {
 ar:{skip:"تخطي",next:"التالي",start:"ابدأ الآن",replay:"جولة تعريفية",
  s:[
   {h:"كل <em>مصروفاتك</em> في مكان واحد",p:"سجّل دخلك ومصروفك بثوانٍ، واعرف رصيدك الآن وكم يمكنك صرفه يوميًا بأمان."},
   {h:"فواتير <em>تُقرأ</em> بالذكاء الاصطناعي",p:"صوّر الفاتورة فيستخرج التطبيق المورد والمبلغ والضريبة، وتُحفظ في حافظة مرتبة."},
   {h:"دفتر <em>أعطيت وأخذت</em> لعملائك",p:"تابع الديون، وبرمج تذكيرًا لكل عميل، وأرسل كشف الحساب وروابط الدفع عبر واتساب."},
   {h:"ادّخر لأهدافك <em>بذكاء</em>",p:"حدّد هدفًا ومبلغًا شهريًا، وتابع تقدّمك بحلقة واضحة وتوقعات واقعية."},
   {h:"<em>أمان</em> وتقارير جاهزة",p:"تصدير يدوي للتقارير فقط. هذه معاينة محلية بلا نسخ احتياطي تلقائي أو مزامنة بين الأجهزة."}]},
 en:{skip:"Skip",next:"Next",start:"Get started",replay:"Quick tour",
  s:[
   {h:"All your <em>spending</em> in one place",p:"Log income and expenses in seconds, see your balance now and how much you can safely spend each day."},
   {h:"Invoices <em>read</em> by AI",p:"Snap a bill and the app picks out the supplier, amount and VAT, then files it in a tidy folder."},
   {h:"A <em>gave &amp; got</em> book for your people",p:"Track who owes what, schedule a reminder per person, and send statements and payment links on WhatsApp."},
   {h:"Save for your goals, <em>smartly</em>",p:"Set a target and a monthly amount, then follow progress with a clear ring and realistic forecasts."},
   {h:"<em>Prototype</em>, with reports on demand",p:"Manual exports only. This local preview has no automatic backup or cross-device sync."}]}
};
const ART = [
 '<rect x="40" y="70" width="140" height="96" rx="18" fill="var(--ia)"/><rect x="40" y="70" width="140" height="30" rx="18" fill="#000" opacity=".18"/><circle cx="150" cy="118" r="16" fill="#fff"/><path d="M62 122h44M62 140h28" stroke="#fff" stroke-width="6" stroke-linecap="round"/><rect x="110" y="40" width="96" height="62" rx="14" fill="#06C167"/><path d="M128 78l14-14 12 10 20-22" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 '<rect x="62" y="34" width="96" height="136" rx="14" fill="#fff" stroke="var(--ia)" stroke-width="5"/><path d="M80 66h60M80 86h60M80 106h36" stroke="var(--ia)" stroke-width="6" stroke-linecap="round" opacity=".5"/><rect x="78" y="128" width="64" height="24" rx="8" fill="var(--ia)"/><path d="M170 52l6 12 12 6-12 6-6 12-6-12-12-6 12-6z" fill="#06C167"/><path d="M40 150l4 8 8 4-8 4-4 8-4-8-8-4 8-4z" fill="var(--ia)"/>',
 '<circle cx="78" cy="84" r="26" fill="var(--ia)"/><circle cx="148" cy="104" r="26" fill="#06C167"/><path d="M46 156c4-24 52-24 64 0M116 176c4-24 52-24 64 0" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" opacity=".55"/><path d="M104 62h40M104 62l8-8M104 62l8 8" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>',
 '<circle cx="110" cy="102" r="62" fill="none" stroke="currentColor" stroke-width="16" opacity=".12"/><path d="M110 40a62 62 0 0 1 56 88" fill="none" stroke="var(--ia)" stroke-width="16" stroke-linecap="round"/><path d="M110 40a62 62 0 0 0-60 80" fill="none" stroke="#06C167" stroke-width="16" stroke-linecap="round"/><path d="M96 104l10 10 20-24" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 '<path d="M110 30l64 24v44c0 40-28 66-64 80-36-14-64-40-64-80V54z" fill="var(--ia)"/><path d="M110 30l64 24v44c0 40-28 66-64 80z" fill="#000" opacity=".16"/><rect x="88" y="94" width="44" height="34" rx="8" fill="#fff"/><path d="M96 94v-8a14 14 0 0 1 28 0v8" fill="none" stroke="#fff" stroke-width="6"/>'
];
const css = `
.intro{position:absolute; inset:0; z-index:90; display:flex; flex-direction:column; color:var(--text,#111); --ia:var(--accent,#276EF1); background:linear-gradient(165deg,#EAF2FF 0%,#fff 55%); animation:introIn .35s var(--ease-out,ease-out)}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]) .intro{background:linear-gradient(165deg,#10213f 0%,#000 60%); color:#fff} }
:root[data-theme="dark"] .intro{background:linear-gradient(165deg,#10213f 0%,#000 60%); color:#fff}
:root[data-theme="light"] .intro{color:#111}
@keyframes introIn{from{opacity:0}to{opacity:1}}
.intro-top{display:flex; justify-content:space-between; align-items:center; padding:max(14px,env(safe-area-inset-top)) 18px 0}
.intro-brand{font-weight:800; letter-spacing:.2px} .intro-skip{padding:8px 14px; border-radius:999px; font-weight:700; background:rgba(127,127,127,.15); color:inherit}
.intro-track{flex:1; display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; overscroll-behavior-x:contain}
.intro-track::-webkit-scrollbar{display:none}
.intro-s{flex:0 0 100%; scroll-snap-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:8px 26px; text-align:center}
.intro-art{width:min(76%,260px); aspect-ratio:11/10; position:relative}
.intro-art::before{content:""; position:absolute; inset:6% 10%; border-radius:50%; background:var(--ia); opacity:.14; filter:blur(2px)}
.intro-art svg{position:relative; width:100%; height:100%; animation:introFloat 5s ease-in-out infinite}
@keyframes introFloat{50%{transform:translateY(-8px)}}
.intro-s h2{font-size:27px; line-height:1.3; font-weight:800; margin:0; text-wrap:balance}
.intro-s h2 em{font-style:normal; color:var(--ia)}
.intro-s p{margin:0; font-size:15px; line-height:1.7; opacity:.72; max-width:32ch}
.intro-bot{display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 22px max(22px,env(safe-area-inset-bottom))}
.intro-dots{display:flex; gap:6px} .intro-dots i{width:8px; height:8px; border-radius:99px; background:currentColor; opacity:.2; transition:all .25s}
.intro-dots i.on{width:24px; background:var(--ia); opacity:1}
.intro-go{min-width:132px; padding:14px 22px; border-radius:999px; background:var(--ia); color:#fff; font-weight:800; font-size:16px}
@media (prefers-reduced-motion:reduce){ .intro,.intro-art svg{animation:none} }`;
let el = null;
function close(){ try{ localStorage.setItem("sc2.intro","1") }catch(e){} if(el){ el.remove(); el = null } }
SC.showIntro = function(){
  if(!SC.DEMO_MODE || el) return;
  const lang = SC.ui && SC.ui.lang, L = TX[lang] || TX.en, rtl = ["ar","ur","fa"].includes(lang), n = L.s.length;
  if(!document.getElementById("intro-css")){ const st = document.createElement("style"); st.id = "intro-css"; st.textContent = css; document.head.appendChild(st) }
  el = document.createElement("div"); el.className = "intro"; el.dir = rtl ? "rtl" : "ltr"; el.setAttribute("role","dialog");
  el.innerHTML = `<div class="intro-top"><span class="intro-brand">${SC.t("app_name")}</span><button class="intro-skip" data-i="skip">${L.skip}</button></div>
   <div class="intro-track">${L.s.map((s,i)=>`<section class="intro-s"><div class="intro-art"><svg viewBox="0 0 220 200" aria-hidden="true">${ART[i]}</svg></div><h2>${s.h}</h2><p>${s.p}</p></section>`).join("")}</div>
   <div class="intro-bot"><div class="intro-dots">${L.s.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div><button class="intro-go" data-i="next">${L.next}</button></div>`;
  const tr = el.querySelector(".intro-track"), dots = [...el.querySelectorAll(".intro-dots i")], go = el.querySelector(".intro-go");
  const idx = () => Math.min(n-1, Math.max(0, Math.round(Math.abs(tr.scrollLeft)/tr.clientWidth)));
  const sync = () => { const i = idx(); dots.forEach((d,k)=>d.classList.toggle("on",k===i)); go.textContent = i===n-1 ? L.start : L.next };
  tr.addEventListener("scroll", sync, {passive:true});
  el.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if(!b) return;
    if(b.dataset.i==="skip") return close();
    const i = idx(); if(i>=n-1) return close();
    tr.scrollTo({left:(rtl?-1:1)*(i+1)*tr.clientWidth, behavior:"smooth"}) });
  (document.getElementById("phone") || document.body).appendChild(el);
};
const base = SC.afterRender;
SC.afterRender = function(){ if(base) base.apply(this, arguments);
  try{ if(!el && !localStorage.getItem("sc2.intro")) SC.showIntro() }catch(e){ if(!el && !window.__introShown){ window.__introShown = 1; SC.showIntro() } } };
try{ if(SC.DEMO_MODE && !localStorage.getItem("sc2.intro")) SC.showIntro() }catch(e){ if(SC.DEMO_MODE) SC.showIntro() }
})();
