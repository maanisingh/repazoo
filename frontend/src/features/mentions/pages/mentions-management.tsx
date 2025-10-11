import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { ConfigDrawer } from '@/components/config-drawer';

interface Mention {
  id: string;
  tweet_id: string;
  author_username: string;
  author_display_name: string;
  tweet_text: string;
  risk_level: string;
  risk_score: number;
  sentiment: string;
  sentiment_score: number;
  tweet_created_at: string;
  like_count: number;
  retweet_count: number;
  reply_count: number;
  engagement_score: number;
  topics: any;
}

export function MentionsManagement() {
  const { auth } = useAuthStore();
  const userId = auth.user?.accountNo || '';
  const queryClient = useQueryClient();

  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMention, setSelectedMention] = useState<Mention | null>(null);

  // Fetch mentions with filters
  const { data: mentionsData, isLoading, refetch } = useQuery({
    queryKey: ['mentions', userId, riskFilter, sentimentFilter],
    queryFn: async () => {
      let url = `/api/mentions?user_id=${userId}&limit=100`;
      if (riskFilter !== 'all') url += `&risk_level=${riskFilter}`;
      if (sentimentFilter !== 'all') url += `&sentiment=${sentimentFilter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch mentions');
      return response.json();
    },
    enabled: !!userId,
  });


  // Delete tweet mutation
  const deleteTweetMutation = useMutation({
    mutationFn: async (tweetId: string) => {
      const response = await fetch('/api/twitter/delete-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, tweet_id: tweetId }),
      });
      if (!response.ok) throw new Error('Failed to delete tweet');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Tweet deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['mentions'] });
      setDeleteDialogOpen(false);
      setSelectedMention(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tweet');
    },
  });

  const mentions: Mention[] = mentionsData?.mentions || [];

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high':
      case 'critical':
        return <Badge variant='destructive'>High Risk</Badge>;
      case 'medium':
        return <Badge variant='secondary' className='bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'>Medium</Badge>;
      default:
        return <Badge variant='outline'>Low</Badge>;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'negative':
        return <Badge variant='outline' className='border-red-500 text-red-500'>Negative</Badge>;
      case 'positive':
        return <Badge variant='outline' className='border-green-500 text-green-500'>Positive</Badge>;
      default:
        return <Badge variant='outline'>Neutral</Badge>;
    }
  };


  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Page Header */}
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Mentions Management</h1>
            <p className='text-muted-foreground mt-1'>
              Monitor and manage your Twitter mentions to protect your reputation
            </p>
          </div>


          {/* Mentions Table */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Your Twitter Mentions</CardTitle>
                  <CardDescription>
                    Mentions that may impact your reputation - Review and take action
                  </CardDescription>
                </div>
                <Button onClick={() => refetch()} variant='outline' size='sm'>
                  <RefreshCw className='h-4 w-4 mr-2' />
                  Refresh
                </Button>
              </div>

              {/* Filters */}
              <div className='flex gap-3 pt-4'>
                <div className='flex items-center gap-2'>
                  <Filter className='h-4 w-4 text-muted-foreground' />
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className='w-[150px]'>
                      <SelectValue placeholder='Risk Level' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Risks</SelectItem>
                      <SelectItem value='high'>High Risk</SelectItem>
                      <SelectItem value='medium'>Medium Risk</SelectItem>
                      <SelectItem value='low'>Low Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                  <SelectTrigger className='w-[150px]'>
                    <SelectValue placeholder='Sentiment' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Sentiments</SelectItem>
                    <SelectItem value='negative'>Negative</SelectItem>
                    <SelectItem value='neutral'>Neutral</SelectItem>
                    <SelectItem value='positive'>Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
              ) : mentions.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <CheckCircle2 className='h-12 w-12 text-green-500 mb-3' />
                  <p className='text-lg font-medium'>No Mentions Found</p>
                  <p className='text-sm text-muted-foreground mt-1'>
                    {riskFilter !== 'all' || sentimentFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Run a scan to analyze your Twitter mentions'}
                  </p>
                </div>
              ) : (
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Author</TableHead>
                        <TableHead>Tweet</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Sentiment</TableHead>
                        <TableHead className='text-right'>Engagement</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mentions.map((mention) => (
                        <TableRow key={mention.id}>
                          <TableCell>
                            <div className='flex flex-col'>
                              <span className='font-medium text-sm'>
                                {mention.author_display_name}
                              </span>
                              <span className='text-xs text-muted-foreground'>
                                @{mention.author_username}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='max-w-md'>
                            <p className='text-sm line-clamp-2'>{mention.tweet_text}</p>
                          </TableCell>
                          <TableCell>{getRiskBadge(mention.risk_level)}</TableCell>
                          <TableCell>{getSentimentBadge(mention.sentiment)}</TableCell>
                          <TableCell className='text-right'>
                            <div className='flex items-center justify-end gap-2 text-xs text-muted-foreground'>
                              <span>❤️ {mention.like_count}</span>
                              <span>🔁 {mention.retweet_count}</span>
                              <span>💬 {mention.reply_count}</span>
                            </div>
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex items-center justify-end gap-2'>
                              <Button
                                variant='ghost'
                                size='sm'
                                asChild
                              >
                                <a
                                  href={`https://twitter.com/${mention.author_username}/status/${mention.tweet_id}`}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                >
                                  <ExternalLink className='h-4 w-4' />
                                </a>
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => {
                                  setSelectedMention(mention);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className='h-4 w-4 text-red-500' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tweet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tweet from Twitter. This action cannot be undone.
              <div className='mt-4 p-3 rounded-lg bg-muted'>
                <p className='text-sm'>
                  {selectedMention?.tweet_text}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMention && deleteTweetMutation.mutate(selectedMention.tweet_id)}
              className='bg-red-500 hover:bg-red-600'
            >
              {deleteTweetMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Deleting...
                </>
              ) : (
                'Delete Tweet'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
