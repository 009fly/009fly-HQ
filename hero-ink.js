/* 009fly / atmospheric smoke and liquid ink: desktop pointer + mobile touch repulsion */
(() => {
  const hero = document.querySelector('.hero');
  const canvas = hero?.querySelector('.hero-ink-atmosphere canvas');
  if (!hero || !canvas) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return; // Keep the static charcoal fallback and honor accessibility preference.
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false, powerPreference:'low-power'});
  if (!gl) return;
  const vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragment = `
precision mediump float;
uniform vec2 r;
uniform float t;
uniform vec2 mouse;
uniform float force;
uniform float active;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float n=0.,a=.5;
  for(int i=0;i<5;i++){n+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p+13.7;a*=.5;}
  return n;
}
void main(){
  vec2 uv=gl_FragCoord.xy/r.xy;
  vec2 p=(uv-.5)*vec2(r.x/r.y,1.);
  float tt=t;
  vec2 q=vec2(fbm(p*2.3+vec2(tt*.09,-tt*.07)),fbm(p*2.3+vec2(-tt*.08,tt*.06)+3.));
  vec2 warped=p+vec2(q.x-.5,q.y-.5)*.53;
  vec2 mp=(mouse-.5)*vec2(r.x/r.y,1.);
  vec2 delta=warped-mp;
  float dist=length(delta);
  float influence=active*force*exp(-pow(dist/.35,2.)*1.6);
  vec2 away=delta/max(dist,.001);
  warped-=away*influence*.29;
  float a=fbm(warped*3.5+vec2(tt*.115,-tt*.07));
  float b=fbm(warped*6.4-vec2(tt*.12,tt*.07)+vec2(8.,3.));
  float c=fbm(warped*12.+vec2(tt*.08,-tt*.1));
  float envelope=pow(max(0.,1.-length(p*vec2(.72,1.05))*.85),.8);
  float clouds=smoothstep(.37,.76,a*.68+b*.27+c*.1);
  float edges=smoothstep(.53,.76,a*.71+b*.24+c*.05)-smoothstep(.75,.95,a*.7+b*.3);
  float density=(clouds*.35+edges*.27)*envelope;
  float core=active*force*exp(-pow(dist/.20,2.)*2.);
  density*=1.-core*.92;
  float breath=.94+.08*sin(tt*.24);
  vec3 color=vec3(.012)+vec3(density*breath);
  float vignette=1.-smoothstep(.45,1.4,length(p*vec2(.95,1.)));
  color*=mix(.36,1.,vignette);
  gl_FragColor=vec4(color,1.);
}`;
  const compile = (type, code) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('009fly ink shader compile:',gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const v=compile(gl.VERTEX_SHADER,vertex), f=compile(gl.FRAGMENT_SHADER,fragment);
  if(!v||!f)return;
  const program=gl.createProgram();
  gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  gl.useProgram(program);
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'p');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const ur=gl.getUniformLocation(program,'r'), ut=gl.getUniformLocation(program,'t'),
        um=gl.getUniformLocation(program,'mouse'), uf=gl.getUniformLocation(program,'force'),
        ua=gl.getUniformLocation(program,'active');
  let mx=.5,my=.5,tx=.5,ty=.5,energy=0,activity=0;
  let lastX=.5,lastY=.5,last=performance.now(),visible=true,raf=0,frameCount=0;
  const touchPoint = (x,y) => {
    const rect=hero.getBoundingClientRect();
    tx=Math.max(0,Math.min(1,(x-rect.left)/rect.width));
    ty=Math.max(0,Math.min(1,1-(y-rect.top)/rect.height));
    const movement=Math.hypot(tx-lastX,ty-lastY);
    energy=Math.min(1.5,energy+movement*14+.12);
    lastX=tx;lastY=ty;activity=1;
  };
  hero.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'||e.pointerType==='pen')touchPoint(e.clientX,e.clientY);
  },{passive:true});
  hero.addEventListener('pointerleave',e=>{
    if(e.pointerType!=='touch')activity=0;
  },{passive:true});
  // Passive touch listeners let scrolling work normally while fingers push the smoke.
  hero.addEventListener('touchstart',e=>{
    if(e.touches.length===1)touchPoint(e.touches[0].clientX,e.touches[0].clientY);
  },{passive:true});
  hero.addEventListener('touchmove',e=>{
    if(e.touches.length===1)touchPoint(e.touches[0].clientX,e.touches[0].clientY);
  },{passive:true});
  hero.addEventListener('touchend',()=>{activity=0},{passive:true});
  hero.addEventListener('touchcancel',()=>{activity=0},{passive:true});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting},{threshold:0.01});
  observer.observe(hero);
  const started=performance.now();
  const mobile=matchMedia('(max-width:800px)').matches;
  const scale=mobile?.63:.78; // intentionally render at lower resolution for battery and thermal efficiency
  const cap=mobile?1:1.25;
  function render(now){
    raf=requestAnimationFrame(render);
    if(!visible||document.hidden)return;
    // 30fps on phones, up to 60fps on desktop
    if(mobile && (++frameCount%2!==0))return;
    const dt=Math.min(.05,(now-last)/1000);last=now;
    mx+=(tx-mx)*Math.min(1,dt*12);
    my+=(ty-my)*Math.min(1,dt*12);
    energy*=Math.exp(-dt*1.8);
    const rect=hero.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,cap);
    const w=Math.max(1,Math.floor(rect.width*dpr*scale)),h=Math.max(1,Math.floor(rect.height*dpr*scale));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    gl.uniform2f(ur,w,h);
    gl.uniform1f(ut,(now-started)/1000);
    gl.uniform2f(um,mx,my);
    gl.uniform1f(uf,Math.max(.5,Math.min(1.5,energy)));
    gl.uniform1f(ua,activity);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  raf=requestAnimationFrame(render);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect()},{once:true});
})();
