import{c as u,r as c,g as v,j as e,aa as S,ab as g,b as T,a as z,$ as R,z as V,A as f}from"./index-H4DaqSpq.js";import{g as D,a as H,b as P,c as W,d as A,e as m,f as G}from"./command-D6Zdrqg1.js";import{L as w,a as I,S as U}from"./scroll-area-B7G2E8-s.js";import{C as _,a4 as q,a5 as K}from"./sign-out-dialog-hk5uccCc.js";import{S as Y}from"./shield-alert-DNCMqb7A.js";import{C as B}from"./chevron-right-BARXRStm.js";/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=[["path",{d:"M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2",key:"57tc96"}]],L=u("audio-waveform",F);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=[["rect",{x:"2",y:"6",width:"20",height:"8",rx:"1",key:"1estib"}],["path",{d:"M17 14v7",key:"7m2elx"}],["path",{d:"M7 14v7",key:"1cm7wv"}],["path",{d:"M17 3v3",key:"1v4jwn"}],["path",{d:"M7 3v3",key:"7o6guu"}],["path",{d:"M10 14 2.3 6.3",key:"1023jk"}],["path",{d:"m14 6 7.7 7.7",key:"1s8pl2"}],["path",{d:"m8 6 8 8",key:"hl96qh"}]],M=u("construction",Q);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X=[["path",{d:"M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z",key:"1pdavp"}],["path",{d:"M20.054 15.987H3.946",key:"14rxg9"}]],J=u("laptop",X);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]],N=u("message-circle",Z);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ee=[["path",{d:"M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",key:"1n2ejm"}],["path",{d:"M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1",key:"1qfcsi"}]],E=u("messages-square",ee);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]],h=u("monitor",te);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const se=[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]],O=u("wrench",se),C="layout_collapsible",k="layout_variant",j=3600*24*7,p="inset",x="icon",b=c.createContext(null);function me({children:t}){const[n,l]=c.useState(()=>v(C)||x),[o,s]=c.useState(()=>v(k)||p),i=r=>{l(r),S(C,r,j)},a=r=>{s(r),S(k,r,j)},d={resetLayout:()=>{i(x),a(p)},defaultCollapsible:x,collapsible:n,setCollapsible:i,defaultVariant:p,variant:o,setVariant:a};return e.jsx(b,{value:d,children:t})}function he(){const t=c.useContext(b);if(!t)throw new Error("useLayout must be used within a LayoutProvider");return t}function pe(){const{auth:t}=T.getState(),n=t.user,l=n?.email?.split("@")[0]||"User",o=n?.email||"user@example.com",s=[{title:"Reputation Analysis",items:[{title:"Overview",url:"/",icon:w},{title:"All Scans",url:"/scans",icon:h},{title:"New Scan",url:"/scans/new",icon:M},{title:"Mentions",url:"/mentions",icon:N}]},{title:"AI & Workflows",items:[{title:"AI Chat",url:"/ai-chat",icon:E},{title:"Workflows",url:"/workflows",icon:O},{title:"AI Models",url:"/models",icon:L}]},{title:"System",items:[{title:"System Health",url:"/health",icon:h},{title:"Settings",url:"/settings",icon:_},{title:"Help Center",url:"/help-center",icon:g}]}];return t.isAdmin()&&s.push({title:"Administration",items:[{title:"Admin Panel",url:"/admin",icon:Y}]}),{user:{name:l,email:o,avatar:"/avatars/shadcn.jpg"},teams:[{name:"Repazoo",logo:I,plan:"AI-Powered SaaS"}],navGroups:s}}const ae={navGroups:[{title:"Reputation Analysis",items:[{title:"Overview",url:"/",icon:w},{title:"All Scans",url:"/scans",icon:h},{title:"New Scan",url:"/scans/new",icon:M},{title:"Mentions",url:"/mentions",icon:N}]},{title:"AI & Workflows",items:[{title:"AI Chat",url:"/ai-chat",icon:E},{title:"Workflows",url:"/workflows",icon:O},{title:"AI Models",url:"/models",icon:L}]},{title:"System",items:[{title:"System Health",url:"/health",icon:h},{title:"Settings",url:"/settings",icon:_},{title:"Help Center",url:"/help-center",icon:g}]}]};function ne(){const t=z(),{setTheme:n}=R(),{open:l,setOpen:o}=oe(),s=V.useCallback(i=>{o(!1),i()},[o]);return e.jsxs(D,{modal:!0,open:l,onOpenChange:o,children:[e.jsx(H,{placeholder:"Type a command or search..."}),e.jsx(P,{children:e.jsxs(U,{type:"hover",className:"h-72 pe-1",children:[e.jsx(W,{children:"No results found."}),ae.navGroups.map(i=>e.jsx(A,{heading:i.title,children:i.items.map((a,y)=>a.url?e.jsxs(m,{value:a.title,onSelect:()=>{s(()=>t({to:a.url}))},children:[e.jsx("div",{className:"flex size-4 items-center justify-center",children:e.jsx(f,{className:"text-muted-foreground/80 size-2"})}),a.title]},`${a.url}-${y}`):a.items?.map((d,r)=>e.jsxs(m,{value:`${a.title}-${d.url}`,onSelect:()=>{s(()=>t({to:d.url}))},children:[e.jsx("div",{className:"flex size-4 items-center justify-center",children:e.jsx(f,{className:"text-muted-foreground/80 size-2"})}),a.title," ",e.jsx(B,{})," ",d.title]},`${a.title}-${d.url}-${r}`)))},i.title)),e.jsx(G,{}),e.jsxs(A,{heading:"Theme",children:[e.jsxs(m,{onSelect:()=>s(()=>n("light")),children:[e.jsx(q,{})," ",e.jsx("span",{children:"Light"})]}),e.jsxs(m,{onSelect:()=>s(()=>n("dark")),children:[e.jsx(K,{className:"scale-90"}),e.jsx("span",{children:"Dark"})]}),e.jsxs(m,{onSelect:()=>s(()=>n("system")),children:[e.jsx(J,{}),e.jsx("span",{children:"System"})]})]})]})})]})}const $=c.createContext(null);function xe({children:t}){const[n,l]=c.useState(!1);return c.useEffect(()=>{const o=s=>{s.key==="k"&&(s.metaKey||s.ctrlKey)&&(s.preventDefault(),l(i=>!i))};return document.addEventListener("keydown",o),()=>document.removeEventListener("keydown",o)},[]),e.jsxs($,{value:{open:n,setOpen:l},children:[t,e.jsx(ne,{})]})}const oe=()=>{const t=c.useContext($);if(!t)throw new Error("useSearch has to be used within SearchProvider");return t};export{me as L,h as M,xe as S,O as W,E as a,N as b,oe as c,pe as g,he as u};
