const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib"),esbuild=require("esbuild");
const root=path.resolve(__dirname,"..");
(async()=>{
 await esbuild.build({stdin:{contents:'export {zipSync,unzipSync} from "fflate";',resolveDir:root},outfile:path.join(root,'desktop/archive.cjs'),bundle:true,platform:'node',format:'cjs',minify:true,legalComments:'eof'});
 const source=fs.readFileSync(path.join(root,'vendor/ink-on/upstream/src/core/inference.worker.ts'),'utf8').replace(/\r\n/g,'\n');
 const extra=`import {gunzipSync} from 'fflate';\nasync function inflate(s){const binary=Uint8Array.from(atob(s),c=>c.charCodeAt(0)),value=gunzipSync(binary);return value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);}\n`;
 const adapted=source.replace('import * as ort from "onnxruntime-web";','import * as ort from "onnxruntime-web/wasm";\n'+extra).replace('const [encBuf, decBuf] = await Promise.all([\n      fetchModel(msg.encoderUrl),\n      fetchModel(msg.decoderUrl),\n    ]);',`const [encBuf,decBuf,wasmBuf]=await Promise.all([inflate(msg.encoderGzip),inflate(msg.decoderGzip),inflate(msg.wasmGzip)]);\n    ort.env.wasm.wasmBinary=wasmBuf;ort.env.wasm.proxy=false;`);
 if(adapted===source||adapted.includes('fetchModel(msg.encoderUrl)'))throw Error('OCR upstream adapter no longer matches');
 const worker=await esbuild.build({stdin:{contents:adapted,resolveDir:root,sourcefile:'inkulator-offline-ocr-worker.ts',loader:'ts'},bundle:true,platform:'browser',format:'iife',minify:true,write:false,legalComments:'eof',target:'es2022',define:{'import.meta.url':JSON.stringify('https://inkulator.invalid/local-ocr/runtime.mjs')},plugins:[{name:'local-buffer-ort',setup(build){build.onLoad({filter:/ort\.wasm\.bundle\.min\.mjs$/},args=>{const code=fs.readFileSync(args.path,'utf8');if(!code.includes('oe=ss()'))throw Error('Pinned ONNX runtime adapter needs review');return {contents:code.replace('oe=ss()','oe=void 0'),loader:'js',resolveDir:path.dirname(args.path)};});}}]});
 const output=path.join(root,'vendor/ink-on/runtime');fs.mkdirSync(output,{recursive:true});
 const b64=file=>zlib.gzipSync(fs.readFileSync(file),{level:9}).toString('base64');
 const assets={encoderGzip:b64(path.join(root,'vendor/ink-on/upstream/public/models/comer/encoder_int8.onnx')),decoderGzip:b64(path.join(root,'vendor/ink-on/upstream/public/models/comer/decoder_int8.onnx')),wasmGzip:b64(path.join(root,'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm')),worker:Buffer.from(worker.outputFiles[0].contents).toString('base64'),vocab:JSON.parse(fs.readFileSync(path.join(root,'vendor/ink-on/upstream/public/models/comer/vocab.json'),'utf8'))};
 fs.writeFileSync(path.join(output,'assets.js'),'/* Local CoMER / ink-on Apache-2.0; ONNX Runtime MIT. No remote downloads. */\nwindow.InkOcrAssets='+JSON.stringify(assets)+';\n');
 await esbuild.build({entryPoints:[path.join(__dirname,'ocr-entry.mjs')],outfile:path.join(output,'core.js'),bundle:true,format:'iife',platform:'browser',minify:true,legalComments:'eof',target:'es2022'});
 fs.copyFileSync(path.join(root,'vendor/ink-on/ONNX-RUNTIME-LICENSE'),path.join(output,'ONNX-RUNTIME-LICENSE'));
 console.log('Built self-contained OCR worker/models/WASM and compressed-document archive support.');
})().catch(e=>{console.error(e);process.exitCode=1;});
