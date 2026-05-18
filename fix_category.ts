import fs from 'fs';
import path from 'path';

function processDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            if (content.includes('m.category === ')) {
                if (!content.includes('isModelInCategory')) {
                    content = content.replace(/import \{ ALL_GEMINI_MODELS \} from '([^']+constants)';/, "import { ALL_GEMINI_MODELS, isModelInCategory } from '$1';");
                }
                
                content = content.replace(/m\.category === '([^']+)'/g, "isModelInCategory(m, '$1')");
                content = content.replace(/m\.category === ([a-zA-Z0-9_]+)/g, "isModelInCategory(m, $1)");
                
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir('components/tools');
processDir('pages/admin');
console.log('Done replacement');
