const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,digest,sourceHash,save,invoke,read,rpc,receipt}=require('./transport.cjs');
const {bounds,args,configuration,check}=require('./scenario.cjs');
async function main(){
 assert(await rpc('eth_chainId',[])==='0xf22f','Gasless StudioNet only');
 const revision=fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim();
 assert(/^[a-f0-9]{40}$/.test(revision),'Pinned revision');
 const suite=[];
 for(const id of Object.keys(bounds)){
  const a=args(id,revision),web=await fetch(a[2],{signal:AbortSignal.timeout(45000)});
  assert(web.ok&&digest(Buffer.from(await web.arrayBuffer()))===a[3],'Exact public report');
  const deployment=await invoke(id+'-deployment',['deploy','--contract','contracts/regret_cart.py','--args',...a.map(v=>typeof v==='string'?v:JSON.stringify(v))]);
  const r=await receipt(id+'-deployment',deployment,true),contract=r.to_address||r.recipient;
  const d={id,args:a,contract,deployment,sender:(r.from_address||r.sender).toLowerCase(),fixture_revision:revision,source_sha256:sourceHash,network:'studionet',chain_id:61999};
  assert(fs.readFileSync(path.join(root,'contracts/regret_cart.py')).equals(Buffer.from(await rpc('gen_getContractCode',[contract]),'base64')),'Exact live source');
  const initial=await read(id+'-initial',['call',contract,'get_state']);
  assert(equal(initial,{configuration:configuration(a),evidence:{},result:{status:'UNSOLVED'}}),'Exact initial state');save(id+'-initial-state',initial);
  const transaction=await invoke(id+'-solve',['write',contract,'solve']);await receipt(id+'-solve',transaction,true);
  const state=await read(id+'-state',['call',contract,'get_state']);check(id,state);save(id+'-final-state',state);
  d.solve=transaction;
  if(id==='correlated'){
   d.repeat=await invoke(id+'-repeat',['write',contract,'solve']);const rejected=await receipt(id+'-repeat',d.repeat,false);
   const raw=Buffer.from(rejected.consensus_data.leader_receipt[0].result,'base64');
   assert(raw[0]===1&&raw.subarray(1).toString('utf8')==='[EXPECTED] Plan already solved','Exact repeat rejection');
   assert(equal(state,await read(id+'-repeat-state',['call',contract,'get_state'])),'Repeat atomicity');
  }
  suite.push(d);save('suite',suite);console.log('VERIFIED',id,JSON.stringify(state.result.selection||state.result));
 }
}
main().catch(e=>{console.error(e.stack,e.cause?.message||'');process.exitCode=1;});
