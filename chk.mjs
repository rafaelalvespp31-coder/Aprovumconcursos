import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport:{width:1366,height:640} });
await p.goto("http://localhost:3200/dev/galeria/painel"); await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{let e=document.querySelector("aside"); const out=[]; while(e){const cs=getComputedStyle(e); out.push(`${e.tagName}.${(e.className||"").toString().slice(0,50)} ov=${cs.overflowX}/${cs.overflowY} h=${e.getBoundingClientRect().height|0}`); e=e.parentElement;} return out.join("\n")}));
await b.close();
