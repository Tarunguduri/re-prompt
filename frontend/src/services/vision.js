/**
 * vision.js — Pure client-side image analysis using Canvas API.
 * Extracts: dominant colors, brightness/mood, aspect ratio, color temperature.
 * No external models, no API keys, no downloads. Instant.
 */

/**
 * Analyze an image File → structured description useful for prompt generation.
 * @param {File} file
 * @returns {Promise<string>} — human-readable description of the image
 */
export async function analyzeImage(file) {
    const img = await loadImage(file);
    const { width, height } = img;

    // Draw to canvas for pixel access
    const canvas = document.createElement('canvas');
    const SIZE = 200; // downscale for speed
    const scale = Math.min(SIZE / width, SIZE / height);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // ── Extract features ──────────────────────────────────────────────
    const colors = extractDominantColors(pixels, 5);
    const brightness = calcBrightness(pixels);
    const saturation = calcSaturation(pixels);
    const contrast = calcContrast(pixels);
    const warmth = calcWarmth(pixels);
    const aspect = width / height;

    // ── Build description ─────────────────────────────────────────────
    const parts = [];

    // Mood from brightness
    if (brightness < 60) parts.push('dark, moody atmosphere');
    else if (brightness < 100) parts.push('low-key, dramatic lighting');
    else if (brightness < 160) parts.push('balanced natural lighting');
    else if (brightness < 210) parts.push('bright, airy atmosphere');
    else parts.push('high-key, ethereal brightness');

    // Color character
    if (saturation > 0.45) parts.push('rich vibrant colors');
    else if (saturation > 0.25) parts.push('moderate natural color palette');
    else if (saturation > 0.1) parts.push('muted desaturated tones');
    else parts.push('near monochromatic palette');

    // Temperature
    if (warmth > 0.6) parts.push('warm golden tones');
    else if (warmth > 0.45) parts.push('neutral color temperature');
    else parts.push('cool blue-shifted tones');

    // Contrast
    if (contrast > 80) parts.push('high contrast');
    else if (contrast > 40) parts.push('medium contrast');
    else parts.push('soft low contrast');

    // Dominant color names
    const colorNames = colors.slice(0, 3).map(c => describeColor(c));
    parts.push(`dominant colors: ${colorNames.join(', ')}`);

    // Aspect ratio
    if (aspect > 1.6) parts.push('wide cinematic composition');
    else if (aspect > 1.2) parts.push('landscape orientation');
    else if (aspect > 0.8) parts.push('square composition');
    else if (aspect > 0.6) parts.push('portrait orientation');
    else parts.push('tall vertical composition');

    // Resolution hint
    if (width >= 3000 || height >= 3000) parts.push('ultra high resolution source');
    else if (width >= 1500 || height >= 1500) parts.push('high resolution source');

    return `Image analysis: ${parts.join(', ')}. Palette: ${colors.slice(0, 5).map(c => rgbToHex(c)).join(' ')}.`;
}

// ── Color Extraction (simplified k-means with quantization) ─────────────

function extractDominantColors(pixels, count) {
    // Quantize to reduce unique colors
    const colorMap = {};
    for (let i = 0; i < pixels.length; i += 4) {
        const r = Math.round(pixels[i] / 16) * 16;
        const g = Math.round(pixels[i + 1] / 16) * 16;
        const b = Math.round(pixels[i + 2] / 16) * 16;
        const a = pixels[i + 3];
        if (a < 128) continue; // skip transparent
        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
    }

    // Sort by frequency, take top N
    return Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return { r, g, b };
        });
}

function calcBrightness(pixels) {
    let sum = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        sum += pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
        count++;
    }
    return sum / count;
}

function calcSaturation(pixels) {
    let sum = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 16) { // sample every 4th pixel for speed
        const r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max !== min) {
            const s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
            sum += s;
        }
        count++;
    }
    return sum / count;
}

function calcContrast(pixels) {
    let min = 255, max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
        if (lum < min) min = lum;
        if (lum > max) max = lum;
    }
    return max - min;
}

function calcWarmth(pixels) {
    let warm = 0, cool = 0;
    for (let i = 0; i < pixels.length; i += 16) {
        warm += pixels[i];          // red channel
        cool += pixels[i + 2];     // blue channel
    }
    return warm / (warm + cool + 1);
}

// ── Color naming ────────────────────────────────────────────────────────

function describeColor({ r, g, b }) {
    const h = rgbToHue(r, g, b);
    const l = (r * 0.299 + g * 0.587 + b * 0.114);
    const s = Math.max(r, g, b) - Math.min(r, g, b);

    if (s < 30) {
        if (l < 40) return 'black';
        if (l < 100) return 'dark gray';
        if (l < 180) return 'gray';
        if (l < 230) return 'light gray';
        return 'white';
    }

    let name;
    if (h < 15) name = 'red';
    else if (h < 40) name = 'orange';
    else if (h < 65) name = 'yellow';
    else if (h < 80) name = 'yellow-green';
    else if (h < 150) name = 'green';
    else if (h < 190) name = 'cyan';
    else if (h < 260) name = 'blue';
    else if (h < 290) name = 'purple';
    else if (h < 330) name = 'magenta';
    else name = 'red';

    if (l < 60) return `dark ${name}`;
    if (l > 200) return `light ${name}`;
    return name;
}

function rgbToHue(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === min) return 0;
    const d = max - min;
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else h = ((r - g) / d + 4);
    return h * 60;
}

function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── Helpers ─────────────────────────────────────────────────────────────

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}
