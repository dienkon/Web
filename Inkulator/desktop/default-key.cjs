"use strict";
const {app}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
module.exports=async()=>{const file=app.isPackaged?path.join(process.resourcesPath,'configuration/default-key.dat'):path.join(__dirname,'../.local/runtime-key');try{const value=Buffer.from((await fs.readFile(file,'utf8')).trim(),'base64').toString('utf8');return value.length>=20&&value.length<512&&!/[\r\n]/.test(value)?value:'';}catch{return '';}};
