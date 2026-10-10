// Original media remains on its original host. A source frame is never labeled
// as a simulated image, and a sequence-only frame never receives an invented timestamp.
export const FRAME_OBSERVATIONS=Object.freeze([
 {t:0,figure:23,caption:'撞击时刻 · 01:29:09。原监控中的船艏与17号墩。'},
 {t:11,figure:29,caption:'+11秒 · 墩柱失效、结构形态开始明显改变。热像浅色不能直接解释为火焰。'},
 {t:13,figure:31,caption:'+13秒 · 17/18跨向下，19跨北端翘离19号墩。注意两端运动方向并不相同。'},
 {t:14,figure:33,caption:'+14秒 · 北端回落、再次接触19号墩。'},
 {t:15,figure:36,caption:'后续顺序画面 · 20跨垮落。事件发生于+15秒（最终报告附录C）；此原帧没有独立标定秒数。'},
 {t:18,figure:37,caption:'后续顺序画面 · 20—22跨继续失去支承。此原帧没有单独标定秒数。'},
 {t:22,figure:38,caption:'最终残存构造 · 16、18、22号墩留下。此原帧没有单独标定秒数。'}
]);
export const ORIGINAL_RECORDINGS=Object.freeze({
 west:{label:'西岸工业设施监控 · NTSB附件3',url:'https://data.ntsb.gov/Docket/Document/docBLOB?FileExtension=mp4&FileName=Dock+East_Key+Bridge-2024-03-26+030232935+PM-Rel.mp4&ID=19587160'},
 east:{label:'Dundalk住宅监控 · NTSB附件4',url:'https://data.ntsb.gov/Docket/Document/docBLOB?FileExtension=mp4&FileName=N847A6_ch2_main_20240326011501_20240326013001-Rel.mp4&ID=19587170'}
});
export function bindKeyEvidence({setTime,stop,view}){
 const $=id=>document.getElementById(id),video=$('key-original-video');let shown=-1,offset=null;
 function update(t){let k=0;for(let i=0;i<FRAME_OBSERVATIONS.length;i++)if(t>=FRAME_OBSERVATIONS[i].t)k=i;
  if(k!==shown){shown=k;const f=FRAME_OBSERVATIONS[k];$('key-reference-image').src=`evidence/key_cctv_fig${f.figure}.png`;$('key-reference-link').href=`evidence/key_cctv_fig${f.figure}.png`;$('key-reference-caption').textContent=`NRP监控原帧 · NTSB图${f.figure}。${f.caption}`;}
 }
 document.querySelectorAll('[data-key-time]').forEach(b=>b.onclick=()=>{stop();view('cctv');setTime(+b.dataset.keyTime);});
 function choose(){video.pause();video.removeAttribute('src');video.load();offset=null;$('key-sync').checked=false;const r=ORIGINAL_RECORDINGS[$('key-recording').value];$('key-recording-origin').href=r.url;$('key-media-status').textContent='尚未载入。原文件时钟未校正，请先找到船艏接触的画面，再设置对齐点。';}
 $('key-recording').onchange=choose;
 $('key-sync').onchange=()=>{if(!$('key-sync').checked)return;if(offset===null){$('key-sync').checked=false;$('key-media-status').textContent='请先在原视频中选定首次接触帧，再开启跟随。';return;}const wasPlaying=!video.paused;stop();$('key-sync').checked=true;setTime(video.currentTime-offset);if(wasPlaying)video.play().catch(()=>{});};
 $('key-load-recording').onclick=()=>{stop();video.src=ORIGINAL_RECORDINGS[$('key-recording').value].url;video.load();$('key-media-status').textContent='正在请求NTSB原站文件；若无法播放，可打开原文件入口。';video.play().catch(()=>{});};
 video.addEventListener('error',()=>{$('key-media-status').textContent='原站文件未能在当前播放器载入；下方原文件链接及已核监控关键帧仍可查看。';});
 video.addEventListener('loadedmetadata',()=>{$('key-media-status').textContent='原站视频已载入。暂停在首次接触画面，再点击“以此帧对齐撞击时刻”。';});
 $('key-align-contact').onclick=()=>{if(video.readyState<2){$('key-media-status').textContent='请先载入并查看原视频，不能把空白画面设成撞击帧。';return;}video.pause();stop();offset=video.currentTime;$('key-sync').checked=true;view('cctv');setTime(0);$('key-media-status').textContent=`按你所选画面对齐：视频第${offset.toFixed(2)}秒对应撞击t=0。原片继续播放时模型随动。`;};
 video.addEventListener('timeupdate',()=>{if(offset!==null&&$('key-sync').checked)setTime(video.currentTime-offset);});
 choose();update(-30);return{update,detach(){video.pause();$('key-sync').checked=false;}};
}
