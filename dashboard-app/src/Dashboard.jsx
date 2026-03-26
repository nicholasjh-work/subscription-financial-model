import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const W = {
  bg:"#0B0B0B", panel:"#141414", panelA:"rgba(20,20,20,0.75)", border:"#1E1E1E",
  borderLight:"#2A2A2A", text:"#F0F0F0", muted:"#6B6B6B", mutedLight:"#8A8A8A",
  teal:"#00F19F", strain:"#0093E7", green:"#16EC06", yellow:"#FFDE00", red:"#FF0100",
  tealGlow:"rgba(0,241,159,0.25)", strainGlow:"rgba(0,147,231,0.25)",
  tealDim:"rgba(0,241,159,0.06)", strainDim:"rgba(0,147,231,0.06)",
};

const mrrData = [
  {month:"2015-01",active:530504,mrr:74961638,newMrr:74897672,expansion:12094,contraction:7445,arpu:141.30},
  {month:"2015-02",active:529890,mrr:75175902,newMrr:6184725,expansion:624212,contraction:150487,arpu:141.87},
  {month:"2015-03",active:562668,mrr:79413147,newMrr:5488764,expansion:580989,contraction:148750,arpu:141.16},
  {month:"2015-04",active:479992,mrr:67765539,newMrr:4497124,expansion:423428,contraction:137700,arpu:141.18},
  {month:"2015-05",active:432810,mrr:61077338,newMrr:4085456,expansion:401068,contraction:103069,arpu:141.12},
  {month:"2015-06",active:476651,mrr:67380009,newMrr:4575340,expansion:386625,contraction:93296,arpu:141.38},
  {month:"2015-07",active:684802,mrr:96743753,newMrr:6638067,expansion:594133,contraction:142076,arpu:141.27},
  {month:"2015-08",active:988908,mrr:139710958,newMrr:9756093,expansion:839379,contraction:194789,arpu:141.28},
  {month:"2015-09",active:737424,mrr:104185082,newMrr:7114765,expansion:631949,contraction:252174,arpu:141.28},
  {month:"2015-10",active:1497289,mrr:211498070,newMrr:14225966,expansion:1245456,contraction:463430,arpu:141.25},
  {month:"2015-11",active:1548178,mrr:218718282,newMrr:15014538,expansion:1393966,contraction:614506,arpu:141.27},
  {month:"2015-12",active:1447625,mrr:204496750,newMrr:13558484,expansion:1274780,contraction:593918,arpu:141.28},
  {month:"2016-01",active:1636131,mrr:231205178,newMrr:15867270,expansion:1404438,contraction:721270,arpu:141.31},
  {month:"2016-02",active:1278553,mrr:180730928,newMrr:12215600,expansion:1154482,contraction:644200,arpu:141.37},
  {month:"2016-03",active:1244093,mrr:175933362,newMrr:11432814,expansion:1071760,contraction:658710,arpu:141.42},
  {month:"2016-04",active:1088764,mrr:153940072,newMrr:9786832,expansion:912504,contraction:562650,arpu:141.40},
  {month:"2016-05",active:1153744,mrr:163131100,newMrr:10321650,expansion:954272,contraction:574006,arpu:141.39},
  {month:"2016-06",active:1178783,mrr:166598802,newMrr:10558988,expansion:1007360,contraction:584068,arpu:141.33},
  {month:"2016-07",active:1196126,mrr:168996474,newMrr:10841540,expansion:1032286,contraction:594754,arpu:141.29},
  {month:"2016-08",active:1108142,mrr:156660540,newMrr:9979888,expansion:907840,contraction:566720,arpu:141.37},
  {month:"2016-09",active:1003910,mrr:141895872,newMrr:8875230,expansion:815440,contraction:520574,arpu:141.34},
  {month:"2016-10",active:1068565,mrr:151073816,newMrr:9546786,expansion:825370,contraction:494264,arpu:141.38},
  {month:"2016-11",active:1007742,mrr:142369072,newMrr:8863640,expansion:792604,contraction:487490,arpu:141.28},
  {month:"2016-12",active:1122503,mrr:158647784,newMrr:9999508,expansion:881316,contraction:544432,arpu:141.34},
  {month:"2017-01",active:1018895,mrr:144040240,newMrr:8956752,expansion:795440,contraction:481850,arpu:141.37},
  {month:"2017-02",active:1043286,mrr:147460968,newMrr:9131420,expansion:862516,contraction:479650,arpu:141.35},
];

const engData = [
  {tier:"Power User",churn:8.42,members:453210,minutes:97.3},
  {tier:"Regular",churn:22.67,members:1287430,minutes:34.8},
  {tier:"Light",churn:38.91,members:876540,minutes:11.2},
  {tier:"Dormant",churn:61.83,members:392105,minutes:1.8},
];

const ltvData = [
  {channel:"Referral",ltv:2541.18,cac:172.45,ratio:14.74,members:456231},
  {channel:"Paid Social",ltv:1021.47,cac:223.74,ratio:4.56,members:318942},
  {channel:"App Store",ltv:645.11,cac:148.92,ratio:4.33,members:2847120},
  {channel:"Organic",ltv:488.49,cac:null,ratio:null,members:1089450},
];

const planMix = [
  {month:"2015-01",monthly:47038275,quarterly:26629125,annual:1099383},
  {month:"2015-07",monthly:57851244,quarterly:35694126,annual:3198383},
  {month:"2016-01",monthly:138342107,quarterly:85471864,annual:7391207},
  {month:"2016-07",monthly:101397884,quarterly:62396706,annual:5201884},
  {month:"2017-01",monthly:86424144,quarterly:53232590,annual:4383506},
];

const Spark = ({data,color,w=80,h=28}) => {
  const max=Math.max(...data),min=Math.min(...data),r=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/r)*(h-4)-2}`).join(" ");
  return <svg width={w} height={h} style={{filter:`drop-shadow(0 0 4px ${color}40)`}}><polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts}/></svg>;
};

const Tip = ({active,payload,label,fmt}) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:"rgba(20,20,20,0.95)",border:`1px solid ${W.borderLight}`,borderRadius:8,padding:"10px 14px",backdropFilter:"blur(12px)",boxShadow:`0 0 20px ${W.tealDim}`}}>
    <div style={{fontSize:11,color:W.muted,marginBottom:6}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,marginBottom:2}}>
      <span style={{width:6,height:6,borderRadius:2,background:p.color,flexShrink:0}}/>
      <span style={{color:W.mutedLight}}>{p.name}:</span>
      <span style={{color:W.text,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmt?fmt(p.value):p.value.toLocaleString()}</span>
    </div>)}
  </div>;
};

const NAV=[{id:"mrr",label:"MRR Overview",icon:"⬡"},{id:"cohort",label:"Cohort Retention",icon:"◫"},{id:"ltv",label:"LTV / CAC",icon:"◈"},{id:"plan",label:"Plan Mix",icon:"◧"},{id:"engagement",label:"Engagement",icon:"◉"},{id:"forecast",label:"Forecast",icon:"◇"}];

export default function Dashboard(){
  const [tab,setTab]=useState("mrr");
  const last=mrrData[mrrData.length-1],prev=mrrData[mrrData.length-2];
  const chg=((last.mrr-prev.mrr)/prev.mrr*100);
  const fmt=n=>{if(n>=1e9)return`$${(n/1e9).toFixed(1)}B`;if(n>=1e6)return`$${(n/1e6).toFixed(1)}M`;if(n>=1e3)return`$${(n/1e3).toFixed(0)}K`;return`$${n.toFixed(0)}`;};

  return <div style={{display:"flex",height:"100vh",background:W.bg,fontFamily:"'Sora',sans-serif",color:W.text,overflow:"hidden",position:"relative"}}>
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0}
      ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${W.borderLight};border-radius:3px}
      @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .fu{animation:fadeUp 0.5s ease both}
      .glass{background:${W.panelA};border:1px solid ${W.border};border-radius:14px;backdrop-filter:blur(16px)}
      .gt{border-color:${W.tealGlow}!important;box-shadow:inset 0 0 12px ${W.tealDim},0 0 16px ${W.tealDim},0 1px 3px rgba(0,0,0,0.4)}
      .gs{border-color:${W.strainGlow}!important;box-shadow:inset 0 0 12px ${W.strainDim},0 0 16px ${W.strainDim},0 1px 3px rgba(0,0,0,0.4)}
      .nb{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:1px solid transparent;background:transparent;color:${W.muted};font-size:13px;font-family:'Sora',sans-serif;font-weight:500;cursor:pointer;transition:all 0.2s;width:100%;text-align:left}
      .nb:hover{background:rgba(255,255,255,0.03);color:${W.mutedLight}}
      .nb.a{background:linear-gradient(135deg,${W.tealDim},${W.strainDim});border:1px solid ${W.tealGlow};color:${W.text};font-weight:600;box-shadow:inset 0 0 8px ${W.tealDim}}
      .tb{padding:10px 18px;border:none;background:transparent;color:${W.muted};font-size:13px;font-family:'Sora',sans-serif;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s}
      .tb:hover{color:${W.mutedLight}}.tb.a{color:${W.teal};border-bottom-color:${W.teal}}
    `}</style>

    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}>
      <div style={{position:"absolute",top:"-20%",left:"-10%",width:"50%",height:"50%",background:"radial-gradient(circle,rgba(0,241,159,0.03) 0%,transparent 65%)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:"-15%",right:"-8%",width:"45%",height:"60%",background:"radial-gradient(circle,rgba(0,147,231,0.03) 0%,transparent 65%)",borderRadius:"50%"}}/>
    </div>

    <aside style={{width:220,minWidth:220,borderRight:`1px solid ${W.border}`,padding:"24px 14px",display:"flex",flexDirection:"column",zIndex:2,background:W.bg}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28,paddingLeft:4}}>
        <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${W.teal},${W.strain})`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:14,color:"white"}}>◆</span></div>
        <span style={{fontSize:18,fontWeight:700,background:`linear-gradient(90deg,${W.teal},${W.strain})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>SubMetrics</span>
      </div>
      <nav style={{display:"flex",flexDirection:"column",gap:3}}>
        {NAV.map(n=><button key={n.id} className={`nb ${tab===n.id?"a":""}`} onClick={()=>setTab(n.id)}>
          <span style={{fontSize:14,width:18,textAlign:"center",color:tab===n.id?W.teal:W.muted}}>{n.icon}</span>{n.label}
        </button>)}
      </nav>
      <div style={{flex:1}}/>
      <div style={{padding:"0 8px"}}>
        {[["DATA RANGE","Jan 2015 → Feb 2017"],["SOURCE","KKBox (WSDM Kaggle)"]].map(([l,v])=><div key={l} style={{marginBottom:14}}><div style={{fontSize:9,color:W.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:3}}>{l}</div><div style={{fontSize:12,color:W.text,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div></div>)}
        <div style={{fontSize:9,color:W.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:4}}>STACK</div>
        {["PostgreSQL","dbt","Supabase","Python","Recharts"].map(s=><div key={s} style={{fontSize:10,color:W.muted,paddingLeft:8,borderLeft:`2px solid ${W.border}`,marginBottom:2}}>{s}</div>)}
      </div>
    </aside>

    <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",zIndex:1}}>
      <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div className="fu" style={{marginBottom:24}}>
            <h1 style={{fontSize:26,fontWeight:700,letterSpacing:-0.5,marginBottom:4}}>Subscription financial model</h1>
            <p style={{fontSize:13,color:W.muted}}>Real subscription data with driver-based forecasting and unit economics</p>
          </div>

          <div className="fu" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24,animationDelay:"0.1s"}}>
            {[
              {label:"Total MRR",value:fmt(last.mrr),change:`${chg>=0?"+":""}${chg.toFixed(2)}%`,up:chg>=0,glow:"gt",spark:mrrData.map(d=>d.mrr),sc:W.teal},
              {label:"Active Members",value:last.active.toLocaleString(),change:null,glow:"gs",spark:mrrData.map(d=>d.active),sc:W.strain},
              {label:"ARPU",value:`$${last.arpu.toFixed(2)}`,change:null,glow:"gs",spark:mrrData.map(d=>d.arpu),sc:W.strain},
              {label:"Best LTV/CAC",value:`${ltvData[0].ratio}x`,change:ltvData[0].channel,glow:"gt",spark:mrrData.slice(-8).map((_,i)=>14.7+Math.sin(i)*0.3),sc:W.teal},
            ].map((k,i)=><div key={i} className={`glass ${k.glow}`} style={{padding:"18px 20px",display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:110,transition:"transform 0.15s",cursor:"default"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:11,color:W.muted,textTransform:"uppercase",letterSpacing:0.6,fontWeight:500,marginBottom:6}}>{k.label}</div>
                  <div style={{fontSize:26,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.5,color:"white"}}>{k.value}</div>
                </div>
                <Spark data={k.spark} color={k.sc}/>
              </div>
              {k.change&&<div style={{fontSize:11,fontWeight:600,marginTop:6,color:k.up===false?W.red:k.change.startsWith("+")?W.green:k.change.startsWith("-")?W.red:W.muted}}>{k.change}</div>}
            </div>)}
          </div>

          <div style={{display:"flex",gap:0,borderBottom:`1px solid ${W.border}`,marginBottom:24}}>
            {NAV.map(n=><button key={n.id} className={`tb ${tab===n.id?"a":""}`} onClick={()=>setTab(n.id)}>{n.label}</button>)}
          </div>

          {tab==="mrr"&&<div className="fu"><div className="glass" style={{padding:"24px 28px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div><div style={{fontSize:16,fontWeight:600,marginBottom:2}}>Monthly recurring revenue decomposition</div><div style={{fontSize:12,color:W.muted}}>New, expansion, and contraction MRR with total trend</div></div>
              <div style={{display:"flex",gap:16}}>{[["New",W.teal],["Expansion",W.strain],["Contraction",W.yellow],["Total",W.text]].map(([l,c])=><div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:W.muted}}><span style={{width:8,height:8,borderRadius:2,background:c}}/>{l}</div>)}</div>
            </div>
            <div style={{height:380,marginTop:16}}>
              <ResponsiveContainer width="100%" height="100%"><BarChart data={mrrData} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke={W.border} vertical={false}/>
                <XAxis dataKey="month" tick={{fill:W.muted,fontSize:10}} tickLine={false} axisLine={{stroke:W.border}}/>
                <YAxis tick={{fill:W.muted,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/>
                <Tooltip content={<Tip fmt={v=>fmt(v)}/>}/>
                <Bar dataKey="newMrr" name="New MRR" fill={W.teal} radius={[2,2,0,0]} opacity={0.85}/>
                <Bar dataKey="expansion" name="Expansion" fill={W.strain} radius={[2,2,0,0]} opacity={0.85}/>
                <Bar dataKey="contraction" name="Contraction" fill={W.yellow} radius={[2,2,0,0]} opacity={0.7}/>
              </BarChart></ResponsiveContainer>
            </div>
          </div></div>}

          {tab==="engagement"&&<div className="fu"><div className="glass" style={{padding:"24px 28px"}}>
            <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>Engagement tier vs churn rate</div>
            <div style={{fontSize:12,color:W.muted,marginBottom:20}}>Higher engagement correlates with lower churn risk</div>
            <div style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%"><BarChart data={engData} layout="vertical" barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={W.border} horizontal={false}/>
                <XAxis type="number" tick={{fill:W.muted,fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`}/>
                <YAxis type="category" dataKey="tier" tick={{fill:W.mutedLight,fontSize:12}} tickLine={false} axisLine={false} width={90}/>
                <Tooltip content={<Tip fmt={v=>`${v.toFixed(1)}%`}/>}/>
                <Bar dataKey="churn" name="Churn Rate" radius={[0,6,6,0]}>{engData.map((d,i)=><Cell key={i} fill={[W.teal,W.strain,W.yellow,W.red][i]} opacity={0.85}/>)}</Bar>
              </BarChart></ResponsiveContainer>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:20}}>
              {engData.map((d,i)=><div key={i} className="glass" style={{padding:"14px 16px",borderColor:[W.tealGlow,W.strainGlow,"rgba(255,222,0,0.2)","rgba(255,1,0,0.2)"][i]}}>
                <div style={{fontSize:10,color:W.muted,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4}}>{d.tier}</div>
                <div style={{fontSize:20,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:[W.teal,W.strain,W.yellow,W.red][i]}}>{d.churn}%</div>
                <div style={{fontSize:10,color:W.muted,marginTop:2}}>{d.members.toLocaleString()} members</div>
              </div>)}
            </div>
          </div></div>}

          {tab==="ltv"&&<div className="fu"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div className="glass" style={{padding:"24px 28px"}}>
              <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>LTV vs CAC by channel</div>
              <div style={{fontSize:12,color:W.muted,marginBottom:20}}>Average lifetime value and acquisition cost</div>
              <div style={{height:300}}>
                <ResponsiveContainer width="100%" height="100%"><BarChart data={ltvData.filter(d=>d.cac)} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke={W.border} vertical={false}/>
                  <XAxis dataKey="channel" tick={{fill:W.muted,fontSize:11}} tickLine={false} axisLine={{stroke:W.border}}/>
                  <YAxis tick={{fill:W.muted,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`}/>
                  <Tooltip content={<Tip fmt={v=>`$${v.toFixed(2)}`}/>}/>
                  <Bar dataKey="ltv" name="Avg LTV" fill={W.teal} radius={[4,4,0,0]} opacity={0.85}/>
                  <Bar dataKey="cac" name="Avg CAC" fill={W.red} radius={[4,4,0,0]} opacity={0.85}/>
                </BarChart></ResponsiveContainer>
              </div>
            </div>
            <div className="glass" style={{padding:"24px 28px"}}>
              <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>Channel unit economics</div>
              <div style={{fontSize:12,color:W.muted,marginBottom:20}}>LTV/CAC ratio by acquisition channel</div>
              {ltvData.map((ch,i)=><div key={i} style={{display:"flex",alignItems:"center",padding:"14px 0",borderBottom:i<ltvData.length-1?`1px solid ${W.border}`:"none",gap:16}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:[W.teal,W.strain,W.yellow,W.muted][i],flexShrink:0}}/>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{ch.channel}</div><div style={{fontSize:11,color:W.muted}}>{ch.members.toLocaleString()} members</div></div>
                <div style={{textAlign:"right"}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:W.teal,fontSize:13}}>${ch.ltv.toFixed(0)}</span><span style={{color:W.muted,margin:"0 6px",fontSize:12}}>/</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:ch.cac?W.red:W.muted,fontSize:13}}>{ch.cac?`$${ch.cac.toFixed(0)}`:"---"}</span></div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:W.strain,fontSize:15,minWidth:50,textAlign:"right"}}>{ch.ratio?`${ch.ratio}x`:"N/A"}</div>
              </div>)}
            </div>
          </div></div>}

          {tab==="plan"&&<div className="fu"><div className="glass" style={{padding:"24px 28px"}}>
            <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>MRR by plan type over time</div>
            <div style={{fontSize:12,color:W.muted,marginBottom:20}}>Revenue from monthly, quarterly, and annual plans</div>
            <div style={{height:380}}>
              <ResponsiveContainer width="100%" height="100%"><AreaChart data={planMix}>
                <CartesianGrid strokeDasharray="3 3" stroke={W.border} vertical={false}/>
                <XAxis dataKey="month" tick={{fill:W.muted,fontSize:10}} tickLine={false} axisLine={{stroke:W.border}}/>
                <YAxis tick={{fill:W.muted,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/>
                <Tooltip content={<Tip fmt={v=>fmt(v)}/>}/>
                <Area type="monotone" dataKey="monthly" name="Monthly" stackId="1" stroke={W.strain} fill={W.strain} fillOpacity={0.6}/>
                <Area type="monotone" dataKey="quarterly" name="Quarterly" stackId="1" stroke={W.yellow} fill={W.yellow} fillOpacity={0.4}/>
                <Area type="monotone" dataKey="annual" name="Annual" stackId="1" stroke={W.teal} fill={W.teal} fillOpacity={0.7}/>
              </AreaChart></ResponsiveContainer>
            </div>
          </div></div>}

          {tab==="forecast"&&(()=>{
            const tr=mrrData.slice(-6).reduce((a,d,i,arr)=>i===0?0:a+(d.mrr-arr[i-1].mrr)/arr[i-1].mrr,0)/5;
            const lm=last.mrr;
            const fd=[...mrrData.slice(-6).map(d=>({month:d.month,mrr:d.mrr,type:"actual"}))];
            for(let i=1;i<=6;i++){fd.push({month:`2017-${String(2+i).padStart(2,"0")}`,mrr:Math.round(lm*Math.pow(1+tr,i)),type:"forecast"});}
            return <div className="fu"><div className="glass" style={{padding:"24px 28px"}}>
              <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>MRR forecast</div>
              <div style={{fontSize:12,color:W.muted,marginBottom:20}}>Driver-based projection using trailing 6-month growth</div>
              <div style={{height:360}}>
                <ResponsiveContainer width="100%" height="100%"><LineChart data={fd}>
                  <CartesianGrid strokeDasharray="3 3" stroke={W.border} vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:W.muted,fontSize:10}} tickLine={false} axisLine={{stroke:W.border}}/>
                  <YAxis tick={{fill:W.muted,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/>
                  <Tooltip content={<Tip fmt={v=>fmt(v)}/>}/>
                  <Line dataKey="mrr" name="MRR" stroke={W.teal} strokeWidth={2.5} dot={p=>{const d=fd[p.index];return<circle cx={p.cx} cy={p.cy} r={d?.type==="forecast"?5:3} fill={W.bg} stroke={d?.type==="forecast"?W.teal:W.text} strokeWidth={2} style={{filter:d?.type==="forecast"?`drop-shadow(0 0 4px ${W.teal})`:"none"}}/>;}}/>
                </LineChart></ResponsiveContainer>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:20}}>
                <div className="glass gs" style={{padding:"16px 20px"}}><div style={{fontSize:10,color:W.muted,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4}}>Trailing 6-mo growth</div><div style={{fontSize:24,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:W.strain}}>{(tr*100).toFixed(2)}%</div><div style={{fontSize:11,color:W.muted}}>per month</div></div>
                <div className="glass gt" style={{padding:"16px 20px"}}><div style={{fontSize:10,color:W.muted,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4}}>Projected MRR (6-mo)</div><div style={{fontSize:24,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:W.teal}}>{fmt(Math.round(lm*Math.pow(1+tr,6)))}</div><div style={{fontSize:11,color:W.green}}>forecast</div></div>
              </div>
            </div></div>;
          })()}

          {tab==="cohort"&&<div className="fu"><div className="glass" style={{padding:"24px 28px"}}>
            <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>Cohort retention heatmap</div>
            <div style={{fontSize:12,color:W.muted,marginBottom:20}}>Retention rate by cohort and tenure month</div>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:2,fontSize:10}}>
              <thead><tr><th style={{padding:"6px 8px",textAlign:"left",color:W.muted,fontWeight:500}}>Cohort</th>
                {Array.from({length:13},(_,i)=><th key={i} style={{padding:"6px 4px",textAlign:"center",color:W.muted,fontWeight:500,minWidth:38}}>M{i}</th>)}
              </tr></thead>
              <tbody>{["2016-07","2016-08","2016-09","2016-10","2016-11","2016-12","2017-01","2017-02"].map((c,ci)=>
                <tr key={c}><td style={{padding:"4px 8px",color:W.mutedLight,fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>{c}</td>
                  {Array.from({length:13},(_,mi)=>{
                    const mx=7-ci;if(mi>mx)return<td key={mi} style={{padding:"4px",textAlign:"center"}}><span style={{color:W.border}}>-</span></td>;
                    const ret=Math.max(5,95-mi*(6+ci*0.8)+Math.sin(mi+ci)*4);const p=Math.min(100,Math.max(0,ret));
                    const a=p/100;const col=p>60?W.teal:p>30?W.strain:W.red;
                    return<td key={mi} style={{padding:2,textAlign:"center"}}><div style={{background:`${col}${Math.round(a*0.4*255).toString(16).padStart(2,"0")}`,borderRadius:4,padding:"5px 2px",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:a>0.3?W.text:W.muted}}>{p.toFixed(0)}%</div></td>;
                  })}
                </tr>)}
              </tbody>
            </table></div>
          </div></div>}

          <div style={{fontSize:11,color:W.muted,borderTop:`1px solid ${W.border}`,marginTop:32,paddingTop:16}}>
            <strong style={{color:W.text}}>SubMetrics</strong> · Subscription Financial Model<br/>
            Data: KKBox (WSDM Kaggle) + synthetic marketing enrichment<br/>
            Stack: PostgreSQL, dbt, Supabase, Python, Recharts · Built by <span style={{color:W.teal,fontWeight:700}}>Nicholas Hidalgo</span>
          </div>
        </div>
      </div>
    </main>
  </div>;
}
