export interface ImageAnalysisResult {
    palette: string[];
    brightness: number;
    contrast: number;
    complexity: number;
    warmth: number;
}

export class ImageAnalyzer {
    static analyze(image: HTMLImageElement, colorCount: number = 5): ImageAnalysisResult {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return { palette: [], brightness: 0, contrast: 0, complexity: 0, warmth: 0 };

        // Scale down image for faster processing
        const scale = Math.min(1, 100 / Math.max(image.width, image.height));
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const colors: { [key: string]: number } = {};

        let totalLuminance = 0;
        let totalR = 0, totalG = 0, totalB = 0;
        const luminances: number[] = [];
        let edgeScore = 0;

        // Sample pixels (step size to improve performance)
        const step = 4 * 2; // Sample every 2nd pixel for better stats

        for (let i = 0; i < imageData.length; i += step) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];

            if (a < 128) continue; // Skip transparent pixels

            // Palette Quantization
            const qr = Math.round(r / 16) * 16;
            const qg = Math.round(g / 16) * 16;
            const qb = Math.round(b / 16) * 16;
            const key = `${qr},${qg},${qb}`;
            colors[key] = (colors[key] || 0) + 1;

            // Metrics Calculation
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            totalLuminance += lum;
            luminances.push(lum);
            totalR += r; totalG += g; totalB += b;

            // Simple Edge Detection (Compare with next pixel)
            if (i + 4 < imageData.length) {
                const r2 = imageData[i + 4];
                const g2 = imageData[i + 5];
                const b2 = imageData[i + 6];
                const diff = Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(b - b2);
                if (diff > 30) edgeScore++;
            }
        }

        const pixelCount = luminances.length;
        const avgLuminance = totalLuminance / pixelCount;

        // Contrast (Standard Deviation of Luminance)
        let variance = 0;
        for (const lum of luminances) {
            variance += Math.pow(lum - avgLuminance, 2);
        }
        const contrast = Math.sqrt(variance / pixelCount);

        // Warmth ((R + Y) / (B + C)) -> Simplified: (R + G) / (B + G) roughly
        // Better: (R - B) normalized
        const avgR = totalR / pixelCount;
        const avgB = totalB / pixelCount;
        const warmth = (avgR - avgB + 255) / 510; // 0 (Cold) to 1 (Warm)

        // Complexity (Edge density)
        const complexity = Math.min(1, (edgeScore * step) / (pixelCount * 4)); // Normalize

        // Sort Palette
        const sortedColors = Object.entries(colors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, colorCount)
            .map(([key]) => {
                const [r, g, b] = key.split(',').map(Number);
                return `rgb(${r},${g},${b})`;
            });

        while (sortedColors.length < colorCount) {
            sortedColors.push('rgb(255,255,255)');
        }

        return {
            palette: sortedColors,
            brightness: avgLuminance,
            contrast: contrast * 2, // Boost contrast range
            complexity: complexity,
            warmth: warmth
        };
    }

    // Keep old method for backward compatibility if needed, or redirect
    static extractPalette(image: HTMLImageElement, colorCount: number = 5): string[] {
        return this.analyze(image, colorCount).palette;
    }
}
