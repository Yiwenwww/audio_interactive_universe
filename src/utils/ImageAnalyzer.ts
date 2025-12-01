export class ImageAnalyzer {
    static extractPalette(image: HTMLImageElement, colorCount: number = 5): string[] {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return [];

        // Scale down image for faster processing
        const scale = Math.min(1, 100 / Math.max(image.width, image.height));
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const colors: { [key: string]: number } = {};

        // Sample pixels (step size to improve performance)
        const step = 4 * 5; // Sample every 5th pixel
        for (let i = 0; i < imageData.length; i += step) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];

            if (a < 128) continue; // Skip transparent pixels

            // Quantize colors (round to nearest 16) to group similar colors
            const qr = Math.round(r / 16) * 16;
            const qg = Math.round(g / 16) * 16;
            const qb = Math.round(b / 16) * 16;

            const key = `${qr},${qg},${qb}`;
            colors[key] = (colors[key] || 0) + 1;
        }

        // Sort by frequency
        const sortedColors = Object.entries(colors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, colorCount)
            .map(([key]) => {
                const [r, g, b] = key.split(',').map(Number);
                return `rgb(${r},${g},${b})`;
            });

        // Fill with fallback if not enough colors
        while (sortedColors.length < colorCount) {
            sortedColors.push('rgb(255,255,255)');
        }

        return sortedColors;
    }
}
