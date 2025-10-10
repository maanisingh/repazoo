import {
  Construction,
  LayoutDashboard,
  Monitor,
  HelpCircle,
  Settings,
  Wrench,
  MessagesSquare,
  ShieldCheck,
  AudioWaveform,
  ShieldAlert,
  MessageCircle,
} from 'lucide-react'
import { type SidebarData } from '../types'
import { useAuthStore } from '@/stores/auth-store'

export function getSidebarData(): SidebarData {
  const { auth } = useAuthStore.getState()
  const user = auth.user

  // Extract name from email if no name is set
  const userName = user?.email?.split('@')[0] || 'User'
  const userEmail = user?.email || 'user@example.com'

  const baseNavGroups = [
    {
      title: 'Reputation Analysis',
      items: [
        {
          title: 'Overview',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'All Scans',
          url: '/scans',
          icon: Monitor,
        },
        {
          title: 'New Scan',
          url: '/scans/new',
          icon: Construction,
        },
        {
          title: 'Mentions',
          url: '/mentions',
          icon: MessageCircle,
        },
      ],
    },
    {
      title: 'AI & Workflows',
      items: [
        {
          title: 'AI Chat',
          url: '/ai-chat',
          icon: MessagesSquare,
        },
        {
          title: 'Workflows',
          url: '/workflows',
          icon: Wrench,
        },
        {
          title: 'AI Models',
          url: '/models',
          icon: AudioWaveform,
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          title: 'System Health',
          url: '/health',
          icon: Monitor,
        },
        {
          title: 'Settings',
          url: '/settings',
          icon: Settings,
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ]

  // Add admin section if user is admin
  if (auth.isAdmin()) {
    baseNavGroups.push({
      title: 'Administration',
      items: [
        {
          title: 'Admin Panel',
          url: '/admin',
          icon: ShieldAlert,
        },
      ],
    })
  }

  return {
    user: {
      name: userName,
      email: userEmail,
      avatar: '/avatars/shadcn.jpg',
    },
    teams: [
      {
        name: 'Repazoo',
        logo: ShieldCheck,
        plan: 'AI-Powered SaaS',
      },
    ],
    navGroups: baseNavGroups,
  }
}

// Keep the old export for backward compatibility during transition
export const sidebarData: SidebarData = {
  user: {
    name: 'User',
    email: 'user@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Repazoo',
      logo: ShieldCheck,
      plan: 'AI-Powered SaaS',
    },
  ],
  navGroups: [
    {
      title: 'Reputation Analysis',
      items: [
        {
          title: 'Overview',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'All Scans',
          url: '/scans',
          icon: Monitor,
        },
        {
          title: 'New Scan',
          url: '/scans/new',
          icon: Construction,
        },
        {
          title: 'Mentions',
          url: '/mentions',
          icon: MessageCircle,
        },
      ],
    },
    {
      title: 'AI & Workflows',
      items: [
        {
          title: 'AI Chat',
          url: '/ai-chat',
          icon: MessagesSquare,
        },
        {
          title: 'Workflows',
          url: '/workflows',
          icon: Wrench,
        },
        {
          title: 'AI Models',
          url: '/models',
          icon: AudioWaveform,
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          title: 'System Health',
          url: '/health',
          icon: Monitor,
        },
        {
          title: 'Settings',
          url: '/settings',
          icon: Settings,
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
