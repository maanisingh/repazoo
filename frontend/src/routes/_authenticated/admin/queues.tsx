import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Loader2, RefreshCw, AlertCircle, Pause } from 'lucide-react'
import { adminClient } from '@/lib/api/admin-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/admin/queues')({
  component: QueuesPage,
})

function QueuesPage() {
  const queryClient = useQueryClient()
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'>('waiting')

  const { data: queueStats, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'queues'],
    queryFn: () => adminClient.getQueueStats(),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['admin', 'queue-jobs', selectedQueue, selectedStatus],
    queryFn: () => selectedQueue ? adminClient.getQueueJobs(selectedQueue, selectedStatus) : null,
    enabled: !!selectedQueue,
  })

  const retryMutation = useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: string; jobId: string }) =>
      adminClient.retryFailedJob(queueName, jobId),
    onSuccess: () => {
      toast.success('Job has been added back to the queue')
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'queues'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <AlertCircle className='h-12 w-12 text-destructive mb-4' />
        <p className='text-lg font-medium'>Failed to load queue stats</p>
        <p className='text-sm text-muted-foreground mt-2'>
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <Button onClick={() => refetch()} className='mt-4'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>Queue Monitoring</h2>
        <Button onClick={() => refetch()} size='sm' variant='outline'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Refresh
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {queueStats?.map((queue) => (
          <Card
            key={queue.name}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedQueue === queue.name ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedQueue(queue.name)}
          >
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium flex items-center justify-between'>
                {queue.name}
                {queue.paused && (
                  <Badge variant='secondary'>
                    <Pause className='h-3 w-3 mr-1' />
                    Paused
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>Waiting</span>
                <Badge variant='outline'>{queue.waiting}</Badge>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>Active</span>
                <Badge variant='secondary'>{queue.active}</Badge>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>Completed</span>
                <Badge variant='default' className='bg-green-500'>{queue.completed}</Badge>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>Failed</span>
                <Badge variant='destructive'>{queue.failed}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedQueue && (
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Jobs: {selectedQueue}</CardTitle>
                <CardDescription>View and manage queue jobs</CardDescription>
              </div>
              <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='waiting'>Waiting</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                  <SelectItem value='failed'>Failed</SelectItem>
                  <SelectItem value='delayed'>Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
              </div>
            ) : jobs && jobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className='font-mono text-xs'>{job.id}</TableCell>
                      <TableCell>{job.name}</TableCell>
                      <TableCell>{job.attemptsMade}</TableCell>
                      <TableCell>
                        {new Date(job.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {selectedStatus === 'failed' && (
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() =>
                              retryMutation.mutate({
                                queueName: selectedQueue,
                                jobId: job.id!,
                              })
                            }
                            disabled={retryMutation.isPending}
                          >
                            <RefreshCw className='mr-1 h-3 w-3' />
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                No {selectedStatus} jobs found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
