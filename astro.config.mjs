import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// GitHub Pages 배포용 설정.
// 1) <username>.github.io 레포에 올릴 경우: base 를 '/' 로 두세요.
// 2) <username>.github.io/breaking-point 로 올릴 경우: base 를 '/breaking-point' 로 두세요.
const SITE = 'https://rayleighko.github.io';
const BASE = '/breaking-point';

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [react(), mdx()],
  vite: { plugins: [tailwindcss()] },
  markdown: { shikiConfig: { theme: 'github-dark-dimmed' } },
});
