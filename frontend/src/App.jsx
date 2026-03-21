import { useState, useEffect, useRef } from "react";

const API_URL = "https://api.anthropic.com/v1/messages";
const FREE_LIMIT = 10;

const ACTIVITIES = [
  { icon:"🧘", label:"Sitting alone" }, { icon:"🏋️", label:"Working out" },
  { icon:"🚶", label:"Walking" },       { icon:"▶️", label:"Watching a video" },
  { icon:"📖", label:"Reading" },       { icon:"💬", label:"In conversation" },
  { icon:"🌅", label:"Just woke up" },  { icon:"🌙", label:"Can't sleep" },
  { icon:"🚿", label:"In the shower" }, { icon:"✏️", label:"Other" },
];

const MOOD_COLORS = { 1:"#e05", 2:"#e35", 3:"#e64", 4:"#e94", 5:"#eb3",
                      6:"#cb4", 7:"#9b4", 8:"#6b4", 9:"#4a4", 10:"#2a4" };
const moodColor = (s) => MOOD_COLORS[Math.round(s)] || "#aaa";

function MdText({ text }) {
  return (
    <div>
      {text.split(/\n\n+/).map((para, pi) => (
        <p key={pi} style={{ margin: pi===0?0:"10px 0 0", lineHeight:1.7, fontSize:13.5 }}>
          {para.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
            if (part.startsWith("**")&&part.endsWith("**")) return <strong key={i}>{part.slice(2,-2)}</strong>;
            if (part.startsWith("*")&&part.endsWith("*")) return <em key={i}>{part.slice(1,-1)}</em>;
            return part.split("\n").map((l,li,a)=><span key={li}>{l}{li<a.length-1&&<br/>}</span>);
          })}
        </p>
      ))}
    </div>
  );
}

function MoodGraph({ entries }) {
  const scored = entries.filter(e=>e.mood).slice(0,30).reverse();
  if (scored.length < 2) return (
    <div style={{padding:"18px 14px", background:"#f4f4f1", borderRadius:12, textAlign:"center", fontSize:13, color:"#aaa"}}>
      Save a few more entries to see your mood timeline ✨
    </div>
  );
  const W=440, H=110, pad=28;
  const xs = scored.map((_,i)=> pad + (i/(scored.length-1))*(W-pad*2));
  const ys = scored.map(e=> H-pad - ((e.mood-1)/9)*(H-pad*2));
  const path = xs.map((x,i)=>`${i===0?"M":"L"}${x},${ys[i]}`).join(" ");
  const area = `M${xs[0]},${H-8} `+xs.map((x,i)=>`L${x},${ys[i]}`).join(" ")+` L${xs[xs.length-1]},${H-8} Z`;
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        <defs>
          <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#mg)"/>
        <path d={path} fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {scored.map((e,i)=>(
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="5" fill={moodColor(e.mood)} stroke="#fff" strokeWidth="1.5"/>
            <title>{new Date(e.ts).toLocaleDateString()} · {e.moodLabel} ({e.mood}/10)</title>
          </g>
        ))}
        {[2,5,8].map(v=>(
          <text key={v} x={pad-8} y={H-pad-((v-1)/9)*(H-pad*2)+4} fontSize="9" fill="#ccc" textAnchor="end">{v}</text>
        ))}
      </svg>
      <div style={{display:"flex", justifyContent:"space-between", marginTop:4}}>
        <span style={{fontSize:10.5,color:"#ccc"}}>{new Date(scored[0].ts).toLocaleDateString()}</span>
        <span style={{fontSize:10.5,color:"#ccc"}}>{new Date(scored[scored.length-1].ts).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

const S = {
  app:{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"'Inter',sans-serif",background:"#f9f9f7",color:"#1a1a1a"},
  center:{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f9f9f7"},
  pinWrap:{textAlign:"center",padding:"40px 36px",background:"#fff",borderRadius:18,border:"1px solid #ebebeb",width:320,boxShadow:"0 4px 24px rgba(0,0,0,0.06)"},
  appName:{fontSize:22,fontWeight:700,marginBottom:6,letterSpacing:"-0.5px"},
  pinSub:{fontSize:13,color:"#999",marginBottom:24,lineHeight:1.5},
  pinDots:{display:"flex",justifyContent:"center",gap:14,marginBottom:20},
  dot:(f)=>({width:14,height:14,borderRadius:"50%",background:f?"#1a1a1a":"#e0e0e0",transition:"background 0.15s"}),
  numPad:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14},
  numBtn:{padding:"14px 0",fontSize:18,fontWeight:500,border:"1px solid #ebebeb",borderRadius:12,background:"#fff",cursor:"pointer",color:"#1a1a1a"},
  pinErr:{color:"#d44",fontSize:13,marginBottom:10},
  header:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 24px",borderBottom:"1px solid #ebebeb",background:"#fff"},
  logo:{fontSize:17,fontWeight:700,letterSpacing:"-0.4px"},
  hBtns:{display:"flex",gap:8},
  hBtn:{padding:"6px 13px",border:"1px solid #e0e0e0",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,color:"#555",fontWeight:500},
  tabs:{display:"flex",gap:2,padding:"10px 22px 0",borderBottom:"1px solid #ebebeb",background:"#fff"},
  tab:(a)=>({padding:"8px 16px",border:"none",borderBottom:a?"2px solid #1a1a1a":"2px solid transparent",background:"none",cursor:"pointer",fontSize:13,fontWeight:a?650:400,color:a?"#1a1a1a":"#999",fontFamily:"inherit",marginBottom:-1}),
  main:{display:"flex",flex:1,overflow:"hidden"},
  left:{width:"46%",padding:22,overflowY:"auto",borderRight:"1px solid #ebebeb",display:"flex",flexDirection:"column",gap:14},
  panelTitle:{fontSize:15,fontWeight:650,color:"#1a1a1a",marginBottom:2},
  sub:{fontSize:12,color:"#bbb",marginBottom:10},
  textarea:{width:"100%",padding:"13px 14px",border:"1px solid #e4e4e4",borderRadius:12,fontSize:14,resize:"none",fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box",lineHeight:1.65,height:100},
  actLabel:{fontSize:12,fontWeight:600,color:"#888",margin:"10px 0 7px"},
  actGrid:{display:"flex",flexWrap:"wrap",gap:7},
  actChip:(s)=>({padding:"6px 12px",borderRadius:20,fontSize:12.5,cursor:"pointer",fontFamily:"inherit",border:s?"1.5px solid #1a1a1a":"1.5px solid #e4e4e4",background:s?"#1a1a1a":"#fff",color:s?"#fff":"#555",fontWeight:s?600:400,transition:"all 0.12s"}),
  saveBtn:{padding:"9px 20px",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:500,alignSelf:"flex-start",marginTop:10},
  divider:{borderTop:"1px solid #ebebeb"},
  secLabel:{fontSize:11,fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10},
  entryCard:{padding:"12px 14px",border:"1px solid #eeeeec",borderRadius:11,background:"#fff",marginBottom:9},
  eDate:{fontSize:11,color:"#bbb",marginBottom:5},
  eActivity:{display:"inline-block",fontSize:11.5,color:"#888",background:"#f4f4f0",borderRadius:12,padding:"2px 9px",marginBottom:7,marginRight:6},
  eMood:(s)=>({display:"inline-block",fontSize:11.5,borderRadius:12,padding:"2px 9px",marginBottom:7,background:moodColor(s)+"22",color:moodColor(s),fontWeight:600}),
  eText:{fontSize:13.5,lineHeight:1.65,color:"#333"},
  empty:{fontSize:13,color:"#bbb",fontStyle:"italic",padding:"10px 0"},
  right:{flex:1,padding:22,display:"flex",flexDirection:"column"},
  chatBox:{flex:1,overflowY:"auto",paddingRight:4,marginBottom:12},
  welcome:{padding:"16px 18px",background:"#f4f4f1",borderRadius:13,fontSize:13.5,color:"#555",lineHeight:1.7},
  suggBtn:{display:"block",marginTop:8,color:"#555",cursor:"pointer",padding:"6px 11px",background:"#eaeae6",borderRadius:8,fontSize:12.5,border:"none",textAlign:"left",fontFamily:"inherit"},
  userBubble:{display:"flex",justifyContent:"flex-end",marginBottom:12},
  aiBubble:{display:"flex",justifyContent:"flex-start",marginBottom:12},
  userText:{maxWidth:"78%",padding:"10px 14px",borderRadius:"14px 14px 4px 14px",fontSize:13.5,lineHeight:1.65,background:"#1a1a1a",color:"#fff"},
  aiText:{maxWidth:"82%",padding:"12px 15px",borderRadius:"14px 14px 14px 4px",background:"#f0f0ec",color:"#1a1a1a"},
  inputRow:{display:"flex",gap:8},
  chatIn:{flex:1,padding:"10px 14px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:13.5,outline:"none",fontFamily:"inherit",background:"#fff"},
  sendBtn:(d)=>({padding:"10px 16px",background:d?"#ccc":"#1a1a1a",color:"#fff",border:"none",borderRadius:10,cursor:d?"default":"pointer",fontSize:16,fontWeight:600}),
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200},
  modal:{background:"#fff",borderRadius:18,padding:"28px 28px 22px",width:430,maxHeight:"72vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.12)"},
  mTitle:{fontSize:17,fontWeight:700,marginBottom:4},
  mSub:{fontSize:13,color:"#999",marginBottom:18},
  closeBtn:{marginTop:16,padding:"9px 20px",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:500},
  apiKeyInput:{width:"100%",padding:"10px 13px",border:"1.5px solid #e0e0e0",borderRadius:10,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:10},
  freeBadge:{fontSize:11.5,color:"#888",background:"#f4f4f0",borderRadius:8,padding:"3px 9px",marginLeft:8,fontWeight:500},
};

const NUMS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

function PinPad({ isSetup, onSuccess }) {
  const [input,setInput]=useState(""); const [confirm,setConfirm]=useState(null);
  const [err,setErr]=useState(""); const [phase,setPhase]=useState("enter");
  const press=(v)=>{
    if(v==="")return; if(v==="⌫"){setInput(p=>p.slice(0,-1));setErr("");return;}
    if(input.length>=4)return;
    const next=input+v; setInput(next);
    if(next.length===4){
      setTimeout(()=>{
        if(isSetup){
          if(phase==="enter"){setConfirm(next);setInput("");setPhase("confirm");}
          else{ if(next===confirm)onSuccess(next); else{setErr("PINs don't match.");setInput("");setPhase("enter");setConfirm(null);} }
        } else { onSuccess(next); setInput(""); }
      },120);
    }
  };
  return (
    <div style={S.center}><div style={S.pinWrap}>
      <div style={{fontSize:32,marginBottom:10}}>🌱</div>
      <div style={S.appName}>My Inner Archive</div>
      <div style={S.pinSub}>{isSetup?(phase==="confirm"?"Confirm your PIN":"Create a 4-digit PIN"):"Enter your PIN to unlock"}</div>
      <div style={S.pinDots}>{[0,1,2,3].map(i=><div key={i} style={S.dot(i<input.length)}/>)}</div>
      {err&&<div style={S.pinErr}>{err}</div>}
      <div style={S.numPad}>{NUMS.map((n,i)=><button key={i} style={{...S.numBtn,visibility:n===""?"hidden":"visible"}} onClick={()=>press(n)}>{n}</button>)}</div>
    </div></div>
  );
}

export default function App() {
  const [screen,setScreen]=useState("loading");
  const [pin,setPin]=useState(null);
  const [entries,setEntries]=useState([]);
  const [thought,setThought]=useState("");
  const [activity,setActivity]=useState(null);
  const [customAct,setCustomAct]=useState("");
  const [msgs,setMsgs]=useState([]);
  const [chatIn,setChatIn]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [savingMood,setSavingMood]=useState(false);
  const [onThisDay,setOnThisDay]=useState([]);
  const [showOTD,setShowOTD]=useState(false);
  const [activeTab,setActiveTab]=useState("journal"); // journal | mood
  const [msgCount,setMsgCount]=useState(0);
  const [userApiKey,setUserApiKey]=useState("");
  const [showKeyModal,setShowKeyModal]=useState(false);
  const [keyInput,setKeyInput]=useState("");
  const [dailyQuote,setDailyQuote]=useState(null);
  const [quoteLoading,setQuoteLoading]=useState(false);
  const endRef=useRef(null);

  useEffect(()=>{init();},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const init=async()=>{
    let sp=null,se=[],sc=0,sk="";
    try{const r=await window.storage.get("arc_pin");if(r)sp=r.value;}catch{}
    try{const r=await window.storage.get("arc_entries");if(r)se=JSON.parse(r.value);}catch{}
    try{const r=await window.storage.get("arc_msgcount");if(r)sc=parseInt(r.value)||0;}catch{}
    try{const r=await window.storage.get("arc_apikey");if(r)sk=r.value;}catch{}
    setEntries(se); checkOTD(se); setMsgCount(sc); setUserApiKey(sk);
    if(sp){setPin(sp);setScreen("lock");}
    else setScreen("welcome");
  };

  const checkOTD=(all)=>{
    const now=new Date();
    setOnThisDay(all.filter(e=>{const d=new Date(e.ts);return d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()&&d.getFullYear()<now.getFullYear();}));
  };

  const handleSetup=async(p)=>{await window.storage.set("arc_pin",p);setPin(p);setScreen("app");};
  const handleUnlock=(p)=>{if(p===pin)setScreen("app");else alert("Wrong PIN");};

  const callAI=async(messages,system,useKey=null)=>{
    const key=useKey||userApiKey||null;
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    };
    const res=await fetch(API_URL,{method:"POST",headers,body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages})});
    return res.json();
  };

  const scoreMood=async(text)=>{
    try{
      const data=await callAI([{role:"user",content:`Score the emotional mood of this journal entry on a scale of 1-10 (1=very negative/distressed, 5=neutral, 10=very positive/joyful). Also give a one-word label. Respond ONLY in JSON like: {"score":7,"label":"hopeful"}\n\nEntry: "${text}"`}],
        "You analyze the emotional tone of journal entries. Respond only with valid JSON.");
      const txt=data.content?.find(b=>b.type==="text")?.text||"";
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      return parsed;
    }catch{return null;}
  };

  const getActivityLabel=()=>{
    if(!activity)return null;
    if(activity==="Other")return customAct.trim()||"Other";
    return `${ACTIVITIES.find(a=>a.label===activity)?.icon} ${activity}`;
  };

  const saveEntry=async()=>{
    if(!thought.trim())return;
    setSavingMood(true);
    const moodData=await scoreMood(thought.trim());
    const e={id:Date.now().toString(),text:thought.trim(),ts:new Date().toISOString(),activity:getActivityLabel(),mood:moodData?.score||null,moodLabel:moodData?.label||null};
    const updated=[e,...entries];
    setEntries(updated);
    await window.storage.set("arc_entries",JSON.stringify(updated));
    setThought("");setActivity(null);setCustomAct("");setSavingMood(false);
  };

  const exportArchive=()=>{
    const lines=entries.map(e=>{
      const act=e.activity?`\nContext: ${e.activity}`:"";
      const mood=e.mood?`\nMood: ${e.moodLabel} (${e.mood}/10)`:"";
      return `[${new Date(e.ts).toLocaleString()}]${act}${mood}\n${e.text}`;
    }).join("\n\n---\n\n");
    const blob=new Blob([`MY INNER ARCHIVE\nExported: ${new Date().toLocaleString()}\nEntries: ${entries.length}\n\n${"═".repeat(40)}\n\n${lines}`],{type:"text/plain"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="my-inner-archive.txt"; a.click();
  };

  const getDailyQuote=async()=>{
    if(entries.length===0)return;
    setQuoteLoading(true);
    const pool=entries.sort(()=>Math.random()-0.5).slice(0,5);
    const ctx=pool.map(e=>`[${new Date(e.ts).toLocaleDateString()}] ${e.text}`).join("\n\n");
    try{
      const data=await callAI([{role:"user",content:`From these journal entries, extract the single most inspiring or thought-provoking sentence. Return ONLY that sentence, nothing else, no quotes, no explanation:\n\n${ctx}`}],
        "You extract powerful sentences from personal journal entries. Return only the sentence, nothing else.");
      const quote=data.content?.find(b=>b.type==="text")?.text?.trim()||"Keep writing. Your best insight is one entry away.";
      setDailyQuote(quote);
    }catch{setDailyQuote("Keep writing. Your best insight is one entry away.");}
    setQuoteLoading(false);
  };

  const sendChat=async(preset)=>{
    const msg=(preset||chatIn).trim();
    if(!msg||aiLoading)return;

    const newCount=msgCount+1;
    if(newCount>FREE_LIMIT&&!userApiKey){setShowKeyModal(true);return;}

    setChatIn("");
    const newMsgs=[...msgs,{role:"user",content:msg}];
    setMsgs(newMsgs); setAiLoading(true);
    setMsgCount(newCount);
    await window.storage.set("arc_msgcount",newCount.toString());

    const ctx=entries.length===0?"No entries yet.":entries.map(e=>{
      const act=e.activity?` | Context: ${e.activity}`:"";
      const mood=e.mood?` | Mood: ${e.moodLabel} (${e.mood}/10)`:"";
      return `[${new Date(e.ts).toLocaleString()}${act}${mood}]\n${e.text}`;
    }).join("\n\n");

    const sys=`You are a deeply personal AI companion for "My Inner Archive."
Your only knowledge comes from the user's entries. Never reference outside quotes or generic advice.

JOURNAL ENTRIES (newest first):
${ctx}

Guidelines:
- When the user shares a feeling, find matching entries from the past — cite the exact date and their own words.
- Notice patterns in context/activity. Surface them gently (e.g. "You seem to think most clearly when walking").
- Use **bold** for key phrases and dates. Break into short paragraphs. Never write walls of text.
- Be warm, personal, grounded entirely in their words.`;

    try{
      const data=await callAI(newMsgs,sys);
      const reply=data.content?.find(b=>b.type==="text")?.text||"Couldn't connect right now.";
      setMsgs([...newMsgs,{role:"assistant",content:reply}]);
    }catch{
      setMsgs([...newMsgs,{role:"assistant",content:"Connection failed. Please try again."}]);
    }
    setAiLoading(false);
  };

  const saveUserKey=async()=>{
    const k=keyInput.trim();
    if(!k)return;
    setUserApiKey(k);
    await window.storage.set("arc_apikey",k);
    setShowKeyModal(false); setKeyInput("");
  };

  const freeLeft=Math.max(0,FREE_LIMIT-msgCount);

  if(screen==="loading")return <div style={S.center}><span style={{color:"#aaa",fontSize:14}}>Loading...</span></div>;

  if(screen==="welcome")return(
    <div style={{...S.center,flexDirection:"column",padding:24,background:"#f9f9f7"}}>
      <div style={{maxWidth:400,textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:16}}>🌱</div>
        <div style={{fontSize:26,fontWeight:750,letterSpacing:"-0.8px",marginBottom:10}}>My Inner Archive</div>
        <div style={{fontSize:15,color:"#666",lineHeight:1.7,marginBottom:28}}>A private space to capture your thoughts and let AI reflect your own wisdom back to you.</div>
        <div style={{textAlign:"left",background:"#fff",borderRadius:16,border:"1px solid #ebebeb",padding:"20px 22px",marginBottom:16}}>
          {[["📝","Capture thoughts","Write anything, any time. Timestamped and private."],
            ["🏷️","Tag your context","Record where you were when the insight hit."],
            ["📈","Mood timeline","See your emotional patterns over time, automatically."],
            ["🤖","AI from your words","Your archive answers with only your own words."],
            ["📅","On This Day","See what you wrote on this date in past years."]
          ].map(([icon,title,desc])=>(
            <div key={title} style={{display:"flex",gap:14,marginBottom:14}}>
              <div style={{fontSize:20,marginTop:1}}>{icon}</div>
              <div><div style={{fontSize:14,fontWeight:650,marginBottom:2}}>{title}</div>
              <div style={{fontSize:13,color:"#888",lineHeight:1.55}}>{desc}</div></div>
            </div>
          ))}
        </div>
        <div style={{fontSize:12,color:"#aaa",background:"#f4f4f1",borderRadius:10,padding:"10px 14px",marginBottom:16,lineHeight:1.6}}>
          🎁 <strong>Free tier:</strong> Your first {FREE_LIMIT} AI messages are on us. After that, you'll be prompted to add your own Anthropic API key to continue.
        </div>
        <button style={{width:"100%",padding:"13px 0",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer"}} onClick={()=>setScreen("setup")}>
          Get Started →
        </button>
        <div style={{marginTop:12,fontSize:12,color:"#bbb"}}>Your thoughts are private and stored securely.</div>
      </div>
    </div>
  );

  if(screen==="setup")return <PinPad isSetup onSuccess={handleSetup}/>;
  if(screen==="lock")return <PinPad isSetup={false} onSuccess={handleUnlock}/>;

  return(
    <div style={S.app}>
      <div style={S.header}>
        <span style={S.logo}>🌱 My Inner Archive</span>
        <div style={S.hBtns}>
          {onThisDay.length>0&&<button style={{...S.hBtn,color:"#a07030"}} onClick={()=>setShowOTD(true)}>📅 On This Day</button>}
          <button style={S.hBtn} onClick={exportArchive}>⬇ Export</button>
          <button style={S.hBtn} onClick={()=>setScreen("lock")}>🔒 Lock</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {["journal","mood"].map(t=>(
          <button key={t} style={S.tab(activeTab===t)} onClick={()=>setActiveTab(t)}>
            {t==="journal"?"📝 Journal":"📈 Mood Timeline"}
          </button>
        ))}
      </div>

      <div style={S.main}>
        {/* Left panel */}
        <div style={S.left}>
          {activeTab==="journal"&&(
            <>
              <div>
                <div style={S.panelTitle}>Capture a Thought</div>
                <div style={S.sub}>What's on your mind right now?</div>
                <textarea style={S.textarea} placeholder="Write freely..." value={thought}
                  onChange={e=>setThought(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))saveEntry();}}/>
                <div style={S.actLabel}>Where were you when this came to you?</div>
                <div style={S.actGrid}>
                  {ACTIVITIES.map(a=>(
                    <button key={a.label} style={S.actChip(activity===a.label)} onClick={()=>setActivity(activity===a.label?null:a.label)}>
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
                {activity==="Other"&&<input style={{...S.textarea,height:36,marginTop:8,resize:"none"}} placeholder="Describe your context..." value={customAct} onChange={e=>setCustomAct(e.target.value)}/>}
                <button style={{...S.saveBtn,opacity:savingMood?0.6:1}} onClick={saveEntry} disabled={savingMood}>
                  {savingMood?"Analyzing mood...":"Save Entry"}
                </button>
              </div>
              <div style={S.divider}/>
              <div>
                <div style={S.secLabel}>Archive · {entries.length} {entries.length===1?"entry":"entries"}</div>
                {entries.length===0
                  ?<div style={S.empty}>Your thoughts will live here. Start writing ✨</div>
                  :entries.map(e=>(
                    <div key={e.id} style={S.entryCard}>
                      <div style={S.eDate}>{new Date(e.ts).toLocaleString()}</div>
                      <div>
                        {e.activity&&<span style={S.eActivity}>{e.activity}</span>}
                        {e.mood&&<span style={S.eMood(e.mood)}>{e.moodLabel} {e.mood}/10</span>}
                      </div>
                      <div style={S.eText}>{e.text}</div>
                    </div>
                  ))
                }
              </div>
            </>
          )}
          {activeTab==="mood"&&(
            <div>
              <div style={S.panelTitle}>Mood Timeline</div>
              <div style={S.sub}>Auto-scored from your writing, no manual input needed</div>
              <MoodGraph entries={entries}/>
              <div style={{marginTop:20}}>
                <div style={S.secLabel}>Mood legend</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {[["1–3","Low / difficult","#e05"],["4–6","Neutral / processing","#eb3"],["7–10","Positive / energized","#2a4"]].map(([r,l,c])=>(
                    <div key={r} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#666",padding:"4px 10px",background:c+"22",borderRadius:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>
                      <span><strong>{r}</strong> — {l}</span>
                    </div>
                  ))}
                </div>
              </div>
              {entries.filter(e=>e.mood).length>0&&(
                <div style={{marginTop:20}}>
                  <div style={S.secLabel}>Scored entries</div>
                  {entries.filter(e=>e.mood).map(e=>(
                    <div key={e.id} style={S.entryCard}>
                      <div style={S.eDate}>{new Date(e.ts).toLocaleString()}</div>
                      <span style={S.eMood(e.mood)}>{e.moodLabel} {e.mood}/10</span>
                      <div style={{...S.eText,marginTop:4}}>{e.text.slice(0,100)}{e.text.length>100?"…":""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: AI + Daily Quote */}
        <div style={S.right}>
          {/* Daily Quote */}
          {entries.length>0&&(
            <div style={{marginBottom:14,padding:"13px 16px",background:"#fffdf5",border:"1px solid #f0e8c8",borderRadius:13}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:dailyQuote?8:0}}>
                <span style={{fontSize:12,fontWeight:600,color:"#a07030"}}>✨ Today's Inspiration from Your Archive</span>
                <button style={{fontSize:12,border:"none",background:"none",cursor:"pointer",color:"#a07030",fontWeight:500,padding:0}} onClick={getDailyQuote} disabled={quoteLoading}>
                  {quoteLoading?"...":dailyQuote?"Refresh":"Generate"}
                </button>
              </div>
              {dailyQuote&&<div style={{fontSize:14,fontStyle:"italic",color:"#555",lineHeight:1.65}}>"{dailyQuote}"</div>}
            </div>
          )}

          <div style={{display:"flex",alignItems:"center",marginBottom:4}}>
            <div style={S.panelTitle}>Your AI Companion</div>
            {!userApiKey&&<span style={S.freeBadge}>{freeLeft > 0 ? `${freeLeft} free messages left` : "Free limit reached"}</span>}
            {userApiKey&&<span style={{...S.freeBadge,color:"#4a4",background:"#4a422"}}>✓ Your API key active</span>}
          </div>
          <div style={S.sub}>Powered entirely by your own words</div>

          <div style={S.chatBox}>
            {msgs.length===0&&(
              <div style={S.welcome}>
                <div>👋 I only know what you've written. The more you share, the more I can reflect back to you.</div>
                <div style={{marginTop:10,fontSize:12.5,color:"#888"}}>Try asking:</div>
                {["I'm feeling anxious today","Summarize my thoughts","When do I get my best insights?","Show me a time I felt strong"].map(s=>(
                  <button key={s} style={S.suggBtn} onClick={()=>sendChat(s)}>💬 "{s}"</button>
                ))}
              </div>
            )}
            {msgs.map((m,i)=>(
              <div key={i} style={m.role==="user"?S.userBubble:S.aiBubble}>
                <div style={m.role==="user"?S.userText:S.aiText}>
                  {m.role==="user"?m.content:<MdText text={m.content}/>}
                </div>
              </div>
            ))}
            {aiLoading&&<div style={S.aiBubble}><div style={S.aiText}><span style={{fontSize:12.5,color:"#aaa",fontStyle:"italic"}}>Searching your archive...</span></div></div>}
            <div ref={endRef}/>
          </div>

          <div style={S.inputRow}>
            <input style={S.chatIn} value={chatIn} onChange={e=>setChatIn(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about your thoughts..."/>
            <button style={S.sendBtn(aiLoading)} onClick={()=>sendChat()} disabled={aiLoading}>→</button>
          </div>
        </div>
      </div>

      {/* On This Day */}
      {showOTD&&(
        <div style={S.overlay} onClick={()=>setShowOTD(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.mTitle}>📅 On This Day</div>
            <div style={S.mSub}>You wrote {onThisDay.length===1?"this":"these"} on this date in past years:</div>
            {onThisDay.map(e=>(
              <div key={e.id} style={S.entryCard}>
                <div style={S.eDate}>{new Date(e.ts).toLocaleString()}</div>
                {e.activity&&<span style={S.eActivity}>{e.activity}</span>}
                {e.mood&&<span style={S.eMood(e.mood)}>{e.moodLabel} {e.mood}/10</span>}
                <div style={S.eText}>{e.text}</div>
              </div>
            ))}
            <button style={S.closeBtn} onClick={()=>setShowOTD(false)}>Close</button>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showKeyModal&&(
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.mTitle}>🔑 Add Your API Key</div>
            <div style={S.mSub}>You've used your {FREE_LIMIT} free AI messages. To keep chatting with your archive, add your own Anthropic API key. It's stored only on your device.</div>
            <div style={{fontSize:13,color:"#888",background:"#f4f4f1",borderRadius:10,padding:"10px 13px",marginBottom:14,lineHeight:1.6}}>
              Get a free key at <strong>console.anthropic.com</strong> → API Keys → Create Key. You only pay for what you use (~$0.01 per conversation).
            </div>
            <input style={S.apiKeyInput} placeholder="sk-ant-..." value={keyInput} onChange={e=>setKeyInput(e.target.value)}/>
            <button style={{...S.closeBtn,marginTop:0,width:"100%"}} onClick={saveUserKey}>Save & Continue</button>
            <button style={{marginTop:10,width:"100%",padding:"9px 0",background:"none",border:"1px solid #e0e0e0",borderRadius:9,cursor:"pointer",fontSize:13,color:"#888"}} onClick={()=>setShowKeyModal(false)}>Not now</button>
          </div>
        </div>
      )}
    </div>
  );
}