"use strict";
const fs=require("node:fs/promises");
// Some redirected Windows profile folders report EXDEV even for sibling files.
// Keep rename on normal volumes, with a flushed copy on those providers.
module.exports=async function replaceFile(source,target){
  try{await fs.rename(source,target);}
  catch(error){
    if(error.code!=="EXDEV")throw error;
    await fs.copyFile(source,target);
    const handle=await fs.open(target,"r+");try{await handle.sync();}finally{await handle.close();}
    await fs.unlink(source);
  }
};
