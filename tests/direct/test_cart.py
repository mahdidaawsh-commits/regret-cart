import ast
import hashlib
import itertools
import json
from pathlib import Path
import random
import re
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'contracts/regret_cart.py'
REPO = 'mahdidaawsh-commits/regret-cart'
BOUNDS = {'correlated':[0,8,0,8,8,8], 'rectangular':[0,8,0,8,0,16],
          'unknown':[0,8,0,8,4,-1], 'conflict':[0,2,0,2,7,8]}

def pure():
    tree = ast.parse(SOURCE.read_text())
    tree.body = [x for x in tree.body if isinstance(x,(ast.FunctionDef,ast.Assign)) or isinstance(x,ast.Import)]
    namespace = {}
    exec(compile(tree,str(SOURCE),'exec'),namespace)
    return namespace

def record(name):
    body = (ROOT/'records'/f'{name}.json').read_bytes()
    return f'https://raw.githubusercontent.com/{REPO}/'+ 'a'*40 + f'/records/{name}.json',hashlib.sha256(body).hexdigest(),body

def args(name='correlated'):
    return [REPO,'market-day',*record(name)[:2],[0,0],[2,3],[1,1],[3,12],3,8]

def rows(name='correlated'):
    fields = pure()['FIELDS']
    anchor = 0 if name=='unknown' else 1
    return {'rows':[{'field':f,'value':v,'anchors':[2 if i>=4 and name!='unknown' else (1 if i>=4 else anchor)]} for i,(f,v) in enumerate(zip(fields,BOUNDS[name]))]}

def mocks(vm,name='correlated',decision=None,audit=None,body=None,status=200):
    vm.clear_mocks()
    url,_,raw=record(name)
    vm.mock_web(re.escape(url),{'status':status,'body':raw if body is None else body})
    vm.mock_llm(r'.*REGRETCART-EXTRACT.*',json.dumps(rows(name) if decision is None else decision))
    vm.mock_llm(r'.*REGRETCART-AUDIT.*',json.dumps({'decisions_correct':True,'anchors_support':True} if audit is None else audit))

@pytest.mark.parametrize('name',list(BOUNDS))
def test_four_terminal_outcomes(direct_deploy,direct_vm,name):
    cart=direct_deploy(str(SOURCE),*args(name))
    mocks(direct_vm,name)
    cart.solve()
    assert direct_vm.run_validator() is True
    state=cart.get_state()
    expected=pure()['optimize'](state['configuration'],BOUNDS[name])
    assert state['result']==expected
    assert state['evidence']['source']==json.loads(record(name)[2])
    with direct_vm.expect_revert('Plan already solved'): cart.solve()

@pytest.mark.parametrize('index',range(6))
def test_validator_rejects_changed_material_bound(direct_deploy,direct_vm,index):
    cart=direct_deploy(str(SOURCE),*args())
    mocks(direct_vm);cart.solve()
    changed=rows();changed['rows'][index]['value']+=1
    mocks(direct_vm,decision=changed)
    assert direct_vm.run_validator() is False

@pytest.mark.parametrize('verdict',[{'decisions_correct':False,'anchors_support':True},
    {'decisions_correct':True,'anchors_support':False}, {'decisions_correct':'true','anchors_support':True},
    {'decisions_correct':True,'anchors_support':True,'extra':True}])
def test_validator_requires_substantive_anchor_audit(direct_deploy,direct_vm,verdict):
    cart=direct_deploy(str(SOURCE),*args());mocks(direct_vm);cart.solve()
    mocks(direct_vm,audit=verdict)
    assert direct_vm.run_validator() is False

@pytest.mark.parametrize('mutation',['bool','float','string','negative','oversize','anchor','missing','extra','order'])
def test_malformed_model_cannot_commit(direct_deploy,direct_vm,mutation):
    cart=direct_deploy(str(SOURCE),*args());bad=rows()
    if mutation in ('bool','float','string','negative','oversize'):
        bad['rows'][0]['value']={'bool':True,'float':0.0,'string':'0','negative':-2,'oversize':13}[mutation]
    elif mutation=='anchor':bad['rows'][0]['anchors']=[99]
    elif mutation=='missing':bad['rows'].pop()
    elif mutation=='extra':bad['rows'][0]['untrusted']='extra'
    else:bad['rows'].reverse()
    mocks(direct_vm,decision=bad)
    with direct_vm.expect_revert('Invalid bound rows'):cart.solve()
    assert cart.get_state()['result']=={'status':'UNSOLVED'}

@pytest.mark.parametrize('status,body,error',[(200,b'changed','commitment mismatch'),(404,None,'commitment mismatch'),(503,None,'Report unavailable')])
def test_source_failure_is_atomic(direct_deploy,direct_vm,status,body,error):
    cart=direct_deploy(str(SOURCE),*args());mocks(direct_vm,body=body,status=status)
    with direct_vm.expect_revert(error):cart.solve()
    assert cart.get_state()['evidence']=={}

@pytest.mark.parametrize('index,value',[(0,'bad'),(1,'bad period'),(2,'https://example.com/x'),(3,'x'*64),
    (4,[7,0]),(5,[0,1]),(6,[-1,0]),(7,[1,21]),(8,13),(9,-1)])
def test_constructor_bounds(direct_deploy,direct_vm,index,value):
    values=args();values[index]=value
    with direct_vm.expect_revert():direct_deploy(str(SOURCE),*values)

def independent(config,bounds):
    # Independent decision-table formulation: pairwise opportunity losses, no contract helpers.
    orders=[list(q) for q in itertools.product(range(13),repeat=2)
            if sum(q)<=config['capacity'] and sum(q[i]*config['purchase'][i] for i in range(2))<=config['budget']]
    demands=[list(d) for d in itertools.product(range(13),repeat=2) if all(
        bounds[2*i]<=d[i]<=bounds[2*i+1] for i in range(2)) and bounds[4]<=sum(d)<=bounds[5]]
    def cost(q,d):
        total=sum(q[i]*config['purchase'][i] for i in range(2))
        for i in range(2):
            delta=config['stock'][i]+q[i]-d[i]
            total+=config['holding'][i]*delta if delta>=0 else config['shortage'][i]*(-delta)
        return total
    keys=[]
    for q in orders:
        regret=max(cost(q,d)-cost(alternative,d) for d in demands for alternative in orders)
        keys.append((regret,max(cost(q,d) for d in demands),sum(q),q))
    best=min(keys)
    return {'order':best[3],'max_regret':best[0],'worst_cost':best[1]}

@pytest.mark.parametrize('seed',range(12))
def test_optimizer_against_pairwise_regret_oracle(seed):
    rng=random.Random(seed);f=pure()
    for _ in range(12):
        lo=[rng.randrange(4),rng.randrange(4)]
        hi=[rng.randrange(lo[i],6) for i in range(2)]
        bounds=[lo[0],hi[0],lo[1],hi[1],sum(lo),sum(hi)]
        config={'stock':[rng.randrange(3),rng.randrange(3)],'purchase':[rng.randrange(1,5),rng.randrange(1,5)],
                'holding':[rng.randrange(3),rng.randrange(3)],'shortage':[rng.randrange(1,10),rng.randrange(1,10)],
                'capacity':rng.randrange(5),'budget':rng.randrange(13)}
        actual=f['optimize'](config,bounds);expected=independent(config,bounds)
        assert all(actual['selection'][k]==v for k,v in expected.items())
        for profile in actual['profiles']:
            witness=profile['witness']
            assert witness['cost']-witness['hindsight_cost']==profile['max_regret']>=0
            assert sum(witness['hindsight_order'])<=config['capacity']

@pytest.mark.parametrize('name',list(BOUNDS))
def test_js_oracle_matches_all_direct_scenarios(direct_deploy,direct_vm,tmp_path,name):
    cart=direct_deploy(str(SOURCE),*args(name));mocks(direct_vm,name);cart.solve()
    samples=[{'id':name,'state':cart.get_state()}]
    file=tmp_path/'snapshots.json';file.write_text(json.dumps(samples))
    subprocess.run(['node',str(ROOT/'scripts/check-snapshots.cjs'),str(file)],check=True)

@pytest.mark.parametrize('body',[
    b'{"period":"market-day","period":"market-day","clauses":["A sufficiently long source clause."]}',
    b'{"period":"wrong-period","clauses":["A sufficiently long source clause."]}',
    b'{"period":"market-day","clauses":[]}',b'not json',b'X'*16001])
def test_committed_malformed_report_rejected(direct_deploy,direct_vm,body):
    a=args();a[3]=hashlib.sha256(body).hexdigest()
    cart=direct_deploy(str(SOURCE),*a);mocks(direct_vm,body=body)
    with direct_vm.expect_revert():cart.solve()
    assert cart.get_state()['result']['status']=='UNSOLVED'

def test_validator_never_equates_unknown_and_zero(direct_deploy,direct_vm):
    cart=direct_deploy(str(SOURCE),*args('unknown'));mocks(direct_vm,'unknown');cart.solve()
    changed=rows('unknown');changed['rows'][5]['value']=0
    mocks(direct_vm,'unknown',decision=changed)
    assert direct_vm.run_validator() is False

def test_joint_constraint_changes_selected_order():
    a=args();c=dict(stock=a[4],purchase=a[5],holding=a[6],shortage=a[7],capacity=a[8],budget=a[9])
    f=pure()['optimize']
    assert f(c,BOUNDS['correlated'])['selection']['order']==[1,2]
    assert f(c,BOUNDS['rectangular'])['selection']['order']==[0,1]

@pytest.mark.parametrize('capacity,budget',[(0,0),(12,0),(0,108),(12,108)])
def test_capacity_and_budget_extremes(capacity,budget):
    c=dict(stock=[6,6],purchase=[1,9],holding=[0,9],shortage=[1,20],capacity=capacity,budget=budget)
    r=pure()['optimize'](c,[0,12,0,12,0,24])
    assert r['status']=='PLANNED' and r['demand_count']==169
    for p in r['profiles']:
        assert sum(p['order'])<=capacity
        assert sum(p['order'][j]*c['purchase'][j] for j in range(2))<=budget
