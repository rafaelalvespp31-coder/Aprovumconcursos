import { chromium } from "playwright";
const [S, path, tag, w, h, m, full] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport:{width:+w,height:+h}, isMobile:m==="1", hasTouch:m==="1" });
await p.goto("http://localhost:3200"+path); await p.waitForTimeout(2500);
console.log("overflow", await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth), "h", await p.evaluate(()=>document.documentElement.scrollHeight));
await p.screenshot({ path:`${S}/${tag}.png`, fullPage: full==="1" });
await b.close();
