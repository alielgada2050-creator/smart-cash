/* Smart Cash prototype — the two smaller workspaces (individual, small business) and shared integration defaults. Sample data only. */
(function(){
const D = window.SCDATA, r2 = D.r2;
D.VERSION = 5;
Object.assign(D.NAMES, {
  me_emp:["شركة النخبة للمقاولات","Al Nokhba Contracting"], ramu:["رامو (السائق)","Ramu (driver)"], ummoh:["أم محمد","Umm Mohammed"],
  khalid_b:["خالد البقمي","Khalid Al-Buqami"], nawaf:["نواف الشهري","Nawaf Al-Shehri"], mohsin:["محسن الدوسري","Mohsin Al-Dosari"],
  binaa:["شركة البناء الحديث","Modern Building Co."], hayat:["مستشفى الحياة","Al Hayat Hospital"], qahtani:["محمد القحطاني","Mohammed Al-Qahtani"],
  tamimi:["أسواق التميمي","Tamimi Markets"], danube:["الدانوب","Danube"], sec:["الكهرباء","Electricity (SEC)"], stc:["الاتصالات","stc"],
  dr_clinic:["عيادة الأسنان","Dental clinic"], school:["المدرسة","School"], landlord:["المؤجر","Landlord"],
});

/* roles used only by the smaller workspaces */
D.PERMS.owner = ["approve","bulk_approve","credit_note","close_folder","sign_folder","issue_advance","topup","add_supplier","journal","export_all","reports","audit","comment",
  "users","approve_accounts","reset_password","ledger","integrations","backup_all"];
D.PERMS.personal = ["ledger","export_own","personal"];
D.PERMS.finance.push("integrations"); D.PERMS.admin.push("integrations");
D.SCOPE.owner = "company"; D.SCOPE.personal = "self";
D.DEFAULT_LIMIT.owner = null; D.DEFAULT_LIMIT.personal = 0;
D.PCATS = ["food","fuel","bills","transport","health","education","shopping","family","rent","other"];

D.integrationDefaults = (plan) => ({
  wa: {connected:false, number:"", events:{n_rejected:true, n_returned:true, n_inbox:false, n_approved:false, n_advance_issued:true, n_topup:true, n_folder_approved:false}},
  erp: {connections:{}, mapping:{fuel:"5101", parts:"5102", tools:"5103", hosp:"5104", transport:"5105", office:"5106", site:"5107", comms:"5108", emergency:"5109", other:"5199", vat:"1410", advance:"1130"}, log:[]},
  plan,
});

const R = (seed => () => (seed = (seed*16807) % 2147483647) / 2147483647)(7351);
const iso = (m,d,h,mi) => new Date(Date.UTC(2026,m-1,d,h-3,mi)).toISOString();
const user = (o) => ({email:"", google:null, reportsTo:null, branch:null, project:null, limit:0, phone:"—", status:"active", pw:null, mustChange:false, fails:0, demo:false,
  sessions:[{device:"dev_iphone", place:"Riyadh", t:"2026-11-07T06:40:00.000Z", via:"password"}], ...o});

/* ------------------------------------------------------------- individual */
D.seedPersonal = () => {
  const me = user({id:"u_me", name:["أحمد الزهراني","Ahmed Al-Zahrani"], role:"personal", emp:"—", email:"ahmed.z@smartcash.demo", google:"ahmed.z.demo@gmail.com", phone:"+966 55 712 3004", demo:true});
  const contacts = [
    {id:"pc1", n:"khalid_b", kind:"customer", owner:"u_me", phone:"+966 50 441 2290", entries:[{dir:"gave", amt:1500, t:iso(10,12,19,0), note:"loan"},{dir:"got", amt:500, t:iso(11,1,20,0)}]},
    {id:"pc2", n:"nawaf", kind:"customer", owner:"u_me", phone:"+966 53 118 7742", entries:[{dir:"gave", amt:350, t:iso(10,28,21,0)}]},
    {id:"pc3", n:"mohsin", kind:"supplier", owner:"u_me", phone:"+966 56 902 1187", entries:[{dir:"got", amt:800, t:iso(10,20,18,0)},{dir:"gave", amt:300, t:iso(11,3,18,0)}]},
    {id:"pc4", n:"qahtani", kind:"customer", owner:"u_me", phone:"+966 55 300 6621", entries:[{dir:"gave", amt:200, t:iso(9,30,17,0)},{dir:"got", amt:200, t:iso(10,15,17,0)}]},
  ];
  const exp = [], pe = (d, cat, amt, note, cust) => exp.push({id:"PE-"+String(exp.length+1).padStart(4,"0"), t:iso(d[0],d[1],d[2]||13,10+exp.length%40), cat, amt:r2(amt), note, cust:cust||null});
  for(let k=0;k<38;k++){
    const day = 1 + Math.floor(k*37/38), m = day>31 ? 11 : 10, dd = day>31 ? day-31 : day;
    const c = ["food","fuel","food","shopping","bills","transport","food","health","family","other"][k%10];
    const base = {food:85, fuel:70, shopping:160, bills:240, transport:35, health:180, family:300, other:60}[c];
    pe([m,dd,9+(k%10)], c, base*(0.5+R()), ["tamimi","fuel_note","danube","shopping_note","sec","transport_note","tamimi","dr_clinic","family_note","other_note"][k%10]);
  }
  pe([11,1,9],"rent",3500,"landlord"); pe([11,2,11],"education",1200,"school"); pe([11,5,10],"bills",299,"stc");
  const custodies = [
    {id:"PC-001", dir:"received", party:"me_emp", phone:"+966 11 210 5500", amount:2000, t:iso(10,25,9,0), status:"open", moves:[{kind:"issue", amt:2000, t:iso(10,25,9,0)}], spent:[
      {t:iso(10,26,12,0), amt:180, note:"fuel_note", cat:"fuel"},{t:iso(10,29,13,0), amt:420.5, note:"site_tools", cat:"shopping"},{t:iso(11,2,14,0), amt:96, note:"meal_team", cat:"food"},{t:iso(11,5,10,0), amt:250, note:"transport_note", cat:"transport"}]},
    {id:"PC-002", dir:"given", party:"ramu", phone:"+966 58 330 1209", amount:500, t:iso(11,1,8,0), status:"open", moves:[{kind:"issue", amt:500, t:iso(11,1,8,0)}], spent:[
      {t:iso(11,1,17,0), amt:120, note:"fuel_note", cat:"fuel"},{t:iso(11,4,16,0), amt:65, note:"car_wash", cat:"transport"},{t:iso(11,6,9,0), amt:140, note:"school_run", cat:"transport"}]},
    {id:"PC-003", dir:"given", party:"ummoh", phone:"+966 50 771 4420", amount:1500, t:iso(11,1,10,0), status:"open", moves:[{kind:"issue", amt:1500, t:iso(11,1,10,0)}], spent:[
      {t:iso(11,2,18,0), amt:640, note:"tamimi", cat:"food"},{t:iso(11,6,19,0), amt:380, note:"danube", cat:"food"}]},
  ];
  return {v:D.VERSION, plan:"personal", org:{name:["حساباتي الشخصية","My personal accounts"]}, users:[me], branches:[], projects:[], advances:[], folders:[], invoices:[], prs:[], pos:[], contacts, suppliers:[],
    notifs:[{id:"N1", to:"u_me", k:"n_budget_near", ref:{type:"pcat", id:"food"}, by:null, t:iso(11,6,20,0), read:false}], requests:[], audit:[],
    personal:{expenses:exp, custodies, budgets:{food:2200, fuel:600, bills:800, transport:400, health:500, education:1500, shopping:700, family:600, rent:3500, other:300}},
    integrations:D.integrationDefaults("personal"), waOutbox:[], seq:{ex:0, folder:1, cn:0, pr:0, po:0, cu:0, n:1, rq:0, br:0, pe:exp.length, pc:3}, backups:{last:null, auto:true}, session:null};
};

/* ------------------------------------------------------------- small business */
D.seedBusiness = () => {
  const owner = user({id:"u_owner", name:["فهد العتيبي","Fahd Al-Otaibi"], role:"owner", emp:"O-001", email:"fahd@alfahd-maint.demo", google:"fahd.owner.demo@gmail.com", limit:null, phone:"+966 50 600 1100", branch:"HQ", demo:true});
  const staff = [["u_bt1",["ساجيف كومار","Sajeev Kumar"],"+966 55 120 3301"],["u_bt2",["بلال أحمد","Bilal Ahmed"],"+966 53 449 2210"],["u_bt3",["مارك سانتوس","Mark Santos"],"+966 58 702 1145"],["u_bt4",["سعيد الغامدي","Saeed Al-Ghamdi"],"+966 56 330 8890"]]
    .map(([id,name,phone],k)=>user({id, name, role:"technician", emp:`B-10${k+1}`, email:`${name[1].toLowerCase().replace(/[^a-z ]/g,"").split(" ").join(".")}@alfahd-maint.demo`, reportsTo:"u_owner", branch:"HQ", phone, demo:k===0}));
  const users = [owner, ...staff];
  const sups = ["nakheel","rowad","aman","noor","fahd","baqala"].map(k=>({k, name:D.NAMES[k], vat:{nakheel:"300512345600003",rowad:"310987654300003",aman:"301122334400003",noor:"307788990000003",fahd:"309900112200003"}[k]||null,
    cr:null, cats:{nakheel:["fuel"],rowad:["parts"],aman:["tools"],noor:["site"],fahd:["parts"],baqala:["hosp"]}[k], gov:"riyadh", rating:4, phone:"—", by:null, t:"2026-01-01T00:00:00.000Z"}));
  const advances = staff.map((u,k)=>({id:"CU-"+String(301+k).padStart(6,"0"), holder:u.id, type:"technician", project:null, branch:"HQ", status:"active", due:"2026-11-30",
    moves:[{kind:"issue", amt:[3000,2000,2000,1500][k], t:iso(10,20+k,8,0), by:"u_owner"}]}));
  const invoices = [], folders = []; let ex = 9000;
  const plan = [["u_bt1",[["nakheel","fuel",160,"approved"],["rowad","parts",845,"approved"],["aman","tools",230,"approved"],["nakheel","fuel",140,"approved"],["fahd","parts",1190,"review"],["baqala","hosp",46,"review"],["nakheel","fuel",150,"returned"]]],
    ["u_bt2",[["nakheel","fuel",120,"approved"],["noor","site",310,"approved"],["aman","tools",515,"review"]]],
    ["u_bt3",[["rowad","parts",620,"approved"],["nakheel","fuel",95,"review"]]],
    ["u_bt4",[["noor","site",180,"approved"]]]];
  const ITEM = {fuel:["i_fuel",2.18], parts:["i_pads",85], tools:["i_tape",12], hosp:["i_meal",32.25], site:["i_water",19]};
  plan.forEach(([uid, list], k)=>{
    const adv = advances.find(a=>a.holder===uid), fno = 10+k; folders.push({no:fno, adv:adv.id, status:"open", sigs:{}});
    list.forEach(([sup, cat, total, st], s)=>{
      const sp = sups.find(x=>x.k===sup), kind = sp.vat ? "tax_simplified" : "regular", vat = D.vatOf(total, kind), [ik, unit] = ITEM[cat], t0 = iso(10, 22+s, 9+k, 5*s);
      const qty = cat==="fuel" ? r2(total/unit) : Math.max(1, Math.round(total/unit));
      const inv = {id:"EX-"+String(++ex).padStart(7,"0"), folder:fno, seq:s+1, adv:adv.id, by:uid, project:null, branch:"HQ", sup, supName:null, vatNo:sp.vat, invNo:sup.slice(0,3).toUpperCase()+"-"+(5000+ex),
        kind, cat, date:t0, sub:r2(total-vat), vat, total, items:[[ik, qty, r2(total/qty), total]], src:kind.startsWith("tax")?"qr":"ai", status:st==="approved"?"approved":st, steps:["owner"],
        idx:st==="approved"?1:0, retStep:st==="returned"?0:null, hist:[], credits:[], comments:[], hash:null, img:false};
      const at = m => new Date(new Date(t0).getTime()+m*60000).toISOString();
      inv.hist.push({t:at(0), ev:"captured", by:uid}, {t:at(1), ev:inv.src==="qr"?"read_qr":"read_ai", by:uid}, {t:at(2), ev:"foldered", by:uid, folder:fno, seq:s+1});
      if(st==="approved") inv.hist.push({t:at(180), ev:"approved", by:"u_owner", step:"owner"}, {t:at(181), ev:"posted", by:"u_owner"});
      if(st==="returned") inv.hist.push({t:at(200), ev:"returned", by:"u_owner", step:"owner", note:"ret_photo"});
      invoices.push(inv);
    });
  });
  const contacts = [
    {id:"bc1", n:"binaa", kind:"customer", owner:"u_owner", phone:"+966 11 470 2200", entries:[{dir:"gave", amt:18500, t:iso(10,5,10,0), note:"inv_job"},{dir:"got", amt:6000, t:iso(10,30,10,0)}]},
    {id:"bc2", n:"hayat", kind:"customer", owner:"u_owner", phone:"+966 11 290 7711", entries:[{dir:"gave", amt:4800, t:iso(10,18,10,0)}]},
    {id:"bc3", n:"rowad", kind:"supplier", owner:"u_owner", phone:"+966 11 220 4410", entries:[{dir:"got", amt:5200, t:iso(10,10,10,0)},{dir:"gave", amt:2000, t:iso(10,28,10,0)}]},
    {id:"bc4", n:"qahtani", kind:"customer", owner:"u_owner", phone:"+966 55 300 6621", entries:[{dir:"gave", amt:950, t:iso(10,2,10,0)},{dir:"got", amt:950, t:iso(10,14,10,0)}]},
    {id:"bc5", n:"noor", kind:"supplier", owner:"u_owner", phone:"+966 11 299 5512", entries:[{dir:"got", amt:1740, t:iso(11,3,10,0)}]},
  ];
  return {v:D.VERSION, plan:"business", org:{name:["مؤسسة الفهد للصيانة","Al Fahd Maintenance Est."]}, users,
    branches:[{id:"HQ", name:["المقر الرئيسي","Head office"], region:"riyadh", gov:"riyadh"}], projects:[], advances, folders, invoices, prs:[], pos:[], contacts, suppliers:sups,
    notifs:[{id:"N1", to:"u_owner", k:"n_inbox", ref:{type:"invoice", id:invoices.find(i=>i.status==="review").id}, by:"u_bt1", t:iso(11,6,9,0), read:false}],
    requests:[], audit:[{t:iso(11,7,8,0), by:"u_owner", ev:"au_login", d:"google"}],
    integrations:D.integrationDefaults("business"), waOutbox:[], seq:{ex, folder:20, cn:0, pr:0, po:0, cu:310, n:1, rq:0, br:1}, backups:{last:null, auto:true}, session:null};
};

/* enterprise keeps its seed, plus integrations already in use */
const baseSeed = D.seed;
D.seed = () => {
  const s = baseSeed(); s.v = D.VERSION; s.plan = "enterprise"; s.org = {name:["شركة سمارت للمقاولات والصيانة","Smart Contracting & Maintenance Co."]};
  s.integrations = D.integrationDefaults("enterprise");
  s.integrations.wa = {...s.integrations.wa, connected:true, number:"+966 11 555 0100"};
  s.integrations.erp.connections.sap = {status:"connected", url:"https://erp.smartco.example", company:"1000", at:"2026-09-01T07:00:00.000Z"};
  s.integrations.erp.log = [{t:"2026-10-03T06:00:00.000Z", sys:"sap", folder:86, lines:9, total:0, status:"ok", ref:"SAP-DOC-5100004412"}];
  s.waOutbox = [];
  s.contacts.forEach(c=>{ c.phone = c.phone || "+966 55 "+String(100+Math.floor(R()*899))+" "+String(1000+Math.floor(R()*8999)) });
  return s;
};
D.seedFor = ws => ws==="personal" ? D.seedPersonal() : ws==="business" ? D.seedBusiness() : D.seed();
})();
