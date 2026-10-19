const assert=require('assert'),fs=require('fs/promises'),path=require('path'),os=require('os'),http=require('http'),{spawn}=require('child_process');
(async()=>{
  const root=path.resolve(__dirname,'../..'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'schoolos-nginx-check-'));
  const api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify({path:req.url,message:'fictional '.repeat(400)}));});
  await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
  let nginx;
  try {
    const config=(await fs.readFile(path.join(root,'client/nginx.conf'),'utf8')).replace('listen 80;','listen 127.0.0.1:5183;').replace('/usr/share/nginx/html',path.join(root,'client/dist')).replace('http://api:4000','http://127.0.0.1:'+api.address().port);
    const main=path.join(dir,'nginx.conf');
    await fs.writeFile(main,`pid ${dir}/nginx.pid; error_log stderr; events {} http { access_log off; client_body_temp_path ${dir}/body; proxy_temp_path ${dir}/proxy; fastcgi_temp_path ${dir}/fastcgi; uwsgi_temp_path ${dir}/uwsgi; scgi_temp_path ${dir}/scgi; types {text/html html; application/javascript js; text/css css; image/svg+xml svg;} ${config} }`);
    nginx=spawn(process.env.SCHOOLOS_NGINX_PATH||'nginx',['-p',dir,'-c',main,'-g','daemon off;'],{stdio:['ignore','ignore','pipe']});
    let startupError='';nginx.stderr.on('data',chunk=>{startupError+=chunk});nginx.on('error',error=>{startupError+=error.message});
    const base='http://127.0.0.1:5183';let ready=false;
    for(let n=0;n<50;n++){try{ready=(await fetch(base)).ok;if(ready)break}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
    if(!ready)throw Error('Nginx startup failed: '+startupError);
    const assets=await fs.readdir(path.join(root,'client/dist/assets'));
    const runtime=assets.find(name=>/^schoolos-runtime-.*\.js$/.test(name));
    const hashed=await fetch(base+'/assets/'+runtime);
    assert.strictEqual(hashed.headers.get('content-encoding'),'gzip');
    assert(/max-age=31536000/.test(hashed.headers.get('cache-control')));
    assert.strictEqual(hashed.headers.get('x-content-type-options'),'nosniff');
    assert.strictEqual(hashed.headers.get('x-frame-options'),'DENY');
    const bytes=await hashed.text();assert(bytes.length>1000000&&/[\u0600-\u06ff]/.test(bytes));
    const html=await fetch(base+'/index.html');assert.strictEqual(html.headers.get('cache-control'),'no-cache');
    const css=await fetch(base+'/assets/css/09-polish-responsive.css');assert(css.ok);assert.strictEqual(css.headers.get('cache-control'),'no-cache');
    const route=await fetch(base+'/school/workspace');assert(route.ok);assert.strictEqual(await route.text(),await html.text());
    const proxy=await fetch(base+'/api/v1/fixture');assert.strictEqual(proxy.headers.get('cache-control'),'private, no-store');
    assert.strictEqual((await proxy.json()).path,'/api/v1/fixture');
    console.log(JSON.stringify({status:'passed',checks:9,coverage:['gzip UTF-8 runtime','hashed asset cache lifetime','security header inheritance','entry HTML revalidation','stable CSS revalidation','SPA fallback','same-origin API proxy','private API cache policy','decoded Arabic bytes']}));
  }finally{
    if(nginx&&nginx.pid&&nginx.exitCode===null){const exited=new Promise(resolve=>nginx.once('exit',resolve));nginx.kill('SIGQUIT');await exited;}
    await new Promise(resolve=>api.close(resolve));await fs.rm(dir,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
