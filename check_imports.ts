import fs from 'fs';
import path from 'path';

function processDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('isModelInCategory') && !content.includes('isModelInCategory } from')) {
                console.log(fullPath);
            }
        }
    }
}

processDir('components');
processDir('pages');
