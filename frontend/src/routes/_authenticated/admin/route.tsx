import { createFileRoute, Outlet, Link, redirect } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { cn } from '@/lib/utils'
import { Settings, Database, Activity, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()

    if (!auth.isAdmin()) {
      toast.error('Admin access required')
      throw redirect({ to: '/', replace: true })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold tracking-tight'>Admin Panel</h1>
          <p className='text-muted-foreground mt-1'>
            System monitoring and management
          </p>
        </div>

        <div className='mb-6 flex gap-2 border-b'>
          <NavLink to='/admin/queues' icon={Activity}>
            Queues
          </NavLink>
          <NavLink to='/admin/users' icon={Users}>
            Users
          </NavLink>
          <NavLink to='/admin/system' icon={Settings}>
            System
          </NavLink>
          <NavLink to='/admin/database' icon={Database}>
            Database
          </NavLink>
        </div>

        <div className='pb-8'>
          <Outlet />
        </div>
      </Main>
    </>
  )
}

interface NavLinkProps {
  to: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

function NavLink({ to, icon: Icon, children }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors',
        'hover:text-foreground',
        '[&.active]:border-primary [&.active]:text-foreground',
        'text-muted-foreground'
      )}
      activeProps={{
        className: 'active',
      }}
    >
      <Icon className='h-4 w-4' />
      {children}
    </Link>
  )
}
