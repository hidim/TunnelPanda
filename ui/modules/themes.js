// ui/modules/themes.js
// Simple theme management for TunnelPanda

class ThemeManager {
  constructor() {
    this.currentTheme = 'default';
  }

  async init() {
    // Apply default theme immediately - no complex color extraction
    this.applyDefaultTheme();
  }

  applyDefaultTheme() {
    // TunnelPanda default theme - dark professional
    const defaultTheme = `
      :root {
        --color-primary: #2d3748;
        --color-secondary: #4a5568;
        --color-accent: #38a169;
        --color-accent2: #3182ce;
        --color-background: #1a202c;
        --color-surface: #2d3748;
        --color-text: #f7fafc;
        --color-text-secondary: #a0aec0;
        --color-border: #4a5568;
        --color-success: #38a169;
        --color-warning: #d69e2e;
        --color-error: #e53e3e;
        --color-info: #3182ce;
      }
    `;

    this.applyTheme(defaultTheme);
  }

  applyTheme(css) {
    const existingStyle = document.getElementById('app-theme');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'app-theme';
    style.textContent = css;
    document.head.appendChild(style);
  }
}

// Export for use in main app
window.ThemeManager = ThemeManager;
