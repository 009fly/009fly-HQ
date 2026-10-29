/* 009fly Hero Ink V2: ambient-only, optimized 30fps rendering */
(() => {
  const hero = document.querySelector('.hero');
  const canvas = hero?.querySelector('.hero-ink-atmosphere canvas');
  if (!hero || !canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false, powerPreference:'low-power'});
  if (!gl) return; // CSS smoke fallback remains visible.
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); canvas.style.display='none'; }, {once:true});
  const vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
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
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      console.warn('Hero ink shader unavailable:',gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);return null;
    }
    return shader;
  }
  const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);
  if(!v||!f){canvas.style.display='none';return;}
  const program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){canvas.style.display='none';return;}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(program,'p');
  gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  const res=gl.getUniformLocation(program,'r'),clock=gl.getUniformLocation(program,'t');
  const mobile=matchMedia('(max-width:800px)').matches;
  const scale=mobile?.48:.58;
  const start=performance.now();
  let lastFrame=-Infinity,raf=0,visible=false,disposed=false;
  function draw(now){
    raf=0;
    if(!visible || disposed || document.hidden)return;
    if(now-lastFrame>=33){
      lastFrame=now;
      const rect=hero.getBoundingClientRect();
      const w=Math.max(1,Math.floor(rect.width*scale));
      const h=Math.max(1,Math.floor(rect.height*scale));
      if(canvas.width!==w||canvas.height!==h){
        canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
      }
      gl.uniform2f(res,w,h);
      gl.uniform1f(clock,(now-start)/1000);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    raf=requestAnimationFrame(draw);
  }
  function sync(){
    if(disposed)return;
    if(visible&&!document.hidden){if(!raf)raf=requestAnimationFrame(draw);}
    else if(raf){cancelAnimationFrame(raf);raf=0;}
  }
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;sync();
  },{threshold:.01});
  observer.observe(hero);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{
    disposed=true;cancelAnimationFrame(raf);observer.disconnect();
    document.removeEventListener('visibilitychange',sync);
  },{once:true});
})();
