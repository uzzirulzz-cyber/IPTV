'use client'

import { create } from 'zustand'

export type View = 'home' | 'channels' | 'favorites' | 'player' | 'admin'

export interface ActiveChannel {
  channelId: string
  channelName: string
  channelLogo?: string | null
  category?: string | null
  streamUrl?: string | null
}

interface AppState {
  view: View
  activeChannel: ActiveChannel | null
  selectedCategory: string | null
  searchQuery: string
  setView: (view: View) => void
  openChannel: (channel: ActiveChannel) => void
  setSelectedCategory: (categoryId: string | null) => void
  setSearchQuery: (q: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'home',
  activeChannel: null,
  selectedCategory: null,
  searchQuery: '',
  setView: (view) => set({ view }),
  openChannel: (channel) => set({ activeChannel: channel, view: 'player' }),
  setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
