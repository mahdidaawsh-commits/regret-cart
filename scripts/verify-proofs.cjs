const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,digest,rpc,read,receiptSummary,save}=require('./transport.cjs');
const {decodeReceipt}=require('./receipt-calldata.cjs');
const {bounds,args,configuration,check}=require('./scenario.cjs');
const load=n=>JSON.parse(fs.readFileSync(path.join(root,'proofs',n+'.json')));
async function main(){
 const offline=process.argv.includes('--offline'),suite=load('suite'),journal=load('transactions');
 const code=fs.readFileSync(path.join(root,'contracts/regret_cart.py')),revision=fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim();
 assert(suite.length===4&&journal.source_sha256===digest(code),'Complete source-bound suite');
 if(!offline)assert(await rpc('eth_chainId',[])==='0xf22f','StudioNet only');
 const hashes=new Set(),summary={mode:offline?'offline-artifact':'fresh-rpc-and-state',verified_at:new Date().toISOString(),source_sha256:digest(code),instances:[],transactions:[]};
 for(let i=0;i<suite.length;i++){
  const d=suite[i],id=Object.keys(bounds)[i];
  assert(d.id===id&&d.network==='studionet'&&d.chain_id===61999&&d.source_sha256===digest(code)&&d.fixture_revision===revision&&equal(d.args,args(id,revision)),'Fixed deployed configuration');
  for(const kind of ['deployment','solve',...(d.repeat?['repeat']:[])]){
   const label=id+'-'+kind,hash=d[kind],saved=load(label+'-receipt'),r=offline?saved:await rpc('eth_getTransactionByHash',[hash]),s=receiptSummary(r);
   assert(!hashes.has(hash)&&journal.hashes[label]===hash,'Distinct journaled call');hashes.add(hash);
   assert(s.hash===hash&&s.status==='FINALIZED'&&s.result==='MAJORITY_AGREE'&&s.agree>(s.agree+s.disagree+s.idle)/2,'Finalized strict consensus majority');
   assert((r.to_address||r.recipient).toLowerCase()===d.contract.toLowerCase()&&(r.from_address||r.sender).toLowerCase()===d.sender,'Actual sender and target');
   assert(equal(saved.data,r.data)&&equal(saved.consensus_data.votes,r.consensus_data.votes),'Saved calldata and votes unchanged');
   assert(equal(await decodeReceipt(r),kind==='deployment'?{args:d.args}:{method:'solve',args:[]}),'Decoded actual invocation');
   assert(kind==='repeat'?s.execution==='ERROR':['SUCCESS','FINISHED_WITH_RETURN'].includes(s.execution),'Expected execution result');
   if(kind==='deployment')assert(code.equals(Buffer.from(r.data.contract_code,'base64')),'Exact deployment bytes');
   if(kind==='repeat'){const raw=Buffer.from(r.consensus_data.leader_receipt[0].result,'base64');assert(raw[0]===1&&raw.subarray(1).toString('utf8')==='[EXPECTED] Plan already solved','Exact rejection bytes');}
   summary.transactions.push({label,...s});
  }
  assert(equal(load(id+'-initial-state'),{configuration:configuration(d.args),evidence:{},result:{status:'UNSOLVED'}}),'Initial state');
  const state=load(id+'-final-state');assert(equal(state.configuration,configuration(d.args)),'Frozen configuration');check(id,state);
  if(!offline){assert(code.equals(Buffer.from(await rpc('gen_getContractCode',[d.contract]),'base64')),'Live contract source');assert(equal(state,await read(id+'-fresh-final',['call',d.contract,'get_state'])),'Fresh state match');}
  summary.instances.push({id,contract:d.contract,status:state.result.status,selection:state.result.selection});
 }
 assert(hashes.size===9&&Object.keys(journal.hashes).length===9,'Exactly nine planned receipts');summary.transaction_calldata_checked=true;summary.rejection_bytes_checked=true;
 if(!offline){summary.live_state_match=true;save('verification',summary);}console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
