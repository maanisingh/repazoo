import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HelpCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  article_count?: string;
  total_views?: string;
}

export interface HelpArticle {
  id: number;
  category_id: number;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  author_id: string | null;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  display_order: number;
  is_published: boolean;
  featured: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_slug?: string;
}

interface HelpCenterState {
  // Dialog state
  isOpen: boolean;
  openHelpCenter: () => void;
  closeHelpCenter: () => void;
  toggleHelpCenter: () => void;

  // Navigation state
  currentView: 'home' | 'category' | 'article' | 'search';
  currentCategorySlug: string | null;
  currentArticleSlug: string | null;
  searchQuery: string;

  // Navigation actions
  navigateToHome: () => void;
  navigateToCategory: (slug: string) => void;
  navigateToArticle: (slug: string) => void;
  navigateToSearch: (query: string) => void;
  setSearchQuery: (query: string) => void;
  goBack: () => void;

  // History for breadcrumbs and back navigation
  history: Array<{
    view: 'home' | 'category' | 'article' | 'search';
    categorySlug?: string;
    articleSlug?: string;
    searchQuery?: string;
  }>;

  // Session ID for analytics
  sessionId: string;
  generateSessionId: () => void;

  // Recently viewed articles (for quick access)
  recentArticles: string[]; // Array of article slugs
  addRecentArticle: (slug: string) => void;
}

// Generate a random session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export const useHelpCenterStore = create<HelpCenterState>()(
  persist(
    (set, get) => ({
      // Dialog state
      isOpen: false,
      openHelpCenter: () => set({ isOpen: true }),
      closeHelpCenter: () => set({ isOpen: false }),
      toggleHelpCenter: () => set((state) => ({ isOpen: !state.isOpen })),

      // Navigation state
      currentView: 'home',
      currentCategorySlug: null,
      currentArticleSlug: null,
      searchQuery: '',

      // Navigation actions
      navigateToHome: () => {
        const state = get();
        set({
          currentView: 'home',
          currentCategorySlug: null,
          currentArticleSlug: null,
          searchQuery: '',
          history: [...state.history, { view: 'home' }],
        });
      },

      navigateToCategory: (slug: string) => {
        const state = get();
        set({
          currentView: 'category',
          currentCategorySlug: slug,
          currentArticleSlug: null,
          searchQuery: '',
          history: [...state.history, { view: 'category', categorySlug: slug }],
        });
      },

      navigateToArticle: (slug: string) => {
        const state = get();
        set({
          currentView: 'article',
          currentArticleSlug: slug,
          searchQuery: '',
          history: [...state.history, { view: 'article', articleSlug: slug }],
        });
        state.addRecentArticle(slug);
      },

      navigateToSearch: (query: string) => {
        const state = get();
        set({
          currentView: 'search',
          searchQuery: query,
          currentCategorySlug: null,
          currentArticleSlug: null,
          history: [...state.history, { view: 'search', searchQuery: query }],
        });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      goBack: () => {
        const state = get();
        if (state.history.length > 1) {
          const newHistory = [...state.history];
          newHistory.pop(); // Remove current
          const previous = newHistory[newHistory.length - 1];

          set({
            currentView: previous.view,
            currentCategorySlug: previous.categorySlug || null,
            currentArticleSlug: previous.articleSlug || null,
            searchQuery: previous.searchQuery || '',
            history: newHistory,
          });
        } else {
          // If no history, go to home
          set({
            currentView: 'home',
            currentCategorySlug: null,
            currentArticleSlug: null,
            searchQuery: '',
            history: [{ view: 'home' }],
          });
        }
      },

      // History
      history: [{ view: 'home' }],

      // Session management
      sessionId: generateSessionId(),
      generateSessionId: () => set({ sessionId: generateSessionId() }),

      // Recently viewed articles
      recentArticles: [],
      addRecentArticle: (slug: string) => {
        const state = get();
        const recent = [slug, ...state.recentArticles.filter((s) => s !== slug)].slice(0, 5);
        set({ recentArticles: recent });
      },
    }),
    {
      name: 'help-center-storage',
      partialize: (state) => ({
        // Only persist these fields
        sessionId: state.sessionId,
        recentArticles: state.recentArticles,
      }),
    }
  )
);
