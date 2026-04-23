import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'calm' | 'midnight' | 'forest' | 'lavender' | 'sunrise'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'calm',
      setTheme: (theme: Theme) => {
        set({ theme })
        if (theme === 'calm') {
          document.documentElement.removeAttribute('data-theme')
        } else {
          document.documentElement.setAttribute('data-theme', theme)
        }
      },
    }),
    { name: 'mindtrack-theme' }
  )
)

export default useThemeStore
