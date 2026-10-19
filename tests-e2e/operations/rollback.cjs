const assert=require('assert'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {prepare,activate,verify}=require('../../client/scripts/static-release.cjs');
(async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'schoolos-rollback-drill-'));
  try {
    const a=path.join(temp,'build-a'),b=path.join(temp,'build-b'),root=path.join(temp,'hosting');
    for(const [dir,name,content]of[[a,'index-12345678.js','old'],[b,'index-87654321.js','new']]){
      await fs.mkdir(path.join(dir,'assets'),{recursive:true});
      await fs.writeFile(path.join(dir,'index.html'),content);
      await fs.writeFile(path.join(dir,'assets',name),content);
      await fs.writeFile(path.join(dir,'assets','stable.css'),content);
    }
    const old=await prepare(a,root);await activate(root,old.id);
    const next=await prepare(b,root);await activate(root,next.id);
    assert.strictEqual(await fs.readFile(path.join(root,'current/index.html'),'utf8'),'new');
    assert.strictEqual(await fs.readFile(path.join(root,'current/assets/index-12345678.js'),'utf8'),'old');
    const rollback=await activate(root,old.id);
    assert.strictEqual(await fs.readFile(path.join(root,'current/index.html'),'utf8'),'old');
    assert.strictEqual(await fs.readFile(path.join(root,'current/assets/stable.css'),'utf8'),'old');
    assert.strictEqual(await fs.readFile(path.join(root,'current/assets/index-87654321.js'),'utf8'),'new');
    await fs.writeFile(path.join(root,'releases',next.id,'index.html'),'tampered');
    await assert.rejects(verify(path.join(root,'releases',next.id)),/integrity/);
    await assert.rejects(activate(root,next.id),/integrity/);
    assert.strictEqual(await fs.readlink(path.join(root,'current')),'releases/'+rollback.id);
    await assert.rejects(activate(root,'../../unsafe'),/Invalid/);
    console.log(JSON.stringify({status:'passed',checks:9,coverage:['atomic release switch','retained hashed assets','HTML rollback','stable CSS rollback','new cached chunks survive rollback','checksum verification','rejected tampered activation','unchanged current on failure','path traversal refusal']}));
  }finally{await fs.rm(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
