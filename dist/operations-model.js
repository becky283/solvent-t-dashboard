(function(root,factory){const model=factory();if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.OperationsModel=model;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const metrics=[
    {key:'salt',label:'Salt',unit:'PTB'}, {key:'bsw',label:'BS&W',unit:'%'},
    {key:'tan',label:'TAN',unit:'mg KOH/g'}, {key:'viscosity',label:'Viscosity',unit:'cSt'},
    {key:'metal',label:'Ni + V',unit:'ppm'}, {key:'asphaltenes',label:'Asphaltenes',unit:'wt%'},
    {key:'age',label:'Storage age at assay',unit:'days'}
  ];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
  const text=x=>typeof x==='string'&&x.trim().length>0;
  function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
  const addDays=(date,days)=>{if(!validDate(date))return '';const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
  function sample(){return {compatibility:'pending',salt:null,bsw:null,tan:null,metal:null,reference:'',date:''};}
  function defaults(){return {passports:[],suppliers:[],selectedPassports:[null,null,null],planningStart:'',planningDays:1,clearance:{fresh:sample(),aged:sample(),tanLimit:null,metalLimit:null,internalTarget:1.5,approval:'pending',approvedBy:'',approvedAt:'',approvalRef:'',notes:''}};}
  function passport(){return {id:'',name:'',type:'H',supplier:'',assayDate:'',reference:'',limitReference:'',temperature:null,notes:'',assay:Object.fromEntries(metrics.map(m=>[m.key,null])),contract:Object.fromEntries(metrics.map(m=>[m.key,null])),plant:Object.fromEntries(metrics.map(m=>[m.key,null])),contractNA:[],plantNA:[]};}
  function supplier(){return {id:'',name:'',type:'H',role:'primary',passportId:'',volume:null,volumeConfirmed:false,arrival:'',slotConfirmed:false,notes:''};}
  function normalize(input){
    const d=defaults(),o=input&&typeof input==='object'?input:{};
    d.passports=Array.isArray(o.passports)?o.passports.filter(p=>p&&typeof p.id==='string'&&['H','SH','L'].includes(p.type)).map(p=>({...passport(),...p,assay:{...passport().assay,...p.assay},contract:{...passport().contract,...p.contract},plant:{...passport().plant,...p.plant},contractNA:Array.isArray(p.contractNA)?p.contractNA:[],plantNA:Array.isArray(p.plantNA)?p.plantNA:[]})):[];
    d.suppliers=Array.isArray(o.suppliers)?o.suppliers.filter(s=>s&&typeof s.id==='string'&&['H','SH','L'].includes(s.type)).map(s=>({...supplier(),...s})):[];
    if(Array.isArray(o.selectedPassports)&&o.selectedPassports.length===3)d.selectedPassports=o.selectedPassports.map(id=>typeof id==='string'?id:null);
    d.planningStart=validDate(o.planningStart)?o.planningStart:'';
    d.planningDays=Number.isInteger(o.planningDays)&&o.planningDays>=1&&o.planningDays<=365?o.planningDays:1;
    const c=o.clearance||{};d.clearance={...d.clearance,...c,fresh:{...sample(),...c.fresh},aged:{...sample(),...c.aged}};
    return d;
  }
  function passportReview(p){
    const rows=metrics.map(m=>{
      const value=p.assay?.[m.key],contract=p.contract?.[m.key],plant=p.plant?.[m.key];
      const cNA=p.contractNA?.includes(m.key),pNA=p.plantNA?.includes(m.key);
      const invalid=value!==null&&(!number(value)||(['bsw','asphaltenes'].includes(m.key)&&value>100));
      const limitsInvalid=(!cNA&&contract!==null&&!number(contract))||(!pNA&&plant!==null&&!number(plant));
      const above=number(value)&&((!cNA&&number(contract)&&value>contract)||(!pNA&&number(plant)&&value>plant));
      const complete=number(value)&&(cNA||number(contract))&&(pNA||number(plant));
      return {...m,value,contract,plant,cNA,pNA,status:invalid||limitsInvalid||above?'fail':complete?'pass':'pending'};
    });
    const metadata=text(p.name)&&text(p.supplier)&&validDate(p.assayDate)&&text(p.reference)&&text(p.limitReference)&&typeof p.temperature==='number'&&Number.isFinite(p.temperature)&&p.temperature>-273.15;
    return {rows,status:rows.some(r=>r.status==='fail')?'fail':metadata&&rows.every(r=>r.status==='pass')?'pass':'pending',metadata};
  }
  function supplierReview(s,ops){
    const p=ops.passports.find(p=>p.id===s.passportId);
    const matches=p&&p.type===s.type&&typeof s.name==='string'&&typeof p.supplier==='string'&&p.supplier.trim().toLowerCase()===s.name.trim().toLowerCase();
    const quality=matches?passportReview(p).status:'pending';
    const volume=number(s.volume)&&s.volume>0&&s.volumeConfirmed===true;
    const arrival=validDate(s.arrival)&&s.slotConfirmed===true;
    return {quality,volume,arrival,status:quality==='fail'?'fail':quality==='pass'&&volume&&arrival?'pass':'pending'};
  }
  function deliveryPlan(ops,result){
    const valid=validDate(ops.planningStart)&&Number.isInteger(ops.planningDays)&&ops.planningDays>=1&&ops.planningDays<=365&&result.valid;
    const end=valid?addDays(ops.planningStart,ops.planningDays-1):'';
    const rows=['H','SH','L'].map((type,i)=>{
      const required=valid?result.daily[i]*ops.planningDays:null;
      const confirmed=ops.suppliers.filter(s=>s.type===type&&s.role==='primary'&&s.passportId===ops.selectedPassports[i]&&supplierReview(s,ops).status==='pass'&&valid&&s.arrival>=ops.planningStart&&s.arrival<=end).reduce((sum,s)=>sum+s.volume,0);
      return {type,required,confirmed,shortfall:valid?Math.max(0,required-confirmed):null};
    });
    return {valid,end,rows,covered:valid&&rows.every(r=>r.shortfall===0)};
  }
  function sampleReview(s,c){
    const checks=[
      {label:'Compatibility',status:s.compatibility==='fail'?'fail':s.compatibility==='pass'?'pass':'pending'},
      {label:'Outlet salt <2 PTB',status:s.salt===null?'pending':number(s.salt)&&s.salt<2?'pass':'fail'},
      {label:'Outlet BS&W <0.05%',status:s.bsw===null?'pending':number(s.bsw)&&s.bsw<0.05?'pass':'fail'},
      ...[['tan','TAN','tanLimit'],['metal','Ni + V','metalLimit']].map(([key,label,limit])=>({label,status:s[key]===null||c[limit]===null?'pending':number(s[key])&&number(c[limit])&&s[key]<=c[limit]?'pass':'fail'})),
      {label:'Test date & report',status:validDate(s.date)&&text(s.reference)?'pass':'pending'}
    ];
    return {checks,status:checks.some(x=>x.status==='fail')?'fail':checks.every(x=>x.status==='pass')?'pass':'pending'};
  }
  function release(ops,state,result){
    const c=ops.clearance,fresh=sampleReview(c.fresh,c),aged=sampleReview(c.aged,c),plan=deliveryPlan(ops,result);
    const selected=state.cargo.map((cargo,i)=>{
      if(!result.valid||state.ratios[i]===0)return {type:cargo.code,status:result.valid?'pass':'pending'};
      const p=ops.passports.find(p=>p.id===ops.selectedPassports[i]);
      const match=p&&p.type===cargo.code&&p.supplier===cargo.supplier&&p.assay.salt===cargo.salt&&p.assay.bsw===cargo.bsw;
      return {type:cargo.code,status:match?passportReview(p).status:'pending'};
    });
    const passportStatus=selected.some(x=>x.status==='fail')?'fail':selected.every(x=>x.status==='pass')?'pass':'pending';
    const approval=c.approval==='fail'?'fail':c.approval==='pass'&&text(c.approvedBy)&&validDate(c.approvedAt)&&text(c.approvalRef)?'pass':'pending';
    const gates=[{label:'Predicted salt screening',status:result.valid?(result.saltPass?'pass':'fail'):'pending'},
      {label:'Selected cargo passports',status:passportStatus},{label:'Fresh sample tests',status:fresh.status},
      {label:'Aged sample tests',status:aged.status},{label:'Confirmed primary supply',status:plan.covered?'pass':'pending'},
      {label:'Recorded plant approval',status:approval}];
    const internalValid=number(c.internalTarget)&&c.internalTarget>0&&c.internalTarget<2;
    const internalMet=internalValid&&number(c.fresh.salt)&&number(c.aged.salt)&&c.fresh.salt<=c.internalTarget&&c.aged.salt<=c.internalTarget;
    return {gates,fresh,aged,plan,selected,internalValid,internalMet,status:gates.some(g=>g.status==='fail')?'blocked':gates.every(g=>g.status==='pass')?'cleared':'pending'};
  }
  function resetApproval(ops){Object.assign(ops.clearance,{approval:'pending',approvedBy:'',approvedAt:'',approvalRef:''});}
  function resetTests(ops){ops.clearance.fresh=sample();ops.clearance.aged=sample();resetApproval(ops);}
  return {metrics,defaults,passport,supplier,normalize,passportReview,supplierReview,deliveryPlan,sampleReview,release,resetApproval,resetTests,validDate,addDays,clone};
});
