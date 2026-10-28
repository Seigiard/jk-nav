import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: {
    name: 'Vim-Style Page Navigation',
    version: '1.0.0',
    description: 'Navigate pages using vim-style keyboard shortcuts (j/k for scrolling, gg/G for top/bottom, / for link hints)',
    icons: {
      16: 'icons/16x16.png',
      32: 'icons/32x32.png',
      48: 'icons/48x48.png',
      128: 'icons/128x128.png',
    },
    browser_specific_settings: {
      gecko: {
        id: 'jk-nav@seigiard.github.io',
      },
    },
  },
});
