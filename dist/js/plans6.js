/* Smart Cash prototype — v0.6 seed additions: payment settings, payment links, savings goals, per-organisation policy. Sample data only. */
(function(){
const D = window.SCDATA;
D.VERSION = 6;
Object.assign(D.NAMES, {
  bk_rajhi:["مصرف الراجحي","Al Rajhi Bank"], bk_snb:["البنك الأهلي السعودي","Saudi National Bank"], bk_riyad:["بنك الرياض","Riyad Bank"],
  bk_sab:["البنك السعودي الأول","SAB"], bk_anb:["البنك العربي الوطني","Arab National Bank"], bk_alinma:["مصرف الإنماء","Alinma Bank"],
  bk_albilad:["بنك البلاد","Bank Albilad"], bk_aljazira:["بنك الجزيرة","Bank AlJazira"], bk_bsf:["البنك السعودي الفرنسي","Banque Saudi Fransi"],
  sv_emergency:["صندوق الطوارئ","Emergency fund"], sv_travel:["سفر الصيف","Summer trip"], sv_laptop:["لابتوب جديد","New laptop"],
  pl_loan:["سداد السلفة","Loan repayment"], pl_job:["أعمال صيانة المبنى ب","Maintenance works, building B"], pl_hvac:["صيانة التكييف — أكتوبر","AC maintenance — October"],
  pl_rebill:["قطع غيار لمشروع العميل","Spare parts for client project"],
});
D.BANKS = ["rajhi","snb","riyad","sab","anb","alinma","albilad","aljazira","bsf"];
D.GATEWAYS = [
  {k:"moyasar", name:"Moyasar", methods:["mada","visa","applepay","stcpay"]},
  {k:"hyperpay", name:"HyperPay", methods:["mada","visa","applepay"]},
  {k:"tap", name:"Tap Payments", methods:["mada","visa","applepay"]},
  {k:"paytabs", name:"PayTabs", methods:["mada","visa","applepay"]},
  {k:"geidea", name:"Geidea", methods:["mada","visa"]},
];
const PLAN_POLICY = {personal:{}, business:{auto:150}, enterprise:{fast:500, std:5000}};
const day = (m,d,h=10) => new Date(Date.UTC(2026,m-1,d,h-3,0)).toISOString();
const addDays = (iso,n) => new Date(new Date(iso).getTime()+n*864e5).toISOString();
let GW = null;
const pl = (o) => ({kind:"contact", ref:null, method:"both", status:"pending", paidAt:null, paidVia:null, gw:o.method==="bank"?null:GW, ...o, exp:o.exp || addDays(o.t, 7)});

const base = D.seedFor;
D.seedFor = ws => {
  const s = base(ws);
  s.v = D.VERSION;
  s.policy = {...PLAN_POLICY[s.plan]};
  s.seq.pl = 0; GW = {business:"moyasar", enterprise:"hyperpay"}[s.plan] || null;
  const next = () => "PL-"+String(++s.seq.pl).padStart(6,"0");
  if(s.plan==="personal"){
    s.payset = {holder:["أحمد الزهراني","Ahmed Al-Zahrani"], bank:"rajhi", iban:"SA9680000000608010123456", stc:"+966 55 712 3004", gateway:null};
    s.personal.savings = [
      {id:"SV-01", n:"sv_emergency", icon:"vault", target:10000, deadline:null, moves:[{kind:"in", amt:3000, t:day(8,1)},{kind:"in", amt:700, t:day(9,28)},{kind:"in", amt:500, t:day(10,28)}]},
      {id:"SV-02", n:"sv_travel", icon:"plane", target:6000, deadline:"2027-06-15T09:00:00.000Z", moves:[{kind:"in", amt:1000, t:day(9,28)},{kind:"in", amt:500, t:day(10,28)}]},
      {id:"SV-03", n:"sv_laptop", icon:"laptop", target:4500, deadline:day(12,31), moves:[{kind:"in", amt:2500, t:day(8,30)},{kind:"in", amt:1400, t:day(10,28)},{kind:"out", amt:0, t:day(10,28)}].filter(m=>m.amt>0)},
    ];
    s.paylinks = [
      pl({id:next(), contact:"pc1", name:"khalid_b", phone:"+966 50 441 2290", amt:1000, desc:"pl_loan", by:"u_me", t:day(11,6,19)}),
      pl({id:next(), contact:"pc4", name:"qahtani", phone:"+966 55 300 6621", amt:200, desc:"", by:"u_me", t:day(10,8,17), method:"bank", status:"paid", paidAt:day(10,15,17), paidVia:"bank"}),
    ];
  } else if(s.plan==="business"){
    s.payset = {holder:s.org.name, bank:"snb", iban:"SA7910000000001234567890", stc:"", gateway:{k:"moyasar", merchant:"pk_demo_alfahd_0193", at:day(9,1)}};
    s.org.vat = "310455667700003"; s.org.cr = "1010778899"; s.org.gov = "riyadh";
    s.paylinks = [
      pl({id:next(), contact:"bc1", name:"binaa", phone:"+966 11 470 2200", amt:12500, desc:"pl_job", by:"u_owner", t:day(11,4,11)}),
      pl({id:next(), contact:"bc2", name:"hayat", phone:"+966 11 290 7711", amt:4800, desc:"pl_hvac", by:"u_owner", t:day(10,20,11)}),
      pl({id:next(), contact:"bc4", name:"qahtani", phone:"+966 55 300 6621", amt:950, desc:"", by:"u_owner", t:day(10,3,11), status:"paid", paidAt:day(10,14,10), paidVia:"mada"}),
    ];
  } else {
    s.payset = {holder:s.org.name, bank:"riyad", iban:"SA2820000000000987654321", stc:"", gateway:{k:"hyperpay", merchant:"8ac7a4c9_demo_ent", at:day(7,1)}};
    const inv = s.invoices.find(i=>i.folder===87 && i.cat==="parts") || s.invoices.find(i=>i.folder===87);
    s.contacts.push(
      {id:"ec1", n:"binaa", kind:"customer", owner:"u_acc", phone:"+966 11 470 2200", entries:[{dir:"gave", amt:inv.total, t:day(11,6,10), note:"rebill:"+inv.id}]},
      {id:"ec2", n:"hayat", kind:"customer", owner:"u_fin", phone:"+966 11 290 7711", entries:[{dir:"gave", amt:23000, t:day(10,15,10)},{dir:"got", amt:23000, t:day(10,29,10)}]},
    );
    s.paylinks = [
      pl({id:next(), kind:"invoice", ref:inv.id, contact:"ec1", name:"binaa", phone:"+966 11 470 2200", amt:inv.total, desc:"pl_rebill", by:"u_acc", t:day(11,6,10)}),
      pl({id:next(), contact:"ec2", name:"hayat", phone:"+966 11 290 7711", amt:23000, desc:"pl_hvac", by:"u_fin", t:day(10,15,10), status:"paid", paidAt:day(10,29,10), paidVia:"bank"}),
    ];
  }
  s.audit.sort((a,b)=>new Date(b.t)-new Date(a.t));
  return s;
};
})();
