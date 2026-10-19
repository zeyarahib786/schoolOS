const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
async function list(dir,prefix=''){
  const result=[];
  for(const entry of await fs.readdir(path.join(dir,prefix),{withFileTypes:true})){
    const relative=path.posix.join(prefix,entry.name);
    if(entry.isSymbolicLink()||/^(\.env(?:\.|$)|.*\.(p12|pfx|pem|key))$/i.test(entry.name))throw Error('Forbidden secret/symlink in release inputs');
    if(entry.isDirectory())result.push(...await list(dir,relative));else if(entry.isFile())result.push(relative);
  }return result.sort();
}
async function packageRelease(output,sourceRoot=root){
  const root=path.resolve(sourceRoot);
  output=path.resolve(output);
  if(output===root||output.startsWith(root+path.sep))throw Error('Release artifacts belong outside the source tree');
  const build=JSON.parse(await fs.readFile(path.join(root,'client/dist/build-info.json'),'utf8'));
  if(build.format!==1||typeof build.apiBase!=='string')throw Error('Missing build metadata');
  if(build.apiBase!=='/api/v1'){
    const api=new URL(build.apiBase);
    if(api.protocol!=='https:'||api.username||api.password||api.search||api.hash||['localhost','127.0.0.1','[::1]'].includes(api.hostname))throw Error('Frontend must target a production HTTPS API or /api/v1');
  }
  await fs.access(path.join(root,'server/dist/server.js'));
  await list(path.join(root,'client/dist'));
  await list(path.join(root,'server/dist'));
  await list(path.join(root,'server/assets'));
  await fs.mkdir(output,{recursive:false});
  await fs.cp(path.join(root,'client/dist'),path.join(output,'frontend'),{recursive:true});
  await fs.mkdir(path.join(output,'backend'));
  await fs.cp(path.join(root,'server/dist'),path.join(output,'backend/dist'),{recursive:true,filter:source=>!source.startsWith(path.join(root,'server/dist/seed'))});
  await fs.cp(path.join(root,'server/assets'),path.join(output,'backend/assets'),{recursive:true});
  for(const file of ['package.json','package-lock.json'])await fs.copyFile(path.join(root,'server',file),path.join(output,'backend',file));
  await fs.mkdir(path.join(output,'backend/scripts'));
  for(const file of ['backup.cjs','health-check.cjs','preflight.cjs'])await fs.copyFile(path.join(root,'server/scripts',file),path.join(output,'backend/scripts',file));
  const files={};
  for(const file of await list(output))files[file]=crypto.createHash('sha256').update(await fs.readFile(path.join(output,file))).digest('hex');
  const manifest={format:1,releaseId:crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,24),createdAt:new Date().toISOString(),apiBase:build.apiBase,files};
  await fs.writeFile(path.join(output,'release.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
  return manifest;
}
async function verifyRelease(output){
  const manifest=JSON.parse(await fs.readFile(path.join(output,'release.json'),'utf8')),files={};
  for(const file of (await list(output)).filter(file=>file!=='release.json'))files[file]=crypto.createHash('sha256').update(await fs.readFile(path.join(output,file))).digest('hex');
  if(manifest.format!==1||JSON.stringify(files)!==JSON.stringify(manifest.files))throw Error('Release package integrity failed');
  return manifest;
}
module.exports={packageRelease,verifyRelease};
if(require.main===module)(async()=>{
  const [command,output]=process.argv.slice(2);if(!output)throw Error('Usage: release-package.cjs prepare|verify OUTPUT_DIRECTORY');
  const manifest=command==='prepare'?await packageRelease(output):command==='verify'?await verifyRelease(output):null;
  if(!manifest)throw Error('Unknown release command');
  console.log(JSON.stringify({status:'verified',releaseId:manifest.releaseId,files:Object.keys(manifest.files).length,apiBase:manifest.apiBase}));
})().catch(error=>{console.error(error.message);process.exitCode=1});
