import * as THREE from './vendor/three.module.js';
export const V=(x,y,z)=>new THREE.Vector3(x,z,-y);
const finishes={concrete:'#bebeb0',steel:'#79968f',deck:'#ddd8c3',cable:'#425e61',hanger:'#577176',railing:'#748785',wood:'#bd9771',asphalt:'#5e6463',marking:'#f4efe3',curb:'#cfcebf',barrier:'#99a9a4',paving:'#ddd9c9',lamp:'#687c76',lampGlow:'#fff1c9'};
export function makeBridge(model){
 const g=new THREE.Group(),batches=new Map(),stage=model.stages.length-1;
 const add=(geometry,matrix,material)=>{const clone=geometry.index?geometry.toNonIndexed():geometry;clone.applyMatrix4(matrix);if(!batches.has(material))batches.set(material,[]);batches.get(material).push(clone);if(clone!==geometry)geometry.dispose();};
 for(const p of model.parts){
  if(p.category==='temporary'||p.temporaryUntil!==undefined&&p.temporaryUntil<stage||p.stage>stage)continue;
  const key=finishes[p.material]?p.material:'steel',transform=new THREE.Object3D();
  if(p.shape==='box'){
   const geometry=new THREE.BoxGeometry(p.size[0],p.size[2],p.size[1]);transform.position.copy(V(...p.center));
   if(p.axis){const X=new THREE.Vector3(...p.axis).normalize(),Y=new THREE.Vector3(-X.y,X.x,0).normalize(),Z=X.clone().cross(Y).normalize();transform.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(...X.toArray()),V(...Z.toArray()),V(...Y.multiplyScalar(-1).toArray())));}
   transform.updateMatrix();add(geometry,transform.matrix,key);
  }else if(p.shape==='sphere'){
   transform.position.copy(V(...p.center));transform.updateMatrix();add(new THREE.SphereGeometry(p.radius,8,6),transform.matrix,key);
  }else if(p.points?.length>1){
   // Every real sampled segment is kept. Cylinders are merged by finish, with no cable thickening.
   for(let i=1;i<p.points.length;i++){
    const a=V(...p.points[i-1]),b=V(...p.points[i]),d=b.clone().sub(a),length=d.length();if(length<1e-8)continue;
    transform.position.copy(a).add(b).multiplyScalar(.5);transform.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());transform.updateMatrix();add(new THREE.CylinderGeometry(p.radius||.08,p.radius||.08,length,6,1,false),transform.matrix,key);
   }
  }
 }
 for(const [key,geos]of batches){
  const n=geos.reduce((sum,x)=>sum+x.attributes.position.count,0),positions=new Float32Array(n*3),normals=new Float32Array(n*3);let offset=0;
  for(const geo of geos){positions.set(geo.attributes.position.array,offset);normals.set(geo.attributes.normal.array,offset);offset+=geo.attributes.position.array.length;geo.dispose();}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:finishes[key],roughness:key==='steel'?.45:.78,metalness:['steel','cable','hanger','barrier'].includes(key)?.22:.02}));mesh.castShadow=!['cable','hanger','railing'].includes(key);mesh.receiveShadow=true;mesh.userData.modelId=model.id;g.add(mesh);
 }
 return g;
}
export function makeGrain(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#cbb99a';c.fillRect(0,0,512,128);let seed=91931;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<200;i++){c.strokeStyle=`rgba(112,98,74,${.015+rnd()*.055})`;c.lineWidth=.3+rnd()*1.6;c.beginPath();let y=rnd()*128;c.moveTo(0,y);for(let x=0;x<=512;x+=16)c.lineTo(x,y+Math.sin(x*.013+i)*1.8);c.stroke();}const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(4,1);return tex;}
export function addBox(parent,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;}
export function disposeTree(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of [].concat(o.material))m.dispose();}});}
