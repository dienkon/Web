const assert=require('node:assert/strict');
require('../js/state.js');
const src='data:image/png;base64,'+'A'.repeat(2e6),second='data:image/png;base64,'+'B'.repeat(2e6);
Store.state.settings.autosave=300000;
Store.add(Store.object('image',{src,originalSrc:src}));
Store.clearHistory();
for(let i=0;i<40;i++)Store.transaction(()=>Store.current().objects[0].position.x=i);
assert.ok(Store.state.history.length>=39);
const actual=Store.state.history.reduce((sum,entry)=>sum+entry.length*2,0);
assert.ok(actual<200000,`${actual} serialized bytes for forty edits to a 2 MB image`);
for(let i=0;i<39;i++){Store.undo();assert.equal(Store.current().objects[0].data.src,src);}
for(let i=0;i<39;i++){Store.redo();assert.equal(Store.current().objects[0].data.src,src);}
const before=Store.snapshot();Store.current().objects[0].data.src=second;
Store.state.notebooks[Store.state.active]={...Store.restoreSnapshot(before),assets:{}};Store.invalidateSnapshot();
assert.equal(Store.current().objects[0].data.src,src);
Store.transaction(()=>{Store.current().objects[0].data.src=second;});
Store.undo();assert.equal(Store.current().objects[0].data.src,src);
Store.redo();assert.equal(Store.current().objects[0].data.src,second);
assert.equal(Store.envelope().notebook.pages[0].objects[0].data.src,second);
Store.state.settings.historyLimit=2;
for(let i=0;i<8;i++)Store.transaction(()=>Store.current().title=String(i));
Store.undo();Store.undo();assert.equal(Store.current().objects[0].data.src,second);
Store.redo();Store.redo();Store.clearHistory();assert.equal(Store.current().objects[0].data.src,second);
Store.state.settings.historyLimit=200;
for(let i=0;i<20;i++)Store.transaction(()=>Store.current().objects[0].data.src='data:image/png;base64,'+String(i)+'Z'.repeat(1e6));
assert.ok(Store.state.history.length<14,'Unique replaced image bytes must also count toward the memory budget');
Store.undo();assert.match(Store.current().objects[0].data.src,/18Z/);Store.redo();assert.match(Store.current().objects[0].data.src,/19Z/);
console.log('PASS shared history media: forty 2 MB image edits use '+actual+' serialized bytes; Undo/Redo, replacement, cancellation, pruning and export preserve exact media');
