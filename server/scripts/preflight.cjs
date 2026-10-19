const fs=require('fs/promises'),path=require('path'),{execFile}=require('child_process'),{promisify}=require('util');
const {productionPreflight}=require('../dist/config/preflight');
(async()=>{
  const [buildDirectory,origin]=process.argv.slice(2);
  if(!buildDirectory||!origin)throw Error('Usage: preflight.cjs FRONTEND_BUILD PUBLIC_HTTPS_ORIGIN [--online]');
  const build=JSON.parse(await fs.readFile(path.join(buildDirectory,'build-info.json'),'utf8'));
  if(build.format!==1||typeof build.apiBase!=='string')throw Error('Unsupported build metadata');
  const report=productionPreflight(process.env,build,origin);
  try{await promisify(execFile)('openssl',['version'],{timeout:5000});report.crypto='available';}
  catch{report.crypto='unavailable';report.core.issues.push('OPENSSL');}
  if(process.env.PDF_SIGNING_P12_PATH){
    try{
      const {nativeSigningIdentity}=require('../dist/utils/pdfSigner');
      await nativeSigningIdentity(await fs.readFile(process.env.PDF_SIGNING_P12_PATH),process.env.PDF_SIGNING_P12_PASSPHRASE||'');
      report.integrations.signing.status='validated-not-live-verified';
    }catch{report.integrations.signing.status='invalid';report.core.issues.push('PDF_SIGNING_IDENTITY');}
  }
  if(process.argv.includes('--online')&&!report.core.issues.length){
    const {mongo}=require('mongoose'),client=new mongo.MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});
    try{
      await client.connect();const hello=await client.db().admin().command({hello:1},{timeoutMS:1500});
      if(!((hello.setName&&hello.isWritablePrimary)||hello.msg==='isdbgrid'))throw Error();
      report.database='transaction-capable';
    }catch{report.database='unavailable';report.core.issues.push('MONGO_READINESS');}
    finally{await client.close();}
  }
  report.core.status=report.core.issues.length?'blocked':'configured';
  console.log(JSON.stringify(report,null,2));
  if(report.core.issues.length)process.exitCode=1;
})().catch(()=>{console.error('Preflight could not read/validate build configuration; no secret values are printed');process.exitCode=1});
