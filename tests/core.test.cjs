const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../practice-core');
const rows = require('../darts_checkout_2_180_do_mo.json');

test('JSON covers 2–180 once and every nonempty route is legal; empty means impossible', () => {
  assert.deepEqual(rows.map(r=>r.score), Array.from({length:179},(_,i)=>i+2));
  for(const [mode,key] of [['sep_double','doubleOut'],['fat_master','masterOutFatBull']]){
    for(const row of rows){
      const route = row[key].route.map(Core.normalize);
      if(route.length) assert.ok(Core.validRoute(row.score, route, mode), `${mode} ${row.score}: ${route}`);
      else assert.equal(Core.generatedRoute(row.score,mode),null,`${mode} ${row.score} missing route`);
      assert.equal(row[key].routeText, row[key].route.length ? row[key].route.join(' → ') : '—');
    }
  }
});
test('DO inner bull, MO triple, SO single, and SB mode restrictions',()=>{
  assert.ok(Core.validRoute(170,['T20','T20','BULL'],'sep_double'));
  assert.ok(Core.validRoute(65,['SB','D20'],'sep_double'));
  assert.ok(Core.validRoute(60,['T20'],'fat_master'));
  assert.ok(Core.validRoute(15,['S15'],'fat_single'));
  assert.equal(Core.validRoute(60,['T20'],'sep_double'),false);
  assert.equal(Core.validRoute(65,['SB','D20'],'fat_master'),false);
});
test('invalid tokens, wrong sums, premature finishes, four darts and busts are rejected',()=>{
  for(const route of [['D','D','D14'],['D1','D4'],['D4','S1'],['S1','S1','S1','D3'],['<img>']]) assert.equal(Core.validRoute(9,route,'sep_double'),false);
  assert.equal(Core.outcome(40,['T20'],'sep_double').reason,'bust');
  assert.equal(Core.outcome(3,['S2'],'sep_double').reason,'bust');
  assert.equal(Core.outcome(40,['S20','S20'],'sep_double').reason,'finish-rule');
  assert.equal(Core.outcome(40,['MISS','MISS','MISS'],'sep_double').reason,'unfinished');
  assert.equal(Core.outcome(40,['S20'],'sep_double').done,false);
});
test('score bands exclude bogeys and every generated fallback is valid',()=>{
  const doScores=Core.candidates(121,170,'sep_double');
  assert.equal(doScores.length,43);
  for(const score of [159,162,163,165,166,168,169]) assert.ok(!doScores.includes(score));
  assert.ok(doScores.includes(170));
  assert.equal(Core.candidates(121,170,'fat_master').length,47);
  for(const mode of Core.MODES) for(const score of Core.candidates(2,180,mode)) assert.ok(Core.validRoute(score,Core.generatedRoute(score,mode),mode));
  assert.deepEqual(Core.candidates(171,180,'sep_double'),[]);
  for(const [a,b] of [[0,180],[2,181],[50,40],[2.5,30]]) assert.deepEqual(Core.candidates(a,b,'sep_double'),[]);
});
test('review preference, ordinary practice, previous exclusion, and single-score bands',()=>{
  const stats={121:{review:true},122:{review:false}};
  assert.equal(Core.select([121,122,123],stats,true,null,()=>0),121);
  assert.equal(Core.select([121,122,123],stats,false,null,()=>0.5),122);
  assert.equal(Core.select([121,122],stats,true,121,()=>0),122);
  assert.equal(Core.select([121],stats,true,121,()=>0),121);
  assert.equal(Core.select([],stats,true,null),null);
});
test('miss arrangements respect two remaining darts, bull rules and busts',()=>{
 const plans=Core.missPlans(121,['T20','T11','D14'],'sep_double');
 const single=plans.find(p=>p.actual==='S20');
 assert.equal(single.remaining,101);
 assert.ok(single.route.length<=2);
 assert.ok(Core.validRoute(101,single.route,'sep_double'));
 const miss=plans.find(p=>p.actual==='MISS');
 assert.equal(miss.route,null);
 assert.ok(Core.validRoute(121,miss.nextTurn,'sep_double'));
 assert.equal(Core.generatedRoute(170,'sep_double',2),null);
 const bull=Core.missPlans(50,['BULL'],'sep_double').find(p=>p.actual==='SB');
 assert.equal(bull.remaining,25);
 assert.ok(Core.validRoute(25,bull.route,'sep_double'));
 assert.ok(!Core.missPlans(50,['BULL'],'fat_master').some(p=>p.actual==='SB'));
 assert.ok(Core.missPlans(2,['D1'],'sep_double').some(p=>p.reason==='bust'));
});
test('sequential order starts at the bottom, skips impossible scores and wraps',()=>{
 const scores=Core.candidates(158,164,'sep_double');
 assert.deepEqual(scores,[158,160,161,164]);
 assert.equal(Core.nextSequential(scores,null),158);
 assert.equal(Core.nextSequential(scores,158),160);
 assert.equal(Core.nextSequential(scores,164),158);
 assert.equal(Core.nextSequential([40],40),40);
 assert.equal(Core.nextSequential([],null),null);
});
