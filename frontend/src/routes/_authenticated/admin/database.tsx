import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Loader2, Play, AlertCircle, Table as TableIcon } from 'lucide-react'
import { adminClient } from '@/lib/api/admin-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/admin/database')({
  component: DatabasePage,
})

function DatabasePage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [queryMode, setQueryMode] = useState(false)
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;')
  const pageSize = 50

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['admin', 'tables'],
    queryFn: () => adminClient.getDatabaseTables(),
  })

  const { data: tableData, isLoading: dataLoading } = useQuery({
    queryKey: ['admin', 'table-data', selectedTable, page],
    queryFn: () =>
      selectedTable ? adminClient.getTableData(selectedTable, pageSize, page * pageSize) : null,
    enabled: !!selectedTable && !queryMode,
  })

  const queryMutation = useMutation({
    mutationFn: (query: string) => adminClient.executeQuery(query),
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleExecuteQuery = () => {
    if (!sqlQuery.trim()) {
      toast.error('Please enter a SQL query')
      return
    }
    queryMutation.mutate(sqlQuery)
  }

  if (tablesLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  const totalPages = tableData ? Math.ceil(tableData.total / pageSize) : 0

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>Database Viewer</h2>
        <div className='flex gap-2'>
          <Button
            variant={!queryMode ? 'default' : 'outline'}
            size='sm'
            onClick={() => {
              setQueryMode(false)
              queryMutation.reset()
            }}
          >
            <TableIcon className='mr-2 h-4 w-4' />
            Tables
          </Button>
          <Button
            variant={queryMode ? 'default' : 'outline'}
            size='sm'
            onClick={() => setQueryMode(true)}
          >
            <Play className='mr-2 h-4 w-4' />
            Query
          </Button>
        </div>
      </div>

      {!queryMode ? (
        <>
          {/* Tables List */}
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
              <CardDescription>Select a table to view its data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-2 md:grid-cols-3 lg:grid-cols-4'>
                {tables?.map((table) => (
                  <Button
                    key={table.name}
                    variant={selectedTable === table.name ? 'default' : 'outline'}
                    className='justify-between'
                    onClick={() => {
                      setSelectedTable(table.name)
                      setPage(0)
                    }}
                  >
                    <span className='truncate'>{table.name}</span>
                    <Badge variant='secondary' className='ml-2'>
                      {table.row_count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Table Data */}
          {selectedTable && (
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>{selectedTable}</CardTitle>
                    <CardDescription>
                      {tableData ? `${tableData.total} total rows` : 'Loading...'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className='flex items-center justify-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                  </div>
                ) : tableData && tableData.rows.length > 0 ? (
                  <>
                    <div className='rounded-md border overflow-x-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tableData.columns.map((col) => (
                              <TableHead key={col.column_name}>
                                <div className='flex flex-col'>
                                  <span className='font-medium'>{col.column_name}</span>
                                  <span className='text-xs text-muted-foreground'>
                                    {col.data_type}
                                  </span>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData.rows.map((row, idx) => (
                            <TableRow key={idx}>
                              {tableData.columns.map((col) => (
                                <TableCell key={col.column_name} className='max-w-xs truncate'>
                                  {formatCellValue(row[col.column_name])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className='flex items-center justify-between mt-4'>
                      <p className='text-sm text-muted-foreground'>
                        Showing {page * pageSize + 1} to{' '}
                        {Math.min((page + 1) * pageSize, tableData.total)} of {tableData.total} rows
                      </p>
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => setPage(page + 1)}
                          disabled={page >= totalPages - 1}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='text-center py-8 text-muted-foreground'>No data found</div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* SQL Query Executor */}
          <Card>
            <CardHeader>
              <CardTitle>SQL Query Executor</CardTitle>
              <CardDescription>
                Execute read-only SQL queries (SELECT, WITH, EXPLAIN only)
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder='Enter your SQL query...'
                  className='font-mono text-sm min-h-[150px]'
                />
                <div className='flex items-center gap-2'>
                  <Button onClick={handleExecuteQuery} disabled={queryMutation.isPending}>
                    {queryMutation.isPending ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className='mr-2 h-4 w-4' />
                        Execute Query
                      </>
                    )}
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setSqlQuery('')
                      queryMutation.reset()
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {queryMutation.isError && (
                <div className='rounded-lg bg-red-50 dark:bg-red-950/20 p-4'>
                  <div className='flex items-start gap-2'>
                    <AlertCircle className='h-5 w-5 text-red-600 dark:text-red-400 mt-0.5' />
                    <div>
                      <p className='text-sm font-medium text-red-900 dark:text-red-100'>
                        Query Failed
                      </p>
                      <p className='text-sm text-red-700 dark:text-red-300 mt-1'>
                        {queryMutation.error instanceof Error
                          ? queryMutation.error.message
                          : 'Unknown error'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {queryMutation.isSuccess && queryMutation.data && (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium'>Query Results</p>
                    <Badge variant='secondary'>
                      {queryMutation.data.rowCount} {queryMutation.data.rowCount === 1 ? 'row' : 'rows'}
                    </Badge>
                  </div>
                  <div className='rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {queryMutation.data.columns.map((col, idx) => (
                            <TableHead key={idx}>{col.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryMutation.data.rows.map((row, idx) => (
                          <TableRow key={idx}>
                            {queryMutation.data.columns.map((col, colIdx) => (
                              <TableCell key={colIdx} className='max-w-xs truncate'>
                                {formatCellValue(row[col.name])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Query Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Query Examples</CardTitle>
              <CardDescription>Click to use these example queries</CardDescription>
            </CardHeader>
            <CardContent className='space-y-2'>
              {[
                { label: 'List all users', query: 'SELECT id, email, full_name, created_at FROM users LIMIT 20;' },
                { label: 'Count scans by status', query: 'SELECT status, COUNT(*) as count FROM scans GROUP BY status;' },
                { label: 'Recent scans', query: 'SELECT id, user_id, twitter_handle, status, created_at FROM scans ORDER BY created_at DESC LIMIT 10;' },
                { label: 'User subscription tiers', query: 'SELECT subscription_tier, COUNT(*) as count FROM users GROUP BY subscription_tier;' },
                { label: 'Table sizes', query: "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;" },
              ].map((example) => (
                <Button
                  key={example.label}
                  variant='outline'
                  className='w-full justify-start text-left h-auto py-2'
                  onClick={() => setSqlQuery(example.query)}
                >
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>{example.label}</span>
                    <span className='text-xs text-muted-foreground font-mono mt-1'>
                      {example.query}
                    </span>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...'
  }
  return String(value)
}
