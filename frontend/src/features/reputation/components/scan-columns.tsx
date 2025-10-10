import { type ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Scan } from '@/lib/api/n8n-client'
import { RiskGauge } from './risk-gauge'

const getRiskBadgeVariant = (riskLevel: string) => {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      return 'default'
    case 'medium':
      return 'secondary'
    case 'high':
      return 'destructive'
    default:
      return 'outline'
  }
}

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'default'
    case 'processing':
      return 'secondary'
    case 'failed':
      return 'destructive'
    case 'pending':
      return 'outline'
    default:
      return 'outline'
  }
}

export const scanColumns: ColumnDef<Scan>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'twitter_handle',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Twitter Handle' />
    ),
    cell: ({ row }) => {
      return (
        <div className='flex items-center space-x-2'>
          <span className='font-medium'>@{row.getValue('twitter_handle')}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge variant={getStatusBadgeVariant(status)}>
          {status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'summary.overall_score',
    id: 'risk_score',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Risk Score' />
    ),
    cell: ({ row }) => {
      const scan = row.original
      const score = scan.summary?.overall_score ?? scan.analysis_result?.overall_score

      if (scan.status !== 'completed' || score === undefined) {
        return <span className='text-muted-foreground text-sm'>N/A</span>
      }

      return <RiskGauge score={score} size='sm' showLabel={false} />
    },
    sortingFn: (rowA, rowB) => {
      const scoreA = rowA.original.summary?.overall_score ?? rowA.original.analysis_result?.overall_score ?? 0
      const scoreB = rowB.original.summary?.overall_score ?? rowB.original.analysis_result?.overall_score ?? 0
      return scoreA - scoreB
    },
  },
  {
    accessorKey: 'summary.risk_level',
    id: 'risk_level',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Risk Level' />
    ),
    cell: ({ row }) => {
      const scan = row.original
      const riskLevel = scan.summary?.risk_level ?? scan.analysis_result?.risk_level

      if (scan.status !== 'completed' || !riskLevel) {
        return <span className='text-muted-foreground text-sm'>N/A</span>
      }

      return (
        <Badge variant={getRiskBadgeVariant(riskLevel)}>
          {riskLevel}
        </Badge>
      )
    },
    filterFn: (row, _id, value) => {
      const riskLevel = row.original.summary?.risk_level ?? row.original.analysis_result?.risk_level
      return value.includes(riskLevel)
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Scan Date' />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'))
      return (
        <div className='flex flex-col'>
          <span className='text-sm'>{format(date, 'MMM d, yyyy')}</span>
          <span className='text-xs text-muted-foreground'>{format(date, 'HH:mm')}</span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const scan = row.original
      return (
        <Button asChild variant='ghost' size='sm'>
          <Link to='/scans/$scanId' params={{ scanId: scan.scan_id }}>
            View <ExternalLink className='ml-2 h-3 w-3' />
          </Link>
        </Button>
      )
    },
  },
]
