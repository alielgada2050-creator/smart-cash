/* Smart Cash prototype — seed data for a 1,500-person company. Everything here is sample data. */
(function(){
const VERSION = 4;

// Display names for fixed keys: [Arabic, Latin]
const NAMES = {
  nakheel:["محطة النخيل","Al Nakheel Station"], rowad:["الرواد لقطع الغيار","Al Rowad Spare Parts"],
  sunbula:["مطعم السنبلة","Al Sunbula Restaurant"], aman:["متجر الأمان للأدوات","Al Aman Tools"],
  wadi:["نقليات الوادي","Al Wadi Transport"], noor:["مؤسسة نور للتوريدات","Noor Supplies"],
  fahd:["ورشة الفهد","Al Fahd Workshop"], baqala:["بقالة الحي","Neighbourhood Grocery"],
  kharjfuel:["محطة الخرج للمحروقات","Al-Kharj Fuel Station"], taibah:["طيبة للمواد الكهربائية","Taibah Electrical Supplies"],
  dawasir:["مؤسسة الدواسر التجارية","Al-Dawasir Trading"],
  abumoh:["أبو محمد","Abu Mohammed"], salem:["سالم العتيبي","Salem Al-Otaibi"],
  i_pads:["فحمات فرامل","Brake pads (set)"], i_oilf:["فلتر زيت","Oil filter"], i_oil:["زيت محرك 5W-30 (4 لتر)","Engine oil 5W-30 (4 L)"],
  i_cable:["كيبل نحاس 2.5 مم (100 م)","Copper cable 2.5 mm (100 m)"], i_helmet:["خوذة سلامة","Safety helmet"],
  i_gloves:["قفازات عمل","Work gloves (pair)"], i_fuel:["بنزين 91","Gasoline 91"], i_meal:["وجبات فريق العمل","Crew meals"],
  i_drill:["مثقاب كهربائي","Electric drill"], i_tape:["شريط عازل","Insulation tape"], i_paper:["ورق A4 (كرتون)","A4 paper (box)"],
  i_trip:["نقل معدات","Equipment transport"], i_diesel:["ديزل","Diesel"], i_water:["مياه شرب","Drinking water"],
};
const PASSWORD = "Demo@2026";

const BRANCHES = [
  {id:"RUH", name:["فرع الرياض","Riyadh branch"], region:"riyadh", gov:"riyadh"},
  {id:"KHJ", name:["فرع الخرج","Al-Kharj branch"], region:"riyadh", gov:"kharj"},
  {id:"AFJ", name:["فرع الأفلاج","Al-Aflaj branch"], region:"riyadh", gov:"aflaj"},
  {id:"WDD", name:["فرع وادي الدواسر","Wadi Ad-Dawasir branch"], region:"riyadh", gov:"wadi_dawasir"},
  {id:"SLY", name:["فرع السليل","As-Sulayyil branch"], region:"riyadh", gov:"sulayyil"},
  {id:"MED", name:["فرع المدينة المنورة","Madinah branch"], region:"madinah", gov:"madinah"},
];
const PROJECTS = [
  ["RUH",["صيانة الرياض الشمالية","Riyadh North Maintenance"],26000],
  ["RUH",["مجمع النخيل السكني","Al Nakheel Residential Complex"],480000],
  ["RUH",["تشغيل محطات الضخ","Pumping Stations O&M"],360000],
  ["RUH",["صيانة مدارس الرياض","Riyadh Schools Maintenance"],290000],
  ["RUH",["إنارة الدائري الشرقي","Eastern Ring Road Lighting"],410000],
  ["RUH",["صيانة المرافق الصحية","Healthcare Facilities Maintenance"],330000],
  ["RUH",["أعمال حي الياسمين","Al Yasmin District Works"],250000],
  ["RUH",["مستودعات السلي","Al Sulay Warehouses"],180000],
  ["KHJ",["صيانة الخرج","Al-Kharj Maintenance"],220000],
  ["KHJ",["محطة معالجة الخرج","Al-Kharj Treatment Plant"],390000],
  ["KHJ",["مدارس الخرج","Al-Kharj Schools"],160000],
  ["KHJ",["طرق الخرج","Al-Kharj Roads"],300000],
  ["AFJ",["صيانة الأفلاج","Al-Aflaj Maintenance"],150000],
  ["AFJ",["آبار ليلى","Layla Wells"],210000],
  ["AFJ",["المباني الحكومية بالأفلاج","Al-Aflaj Government Buildings"],140000],
  ["WDD",["صيانة وادي الدواسر","Wadi Ad-Dawasir Maintenance"],170000],
  ["WDD",["المشاريع الزراعية بالوادي","Wadi Agricultural Projects"],260000],
  ["WDD",["طرق وادي الدواسر","Wadi Ad-Dawasir Roads"],230000],
  ["SLY",["صيانة السليل","As-Sulayyil Maintenance"],120000],
  ["SLY",["شبكة مياه السليل","As-Sulayyil Water Network"],200000],
  ["MED",["صيانة المدينة المنورة","Madinah Maintenance"],240000],
  ["MED",["أعمال حي قباء","Quba District Works"],310000],
];

/* name pools */
const AR_FIRST = [["محمد","Mohammed"],["أحمد","Ahmed"],["عبدالله","Abdullah"],["فهد","Fahd"],["خالد","Khaled"],["سعود","Saud"],["عبدالرحمن","Abdulrahman"],["سلطان","Sultan"],["ناصر","Nasser"],["تركي","Turki"],["بندر","Bandar"],["ماجد","Majed"],["فيصل","Faisal"],["عمر","Omar"],["يوسف","Yousef"],["إبراهيم","Ibrahim"],["سلمان","Salman"],["نايف","Nayef"],["منصور","Mansour"],["راشد","Rashed"],["مشعل","Mishal"],["وليد","Waleed"],["هاني","Hani"],["طارق","Tariq"]];
const AR_FEM = [["نورة","Noura"],["سارة","Sara"],["ريم","Reem"],["لمى","Lama"],["عبير","Abeer"],["مها","Maha"],["أمل","Amal"],["هيا","Haya"],["الجوهرة","Aljawhara"],["دانة","Dana"]];
const AR_LAST = [["القحطاني","Al-Qahtani"],["العتيبي","Al-Otaibi"],["الدوسري","Al-Dosari"],["الشمري","Al-Shammari"],["الحربي","Al-Harbi"],["المطيري","Al-Mutairi"],["الغامدي","Al-Ghamdi"],["الزهراني","Al-Zahrani"],["السبيعي","Al-Subaie"],["العنزي","Al-Anazi"],["الشهري","Al-Shehri"],["المالكي","Al-Malki"],["الرشيدي","Al-Rashidi"],["العمري","Al-Omari"],["الجهني","Al-Juhani"],["السهلي","Al-Sahli"],["اليامي","Al-Yami"],["القرني","Al-Qarni"],["حداد","Haddad"],["النجار","Al-Najjar"],["الخطيب","Al-Khatib"],["عبدالعزيز","Abdelaziz"]];
const SA_FIRST = ["Rajesh","Suresh","Anil","Vijay","Ramesh","Manoj","Arun","Sanjay","Imran","Asif","Bilal","Usman","Tariq","Kamran","Shahid","Rahim","Karim","Jamal","Habib","Rafiqul","Monir","Shafiq","Ram","Bikash","Dipak","Suman","Prakash","Anoop","Shibu","Rajeev","Sajeev","Biju","Naveen","Faisal","Zubair","Sohel"];
const SA_LAST = ["Kumar","Singh","Sharma","Nair","Pillai","Menon","Thomas","Khan","Ahmed","Hussain","Iqbal","Ali","Rahman","Islam","Hossain","Uddin","Miah","Thapa","Gurung","Rai","Shrestha","Tamang","Varghese","George","Kurian","Yadav","Das"];
const PH_FIRST = ["Juan","Jose","Mark","John","Ramon","Joel","Rommel","Arnel","Jerome","Ryan","Christian","Michael","Jayson","Romeo"];
const PH_LAST = ["dela Cruz","Santos","Reyes","Garcia","Mendoza","Bautista","Villanueva","Ramos","Castillo","Aquino","Navarro","Flores"];

const ROLE_ORDER = ["technician","supervisor","engineer","pm","accountant","procurement","finance","admin"];
const PERMS = {
  technician: ["scan","withdraw","resubmit","close_own_folder","request_purchase","receive_goods","ledger","export_own","comment"],
  supervisor: ["approve","bulk_approve","sign_folder","request_purchase","receive_goods","ledger","export_scope","comment"],
  engineer:   ["approve","bulk_approve","request_purchase","receive_goods","add_supplier","export_scope","comment"],
  pm:         ["approve","bulk_approve","approve_po","add_supplier","project_budget","export_scope","reports","comment"],
  accountant: ["approve","bulk_approve","credit_note","close_folder","sign_folder","add_supplier","journal","export_scope","reports","comment"],
  procurement:["approve","bulk_approve","create_po","match_invoice","add_supplier","suppliers","credit_note","export_scope","comment"],
  finance:    ["approve","bulk_approve","credit_note","close_folder","sign_folder","issue_advance","topup","add_project","add_supplier","journal","export_all","reports","audit","comment"],
  admin:      ["users","approve_accounts","reset_password","roles","add_branch","add_project","audit","export_all","backup_all"],
};
const ALL_PERMS = ["scan","withdraw","resubmit","comment","approve","bulk_approve","credit_note","close_own_folder","close_folder","sign_folder","journal",
  "request_purchase","receive_goods","create_po","approve_po","match_invoice","add_supplier","suppliers","issue_advance","topup","add_project","add_branch","project_budget",
  "ledger","reports","export_own","export_scope","export_all","audit","users","approve_accounts","reset_password","roles","backup_all"];
const SCOPE = {technician:"self", supervisor:"team", engineer:"project", pm:"project", accountant:"branch", procurement:"company", finance:"company", admin:"company"};
const DEFAULT_LIMIT = {technician:0, supervisor:500, engineer:5000, pm:20000, accountant:50000, procurement:50000, finance:null, admin:0};
const CUSTODY_TYPES = ["employee","technician","supervisor","engineer","project_manager","branch","procurement","emergency","operations_maintenance","temporary"];

const SUPPLIERS = [
  {k:"nakheel", vat:"300512345600003", cr:"1010456789", cats:["fuel"], gov:"riyadh", rating:4.6, phone:"+966 11 456 1200"},
  {k:"rowad", vat:"310987654300003", cr:"1010998877", cats:["parts"], gov:"riyadh", rating:4.2, phone:"+966 11 220 4410"},
  {k:"sunbula", vat:"302233445500003", cr:"1010223344", cats:["hosp"], gov:"riyadh", rating:4.4, phone:"+966 11 870 0091"},
  {k:"aman", vat:"301122334400003", cr:"1010112233", cats:["tools","parts"], gov:"riyadh", rating:4.0, phone:"+966 11 412 7765"},
  {k:"wadi", vat:"305566778800003", cr:"1182556677", cats:["transport"], gov:"wadi_dawasir", rating:4.5, phone:"+966 11 784 2230"},
  {k:"noor", vat:"307788990000003", cr:"1010778899", cats:["office","site","tools"], gov:"riyadh", rating:4.7, phone:"+966 11 299 5512"},
  {k:"fahd", vat:"309900112200003", cr:"1010990011", cats:["parts"], gov:"riyadh", rating:3.8, phone:"+966 55 300 1188"},
  {k:"baqala", vat:null, cr:null, cats:["hosp","site"], gov:"riyadh", rating:3.5, phone:"—"},
  {k:"kharjfuel", vat:"311223344500003", cr:"1011223344", cats:["fuel"], gov:"kharj", rating:4.3, phone:"+966 11 545 0019"},
  {k:"taibah", vat:"304455667700003", cr:"4650445566", cats:["tools","site"], gov:"madinah", rating:4.1, phone:"+966 14 822 3301"},
  {k:"dawasir", vat:"306677889900003", cr:"1183667788", cats:["site","hosp"], gov:"wadi_dawasir", rating:3.9, phone:"+966 11 784 9902"},
];
const CATS = ["fuel","parts","tools","hosp","transport","office","site","comms","emergency","other"];
const PROC_CATS = ["parts","tools"];
const KINDS = ["tax_simplified","tax_standard","regular","purchase","credit_note","other"];

function rng(seed){ return ()=> (seed = (seed*16807) % 2147483647) / 2147483647 }
const r2 = n => Math.round(n*100)/100;
const vatOf = (total, kind) => (kind==="tax_simplified"||kind==="tax_standard") ? r2(total*15/115) : 0;
function path(total, cat){
  if(total <= 500) return ["supervisor","accountant"];
  if(total <= 5000) return ["supervisor","engineer","pm","accountant", ...(PROC_CATS.includes(cat)?["procurement"]:[]), "finance"];
  return ["supervisor","engineer","pm","accountant","procurement","finance"];
}
const ITEM_BY_CAT = {fuel:["i_fuel",2.18], parts:["i_pads",85], tools:["i_tape",12], hosp:["i_meal",32.25], transport:["i_trip",368.5], office:["i_paper",115], site:["i_water",19], comms:["i_tape",12], emergency:["i_gloves",15], other:["i_water",19]};

/* ---------------------------------------------------------------- organisation */
function buildOrg(R){
  const users = [], pick = a => a[Math.floor(R()*a.length)];
  const counters = {};
  const empNo = role => { const p = {technician:"T",supervisor:"S",engineer:"E",pm:"M",accountant:"A",procurement:"P",finance:"F",admin:"IT"}[role]; counters[p]=(counters[p]||3000)+1; return `${p}-${counters[p]}` };
  const person = (kind) => {
    if(kind==="arab"){ const f = pick(AR_FIRST), l = pick(AR_LAST); return [`${f[0]} ${l[0]}`, `${f[1]} ${l[1]}`] }
    if(kind==="fem"){ const f = pick(AR_FEM), l = pick(AR_LAST); return [`${f[0]} ${l[0]}`, `${f[1]} ${l[1]}`] }
    if(kind==="ph"){ const n = `${pick(PH_FIRST)} ${pick(PH_LAST)}`; return [n, n] }
    const n = `${pick(SA_FIRST)} ${pick(SA_LAST)}`; return [n, n];
  };
  const mail = (en, emp) => `${en.toLowerCase().replace(/[^a-z ]/g,"").trim().split(/\s+/).join(".")}.${emp.toLowerCase().replace("-","")}@smartcash.demo`;
  let seq = 0;
  const add = (o) => { const emp = o.emp || empNo(o.role); const u = {id:o.id || ("u"+String(++seq).padStart(4,"0")), name:o.name, role:o.role, emp,
    email:o.email || mail(o.name[1], emp), google:o.google||null, reportsTo:o.reportsTo||null, branch:o.branch||null, project:o.project||null,
    limit: o.limit!==undefined ? o.limit : DEFAULT_LIMIT[o.role], phone:o.phone || `+966 5${Math.floor(R()*9)} ${String(Math.floor(R()*900)+100)} ${String(Math.floor(R()*9000)+1000)}`,
    status:"active", pw:null, mustChange:false, fails:0, demo:!!o.demo, sessions:[]}; users.push(u); return u };

  // head office
  const huda = add({id:"u_fin", name:["هدى المطيري","Huda Al-Mutairi"], role:"finance", emp:"F-0009", email:"huda.mutairi@smartcash.demo", google:"huda.m.demo@gmail.com", limit:null, phone:"+966 50 000 9114", demo:true});
  for(let i=0;i<4;i++) add({name:person(i%2?"fem":"arab"), role:"finance", reportsTo:huda.id, limit:100000});
  const rafiq = add({id:"u_proc", name:["محمد رفيق","Mohammad Rafiq"], role:"procurement", emp:"P-0120", email:"m.rafiq@smartcash.demo", reportsTo:huda.id, phone:"+966 53 012 0988", demo:true});
  for(let i=0;i<4;i++) add({name:person(i%2?"arab":"sa"), role:"procurement", reportsTo:rafiq.id});
  const nasser = add({id:"u_admin", name:["ناصر العنزي","Nasser Al-Anazi"], role:"admin", emp:"IT-001", email:"nasser.anazi@smartcash.demo", google:"nasser.it.demo@gmail.com", reportsTo:huda.id, phone:"+966 59 000 1001", demo:true});
  add({name:person("sa"), role:"admin", reportsTo:nasser.id});

  // branches → accountants
  const acc = {};
  BRANCHES.forEach(b=>{
    const n = b.id==="RUH" ? 3 : 1; acc[b.id] = [];
    for(let i=0;i<n;i++){
      const u = (b.id==="RUH" && i===0) ? add({id:"u_acc", name:["سارة القحطاني","Sara Al-Qahtani"], role:"accountant", emp:"A-0415", email:"sara.qahtani@smartcash.demo", google:"sara.q.demo@gmail.com", reportsTo:huda.id, branch:"RUH", phone:"+966 55 041 5063", demo:true})
        : add({name:person(i%2?"fem":"arab"), role:"accountant", reportsTo:huda.id, branch:b.id});
      acc[b.id].push(u);
    }
  });

  // projects → PM → engineers → supervisors → technicians
  const projects = []; const counts = {}; let techLeft = 1500 - users.length - PROJECTS.length*7;
  PROJECTS.forEach(([br, name, budget], pi)=>{
    counts[br] = (counts[br]||0)+1;
    const id = `P-${br}-${String(counts[br]).padStart(2,"0")}`;
    const b = BRANCHES.find(x=>x.id===br);
    const first = pi===0, med = id==="P-MED-01";
    const pm = first ? add({id:"u_pm", name:["فيصل الحربي","Faisal Al-Harbi"], role:"pm", emp:"M-0102", email:"faisal.harbi@smartcash.demo", google:"faisal.h.demo@gmail.com", reportsTo:acc[br][0].id, branch:br, project:id, phone:"+966 56 010 2455", demo:true})
      : add({name:person("arab"), role:"pm", reportsTo:acc[br][0].id, branch:br, project:id});
    const engs = [0,1].map(k => first && k===0 ? add({id:"u_eng", name:["عمر حداد","Omar Haddad"], role:"engineer", emp:"E-0207", email:"omar.haddad@smartcash.demo", reportsTo:pm.id, branch:br, project:id, phone:"+966 54 020 7319", demo:true})
      : add({name:person(R()<.6?"arab":"sa"), role:"engineer", reportsTo:pm.id, branch:br, project:id}));
    const sups = [0,1,2,3].map(k => first && k===0 ? add({id:"u_sup", name:["خالد السبيعي","Khaled Al-Subaie"], role:"supervisor", emp:"S-0311", email:"khaled.subaie@smartcash.demo", google:"khaled.s.demo@gmail.com", reportsTo:engs[0].id, branch:br, project:id, phone:"+966 50 031 1877", demo:true})
      : add({name:person(R()<.4?"arab":R()<.7?"sa":"ph"), role:"supervisor", reportsTo:engs[k%2].id, branch:br, project:id}));
    const nTech = Math.floor(techLeft / (PROJECTS.length - pi)); techLeft -= nTech;
    for(let k=0;k<nTech;k++){
      if(first && k===0) add({id:"u_tech", name:["راجيش كومار","Rajesh Kumar"], role:"technician", emp:"T-1042", email:"rajesh.kumar@smartcash.demo", google:"rajesh.k.demo@gmail.com", reportsTo:sups[0].id, branch:br, project:id, phone:"+966 55 104 2201", demo:true});
      else if(med && k===0) add({id:"u_tech2", name:["خوان دي لا كروز","Juan dela Cruz"], role:"technician", emp:"T-2210", email:"juan.delacruz@smartcash.demo", reportsTo:sups[0].id, branch:br, project:id, phone:"+966 58 221 0440"});
      else { const r = R(); add({name:person(r<.55?"sa":r<.8?"ph":"arab"), role:"technician", reportsTo:sups[k%4].id, branch:br, project:id}) }
    }
    projects.push({id, name, branch:br, region:b.region, gov:b.gov, pm:pm.id, budget, status:"active", created:"2026-01-15T07:00:00.000Z"});
  });
  return {users, projects};
}

/* ---------------------------------------------------------------- seed */
function seed(){
  const R = rng(20261106);
  const {users, projects} = buildOrg(R);
  const iso = (y,m,d,h,mi) => new Date(Date.UTC(y,m-1,d,h-3,mi)).toISOString();
  let exNo = 4400, cnNo = 0;
  const invoices = [];
  const ACTOR = {supervisor:"u_sup", engineer:"u_eng", pm:"u_pm", accountant:"u_acc", procurement:"u_proc", finance:"u_fin"};
  const sup = k => SUPPLIERS.find(s=>s.k===k);
  function mk(o){
    const s = sup(o.sup);
    const kind = o.kind || (s && s.vat ? "tax_simplified" : "regular");
    const total = r2(o.total), vat = vatOf(total, kind);
    const [ik, unit] = ITEM_BY_CAT[o.cat];
    const qty = o.cat==="fuel" ? r2(total/unit) : Math.max(1, Math.round(total/unit));
    const inv = {id:"EX-"+String(++exNo).padStart(7,"0"), folder:o.folder, seq:o.seq, adv:o.adv, by:o.by, project:o.project, branch:o.branch,
      sup:o.sup, supName:null, vatNo: kind.startsWith("tax") ? s.vat : null, invNo:(o.sup==="baqala"?"":o.sup.slice(0,3).toUpperCase()+"-")+(24000+Math.floor(R()*9000)),
      kind, cat:o.cat, date:o.t, sub:r2(total-vat), vat, total, items:[[ik, qty, r2(total/qty), total]], src: kind.startsWith("tax")?"qr":"ai",
      status:"review", steps:path(total,o.cat), idx:0, retStep:null, hist:[], credits:[], comments:[], hash:null, img:false};
    const t0 = new Date(o.t).getTime(), at = m => new Date(t0 + m*60000).toISOString();
    inv.hist.push({t:at(0), ev:"captured", by:o.by}, {t:at(1), ev:inv.src==="qr"?"read_qr":"read_ai", by:o.by}, {t:at(2), ev:"foldered", by:o.by, folder:o.folder, seq:o.seq});
    const fin = o.state || "approved"; let k = 0, m = 60;
    const upto = fin==="approved" ? inv.steps.length : (o.at ?? 0);
    for(; k<upto; k++){ m += 90 + Math.floor(R()*600); inv.hist.push({t:at(m), ev:"approved", by:o.actors?.[k] || ACTOR[inv.steps[k]], step:inv.steps[k]}) }
    inv.idx = k;
    if(fin==="approved"){ inv.status="approved"; inv.hist.push({t:at(m+1), ev:"posted", by:"u_fin"}) }
    else if(fin==="rejected"){ inv.status="rejected"; inv.hist.push({t:at(m+120), ev:"rejected", by:ACTOR[inv.steps[k]], step:inv.steps[k], note:o.note}) }
    else if(fin==="returned"){ inv.status="returned"; inv.retStep=k; inv.hist.push({t:at(m+120), ev:"returned", by:ACTOR[inv.steps[k]], step:inv.steps[k], note:o.note}) }
    invoices.push(inv); return inv;
  }
  const cats = ["fuel","fuel","hosp","tools","fuel","parts","site","fuel","hosp","transport"];
  const supFor = {fuel:"nakheel", hosp:"sunbula", tools:"aman", parts:"rowad", site:"noor", transport:"wadi"};
  const P1 = "P-RUH-01", PM1 = "P-MED-01";
  for(const [fno, month] of [[86,9],[87,10]]) for(let s=1; s<=30; s++){
    const cat = cats[Math.floor(R()*cats.length)], base = {fuel:140,hosp:70,tools:180,parts:320,site:90,transport:380}[cat];
    mk({folder:fno, seq:s, adv:"CU-000142", by:"u_tech", project:P1, branch:"RUH", sup:supFor[cat], cat, total:r2(base*(0.6+R()*0.9)),
        t:iso(2026, month, Math.min(28, 1+Math.floor((s-1)*0.93)), 8+Math.floor(R()*9), Math.floor(R()*59)), state:"approved"});
  }
  const F = (seq, s, cat, total, state, at, d, h, note, kind) => mk({folder:88, seq, adv:"CU-000142", by:"u_tech", project:P1, branch:"RUH", sup:s, cat, total, state, at, note, kind, t:iso(2026, d<6?11:10, d, h, 10+seq)});
  F(1,"nakheel","fuel",180,"approved",0,29,8); F(2,"sunbula","hosp",64.5,"approved",0,29,13); F(3,"aman","tools",412,"approved",0,30,10);
  F(4,"wadi","transport",737,"approved",0,30,15); F(5,"nakheel","fuel",150,"approved",0,31,9);
  const i6 = F(6,"rowad","parts",1265,"approved",0,1,11);
  F(7,"baqala","hosp",38,"approved",0,1,12,null,"regular"); F(8,"nakheel","fuel",165,"rejected",1,2,8,"dup_claim");
  F(9,"aman","tools",96,"approved",0,2,14);
  const i10 = F(10,"sunbula","hosp",120.75,"returned",1,3,13,"ret_category");
  F(11,"rowad","parts",1215.5,"review",4,3,16); F(12,"nakheel","fuel",640,"review",1,4,8); F(13,"aman","tools",1348,"review",2,4,11);
  F(14,"noor","office",230,"review",1,4,15); F(15,"fahd","parts",1480,"review",5,5,9); F(16,"nakheel","fuel",120,"review",0,5,14); F(17,"rowad","parts",290,"review",0,5,11);
  cnNo++; i6.credits.push({cn:"CN-000001", amt:85, reason:"cn_defective", by:"u_acc", t:"2026-11-03T09:12:00.000Z"});
  i6.hist.push({t:"2026-11-03T09:12:00.000Z", ev:"credit", by:"u_acc", cn:"CN-000001", amt:85, note:"cn_defective"});
  i10.comments.push({by:"u_acc", t:"2026-11-03T14:05:00.000Z", text:"cm_seed_1"}, {by:"u_tech", t:"2026-11-03T15:20:00.000Z", text:"cm_seed_2"});
  const medSup = users.find(u=>u.project===PM1 && u.role==="supervisor").id;
  const J = (seq, s, cat, total, state, at, d) => mk({folder:89, seq, adv:"CU-000097", by:"u_tech2", project:PM1, branch:"MED", sup:s, cat, total, state, at,
      actors:[medSup,"x","x","x","x","x"], t:iso(2026,11,d,10,5+seq)});
  J(1,"taibah","site",210,"approved",0,2); J(2,"noor","site",96,"approved",0,3); J(3,"taibah","tools",355,"review",1,4); J(4,"sunbula","hosp",88,"review",0,5);
  invoices.forEach(i=>i.hist.forEach(h=>{ if(h.by==="x") h.by = users.find(u=>u.branch==="MED" && u.role==="accountant").id }));

  const sumApproved = f => r2(invoices.filter(i=>i.folder===f && i.status==="approved").reduce((s,i)=>s+i.total,0));
  const advances = [
    {id:"CU-000142", holder:"u_tech", type:"technician", project:P1, branch:"RUH", status:"active", due:"2026-12-31", moves:[
      {kind:"issue", amt:10000, t:"2026-08-31T07:00:00.000Z", by:"u_fin"},
      {kind:"topup", amt:sumApproved(86), t:"2026-10-02T07:30:00.000Z", by:"u_fin", note:"BT-000086"},
      {kind:"topup", amt:sumApproved(87), t:"2026-10-30T07:30:00.000Z", by:"u_fin", note:"BT-000087"}]},
    {id:"CU-000097", holder:"u_tech2", type:"technician", project:PM1, branch:"MED", status:"active", due:"2026-12-31", moves:[{kind:"issue", amt:3000, t:"2026-10-20T07:00:00.000Z", by:"u_fin"}]},
  ];
  // supervisors and first engineers carry their own advances across the company (no invoices in the sample)
  let cu = 200;
  users.filter(u=>u.role==="supervisor" && u.id!=="u_sup").forEach((u,k)=>{ if(k%2) return;
    advances.push({id:"CU-"+String(++cu).padStart(6,"0"), holder:u.id, type:"supervisor", project:u.project, branch:u.branch, status:"active", due:"2026-12-31",
      moves:[{kind:"issue", amt:[3000,5000,8000][k%3], t:iso(2026,10,1+(k%25),8,0), by:"u_fin"}]}) });
  const folders = [
    {no:86, adv:"CU-000142", status:"approved", reason:"reached_30", closedAt:"2026-09-30T12:00:00.000Z", locked:true,
      sigs:{accountant:{by:"u_acc", t:"2026-10-01T08:00:00.000Z"}, finance:{by:"u_fin", t:"2026-10-02T07:20:00.000Z"}}},
    {no:87, adv:"CU-000142", status:"approved", reason:"reached_30", closedAt:"2026-10-28T12:00:00.000Z", locked:false,
      sigs:{accountant:{by:"u_acc", t:"2026-10-29T08:00:00.000Z"}, finance:{by:"u_fin", t:"2026-10-30T07:20:00.000Z"}}},
    {no:88, adv:"CU-000142", status:"open", sigs:{}}, {no:89, adv:"CU-000097", status:"open", sigs:{}},
  ];
  const prs = [
    {id:"PR-000012", by:"u_eng", project:P1, t:"2026-11-05T08:30:00.000Z", status:"new", lines:[{item:"i_helmet", qty:20}], comments:[],
      quotes:[{sup:"noor", price:38, days:2}, {sup:"aman", price:41.5, days:1}, {sup:"rowad", price:44, days:3}]},
    {id:"PR-000011", by:"u_tech", project:P1, t:"2026-11-01T09:00:00.000Z", status:"ordered", po:"PO-000031", lines:[{item:"i_pads", qty:10},{item:"i_oilf", qty:10}], comments:[],
      quotes:[{sup:"rowad", price:115, days:2}, {sup:"fahd", price:124, days:2}, {sup:"aman", price:131, days:4}]},
    {id:"PR-000010", by:"u_sup", project:P1, t:"2026-10-25T10:00:00.000Z", status:"ordered", po:"PO-000030", lines:[{item:"i_cable", qty:3}], comments:[],
      quotes:[{sup:"aman", price:410, days:3}, {sup:"noor", price:432, days:5}]},
    {id:"PR-000009", by:"u_eng", project:P1, t:"2026-10-20T10:00:00.000Z", status:"ordered", po:"PO-000029", lines:[{item:"i_gloves", qty:12}], comments:[],
      quotes:[{sup:"noor", price:15, days:1}, {sup:"aman", price:16.5, days:1}]},
  ];
  const pos = [
    {id:"PO-000031", pr:"PR-000011", sup:"rowad", project:P1, by:"u_proc", t:"2026-11-02T08:00:00.000Z", status:"ordered",
      lines:[{item:"i_pads", qty:10, price:82, rec:0, inv:0},{item:"i_oilf", qty:10, price:33, rec:0, inv:0}], receipts:[], invoice:null},
    {id:"PO-000030", pr:"PR-000010", sup:"aman", project:P1, by:"u_proc", t:"2026-10-26T08:00:00.000Z", status:"matched",
      lines:[{item:"i_cable", qty:3, price:410, rec:3, inv:3}], receipts:[{by:"u_sup", t:"2026-10-28T11:00:00.000Z"}], invoice:{no:"AMA-31877", total:1414.5, t:"2026-10-29T09:00:00.000Z"}},
    {id:"PO-000029", pr:"PR-000009", sup:"noor", project:P1, by:"u_proc", t:"2026-10-21T08:00:00.000Z", status:"mismatch",
      lines:[{item:"i_gloves", qty:12, price:15, rec:10, inv:12}], receipts:[{by:"u_eng", t:"2026-10-23T13:00:00.000Z"}], invoice:{no:"NOR-55102", total:207, t:"2026-10-24T09:00:00.000Z"}},
  ];
  const contacts = [
    {id:"c1", n:"abumoh", kind:"customer", owner:"u_tech", entries:[{dir:"gave", amt:500, t:"2026-11-01T10:00:00.000Z"},{dir:"got", amt:200, t:"2026-11-05T10:00:00.000Z"}]},
    {id:"c2", n:"fahd", kind:"supplier", owner:"u_tech", entries:[{dir:"got", amt:1850, t:"2026-10-28T10:00:00.000Z"},{dir:"gave", amt:600, t:"2026-11-02T10:00:00.000Z"}]},
    {id:"c3", n:"salem", kind:"customer", owner:"u_tech", entries:[{dir:"gave", amt:320, t:"2026-10-20T10:00:00.000Z"},{dir:"got", amt:320, t:"2026-10-30T10:00:00.000Z"}]},
  ];
  // demo users keep a short sign-in history
  users.filter(u=>u.demo).forEach(u=>{ u.sessions = [{device:"dev_iphone", place:"Riyadh", t:"2026-11-05T05:40:00.000Z", via:"password"},{device:"dev_chrome", place:"Riyadh", t:"2026-11-04T06:10:00.000Z", via:u.google?"google":"password"}] });
  // account workflow samples: one pending request, one reset request, one locked account
  const pend = {id:"u_new1", name:["عبدالله الشهري","Abdullah Al-Shehri"], role:null, emp:"", email:"abdullah.shehri@smartcash.demo", google:null, reportsTo:null, branch:"KHJ", project:null,
    limit:0, phone:"+966 55 777 1203", status:"pending", pw:null, mustChange:true, fails:0, demo:false, sessions:[], request:{t:"2026-11-05T19:10:00.000Z", wantRole:"technician", note:"req_note_seed"}};
  users.push(pend);
  const locked = users.find(u=>u.role==="technician" && u.project==="P-KHJ-01"); locked.fails = 5; locked.status = "locked";
  const resetU = users.find(u=>u.role==="supervisor" && u.project==="P-AFJ-01");
  const requests = [{id:"RQ-0001", kind:"reset", user:resetU.id, t:"2026-11-05T21:40:00.000Z", status:"open"}];
  const notifs = [
    {id:"N1", to:"u_tech", k:"n_returned", ref:{type:"invoice", id:i10.id}, by:"u_acc", t:"2026-11-03T13:30:00.000Z", read:false},
    {id:"N2", to:"u_tech", k:"n_comment", ref:{type:"invoice", id:i10.id}, by:"u_acc", t:"2026-11-03T14:05:00.000Z", read:false},
    {id:"N3", to:"u_tech", k:"n_rejected", ref:{type:"invoice", id:invoices.find(i=>i.folder===88&&i.seq===8).id}, by:"u_sup", t:"2026-11-02T10:40:00.000Z", read:true},
    {id:"N4", to:"u_admin", k:"n_account_request", ref:{type:"user", id:"u_new1"}, by:null, t:"2026-11-05T19:10:00.000Z", read:false},
    {id:"N5", to:"u_admin", k:"n_reset_request", ref:{type:"user", id:resetU.id}, by:resetU.id, t:"2026-11-05T21:40:00.000Z", read:false},
  ];
  const audit = [
    {t:"2026-11-05T05:40:00.000Z", by:"u_tech", ev:"au_login", d:"password"},
    {t:"2026-11-05T06:02:00.000Z", by:"u_sup", ev:"au_login", d:"google"},
    {t:"2026-11-04T22:10:00.000Z", by:locked.id, ev:"au_locked", d:locked.emp},
    {t:"2026-11-03T09:12:00.000Z", by:"u_acc", ev:"au_credit", d:"CN-000001"},
    {t:"2026-10-30T07:20:00.000Z", by:"u_fin", ev:"au_sign", d:"BT-000087"},
  ];
  const suppliers = SUPPLIERS.map(s=>({...s, name:NAMES[s.k], by:null, t:"2026-01-15T07:00:00.000Z"}));
  return {v:VERSION, users, branches:BRANCHES.map(b=>({...b})), projects, advances, folders, invoices, prs, pos, contacts, suppliers, notifs, requests, audit,
    seq:{ex:exNo, folder:90, cn:cnNo, pr:12, po:31, cu, n:5, rq:1, br:6}, backups:{last:null, auto:true}, session:null};
}

window.SCDATA = {VERSION, NAMES, PASSWORD, ROLE_ORDER, PERMS, ALL_PERMS, SCOPE, DEFAULT_LIMIT, CUSTODY_TYPES, CATS, PROC_CATS, KINDS, path, vatOf, r2, seed};
})();
