/** Original procedural illustration assets. No third-party character or vehicle model.
 * Local rendering axes: +x forward, +y up, +z right. Position is the ground contact.
 * All dimensions are metres, with uniform scale only. Character hair-top height 1.75 m.
 */
function assetKit(THREE){
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.70,metalness:0,...extra});
 const mesh=(g,geometry,material,x,y,z)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 const ellipsoid=(g,m,x,y,z,sx,sy,sz)=>{const o=mesh(g,new THREE.SphereGeometry(1,18,12),m,x,y,z);o.scale.set(sx,sy,sz);return o;};
 const link=(g,m,a,b,r1,r2=r1)=>{const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),d=bb.clone().sub(aa),o=mesh(g,new THREE.CylinderGeometry(r2,r1,d.length(),14),m,...aa.clone().add(bb).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;};
 const roundedBox=(w,h,d,r)=>{const geo=new THREE.BoxGeometry(w,h,d,5,5,5),pos=geo.attributes.position,half=[w/2-r,h/2-r,d/2-r];for(let i=0;i<pos.count;i++){const p=[pos.getX(i),pos.getY(i),pos.getZ(i)],c=p.map((v,k)=>Math.max(-half[k],Math.min(half[k],v))),q=p.map((v,k)=>v-c[k]),n=Math.hypot(...q);pos.setXYZ(i,...c.map((v,k)=>v+(n?q[k]/n*r:0)));}geo.computeVertexNormals();return geo;};
 return{mat,mesh,ellipsoid,link,roundedBox};
}

// Keep richly modelled details, but batch them by finish so a person costs about
// a dozen draw calls instead of one draw call for every eye, lace and hair lock.
function batchParts(group,THREE){
 const batches=new Map();
 for(const m of [...group.children]){if(!m.isMesh)continue;m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix),flat=g.index?g.toNonIndexed():g;
  if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(flat);group.remove(m);
 }
 for(const [material,geometries] of batches){const count=geometries.reduce((n,g)=>n+g.attributes.position.count,0),positions=new Float32Array(count*3),normals=new Float32Array(count*3);let offset=0;
  for(const g of geometries){positions.set(g.attributes.position.array,offset);normals.set(g.attributes.normal.array,offset);offset+=g.attributes.position.array.length;g.dispose();}
  const combined=new THREE.BufferGeometry();combined.setAttribute('position',new THREE.BufferAttribute(positions,3));combined.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  const m=new THREE.Mesh(combined,material);m.castShadow=true;m.receiveShadow=true;group.add(m);
 }
}

export function createCharacter(person,index,THREE,V){
 const {mat,mesh,ellipsoid,link,roundedBox}=assetKit(THREE),group=new THREE.Group(),body=new THREE.Group();group.add(body);
 const styles=[{coat:'#3d8f99',pants:'#394f65',hair:'#352d2c',skin:'#ecc8ad',bag:'#e8bc69'},{coat:'#de846e',pants:'#3e5960',hair:'#51382f',skin:'#efc9b0',bag:'#536c94'},{coat:'#b9acdb',pants:'#586276',hair:'#292f3b',skin:'#bd8566',bag:'#ddca95'}],s=styles[index%styles.length];
 const skin=mat(s.skin),hair=mat(s.hair),coat=mat(s.coat),pants=mat(s.pants),shoe=mat('#f4efde'),sole=mat('#7c898b'),white=mat('#fff7ee'),dark=mat('#242733'),blush=mat('#d99487'),bag=mat(s.bag),trim=mat('#e9e3d2');
 // Soft trainers sit on the exact y=0 plane. The asymmetric toe indicates walking direction.
 for(const side of [-1,1]){
  const z=side*.115,x=side*.035;
  mesh(body,roundedBox(.29,.055,.16,.022),sole,x+.035,.0275,z);
  mesh(body,roundedBox(.275,.12,.15,.035),shoe,x+.037,.10,z);
  for(let k=0;k<3;k++)mesh(body,roundedBox(.018,.008,.10,.002),white,x+.055+k*.035,.162,z);
  link(body,pants,[x,.16,z],[x-.017,.46,z],.073,.087);
  link(body,pants,[x-.017,.46,z],[0,.80,side*.105],.087,.096);
  ellipsoid(body,pants,x-.017,.46,z,.085,.092,.085);
 }
 // Tailored jacket: curved torso, collar, zipper and small inset pockets.
 const outline=[new THREE.Vector2(.17,.77),new THREE.Vector2(.195,.83),new THREE.Vector2(.185,1.03),new THREE.Vector2(.225,1.18),new THREE.Vector2(.155,1.30)];
 const torso=mesh(body,new THREE.LatheGeometry(outline,24),coat,0,0,0);torso.scale.x=.72;
 ellipsoid(body,skin,.005,1.285,0,.083,.115,.082);
 const collar=mesh(body,new THREE.TorusGeometry(.097,.020,8,24),trim,.005,1.295,0);collar.rotation.x=Math.PI/2;
 link(body,trim,[.144,.81,0],[.157,1.205,0],.008);
 for(const side of [-1,1]){
  link(body,coat,[0,1.18,side*.20],[.005,.965,side*.29],.090,.076);
  ellipsoid(body,coat,.005,.965,side*.29,.078,.085,.079);
  link(body,coat,[.005,.965,side*.29],[.062,.795,side*.30],.076,.056);
  link(body,trim,[.056,.823,side*.30],[.067,.785,side*.30],.059);
  ellipsoid(body,skin,.077,.755,side*.30,.057,.073,.052);
  link(body,trim,[.132,.895,side*.075],[.116,.92,side*.146],.009);
 }
 // Rounded illustrated face, shaped cap of hair, fringe locks, ears and eye catchlights.
 ellipsoid(body,skin,.018,1.505,0,.190,.225,.195);
 ellipsoid(body,hair,-.10,1.49,0,.113,.190,.196);
 mesh(body,new THREE.SphereGeometry(.215,24,14,0,Math.PI*2,0,Math.PI*.39),hair,-.006,1.535,0);
 for(const side of [-1,1]){
  ellipsoid(body,skin,.010,1.48,side*.187,.060,.077,.042);
  ellipsoid(body,hair,-.028,1.585,side*.167,.088,.119,.057);
  // Face looks along +x, so the whites, iris and shine layer outward in x.
  ellipsoid(body,white,.183,1.526,side*.073,.020,.044,.032);
  ellipsoid(body,dark,.199,1.523,side*.072,.011,.032,.021);
  ellipsoid(body,white,.208,1.538,side*.066,.007,.010,.008);
  ellipsoid(body,blush,.190,1.456,side*.105,.008,.019,.031);
  link(body,hair,[.174,1.59,side*.108],[.185,1.601,side*.047],.012);
 }
 for(let j=-1;j<=1;j++){const lock=ellipsoid(body,hair,.135,1.65,j*.086,.09,.071,.067);lock.rotation.z=-.25+j*.12;}
 ellipsoid(body,skin,.209,1.48,0,.025,.027,.022);
 const smileCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(.199,1.437,-.036),new THREE.Vector3(.211,1.418,0),new THREE.Vector3(.199,1.437,.036));
 mesh(body,new THREE.TubeGeometry(smileCurve,10,.005,6,false),dark,0,0,0);
 // A little backpack and two padded straps give a readable silhouette from behind.
 mesh(body,roundedBox(.16,.31,.29,.065),bag,-.175,1.045,0);
 mesh(body,roundedBox(.05,.14,.21,.025),bag,-.273,.986,0);
 for(const side of [-1,1])link(body,bag,[-.10,1.27,side*.13],[.115,.995,side*.15],.020);
 if(index%3===1){ // A short scarf, kept below the face and within the measured height.
  mesh(body,roundedBox(.08,.19,.08,.024),trim,.150,1.185,.075);
 }
 body.updateMatrixWorld(true);
 const localBox=new THREE.Box3().setFromObject(body),rawHeight=localBox.max.y-localBox.min.y,target=person.height||1.75;
 const scale=target/rawHeight;body.scale.setScalar(scale);body.position.y=-localBox.min.y*scale;
 batchParts(body,THREE);
 group.userData={assetKind:'original-cute-person',assetLicense:'original-procedural',heightMeasured_m:target,rawHeight_m:rawHeight,uniformScale:scale,personId:person.id};
 group.position.copy(V(...person.position));group.rotation.y=person.heading||0;
 group.name=`${person.id} / ${target.toFixed(2)} m 原创人物`;
 return group;
}

export function createVehicle(vehicle,THREE,V){
 const {mat,mesh,roundedBox}=assetKit(THREE),group=new THREE.Group();
 const paint=mat(vehicle.color||'#3d7891',{roughness:.34,metalness:.22}),glass=mat('#506874',{roughness:.17,metalness:.30}),rubber=mat('#232b30'),alloy=mat('#c4cbcc',{roughness:.32,metalness:.68}),dark=mat('#283840'),light=mat('#fff0b5',{emissive:'#ffe3a1',emissiveIntensity:.25}),red=mat('#c5433c',{emissive:'#a62420',emissiveIntensity:.1}),plate=mat('#e5e9e4');
 mesh(group,roundedBox(4.50,.50,1.78,.14),paint,0,.60,0);
 mesh(group,roundedBox(4.18,.11,1.73,.045),dark,0,.365,0);
 mesh(group,roundedBox(1.45,.11,1.65,.045),paint,1.42,.86,0);
 mesh(group,roundedBox(.85,.10,1.64,.040),paint,-1.76,.84,0);
 const profile=new THREE.Shape();profile.moveTo(-1.49,.83);profile.lineTo(-1.06,1.43);profile.quadraticCurveTo(-.99,1.45,-.90,1.45);profile.lineTo(.38,1.45);profile.quadraticCurveTo(.47,1.45,.53,1.38);profile.lineTo(1.03,.83);profile.closePath();
 const cabinGeo=new THREE.ExtrudeGeometry(profile,{depth:1.46,bevelEnabled:false,steps:1,curveSegments:6});cabinGeo.translate(0,0,-.73);mesh(group,cabinGeo,paint,0,0,0);
 function quad(points,material){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();const m=mesh(group,geo,material,0,0,0);m.material=material.clone();m.material.side=THREE.DoubleSide;return m;}
 quad([[.57,1.355,-.68],[.57,1.355,.68],[.98,.885,.70],[.98,.885,-.70]],glass);
 quad([[-1.08,1.365,.67],[-1.08,1.365,-.67],[-1.42,.89,-.69],[-1.42,.89,.69]],glass);
 for(const side of [-1,1]){
  const z=side*.737;
  quad([[-1.35,.89,z],[-1.01,1.37,z],[-.35,1.37,z],[-.35,.89,z]],glass);
  quad([[-.26,.89,z],[-.26,1.37,z],[.43,1.37,z],[.91,.89,z]],glass);
  mesh(group,roundedBox(.24,.12,.13,.035),paint,.66,1.005,side*.835);
  mesh(group,roundedBox(.19,.035,.025,.01),alloy,-.48,.84,side*.8825);
  for(const x of [-1.325,1.325]){
   const tyre=mesh(group,new THREE.CylinderGeometry(.30,.30,.19,24),rubber,x,.30,side*.750);tyre.rotation.x=Math.PI/2;
   const rim=mesh(group,new THREE.CylinderGeometry(.185,.185,.018,20),alloy,x,.30,side*.854);rim.rotation.x=Math.PI/2;
   for(let k=0;k<5;k++){const spoke=mesh(group,roundedBox(.040,.285,.018,.007),dark,x,.30,side*.874);spoke.rotation.z=k*Math.PI/5;}
   const hub=mesh(group,new THREE.CylinderGeometry(.060,.060,.022,16),alloy,x,.30,side*.882);hub.rotation.x=Math.PI/2;
  }
  mesh(group,roundedBox(.045,.145,.38,.020),light,2.215,.70,side*.52);
  mesh(group,roundedBox(.050,.16,.34,.022),red,-2.205,.69,side*.55);
 }
 mesh(group,roundedBox(.036,.17,.78,.015),dark,2.230,.47,0);
 mesh(group,roundedBox(.030,.115,.39,.012),plate,2.230,.52,0);
 mesh(group,roundedBox(.03,.115,.39,.012),plate,-2.230,.59,0);
 // All tyres contact y=0. Model dimensions are teaching assumptions, not a named car.
 group.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(group),size=bb.getSize(new THREE.Vector3());
 group.userData={assetKind:'original-passenger-car',assetLicense:'original-procedural',vehicleId:vehicle.id,localSize_m:[size.x,size.z,size.y],wheelbase_m:2.65,visualOnly:true};
 batchParts(group,THREE);
 group.position.copy(V(...vehicle.position));group.rotation.y=vehicle.heading||0;group.name=vehicle.label;
 return group;
}
