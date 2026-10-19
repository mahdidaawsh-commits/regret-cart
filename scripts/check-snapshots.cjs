const fs=require('node:fs'),{check}=require('./scenario.cjs');
for(const {id,state} of JSON.parse(fs.readFileSync(process.argv[2])))check(id,state);
console.log('Independent JS decision-table oracle checked all snapshots');
