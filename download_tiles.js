const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function lon2tile(lon, zoom) { return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); }
function lat2tile(lat, zoom) { return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)); }

const zooms = [11, 12, 13, 14];
const bbox = {
    n: 31.65,
    s: 31.15,
    w: 34.1,
    e: 34.6
};

const outputDir = path.join(__dirname, 'tiles');

async function downloadTile(z, x, y) {
    const dir = path.join(outputDir, z.toString(), x.toString());
    fs.mkdirSync(dir, { recursive: true });
    const filepath = path.join(dir, `${y}.png`);
    
    // Using Google Maps tiles which are much more permissive and detailed for Gaza
    const url = `https://mt1.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`;
    
    return new Promise((resolve) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        };
        https.get(url, options, (res) => {
            if (res.statusCode === 200) {
                const file = fs.createWriteStream(filepath);
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                console.log(`Failed: ${url} - Status: ${res.statusCode}`);
                resolve(); 
            }
        }).on('error', (err) => {
            console.log(`Error: ${url}`, err.message);
            resolve();
        });
    });
}

async function main() {
    console.log("Starting map tiles download using Google Maps for Gaza...");
    
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
        console.log("Deleted old blocked OpenStreetMap tiles.");
    }
    
    const tasks = [];
    
    for (let z of zooms) {
        const x_min = lon2tile(bbox.w, z);
        const x_max = lon2tile(bbox.e, z);
        const y_min = lat2tile(bbox.n, z);
        const y_max = lat2tile(bbox.s, z); 
        
        for (let x = x_min; x <= x_max; x++) {
            for (let y = y_min; y <= y_max; y++) {
                tasks.push({z, x, y});
            }
        }
    }
    
    const total = tasks.length;
    console.log(`Total tiles to download: ${total}`);
    
    let downloaded = 0;
    
    for (let i = 0; i < tasks.length; i++) {
        const {z, x, y} = tasks[i];
        await downloadTile(z, x, y);
        downloaded++;
        if (downloaded % 100 === 0) {
            console.log(`Progress: ${downloaded}/${total}`);
        }
        await new Promise(r => setTimeout(r, 15)); // Fast download
    }
    
    console.log("Download complete! Now injecting into sw.js...");
    try {
        execSync('node inject_tiles.js', { stdio: 'inherit' });
    } catch (e) {
        console.log("Failed to run inject_tiles.js", e.message);
    }
}

main();
