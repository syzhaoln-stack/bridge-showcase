// Seconds relative to 01:29:09 EDT, 26 March 2024.
// Event order/times: MIR25-40 Appendix C. Observable shape changes: docket
// Bridge Structures factual report pp27–34, NRP/MDTA surveillance Figures23–38.
// Poses between those observations are constrained teaching animation, NOT FEM.
export const TIME_RANGE=Object.freeze({min:-30,max:24});
export const COLLAPSE_EVENTS=Object.freeze([
 {t:0,clock:'01:29:09',label:'右舷船艏接触17号墩西北柱',source:'K1 Appendix C; K2 Fig23–24'},
 {t:4,clock:'01:29:13',label:'17号墩西北柱上部出现第二次接触迹象',source:'K2 Fig25–26; container contact described as likely'},
 {t:6,clock:'01:29:15',label:'18跨开始垮落',source:'K1 Appendix C'},
 {t:7,clock:'01:29:16',label:'17号墩东北柱附近出现接触迹象',source:'K2 Fig27–28'},
 {t:11,clock:'01:29:20',label:'17号墩柱失效；两支承处出现热像亮区',source:'K2 Fig29–30'},
 {t:13,clock:'01:29:22',label:'17号墩倒塌；17/18跨下坠，19跨北端翘离支承',source:'K1 Appendix C; K2 Fig31'},
 {t:14,clock:'01:29:23',label:'19跨北端回落，再接触19号墩',source:'K2 Fig33'},
 {t:15,clock:'01:29:24',label:'20跨垮落',source:'K1 Appendix C; K2 Fig35–36'},
 {t:18,clock:'01:29:27',label:'21跨垮落',source:'K1 Appendix C; K2 Fig37'},
 {t:19,clock:'01:29:28',label:'22跨垮落',source:'K1 Appendix C; K2 Fig38'}
]);
const anchors=[[-30,0],[0,1],[3,2],[6,3],[24,4]];
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function interpolate(value,input,output){for(let i=1;i<anchors.length;i++){if(value<=anchors[i][input]){const a=anchors[i-1],b=anchors[i];return a[output]+clamp((value-a[input])/(b[input]-a[input]))*(b[output]-a[output]);}}return anchors.at(-1)[output]}
export const collapseTimeAtProgress=p=>interpolate(clamp(Number(p),0,4),1,0);
export const progressAtCollapseTime=t=>interpolate(clamp(Number(t),-30,24),0,1);
export function collapseClock(t){const total=3600+29*60+9+clamp(Number(t),-30,24),s=Math.floor(total);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':')}

// Each pose is [time, angle in bridge elevation, vertical translation, transverse
// translation, longitudinal translation, roll]. Angles/displacements are visual
// interpretations; they are deliberately separate from the measured bridge geometry.
const poses={
 // Span17 upper-chord failure region is shown at a panel boundary, not as an
 // asserted forensic fracture coordinate. Its southwest end remains near Pier16.
 s17west:[[6,0,0,0,0,0],[11,-.015,0,0,0,0],[13,-.25,0,0,0,0],[14,-.47,0,0,0,0],[17,-.66,0,2,0,.10],[24,-.66,0,2,0,.10]],
 s17east:[[6,0,0,0,0,0],[11,-.01,-1,0,0,0],[13,.02,-30,0,-2,0],[14,.12,-46,0,-3,.12],[18,.04,-45,3,-3,1.30],[24,.04,-45,3,-3,1.30]],
 s18west:[[6,0,0,0,0,0],[9,-.001,-.4,0,0,0],[11,.0025,-1.7,0,0,0],[13,.087,-25,0,-2,0],[14,-.105,-34,0,-5,.08],[18,-.14,-35,4,-5,1.02],[24,-.14,-35,4,-5,1.02]],
 // Initially rotates together with Span19 about P18, lifting the north end.
 // After the upper chord separates (Fig35), these two regions rotate oppositely.
 s18east:[[6,0,0,0,0,0],[11,.008,0,0,0,0],[13,.038,0,0,0,0],[14,.34,0,0,0,0],[15,.35,-2,0,-2,.25],[18,.02,-35,2,-4,1.30],[22,0,-42,3,-4,1.40],[24,0,-42,3,-4,1.40]],
 s19west:[[6,0,0,0,0,0],[11,.008,0,0,0,0],[13,.038,0,0,0,0],[14,0,0,0,0,0],[15,-.20,0,0,0,0],[18,-.15,-28,2,0,1.35],[22,-.03,-37,3,0,1.40],[24,-.03,-37,3,0,1.40]],
 s19middle:[[6,0,0,0,0,0],[11,.008,0,0,0,0],[13,.038,0,0,0,0],[14,0,0,0,0,0],[15,-.20,0,0,0,0],[19,.06,-43,3,0,1.40],[24,.06,-43,3,0,1.40]],
 s19east:[[6,0,0,0,0,0],[11,.008,0,0,0,0],[13,.038,0,0,0,0],[14,0,0,0,0,0],[15,-.20,0,0,0,0],[20,-.04,-39,-3,0,1.38],[24,-.04,-39,-3,0,1.38]]
};
export function blockPose(id,t){const a=poses[id];if(!a)throw Error('Unknown Key block '+id);if(t<=a[0][0])return{angle:0,dz:0,dy:0,dx:0,roll:0};for(let i=1;i<a.length;i++){if(t<=a[i][0]){const u=smooth((t-a[i-1][0])/(a[i][0]-a[i-1][0]));const v=a[i].slice(1).map((b,j)=>a[i-1][j+1]+u*(b-a[i-1][j+1]));return{angle:v[0],dz:v[1],dy:v[2],dx:v[3],roll:v[4]}}}const v=a.at(-1);return{angle:v[1],dz:v[2],dy:v[3],dx:v[4],roll:v[5]}}
export function approachPose(k,t,height){const start=[15,18,19][k],q=smooth((t-start)/2.8);return{dz:-q*(height+2),angle:q*[.12,.10,.08][k],q}}
export function shipAdvance(t){return t<0?3.292444444444445*t:12*smooth(t/7)}
export function pierState(id,t){if(id===17)return smooth((t-11)/2);if(id===19)return smooth((t-14)/2);if(id===20)return smooth((t-17.5)/2);if(id===21)return smooth((t-18.5)/2);return 0}
export const POSE_IDS=Object.freeze(Object.keys(poses));
