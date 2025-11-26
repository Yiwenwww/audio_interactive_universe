import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    // For GitHub Pages deployment at username.github.io/repository-name
    // Change '/audio_universe/' to '/' if deploying to username.github.io (user/org page)
    base: '/audio_interactive_universe/',
})
