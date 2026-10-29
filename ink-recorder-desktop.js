/* Desktop recorder: renders the SAME verified mobile ink shader at a higher resolution. */
(() => {
  'use strict';
  const canvas=document.getElementById('ink');
  const status=document.getElementById('status');
  const startButton=document.getElementById('record');
  const resolution=document.getElementById('resolution');
  const fpsSelect=document.getElementById('fps');
  const download=document.getElementById('download');
  const rate=document.getElementById('rate');
  const progress=document.getElementById('progress');
  const setStatus=message=>{status.textContent=message};
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!gl){setStatus('WebGL is unavailable in this browser. Try Chrome or Edge with hardware acceleration enabled.');return;}
  const vertex='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r;
uniform float t;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float n=0.,a=.5;
  for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p+13.7;a*=.5;}
  return n;
}
void main(){
  vec2 uv=gl_FragCoord.xy/r.xy;
  vec2 p=(uv-.5)*vec2(r.x/r.y,1.);
  float tt=t;
  vec2 q=vec2(fbm(p*2.3+vec2(tt*.18,-tt*.13)),
              fbm(p*2.3+vec2(-tt*.14,tt*.12)+3.));
  vec2 warped=p+vec2(q.x-.5,q.y-.5)*.55;
  float a=fbm(warped*3.5+vec2(tt*.21,-tt*.12));
  float b=noise(warped*6.4-vec2(tt*.20,tt*.13)+vec2(8.,3.));
  float v=a*.73+b*.27;
  float envelope=pow(max(0.,1.-length(p*vec2(.72,1.05))*.85),.8);
  float clouds=smoothstep(.34,.73,v);
  float edges=smoothstep(.51,.76,v)-smoothstep(.77,.93,v);
  float density=(clouds*.38+edges*.26)*envelope;
  float breath=.93+.09*sin(tt*.32);
  vec3 color=vec3(.012)+vec3(density*breath);
  float vignette=1.-smoothstep(.45,1.4,length(p*vec2(.95,1.)));
  color*=mix(.36,1.,vignette);
  gl_FragColor=vec4(color,1.);
}`;
  function compile(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      setStatus('Shader error: '+gl.getShaderInfoLog(s));return null;
    }
    return s;
  }
  const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);
  if(!v||!f)return;
  const program=gl.createProgram();
  gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){setStatus('Shader link error: '+gl.getProgramInfoLog(program));return;}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const resLoc=gl.getUniformLocation(program,'r');
  const timeLoc=gl.getUniformLocation(program,'t');
  let raf=0,rolling=0,frames=0,lastSample=performance.now();
  let recordActive=false,stopTimer=null,recordStart=0,recorder=null,stream=null;
  const creation=performance.now();
  function setResolution(){
    if(recordActive)return;
    const [w,h]=resolution.value.split('x').map(Number);
    canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
    gl.uniform2f(resLoc,w,h);
    setStatus('Original mobile ink shader is running at '+w+' × '+h+'. Select Record 10 seconds to export.');
  }
  resolution.addEventListener('change',setResolution);
  setResolution();
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();cancelAnimationFrame(raf);
    setStatus('WebGL context was lost. Try 720p or switch browser. Your homepage has not been changed.');
    startButton.disabled=true;
  },{once:true});
  function render(now){
    raf=requestAnimationFrame(render);
    if(document.hidden&&!recordActive)return;
    gl.uniform1f(timeLoc,(now-creation)/1000);
    gl.drawArrays(gl.TRIANGLES,0,6);
    frames++;
    if(now-lastSample>=1200){
      rolling=Math.round(frames*1000/(now-lastSample));
      rate.textContent=rolling+' FPS rendering';
      frames=0;lastSample=now;
    }
    if(recordActive){
      progress.textContent='Recording: '+Math.min(10,(now-recordStart)/1000).toFixed(1)+' / 10 s';
    }
  }
  raf=requestAnimationFrame(render);
  const supported=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp8','video/webm'].find(type=>
    typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported(type));
  if(!canvas.captureStream||!supported){
    setStatus('Preview is working, but this browser cannot record the canvas. Try Chrome or Edge on desktop.');
    startButton.disabled=true;return;
  }
  startButton.disabled=false;
  startButton.addEventListener('click',()=>{
    if(recordActive)return;
    const fps=Number(fpsSelect.value);
    const width=canvas.width;
    const mime=supported;
    let newRecorder,recordStream;
    try{
      recordStream=canvas.captureStream(fps);
      const bitrate=width>=1920?14000000:8000000;
      newRecorder=new MediaRecorder(recordStream,{mimeType:mime,videoBitsPerSecond:bitrate});
    }catch(e){setStatus('Video recording failed to start: '+e.message+'. Try 720p in Chrome.');return;}
    if(download.href.startsWith('blob:'))URL.revokeObjectURL(download.href);
    download.removeAttribute('href');download.hidden=true;
    const chunks=[];
    recordActive=true;recordStart=performance.now();recorder=newRecorder;stream=recordStream;
    startButton.disabled=true;resolution.disabled=true;fpsSelect.disabled=true;
    setStatus('Recording the exact mobile shader at '+canvas.width+' × '+canvas.height+'; '+fps+' FPS requested. Keep this browser tab visible.');
    newRecorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    newRecorder.onerror=e=>{setStatus('Recording failed: '+(e.error?.message||'unknown error'))};
    newRecorder.onstop=()=>{
      recordActive=false;
      clearTimeout(stopTimer);
      recordStream.getTracks().forEach(t=>t.stop());
      resolution.disabled=false;fpsSelect.disabled=false;startButton.disabled=false;
      const videoType=newRecorder.mimeType||mime;
      const ext=videoType.includes('mp4')?'mp4':'webm';
      const blob=new Blob(chunks,{type:videoType});
      if(blob.size<1000){setStatus('Recording was empty. Try Chrome or Edge and select 720p.');return;}
      download.href=URL.createObjectURL(blob);
      download.download='009fly_original_mobile_shader_desktop_'+canvas.width+'x'+canvas.height+'_10s.'+ext;
      download.hidden=false;
      progress.textContent='10-second recording complete';
      setStatus('Video ready: '+(blob.size/1048576).toFixed(1)+' MB, '+ext.toUpperCase()+
        '. Download it and upload it here for optimization and seamless looping.');
    };
    try{newRecorder.start(200)}catch(e){
      recordActive=false;startButton.disabled=false;resolution.disabled=false;fpsSelect.disabled=false;
      recordStream.getTracks().forEach(t=>t.stop());setStatus('Recording error: '+e.message);return;
    }
    stopTimer=setTimeout(()=>{if(newRecorder.state==='recording')newRecorder.stop();},10000);
  });
})();