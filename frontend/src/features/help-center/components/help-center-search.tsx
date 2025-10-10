import { useQuery } from '@tanstack/react-query';
import { Loader2, SearchX, FileText } from 'lucide-react';
import { useHelpCenterStore } from '@/stores/help-center-store';
import { helpCenterAPI } from '@/lib/api/help-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function HelpCenterSearch() {
  const { searchQuery, navigateToArticle } = useHelpCenterStore();

  // Fetch search results
  const { data: articles, isLoading } = useQuery({
    queryKey: ['help-search', searchQuery],
    queryFn: () => helpCenterAPI.searchArticles(searchQuery),
    enabled: searchQuery.length > 0,
  });

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <ScrollArea className='flex-1 p-6'>
      <div className='max-w-4xl mx-auto space-y-6'>
        {/* Search Header */}
        <div className='space-y-2'>
          <h2 className='text-2xl font-bold'>
            Search Results for "{searchQuery}"
          </h2>
          {articles && articles.length > 0 && (
            <p className='text-muted-foreground'>
              Found {articles.length} {articles.length === 1 ? 'article' : 'articles'}
            </p>
          )}
        </div>

        {/* Search Results */}
        {articles && articles.length > 0 ? (
          <div className='space-y-3'>
            {articles.map((article) => (
              <Card
                key={article.id}
                className='cursor-pointer hover:border-primary transition-colors'
                onClick={() => navigateToArticle(article.slug)}
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-start gap-3'>
                    <div className='mt-1 p-2 rounded-md bg-muted'>
                      <FileText className='h-4 w-4 text-muted-foreground' />
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <CardTitle className='text-base'>{article.title}</CardTitle>
                        {article.category_name && (
                          <Badge variant='outline' className='text-xs'>
                            {article.category_name}
                          </Badge>
                        )}
                      </div>
                      {article.description && (
                        <CardDescription className='line-clamp-2 text-sm'>
                          {article.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {article.tags && article.tags.length > 0 && (
                  <CardContent className='pt-0'>
                    <div className='flex gap-1.5 flex-wrap'>
                      {article.tags.slice(0, 5).map((tag, idx) => (
                        <Badge key={idx} variant='secondary' className='text-xs'>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className='py-12 text-center'>
              <SearchX className='h-12 w-12 mx-auto text-muted-foreground/50 mb-4' />
              <p className='text-lg font-medium mb-2'>No results found</p>
              <p className='text-muted-foreground text-sm'>
                Try different keywords or browse categories
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
