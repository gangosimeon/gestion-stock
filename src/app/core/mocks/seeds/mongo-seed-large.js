/**
 * mongo-seed-large.js — Seed MongoDB indépendant (Node.js pur, sans TypeScript)
 * Usage : node mongo-seed-large.js
 * Prérequis : npm install mongodb
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME   = 'gestion_stock';

// ─── RNG déterministe (même seed que mock-db-large.ts) ──────────────────────
let _s = 20_251_225;
const rng = () => { _s = Math.imul(_s ^ (_s >>> 16), 0x45d9f3b); _s ^= _s >>> 16; return (_s >>> 0) / 4_294_967_295; };
const ri  = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
const pk  = (a)    => a[Math.floor(rng() * a.length)];
const zp  = (n, l = 3) => String(n).padStart(l, '0');
const r500= n => Math.round(n / 500) * 500;
const NOW = Date.now();
const rISO = (f, t) => new Date(NOW - ri(t, f) * 86_400_000).toISOString();
const rYMD = (f, t) => rISO(f, t).slice(0, 10);

// ─── Données statiques ───────────────────────────────────────────────────────
const CATEGORIES = [
  {_id:'c01',name:'Lunettes de vue'},{_id:'c02',name:'Lunettes de soleil'},
  {_id:'c03',name:'Lentilles journalières'},{_id:'c04',name:'Lentilles mensuelles'},
  {_id:'c05',name:'Lentilles annuelles'},{_id:'c06',name:'Solutions lentilles'},
  {_id:'c07',name:'Montures homme'},{_id:'c08',name:'Montures femme'},
  {_id:'c09',name:'Montures enfant'},{_id:'c10',name:'Montures sport'},
  {_id:'c11',name:'Verres simples'},{_id:'c12',name:'Verres progressifs'},
  {_id:'c13',name:'Verres anti-reflets'},{_id:'c14',name:'Verres photochromiques'},
  {_id:'c15',name:'Étuis et protections'},{_id:'c16',name:'Cordons et chaînes'},
  {_id:'c17',name:'Nettoyants optiques'},{_id:'c18',name:'Loupes et instruments'},
  {_id:'c19',name:'Matériel optométrie'},{_id:'c20',name:'Accessoires divers'},
];

const SUPPLIERS = [
  {_id:'sup_01',name:'Luxottica Group',          deliveryLeadTimeDays:21,email:'orders@luxottica.com'},
  {_id:'sup_02',name:'Safilo Group',             deliveryLeadTimeDays:18,email:'orders@safilo.com'},
  {_id:'sup_03',name:'Essilor International',    deliveryLeadTimeDays:14,email:'supplies@essilor.fr'},
  {_id:'sup_04',name:'Alcon Laboratories',       deliveryLeadTimeDays:30,email:'orders@alcon.com'},
  {_id:'sup_05',name:'Johnson & Johnson Vision', deliveryLeadTimeDays:28,email:'vision@jnj.com'},
  {_id:'sup_06',name:'CooperVision',             deliveryLeadTimeDays:25,email:'info@coopervision.com'},
  {_id:'sup_07',name:'Carl Zeiss Vision',        deliveryLeadTimeDays:20,email:'vision@zeiss.com'},
  {_id:'sup_08',name:'Hoya Vision Care',         deliveryLeadTimeDays:35,email:'orders@hoya.com'},
  {_id:'sup_09',name:'Rodenstock GmbH',          deliveryLeadTimeDays:22,email:'info@rodenstock.com'},
  {_id:'sup_10',name:'Marchon Eyewear',          deliveryLeadTimeDays:28,email:'orders@marchon.com'},
  {_id:'sup_11',name:'Silhouette International', deliveryLeadTimeDays:24,email:'orders@silhouette.com'},
  {_id:'sup_12',name:'Nikon Lenswear',           deliveryLeadTimeDays:32,email:'lenswear@nikon.com'},
  {_id:'sup_13',name:'Transitions Optical',      deliveryLeadTimeDays:20,email:'orders@transitions.com'},
  {_id:'sup_14',name:'Optik Pro Distribution CI',deliveryLeadTimeDays:5, email:'ventes@optikpro.ci'},
  {_id:'sup_15',name:'AfriVision SARL',          deliveryLeadTimeDays:3, email:'commandes@afrivision.ci'},
];

const USERS = [
  {_id:'u_01',username:'admin',      fullName:'Administrateur Système',roles:['ADMIN'],        isActive:true,  passwordHash:'$2b$10$placeholder'},
  {_id:'u_02',username:'diallo_m',   fullName:'Mamadou Diallo',        roles:['GESTIONNAIRE'],isActive:true,  passwordHash:'$2b$10$placeholder'},
  {_id:'u_03',username:'kouassi_a',  fullName:'Ama Kouassi',           roles:['CAISSIER'],    isActive:true,  passwordHash:'$2b$10$placeholder'},
  {_id:'u_04',username:'bamba_s',    fullName:'Seydou Bamba',          roles:['CAISSIER'],    isActive:true,  passwordHash:'$2b$10$placeholder'},
  {_id:'u_05',username:'traore_f',   fullName:'Fatou Traoré',          roles:['GESTIONNAIRE'],isActive:true,  passwordHash:'$2b$10$placeholder'},
  {_id:'u_06',username:'yao_k',      fullName:'Kouamé Yao',            roles:['CAISSIER'],    isActive:true,  passwordHash:'$2b$10$placeholder'},
  {_id:'u_07',username:'coulibaly_n',fullName:'Nafi Coulibaly',        roles:['ADMIN'],       isActive:true,  passwordHash:'$2b$10$placeholder'},
  {_id:'u_08',username:'kone_d',     fullName:'David Koné',            roles:['CAISSIER'],    isActive:true,  passwordHash:'$2b$10$placeholder'},
  {_id:'u_09',username:'ouattara_i', fullName:'Issa Ouattara',         roles:['GESTIONNAIRE'],isActive:false, passwordHash:'$2b$10$placeholder'},
  {_id:'u_10',username:'assi_r',     fullName:'Rose Assi',             roles:['CAISSIER'],    isActive:true,  passwordHash:'$2b$10$placeholder'},
];

// ─── Générateurs ─────────────────────────────────────────────────────────────
const BRANDS   = ['Ray-Ban','Oakley','Alcon','Zeiss','Essilor','Hoya','Acuvue','Bausch+Lomb','Silhouette','Tom Ford','Gucci','Prada','Dior','Persol','Lindberg'];
const CAT_PFX  = ['Monture Vue','Lunette Soleil','Lentille Jour','Lentille Mois','Lentille An','Solution','Monture H','Monture F','Monture Kid','Sport Frame','Verre Simple','Progressif','Anti-Reflet','Photochromique','Étui','Cordon','Spray Optique','Loupe','Équipement','Accessoire'];
const PRICE_RNG= [[15000,70000],[10000,55000],[2500,10000],[4000,18000],[12000,45000],[1200,6000],[18000,75000],[18000,75000],[8000,30000],[20000,90000],[3000,20000],[25000,110000],[12000,55000],[20000,75000],[800,7000],[300,4500],[800,5000],[2500,25000],[45000,450000],[400,8000]];

const stk = {};
const PRODUCTS = Array.from({length:200},(_,i)=>{
  const ci=i%20; const [mn,mx]=PRICE_RNG[ci]; const pp=r500(ri(mn,mx));
  const id=`p_${zp(i+1)}`; stk[id]=0;
  return {_id:id, sku:`SKU-${zp(i+1,4)}`, name:`${CAT_PFX[ci]} ${BRANDS[i%BRANDS.length]} ${String.fromCharCode(65+(i%26))}${zp(i%99+1,2)}`,
    categoryId:`c${zp(ci+1,2)}`, supplierId:`sup_${zp((i%15)+1,2)}`,
    purchasePrice:pp, retailPrice:r500(pp*(rng()*0.6+1.35)), wholesalePrice:r500(pp*(rng()*0.25+1.1)),
    stockQuantity:0, alertThreshold:ri(3,15)};
});

const FN=['Mamadou','Fatou','Ibrahim','Awa','Seydou','Aminata','Oumar','Mariam','Cheikh','Kadiatou','Bakary','Binta','Adama','Coumba','Moussa','Rokhaya','Souleymane','Khady','Lamine','Astou'];
const LN=['Diallo','Bah','Barry','Koné','Traoré','Coulibaly','Kouyaté','Diaby','Camara','Touré','Sylla','Baldé','Sow','Dieng','Fall','Seck','Ndiaye','Mbaye','Faye','Cissé'];
const CUSTOMERS = Array.from({length:50},(_,i)=>({
  _id:`cl_${zp(i+1)}`, name:`${FN[i%FN.length]} ${LN[i%LN.length]}`,
  phone:`+225 07 ${ri(10,99)} ${ri(10,99)} ${ri(10,99)}`,
  creditLimit:[0,0,50000,100000,200000,500000][ri(0,5)], createdAt:rISO(365,30),
}));

const movements=[]; const purchaseOrders=[];
for(let i=0;i<100;i++){
  const sup=SUPPLIERS[i%15]; const lc=ri(2,4); const d=ri(60,540); const cAt=rISO(d+5,d+3); const isD=d>30;
  const delivAt=isD?rISO(d,d-ri(3,sup.deliveryLeadTimeDays)):undefined;
  const ordId=`po_${zp(i+1)}`; const lines=[];
  for(let j=0;j<lc;j++){
    const p=PRODUCTS[(i*lc+j)%200]; const qty=ri(20,100); const uP=r500(p.purchasePrice*(rng()*0.1+0.92));
    if(isD){stk[p._id]=(stk[p._id]||0)+qty; movements.push({_id:`sm_s${zp(i*4+j+1,4)}`,productId:p._id,quantity:qty,reason:'SUPPLY',createdAt:delivAt,createdByUserId:'u_02',note:`Réception ${ordId}`});}
    lines.push({productId:p._id,productSku:p.sku,productName:p.name,quantity:qty,unitPurchasePrice:uP,lineTotal:uP*qty});
  }
  const tot=lines.reduce((a,l)=>a+l.lineTotal,0);
  purchaseOrders.push({_id:ordId,supplierId:sup._id,supplierName:sup.name,status:isD?'DELIVERED':'PENDING',createdAt:cAt,deliveredAt:delivAt,lines,totalAmount:tot,paidAmount:isD?(rng()>0.25?tot:r500(tot*(rng()*0.5+0.3))):0});
}

const sales=[];
for(let i=0;i<200;i++){
  const avail=PRODUCTS.filter(p=>(stk[p._id]||0)>0); if(!avail.length)break;
  const type=rng()>0.25?'RETAIL':'WHOLESALE'; const sId=`sa_${zp(i+1)}`; const cAt=rISO(90,0);
  const n=Math.min(ri(1,4),avail.length); const idxs=new Set(); while(idxs.size<n)idxs.add(ri(0,avail.length-1));
  const items=[...idxs].map(idx=>{const p=avail[idx];const qty=Math.max(1,Math.min(stk[p._id],ri(1,5)));const uP=type==='RETAIL'?p.retailPrice:p.wholesalePrice;stk[p._id]-=qty;movements.push({_id:`sm_v${zp(i*4+idx+1,4)}`,productId:p._id,quantity:-qty,reason:'SALE',createdAt:cAt,createdByUserId:'u_03',note:`Vente ${sId}`});return{productId:p._id,quantity:qty,unitPrice:uP,purchasePrice:p.purchasePrice};});
  const tot=items.reduce((a,it)=>a+it.unitPrice*it.quantity,0); const pft=items.reduce((a,it)=>a+(it.unitPrice-it.purchasePrice)*it.quantity,0);
  sales.push({_id:sId,type,customerId:rng()>0.35?`cl_${zp(ri(1,50))}`:null,items,paymentMethod:pk(['CASH','CASH','CASH','MOBILE_MONEY','BANK_TRANSFER']),paidAmount:tot,total:tot,profit:pft,createdAt:cAt,createdByUserId:'u_03'});
}

for(let i=0;i<200;i++){const p=PRODUCTS[i%200];const q=ri(1,5)*(rng()>0.4?1:-1);if(q<0&&(stk[p._id]||0)+q<0)continue;stk[p._id]=(stk[p._id]||0)+q;movements.push({_id:`sm_a${zp(i+1,4)}`,productId:p._id,quantity:q,reason:q<0?'LOSS':'ADJUSTMENT',createdAt:rISO(365,0),createdByUserId:pk(['u_01','u_02','u_05']),note:'Ajustement stock'});}
PRODUCTS.forEach(p=>{p.stockQuantity=Math.max(0,stk[p._id]||0);});

// ─── Insertion MongoDB ────────────────────────────────────────────────────────
async function seed() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log(`✅ Connecté à MongoDB : ${MONGO_URI}`);
    const db = client.db(DB_NAME);

    const collections = {users:USERS,categories:CATEGORIES,suppliers:SUPPLIERS,products:PRODUCTS,customers:CUSTOMERS,purchaseOrders,sales,stockMovements:movements.sort((a,b)=>a.createdAt.localeCompare(b.createdAt))};

    for (const [col, docs] of Object.entries(collections)) {
      await db.collection(col).deleteMany({});
      if (docs.length > 0) await db.collection(col).insertMany(docs);
      console.log(`  → ${col}: ${docs.length} documents insérés`);
    }

    // Indexes
    await db.collection('products').createIndex({ sku: 1 }, { unique: true });
    await db.collection('products').createIndex({ categoryId: 1 });
    await db.collection('products').createIndex({ supplierId: 1 });
    await db.collection('sales').createIndex({ createdAt: -1 });
    await db.collection('sales').createIndex({ customerId: 1 });
    await db.collection('stockMovements').createIndex({ productId: 1, createdAt: -1 });
    await db.collection('purchaseOrders').createIndex({ supplierId: 1, status: 1 });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    console.log('  → Index créés');
    console.log(`\n✅ Seed terminé — base : "${DB_NAME}"`);
  } finally {
    await client.close();
  }
}

seed().catch(err => { console.error('❌ Erreur seed :', err); process.exit(1); });
