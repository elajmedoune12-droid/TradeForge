import{i as R,u as P,d as D,T as O,a as H,b as U,j as s,n as S}from"./index-Dgdfn-jw.js";import{r as v}from"./vendor-Bvhkp_6S.js";import{C as W}from"./chevron-down-MjKL8ipd.js";/**
 * @license lucide-react v0.309.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=R("AlertTriangle",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",key:"c3ski4"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.309.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=R("Loader2",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.309.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=R("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.309.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=R("Send",[["path",{d:"m22 2-7 20-4-9-9-4Z",key:"1q3vgg"}],["path",{d:"M22 2 11 13",key:"nzbqef"}]]);function J(e){const o=e.split(`
`),l=[];let i=0;for(;i<o.length;){const u=o[i];if(u.trim().startsWith("- ")||u.trim().startsWith("• ")){const m=[];for(;i<o.length&&(o[i].trim().startsWith("- ")||o[i].trim().startsWith("• "));)m.push(o[i].trim().replace(/^[-•]\s/,"")),i++;l.push(s.jsx("ul",{className:"space-y-1 my-1.5",children:m.map((f,x)=>s.jsxs("li",{className:"flex gap-1.5 text-sm leading-relaxed",children:[s.jsx("span",{style:{color:"#F7B731",flexShrink:0},children:"·"}),s.jsx("span",{style:{color:"var(--text-secondary)"},children:I(f)})]},x))},`ul-${i}`));continue}if(u.trim()===""){l.push(s.jsx("div",{className:"h-1.5"},`br-${i}`)),i++;continue}l.push(s.jsx("p",{className:"text-sm leading-relaxed",style:{color:"var(--text-secondary)"},children:I(u)},`p-${i}`)),i++}return l}function I(e){return e.split(/(\*\*[^*]+\*\*)/).map((l,i)=>l.startsWith("**")&&l.endsWith("**")?s.jsx("strong",{style:{color:"#F7B731"},children:l.slice(2,-2)},i):s.jsx("span",{children:l},i))}function K(e){if(!e)return["Analyse mes performances globales","Quelles sont mes erreurs récurrentes ?","Comment améliorer mon win rate ?","Dans quelle session je performe le mieux ?"];if(e._rulesContext)return["Analyse mes règles et mon taux de respect","Quelles règles je viole le plus souvent ?","Comment renforcer ma discipline ?","Suggère-moi de nouvelles règles selon mes trades"];if(e._monthlyContext)return["Analyse mes performances ce mois","Quels sont mes points forts ce mois ?","Comment améliorer mon win rate le mois prochain ?","Analyse ma discipline et mes émotions ce mois"];if(e._backtestContext)return["Évalue ma progression en backtest","Combien d'heures par semaine me conseilles-tu ?","Comment optimiser mes sessions de backtest ?","Quel objectif d'heures viser pour progresser ?"];const o=["Analyse ce trade en détail"];e.result==="sl"?(o.push("Pourquoi ce SL ? Comment l'éviter ?"),e.emotion&&e.emotion!=="Neutre"&&o.push(`Impact de mon état "${e.emotion}" sur ce trade`)):e.result==="tp"?(o.push("Qu'est-ce que j'ai bien fait ?"),o.push("Comment répliquer ce setup ?")):e.result==="be"&&o.push("Aurais-je dû laisser courir ce trade ?"),e.respect_plan||o.push("Impact du non-respect de mon plan"),e.discipline_score&&e.discipline_score<=5&&o.push("Comment améliorer ma discipline ?");const l=Array.isArray(e.hindsight)?e.hindsight[0]:e.hindsight;return l!=null&&l.main_error&&o.push(`Approfondis l'erreur : "${l.main_error}"`),o.slice(0,4)}function Y({msg:e}){const o=e.role==="user";return s.jsxs("div",{className:`flex gap-2.5 ${o?"flex-row-reverse":"flex-row"}`,children:[!o&&s.jsx("div",{className:"w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",style:{background:"rgba(247,183,49,0.15)",border:"1px solid rgba(247,183,49,0.3)"},children:s.jsx(S,{size:13,className:"text-forge-accent"})}),s.jsx("div",{className:"max-w-[85%] rounded-2xl px-3.5 py-2.5",style:o?{background:"rgba(247,183,49,0.12)",border:"1px solid rgba(247,183,49,0.25)"}:{background:"var(--surface-card)",border:"1px solid var(--surface-card-border)"},children:o?s.jsx("p",{className:"text-sm leading-relaxed",style:{color:"var(--text-primary)"},children:e.content}):s.jsx("div",{className:"space-y-0.5",children:J(e.content)})})]})}function G({icon:e,label:o,value:l,color:i="#8B949E"}){return s.jsxs("div",{className:"flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl",style:{background:"var(--surface-4)",border:"1px solid var(--border-medium)"},children:[s.jsx(e,{size:11,style:{color:i}}),s.jsxs("div",{children:[s.jsx("p",{className:"text-[9px] leading-none",style:{color:"var(--forge-muted)"},children:o}),s.jsx("p",{className:"text-xs font-medium leading-none mt-0.5",style:{color:i},children:l})]})]})}function Z(e,o,l){var m,f,x,t;const i=l?`L'utilisateur s'appelle ${l}. Adressez-vous à lui par son prénom naturellement.`:"";let u="";if(o!=null&&o.length){const n=o.length,c=o.filter(a=>a.result==="tp").length,h=Math.round(c/n*100),N=o.reduce((a,p)=>p.result==="tp"?a+(p.rr_won||0):p.result==="sl"?a-1:a,0).toFixed(2),y=o.filter(a=>a.discipline_score),d=y.length?Math.round(y.reduce((a,p)=>a+p.discipline_score,0)/y.length):0,_=o.filter(a=>a.respect_plan===!1).length,$={};o.filter(a=>a.result==="sl"&&a.emotion).forEach(a=>{$[a.emotion]=($[a.emotion]||0)+1});const C=Object.entries($).sort((a,p)=>p[1]-a[1]).slice(0,3).map(([a,p])=>`${a}(${p}x)`).join(", "),k={};o.forEach(a=>{const p=Array.isArray(a.hindsight)?a.hindsight[0]:a.hindsight;p!=null&&p.main_error&&(k[p.main_error]=(k[p.main_error]||0)+1)});const w=Object.entries(k).sort((a,p)=>p[1]-a[1]).slice(0,3).map(([a,p])=>`"${a}"(${p}x)`).join(", ");u=`

=== STATISTIQUES GLOBALES ===
Total trades : ${n} | Win Rate : ${h}% | Profit cumulé : ${N}R
Discipline moyenne : ${d}/10 | Violations du plan : ${_}
${C?`Émotions sur SL : ${C}`:""}
${w?`Erreurs hindsight récurrentes : ${w}`:""}`}if(e!=null&&e._rulesContext)return`Vous êtes TradeForge Coach, un coach trading professionnel expert. ${i}
${u}

=== RÈGLES DE TRADING ===
Taux de respect du plan : ${e._respectRate}%
Violations détectées : ${e._violationCount}
Règles actives :
${((m=e._rules)==null?void 0:m.map((n,c)=>`${c+1}. ${n}`).join(`
`))||"Aucune."}

INSTRUCTIONS : Français, vouvoiement, ton professionnel. Réponses structurées et actionnables. Basez-vous sur les données réelles.`;if(e!=null&&e._monthlyContext){const n=e._stats,c=e._goal;return`Vous êtes TradeForge Coach, un coach trading professionnel expert. ${i}
${u}

=== ANALYSE MENSUELLE : ${e.market} ===
Trades : ${(n==null?void 0:n.total)||0} | Win Rate : ${(n==null?void 0:n.winRate)||0}% | Profit : ${(n==null?void 0:n.profit)||0}R
TP : ${(n==null?void 0:n.tp)||0} | SL : ${(n==null?void 0:n.sl)||0} | BE : ${(n==null?void 0:n.be)||0} | Missed : ${(n==null?void 0:n.missed)||0}
Discipline moyenne : ${e.discipline_score}/10
${c?`Objectifs : ${c.goal_trades?`${c.goal_trades} trades`:""} ${c.goal_winrate?`/ ${c.goal_winrate}% WR`:""} ${c.goal_profit?`/ ${c.goal_profit}R`:""} ${c.goal_discipline?`/ disc ${c.goal_discipline}/10`:""}`:"Aucun objectif défini."}

INSTRUCTIONS : Français, vouvoiement, ton professionnel. Structuré et actionnable.`}if(e!=null&&e._backtestContext)return`Vous êtes TradeForge Coach, un coach trading professionnel expert. ${i}
${u}

=== SUIVI BACKTEST ===
Objectif du cycle : ${e._goalHours}h
Heures effectuées : ${e._doneHours}h (${e._progress}%)
Heures restantes : ${e._leftHours}h
Nombre de cycles : ${e._cycleCount}
Sessions récentes : ${e._recentSessions||"Aucune"}

INSTRUCTIONS : Français, vouvoiement, encourageant mais exigeant. Conseils concrets sur le backtest.`;if(e&&e.market){const n=Array.isArray(e.hindsight)?e.hindsight[0]:e.hindsight,c=n!=null&&n.main_error?`
=== AFTER TRADE (Hindsight) ===
Erreur principale : ${n.main_error}
Leçon tirée : ${n.lesson||"—"}
Règle à appliquer : ${n.rule||"—"}
${n.notes?`Notes : ${n.notes}`:""}
${(f=n.tags)!=null&&f.length?`Tags : ${n.tags.join(", ")}`:""}`:`
(Aucun After Trade rempli pour ce trade.)`;return`Vous êtes TradeForge Coach, un coach trading professionnel expert. ${i}
${u}

=== TRADE ANALYSÉ ===
Marché : ${e.market} | Direction : ${(x=e.type)==null?void 0:x.toUpperCase()} | Date : ${e.date}
Résultat : ${(t=e.result)==null?void 0:t.toUpperCase()} | RR prévu : ${e.rr_planned??"—"}R | RR réalisé : ${e.rr_won??"—"}R
Session : ${e.session||"—"} | Jour : ${e.day||"—"} | Style : ${e.style||"—"}
Tendance : ${e.trend||"—"} | Structure : ${e.market_structure||"—"}
Émotion : ${e.emotion||"—"} | Discipline : ${e.discipline_score??"—"}/10
Plan respecté : ${e.respect_plan?"Oui":"Non"}
${e.notes?`Notes trader : ${e.notes}`:""}
${c}

INSTRUCTIONS : Français, vouvoiement, concis (4-6 phrases), basé sur les données réelles. Utilisez l'After Trade pour approfondir l'analyse.`}return`Vous êtes TradeForge Coach, un coach trading professionnel expert. ${i}
${u}

INSTRUCTIONS : Français, vouvoiement, structuré et actionnable. Évitez les généralités. Basez-vous sur les statistiques réelles.`}function L(e,o,l){var m,f,x;const i=l?`Bonjour **${l}**`:"Bonjour",u=o.length>0?{total:o.length,winRate:Math.round(o.filter(t=>t.result==="tp").length/o.length*100),profit:+o.reduce((t,n)=>n.result==="tp"?t+(n.rr_won||0):n.result==="sl"?t-1:t,0).toFixed(2)}:null;if(e!=null&&e._backtestContext){const t=e._progress>=100;return`${i} — je vais analyser votre progression en **backtest**.

**Cycle en cours :** ${e._doneHours}h / ${e._goalHours}h (**${e._progress}%**)
${t?"🎉 Objectif atteint ! Prêt pour un nouveau cycle ?":`**Restant :** ${e._leftHours}h`}

Comment puis-je vous aider à optimiser vos sessions de backtest ?`}if(e!=null&&e._rulesContext){const t=((m=e._rules)==null?void 0:m.length)>0?e._rules.map((n,c)=>`${c+1}. ${n}`).join(`
`):"Aucune règle active.";return`${i} — je suis votre **Coach Trading TradeForge**.

J'ai analysé vos **${((f=e._rules)==null?void 0:f.length)||0} règles actives**. Taux de respect : **${e._respectRate}%** avec **${e._violationCount} violation${e._violationCount!==1?"s":""}**.

**Vos règles :**
${t}

Que souhaitez-vous explorer ?`}if(e!=null&&e._monthlyContext){const t=e._stats;if(t&&t.total>0){const n=t.winRate>=60?"excellente":t.winRate>=50?"satisfaisante":"perfectible";return`${i} — voici mon analyse de **${e.market}**.

**${t.total} trades** ce mois, performance ${n} : **${t.winRate}% win rate**, P&L **${t.profit>=0?"+":""}${t.profit}R**.

Comment puis-je vous aider à tirer les enseignements de ce mois ?`}return`${i}.

Aucun trade ce mois-ci. Profitez-en pour revoir votre plan ou définir vos objectifs.`}if(e&&e.market){const t=Array.isArray(e.hindsight)?e.hindsight[0]:e.hindsight,n={tp:"✅ Take Profit",sl:"❌ Stop Loss",be:"⚖️ Breakeven",missed:"👁️ Missed"};let c=`${i} — analysons votre trade **${(x=e.type)==null?void 0:x.toUpperCase()} ${e.market}**.

`;c+=`**Résultat :** ${n[e.result]||e.result}  
`,e.rr_planned&&(c+=`**RR prévu / réalisé :** ${e.rr_planned}R / ${e.rr_won!=null?e.rr_won+"R":"—"}  
`),e.session&&(c+=`**Session :** ${e.session}  
`),e.discipline_score&&(c+=`**Discipline :** ${e.discipline_score}/10
`),t!=null&&t.main_error&&(c+=`
**After Trade rempli :**
- Erreur : ${t.main_error}
- Leçon : ${t.lesson||"—"}
- Règle : ${t.rule||"—"}
`);const h=[];return e.respect_plan||h.push("plan non respecté"),e.session==="Hors session"&&h.push("trade hors session"),e.discipline_score&&e.discipline_score<=4&&h.push(`discipline faible (${e.discipline_score}/10)`),(e.emotion==="FOMO"||e.emotion==="Revenge")&&h.push(`état ${e.emotion}`),h.length>0&&(c+=`
**Points d'attention :** ${h.join(", ")}
`),c+=`
Que souhaitez-vous approfondir ?`,c}if(u){const t=u.winRate>=60?"solide":u.winRate>=50?"dans la moyenne":"à améliorer";return`${i} — je suis votre **Coach Trading TradeForge**.

**${u.total} trades** enregistrés. Win rate : **${u.winRate}%** (${t}). Profit cumulé : **${u.profit>=0?"+":""}${u.profit}R**.

Par où souhaitez-vous commencer ?`}return`${i} — je suis votre **Coach Trading TradeForge**.

Votre journal est encore vide. Commencez par enregistrer vos premiers trades pour que je puisse analyser votre performance.

N'hésitez pas à me poser des questions sur votre stratégie.`}function ne({trade:e,onClose:o}){var A,E,F;const{trades:l}=P(),{user:i}=D(),[u,m]=v.useState([]),[f,x]=v.useState(""),[t,n]=v.useState(!1),[c,h]=v.useState(null),N=v.useRef(null),y=v.useRef(null),d=((A=i==null?void 0:i.user_metadata)==null?void 0:A.username)||((E=i==null?void 0:i.user_metadata)==null?void 0:E.full_name)||null,_=l.length>0?{total:l.length,winRate:Math.round(l.filter(r=>r.result==="tp").length/l.length*100),profit:+l.reduce((r,g)=>g.result==="tp"?r+(g.rr_won||0):g.result==="sl"?r-1:r,0).toFixed(2)}:null;v.useEffect(()=>{m([{role:"assistant",content:L(e,l,d)}]),setTimeout(()=>{var r;return(r=y.current)==null?void 0:r.focus()},300)},[]),v.useEffect(()=>{var r;(r=N.current)==null||r.scrollIntoView({behavior:"smooth"})},[u,t]);const $=v.useCallback(async r=>{const g=(r||f).trim();if(!g||t)return;x(""),h(null);const M=[...u,{role:"user",content:g}];m(M),n(!0);try{const T=Z(e,l,d),b=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:M.map(j=>({role:j.role,content:j.content})),systemPrompt:T,trade:e,allTrades:l,userName:d})});if(!b.ok){const j=await b.json();throw new Error(`Erreur API ${b.status}: ${JSON.stringify(j)}`)}const B=await b.json();m(j=>[...j,{role:"assistant",content:B.reply||""}])}catch(T){h(`Impossible de contacter le coach : ${T.message}`),m(b=>b.slice(0,-1))}finally{n(!1)}},[f,t,u,e,l,d]),C=r=>{r.key==="Enter"&&!r.shiftKey&&(r.preventDefault(),$())},k=()=>{m([]),h(null),setTimeout(()=>{m([{role:"assistant",content:L(e,l,d)}])},100)},w=K(e),a=u.length<=1&&!t,p=e&&!e._rulesContext&&!e._monthlyContext&&!e._backtestContext?[e.result&&{icon:O,label:"Résultat",value:e.result.toUpperCase(),color:e.result==="tp"?"#2EA043":e.result==="sl"?"#F85149":"#58a6ff"},e.rr_won!=null&&{icon:H,label:"RR Réalisé",value:`${e.rr_won}R`,color:e.rr_won>0?"#2EA043":"#F85149"},e.discipline_score&&{icon:U,label:"Discipline",value:`${e.discipline_score}/10`,color:e.discipline_score>=7?"#2EA043":e.discipline_score>=5?"#F7B731":"#F85149"},!e.respect_plan&&{icon:z,label:"Plan",value:"Non respecté",color:"#F85149"}].filter(Boolean):[];return s.jsxs(s.Fragment,{children:[s.jsx("div",{className:"fixed inset-0 z-50",style:{background:"var(--modal-overlay)",backdropFilter:"blur(6px)"},onClick:o}),s.jsxs("div",{className:"fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden",style:{background:"var(--modal-bg)",border:"1px solid rgba(247,183,49,0.18)",borderBottom:"none",maxHeight:"88vh",paddingBottom:"env(safe-area-inset-bottom)",boxShadow:"0 -24px 80px rgba(0,0,0,0.5)"},children:[s.jsxs("div",{className:"flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0",style:{borderBottom:"1px solid var(--border-soft)"},children:[s.jsxs("div",{className:"flex items-center gap-2.5",children:[s.jsx("div",{className:"w-8 h-8 rounded-xl flex items-center justify-center",style:{background:"rgba(247,183,49,0.15)",border:"1px solid rgba(247,183,49,0.35)"},children:s.jsx(S,{size:15,className:"text-forge-accent"})}),s.jsxs("div",{children:[s.jsx("p",{className:"text-sm font-semibold",style:{color:"var(--text-primary)"},children:"Coach Trading IA"}),s.jsxs("p",{className:"text-[10px]",style:{color:"var(--forge-muted)"},children:[e!=null&&e._backtestContext?"Analyse Backtest":e!=null&&e._rulesContext?"Analyse des règles":e!=null&&e._monthlyContext?e.market:e!=null&&e.market?`${e.market} · ${(F=e.type)==null?void 0:F.toUpperCase()} · ${e.session||""}`:_?`${_.total} trades · ${_.winRate}% win rate`:"Analyse globale",d?` · ${d}`:""]})]})]}),s.jsxs("div",{className:"flex gap-2 items-center",children:[s.jsx("button",{onClick:k,className:"w-8 h-8 rounded-full flex items-center justify-center transition-colors",style:{background:"var(--surface-5)",color:"var(--forge-muted)"},onMouseEnter:r=>r.currentTarget.style.color="var(--text-primary)",onMouseLeave:r=>r.currentTarget.style.color="var(--forge-muted)",children:s.jsx(V,{size:13})}),s.jsx("button",{onClick:o,className:"w-8 h-8 rounded-full flex items-center justify-center transition-colors",style:{background:"var(--surface-5)",color:"var(--forge-muted)"},onMouseEnter:r=>r.currentTarget.style.color="var(--text-primary)",onMouseLeave:r=>r.currentTarget.style.color="var(--forge-muted)",children:s.jsx(W,{size:18})})]})]}),p.length>0&&s.jsx("div",{className:"flex gap-2 px-4 py-2.5 overflow-x-auto flex-shrink-0",style:{borderBottom:"1px solid var(--border-soft)",scrollbarWidth:"none"},children:p.map((r,g)=>s.jsx(G,{icon:r.icon,label:r.label,value:r.value,color:r.color},g))}),s.jsxs("div",{className:"flex-1 overflow-y-auto px-4 py-3 space-y-3",style:{minHeight:0},children:[u.map((r,g)=>s.jsx(Y,{msg:r},g)),t&&s.jsxs("div",{className:"flex gap-2.5",children:[s.jsx("div",{className:"w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0",style:{background:"rgba(247,183,49,0.15)",border:"1px solid rgba(247,183,49,0.3)"},children:s.jsx(S,{size:13,className:"text-forge-accent"})}),s.jsxs("div",{className:"flex items-center gap-2 px-3.5 py-2.5 rounded-2xl",style:{background:"var(--surface-card)",border:"1px solid var(--surface-card-border)"},children:[s.jsx("div",{className:"flex gap-1",children:[0,1,2].map(r=>s.jsx("div",{className:"w-1.5 h-1.5 rounded-full bg-forge-accent",style:{animation:`tfBounce 1.2s ease-in-out ${r*.2}s infinite`}},r))}),s.jsx("span",{className:"text-xs",style:{color:"var(--forge-muted)"},children:"Analyse en cours..."})]})]}),c&&s.jsxs("div",{className:"flex items-center gap-2 px-3 py-2 rounded-xl text-xs",style:{background:"rgba(248,81,73,0.08)",border:"1px solid rgba(248,81,73,0.2)",color:"#F85149"},children:[s.jsx(z,{size:12})," ",c]}),s.jsx("div",{ref:N})]}),a&&s.jsxs("div",{className:"px-4 pb-2 flex-shrink-0",children:[s.jsx("p",{className:"text-[10px] uppercase tracking-wider mb-1.5",style:{color:"var(--forge-muted)"},children:"Suggestions"}),s.jsx("div",{className:"flex gap-2 overflow-x-auto",style:{scrollbarWidth:"none"},children:w.map(r=>s.jsx("button",{onClick:()=>$(r),className:"flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-all active:scale-95",style:{background:"rgba(247,183,49,0.07)",border:"1px solid rgba(247,183,49,0.2)",color:"#F7B731",whiteSpace:"nowrap"},children:r},r))})]}),s.jsxs("div",{className:"px-4 pb-3 pt-2 flex-shrink-0",style:{borderTop:"1px solid var(--border-soft)"},children:[s.jsxs("div",{className:"flex gap-2 items-end",children:[s.jsx("textarea",{ref:y,value:f,onChange:r=>x(r.target.value),onKeyDown:C,placeholder:"Pose une question sur ce trade...",rows:1,className:"flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm outline-none",style:{background:"var(--surface-card)",border:"1px solid var(--surface-card-border)",color:"var(--text-primary)",maxHeight:"120px",lineHeight:"1.5"},onInput:r=>{r.target.style.height="auto",r.target.style.height=Math.min(r.target.scrollHeight,120)+"px"}}),s.jsx("button",{onClick:()=>$(),disabled:!f.trim()||t,className:"w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40",style:{background:f.trim()&&!t?"#F7B731":"rgba(247,183,49,0.12)",color:f.trim()&&!t?"#0A0B0D":"rgba(247,183,49,0.4)"},children:t?s.jsx(q,{size:15,className:"animate-spin"}):s.jsx(Q,{size:15})})]}),s.jsx("p",{className:"text-[10px] text-center mt-1.5",style:{color:"var(--forge-muted)"},children:"Entrée pour envoyer · Shift+Entrée pour nouvelle ligne"})]})]}),s.jsx("style",{children:`
        @keyframes tfBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `})]})}export{z as A,q as L,ne as a};
