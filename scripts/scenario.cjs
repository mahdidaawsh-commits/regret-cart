const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),repo='mahdidaawsh-commits/regret-cart';
const fields=['amber_min','amber_max','blue_min','blue_max','total_min','total_max'];
const bounds={correlated:[0,8,0,8,8,8],rectangular:[0,8,0,8,0,16],unknown:[0,8,0,8,4,-1],conflict:[0,2,0,2,7,8]};
const equal=(a,b)=>JSON.stringify(normal(a))===JSON.stringify(normal(b));
function normal(x){return Array.isArray(x)?x.map(normal):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normal(x[k])])):x;}
function assert(x,m){if(!x)throw Error(m);}
function args(id,rev){const body=fs.readFileSync(path.join(root,'records',id+'.json'));return [repo,'market-day',`https://raw.githubusercontent.com/${repo}/${rev}/records/${id}.json`,crypto.createHash('sha256').update(body).digest('hex'),[0,0],[2,3],[1,1],[3,12],3,8];}
function configuration(a){return {repository:a[0],period:a[1],url:a[2],sha256:a[3],stock:a[4],purchase:a[5],holding:a[6],shortage:a[7],capacity:a[8],budget:a[9]};}
function oracle(c,b){
 if(b.includes(-1))return {status:'REVIEW',unknown:fields.filter((_,i)=>b[i]===-1)};
 const demands=[],orders=[];
 for(let x=0;x<=12;x++)for(let y=0;y<=12;y++){
  if(x>=b[0]&&x<=b[1]&&y>=b[2]&&y<=b[3]&&x+y>=b[4]&&x+y<=b[5])demands.push([x,y]);
  if(x+y<=c.capacity&&x*c.purchase[0]+y*c.purchase[1]<=c.budget)orders.push([x,y]);
 }
 if(!demands.length)return {status:'INCONSISTENT',demand_count:0};
 function cost(q,d){let v=0;for(let j=0;j<2;j++){
  v+=q[j]*c.purchase[j];const available=c.stock[j]+q[j];
  v+=d[j]>available?(d[j]-available)*c.shortage[j]:(available-d[j])*c.holding[j];
 }return v;}
 const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
 const profiles=orders.map(q=>{
  let maxRegret=-1,worstCost=0,witness;
  for(const d of demands){
   const alternatives=orders.map(p=>({q:p,cost:cost(p,d)})).sort((a,b)=>compare([a.cost,a.q[0]+a.q[1],...a.q],[b.cost,b.q[0]+b.q[1],...b.q]));
   const own=cost(q,d),best=alternatives[0],regret=own-best.cost;
   if(regret>maxRegret){maxRegret=regret;witness={demand:d,cost:own,hindsight_order:best.q,hindsight_cost:best.cost};}
   worstCost=Math.max(worstCost,own);
  }
  return {order:q,max_regret:maxRegret,worst_cost:worstCost,witness};
 });
 const ranked=[...profiles].sort((a,b)=>compare([a.max_regret,a.worst_cost,a.order[0]+a.order[1],...a.order],[b.max_regret,b.worst_cost,b.order[0]+b.order[1],...b.order]));
 return {status:'PLANNED',demand_count:demands.length,action_count:orders.length,selection:ranked[0],profiles};
}
function check(id,state){
 assert(equal(state.result,oracle(state.configuration,bounds[id])),'Exact independent optimizer result '+id);
 const source=JSON.parse(fs.readFileSync(path.join(root,'records',id+'.json')));
 assert(equal(state.evidence.source,source),'Complete fetched source '+id);
 assert(state.evidence.rows?.length===6,'Six agreed bounds');
 state.evidence.rows.forEach((r,i)=>{
  assert(r.field===fields[i]&&r.value===bounds[id][i]&&Array.isArray(r.anchors)&&r.anchors.length>0,'Expected semantic bound '+fields[i]);
  assert(r.anchors.every(a=>Number.isInteger(a)&&a>=0&&a<source.clauses.length)&&equal(r.anchors,[...new Set(r.anchors)].sort((a,b)=>a-b)),'Valid source anchors');
 });
}
module.exports={root,repo,fields,bounds,args,configuration,oracle,check,equal,assert};
