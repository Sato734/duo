import {firebaseConfig} from './firebase-config.js';
// ---------- Stockage sûr ----------
const KEY='duo-app-v1';
let S;
function load(){try{return JSON.parse(localStorage.getItem(KEY))||null}catch(e){return null}}
// ---------- Synchro partagée (Firebase) ----------
const FB='https://www.gstatic.com/firebasejs/10.12.2/';
let F=null,fdb=null,ref=null,unsub=null,dirty=false,seenSpin=null,room='';
const SHARED=['names','scores','bets','defi','wheels','trip','lastSpin'];
const clone=o=>JSON.parse(JSON.stringify(o));
function shared(){const o={v:1,updatedAt:Date.now()};SHARED.forEach(k=>{o[k]=S[k]===undefined?null:S[k]});return clone(o)}
const ROOMKEY='duo-room';
function getRoom(){try{return localStorage.getItem(ROOMKEY)||''}catch(e){return ''}}
function storeRoom(c){try{c?localStorage.setItem(ROOMKEY,c):localStorage.removeItem(ROOMKEY)}catch(e){}}
function newCode(){const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';const r=crypto.getRandomValues(new Uint8Array(10));r.forEach(x=>s+=a[x%a.length]);return s}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}
  if(ref){dirty=true;clearTimeout(save._t);save._t=setTimeout(flush,350)}
}
function flush(){
  if(!ref||!dirty)return;dirty=false;
  F.setDoc(ref,shared()).catch(()=>{setStatus('off');toast('Synchro impossible pour le moment')});
}
function setStatus(s){
  const m={local:'',wait:' · ⏳',on:' · 🟢',off:' · ⚪'};
  const el=document.getElementById('sync');if(el)el.textContent=m[s]||'';
}
const defaults={
  names:['Saad','Clothilde'],scores:[0,0],bets:[],
  defi:{total:0,streak:0,lastDone:null,offset:0,offsetDay:null,mood:'all'},
  wheelCat:'seoul',
  wheels:{
    resto:['Sushi','Burger','Pizza','Libanais','Coréen 🇰🇷','Indien','Tacos','Ramen'],
    film:['Comédie','Horreur','Action','Romance','Anime','Thriller','Docu','Dessin animé'],
    sortie:['Bowling','Cinéma','Balade','Escape game','Karaoké','Laser game','Musée','Jeux vidéo'],
    gage:['Faire la vaisselle','Masser 5 min','Payer le café','Chanter une chanson','Choisir le film','Ranger le salon'],
    perso:['Option 1','Option 2','Option 3'],
    seoul:['Hongdae','Myeongdong','Gyeongbokgung','Bukchon Hanok','N Seoul Tower','Seongsu-dong','Marché Gwangjang','Itaewon','Ikseon-dong','Parc Hangang'],
    osaka:['Dotonbori','Shinsekai','Château d\'Osaka','Marché Kuromon','Umeda Sky','Universal Studios','Journée à Nara','Journée à Kyoto'],
    foodasia:['Tteokbokki','BBQ coréen','Chimaek 🍗🍺','Bibimbap','Takoyaki','Okonomiyaki','Ramen','Kushikatsu','Sushi tapis roulant','Konbini party']
  },
  trip:{date:'',off:0,offDay:null,known:[]},
  theme:'base'
};
S=Object.assign({},defaults,load()||{});
S.trip=Object.assign({},defaults.trip,S.trip||{});
S.defi=Object.assign({},defaults.defi,S.defi||{});
S.wheels=Object.assign({},defaults.wheels,S.wheels||{});

const $=id=>document.getElementById(id);
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2000)}
function confetti(n=40){const c=['#ff5d8f','#ffd23f','#3ee0b0','#5aa9ff','#ff8a3d'];for(let i=0;i<n;i++){const d=document.createElement('div');d.className='confetti';d.style.left=Math.random()*100+'vw';d.style.background=c[i%c.length];d.style.animation=`fall ${1.4+Math.random()*1.4}s ${Math.random()*.3}s ease-in forwards`;document.body.appendChild(d);setTimeout(()=>d.remove(),3200)}}
function ask(title,text){return new Promise(res=>{$('m-title').textContent=title;$('m-text').textContent=text;$('modal').classList.add('on');const done=v=>{$('modal').classList.remove('on');$('m-yes').onclick=$('m-no').onclick=null;res(v)};$('m-yes').onclick=()=>done(true);$('m-no').onclick=()=>done(false)})}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- Navigation ----------
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+b.dataset.v));
  if(b.dataset.v==='roue')drawWheel();
});
const dayStr=(off=0)=>{const d=new Date(Date.now()+off*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const todayStr=()=>dayStr(0);
function goTab(v){document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x.dataset.v===v));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v))}
$('today').textContent=new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});

// ---------- Défis ----------
const DEFIS=[
  {m:'fun',c:'#ffd23f',t:'Parlez uniquement avec un accent marseillais pendant 15 minutes'},
  {m:'fun',c:'#ffd23f',t:'Échangez vos fonds d\'écran de téléphone pour 24 h'},
  {m:'fun',c:'#ffd23f',t:'Faites un selfie en imitant votre émoji préféré'},
  {m:'fun',c:'#ffd23f',t:'Le premier qui dit « genre » fait 10 pompes'},
  {m:'fun',c:'#ffd23f',t:'Inventez ensemble une chorégraphie de 20 secondes'},
  {m:'fun',c:'#ffd23f',t:'Chacun écrit un poème de 4 lignes sur l\'autre, lecture à voix haute'},
  {m:'fun',c:'#ffd23f',t:'Parlez en chuchotant jusqu\'au prochain repas'},
  {m:'cute',c:'#ff5d8f',t:'Dites trois choses que vous aimez chez l\'autre, sans hésiter'},
  {m:'cute',c:'#ff5d8f',t:'Préparez une surprise à moins de 5 € pour l\'autre'},
  {m:'cute',c:'#ff5d8f',t:'Envoyez-vous une photo d\'un souvenir commun et racontez-le'},
  {m:'cute',c:'#ff5d8f',t:'Cuisinez un plat que vous n\'avez jamais fait ensemble'},
  {m:'cute',c:'#ff5d8f',t:'Écrivez un mot doux et cachez-le quelque part chez l\'autre'},
  {m:'cute',c:'#ff5d8f',t:'Choisissez chacun une chanson qui vous fait penser à l\'autre'},
  {m:'versus',c:'#5aa9ff',t:'Pierre-feuille-ciseaux en 5 manches : le perdant fait le café demain'},
  {m:'versus',c:'#5aa9ff',t:'Le plus long sans regarder son téléphone gagne 3 points'},
  {m:'versus',c:'#5aa9ff',t:'Quiz : qui connaît le mieux la date de votre rencontre et les détails ?'},
  {m:'versus',c:'#5aa9ff',t:'Concours de grimaces : un témoin désigne le gagnant'},
  {m:'versus',c:'#5aa9ff',t:'Qui fait le plus de pompes d\'affilée ?'},
  {m:'versus',c:'#5aa9ff',t:'Devinez 5 chansons en 3 secondes chacune'},
  {m:'chill',c:'#3ee0b0',t:'Soirée sans écrans pendant 1 heure, jeux de société seulement'},
  {m:'chill',c:'#3ee0b0',t:'Balade de 30 minutes sans destination précise'},
  {m:'chill',c:'#3ee0b0',t:'Apprenez ensemble 5 mots dans une nouvelle langue'},
  {m:'chill',c:'#3ee0b0',t:'Regardez le coucher (ou le lever) du soleil ensemble'},
  {m:'chill',c:'#3ee0b0',t:'Faites une playlist commune de 10 sons'},
  {m:'asia',c:'#ff4fa3',t:'Karaoké (noraebang) à Hongdae : chacun choisit la chanson de l\'autre 🎤'},
  {m:'asia',c:'#ff4fa3',t:'Duo de K-pop au noraebang : le score le plus haut gagne 5 points'},
  {m:'asia',c:'#ff4fa3',t:'Photo booth à quatre poses à Hongdae, avec les accessoires les plus ridicules'},
  {m:'asia',c:'#ff4fa3',t:'Regardez les danseurs de rue à Hongdae, puis tentez la choré 10 secondes'},
  {m:'asia',c:'#ff4fa3',t:'Commandez tout un repas en coréen, sans un mot de français ni d\'anglais'},
  {m:'asia',c:'#ff4fa3',t:'Défi konbini : composez le meilleur dîner pour moins de 10 000 ₩'},
  {m:'asia',c:'#ff4fa3',t:'Chimaek au bord du fleuve Han, poulet frit et bière au coucher du soleil'},
  {m:'asia',c:'#ff4fa3',t:'Louez un hanbok et faites la photo la plus classe devant Gyeongbokgung'},
  {m:'asia',c:'#ff4fa3',t:'Accrochez un cadenas à la N Seoul Tower avec un message secret'},
  {m:'asia',c:'#ff4fa3',t:'Faites la pose du coureur Glico devant le panneau de Dotonbori 🏃'},
  {m:'asia',c:'#ff4fa3',t:'Battle de takoyaki : chacun en choisit un stand, l\'autre note sur 10'},
  {m:'asia',c:'#ff4fa3',t:'Purikura à Osaka : les yeux les plus énormes gagnent'},
  {m:'asia',c:'#ff4fa3',t:'Gachapon : 3 essais chacun, le jouet le plus absurde gagne'},
  {m:'asia',c:'#ff4fa3',t:'Karaoké japonais en cabine : chantez un générique d\'anime en entier'},
  {m:'asia',c:'#ff4fa3',t:'Avant le départ : apprenez à lire votre prénom en hangeul'},
  {m:'asia',c:'#ff4fa3',t:'Avant le départ : soirée drama coréen + ramyeon à la maison'},
  {m:'asia',c:'#ff4fa3',t:'Avant le départ : chacun choisit LE spot à ne pas rater, l\'autre ne peut pas refuser'},
];
const MOODS=[['all','🎲 Tout'],['asia','🇰🇷🇯🇵 Séoul-Osaka'],['fun','😂 Délire'],['cute','💖 Mignon'],['versus','⚔️ Duel'],['chill','🌿 Chill']];
const MOODNAME={fun:'Délire',cute:'Mignon',versus:'Duel',chill:'Chill',asia:'Séoul-Osaka'};
function hash(s){let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))|0;return Math.abs(h)}
function pool(){return S.defi.mood==='all'?DEFIS:DEFIS.filter(d=>d.m===S.defi.mood)}
function currentDefi(){
  const day=todayStr();
  if(S.defi.offsetDay!==day){S.defi.offset=0;S.defi.offsetDay=day}
  const p=pool();return p[(hash(day)+S.defi.offset)%p.length];
}
function renderDefi(){
  const d=currentDefi();
  $('d-text').textContent=d.t;$('d-tag').textContent='Défi · '+MOODNAME[d.m];$('d-tag').style.background=d.c;
  const doneToday=S.defi.lastDone===todayStr();
  $('d-done').textContent=doneToday?'🎉 Fait aujourd\'hui':'✅ Réussi !';
  $('d-done').disabled=doneToday;$('d-done').style.opacity=doneToday?.6:1;
  $('d-streak').textContent=S.defi.streak+' 🔥';$('d-total').textContent=S.defi.total;
  $('d-moods').innerHTML=MOODS.map(([k,l])=>`<button class="${S.defi.mood===k?'on':''}" data-m="${k}">${l}</button>`).join('');
  $('d-moods').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.defi.mood=b.dataset.m;S.defi.offset=0;save();renderDefi()});
}
$('d-reroll').onclick=()=>{S.defi.offset++;save();renderDefi()};
$('d-done').onclick=()=>{
  const y=dayStr(-1);
  S.defi.streak=S.defi.lastDone===y?S.defi.streak+1:1;
  S.defi.total++;S.defi.lastDone=todayStr();save();renderDefi();confetti();toast('Bravo ! Série : '+S.defi.streak+' 🔥');
};

// ---------- Roue ----------
const CATS=[['seoul','🇰🇷 Séoul'],['osaka','🇯🇵 Osaka'],['foodasia','🥢 Food Asie'],['resto','🍜 Resto'],['film','🎬 Film'],['sortie','🎳 Sortie'],['gage','😈 Gage'],['perso','✏️ Perso']];
const COLORS=['#ff5d8f','#ffd23f','#3ee0b0','#5aa9ff','#ff8a3d','#b07bff'];
let angle=0,spinning=false;
const cv=$('wheel'),ctx=cv.getContext('2d');
function opts(){return S.wheels[S.wheelCat]}
function drawWheel(){
  const o=opts(),n=Math.max(o.length,1),W=cv.width,R=W/2-10,cx=W/2,cy=W/2,seg=2*Math.PI/n;
  ctx.clearRect(0,0,W,W);
  ctx.beginPath();ctx.arc(cx,cy+8,R,0,2*Math.PI);ctx.fillStyle='#0e0820';ctx.fill();
  for(let i=0;i<n;i++){
    const a=angle+i*seg-Math.PI/2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,a,a+seg);ctx.closePath();
    ctx.fillStyle=o.length?COLORS[i%COLORS.length]:'#31225e';
    if(n%COLORS.length===1&&i===n-1&&n>1)ctx.fillStyle=COLORS[2];
    ctx.fill();ctx.strokeStyle='#1a1033';ctx.lineWidth=4;ctx.stroke();
    if(!o.length)continue;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(a+seg/2);ctx.textAlign='right';ctx.fillStyle='#1a1033';
    ctx.font=`600 ${n>8?26:32}px Fredoka, sans-serif`;
    let label=o[i];if(label.length>14)label=label.slice(0,13)+'…';
    ctx.fillText(label,R-24,10);ctx.restore();
  }
  ctx.beginPath();ctx.arc(cx,cy,44,0,2*Math.PI);ctx.fillStyle='#fff7ee';ctx.fill();
  ctx.font='40px sans-serif';ctx.textAlign='center';ctx.fillText('🎲',cx,cy+14);
}
function renderWheel(){
  $('w-cats').innerHTML=CATS.map(([k,l])=>`<button class="${S.wheelCat===k?'on':''}" data-c="${k}">${l}</button>`).join('');
  $('w-cats').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(spinning)return;S.wheelCat=b.dataset.c;save();$('w-result').textContent='Fais tourner !';renderWheel()});
  $('w-chips').innerHTML=opts().map((t,i)=>`<span class="chip">${esc(t)}<b data-i="${i}">×</b></span>`).join('')||'<span class="muted">Ajoute au moins 2 options</span>';
  $('w-chips').querySelectorAll('b').forEach(b=>b.onclick=()=>{if(spinning)return;opts().splice(+b.dataset.i,1);save();renderWheel()});
  drawWheel();
}
$('w-form').onsubmit=e=>{e.preventDefault();const v=$('w-input').value.trim();if(!v)return;if(opts().length>=16)return toast('16 options max');opts().push(v);$('w-input').value='';save();renderWheel()};
function spinTo(idx,off,remote){
  const o=opts(),n=o.length,seg=2*Math.PI/n,T=2*Math.PI;
  spinning=true;$('w-result').textContent=remote?'🎡 Ça tourne chez l\'autre…':'…';
  const start=angle,base=-(idx*seg+seg*off),target=base+T*Math.ceil((start+T*6-base)/T);
  const dur=4200,t0=performance.now();
  const step=now=>{
    const p=Math.min((now-t0)/dur,1),e=1-Math.pow(1-p,4);
    angle=start+(target-start)*e;drawWheel();
    if(p<1)return requestAnimationFrame(step);
    spinning=false;
    $('w-result').textContent='👉 '+o[idx];confetti(25);
    try{navigator.vibrate&&navigator.vibrate(80)}catch(e){}
  };
  requestAnimationFrame(step);
}
$('w-spin').onclick=()=>{
  const o=opts();if(spinning)return;if(o.length<2)return toast('Ajoute au moins 2 options');
  const idx=Math.floor(Math.random()*o.length),off=.15+Math.random()*.7,id=Math.random().toString(36).slice(2);
  S.lastSpin={id,cat:S.wheelCat,idx,off,n:o.length,at:Date.now()};seenSpin=id;save();
  spinTo(idx,off,false);
};

// ---------- Scores & paris ----------
function renderScores(){
  $('n1').value=S.names[0];$('n2').value=S.names[1];
  $('s1').textContent=S.scores[0];$('s2').textContent=S.scores[1];
  const open=S.bets.filter(b=>b.winner==null),closed=S.bets.filter(b=>b.winner!=null);
  $('b-head').textContent=open.length?`Paris en cours (${open.length})`:'Aucun pari en cours';
  const card=b=>{
    const i=S.bets.indexOf(b);
    if(b.winner!=null)return `<div class="bet won"><div class="t">${esc(b.text)}</div><div class="meta">Gagné par ${esc(S.names[b.winner])} · +${b.pts} pts${b.stake?' · '+esc(b.stake):''}</div></div>`;
    return `<div class="bet"><div class="t">${esc(b.text)}</div><div class="meta">${b.pts} pts${b.stake?' · Enjeu : '+esc(b.stake):''}</div>
      <div class="row"><button class="btn-pink" data-w="0" data-i="${i}">${esc(S.names[0])} gagne</button><button class="btn-yellow" style="background:var(--blue);color:#fff" data-w="1" data-i="${i}">${esc(S.names[1])} gagne</button><button class="btn-ghost" data-del="${i}" style="flex:.4">🗑</button></div></div>`;
  };
  $('b-list').innerHTML=open.map(card).join('')+(closed.length?'<p class="muted" style="margin:14px 0 8px">Historique</p>'+closed.slice(-8).reverse().map(card).join(''):'');
  $('b-list').querySelectorAll('[data-w]').forEach(btn=>btn.onclick=()=>{
    const b=S.bets[+btn.dataset.i],w=+btn.dataset.w;b.winner=w;S.scores[w]+=b.pts;save();renderScores();confetti();
    toast(`${S.names[w]} gagne ${b.pts} pts ! 🏆`+(b.stake?` Enjeu : ${b.stake}`:''));
  });
  $('b-list').querySelectorAll('[data-del]').forEach(btn=>btn.onclick=async()=>{if(await ask('Supprimer ce pari ?','Il disparaîtra de la liste.')){S.bets.splice(+btn.dataset.del,1);save();renderScores()}});
}
['n1','n2'].forEach((id,k)=>$(id).onchange=()=>{S.names[k]=$(id).value.trim()||(k?'Toi':'Moi');save();renderScores()});
$('b-form').onsubmit=e=>{
  e.preventDefault();const text=$('b-text').value.trim();if(!text)return toast('Écris le pari d\'abord');
  S.bets.push({text,stake:$('b-stake').value.trim(),pts:+$('b-pts').value,winner:null,at:Date.now()});
  $('b-text').value='';$('b-stake').value='';save();renderScores();toast('Pari enregistré 🤝');
};
$('reset').onclick=async()=>{if(await ask('Remettre à zéro ?','Les scores repartent à 0 et l\'historique est effacé.')){S.scores=[0,0];S.bets=[];save();renderScores()}};

// ---------- Voyage ----------
const PHRASES=[
  ['Bonjour','안녕하세요','annyeonghaseyo','こんにちは','konnichiwa'],
  ['Merci','감사합니다','gamsahamnida','ありがとうございます','arigatō gozaimasu'],
  ['Je prends ça, s\'il vous plaît','이거 주세요','igeo juseyo','これください','kore kudasai'],
  ['C\'est combien ?','얼마예요?','eolmayeyo ?','いくらですか？','ikura desu ka ?'],
  ['C\'est délicieux !','맛있어요!','masisseoyo !','おいしい！','oishii !'],
  ['Où sont les toilettes ?','화장실 어디예요?','hwajangsil eodiyeyo ?','トイレはどこですか？','toire wa doko desu ka ?'],
  ['Santé !','건배!','geonbae !','乾杯！','kanpai !'],
  ['Je t\'aime','사랑해','saranghae','愛してる','aishiteru'],
  ['Pardon / Excusez-moi','죄송합니다','joesonghamnida','すみません','sumimasen'],
  ['L\'addition, s\'il vous plaît','계산해 주세요','gyesanhae juseyo','お会計お願いします','okaikei onegaishimasu'],
  ['Pas trop épicé, s\'il vous plaît','안 맵게 해 주세요','an maepge hae juseyo','辛くしないでください','karaku shinaide kudasai'],
  ['Vous pouvez nous prendre en photo ?','사진 좀 찍어 주세요','sajin jom jjigeo juseyo','写真を撮ってもらえますか？','shashin o totte moraemasu ka ?'],
  ['Trop bien ! / Incroyable !','대박!','daebak !','すごい！','sugoi !'],
  ['Encore un verre, s\'il vous plaît','한 잔 더 주세요','han jan deo juseyo','もう一杯ください','mō ippai kudasai'],
  ['Je ne comprends pas','이해 못 했어요','ihae mot haesseoyo','わかりません','wakarimasen'],
  ['On y va !','가자!','gaja !','行こう！','ikō !'],
];
function curPhrase(){const day=todayStr();if(S.trip.offDay!==day){S.trip.off=0;S.trip.offDay=day}return (hash(day+'p')+S.trip.off)%PHRASES.length}
function renderTrip(){
  const d=S.trip.date;$('t-date').value=d;
  if(d){
    const diff=Math.ceil((new Date(d+'T00:00:00')-new Date(todayStr()+'T00:00:00'))/864e5);
    if(diff>0){$('t-count').innerHTML=`J-${diff}`;$('t-sub').textContent=diff===1?'Demain, Séoul ! Les valises sont prêtes ?':'avant le décollage pour Séoul'}
    else if(diff===0){$('t-count').textContent='C\'est le jour J ! ✈️';$('t-sub').textContent='Bon voyage !'}
    else{$('t-count').textContent='En voyage 🌸';$('t-sub').textContent=`Jour ${-diff+1} de l'aventure`}
  }else{$('t-count').textContent='J-?';$('t-sub').textContent='Choisis la date du départ pour Séoul'}
  const i=curPhrase(),p=PHRASES[i];
  $('p-fr').textContent='« '+p[0]+' »';
  [['p-ko',1],['p-ja',3]].forEach(([id,k])=>{const el=$(id);el.classList.add('hide');el.querySelector('.native').textContent=p[k];el.querySelector('.roman').textContent=p[k+1]});
  const known=S.trip.known.includes(i);
  $('p-known').textContent=known?'✓ Connue':'👍 Je la connais';$('p-known').style.opacity=known?.6:1;
  $('p-stat').textContent=`${S.trip.known.length} / ${PHRASES.length} phrases maîtrisées`;
}
['p-ko','p-ja'].forEach(id=>$(id).onclick=()=>$(id).classList.toggle('hide'));
$('p-next').onclick=()=>{S.trip.off++;save();renderTrip()};
$('p-known').onclick=()=>{const i=curPhrase();if(!S.trip.known.includes(i)){S.trip.known.push(i);save();confetti(20);toast(S.trip.known.length===PHRASES.length?'Toutes maîtrisées ! 대박 🎉':'Bien joué ! 잘했어요 👏')}renderTrip()};
$('t-date').onchange=()=>{S.trip.date=$('t-date').value;save();renderTrip()};

// ---------- Thème ----------
function applyTheme(){document.body.classList.toggle('asia',S.theme==='asia');$('theme-btn').textContent=S.theme==='asia'?'🎲':'🌸';drawWheel()}
$('theme-btn').onclick=()=>{S.theme=S.theme==='asia'?'base':'asia';save();applyTheme();toast(S.theme==='asia'?'Thème Séoul-Osaka 🌸':'Thème classique 🎲')};

function renderAll(){renderDefi();renderWheel();renderScores();renderTrip()}
renderAll();applyTheme();setStatus('local');

function applyRemote(d,first){
  ['names','scores','bets','defi','wheels','trip'].forEach(k=>{if(d[k]!=null)S[k]=clone(d[k])});
  S.defi=Object.assign({},defaults.defi,S.defi);S.trip=Object.assign({},defaults.trip,S.trip);S.wheels=Object.assign({},defaults.wheels,S.wheels);
  if(!Array.isArray(S.names)||S.names.length<2)S.names=defaults.names.slice();
  if(!Array.isArray(S.scores)||S.scores.length<2)S.scores=[0,0];
  if(!Array.isArray(S.bets))S.bets=[];
  if(!Array.isArray(S.trip.known))S.trip.known=[];
  const ls=d.lastSpin;S.lastSpin=ls||null;
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}
  if(document.activeElement&&['n1','n2'].includes(document.activeElement.id)){renderDefi();renderTrip();}else renderAll();
  if(ls&&ls.id&&ls.id!==seenSpin){
    seenSpin=ls.id;
    if(!first&&!spinning&&S.wheels[ls.cat]&&S.wheels[ls.cat].length===ls.n&&Date.now()-ls.at<60000){
      S.wheelCat=ls.cat;renderWheel();goTab('roue');spinTo(ls.idx,ls.off,true);
    }
  }
}

function connect(code){
  if(unsub){unsub();unsub=null}
  room=code;storeRoom(code);ref=F.doc(fdb,'duos',code);setStatus('wait');
  let first=true;
  unsub=F.onSnapshot(ref,{includeMetadataChanges:true},snap=>{
    setStatus(snap.metadata.fromCache?'off':'on');
    if(snap.metadata.hasPendingWrites||dirty)return;
    if(snap.exists()){applyRemote(snap.data(),first);first=false}
    else if(!snap.metadata.fromCache){first=false;dirty=true;flush()} // nouveau duo : on envoie l'état local
  },()=>setStatus('off'));
  renderSync();
}
async function initSync(){
  if(!firebaseConfig.apiKey){setStatus('local');renderSync();return}
  try{
    const appMod=await import(FB+'firebase-app.js');
    F=await import(FB+'firebase-firestore.js');
    fdb=F.getFirestore(appMod.initializeApp(firebaseConfig));
  }catch(e){setStatus('off');renderSync();return}
  const params=new URLSearchParams(location.search),inv=(params.get('duo')||'').trim().toLowerCase();
  if(inv){history.replaceState(null,'',location.pathname);
    if(inv!==getRoom()){storeRoom(inv);toast('Tu as rejoint le duo ! 🎲')}
  }
  connect(getRoom()||newCode());
}

// ---------- Fenêtre « Synchro » ----------
const inviteUrl=()=>location.origin+'/?duo='+room;
function renderSync(){
  const ok=!!(F&&room);
  $('sy-on').style.display=ok?'block':'none';
  $('sy-off').style.display=ok?'none':'block';
  if(ok)$('sy-code').textContent=room;
}
document.querySelector('header .pill').onclick=()=>{renderSync();$('sync-modal').classList.add('on')};
$('sy-close').onclick=()=>$('sync-modal').classList.remove('on');
$('sy-share').onclick=async()=>{
  const url=inviteUrl();
  try{if(navigator.share){await navigator.share({title:'Duo',text:'Rejoins-moi sur Duo 🎲',url});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(url);toast('Lien copié 📋')}catch(e){toast(url)}
};
$('sy-join').onsubmit=async e=>{
  e.preventDefault();
  const c=$('sy-input').value.trim().toLowerCase().replace(/.*duo=/,'');
  if(c.length<6)return toast('Code trop court');
  if(c===room)return toast('Tu es déjà dans ce duo');
  $('sync-modal').classList.remove('on');
  if(!await ask('Rejoindre ce duo ?','Tes scores et paris actuels seront remplacés par ceux du duo.'))return;
  $('sy-input').value='';connect(c);toast('Duo rejoint ! 🎲');
};

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
initSync();
document.fonts&&document.fonts.ready.then(drawWheel);
