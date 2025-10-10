import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2, ExternalLink, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth-store';

interface Mention {
  id: string;
  tweet_id: string;
  author_username: string;
  author_display_name: string;
  tweet_text: string;
  risk_level: string;
  risk_score: number;
  sentiment: string;
  engagement_score: number;
  tweet_created_at: string;
  like_count: number;
  retweet_count: number;
  reply_count: number;
}

export function CriticalMentions() {
  const { auth } = useAuthStore();
  const userId = auth.user?.accountNo || '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['critical-mentions', userId],
    queryFn: async () => {
      const response = await fetch(
        `/api/mentions?user_id=${userId}&risk_level=high&limit=10`
      );
      if (!response.ok) throw new Error('Failed to fetch critical mentions');
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (isError) {
    return (
      <div className='flex flex-col items-center justify-center py-8 text-center'>
        <AlertTriangle className='h-8 w-8 text-muted-foreground mb-2' />
        <p className='text-sm text-muted-foreground'>Failed to load critical mentions</p>
      </div>
    );
  }

  const mentions: Mention[] = data?.mentions || [];

  if (mentions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-8 text-center'>
        <ThumbsDown className='h-8 w-8 text-muted-foreground mb-2' />
        <p className='text-sm font-medium'>No Critical Mentions</p>
        <p className='text-xs text-muted-foreground mt-1'>
          You have no high-risk mentions that need attention
        </p>
      </div>
    );
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high':
      case 'critical':
        return <Badge variant='destructive'>High Risk</Badge>;
      case 'medium':
        return <Badge variant='secondary' className='bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'>Medium Risk</Badge>;
      default:
        return <Badge variant='outline'>Low Risk</Badge>;
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
                <div className='text-sm'>
                  <div className='flex items-center justify-end gap-2 text-xs text-muted-foreground'>
                    <span>❤️ {mention.like_count}</span>
                    <span>🔁 {mention.retweet_count}</span>
                    <span>💬 {mention.reply_count}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className='text-right'>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
