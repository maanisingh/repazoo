import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, ThumbsUp, ThumbsDown, Clock, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { useHelpCenterStore } from '@/stores/help-center-store';
import { helpCenterAPI } from '@/lib/api/help-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export function HelpCenterArticle() {
  const { currentArticleSlug, navigateToArticle } = useHelpCenterStore();
  const [startTime] = useState(Date.now());
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Fetch article
  const { data, isLoading } = useQuery({
    queryKey: ['help-article', currentArticleSlug],
    queryFn: () => helpCenterAPI.getArticleBySlug(currentArticleSlug!),
    enabled: !!currentArticleSlug,
  });

  const article = data?.article;
  const relatedArticles = data?.relatedArticles || [];

  // Track view on mount
  useEffect(() => {
    if (article) {
      helpCenterAPI.trackArticleView(article.id, 0);
    }
  }, [article]);

  // Track time spent on unmount
  useEffect(() => {
    return () => {
      if (article) {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        helpCenterAPI.trackArticleView(article.id, timeSpent);
      }
    };
  }, [article, startTime]);

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: ({ isHelpful }: { isHelpful: boolean }) =>
      helpCenterAPI.submitArticleFeedback(article!.id, isHelpful),
    onSuccess: () => {
      setFeedbackSubmitted(true);
      toast.success('Thank you for your feedback!');
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    },
  });

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!article) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p className='text-muted-foreground'>Article not found</p>
      </div>
    );
  }

  return (
    <div className='flex-1 overflow-hidden flex'>
      {/* Main Content */}
      <ScrollArea className='flex-1 p-6'>
        <div className='max-w-3xl mx-auto space-y-6'>
          {/* Article Header */}
          <div className='space-y-3'>
            {article.category_name && (
              <Badge variant='outline'>{article.category_name}</Badge>
            )}
            <h1 className='text-4xl font-bold tracking-tight'>{article.title}</h1>
            {article.description && (
              <p className='text-xl text-muted-foreground'>{article.description}</p>
            )}

            {/* Meta Information */}
            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
              <div className='flex items-center gap-1.5'>
                <Clock className='h-4 w-4' />
                {new Date(article.updated_at).toLocaleDateString()}
              </div>
              {article.view_count > 0 && (
                <div className='flex items-center gap-1.5'>
                  <Eye className='h-4 w-4' />
                  {article.view_count} views
                </div>
              )}
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className='flex gap-2 flex-wrap'>
                {article.tags.map((tag, idx) => (
                  <Badge key={idx} variant='secondary' className='text-xs'>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Article Content */}
          <div className='prose prose-sm dark:prose-invert max-w-none'>
            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(article.content) }} />
          </div>

          <Separator />

          {/* Feedback Section */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Was this article helpful?</CardTitle>
              <CardDescription>
                Your feedback helps us improve our documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackSubmitted ? (
                <div className='flex items-center gap-2 text-green-600'>
                  <CheckCircle2 className='h-5 w-5' />
                  <span className='font-medium'>Thank you for your feedback!</span>
                </div>
              ) : (
                <div className='flex gap-3'>
                  <Button
                    variant='outline'
                    onClick={() => feedbackMutation.mutate({ isHelpful: true })}
                    disabled={feedbackMutation.isPending}
                  >
                    <ThumbsUp className='h-4 w-4 mr-2' />
                    Yes
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => feedbackMutation.mutate({ isHelpful: false })}
                    disabled={feedbackMutation.isPending}
                  >
                    <ThumbsDown className='h-4 w-4 mr-2' />
                    No
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className='space-y-4'>
              <h3 className='text-xl font-semibold'>Related Articles</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {relatedArticles.map((related) => (
                  <Card
                    key={related.id}
                    className='cursor-pointer hover:border-primary transition-colors'
                    onClick={() => navigateToArticle(related.slug)}
                  >
                    <CardHeader className='pb-2'>
                      <div className='flex items-start gap-2'>
                        <FileText className='h-4 w-4 mt-1 text-muted-foreground shrink-0' />
                        <CardTitle className='text-sm font-medium leading-tight'>
                          {related.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Simple markdown-to-HTML formatter
// For production, use a proper markdown library like react-markdown
function formatMarkdown(content: string): string {
  if (!content) return '';

  let html = content;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Paragraphs
  html = html.split('\n\n').map(para => {
    if (!para.trim()) return '';
    if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<pre')) {
      return para;
    }
    return `<p>${para}</p>`;
  }).join('\n');

  return html;
}
