import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Loader2, Search, Edit, Shield, Crown } from 'lucide-react'
import { adminClient, User } from '@/lib/api/admin-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

export const Route = createFileRoute('/_authenticated/admin/users')({
  component: UsersPage,
})

function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 50

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', page, debouncedSearch],
    queryFn: () => adminClient.getUsers(pageSize, page * pageSize, debouncedSearch || undefined),
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: any }) =>
      adminClient.updateUser(userId, updates),
    onSuccess: () => {
      toast.success('User details have been updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditingUser(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    const timer = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(0)
    }, 500)
    return () => clearTimeout(timer)
  }

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
        <p className='text-lg font-medium text-destructive'>Failed to load users</p>
        <p className='text-sm text-muted-foreground mt-2'>
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil((data?.total || 0) / pageSize)

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>User Management</h2>
        <div className='flex items-center gap-2'>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search by email or name...'
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className='pl-8 w-[300px]'
            />
          </div>
        </div>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className='font-medium'>{user.email}</TableCell>
                <TableCell>{user.full_name || '-'}</TableCell>
                <TableCell>
                  <Badge variant='outline' className='capitalize'>
                    {user.subscription_tier || 'free'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.is_admin ? (
                    <Badge variant='default'>
                      <Crown className='mr-1 h-3 w-3' />
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant='secondary'>User</Badge>
                  )}
                </TableCell>
                <TableCell className='text-sm text-muted-foreground'>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className='text-sm text-muted-foreground'>
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => setEditingUser(user)}
                  >
                    <Edit className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data?.total || 0)} of{' '}
          {data?.total || 0} users
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

      <EditUserDialog
        user={editingUser}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={(updates) => {
          if (editingUser) {
            updateMutation.mutate({ userId: editingUser.id, updates })
          }
        }}
      />
    </div>
  )
}

interface EditUserDialogProps {
  user: User | null
  open: boolean
  onClose: () => void
  onSave: (updates: any) => void
}

function EditUserDialog({ user, open, onClose, onSave }: EditUserDialogProps) {
  const [fullName, setFullName] = useState('')
  const [tier, setTier] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('free')
  const [isAdmin, setIsAdmin] = useState(false)

  // Update form when user changes
  useState(() => {
    if (user) {
      setFullName(user.full_name || '')
      setTier((user.subscription_tier as any) || 'free')
      setIsAdmin(user.is_admin)
    }
  })

  const handleSave = () => {
    onSave({
      full_name: fullName || undefined,
      subscription_tier: tier,
      is_admin: isAdmin,
    })
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='fullName'>Full Name</Label>
            <Input
              id='fullName'
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder='Enter full name'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='tier'>Subscription Tier</Label>
            <Select value={tier} onValueChange={(v: any) => setTier(v)}>
              <SelectTrigger id='tier'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='free'>Free</SelectItem>
                <SelectItem value='basic'>Basic</SelectItem>
                <SelectItem value='pro'>Pro</SelectItem>
                <SelectItem value='enterprise'>Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center space-x-2'>
            <Checkbox
              id='isAdmin'
              checked={isAdmin}
              onCheckedChange={(checked) => setIsAdmin(!!checked)}
            />
            <Label htmlFor='isAdmin' className='flex items-center gap-2 cursor-pointer'>
              <Shield className='h-4 w-4' />
              Admin Access
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
