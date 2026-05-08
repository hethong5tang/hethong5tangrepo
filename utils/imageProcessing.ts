
function numberToUint8Array(num: number) {
    const arr = new Uint8Array(4);
    arr[0] = (num >> 24) & 0xff;
    arr[1] = (num >> 16) & 0xff;
    arr[2] = (num >> 8) & 0xff;
    arr[3] = num & 0xff;
    return arr;
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
}

function calculateCrc(bytes: Uint8Array): Uint8Array {
    let crc = -1;
    for (let i = 0; i < bytes.length; i++) {
        crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    crc = crc ^ -1;
    return numberToUint8Array(crc);
}

export async function setDpi(base64Image: string, dpi: number): Promise<string> {
    const mimeType = base64Image.substring(5, base64Image.indexOf(';'));
    if (mimeType !== 'image/png') {
        return base64Image;
    }
    
    const base64Data = base64Image.substring(base64Image.indexOf(',') + 1);
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    let offset = pngSignature.length;
    let ihdrEnd = 0;

    while (offset < bytes.length) {
        const dataView = new DataView(bytes.buffer);
        const length = dataView.getUint32(offset);
        const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));

        if (type === 'IHDR') {
            ihdrEnd = offset + 8 + length + 4;
            break;
        }
        offset += 12 + length;
    }
    
    if (ihdrEnd === 0) return base64Image;

    const pixelsPerMeter = Math.round(dpi / 0.0254);
    
    const physChunkData = new Uint8Array(9);
    const dataView = new DataView(physChunkData.buffer);
    dataView.setUint32(0, pixelsPerMeter);
    dataView.setUint32(4, pixelsPerMeter);
    dataView.setUint8(8, 1);

    const physChunkType = new TextEncoder().encode('pHYs');
    const chunkToCrc = new Uint8Array(physChunkType.length + physChunkData.length);
    chunkToCrc.set(physChunkType);
    chunkToCrc.set(physChunkData, physChunkType.length);
    
    const crc = calculateCrc(chunkToCrc);
    const physChunkLength = numberToUint8Array(physChunkData.length);

    const fullPhysChunk = new Uint8Array(4 + 4 + physChunkData.length + 4);
    fullPhysChunk.set(physChunkLength);
    fullPhysChunk.set(physChunkType, 4);
    fullPhysChunk.set(physChunkData, 8);
    fullPhysChunk.set(crc, 17);

    const newBytes = new Uint8Array(bytes.length + fullPhysChunk.length);
    newBytes.set(bytes.subarray(0, ihdrEnd));
    newBytes.set(fullPhysChunk, ihdrEnd);
    newBytes.set(bytes.subarray(ihdrEnd), ihdrEnd + fullPhysChunk.length);

    let newBase64Data = '';
    for (let i = 0; i < newBytes.length; i++) {
        newBase64Data += String.fromCharCode(newBytes[i]);
    }
    
    return `data:image/png;base64,${btoa(newBase64Data)}`;
}

export async function ensureSupportedImageFormat(base64Image: string): Promise<string> {
    const mimeType = base64Image.substring(5, base64Image.indexOf(';'));
    // Gemini supports: image/png, image/jpeg, image/webp, image/heic, image/heif
    // However, for best compatibility and editing (like canvas drawing), converting to PNG is safest.
    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    
    if (supportedTypes.includes(mimeType)) {
        return base64Image;
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                // Convert to PNG
                resolve(canvas.toDataURL('image/png'));
            } else {
                resolve(base64Image);
            }
        };
        img.onerror = () => resolve(base64Image);
        img.src = base64Image;
    });
}

// Helper to remove green screen client-side (Shared Utility)
export const processGreenScreenRemoval = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Image);
                return;
            }
            
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Standard Tolerance for auto-removal
            const tolerance = 70; 
            const threshold = 100 - tolerance; 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                const maxRB = Math.max(r, b);
                
                // Detect Green Dominance
                if (g > maxRB) {
                    const greenDominance = g - maxRB;

                    if (greenDominance > threshold) {
                         // Transparent
                         data[i + 3] = 0; 
                    } else {
                         // Despill
                         data[i + 1] = maxRB; 
                    }
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => reject(e);
        img.src = base64Image;
    });
};
