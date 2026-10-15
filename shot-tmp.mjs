import { chromium } from "playwright";
const [S, path, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [w,h,m] of [[1440,900,false],[390,844,true]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:m, hasTouch:m });
  await p.goto("http://localhost:3200"+path); await p.waitForTimeout(2500);
  const o = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  console.log(w,"overflow",o);
  await p.screenshot({ path:`${S}/${tag}-${w}.png`, fullPage:false });
}
await b.close();
