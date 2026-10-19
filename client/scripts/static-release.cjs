const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const HASHED = /^[^/]+-[A-Za-z0-9_-]{8,}\.(js|css)$/;
const ID = /^[a-f0-9]{24}$/;
async function files(root, prefix='') {
  const result=[];
  for(const entry of await fs.readdir(path.join(root,prefix),{withFileTypes:true})){
    const relative=path.posix.join(prefix,entry.name);
    if(entry.isSymbolicLink()||entry.name.startsWith('.env'))throw Error('Release inputs cannot contain symlinks or environment files');
    if(entry.isDirectory())result.push(...await files(root,relative));
    else if(entry.isFile()&&relative!=='_release.json')result.push(relative);
  }
  return result.sort();
}
async function checksums(root){
  const result={};
  for(const file of await files(root))result[file]=crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
  return result;
}
async function verify(root){
  const manifest=JSON.parse(await fs.readFile(path.join(root,'_release.json'),'utf8'));
  if(manifest.format!==1||!ID.test(manifest.id)||JSON.stringify(await checksums(root))!==JSON.stringify(manifest.files))throw Error('Release integrity verification failed');
  return manifest;
}
async function current(root){
  try {
    const target=await fs.readlink(path.join(root,'current'));
    if(!/^releases\/[a-f0-9]{24}$/.test(target))throw Error('Current release must be a managed relative symlink');
    return path.join(root,target);
  } catch(error){if(error.code==='ENOENT')return null;throw error;}
}
async function prepare(source,root){
  source=path.resolve(source);root=path.resolve(root);
  if(root===source||root.startsWith(source+path.sep)||source.startsWith(root+path.sep))throw Error('Release storage and source must be separate directories');
  await fs.access(path.join(source,'index.html'));
  await fs.mkdir(path.join(root,'releases'),{recursive:true});
  const id=crypto.randomBytes(12).toString('hex'), destination=path.join(root,'releases',id);
  await files(source); // Reject unsafe inputs before copying.
  await fs.cp(source,destination,{recursive:true,errorOnExist:true,force:false});
  const previous=await current(root);
  if(previous){
    await verify(previous);
    // Cached older entry HTML can still request its content-hashed assets after a switch.
    for(const file of await fs.readdir(path.join(previous,'assets'))){
      if(!HASHED.test(file))continue;
      const target=path.join(destination,'assets',file);
      try {await fs.copyFile(path.join(previous,'assets',file),target,require('fs').constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}
    }
  }
  const manifest={format:1,id,createdAt:new Date().toISOString(),files:await checksums(destination)};
  await fs.writeFile(path.join(destination,'_release.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
  return manifest;
}
async function activate(root,id){
  if(!ID.test(id))throw Error('Invalid release ID');
  root=path.resolve(root);
  const previous=await current(root); // Never overwrite an unmanaged directory/file.
  let destination=path.join(root,'releases',id),manifest=await verify(destination);
  if(manifest.id!==id)throw Error('Release identity mismatch');
  if(previous){
    await verify(previous);
    const missing=[];
    for(const file of await fs.readdir(path.join(previous,'assets'))){
      if(!HASHED.test(file))continue;
      try{await fs.access(path.join(destination,'assets',file));}catch(error){if(error.code==='ENOENT')missing.push(file);else throw error;}
    }
    if(missing.length){
      // Rollback must also serve chunks requested by entry HTML cached during the newer release.
      const requestedId=id;id=crypto.randomBytes(12).toString('hex');
      const clone=path.join(root,'releases',id);
      await fs.cp(destination,clone,{recursive:true,errorOnExist:true,force:false});
      await fs.rm(path.join(clone,'_release.json'));
      for(const file of missing)await fs.copyFile(path.join(previous,'assets',file),path.join(clone,'assets',file));
      destination=clone;
      manifest={format:1,id,requestedId,createdAt:new Date().toISOString(),files:await checksums(destination)};
      await fs.writeFile(path.join(destination,'_release.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
    }
  }
  const temporary=path.join(root,'.current-'+crypto.randomBytes(8).toString('hex'));
  try {await fs.symlink('releases/'+id,temporary);await fs.rename(temporary,path.join(root,'current'));}
  finally {await fs.rm(temporary,{force:true});}
  return manifest;
}
module.exports={prepare,activate,verify};
if(require.main===module)(async()=>{
  const [command,first,second]=process.argv.slice(2);
  let manifest;
  if(command==='prepare'&&first&&second)manifest=await prepare(first,second);
  else if(command==='activate'&&first&&second)manifest=await activate(first,second);
  else if(command==='verify'&&first)manifest=await verify(first);
  else throw Error('Usage: static-release.cjs prepare BUILD RELEASE_ROOT | activate RELEASE_ROOT ID | verify RELEASE_DIRECTORY');
  console.log(JSON.stringify({status:'verified',command,id:manifest.id,files:Object.keys(manifest.files).length}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
