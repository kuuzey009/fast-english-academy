import { useState, useEffect, useRef, useCallback } from "react";

const SUPER_PASS = "superadmin2024";
const APP_NAME = "Fast English Academy";

// ─── AUDIO ────────────────────────────────────────────────────────
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const g = ctx.createGain();
    g.connect(ctx.destination);
    const o = ctx.createOscillator();
    o.connect(g);
    if (type === "correct") {
      o.frequency.setValueAtTime(523, ctx.currentTime);
      o.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      o.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.start(); o.stop(ctx.currentTime + 0.5);
    } else if (type === "wrong") {
      o.type = "sawtooth";
      o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
    } else if (type === "streak") {
      [523, 659, 784, 1047].forEach((f, i) => {
        const o2 = ctx.createOscillator(); o2.connect(g);
        o2.frequency.value = f;
        o2.start(ctx.currentTime + i * 0.08);
        o2.stop(ctx.currentTime + i * 0.08 + 0.15);
      });
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    } else if (type === "tick") {
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      o.start(); o.stop(ctx.currentTime + 0.05);
    } else if (type === "win") {
      [523,659,784,1047,1319].forEach((f,i) => {
        const o2 = ctx.createOscillator(); o2.connect(g);
        o2.frequency.value = f; o2.type = "triangle";
        o2.start(ctx.currentTime + i * 0.1);
        o2.stop(ctx.currentTime + i * 0.1 + 0.2);
      });
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    }
  } catch(_) {}
}

// ─── STORAGE ──────────────────────────────────────────────────────
async function loadAccounts() {
  try { const r = await window.storage.get("fea_accounts"); if (r) return JSON.parse(r.value); } catch(_) {}
  return {};
}
async function saveAccounts(acc) { try { await window.storage.set("fea_accounts", JSON.stringify(acc)); } catch(_) {} }
async function loadUserData(user) {
  try { const r = await window.storage.get(`fea_data_${user}`); if (r) return JSON.parse(r.value); } catch(_) {}
  return null;
}
async function saveUserData(user, data) { try { await window.storage.set(`fea_data_${user}`, JSON.stringify(data)); } catch(_) {} }

const DEFAULT_DATA = () => ({
  studentCount: { "7": 30, "8": 30 },
  usedNums: { "7-vocab": [], "7-test": [], "8-vocab": [], "8-test": [] },
  vocabTime: 30, testTime: 45,
  leaderboard: [],
  brandColor: "#6366f1",
  brandLogo: "",
  content: {
    "7": {
      vocab: [
        { word: "Brave", options: ["Korkak","Cesur","Üzgün","Yorgun"], answer: "Cesur" },
        { word: "Clever", options: ["Aptal","Güçlü","Zeki","Tembel"], answer: "Zeki" },
        { word: "Danger", options: ["Güvenlik","Eğlence","Tehlike","Barış"], answer: "Tehlike" },
        { word: "Honest", options: ["Yalancı","Dürüst","Tembel","Korkak"], answer: "Dürüst" },
        { word: "Freedom", options: ["Hapishane","Özgürlük","Korku","Barış"], answer: "Özgürlük" },
      ],
      test: [
        { question: "She ___ to school every day.", options: ["go","goes","going","went"], answer: "goes" },
        { question: "I ___ my homework yesterday.", options: ["do","does","did","done"], answer: "did" },
        { question: "They ___ friends since 2010.", options: ["are","were","have been","had"], answer: "have been" },
      ],
    },
    "8": {
      vocab: [
        { word: "Abundance", options: ["Bolluk","Kıtlık","Tehlike","Sessizlik"], answer: "Bolluk" },
        { word: "Environment", options: ["Hayvan","Çevre","Bitki","İklim"], answer: "Çevre" },
        { word: "Efficient", options: ["Verimsiz","Verimli","Yavaş","Eski"], answer: "Verimli" },
        { word: "Pollution", options: ["Temizlik","Kirlilik","Işık","Ses"], answer: "Kirlilik" },
        { word: "Ambitious", options: ["Tembel","Uysal","Hırslı","Sakin"], answer: "Hırslı" },
      ],
      test: [
        { question: "They ___ football when it rained.", options: ["play","played","were playing","are playing"], answer: "were playing" },
        { question: "She has been waiting ___ two hours.", options: ["since","for","at","in"], answer: "for" },
        { question: "If I ___ rich, I would travel.", options: ["am","was","were","be"], answer: "were" },
      ],
    },
  },
});

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function parseItems(text) {
  return text.trim().split("\n").map(l=>l.trim()).filter(Boolean).map(line=>{
    const p = line.split("|").map(s=>s.trim());
    if(p.length>=3){ return {word:p[0],question:p[0],options:p.slice(1,p.length-1),answer:p[p.length-1]}; }
    return null;
  }).filter(Boolean);
}

const themes = {
  dark: { bg:"linear-gradient(135deg,#0f172a,#1e293b,#0f172a)", card:"rgba(255,255,255,0.05)", cardBorder:"rgba(255,255,255,0.09)", text:"#f1f5f9", sub:"#94a3b8", muted:"#475569", input:"#0f172a", inputBorder:"#334155", surface:"#0f172a", surfaceBorder:"#1e293b", navBg:"rgba(15,23,42,0.96)" },
  light: { bg:"linear-gradient(135deg,#f0f9ff,#e0f2fe,#f0fdf4)", card:"rgba(255,255,255,0.88)", cardBorder:"rgba(0,0,0,0.09)", text:"#0f172a", sub:"#475569", muted:"#94a3b8", input:"#ffffff", inputBorder:"#cbd5e1", surface:"#f8fafc", surfaceBorder:"#e2e8f0", navBg:"rgba(248,250,252,0.96)" },
};

// ─── ROOT ─────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState("dark");
  const T = themes[theme];
  const [screen, setScreen] = useState("landing");
  const [accounts, setAccounts] = useState(null);
  const [loggedUser, setLoggedUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [teacherRef, setTeacherRef] = useState(null);
  const [gameParams, setGameParams] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(()=>{ loadAccounts().then(a=>setAccounts(a||{})); },[]);

  async function updateData(nd){ setUserData(nd); await saveUserData(loggedUser,nd); }

  function pickNums(grade,mode,count=1){
    const key=`${grade}-${mode}`;
    const total=userData.studentCount[grade];
    const used=userData.usedNums[key]||[];
    const all=Array.from({length:total},(_,i)=>i+1);
    const remaining=all.filter(n=>!used.includes(n));
    const pool=remaining.length>=count?remaining:all;
    const picked=shuffle(pool).slice(0,count);
    const newUsed=[...new Set([...used,...picked])].filter(n=>n<=total);
    return {nums:picked,newUsed};
  }

  function startSingle(grade,mode){
    const {nums,newUsed}=pickNums(grade,mode,1);
    updateData({...userData,usedNums:{...userData.usedNums,[`${grade}-${mode}`]:newUsed}});
    setGameParams({grade,mode,num:nums[0],multiPlayer:false});
    setScreen("select");
  }
  function startMulti(grade,mode){
    const {nums,newUsed}=pickNums(grade,mode,2);
    updateData({...userData,usedNums:{...userData.usedNums,[`${grade}-${mode}`]:newUsed}});
    setGameParams({grade,mode,nums,multiPlayer:true});
    setScreen("multiSelect");
  }
  function logout(){ setLoggedUser(null);setUserRole(null);setUserData(null);setTeacherRef(null);setScreen("landing"); }

  const gameData = userRole==="student"?teacherRef:userData;
  const accent = userData?.brandColor||"#6366f1";

  if(!accounts) return <Loader T={themes.dark}/>;

  const cp={T,theme,setTheme,logout,userRole,loggedUser,accounts,soundOn,setSoundOn,accent};

  if(screen==="landing") return <LandingScreen {...cp} setAccounts={setAccounts} setLoggedUser={setLoggedUser} setUserRole={setUserRole} setUserData={setUserData} setTeacherRef={setTeacherRef} setScreen={setScreen}/>;
  if(screen==="select") return <SelectPage {...gameParams} T={T} theme={theme} setTheme={setTheme} accent={accent} onStart={()=>setScreen("game")} onBack={()=>setScreen("home")}/>;
  if(screen==="multiSelect") return <MultiSelectPage {...gameParams} T={T} theme={theme} setTheme={setTheme} accent={accent} onStart={()=>setScreen("multigame")} onBack={()=>setScreen("home")}/>;
  if(screen==="game") return <GamePage key={`s-${gameParams?.grade}-${gameParams?.mode}-${gameParams?.num}`} {...gameParams} gameData={gameData} T={T} accent={accent} setScreen={setScreen} updateData={updateData} userData={userData} userRole={userRole} soundOn={soundOn} paused={paused} setPaused={setPaused}/>;
  if(screen==="multigame") return <MultiGame key={`m-${gameParams?.grade}-${gameParams?.mode}`} {...gameParams} gameData={gameData} T={T} accent={accent} setScreen={setScreen} updateData={updateData} userData={userData} soundOn={soundOn} paused={paused} setPaused={setPaused}/>;
  if(screen==="leaderboard") return <LeaderboardScreen userData={userData} {...cp} setScreen={setScreen} updateData={updateData}/>;
  if(screen==="stats") return <StatsScreen userData={userData} {...cp} setScreen={setScreen}/>;
  if(screen==="admin") return <AdminPage userData={userData} updateData={updateData} setScreen={setScreen} {...cp}/>;
  if(screen==="superadmin") return <SuperAdminScreen accounts={accounts} setAccounts={setAccounts} saveAccounts={saveAccounts} {...cp} setScreen={setScreen}/>;
  return <HomePage userData={userData} updateData={updateData} startSingle={startSingle} startMulti={startMulti} setScreen={setScreen} teacherRef={teacherRef} {...cp}/>;
}

function Loader({T}){ return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"sans-serif",fontSize:18}}>⚡ Yükleniyor...</div>; }

// ─── LANDING ──────────────────────────────────────────────────────
function LandingScreen({T,theme,setTheme,accounts,setAccounts,setLoggedUser,setUserRole,setUserData,setTeacherRef,setScreen,accent}){
  const [tab,setTab]=useState("student");
  const [form,setForm]=useState({user:"",pass:""});
  const [err,setErr]=useState("");

  async function doLogin(){
    const{user,pass}=form;
    if(!user.trim()){setErr("Kullanıcı adı girin.");return;}
    if(tab==="super"){
      if(user==="superadmin"&&pass===SUPER_PASS){setLoggedUser("superadmin");setUserRole("super");setScreen("superadmin");setErr("");return;}
      setErr("Hatalı bilgiler!");return;
    }
    const acc=accounts[user];
    if(!acc){setErr("Kullanıcı bulunamadı!");return;}
    if(tab==="teacher"){
      if(acc.role!=="teacher"||acc.pass!==pass){setErr("Hatalı şifre!");return;}
      let d=await loadUserData(user);if(!d){d=DEFAULT_DATA();await saveUserData(user,d);}
      setLoggedUser(user);setUserRole("teacher");setUserData(d);setScreen("home");setErr("");
    } else {
      if(acc.role!=="student"){setErr("Öğrenci hesabı değil!");return;}
      let td=await loadUserData(acc.teacher);if(!td){td=DEFAULT_DATA();}
      setLoggedUser(user);setUserRole("student");setTeacherRef(td);setScreen("home");setErr("");
    }
  }

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text,display:"flex",flexDirection:"column"}}>
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 22px",backdropFilter:"blur(10px)",background:T.navBg,borderBottom:`1px solid ${T.cardBorder}`}}>
        <Brand accent={accent} userData={null}/>
        <ThemeToggle theme={theme} setTheme={setTheme} T={T}/>
      </nav>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 16px",gap:26}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:56,marginBottom:6}}>🎓</div><h1 style={{fontSize:26,fontWeight:900,margin:"0 0 5px",color:T.text}}>{APP_NAME}</h1><p style={{color:T.sub,margin:0,fontSize:13}}>7. & 8. Sınıf İngilizce Platformu</p></div>
        <div style={{width:"100%",maxWidth:360,background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:24,padding:24,backdropFilter:"blur(20px)"}}>
          <div style={{display:"flex",gap:4,marginBottom:18,background:T.surface,borderRadius:12,padding:3}}>
            {[["student","🎮 Öğrenci"],["teacher","👩‍🏫 Öğretmen"],["super","👑 Admin"]].map(([t,l])=>(
              <button key={t} onClick={()=>{setTab(t);setErr("");setForm({user:"",pass:""});}} style={{flex:1,padding:"8px 2px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:11,background:tab===t?accent:"transparent",color:tab===t?"#fff":T.sub}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={form.user} onChange={e=>setForm(f=>({...f,user:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder={tab==="student"?"Öğrenci adı":tab==="teacher"?"Öğretmen adı":"superadmin"} style={{padding:"11px 13px",borderRadius:11,border:`1.5px solid ${T.inputBorder}`,background:T.input,color:T.text,fontSize:14,width:"100%",boxSizing:"border-box"}}/>
            {tab!=="student"&&<input type="password" value={form.pass} onChange={e=>setForm(f=>({...f,pass:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Şifre" style={{padding:"11px 13px",borderRadius:11,border:`1.5px solid ${T.inputBorder}`,background:T.input,color:T.text,fontSize:14,width:"100%",boxSizing:"border-box"}}/>}
            {tab==="student"&&<div style={{fontSize:11,color:T.muted,textAlign:"center"}}>Şifresiz giriş yapılır.</div>}
            {err&&<div style={{color:"#ef4444",fontSize:12,textAlign:"center"}}>{err}</div>}
            <button onClick={doLogin} style={{padding:"12px",borderRadius:11,background:accent,border:"none",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>Giriş Yap →</button>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          {["📚 Vocabulary","📝 Test","⚔️ Challenge","🏆 Leaderboard","📊 İstatistik","🎨 Özelleştir"].map(f=>(
            <div key={f} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"7px 13px",fontSize:11,color:T.sub}}>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────
function HomePage({userData,updateData,startSingle,startMulti,setScreen,T,theme,setTheme,logout,userRole,loggedUser,accounts,soundOn,setSoundOn,accent}){
  const [challengeOpen,setChallengeOpen]=useState(null);
  const label=userRole==="student"?loggedUser:(accounts?.[loggedUser]?.label||loggedUser);

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text}}>
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",background:T.navBg,backdropFilter:"blur(10px)",borderBottom:`1px solid ${T.cardBorder}`,position:"sticky",top:0,zIndex:10}}>
        <Brand accent={accent} userData={userData}/>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <ThemeToggle theme={theme} setTheme={setTheme} T={T}/>
          <IconBtn icon={soundOn?"🔊":"🔇"} onClick={()=>setSoundOn(s=>!s)} T={T} title="Ses"/>
          <IconBtn icon="🏆" onClick={()=>setScreen("leaderboard")} T={T} color="#f59e0b" title="Skor"/>
          {userRole==="teacher"&&<>
            <IconBtn icon="📊" onClick={()=>setScreen("stats")} T={T} color="#22c55e" title="İstatistik"/>
            <IconBtn icon="⚙️" onClick={()=>setScreen("admin")} T={T} title="Panel"/>
          </>}
          <IconBtn icon="🚪" onClick={logout} T={T} title="Çıkış"/>
        </div>
      </nav>
      <div style={{maxWidth:540,margin:"0 auto",padding:"16px 13px",display:"flex",flexDirection:"column",gap:11}}>
        <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:14,padding:"11px 15px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:`${accent}22`,border:`2px solid ${accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{userRole==="student"?"🎮":"👩‍🏫"}</div>
          <div><div style={{fontWeight:700,fontSize:14}}>{label}</div><div style={{fontSize:11,color:T.muted}}>{userRole==="student"?"Öğrenci":"Öğretmen"}</div></div>
        </div>
        {["7","8"].map(g=>(
          <div key={g} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:15}}>
            <div style={{fontWeight:800,fontSize:15,color:g==="7"?"#f59e0b":"#38bdf8",marginBottom:11}}>{g==="7"?"🟡":"🔵"} {g}. Sınıf</div>
            {["vocab","test"].map(m=>{
              const c=m==="vocab"?"#e94560":"#0f9b8e";
              const key=`${g}-${m}`;
              const used=userRole==="teacher"?((userData.usedNums[key]||[]).length):0;
              const total=userRole==="teacher"?userData.studentCount[g]:0;
              const pct=total>0?(used/total)*100:0;
              const allDone=userRole==="teacher"&&used>=total&&total>0;
              const isOpen=challengeOpen?.g===g&&challengeOpen?.m===m;
              return(
                <div key={m} style={{marginBottom:8}}>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    <button onClick={()=>userRole==="teacher"?startSingle(g,m):null} style={{flex:1,padding:"11px 8px",borderRadius:12,background:`${c}18`,border:`2px solid ${c}`,color:T.text,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                      {m==="vocab"?"📚 Vocabulary":"📝 Test"}
                    </button>
                    {userRole==="teacher"&&<button onClick={()=>setChallengeOpen(isOpen?null:{g,m})} style={{padding:"11px 13px",borderRadius:12,background:isOpen?`${accent}22`:T.surface,border:`2px solid ${isOpen?accent:T.cardBorder}`,color:isOpen?accent:T.muted,fontWeight:700,fontSize:12,cursor:"pointer"}}>⚔️</button>}
                  </div>
                  {isOpen&&(
                    <div style={{marginTop:7,display:"flex",gap:7,padding:"11px",background:`${accent}10`,borderRadius:12,border:`1px solid ${accent}33`}}>
                      <button onClick={()=>{startSingle(g,m);setChallengeOpen(null);}} style={{flex:1,padding:"9px 5px",borderRadius:10,background:`${accent}20`,border:`1px solid ${accent}`,color:accent,fontWeight:700,fontSize:12,cursor:"pointer"}}>👤 Single</button>
                      <button onClick={()=>{startMulti(g,m);setChallengeOpen(null);}} style={{flex:1,padding:"9px 5px",borderRadius:10,background:"#f59e0b22",border:"1px solid #f59e0b",color:"#fbbf24",fontWeight:700,fontSize:12,cursor:"pointer"}}>👥 Multi</button>
                    </div>
                  )}
                  {userRole==="teacher"&&(<>
                    <div style={{height:3,background:T.surfaceBorder,borderRadius:3,margin:"5px 0 2px"}}><div style={{height:"100%",background:c,borderRadius:3,width:`${pct}%`,transition:"width .4s"}}/></div>
                    <div style={{fontSize:10,color:T.muted,textAlign:"center"}}>{used}/{total}{allDone&&<> · Tamamlandı <button onClick={()=>updateData({...userData,usedNums:{...userData.usedNums,[key]:[]}})} style={{background:"none",border:"none",color:"#f59e0b",cursor:"pointer",fontSize:10}}>↺</button></>}</div>
                  </>)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SELECT PAGES ─────────────────────────────────────────────────
function SelectPage({num,grade,mode,T,theme,setTheme,accent,onStart,onBack}){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),100);return()=>clearTimeout(t);},[]);
  const c=mode==="vocab"?"#e94560":"#0f9b8e";
  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:22}}>
      <div style={{position:"absolute",top:14,right:14}}><ThemeToggle theme={theme} setTheme={setTheme} T={T}/></div>
      <div style={{fontSize:13,color:T.muted}}>{grade}. Sınıf · {mode==="vocab"?"📚 Vocabulary":"📝 Test"}</div>
      <div style={{transform:show?"scale(1) rotate(0deg)":"scale(0.3) rotate(-20deg)",opacity:show?1:0,transition:"all 0.55s cubic-bezier(0.34,1.56,0.64,1)",background:`radial-gradient(circle at 30% 30%, ${c}44, ${c}11)`,border:`4px solid ${c}`,borderRadius:"50%",width:155,height:155,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 60px ${c}55`}}>
        <div style={{fontSize:11,color:c,fontWeight:600,letterSpacing:2}}>NUMARA</div>
        <div style={{fontSize:60,fontWeight:900,lineHeight:1.1}}>{num}</div>
      </div>
      <div style={{display:"flex",gap:9}}>
        <button onClick={onStart} style={{padding:"12px 30px",borderRadius:13,background:c,border:"none",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>🚀 Başla!</button>
        <button onClick={onBack} style={{padding:"12px 16px",borderRadius:13,background:T.card,border:`1px solid ${T.cardBorder}`,color:T.sub,cursor:"pointer"}}>← Geri</button>
      </div>
    </div>
  );
}

function MultiSelectPage({nums,grade,mode,T,theme,setTheme,accent,onStart,onBack}){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),150);return()=>clearTimeout(t);},[]);
  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:22,padding:22}}>
      <div style={{position:"absolute",top:14,right:14}}><ThemeToggle theme={theme} setTheme={setTheme} T={T}/></div>
      <div style={{fontSize:13,color:T.muted}}>⚔️ Multiplayer · {grade}. Sınıf</div>
      <div style={{fontSize:18,fontWeight:800}}>Rakipler belirlendi!</div>
      <div style={{display:"flex",gap:20,alignItems:"center"}}>
        {[0,1].map(i=>(
          <div key={i} style={{transform:show?"scale(1)":"scale(0.2)",opacity:show?1:0,transition:`all 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i*0.15}s`,background:i===0?`${accent}33`:"#f59e0b33",border:`4px solid ${i===0?accent:"#f59e0b"}`,borderRadius:"50%",width:115,height:115,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 40px ${i===0?accent+"55":"#f59e0b55"}`}}>
            <div style={{fontSize:10,color:i===0?accent:"#fbbf24",fontWeight:700,letterSpacing:1}}>OYUNCU {i+1}</div>
            <div style={{fontSize:44,fontWeight:900,lineHeight:1.1}}>{nums[i]}</div>
          </div>
        ))}
        <div style={{fontSize:24,fontWeight:900,color:T.muted}}>VS</div>
      </div>
      <div style={{display:"flex",gap:9}}>
        <button onClick={onStart} style={{padding:"12px 28px",borderRadius:13,background:`linear-gradient(90deg,${accent},#f59e0b)`,border:"none",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>⚔️ Başlasın!</button>
        <button onClick={onBack} style={{padding:"12px 16px",borderRadius:13,background:T.card,border:`1px solid ${T.cardBorder}`,color:T.sub,cursor:"pointer"}}>← Geri</button>
      </div>
    </div>
  );
}

// ─── GAME PAGE ────────────────────────────────────────────────────
function GamePage({grade,mode,num,gameData,T,accent,setScreen,updateData,userData,userRole,soundOn,paused,setPaused}){
  const list=gameData?.content?.[grade]?.[mode]||[];
  const timeLimit=mode==="vocab"?(gameData?.vocabTime||30):(gameData?.testTime||45);
  const [queue]=useState(()=>shuffle(list));
  const [idx,setIdx]=useState(0);
  const [score,setScore]=useState(0);
  const [timeLeft,setTimeLeft]=useState(timeLimit);
  const [chosen,setChosen]=useState(null);
  const [done,setDone]=useState(false);
  const [results,setResults]=useState([]);
  const [streak,setStreak]=useState(0);
  const [streakMsg,setStreakMsg]=useState(null);
  const [optPos,setOptPos]=useState([0,0,0,0]);
  const [countdown,setCountdown]=useState(null);
  const timer=useRef(null);
  const c=mode==="vocab"?"#e94560":"#0f9b8e";
  const cur=queue[idx];
  const question=mode==="vocab"?cur?.word:cur?.question;
  const opts=cur?.options||[];
  const correct=cur?.answer;
  const hardMode=mode==="vocab"&&streak>=3;

  useEffect(()=>{
    if(done||chosen!==null||paused)return;
    setTimeLeft(timeLimit);
    timer.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=4&&t>1&&soundOn)playSound("tick");
        if(t<=1){clearInterval(timer.current);triggerCountdown(()=>ans(null,0));return 0;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(timer.current);
  },[idx,done,paused]);

  useEffect(()=>{
    if(paused)clearInterval(timer.current);
  },[paused]);

  function triggerCountdown(cb){
    let c=3;setCountdown(c);
    const iv=setInterval(()=>{c--;if(c<=0){clearInterval(iv);setCountdown(null);cb();}else setCountdown(c);},700);
  }

  useEffect(()=>{
    if(!hardMode||chosen!==null||done||paused)return;
    const iv=setInterval(()=>{
      setOptPos(prev=>prev.map((_,i)=>Math.sin(Date.now()/500+i*1.5)*Math.min(streak*5,32)));
    },50);
    return()=>clearInterval(iv);
  },[hardMode,streak,chosen,done,paused]);

  useEffect(()=>{if(chosen!==null)setOptPos([0,0,0,0]);},[chosen]);

  function ans(opt,forced){
    clearInterval(timer.current);
    if(chosen!==null)return;
    const pts=forced!==undefined?forced:(opt===correct?timeLeft:0);
    const isOk=opt===correct;
    const ns=isOk?streak+1:0;
    setChosen(opt||"__t__");setScore(s=>s+pts);
    setResults(r=>[...r,{question,correct,chosen:opt,pts}]);
    if(soundOn)playSound(isOk?"correct":"wrong");
    if(mode==="vocab"){
      if(isOk&&(ns===3||ns===5)){if(soundOn)playSound("streak");setStreakMsg(ns===3?"perfect":"hardworking");setTimeout(()=>setStreakMsg(null),1900);}
      setStreak(ns);
    }
    setTimeout(()=>{if(idx+1>=queue.length)setDone(true);else{setIdx(i=>i+1);setChosen(null);}},1300);
  }

  function saveToLB(){
    if(!userData||!num)return;
    const ok=results.filter(r=>r.chosen===r.correct).length;
    const entry={num,score,correct:ok,total:queue.length,grade,mode,date:new Date().toLocaleDateString("tr")};
    const lb=[...(userData.leaderboard||[]),entry].sort((a,b)=>b.score-a.score).slice(0,50);
    updateData({...userData,leaderboard:lb});
  }

  if(list.length===0)return<Empty T={T} c={c} onBack={()=>setScreen("home")}/>;

  if(done){
    saveToLB();
    const ok=results.filter(r=>r.chosen===r.correct).length;
    if(soundOn&&ok/queue.length>=0.7)playSound("win");
    return<ResultPage results={results} score={score} total={queue.length} num={num} grade={grade} mode={mode} T={T} c={c} setScreen={setScreen} userRole={userRole}/>;
  }
  if(!cur)return null;

  const pct=(timeLeft/timeLimit)*100;
  const tc=pct>50?"#22c55e":pct>25?"#f59e0b":"#ef4444";

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:13}}>
      <GlobalStyles/>
      {streakMsg&&<StreakOverlay msg={streakMsg}/>}
      {countdown!==null&&<CountdownOverlay n={countdown} T={T}/>}
      <div style={{width:"100%",maxWidth:510}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
          <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:17}}>←</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontWeight:700,fontSize:12,color:T.text}}>{grade}. Sınıf · {mode==="vocab"?"📚":"📝"}</div>
            {num&&<div style={{fontSize:11,color:c}}>🔢 {num}</div>}
            {hardMode&&<div style={{fontSize:10,color:"#f59e0b",fontWeight:700}}>🔥 HARD MODE</div>}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {mode==="vocab"&&streak>=2&&<div style={{fontSize:11,color:"#fbbf24",fontWeight:700}}>🔥×{streak}</div>}
            <button onClick={()=>setPaused(p=>!p)} style={{background:"none",border:`1px solid ${T.cardBorder}`,color:T.sub,borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:12}}>{paused?"▶":"⏸"}</button>
            <span style={{background:T.surface,padding:"3px 10px",borderRadius:18,fontWeight:700,color:"#fbbf24",fontSize:12}}>🏆{score}</span>
          </div>
        </div>
        {paused&&<PauseBanner T={T}/>}
        <div style={{height:3,background:T.surfaceBorder,borderRadius:3,marginBottom:3}}><div style={{height:"100%",background:c,borderRadius:3,width:`${(idx/queue.length)*100}%`,transition:"width .4s"}}/></div>
        <div style={{textAlign:"right",fontSize:10,color:T.muted,marginBottom:9}}>{idx+1}/{queue.length}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:13}}>
          <div style={{flex:1,height:8,background:T.surfaceBorder,borderRadius:8}}><div style={{height:"100%",background:tc,borderRadius:8,width:`${pct}%`,transition:"width 1s linear"}}/></div>
          <span style={{fontWeight:700,color:tc,minWidth:24,fontSize:13}}>{timeLeft}s</span>
        </div>
        <div style={{background:T.card,borderRadius:17,padding:"20px 16px",textAlign:"center",marginBottom:14,border:`1px solid ${T.cardBorder}`}}>
          <div style={{fontSize:mode==="vocab"?30:15,fontWeight:800,lineHeight:1.4,color:T.text}}>{question}</div>
          {mode==="vocab"&&<div style={{marginTop:4,color:T.muted,fontSize:11}}>Türkçe anlamı nedir?</div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {opts.map((opt,i)=>{
            let bg=T.card,border=T.cardBorder,col=T.text;
            if(chosen!==null){if(opt===correct){bg="#16a34a33";border="#22c55e";col="#22c55e";}else if(opt===chosen){bg="#dc262633";border="#ef4444";col="#ef4444";}}
            return(
              <button key={i} onClick={()=>chosen===null&&!paused&&ans(opt)}
                style={{padding:"12px 7px",borderRadius:12,background:bg,border:`2px solid ${border}`,color:col,fontSize:13,fontWeight:600,cursor:chosen?"default":"pointer",transition:"background .2s,border .2s,color .2s",transform:(hardMode&&chosen===null)?`translateY(${optPos[i]||0}px)`:"none"}}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MULTI GAME ───────────────────────────────────────────────────
function MultiGame({grade,mode,nums,gameData,T,accent,setScreen,updateData,userData,soundOn,paused,setPaused}){
  const list=gameData?.content?.[grade]?.[mode]||[];
  const timeLimit=mode==="vocab"?(gameData?.vocabTime||30):(gameData?.testTime||45);
  const [queue]=useState(()=>shuffle(list));
  const [idx,setIdx]=useState(0);
  const [scores,setScores]=useState([0,0]);
  const [timeLeft,setTimeLeft]=useState(timeLimit);
  const [rWin,setRWin]=useState(null);
  const [p1a,setP1a]=useState(null);
  const [p2a,setP2a]=useState(null);
  const [done,setDone]=useState(false);
  const [results,setResults]=useState([]);
  const [streak,setStreak]=useState(0);
  const [streakMsg,setStreakMsg]=useState(null);
  const [optPos,setOptPos]=useState([0,0,0,0]);
  const timer=useRef(null);
  const p1c=accent; const p2c="#f59e0b";
  const cur=queue[idx];
  const question=mode==="vocab"?cur?.word:cur?.question;
  const opts=cur?.options||[];
  const correct=cur?.answer;
  const hardMode=mode==="vocab"&&streak>=3;

  useEffect(()=>{
    if(done||rWin!==null||paused)return;
    setTimeLeft(timeLimit);
    timer.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=4&&t>1&&soundOn)playSound("tick");
        if(t<=1){clearInterval(timer.current);resolveRound(null,null,0);return 0;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(timer.current);
  },[idx,done,paused]);

  useEffect(()=>{if(paused)clearInterval(timer.current);},[paused]);

  useEffect(()=>{
    if(!hardMode||rWin!==null||done||paused)return;
    const iv=setInterval(()=>{setOptPos(prev=>prev.map((_,i)=>Math.sin(Date.now()/500+i*1.5)*Math.min(streak*5,32)));},50);
    return()=>clearInterval(iv);
  },[hardMode,streak,rWin,done,paused]);
  useEffect(()=>{if(rWin!==null)setOptPos([0,0,0,0]);},[rWin]);

  function handleAns(pi,opt){
    if(pi===0&&p1a!==null)return;if(pi===1&&p2a!==null)return;
    if(pi===0)setP1a(opt);else setP2a(opt);
    const other=pi===0?p2a:p1a;
    if(other!==null||opt===correct){
      clearInterval(timer.current);
      const a1=pi===0?opt:(p1a??null),a2=pi===1?opt:(p2a??null);
      resolveRound(a1,a2,timeLeft);
    }
  }

  function resolveRound(a1,a2,tl){
    clearInterval(timer.current);
    const c1=a1===correct,c2=a2===correct;
    let winner=null,pts=[0,0];
    if(c1&&c2){winner="tie";pts=[Math.floor(tl/2),Math.floor(tl/2)];}
    else if(c1){winner=0;pts=[tl,0];}
    else if(c2){winner=1;pts=[0,tl];}
    else winner="none";
    const ns=(c1||c2)?streak+1:0;
    if(soundOn)playSound(c1||c2?"correct":"wrong");
    if(mode==="vocab"){
      if((c1||c2)&&(ns===3||ns===5)){if(soundOn)playSound("streak");setStreakMsg(ns===3?"perfect":"hardworking");setTimeout(()=>setStreakMsg(null),1900);}
      setStreak(ns);
    }
    setScores(s=>[s[0]+pts[0],s[1]+pts[1]]);
    setRWin(winner);
    setResults(r=>[...r,{question,correct,a1,a2,pts,winner}]);
    setTimeout(()=>{
      if(idx+1>=queue.length)setDone(true);
      else{setIdx(i=>i+1);setRWin(null);setP1a(null);setP2a(null);}
    },1400);
  }

  function saveLB(fs){
    if(!userData)return;
    const entries=nums.map((num,i)=>({num,score:fs[i],mode,grade,date:new Date().toLocaleDateString("tr"),multiPlayer:true}));
    const lb=[...(userData.leaderboard||[]),...entries].sort((a,b)=>b.score-a.score).slice(0,50);
    updateData({...userData,leaderboard:lb});
  }

  if(done){
    saveLB(scores);
    const winner=scores[0]>scores[1]?0:scores[1]>scores[0]?1:"tie";
    if(soundOn)playSound("win");
    return<MultiResult nums={nums} scores={scores} winner={winner} results={results} T={T} accent={accent} setScreen={setScreen}/>;
  }
  if(!cur)return null;
  const pct=(timeLeft/timeLimit)*100;
  const tc=pct>50?"#22c55e":pct>25?"#f59e0b":"#ef4444";

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text,display:"flex",flexDirection:"column",padding:11}}>
      <GlobalStyles/>
      {streakMsg&&<StreakOverlay msg={streakMsg}/>}
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
        {[0,1].map(i=>(
          <div key={i} style={{flex:1,background:i===0?`${p1c}22`:`${p2c}22`,border:`2px solid ${i===0?p1c:p2c}`,borderRadius:13,padding:"9px 12px",textAlign:"center"}}>
            <div style={{fontSize:10,color:i===0?p1c:p2c,fontWeight:700}}>P{i+1}·No:{nums[i]}</div>
            <div style={{fontSize:24,fontWeight:900,color:i===0?p1c:p2c}}>{scores[i]}</div>
            {(i===0?p1a:p2a)!==null&&<div style={{fontSize:11,color:(i===0?p1a:p2a)===correct?"#22c55e":"#ef4444"}}>{(i===0?p1a:p2a)===correct?"✓":"✗"}</div>}
          </div>
        ))}
        <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"center"}}>
          <button onClick={()=>setPaused(p=>!p)} style={{background:"none",border:`1px solid ${T.cardBorder}`,color:T.sub,borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12}}>{paused?"▶":"⏸"}</button>
          <button onClick={()=>setScreen("home")} style={{background:"none",border:`1px solid ${T.cardBorder}`,color:T.sub,borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:10}}>✕</button>
        </div>
      </div>
      {paused&&<PauseBanner T={T}/>}
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:9}}>
        <div style={{flex:1,height:7,background:T.surfaceBorder,borderRadius:7}}><div style={{height:"100%",background:tc,borderRadius:7,width:`${pct}%`,transition:"width 1s linear"}}/></div>
        <span style={{fontWeight:700,color:tc,fontSize:13,minWidth:24}}>{timeLeft}s</span>
        <span style={{fontSize:10,color:T.muted}}>{idx+1}/{queue.length}</span>
        {hardMode&&<span style={{fontSize:10,color:"#f59e0b",fontWeight:700}}>🔥</span>}
      </div>
      <div style={{background:T.card,borderRadius:15,padding:"18px 14px",textAlign:"center",marginBottom:12,border:`1px solid ${T.cardBorder}`}}>
        <div style={{fontSize:mode==="vocab"?26:14,fontWeight:800,lineHeight:1.4,color:T.text}}>{question}</div>
        {mode==="vocab"&&<div style={{marginTop:4,color:T.muted,fontSize:11}}>Türkçe anlamı nedir?</div>}
      </div>
      {[0,1].map(pi=>(
        <div key={pi} style={{marginBottom:8}}>
          <div style={{fontSize:10,color:pi===0?p1c:p2c,fontWeight:700,marginBottom:4}}>👤 P{pi+1} (No:{nums[pi]})</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {opts.map((opt,i)=>{
              const myAns=pi===0?p1a:p2a;
              let bg=pi===0?`${p1c}11`:`${p2c}11`,border=pi===0?`${p1c}44`:`${p2c}44`,col=T.text;
              if(rWin!==null||myAns!==null){if(opt===correct){bg="#16a34a33";border="#22c55e";col="#22c55e";}else if(opt===myAns){bg="#dc262633";border="#ef4444";col="#ef4444";}}
              return(
                <button key={i} onClick={()=>myAns===null&&rWin===null&&!paused&&handleAns(pi,opt)}
                  style={{padding:"9px 6px",borderRadius:10,background:bg,border:`2px solid ${border}`,color:col,fontSize:11,fontWeight:600,cursor:myAns!==null?"default":"pointer",transition:"all .2s",transform:(hardMode&&rWin===null&&myAns===null)?`translateY(${optPos[i]||0}px)`:"none"}}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── RESULT ───────────────────────────────────────────────────────
function ResultPage({results,score,total,num,grade,mode,T,c,setScreen,userRole}){
  const ok=results.filter(r=>r.chosen===r.correct).length;
  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text,display:"flex",flexDirection:"column",alignItems:"center",padding:"26px 13px",gap:8}}>
      <div style={{fontSize:46}}>{ok/total>=0.7?"🎉":"📖"}</div>
      {num&&<div style={{fontSize:15,fontWeight:800,color:c}}>No: {num} · {grade}. Sınıf</div>}
      <div style={{fontWeight:800,fontSize:16}}>{ok/total>=0.7?"Harika iş!":"Daha çok çalış!"}</div>
      <div style={{color:T.muted,fontSize:13}}>{ok}/{total} doğru · {score} puan</div>
      <div style={{width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:5,margin:"8px 0"}}>
        {results.map((r,i)=>(
          <div key={i} style={{background:r.chosen===r.correct?"#16a34a22":"#dc262622",border:`1px solid ${r.chosen===r.correct?"#22c55e44":"#ef444444"}`,borderRadius:10,padding:"7px 12px",fontSize:12,color:T.text}}>
            <span style={{color:r.chosen===r.correct?"#22c55e":"#ef4444"}}>{r.chosen===r.correct?"✓":"✗"} </span>
            <strong>{r.question}</strong>
            {r.chosen!==r.correct&&<span style={{color:T.muted}}> → <span style={{color:"#22c55e"}}>{r.correct}</span></span>}
            <span style={{float:"right",color:"#fbbf24"}}>+{r.pts}p</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:9,flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={()=>setScreen("home")} style={{padding:"10px 24px",borderRadius:12,background:c,border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>▶ Sonraki</button>
        <button onClick={()=>setScreen("leaderboard")} style={{padding:"10px 18px",borderRadius:12,background:"#f59e0b22",border:"1px solid #f59e0b44",color:"#f59e0b",cursor:"pointer",fontWeight:700}}>🏆 Skor</button>
      </div>
    </div>
  );
}

function MultiResult({nums,scores,winner,results,T,accent,setScreen}){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),200);return()=>clearTimeout(t);},[]);
  const tie=winner==="tie";
  const medals=["🥇","🥈","🥉"];
  const podH=[120,90,75];
  const podC=["#fbbf24","#94a3b8","#f59e0b"];
  const sorted=[{num:nums[0],score:scores[0],pi:0},{num:nums[1],score:scores[1],pi:1}].sort((a,b)=>b.score-a.score);

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text,display:"flex",flexDirection:"column",alignItems:"center",padding:"26px 13px",gap:12}}>
      <GlobalStyles/>
      <div style={{fontSize:42}}>{tie?"🤝":"🏆"}</div>
      <div style={{fontWeight:900,fontSize:20}}>{tie?"Berabere!":`No: ${nums[winner]} Kazandı!`}</div>
      {/* Podium */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:12,height:160,marginTop:8}}>
        {[1,0].map(rank=>{
          const e=sorted[rank];if(!e)return null;
          return(
            <div key={rank} style={{display:"flex",flexDirection:"column",alignItems:"center",transform:show?"translateY(0)":"translateY(80px)",opacity:show?1:0,transition:`all 0.7s cubic-bezier(0.34,1.56,0.64,1) ${rank*0.12}s`}}>
              <div style={{fontSize:20}}>{medals[rank]}</div>
              <div style={{fontWeight:800,fontSize:14,color:podC[rank]}}>No:{e.num}</div>
              <div style={{fontWeight:700,fontSize:12,color:T.sub}}>{e.score}p</div>
              <div style={{width:75,height:podH[rank],background:`${podC[rank]}33`,border:`2px solid ${podC[rank]}66`,borderRadius:"9px 9px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:7,marginTop:6,fontSize:22,fontWeight:900,color:podC[rank]}}>{rank+1}</div>
            </div>
          );
        })}
      </div>
      <div style={{width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:5}}>
        {results.map((r,i)=>(
          <div key={i} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"6px 12px",fontSize:11,color:T.text}}>
            <strong>{r.question}</strong> → <span style={{color:"#22c55e"}}>{r.correct}</span>
            <span style={{float:"right",fontSize:10}}><span style={{color:accent}}>P1:{r.pts[0]}p</span>·<span style={{color:"#fbbf24"}}>P2:{r.pts[1]}p</span></span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:9}}>
        <button onClick={()=>setScreen("home")} style={{padding:"10px 22px",borderRadius:12,background:accent,border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>🏠 Menü</button>
        <button onClick={()=>setScreen("leaderboard")} style={{padding:"10px 18px",borderRadius:12,background:"#f59e0b22",border:"1px solid #f59e0b44",color:"#f59e0b",cursor:"pointer",fontWeight:700}}>🏆 Skor</button>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────
function LeaderboardScreen({userData,T,theme,setTheme,setScreen,updateData,accent}){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),150);return()=>clearTimeout(t);},[]);
  const lb=userData?.leaderboard||[];
  const top3=lb.slice(0,3);const rest=lb.slice(3);
  const medals=["🥇","🥈","🥉"];const podC=["#fbbf24","#94a3b8","#f59e0b"];const podH=[130,100,80];

  function exportCSV(){
    const rows=[["Sıra","Numara","Puan","Doğru","Toplam","Sınıf","Mod","Tarih"],...lb.map((e,i)=>[i+1,e.num,e.score,e.correct||"",e.total||"",e.grade,e.mode,e.date])];
    const csv=rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="skorlar.csv";a.click();
  }

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text}}>
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:T.navBg,borderBottom:`1px solid ${T.cardBorder}`}}>
        <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:T.sub,cursor:"pointer",fontSize:14,fontWeight:600}}>← Geri</button>
        <span style={{fontWeight:800,color:"#fbbf24",fontSize:15}}>🏆 Skor Tablosu</span>
        <div style={{display:"flex",gap:6}}>
          <ThemeToggle theme={theme} setTheme={setTheme} T={T}/>
          <button onClick={exportCSV} style={{padding:"5px 10px",borderRadius:8,background:"#22c55e22",border:"1px solid #22c55e44",color:"#22c55e",cursor:"pointer",fontSize:11}}>📤 CSV</button>
          <button onClick={()=>updateData({...userData,leaderboard:[]})} style={{padding:"5px 10px",borderRadius:8,background:"#ef444422",border:"1px solid #ef444444",color:"#ef4444",cursor:"pointer",fontSize:11}}>🗑️</button>
        </div>
      </nav>
      <div style={{maxWidth:520,margin:"0 auto",padding:"18px 13px"}}>
        {lb.length===0?(
          <div style={{textAlign:"center",padding:"50px 0",color:T.muted}}><div style={{fontSize:44}}>🏆</div><div style={{marginTop:8,fontWeight:700}}>Henüz skor yok</div></div>
        ):(
          <>
            {top3.length>=1&&(
              <div style={{marginBottom:24}}>
                <div style={{textAlign:"center",fontWeight:800,fontSize:15,marginBottom:16}}>🎖️ İlk 3</div>
                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:10,height:190}}>
                  {[1,0,2].map(rank=>{
                    const e=top3[rank];if(!e)return<div key={rank} style={{width:85}}/>;
                    return(
                      <div key={rank} style={{display:"flex",flexDirection:"column",alignItems:"center",transform:show?"translateY(0)":"translateY(90px)",opacity:show?1:0,transition:`all 0.7s cubic-bezier(0.34,1.56,0.64,1) ${rank*0.12}s`}}>
                        <div style={{fontSize:20}}>{medals[rank]}</div>
                        <div style={{fontWeight:800,fontSize:14,color:podC[rank]}}>No:{e.num}</div>
                        <div style={{fontSize:12,color:T.sub}}>{e.score}p</div>
                        <div style={{width:78,height:podH[rank],background:`${podC[rank]}33`,border:`2px solid ${podC[rank]}66`,borderRadius:"9px 9px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:7,marginTop:6,fontSize:20,fontWeight:900,color:podC[rank]}}>{rank+1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {rest.map((e,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 13px",background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:11,marginBottom:5}}>
                <div style={{display:"flex",gap:9,alignItems:"center"}}>
                  <span style={{color:T.muted,fontWeight:700,fontSize:12,minWidth:20}}>{i+4}.</span>
                  <div><div style={{fontWeight:700,fontSize:13}}>No: {e.num}</div><div style={{fontSize:10,color:T.muted}}>{e.grade}.Sınıf·{e.mode==="vocab"?"📚":"📝"}{e.multiPlayer?"⚔️":""}</div></div>
                </div>
                <span style={{fontWeight:800,color:"#fbbf24",fontSize:14}}>{e.score}p</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────
function StatsScreen({userData,T,theme,setTheme,setScreen,accent}){
  const lb=userData?.leaderboard||[];
  const byNum={};
  lb.forEach(e=>{
    if(!byNum[e.num])byNum[e.num]={num:e.num,totalScore:0,games:0,correct:0,total:0};
    byNum[e.num].totalScore+=e.score;byNum[e.num].games++;
    byNum[e.num].correct+=(e.correct||0);byNum[e.num].total+=(e.total||0);
  });
  const rows=Object.values(byNum).sort((a,b)=>b.totalScore-a.totalScore);
  const avgScore=lb.length?Math.round(lb.reduce((s,e)=>s+e.score,0)/lb.length):0;
  const avgAcc=lb.length?Math.round(lb.filter(e=>e.total).reduce((s,e)=>s+(e.correct/e.total)*100,0)/lb.filter(e=>e.total).length):0;

  function exportCSV(){
    const rows2=[["Numara","Toplam Puan","Oyun Sayısı","Ortalama Puan","Doğru %"],...rows.map(r=>[r.num,r.totalScore,r.games,Math.round(r.totalScore/r.games),r.total?Math.round((r.correct/r.total)*100)+"%":""])];
    const csv=rows2.map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="istatistik.csv";a.click();
  }

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text}}>
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:T.navBg,borderBottom:`1px solid ${T.cardBorder}`}}>
        <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:T.sub,cursor:"pointer",fontSize:14,fontWeight:600}}>← Geri</button>
        <span style={{fontWeight:800,color:"#22c55e",fontSize:15}}>📊 İstatistikler</span>
        <div style={{display:"flex",gap:6}}><ThemeToggle theme={theme} setTheme={setTheme} T={T}/><button onClick={exportCSV} style={{padding:"5px 10px",borderRadius:8,background:"#22c55e22",border:"1px solid #22c55e44",color:"#22c55e",cursor:"pointer",fontSize:11}}>📤 CSV</button></div>
      </nav>
      <div style={{maxWidth:520,margin:"0 auto",padding:"16px 13px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          {[["🎮",lb.length,"Toplam Oyun"],["⭐",avgScore,"Ort. Puan"],["✅",avgAcc+"%","Ort. Doğru"]].map(([ic,v,l])=>(
            <div key={l} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
              <div style={{fontSize:22}}>{ic}</div>
              <div style={{fontWeight:900,fontSize:20,color:T.text}}>{v}</div>
              <div style={{fontSize:10,color:T.muted}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:T.sub}}>Numara Bazlı Sıralama</div>
        {rows.length===0&&<div style={{color:T.muted,fontSize:13,textAlign:"center",padding:"30px 0"}}>Henüz veri yok.</div>}
        {rows.map((r,i)=>{
          const avg=Math.round(r.totalScore/r.games);
          const acc=r.total?Math.round((r.correct/r.total)*100):0;
          return(
            <div key={r.num} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:12,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:T.muted,fontWeight:700,fontSize:13,minWidth:22}}>{i+1}.</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700}}>No: {r.num}</span>
                  <span style={{fontWeight:800,color:"#fbbf24",fontSize:14}}>{r.totalScore}p</span>
                </div>
                <div style={{fontSize:11,color:T.muted}}>{r.games} oyun · Ort:{avg}p · Doğru:{acc}%</div>
                <div style={{height:4,background:T.surfaceBorder,borderRadius:4,marginTop:4}}>
                  <div style={{height:"100%",background:accent,borderRadius:4,width:`${Math.min(acc,100)}%`}}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────
function AdminPage({userData,updateData,setScreen,T,theme,setTheme,logout,loggedUser,accounts,accent}){
  const [tab,setTab]=useState("7-vocab");
  const [paste,setPaste]=useState("");
  const [msg,setMsg]=useState("");
  const [logoInput,setLogoInput]=useState("");
  const tabs=[{id:"7-vocab",label:"7.📚"},{id:"7-test",label:"7.📝"},{id:"8-vocab",label:"8.📚"},{id:"8-test",label:"8.📝"},{id:"students",label:"👥"},{id:"time",label:"⏱️"},{id:"brand",label:"🎨"}];
  const [g,m]=tab.split("-");
  const currentList=(tab!=="students"&&tab!=="time"&&tab!=="brand")?userData.content[g][m]:[];

  function addItems(){
    const items=parseItems(paste);if(!items.length){setMsg("❌ Format hatalı!");return;}
    const nc={...userData.content,[g]:{...userData.content[g],[m]:[...userData.content[g][m],...items]}};
    updateData({...userData,content:nc});setPaste("");setMsg(`✅ ${items.length} öğe eklendi!`);
    setTimeout(()=>setMsg(""),3000);
  }
  function delItem(i){
    const nc={...userData.content,[g]:{...userData.content[g],[m]:userData.content[g][m].filter((_,j)=>j!==i)}};
    updateData({...userData,content:nc});
  }
  const ts=(t)=>({padding:"7px 10px",borderRadius:"8px 8px 0 0",border:"none",cursor:"pointer",fontWeight:700,fontSize:11,background:tab===t?"#6366f1":T.card,color:tab===t?"#fff":T.muted});

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text}}>
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:T.navBg,backdropFilter:"blur(10px)",borderBottom:`1px solid ${T.cardBorder}`}}>
        <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:T.sub,cursor:"pointer",fontSize:13,fontWeight:600}}>← Menü</button>
        <span style={{fontWeight:800,color:"#6366f1",fontSize:14}}>⚙️ Panel</span>
        <ThemeToggle theme={theme} setTheme={setTheme} T={T}/>
      </nav>
      <div style={{maxWidth:700,margin:"0 auto",padding:"16px 12px"}}>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{tabs.map(t=><button key={t.id} style={ts(t.id)} onClick={()=>{setTab(t.id);setPaste("");setMsg("");}
}>{t.label}</button>)}</div>
        <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:"0 16px 16px 16px",padding:15}}>
          {msg&&<div style={{marginBottom:9,padding:"7px 12px",borderRadius:9,background:msg.startsWith("✅")?"#16a34a33":"#dc262633",color:msg.startsWith("✅")?"#22c55e":"#ef4444",fontSize:12}}>{msg}</div>}

          {tab==="brand"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><div style={{fontSize:13,color:T.sub,marginBottom:6}}>🎨 Tema Rengi</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {["#6366f1","#e94560","#0f9b8e","#f59e0b","#22c55e","#8b5cf6","#ef4444","#3b82f6"].map(col=>(
                    <button key={col} onClick={()=>updateData({...userData,brandColor:col})} style={{width:36,height:36,borderRadius:"50%",background:col,border:userData.brandColor===col?"3px solid #fff":"3px solid transparent",cursor:"pointer"}}/>
                  ))}
                </div>
              </div>
              <div><div style={{fontSize:13,color:T.sub,marginBottom:6}}>🖼️ Logo URL (isteğe bağlı)</div>
                <div style={{display:"flex",gap:8}}>
                  <input value={logoInput||userData.brandLogo||""} onChange={e=>setLogoInput(e.target.value)} placeholder="https://..." style={{flex:1,padding:"9px 12px",borderRadius:10,border:`1px solid ${T.inputBorder}`,background:T.input,color:T.text,fontSize:13}}/>
                  <button onClick={()=>updateData({...userData,brandLogo:logoInput})} style={{padding:"9px 14px",borderRadius:10,background:"#6366f1",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>Kaydet</button>
                </div>
                {userData.brandLogo&&<img src={userData.brandLogo} alt="logo" style={{height:40,marginTop:8,borderRadius:8}} onError={e=>e.target.style.display="none"}/>}
              </div>
            </div>
          )}
          {tab==="time"&&(
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              {[["📚 Vocabulary (sn)","vocabTime"],["📝 Test (sn)","testTime"]].map(([label,key])=>(
                <div key={key}><div style={{fontSize:12,color:T.sub,marginBottom:5}}>{label}</div>
                  <input type="number" min={5} max={120} value={userData[key]} onChange={e=>updateData({...userData,[key]:Number(e.target.value)})} style={{width:75,padding:"6px 9px",borderRadius:10,border:`1px solid ${T.inputBorder}`,background:T.input,color:T.text,fontSize:15,textAlign:"center"}}/>
                </div>
              ))}
            </div>
          )}
          {tab==="students"&&(
            <div>
              {["7","8"].map(g=>(
                <div key={g} style={{display:"flex",alignItems:"center",gap:12,marginBottom:9,background:T.surface,padding:"10px 13px",borderRadius:11,border:`1px solid ${T.surfaceBorder}`}}>
                  <span style={{fontWeight:700,color:g==="7"?"#f59e0b":"#38bdf8"}}>{g}. Sınıf</span>
                  <input type="number" min={1} max={200} value={userData.studentCount[g]} onChange={e=>updateData({...userData,studentCount:{...userData.studentCount,[g]:Number(e.target.value)}})} style={{width:75,padding:"5px 8px",borderRadius:9,border:`1px solid ${T.inputBorder}`,background:T.input,color:T.text,fontSize:14,textAlign:"center"}}/>
                  <span style={{fontSize:11,color:T.muted}}>öğrenci</span>
                </div>
              ))}
            </div>
          )}
          {tab!=="students"&&tab!=="time"&&tab!=="brand"&&(
            <>
              <div style={{background:T.surface,borderRadius:9,padding:10,marginBottom:9,fontSize:11,color:T.muted,lineHeight:1.8,border:`1px solid ${T.surfaceBorder}`}}>
                <code style={{color:"#38bdf8"}}>{m==="vocab"?"Kelime":"Soru"} | Şık1 | Şık2 | Şık3 | Şık4 | Doğru</code><br/>
                <code style={{color:"#a3e635"}}>{m==="vocab"?"Brave | Korkak | Cesur | Üzgün | Yorgun | Cesur":"She ___ happy. | is | are | am | be | is"}</code>
              </div>
              <textarea value={paste} onChange={e=>setPaste(e.target.value)} placeholder="Her satır bir soru/kelime..." style={{width:"100%",minHeight:75,padding:9,borderRadius:9,border:`1px solid ${T.inputBorder}`,background:T.input,color:T.text,fontSize:12,resize:"vertical",boxSizing:"border-box"}}/>
              <button onClick={addItems} style={{padding:"8px 18px",borderRadius:10,background:"#6366f1",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",marginTop:5,marginBottom:3}}>+ Ekle</button>
              <div style={{marginTop:11,fontWeight:700,color:T.sub,fontSize:11,marginBottom:5}}>Mevcut ({currentList.length})</div>
              {currentList.map((item,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 10px",borderRadius:9,background:T.surface,marginBottom:4,fontSize:11,border:`1px solid ${T.surfaceBorder}`}}>
                  <span style={{flex:1,paddingRight:7}}><strong style={{color:"#38bdf8"}}>{item.word||item.question}</strong><span style={{color:"#22c55e"}}> → {item.answer}</span><span style={{color:T.muted,fontSize:10,display:"block"}}>{item.options.join(" · ")}</span></span>
                  <button onClick={()=>delItem(i)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SUPER ADMIN ──────────────────────────────────────────────────
function SuperAdminScreen({accounts,setAccounts,saveAccounts,T,theme,setTheme,logout,setScreen,accent}){
  const [form,setForm]=useState({user:"",pass:"",label:"",role:"teacher",teacher:""});
  const [msg,setMsg]=useState("");
  const ac="#6366f1";

  async function addAccount(){
    const{user,pass,label,role,teacher}=form;
    if(!user.trim()||!label.trim()){setMsg("❌ Zorunlu alanlar eksik!");return;}
    if(role==="teacher"&&!pass.trim()){setMsg("❌ Şifre zorunlu!");return;}
    if(role==="student"&&!teacher.trim()){setMsg("❌ Öğretmen seçin!");return;}
    if(accounts[user]){setMsg("❌ Bu kullanıcı adı var!");return;}
    const na={...accounts,[user]:role==="teacher"?{pass,label,role}:{label,role,teacher}};
    await saveAccounts(na);setAccounts(na);
    setForm({user:"",pass:"",label:"",role:"teacher",teacher:""});setMsg("✅ Oluşturuldu!");
    setTimeout(()=>setMsg(""),3000);
  }
  async function delAccount(u){const na={...accounts};delete na[u];await saveAccounts(na);setAccounts(na);}

  const teachers=Object.entries(accounts).filter(([,v])=>v.role==="teacher");
  const students=Object.entries(accounts).filter(([,v])=>v.role==="student");

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color:T.text}}>
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:T.navBg,backdropFilter:"blur(10px)",borderBottom:`1px solid ${T.cardBorder}`}}>
        <span style={{fontWeight:900,color:ac,fontSize:14}}>👑 Süper Admin · {APP_NAME}</span>
        <div style={{display:"flex",gap:7,alignItems:"center"}}><ThemeToggle theme={theme} setTheme={setTheme} T={T}/><button onClick={logout} style={{padding:"5px 10px",borderRadius:9,background:"transparent",border:`1px solid ${T.cardBorder}`,color:T.muted,cursor:"pointer",fontSize:11}}>Çıkış</button></div>
      </nav>
      <div style={{maxWidth:580,margin:"0 auto",padding:"18px 12px",display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:17,padding:18}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:13}}>➕ Yeni Hesap</div>
          {msg&&<div style={{marginBottom:9,padding:"7px 12px",borderRadius:9,background:msg.startsWith("✅")?"#16a34a33":"#dc262633",color:msg.startsWith("✅")?"#22c55e":"#ef4444",fontSize:12}}>{msg}</div>}
          <div style={{display:"flex",gap:5,marginBottom:11,background:T.surface,borderRadius:10,padding:3}}>
            {[["teacher","👩‍🏫 Öğretmen"],["student","🎮 Öğrenci"]].map(([r,l])=>(
              <button key={r} onClick={()=>setForm(f=>({...f,role:r}))} style={{flex:1,padding:"8px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:form.role===r?ac:"transparent",color:form.role===r?"#fff":T.sub}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[["label","Görünen ad"],["user","Kullanıcı adı"],...(form.role==="teacher"?[["pass","Şifre"]]:[])] .map(([k,ph])=>(
              <input key={k} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${T.inputBorder}`,background:T.input,color:T.text,fontSize:13,width:"100%",boxSizing:"border-box"}}/>
            ))}
            {form.role==="student"&&(
              <select value={form.teacher} onChange={e=>setForm(f=>({...f,teacher:e.target.value}))} style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${T.inputBorder}`,background:T.input,color:T.text,fontSize:13,width:"100%",boxSizing:"border-box"}}>
                <option value="">— Öğretmen seçin —</option>
                {teachers.map(([u,v])=><option key={u} value={u}>{v.label} ({u})</option>)}
              </select>
            )}
            <button onClick={addAccount} style={{padding:"10px",borderRadius:10,background:ac,border:"none",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>✅ Oluştur</button>
          </div>
          {form.role==="teacher"&&form.user&&<div style={{marginTop:10,background:T.surface,borderRadius:9,padding:10,fontSize:11,color:T.muted,lineHeight:1.8,border:`1px solid ${T.surfaceBorder}`}}>📋 Öğretmene ver:<br/>👤 {form.user} · 🔑 {form.pass||"..."}</div>}
        </div>
        {[["👩‍🏫 Öğretmenler",teachers],["🎮 Öğrenciler",students]].map(([title,list])=>(
          <div key={title} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:17,padding:16}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:9}}>{title} ({list.length})</div>
            {list.length===0&&<div style={{color:T.muted,fontSize:12}}>Henüz yok.</div>}
            {list.map(([u,v])=>(
              <div key={u} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:10,background:T.surface,marginBottom:4,border:`1px solid ${T.surfaceBorder}`}}>
                <div><div style={{fontWeight:700,fontSize:12}}>{v.label}</div><div style={{fontSize:10,color:T.muted}}>@{u}{v.pass?` · 🔑 ${v.pass}`:` · 🏫 ${accounts[v.teacher]?.label||v.teacher}`}</div></div>
                <button onClick={()=>delAccount(u)} style={{background:"none",border:`1px solid #ef444444`,color:"#ef4444",borderRadius:7,padding:"3px 9px",cursor:"pointer",fontSize:11}}>Sil</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SHARED UI ────────────────────────────────────────────────────
function Brand({accent,userData}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      {userData?.brandLogo?<img src={userData.brandLogo} alt="logo" style={{height:28,borderRadius:6}} onError={e=>e.target.style.display="none"}/>:<span style={{fontSize:20}}>⚡</span>}
      <span style={{fontWeight:900,fontSize:15,color:accent}}>{APP_NAME}</span>
    </div>
  );
}
function ThemeToggle({theme,setTheme,T}){
  return<button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{padding:"5px 11px",borderRadius:16,border:`1px solid ${T.cardBorder}`,background:T.card,color:T.sub,cursor:"pointer",fontSize:13,fontWeight:600}}>{theme==="dark"?"☀️":"🌙"}</button>;
}
function IconBtn({icon,onClick,T,color,title}){
  return<button onClick={onClick} title={title} style={{padding:"6px 11px",borderRadius:9,background:color?`${color}18`:"transparent",border:`1px solid ${color?color+"44":T.cardBorder}`,color:color||T.sub,cursor:"pointer",fontSize:13}}>{icon}</button>;
}
function StreakOverlay({msg}){
  return(
    <div style={{position:"fixed",top:"28%",left:"50%",transform:"translateX(-50%)",zIndex:999,pointerEvents:"none",textAlign:"center",animation:"fadeInOut 1.9s ease forwards"}}>
      <div style={{fontSize:msg==="perfect"?48:40,fontWeight:900,color:msg==="perfect"?"#fbbf24":"#22c55e",textShadow:"0 0 30px currentColor",letterSpacing:3}}>
        {msg==="perfect"?"✨ PERFECT!":"💪 HARDWORKING!"}
      </div>
    </div>
  );
}
function CountdownOverlay({n,T}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
      <div style={{fontSize:80,fontWeight:900,color:"#ef4444",textShadow:"0 0 40px #ef4444",animation:"pulse .5s ease"}}>{n||"⏰"}</div>
    </div>
  );
}
function PauseBanner({T}){
  return<div style={{background:"#f59e0b22",border:"1px solid #f59e0b44",borderRadius:10,padding:"8px 14px",textAlign:"center",color:"#fbbf24",fontWeight:700,fontSize:13,marginBottom:10}}>⏸ Oyun Duraklatıldı</div>;
}
function Empty({T,c,onBack}){
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,fontFamily:"'Segoe UI',sans-serif",color:T.text,padding:22}}>
      <div style={{fontSize:42}}>📭</div><div style={{fontWeight:700}}>Henüz içerik yok</div>
      <button onClick={onBack} style={{padding:"9px 20px",borderRadius:11,background:c,border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>← Geri</button>
    </div>
  );
}
function GlobalStyles(){
  return<style>{`@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) scale(0.7)}20%{opacity:1;transform:translateX(-50%) scale(1.1)}80%{opacity:1;transform:translateX(-50%) scale(1)}100%{opacity:0;transform:translateX(-50%) scale(0.8)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>;
}
