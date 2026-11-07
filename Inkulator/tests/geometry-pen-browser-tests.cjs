const {chromium,webkit}=require("playwright"),assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {pathToFileURL}=require("node:url");
const root=path.resolve(__dirname,"..");fs.mkdirSync(path.join(root,"test-results"),{recursive:true});
(async()=>{
 for(const engine of ["chrome","msedge",...(process.env.INKULATOR_WEBKIT_EXECUTABLE?["webkit"]:[])]) {
  const browser=engine==="webkit"?await webkit.launch({headless:true,executablePath:process.env.INKULATOR_WEBKIT_EXECUTABLE}):await chromium.launch({channel:engine,headless:true});
  try {
   const context=await browser.newContext({viewport:{width:1440,height:960},offline:true});
   const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(root,"index.html")).href);await page.waitForFunction(()=>window.Scrble);
   const cdp=engine!=="webkit"?await context.newCDPSession(page):null;
   const pen=async(type,x,y,down=false)=>{
    if(cdp)return cdp.send("Input.dispatchMouseEvent",{type,x,y,button:type==="mouseMoved"?"none":"left",buttons:down?1:0,pointerType:"pen",force:down?.6:0,clickCount:1});
    if(type==="mouseMoved")return page.mouse.move(x,y);
    await page.mouse.move(x,y);
    return type==="mousePressed"?page.mouse.down():page.mouse.up();
   };
   const tap=async(selector)=>{
    const el=page.locator(selector).first();await el.waitFor({state:"visible"});await el.scrollIntoViewIfNeeded();const r=await el.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
    await pen("mouseMoved",x,y);await pen("mousePressed",x,y,true);await pen("mouseReleased",x,y);
   };
   const screen=async(p)=>page.evaluate(p=>{const r=Renderer.area.getBoundingClientRect(),v=Store.state.viewport;return{x:r.left+v.x+p.x*v.zoom,y:r.top+v.y+p.y*v.zoom};},p);
   const vertex=async(key)=>{
    const p=await screen(await page.evaluate(key=>TeacherGeometry.points(Store.selected()[0]).find(p=>p.key===key).world,key));
    await pen("mousePressed",p.x,p.y,true);await pen("mouseReleased",p.x,p.y);
   };
   const mode=async(k)=>{if(!await page.locator('[data-geo-mode="'+k+'"]').isVisible())await tap("#geo-more");await tap('[data-geo-mode="'+k+'"]');};
   await page.evaluate(()=>{App.openPanel("solid");Panels.insert("cube",true,{x:270,y:170});App.closePanel();Store.selected()[0].size={w:600,h:520};Store.emit();});
   await page.waitForTimeout(80);
   const bounds=await page.evaluate(()=>{const o=Store.selected()[0],b=Renderer.selectionBounds(o);return{b,size:o.size,handles:CanvasEngine.selectionHandles(o)};});
   assert.ok(bounds.b.w<bounds.size.w*.8);assert.ok(bounds.b.h<bounds.size.h*.8);
   assert.equal(bounds.handles[0].x,bounds.b.x);
   const start=await screen(await page.evaluate(()=>{const o=Store.selected()[0];return Renderer.worldPoint(o,CanvasEngine.selectionHandles(o).find(h=>h.key==="br"));}));
   const anchor=await page.evaluate(()=>{const o=Store.selected()[0];return Renderer.worldPoint(o,CanvasEngine.selectionHandles(o)[0]);});
   await pen("mouseMoved",start.x,start.y);await pen("mousePressed",start.x,start.y,true);
   for(let i=1;i<=10;i++)await pen("mouseMoved",start.x+6*i,start.y+4*i,true);
   await pen("mouseReleased",start.x+60,start.y+40);
   const after=await page.evaluate(()=>{const o=Store.selected()[0];return {size:o.size,anchor:Renderer.worldPoint(o,CanvasEngine.selectionHandles(o)[0])};});
   assert.ok(after.size.w>600);assert.ok(Math.hypot(after.anchor.x-anchor.x,after.anchor.y-anchor.y)<.01);
   console.log("PASS",engine,"tight selection handles resize the visible solid with a fixed opposite corner");
   await page.screenshot({path:path.join(root,`test-results/${engine}-tight-controls.png`)});
   await mode("dividePoint");await vertex("v:0");await vertex("v:1");await tap('[data-ratio="0.3333333333333333"]');
   assert.ok(Math.abs(await page.evaluate(()=>Constructions.build(Store.selected()[0]).points.get("c:"+Store.selected()[0].data.constructions.at(-1).id).coords[0])-4/3)<1e-8);
   await mode("linePlane");for(const key of ["v:4","v:0","v:0","v:1","v:2"])await vertex(key);
   await mode("projectPlane");for(const key of ["v:6","v:0","v:1","v:2"])await vertex(key);
   await mode("planeAngle");for(const key of ["v:0","v:1","v:2","v:0","v:1","v:4"])await vertex(key);
   assert.deepEqual(await page.evaluate(()=>Constructions.build(Store.selected()[0]).warnings),[]);
   assert.equal(await page.evaluate(()=>Constructions.build(Store.selected()[0]).items.at(-1).angle),90);
   await mode("planePlane");for(const key of ["v:0","v:1","v:2","v:0","v:1","v:4"])await vertex(key);
   await mode("distancePlane");for(const key of ["v:6","v:0","v:1","v:2"])await vertex(key);
   await mode("linePlaneAngle");for(const key of ["v:0","v:6","v:0","v:1","v:2"])await vertex(key);
   await mode("commonPerpendicular");for(const key of ["v:0","v:1","v:6","v:2"])await vertex(key);
   assert.deepEqual(await page.evaluate(()=>Constructions.build(Store.selected()[0]).warnings),[]);
   console.log("PASS",engine,"pen taps construct division points, line-plane intersections, projections and plane angles, including shared vertices");
   await mode("rename");await vertex("v:0");await tap('[data-point-name="E"]');
   assert.equal(await page.evaluate(()=>Store.selected()[0].data.vertexLabels[0]),"E");
   await tap("#geo-view");await tap('[data-view="alternate"]');
   assert.equal(await page.evaluate(()=>Store.selected()[0].data.live),false);
   await tap("#geo-view");await tap('[data-view="standard"]');
   await page.evaluate(()=>{const o=Store.selected()[0];o.data.currentStep=0;Renderer.render();});
   assert.equal(await page.locator(".geometry-stepper,#geo-step-prev,#geo-step-next,#geo-step-all").count(),0);
   await page.screenshot({path:path.join(root,`test-results/${engine}-geometry-near-controls.png`)});
   const data=await page.evaluate(()=>{const n=Store.envelope();Store.validate(n,true);Store.save();return n.notebook.pages[0].objects[0].data.constructions.length;});
   assert.equal(data,8);
   await page.reload();await page.waitForFunction(()=>window.Scrble);
   assert.equal(await page.evaluate(()=>Store.current().objects[0].data.constructions.length),8);
   assert.deepEqual(errors,[]);
   console.log("PASS",engine,"pen naming, textbook view presets, removed lesson controls and saved dependent constructions");
   await page.evaluate(()=>{Panels.insert("circle",false,{x:220,y:200});App.closePanel();});
   await mode("reflectPoint");await vertex("v:0");await vertex("v:1");
   const outside=await page.evaluate(()=>"c:"+Store.selected()[0].data.constructions.at(-1).id);
   await mode("tangent");for(const key of ["v:0","v:1",outside])await vertex(key);
   assert.equal(await page.evaluate(()=>Constructions.build(Store.selected()[0]).items.at(-1).tangentPoints.length),2);
   await page.evaluate(()=>TeacherGeometry.cancel());
   console.log("PASS",engine,"circle tangents can be constructed with pen taps using a derived external point");
   await page.setViewportSize({width:834,height:1112});
   await page.evaluate(()=>{Store.state.selection=[Store.current().objects[0].id];App.setTool("select");Store.emit();});
   await page.waitForTimeout(80);
   for(const id of ["selection-tools","geometry-toolbar"]) {
    const r=await page.locator("#"+id).boundingBox();assert.ok(r.x>=0&&r.x+r.width<=834+.1&&r.y>=0&&r.y+r.height<=1112);
   }
   console.log("PASS",engine,"controls remain reachable on an iPad-sized viewport");
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
