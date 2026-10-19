// Fresh bounded Jest processes prevent accumulation across the full integration corpus.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(path.join(root,'tests')).filter(file=>file.endsWith('.test.ts')).sort().map(file=>'tests/'+file);
const out=fs.mkdtempSync(path.join(os.tmpdir(),'schoolos-integration-'));
let failed=false,passed=0,tests=0;
for(let start=0;start<files.length;start+=8){
  const report=path.join(out,'batch-'+start+'.json');
  const result=spawnSync(process.execPath,[path.join(root,'node_modules/jest/bin/jest.js'),'--selectProjects','integration','--runInBand','--runTestsByPath',...files.slice(start,start+8),'--json','--outputFile',report],{cwd:root,stdio:'inherit',env:process.env});
  failed=failed||result.status!==0;
  if(fs.existsSync(report)){const data=JSON.parse(fs.readFileSync(report,'utf8'));passed+=data.numPassedTests;tests+=data.numTotalTests;}
}
const summary={suites:files.length,passedTests:passed,totalTests:tests,status:failed?'failed':'passed',reports:out};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));
process.exitCode=failed?1:0;
