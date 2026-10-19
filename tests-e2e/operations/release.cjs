const assert=require('assert'),fs=require('fs/promises'),path=require('path'),os=require('os');
const {packageRelease,verifyRelease}=require('../../client/scripts/release-package.cjs');
(async()=>{
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'schoolos-release-check-'));
  try{
    const root=path.join(temporary,'source'),out=path.join(temporary,'release');
    for(const dir of ['client/dist','server/dist/seed','server/assets','server/scripts'])await fs.mkdir(path.join(root,dir),{recursive:true});
    await fs.writeFile(path.join(root,'client/dist/index.html'),'<!doctype html>fixture');
    await fs.writeFile(path.join(root,'client/dist/build-info.json'),JSON.stringify({format:1,apiBase:'http://localhost:4000/api/v1'}));
    await fs.writeFile(path.join(root,'server/dist/server.js'),'// fictional server');
    await fs.writeFile(path.join(root,'server/dist/seed/seed.js'),'// fictional seed');
    await fs.writeFile(path.join(root,'server/.env'),'FICTIONAL_SECRET_MUST_NOT_SHIP');
    for(const file of ['package.json','package-lock.json'])await fs.writeFile(path.join(root,'server',file),'{}');
    for(const file of ['backup.cjs','health-check.cjs','preflight.cjs'])await fs.writeFile(path.join(root,'server/scripts',file),'// operator fixture');
    await assert.rejects(packageRelease(out,root),/production HTTPS/);
    await fs.writeFile(path.join(root,'client/dist/build-info.json'),JSON.stringify({format:1,apiBase:'https://api.example.invalid/api/v1'}));
    const manifest=await packageRelease(out,root);await verifyRelease(out);
    assert(!Object.keys(manifest.files).some(file=>file.includes('/seed/')||file.includes('.env')));
    assert(!JSON.stringify(manifest).includes('FICTIONAL_SECRET'));
    await assert.rejects(packageRelease(path.join(root,'new-output'),root),/outside/);
    await fs.writeFile(path.join(out,'frontend/index.html'),'corrupted');
    await assert.rejects(verifyRelease(out),/integrity/);
    await fs.symlink(path.join(root,'server/.env'),path.join(root,'client/dist/leaked.txt'));
    await assert.rejects(packageRelease(path.join(temporary,'unsafe'),root),/Forbidden/);
    console.log(JSON.stringify({status:'passed',checks:6,coverage:['localhost build refusal','verified complete package','secret/demo exclusion','source tree output refusal','tamper detection','symlink input refusal']}));
  }finally{await fs.rm(temporary,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1});
