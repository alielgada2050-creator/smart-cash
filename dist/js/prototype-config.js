(function(){
const D = window.SCDATA;
const demo = new URLSearchParams(location.search).get("demo") === "1";
window.SC_DEMO_MODE = demo;
window.SC_AUTH_API = window.SC_AUTH_API || "";

D.emptySeedFor = ws => ({
  v:D.VERSION, plan:ws, org:{name:["مساحة العمل","My workspace"]},
  users:[], branches:[], projects:[], advances:[], folders:[], invoices:[], prs:[], pos:[],
  contacts:[], suppliers:[], notifs:[], requests:[], audit:[],
  personal:{expenses:[], custodies:[], savings:[], cash:[], budgets:{}},
  integrations:D.integrationDefaults(ws), waOutbox:[], paylinks:[],
  payset:{holder:["مساحة العمل","My workspace"], bank:null, iban:"", stc:"", gateway:null},
  policy:{}, seq:{ex:0, folder:0, cn:0, pr:0, po:0, cu:0, n:0, rq:0, br:0, pe:0, pc:0, pl:0},
  backups:{last:null, auto:false}, session:null, mode:"live",
});

if(!demo) D.seedFor = D.emptySeedFor;
})();
