const assert=require('assert'),fs=require('fs/promises'),os=require('os'),path=require('path'),crypto=require('crypto'),{spawnSync}=require('child_process');
const server=path.resolve(__dirname,'../../server');
(async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'schoolos-preflight-check-'));
  const access=crypto.randomBytes(32).toString('hex'),refresh=crypto.randomBytes(32).toString('hex');
  const env={...process.env,NODE_ENV:'production',LOG_LEVEL:'error',MONGO_URI:'mongodb://127.0.0.1:1/isolated_not_connected',JWT_ACCESS_SECRET:access,JWT_REFRESH_SECRET:refresh,CORS_ALLOWED_ORIGINS:'https://school.example.invalid',NOTIFICATIONS_ENABLED:'false',SMS_PROVIDER:'disabled',PDF_SIGNING_P12_PATH:'',PDF_SIGNING_P12_PASSPHRASE:''};
  const check=extra=>{
    const result=spawnSync(process.execPath,[path.join(server,'scripts/preflight.cjs'),dir,'https://school.example.invalid'],{env:{...env,...extra},encoding:'utf8',timeout:10000});
    assert(!result.error,result.error?.message);assert(!result.stdout.includes(access)&&!result.stdout.includes(refresh));
    return {code:result.status,report:JSON.parse(result.stdout)};
  };
  try{
    await fs.writeFile(path.join(dir,'build-info.json'),JSON.stringify({format:1,apiBase:'https://api.example.invalid/api/v1'}));
    const valid=check({});assert.strictEqual(valid.code,0);assert.strictEqual(valid.report.mode,'offline-configuration-check');assert.strictEqual(valid.report.integrations.email.status,'deferred');
    const incomplete=check({NOTIFICATIONS_ENABLED:'true',RESEND_API_KEY:'',RESEND_FROM_EMAIL:'',RESEND_WEBHOOK_SECRET:''});assert.strictEqual(incomplete.code,1);assert(incomplete.report.core.issues.includes('RESEND_API_KEY'));
    const invalid=path.join(dir,'fictional-invalid.p12');await fs.writeFile(invalid,'fictional invalid identity',{mode:0o600});
    const signing=check({PDF_SIGNING_P12_PATH:invalid});assert.strictEqual(signing.code,1);assert(signing.report.core.issues.includes('PDF_SIGNING_IDENTITY'));assert(!JSON.stringify(signing.report).includes(invalid));
    const started=Date.now(),seed=spawnSync(process.execPath,[path.join(server,'dist/seed/seed.js')],{cwd:server,env,encoding:'utf8',timeout:5000});
    assert.strictEqual(seed.status,1);assert((seed.stdout+seed.stderr).includes('Fictional demo seeding is disabled in production'));assert(Date.now()-started<4000);
    console.log(JSON.stringify({status:'passed',checks:5,coverage:['offline core configuration','deferred provider truthfulness','enabled incomplete provider refusal','invalid certificate redaction','production demo seeding refusal before database connection']}));
  }finally{await fs.rm(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1});
