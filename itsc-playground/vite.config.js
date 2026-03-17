import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const repoName = process.env.GH_PAGES_REPO || 'normal_visu'

  return {
    base: command === 'build' ? `/${repoName}/` : '/',
    plugins: [react()],
  }
})
