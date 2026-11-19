const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/emulators/BUNDLED.json'),'utf8'));
for(const [id,files]of Object.entries(manifest.files))for(const file of files){const bytes=fs.readFileSync(path.join(root,'.local/emulators',id,file.name));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,'Original calculator resource differs: '+id+'/'+file.name);}
for(const [id,files]of Object.entries(manifest.runtimes||{}))for(const file of files){const bytes=fs.readFileSync(path.join(root,'.local/emulators',id,file.name));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,'Calculator runtime differs: '+id+'/'+file.name);}
assert.ok(fs.existsSync(path.join(root,'vendor/ink-on/runtime/assets.js')),'Build the local OCR runtime first');
const policy = fs.readFileSync(path.join(root, 'policies/USAGE.txt'), 'utf8');
// ASCII RTF with Unicode escapes keeps the wizard independent of the Windows ANSI code page.
const paragraphs = policy.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trimEnd().split('\n');
const license = paragraphs.map(line => line.replace(/[\\{}]|[^\x20-\x7e]/g, char => {
  if (char === '\t') return '\\tab ';
  if (/[\\{}]/.test(char)) return '\\' + char;
  const code = char.charCodeAt(0);
  return '\\u' + (code > 32767 ? code - 65536 : code) + '?';
})).join('\\par\r\n');
fs.writeFileSync(path.join(root, '.local/installer-license.rtf'), '{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0{\\fonttbl{\\f0 Segoe UI;}}\\f0\\fs18\r\n' + license + '\r\n}', 'ascii');
console.log('Desktop preflight: both calculators, offline OCR and the generated Unicode license are ready.');
