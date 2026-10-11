const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn}=require('child_process');
const root=__dirname, token=crypto.randomBytes(24).toString('hex'), jobs=new Map();
const work=path.join(root,'作業データ');fs.mkdirSync(work,{recursive:true});
let busy=false;
const json=(r,status,obj)=>{r.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});r.end(JSON.stringify(obj));};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(403);return res.end();}
 if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=Shift_JIS','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(root,'MKVからMP4.html')).toString('latin1').replace('SESSION_TOKEN',token),'latin1');}
 if(url.searchParams.get('token')!==token)return json(res,403,{error:'接続が無効です。画面を開き直してください。'});
 if(req.method==='POST'&&url.pathname==='/shutdown'){for(const job of jobs.values())if(job.child)job.child.kill();json(res,200,{ok:true});server.close();setTimeout(()=>process.exit(0),300);return;}
 if(req.method==='POST'&&url.pathname==='/convert'){
  if(busy)return json(res,409,{error:'ほかの変換が実行中です。'});
  const name=url.searchParams.get('name')||'';if(!/\.mkv$/i.test(name))return json(res,400,{error:'MKVファイルを選択してください。'});
  busy=true;const id=crypto.randomUUID(),dir=path.join(work,id);fs.mkdirSync(dir);const input=path.join(dir,'input.mkv'),output=path.join(dir,'output.mp4');
  const job={id,dir,output,name:path.basename(name).replace(/\.mkv$/i,'.mp4'),state:'upload',seconds:0,duration:0,log:''};jobs.set(id,job);
  const dest=fs.createWriteStream(input);let failed=false;
  const fail=()=>{if(failed)return;failed=true;busy=false;job.state='error';job.error='読み込みに失敗しました。ディスクの空き容量を確認してください。';dest.destroy();fs.rm(input,{force:true},()=>{});if(!res.headersSent)json(res,400,{error:job.error});};
  req.on('aborted',fail);dest.on('error',fail);req.pipe(dest);
  dest.on('finish',()=>{
   if(failed)return;job.state='running';
   const args=['-hide_banner','-nostdin','-y','-i',input,'-map','0:v:0','-map','0:a:0?','-sn','-dn'];
   if(url.searchParams.get('mode')==='copy')args.push('-c','copy');else args.push('-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:a','aac','-b:a','192k');
   args.push('-movflags','+faststart','-progress','pipe:1','-nostats',output);
   const child=spawn(path.join(root,'ffmpeg.exe'),args,{windowsHide:true});job.child=child;
   let pending='';child.stdout.on('data',d=>{pending+=d.toString();const lines=pending.split('\n');pending=lines.pop();for(const line of lines){const m=/^out_time_us=(\d+)/.exec(line);if(m)job.seconds=Number(m[1])/1e6;}});
   child.stderr.on('data',d=>{job.log=(job.log+d.toString()).slice(-6000);const m=/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(job.log);if(m)job.duration=+m[1]*3600 + +m[2]*60 + +m[3];});
   child.on('error',e=>{job.error=e.message;job.state='error';busy=false;});
   child.on('close',code=>{busy=false;delete job.child;if(job.state!=='cancelled'){job.state=code===0?'done':'error';if(code!==0)job.error='変換できませんでした。高速変換の場合は通常変換をお試しください。';}fs.rm(input,{force:true},()=>{});if(job.state!=='done')fs.rm(output,{force:true},()=>{});});
   json(res,200,{id});
  });return;
 }
 const job=jobs.get(url.searchParams.get('id'));if(!job)return json(res,404,{error:'変換データが見つかりません。'});
 if(req.method==='GET'&&url.pathname==='/status')return json(res,200,{state:job.state,seconds:job.seconds,duration:job.duration,error:job.error,log:job.state==='error'?job.log:undefined});
 if(req.method==='POST'&&url.pathname==='/cancel'){if(job.child){job.state='cancelled';job.child.kill();}return json(res,200,{ok:true});}
 if(req.method==='GET'&&url.pathname==='/download'&&job.state==='done'){res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':fs.statSync(job.output).size,'Content-Disposition':`attachment; filename="video.mp4"; filename*=UTF-8''${encodeURIComponent(job.name)}`});return fs.createReadStream(job.output).pipe(res);}
 json(res,404,{error:'操作できません。'});
});
server.listen(0,'127.0.0.1',()=>{const url=`http://127.0.0.1:${server.address().port}/`;fs.writeFileSync(path.join(root,'起動URL.txt'),url);console.log(url);});
