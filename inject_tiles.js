const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const res = path.resolve(dir, file);
    if (fs.statSync(res).isDirectory()) {
      getFiles(res, files);
    } else {
      files.push(res);
    }
  }
  return files;
}

const tilesDir = path.join(__dirname, 'tiles');
const allTiles = getFiles(tilesDir);

const tileUrls = allTiles.map(file => {
  return './tiles/' + file.split(path.sep + 'tiles' + path.sep)[1].replace(/\\/g, '/');
});

const swPath = path.join(__dirname, 'sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');

const regex = /const ASSETS_TO_CACHE = \[([\s\S]*?)\];/;
const match = swContent.match(regex);

if (match) {
  let existingUrlsStr = match[1];
  let existingUrls = existingUrlsStr.split(',').map(s => s.trim().replace(/'/g, '').replace(/"/g, '')).filter(s => s.length > 0);
  existingUrls = existingUrls.filter(u => !u.includes('./tiles/'));
  
  const finalUrls = [...existingUrls, ...tileUrls];
  const newArrayStr = `const ASSETS_TO_CACHE = [\n  '${finalUrls.join("',\n  '")}'\n];`;
  
  swContent = swContent.replace(regex, newArrayStr);
  swContent = swContent.replace(/const CACHE_NAME = 'gaza-rescue-v(\d+)';/, (m, p1) => {
      return `const CACHE_NAME = 'gaza-rescue-v${parseInt(p1) + 1}';`;
  });
  
  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`Injected ${tileUrls.length} tiles into sw.js and updated cache version.`);
} else {
    console.log("Could not find ASSETS_TO_CACHE array in sw.js");
}
