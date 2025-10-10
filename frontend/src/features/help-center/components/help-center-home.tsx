import { useQuery } from '@tanstack/react-query';
import {
  Rocket, Twitter, ScanSearch, LayoutDashboard,
  ShieldCheck, Code2, AlertCircle, Loader2,
  TrendingUp, Star
} from 'lucide-react';
import { useHelpCenterStore } from '@/stores/help-center-store';
import { helpCenterAPI } from '@/lib/api/help-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const ICON_MAP: Record<string, any> = {
  Rocket,
  Twitter,
  ScanSearch,
  LayoutDashboard,
  ShieldCheck,
  Code2,
  AlertCircle,
};

export function HelpCenterHome() {
  const { navigateToCategory, navigateToArticle } = useHelpCenterStore();

  // Fetch categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['help-categories'],
    queryFn: () => helpCenterAPI.getAllCategories(),
  });

  // Fetch popular articles
  const { data: popularArticles, isLoading: loadingPopular } = useQuery({
    queryKey: ['help-popular-articles'],
    queryFn: () => helpCenterAPI.getPopularArticles(5),
  });

  // Fetch featured articles
  const { data: featuredArticles, isLoading: loadingFeatured } = useQuery({
    queryKey: ['help-featured-articles'],
    queryFn: () => helpCenterAPI.getFeaturedArticles(3),
  });

  if (loadingCategories) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <ScrollArea className='flex-1 p-6'>
      <div className='max-w-6xl mx-auto space-y-8'>
        {/* Welcome Section */}
        <div className='text-center space-y-2'>
          <h2 className='text-3xl font-bold'>How can we help you?</h2>
          <p className='text-muted-foreground text-lg'>
            Browse categories or search for what you need
          </p>
        </div>

        {/* Categories Grid */}
        <div>
          <h3 className='text-xl font-semibold mb-4'>Browse by Category</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {categories?.map((category) => {
              const Icon = ICON_MAP[category.icon || 'AlertCircle'] || AlertCircle;
              return (
                <Card
                  key={category.id}
                  className='cursor-pointer hover:border-primary transition-colors'
                  onClick={() => navigateToCategory(category.slug)}
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 rounded-lg bg-primary/10'>
                        <Icon className='h-5 w-5 text-primary' />
                      </div>
                      <div className='flex-1'>
                        <CardTitle className='text-base'>{category.name}</CardTitle>
                        {category.article_count && parseInt(category.article_count) > 0 && (
                          <Badge variant='secondary' className='text-xs mt-1'>
                            {category.article_count} articles
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className='pb-4'>
                    <CardDescription className='text-sm'>
                      {category.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Popular Articles */}
        {!loadingPopular && popularArticles && popularArticles.length > 0 && (
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <TrendingUp className='h-5 w-5 text-primary' />
              <h3 className='text-xl font-semibold'>Popular Articles</h3>
            </div>
            <div className='space-y-2'>
              {popularArticles.map((article) => (
                <Card
                  key={article.id}
                  className='cursor-pointer hover:border-primary transition-colors'
                  onClick={() => navigateToArticle(article.slug)}
                >
                  <CardHeader className='py-3 px-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <CardTitle className='text-sm font-medium'>
                          {article.title}
                        </CardTitle>
                        {article.category_name && (
                          <CardDescription className='text-xs mt-1'>
                            {article.category_name}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant='outline' className='text-xs ml-2'>
                        {article.view_count} views
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Featured Articles */}
        {!loadingFeatured && featuredArticles && featuredArticles.length > 0 && (
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <Star className='h-5 w-5 text-primary' />
              <h3 className='text-xl font-semibold'>Featured Guides</h3>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {featuredArticles.map((article) => (
                <Card
                  key={article.id}
                  className='cursor-pointer hover:border-primary transition-colors'
                  onClick={() => navigateToArticle(article.slug)}
                >
                  <CardHeader>
                    <Badge className='w-fit mb-2' variant='default'>
                      Featured
                    </Badge>
                    <CardTitle className='text-base'>{article.title}</CardTitle>
                    <CardDescription className='text-sm line-clamp-2'>
                      {article.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='pt-0'>
                    <Button variant='ghost' size='sm' className='px-0'>
                      Read more →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className='border-t pt-6'>
          <p className='text-sm text-muted-foreground text-center'>
            Can't find what you're looking for?{' '}
            <Button
              variant='link'
              className='px-1 h-auto text-sm'
              onClick={() => document.querySelector<HTMLInputElement>('input[type="search"]')?.focus()}
            >
              Try searching
            </Button>
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
