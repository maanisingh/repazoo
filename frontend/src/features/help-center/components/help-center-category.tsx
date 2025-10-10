import { useQuery } from '@tanstack/react-query';
import { Loader2, FileText, Eye } from 'lucide-react';
import { useHelpCenterStore } from '@/stores/help-center-store';
import { helpCenterAPI } from '@/lib/api/help-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function HelpCenterCategory() {
  const { currentCategorySlug, navigateToArticle } = useHelpCenterStore();

  // Fetch category details
  const { data: category, isLoading: loadingCategory } = useQuery({
    queryKey: ['help-category', currentCategorySlug],
    queryFn: () => helpCenterAPI.getCategoryBySlug(currentCategorySlug!),
    enabled: !!currentCategorySlug,
  });

  // Fetch articles in this category
  const { data: articles, isLoading: loadingArticles } = useQuery({
    queryKey: ['help-articles-by-category', category?.id],
    queryFn: () => helpCenterAPI.getAllArticles(category!.id),
    enabled: !!category?.id,
  });

  if (loadingCategory || loadingArticles) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!category) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p className='text-muted-foreground'>Category not found</p>
      </div>
    );
  }

  return (
    <ScrollArea className='flex-1 p-6'>
      <div className='max-w-4xl mx-auto space-y-6'>
        {/* Category Header */}
        <div className='space-y-2'>
          <h2 className='text-3xl font-bold'>{category.name}</h2>
          {category.description && (
            <p className='text-muted-foreground text-lg'>{category.description}</p>
          )}
          {articles && articles.length > 0 && (
            <Badge variant='secondary'>
              {articles.length} {articles.length === 1 ? 'article' : 'articles'}
            </Badge>
          )}
        </div>

        {/* Articles List */}
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
                      <CardTitle className='text-lg'>{article.title}</CardTitle>
                      {article.description && (
                        <CardDescription className='mt-1.5 line-clamp-2'>
                          {article.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='pt-0 flex items-center gap-4'>
                  {article.view_count > 0 && (
                    <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                      <Eye className='h-3.5 w-3.5' />
                      {article.view_count} views
                    </div>
                  )}
                  {article.tags && article.tags.length > 0 && (
                    <div className='flex gap-1.5'>
                      {article.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant='outline' className='text-xs'>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className='py-12 text-center'>
              <FileText className='h-12 w-12 mx-auto text-muted-foreground/50 mb-4' />
              <p className='text-muted-foreground'>
                No articles in this category yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
