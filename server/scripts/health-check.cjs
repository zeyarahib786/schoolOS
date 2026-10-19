const [raw]=process.argv.slice(2);
(async()=>{
  const url=new URL(raw||'http://127.0.0.1:4000');
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw Error('Provide a public HTTPS API origin or a local HTTP origin');
  const checks=[];
  for(const path of ['/health','/ready']){
    const started=Date.now();
    const response=await fetch(new URL(path,url),{signal:AbortSignal.timeout(5000),redirect:'error'});
    const body=await response.json();
    checks.push({path,status:response.status,latencyMs:Date.now()-started,ready:path==='/ready'?body.status==='ready'&&body.db===true:body.status==='ok'});
  }
  console.log(JSON.stringify({status:checks.every(c=>c.status===200&&c.ready)?'passed':'failed',checks}));
  if(checks.some(c=>c.status!==200||!c.ready))process.exitCode=1;
})().catch(()=>{console.error('Health verification failed; check API reachability and readiness');process.exitCode=1;});
