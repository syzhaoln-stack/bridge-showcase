import * as THREE from '../C01_偏载与支承/vendor/three.module.js';
import {OrbitControls} from '../C01_偏载与支承/vendor/controls/OrbitControls.js';
import {collapseTimeAtProgress,progressAtCollapseTime,collapseClock,blockPose,approachPose,pierState,shipAdvance} from './key-collapse.mjs';
export const dimensions=Object.freeze({backspan:721.5*.3048,mainspan:1200*.3048,deckWidth:(61+2/12)*.3048,shipLength:299.9,shipWidth:48.2,shipDraft:12.15,displacementTonnes:112383});
const V=(x,y,z)=>new THREE.Vector3(x,z,-y),clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const energyMJ=knots=>.5*dimensions.displacementTonnes*1000*(knots*1852/3600)**2/1e6;
export function makeModel(host,labelHost){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#050c19');scene.fog=new THREE.Fog('#07101e',3600,7200);
 const camera=new THREE.PerspectiveCamera(36,1,.5,10000),renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;Object.assign(renderer.domElement.style,{width:'100%',height:'100%',display:'block'});host.append(renderer.domElement);
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=18;orbit.maxDistance=6000;orbit.maxPolarAngle=Math.PI*.49;
 // Nighttime palette; fill light is for legibility, not a measured illumination reconstruction.
 scene.add(new THREE.HemisphereLight('#aac7e4','#13223b',1.45));const sun=new THREE.DirectionalLight('#b8cee5',1.25);sun.position.set(-500,950,700);scene.add(sun);const fill=new THREE.DirectionalLight('#e8bc79',.40);fill.position.set(300,120,-400);scene.add(fill);
 const mats={steel:new THREE.MeshStandardMaterial({color:'#6b8580',roughness:.64,metalness:.35}),chord:new THREE.MeshStandardMaterial({color:'#3c6467',roughness:.55,metalness:.35}),concrete:new THREE.MeshStandardMaterial({color:'#b6b3a3',roughness:.96}),road:new THREE.MeshStandardMaterial({color:'#434b4c',roughness:1}),orange:new THREE.MeshStandardMaterial({color:'#d7723d',roughness:.6}),white:new THREE.MeshStandardMaterial({color:'#e9e6d9'}),dark:new THREE.MeshStandardMaterial({color:'#1f343c'}),glass:new THREE.MeshStandardMaterial({color:'#1f687e',metalness:.65,roughness:.2}),yellow:new THREE.MeshStandardMaterial({color:'#e5bf61'}),rubber:new THREE.MeshStandardMaterial({color:'#292e2e'})};
 for(const mat of [mats.steel,mats.chord])mat.color.multiplyScalar(1.2); // 20% linear-light lift for nighttime structural legibility.
 const boxGeo=new THREE.BoxGeometry(1,1,1),cylGeo=new THREE.CylinderGeometry(1,1,1,10);
 function box(parent,x,y,z,l,w,h,mat){const o=new THREE.Mesh(boxGeo,mat);o.position.copy(V(x,y,z));o.scale.set(l,h,w);parent.add(o);return o}
 function member(parent,a,b,r,mat){const A=V(...a),B=V(...b),o=new THREE.Mesh(cylGeo,mat);o.position.copy(A.clone().add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());o.scale.set(r,A.distanceTo(B),r);parent.add(o);return o}
 function line(parent,points,color,dashed=false){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>V(...p))),o=new THREE.Line(g,dashed?new THREE.LineDashedMaterial({color,dashSize:10,gapSize:8}):new THREE.LineBasicMaterial({color}));if(dashed)o.computeLineDistances();parent.add(o);return o}
 const labels=[];function label(text,point,category='all'){const el=document.createElement('div');el.className='label3d';el.textContent=text;labelHost.append(el);labels.push({el,p:V(...point),category});}
 const water=new THREE.Mesh(new THREE.PlaneGeometry(20000,20000,1,1),new THREE.MeshStandardMaterial({color:'#081a2e',roughness:.32,metalness:.55}));water.name='river-water';water.rotation.x=-Math.PI/2;water.position.y=-.1;scene.add(water);
 const bed=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshStandardMaterial({color:'#7b8b80'}));bed.name='river-bed';bed.rotation.x=-Math.PI/2;bed.position.y=-17;bed.visible=false;scene.add(bed); // Opaque water hides the uncalibrated bed; no exposed finite-plane edge.
 for(let i=-700;i<800;i+=55)line(scene,[[-800,i,.08],[800,i+35,.08]],'#102d44');
 // Context only: banks are deliberately outside the dimensioned central model.
 box(scene,-1010,0,-3,180,1800,12,new THREE.MeshStandardMaterial({color:'#17212c'}));box(scene,1010,0,-3,180,1800,12,new THREE.MeshStandardMaterial({color:'#17212c'}));
 const channel=new THREE.Group();channel.name='teaching-channel';scene.add(channel);for(const x of [-106.68,106.68])line(channel,[[x,-650,.4],[x,800,.4]],'#c4e6df',true);label('主航道宽 213.36 m',[0,-350,1],'plan');
 const pierX=[-dimensions.mainspan/2-dimensions.backspan,-dimensions.mainspan/2,dimensions.mainspan/2,dimensions.mainspan/2+dimensions.backspan];
 const deckZ=x=>{const a=Math.abs(x),h=259.08;return a<h?60.96-.04*a*a/(2*h):55.7784-.04*(a-h)};
 const lowerZ=x=>deckZ(x)-3.7-11*Math.max(Math.exp(-(((x-pierX[1])/38)**2)),Math.exp(-(((x-pierX[2])/38)**2)));
 const topZ=x=>deckZ(x)+9+31*(1-Math.abs(x)/402.7932);
 const piers=[],pierPieces=[];
 for(let i=0;i<4;i++){
  const x=pierX[i],id=16+i,g=new THREE.Group();g.name=`pier-${id}`;g.position.x=x;scene.add(g);piers.push(g);const h=lowerZ(x)-2;
  box(g,0,0,-3,15,i===1||i===2?31:25,7,mats.concrete);
  const upper=new THREE.Group();upper.name=`pier-${id}-upper`;const pivotZ=id===19?12:0;upper.position.y=pivotZ;g.add(upper);pierPieces.push({id,g:upper,pivotZ});
  box(upper,0,0,h-pivotZ,9,24,3.5,mats.concrete);
  for(const xx of [-3.7,3.7])for(const yy of [-11,11]){
   if(pivotZ)member(g,[xx,yy,0],[xx*.9,yy*.8,pivotZ],2.1,mats.concrete);
   member(upper,[xx,yy,0],[xx*.72,yy*.55,h-pivotZ],2.1,mats.concrete);
  }
  if(pivotZ)box(g,0,0,pivotZ,7,23,2,mats.concrete);
  if(i===1||i===2){box(g,0,0,2,19,34,2,mats.rubber);for(const yy of [-16.7,16.7])box(g,0,yy,5,20,1,5,mats.concrete);}
  label(`${id} 号墩${i===1?' · 受撞':''}`,[x,0,h+12],i===1?'pier':'all');
 }
 const blocks=[];
 function block(id,a,b,pivotX,pivotZ){const g=new THREE.Group();g.name=id;g.position.copy(V(pivotX,0,pivotZ));scene.add(g);const o={id,g,a,b,pivotX,pivotZ};blocks.push(o);return o}
 const cut17=pierX[0]+dimensions.backspan/3,cut18=45.72;
 block('s17west',pierX[0],cut17,pierX[0],deckZ(pierX[0]));
 block('s17east',cut17,pierX[1],cut17,deckZ(cut17));
 block('s18west',pierX[1],cut18,pierX[1],deckZ(pierX[1]));
 block('s18east',cut18,pierX[2],pierX[2],lowerZ(pierX[2]));
 for(let k=0;k<3;k++)block(['s19west','s19middle','s19east'][k],pierX[2]+k*dimensions.backspan/3,pierX[2]+(k+1)*dimensions.backspan/3,pierX[2],lowerZ(pierX[2]));
 const fragments=[],nodes=[];
 for(let s=0;s<3;s++){const count=s===1?16:9;for(let j=0;j<count;j++)nodes.push(pierX[s]+(pierX[s+1]-pierX[s])*j/count)}nodes.push(pierX[3]);
 const lampMat=new THREE.MeshBasicMaterial({color:'#ffdda3'}),redLampMat=new THREE.MeshBasicMaterial({color:'#ef795e'});
 function lamp(parent,x,y,z,colorMat=lampMat,r=.9){const o=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),colorMat);o.position.copy(V(x,y,z));parent.add(o);return o}
 for(let n=0;n<nodes.length-1;n++){
  const a=nodes[n],b=nodes[n+1],mid=(a+b)/2,owner=blocks.find(q=>mid>=q.a-1e-4&&mid<=q.b+1e-4),g=new THREE.Group();g.name=`truss-panel-${n}`;g.position.copy(V(mid-owner.pivotX,0,-owner.pivotZ));owner.g.add(g);fragments.push({g,x:mid,owner:owner.id});
  const ax=a-mid,bx=b-mid,road=box(g,0,0,(deckZ(a)+deckZ(b))/2,Math.hypot(b-a,deckZ(b)-deckZ(a)),dimensions.deckWidth,.75,mats.road);road.rotation.z=Math.atan2(deckZ(b)-deckZ(a),b-a);
  for(const y of [-dimensions.deckWidth/2+.35,dimensions.deckWidth/2-.35,0])member(g,[ax,y,deckZ(a)+1],[bx,y,deckZ(b)+1],y===0?.35:.23,mats.white);
  for(const y of [-4.6,4.6])for(let k=0;k<2;k++)box(g,ax+5+k*12,y,deckZ(mid)+.45,5,.12,.06,mats.white);
  for(const y of [-10,10]){
   member(g,[ax,y,topZ(a)],[bx,y,topZ(b)],.75,mats.chord);member(g,[ax,y,lowerZ(a)],[bx,y,lowerZ(b)],.9,mats.chord);
   member(g,[ax,y,lowerZ(a)],[ax,y,topZ(a)],.5,mats.steel);member(g,[ax,y,n%2?topZ(a):lowerZ(a)],[bx,y,n%2?lowerZ(b):topZ(b)],.56,mats.steel);
   member(g,[ax,y,deckZ(a)],[bx,y,deckZ(b)],.35,mats.steel);
  }
  member(g,[ax,-10,topZ(a)],[ax,10,topZ(a)],.5,mats.steel);member(g,[ax,-10,topZ(a)],[bx,10,topZ(b)],.28,mats.steel);member(g,[ax,10,topZ(a)],[bx,-10,topZ(b)],.28,mats.steel);member(g,[ax,-10,deckZ(a)-1],[ax,10,deckZ(a)-1],.7,mats.chord);
  if(n%2===0){member(g,[0,-8.7,deckZ(mid)],[0,-8.7,deckZ(mid)+7],.12,mats.dark);lamp(g,0,-8.7,deckZ(mid)+7);}
 }
 // North spans20–22 form a continuous three-span girder unit. Exact approach
 // support stations are not surveyed here; the 84m teaching interval is retained.
 const approach=[],approachPiers=[];
 for(const side of [-1,1])for(let k=0;k<4;k++){
  const x=side*(402.7932+42+k*84),g=new THREE.Group();g.name=side>0?`span-${20+k}`:`south-context-${k}`;g.position.copy(V(x,0,deckZ(x)));scene.add(g);approach.push({g,x,side,k,height:deckZ(x)});
  box(g,0,0,0,84,18.6436,1.1,mats.road);for(const y of [-7,0,7])box(g,0,y,-2,84,1,3,mats.steel);lamp(g,0,-8.7,7);member(g,[0,-8.7,0],[0,-8.7,7],.12,mats.dark);
  const px=x+side*42,pg=new THREE.Group();pg.position.x=px;const id=side>0?20+k:15-k;pg.name=`pier-${id}`;scene.add(pg);approachPiers.push({g:pg,id,height:deckZ(px)-3});
  for(const yy of [-7,7])member(pg,[0,yy,0],[0,yy,deckZ(px)-3],1.5,mats.concrete);box(pg,0,0,deckZ(px)-3,5,20,2,mats.concrete);for(const z of [12,27])if(z<deckZ(px)-4)box(pg,0,0,z,3,16,1.5,mats.concrete);
 }
 // Small emissive lamps suggest the visible road/harbour lights. Their positions,
 // exposure and water reflections are presentation assumptions, not an explosion.
 const reflection=new THREE.Group();scene.add(reflection);
 for(let i=0;i<32;i++){const x=-700+i*45;lamp(scene,x,-980,5,lampMat,.9);for(let j=0;j<3;j++){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.8+j*.2,7+j*8),new THREE.MeshBasicMaterial({color:'#bc9a69',transparent:true,opacity:.06,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(V(x,-960+j*14,.03));reflection.add(mesh)}}
 const protect=new THREE.Group();scene.add(protect);for(const x of [-167.64,167.64])for(const y of [149.05,-110.55]){const o=new THREE.Mesh(new THREE.CylinderGeometry(4.2672,4.2672,10,32),mats.concrete);o.position.copy(V(x,y,2));protect.add(o);for(let j=0;j<8;j++){const a=j*Math.PI/4;box(protect,x+4.35*Math.cos(a),y+4.35*Math.sin(a),4,1,1,4,mats.rubber)}}label('既有防撞墩：本次未碰到',[-167.64,149.05,13],'plan');
 const paths=new THREE.Group();paths.name='teaching-load-paths';scene.add(paths);for(const x of pierX){const ar=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),V(x,18,82),43,'#c35e31',7,3);paths.add(ar)}for(const x of [-90,30,150]){const ar=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),V(x,0,85),20,'#ebc363',5,2);paths.add(ar)}
 const ship=new THREE.Group();scene.add(ship);
 // Metric ring loft: x fore-aft, y port, z above water. No anisotropic asset scaling.
 const rings=[[-149.95,.67],[-142,.9],[-120,1],[-90,1],[60,1],[98,.97],[124,.77],[143,.35],[149.95,.035]];
 const verts=[],idx=[],groups=[];for(const [x,f] of rings){const w=24.1*f;for(const [y,z] of [[-w,10.5],[-w,0],[-w*.75,-8],[-w*.28,-12.15],[w*.28,-12.15],[w*.75,-8],[w,0],[w,10.5]])verts.push(x,z,-y)}
 for(let r=0;r<rings.length-1;r++)for(let j=0;j<8;j++){const a=r*8+j,b=r*8+(j+1)%8,c=(r+1)*8+(j+1)%8,d=(r+1)*8+j;const st=idx.length;idx.push(a,b,c,a,c,d);groups.push({start:st,count:6,materialIndex:j>=1&&j<=5?1:0})}
 const hullGeo=new THREE.BufferGeometry();hullGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));hullGeo.setIndex(idx);groups.forEach(g=>hullGeo.addGroup(g.start,g.count,g.materialIndex));hullGeo.computeVertexNormals();ship.add(new THREE.Mesh(hullGeo,[new THREE.MeshStandardMaterial({color:'#18394b',roughness:.6,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({color:'#a24f39',roughness:.8,side:THREE.DoubleSide})]));
 box(ship,-15,0,10.2,245,45.5,.7,mats.dark);box(ship,135,0,10.6,15,14,1.6,mats.white);member(ship,[141,0,11],[144,0,24],.22,mats.white);
 const colors=['#ad563b','#517b81','#c1a566','#6c8796','#968d72','#3d6562'],containers=[];for(let bay=0;bay<20;bay++){const x=-129+bay*13.1;if(Math.abs(x-25)<12||Math.abs(x+87)<11||x>118)continue;for(let row=0;row<16;row++){const y=(row-7.5)*2.52;const tiers=(bay+row)%4===0?5:6;for(let t=0;t<tiers;t++)containers.push({x,y,z:11.2+t*2.64,c:(bay*7+row*3+t)%colors.length})}}
 const dummy=new THREE.Object3D();for(let c=0;c<colors.length;c++){const arr=containers.filter(q=>q.c===c),inst=new THREE.InstancedMesh(boxGeo,new THREE.MeshStandardMaterial({color:colors[c],roughness:.83}),arr.length);arr.forEach((q,i)=>{dummy.position.copy(V(q.x,q.y,q.z+1.2955));dummy.scale.set(12.192,2.591,2.438);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)});ship.add(inst)}
 box(ship,25,0,21.7,15,33,22,mats.white);box(ship,25,0,33.4,19,45,3.5,mats.white);for(let y=-19;y<=19;y+=3.6)box(ship,35,y,34.1,.1,2.8,1.8,mats.glass);box(ship,25,0,35.8,17,34,1.2,mats.white);member(ship,[25,0,36],[25,0,43],.22,mats.white);
 box(ship,-87,0,19,14,27,16,mats.white);box(ship,-87,0,29.5,10,13,10,mats.dark);box(ship,-87,0,34.3,10.5,13.5,1.2,mats.orange);
 for(const y of [-18,18]){box(ship,21,y,17,9,3,3,mats.orange);for(let x=-143;x<130;x+=12)member(ship,[x,y*1.25,10.8],[x,y*1.25,12],.08,mats.white)}
 for(const y of [-23,23])member(ship,[-143,y,12],[120,y,12],.07,mats.white);
 box(ship,-139,0,12,12,35,3,mats.white);for(const y of [-12,12]){const life=new THREE.Mesh(new THREE.TorusGeometry(1.5,.45,8,18),mats.orange);life.position.copy(V(-140,y,14));ship.add(life)}
 const shipLabel=document.createElement('canvas');shipLabel.width=512;shipLabel.height=100;const ctx=shipLabel.getContext('2d');ctx.fillStyle='#f0eee5';ctx.font='bold 68px sans-serif';ctx.textAlign='center';ctx.fillText('DALI',256,78);const tex=new THREE.CanvasTexture(shipLabel);for(const yy of [-24.2,24.2]){const o=new THREE.Mesh(new THREE.PlaneGeometry(20,4),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));o.position.copy(V(110,yy,7));o.rotation.y=yy<0?0:Math.PI;ship.add(o)}
 const shipLights=new THREE.Group();ship.add(shipLights);lamp(shipLights,25,0,43,lampMat,1.1);lamp(shipLights,137,0,24,lampMat,.7);lamp(shipLights,-139,0,15,lampMat,.8);lamp(shipLights,31,-23,34,redLampMat,.6);
 for(const y of [-16,16])for(const x of [25,-87])lamp(shipLights,x,y,31,lampMat,.6);
 const worklight=new THREE.PointLight('#ffdab2',650,100,2);worklight.position.copy(V(25,0,38));ship.add(worklight);
 const wake=new THREE.Group();wake.name='teaching-route';scene.add(wake);for(let i=0;i<3;i++)line(wake,[[9,700-i*45,.3],[-50,400,.3],[-125,139,.3]],'#c4ebe7',true);wake.add(new THREE.ArrowHelper(new THREE.Vector3(-.3746,0,.9272).normalize(),V(40,550,1),110,'#f8e5a8',13,7));label('港内 → 东南出港方向',[30,530,14],'plan');
 label('西南侧岸向',[pierX[0]-60,-38,70]);label('东北侧岸向',[pierX[3]+60,-38,70]);label('365.76 m 主跨',[0,0,115]);label('右舷船艏接触西北柱',[-186,9,12],'pier');
 let progress=0,time=-30,lastView='overview',showLabels=true,showPaths=true,active=true;
 function syncHelpers(){const visible=lastView!=='cctv'&&showPaths;channel.visible=visible;wake.visible=visible;paths.visible=visible;}
 function setTime(seconds){
  time=Math.max(-30,Math.min(24,Number(seconds)));progress=progressAtCollapseTime(time);
  const theta=-112*Math.PI/180,travel=shipAdvance(time);ship.rotation.y=theta;ship.position.copy(V(-124.91+Math.cos(theta)*travel,139.43+Math.sin(theta)*travel,0));
  for(const b of blocks){const q=blockPose(b.id,time);b.g.position.copy(V(b.pivotX+q.dx,q.dy,b.pivotZ+q.dz));b.g.rotation.set(q.roll,0,q.angle,'ZYX');}
  for(const p of pierPieces){const q=pierState(p.id,time);p.g.rotation.set(q*.30,0,-q*(p.id===17?1.20:.92),'ZYX');p.g.position.y=p.pivotZ-q*(p.id===17?6:4);}
  for(const p of approachPiers){const q=pierState(p.id,time);p.g.rotation.z=-q*1.32;p.g.position.y=-q*3;}
  for(const f of approach){const q=f.side>0&&f.k<3?approachPose(f.k,time,f.height):{dz:0,angle:0};f.g.position.y=f.height+q.dz;f.g.rotation.z=q.angle;}
  paths.children.forEach((o,i)=>{if(i===1)o.visible=time<6});
 }
 function setProgress(p){setTime(collapseTimeAtProgress(p));}
 function view(name){
  lastView=name;syncHelpers();const aspect=Math.max(.1,host.clientWidth/Math.max(1,host.clientHeight));
  // Hold horizontal field of view across viewport shapes; position/target never
  // change with accident time. This prevents a narrow screen pushing the camera
  // into fog or silently hitting OrbitControls.maxDistance.
  camera.fov=name==='cctv'?2*Math.atan(Math.tan(14.25*Math.PI/360)*1.38/aspect)*180/Math.PI:36;camera.updateProjectionMatrix();
  const target=name==='cctv'?V(130,0,40):name==='pier'?V(-150,60,32):name==='ship'?ship.position.clone().add(V(0,0,15)):name==='section'?V(-35,0,72):V(0,50,33);let off;
  if(name==='cctv')off=V(-1180,-3300,105);else if(name==='plan')off=V(0,0,1050);else if(name==='elevation')off=V(0,-1050,160);else if(name==='pier')off=V(-420,-160,260);else if(name==='ship')off=V(230,-180,160);else if(name==='section')off=V(220,-2,5);else off=V(-680,-850,690);
  if(name==='overview'||name==='plan'||name==='elevation')off.multiplyScalar(Math.max(1,1.38/aspect));camera.position.copy(target).add(off);orbit.target.copy(target);camera.up.set(0,1,0);if(name==='plan')camera.position.z+=.1;orbit.update();
 }
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(['overview','cctv'].includes(lastView))view(lastView)}
 new ResizeObserver(resize).observe(host);resize();setProgress(0);view('overview');
 function render(){requestAnimationFrame(render);if(!active)return;orbit.update();renderer.render(scene,camera);labels.forEach(l=>{const p=l.p.clone().project(camera);const allowed=l.category==='all'||(l.category==='pier'&&['pier','overview'].includes(lastView))||(l.category==='plan'&&['plan','overview'].includes(lastView));l.el.hidden=lastView==='cctv'||!showLabels||!allowed||Math.abs(p.x)>1||Math.abs(p.y)>1||p.z>1;l.el.style.left=(p.x*.5+.5)*host.clientWidth+'px';l.el.style.top=(-p.y*.5+.5)*host.clientHeight+'px'})}render();
 return {setProgress,setTime,getTime(){return time},view,setActive(v){active=v;labelHost.hidden=!v;host.hidden=!v;if(v)resize()},setPaths(v){showPaths=Boolean(v);showLabels=Boolean(v);syncHelpers()},setProtection(v){protect.visible=v},getState(){return{progress,time,clock:collapseClock(time),lastView,night:true,collapseMethod:'source-constrained rigid-region interpolation',blocks:blocks.map(b=>({id:b.id,position:b.g.position.toArray(),rotation:b.g.rotation.toArray(),scale:b.g.scale.toArray()})),piers:[...pierPieces,...approachPiers].map(p=>({id:p.id,rotation:p.g.rotation.toArray()})),shipLength:dimensions.shipLength,shipWidth:dimensions.shipWidth,cssWidth:host.clientWidth,canvasWidth:renderer.domElement.clientWidth,fragments:fragments.length,containers:containers.length}},scene};
}
