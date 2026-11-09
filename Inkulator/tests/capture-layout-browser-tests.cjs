const {chromium,webkit}=require("playwright"),assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {pathToFileURL}=require("node:url");
const root=path.resolve(__dirname,"..");fs.mkdirSync(path.join(root,"test-results"),{recursive:true});
(async()=>{
 for(const engine of ["chrome","msedge",...(process.env.INKULATOR_WEBKIT_EXECUTABLE?["webkit"]:[])]) {
  const browser=engine==="webkit"?await webkit.launch({headless:true,executablePath:process.env.INKULATOR_WEBKIT_EXECUTABLE}):await chromium.launch({channel:engine,headless:true});
  let page;
  try {
   const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:2,offline:true});
   page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(root,"index.html")).href);await page.waitForFunction(()=>window.Scrble);
   const cdp=engine!=="webkit"?await context.newCDPSession(page):null;
   const pen=async(type,x,y,down=false)=>{
    if(cdp)return cdp.send("Input.dispatchMouseEvent",{type,x,y,button:type==="mouseMoved"?"none":"left",buttons:down?1:0,pointerType:"pen",force:down?.6:0,clickCount:1});
    await page.mouse.move(x,y);if(type!=="mouseMoved")return type==="mousePressed"?page.mouse.down():page.mouse.up();
   };
   const tap=async(selector)=>{const el=page.locator(selector).first();await el.waitFor({state:"visible"});await el.scrollIntoViewIfNeeded();const r=await el.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;await pen("mouseMoved",x,y);await pen("mousePressed",x,y,true);await pen("mouseReleased",x,y);};
   const fit=async()=>{
    await page.waitForFunction(()=>{const a=Renderer.area,p=Store.current(),v=Store.state.viewport;return Math.abs(v.x-(a.clientWidth-p.width*v.zoom)/2)<1&&v.y>=0&&v.y+p.height*v.zoom<=a.clientHeight-40;});
   };
   await fit();assert.equal(await page.evaluate(()=>Store.book().pages.length),1);
   await page.screenshot({path:path.join(root,`test-results/${engine}-centered-page.png`)});
   await tap("#pages-toggle");await fit();await tap("#pages-toggle");await fit();
   await tap('[data-action="fit-width"]');
   assert.ok(await page.evaluate(()=>Math.abs(Store.current().width*Store.state.viewport.zoom-(Renderer.area.clientWidth-48))<1));
   await tap('[data-action="fit"]');await fit();
   await page.evaluate(()=>CanvasEngine.zoomAt(.9));await page.setViewportSize({width:1280,height:900});
   await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>Store.state.viewport.zoom),.9);
   await page.evaluate(()=>Store.switchPage(0));await fit();
   console.log("PASS",engine,"page starts centered and fully visible, refits with sidebar/page changes and preserves manual zoom on resize");
   await page.evaluate(()=>{
    Store.transaction(()=>{
      const p=Store.current();p.paper="blank";p.showTitle=false;p.width=1000;p.height=800;
      p.objects=[Store.object("shape",{kind:"rectangle"},{position:{x:240,y:260},size:{w:140,h:90},style:{color:"#cc2222",width:4,opacity:1}}),Store.object("stroke",{pen:"ballpoint",points:[[0,0,.5],[220,40,.8]],baseSize:{w:220,h:40}},{position:{x:270,y:390},size:{w:220,h:40}})];
    });
    Store.state.viewMode="manual";Store.state.viewport={x:80,y:60,zoom:1};App.setTool("select");Store.state.selection=[Store.current().objects[0].id];Store.emit();
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{read:async()=>{throw Error("blocked");}}});
   });
   const initial=await page.evaluate(()=>({history:Store.state.history.length,count:Store.current().objects.length}));
   await tap('#pen-dock [data-action="capture"]');await page.locator("#capture-overlay").waitFor();
   const area=await page.locator("#canvas-area").boundingBox();
   const A={x:area.x+80+200,y:area.y+60+220},B={x:area.x+80+620,y:area.y+60+480};
   await pen("mouseMoved",B.x,B.y);await pen("mousePressed",B.x,B.y,true);await pen("mouseMoved",A.x,A.y,true);await pen("mouseReleased",A.x,A.y);
   await page.waitForFunction(()=>CaptureStudio.latest&&!CaptureStudio.active);
   const result=await page.evaluate(async()=>{
    const src=CaptureStudio.latest.src,img=new Image();img.src=src;await img.decode();const c=document.createElement("canvas");c.width=img.width;c.height=img.height;const ctx=c.getContext("2d");ctx.drawImage(img,0,0);
    const sample=(x,y)=>[...ctx.getImageData(Math.round(x*img.width/420),Math.round(y*img.height/260),1,1).data];
    return {w:img.width,h:img.height,red:sample(40,40),clean:sample(35,35),history:Store.state.history.length,count:Store.current().objects.length,src};
   });
   assert.ok(result.w>=420&&result.h>=260);assert.ok(result.red[0]>120&&result.red[1]<100);assert.ok(result.clean[0]>240&&result.clean[1]>240);
   assert.equal(result.history,initial.history);assert.equal(result.count,initial.count);
   await page.waitForFunction(async()=>!!await AssetStorage.get("inkulator-latest-capture"));
   await tap('.workspace-tabs [data-action="paste-image"]');await page.waitForFunction(()=>Store.current().objects.length===3);
   assert.equal(await page.evaluate(()=>Store.current().objects.at(-1).data.src),result.src);
   await page.evaluate(()=>Store.undo());assert.equal(await page.evaluate(()=>Store.current().objects.length),2);
   await page.evaluate(()=>Store.redo());assert.equal(await page.evaluate(()=>Store.current().objects.length),3);
   await tap('#capture-tray [data-action="paste-capture"]');await page.waitForFunction(()=>Store.current().objects.length===4);
   console.log("PASS",engine,"reverse pen rectangle captures clean paper/content at Retina scale; paste works with blocked clipboard and has Undo/Redo");
   await tap('#pen-dock [data-action="capture"]');await page.locator("#capture-overlay").waitFor();await page.keyboard.press("Escape");assert.equal(await page.locator("#capture-overlay").count(),0);
   await page.evaluate(()=>Store.save());await page.reload();await page.waitForFunction(()=>CaptureStudio.latest);assert.equal(await page.evaluate(()=>CaptureStudio.latest.src),result.src);
   console.log("PASS",engine,"capture cancellation preserves data and last capture survives reload");
   await page.evaluate(()=>{
    Store.transaction(()=>{Store.current().objects=[];Store.current().paper="grid";});
    Panels.insert("cube",true,{x:190,y:130});App.closePanel();Store.selected()[0].size={w:500,h:440};Store.state.viewMode="manual";Store.state.viewport={x:20,y:20,zoom:1};Store.emit();
   });
   await page.waitForTimeout(80);assert.equal(await page.locator("#selection-tools").isVisible(),false);
   assert.ok((await page.locator("#geometry-toolbar").boundingBox()).width<=56);
   await tap("#geo-hub");assert.equal(await page.locator("#geo-hub").getAttribute("aria-expanded"),"true");
   assert.ok((await page.locator("#geometry-toolbar").boundingBox()).width<=190);
   await page.screenshot({path:path.join(root,`test-results/${engine}-geometry-wheel.png`)});
   await tap('[data-geo-mode="midpoint"]');assert.equal(await page.locator("#geo-hub").getAttribute("aria-expanded"),"false");
   const edge=await page.evaluate(()=>{const line=TeacherGeometry.lines(Store.selected()[0]).find(l=>l.refs.join()==="v:0,v:1"),r=Renderer.area.getBoundingClientRect(),v=Store.state.viewport;return{x:r.left+v.x+(line.world[0].x+line.world[1].x)/2*v.zoom,y:r.top+v.y+(line.world[0].y+line.world[1].y)/2*v.zoom};});
   await pen("mousePressed",edge.x,edge.y,true);await pen("mouseReleased",edge.x,edge.y);
   assert.equal(await page.evaluate(()=>Store.selected()[0].data.constructions[0].type),"midpoint");
   await tap("#geo-hub");await tap("#geo-more");await tap('[data-geo-tab="edit"]');await tap('[data-geo-action="duplicate"]');
   assert.equal(await page.evaluate(()=>Store.current().objects.filter(o=>o.type==="solid").length),2);
   await tap("#geo-hub");await tap("#geo-more");await tap('[data-geo-tab="edit"]');await tap('[data-geo-action="labels"]');
   assert.equal(await page.evaluate(()=>Store.selected()[0].data.labels),false);
   console.log("PASS",engine,"circular geometry controls, one-tap edge midpoint, grouped editing, duplicate and label toggle work with pen taps");
   await page.setViewportSize({width:834,height:1112});await page.waitForTimeout(100);await tap("#geo-hub");
   const wheel=await page.locator("#geometry-toolbar").boundingBox();assert.ok(wheel.x>=0&&wheel.x+wheel.width<=834&&wheel.y>=0&&wheel.y+wheel.height<=1112);
   assert.deepEqual(errors,[]);
  } catch(e) {if(page)await page.screenshot({path:path.join(root,`test-results/${engine}-capture-error.png`)});throw e;}
  finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
