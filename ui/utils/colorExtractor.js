// ui/utils/colorExtractor.js
// Pure JavaScript color extraction utility for Electron

const fs = require('fs');
const path = require('path');

class ColorExtractor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Extract dominant colors from an image file
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} Color palette object
   */
  async extractColors(imagePath) {
    try {
      // For now, we'll return a predefined color scheme based on TunnelPanda branding
      // This can be enhanced later with actual image processing
      
      // Check if the image file exists
      if (!fs.existsSync(imagePath)) {
        console.warn(`Image not found: ${imagePath}, using default colors`);
        return this.getDefaultColors();
      }

      // For TunnelPanda, we'll use a professional dark theme with accent colors
      // This can be enhanced to actually read the image in the future
      return this.getTunnelPandaColors();
    } catch (error) {
      console.error('Error extracting colors:', error);
      return this.getDefaultColors();
    }
  }

  /**
   * Get TunnelPanda-themed color palette
   */
  getTunnelPandaColors() {
    return {
      primary: '#2d3748',      // Dark slate
      secondary: '#4a5568',    // Medium slate
      accent: '#38a169',       // Green accent
      accent2: '#3182ce',      // Blue accent
      background: '#1a202c',   // Very dark
      surface: '#2d3748',      // Card background
      text: '#f7fafc',         // Light text
      textSecondary: '#a0aec0', // Secondary text
      border: '#4a5568',       // Border color
      success: '#38a169',      // Success green
      warning: '#d69e2e',      // Warning amber
      error: '#e53e3e',        // Error red
      info: '#3182ce'          // Info blue
    };
  }

  /**
   * Get default fallback colors
   */
  getDefaultColors() {
    return {
      primary: '#1e293b',
      secondary: '#334155',
      accent: '#0ea5e9',
      accent2: '#06b6d4',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      border: '#334155',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };
  }

  /**
   * Convert hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Convert RGB to HSL
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /**
   * Generate CSS custom properties from color palette
   */
  generateCSSVariables(colors) {
    let css = ':root {\n';
    
    Object.entries(colors).forEach(([name, value]) => {
      css += `  --color-${name}: ${value};\n`;
      
      // Add RGB values for transparency effects
      const rgb = this.hexToRgb(value);
      if (rgb) {
        css += `  --color-${name}-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};\n`;
      }
    });
    
    css += '}\n';
    return css;
  }

  /**
   * Apply color scheme to the UI
   */
  async applyColorScheme(imagePath = null) {
    const iconPath = imagePath || path.join(__dirname, '..', 'assets', 'app.png');
    const fallbackPath = path.join(__dirname, '..', 'assets', 'icon.png');
    
    // Try app.png first, then icon.png
    let colors;
    if (fs.existsSync(iconPath)) {
      colors = await this.extractColors(iconPath);
    } else if (fs.existsSync(fallbackPath)) {
      colors = await this.extractColors(fallbackPath);
    } else {
      colors = this.getDefaultColors();
    }

    return {
      colors,
      css: this.generateCSSVariables(colors)
    };
  }
}

module.exports = ColorExtractor;
