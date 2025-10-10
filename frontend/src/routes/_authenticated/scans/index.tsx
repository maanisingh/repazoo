import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import z from 'zod'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { n8nClient } from '@/lib/api/n8n-client'
import { ScanTable } from '@/features/reputation/components'

const scanSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z.array(z.string()).optional().catch([]),
  risk_level: z.array(z.string()).optional().catch([]),
  filter: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/scans/')({
  validateSearch: scanSearchSchema,
  component: ScansPage,
})

function ScansPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['scans'],
    queryFn: () => n8nClient.getAllScans(),
  })

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Reputation Scans</h1>
            <p className='text-muted-foreground mt-1'>
              View and manage all Twitter reputation scans
            </p>
          </div>
          <Button asChild>
            <Link to='/scans/new'>
              <Plus className='mr-2 h-4 w-4' />
              New Scan
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <p className='text-destructive text-lg font-medium'>Failed to load scans</p>
            <p className='text-muted-foreground text-sm mt-2'>
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        ) : (
          <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
            <ScanTable data={data?.scans ?? []} />
          </div>
        )}
      </Main>
    </>
  )
}
