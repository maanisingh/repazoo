import { useState, useEffect } from 'react';
import { Search, ArrowLeft, Home } from 'lucide-react';
import { useHelpCenterStore } from '@/stores/help-center-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function HelpCenterHeader() {
  const {
    currentView,
    searchQuery,
    navigateToSearch,
    navigateToHome,
    goBack,
    history,
  } = useHelpCenterStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchQuery.trim()) {
      navigateToSearch(localSearchQuery.trim());
    }
  };

  const canGoBack = history.length > 1;

  return (
    <div className='space-y-4 mt-4'>
      {/* Breadcrumb Navigation */}
      <div className='flex items-center gap-2'>
        {canGoBack && (
          <Button
            variant='ghost'
            size='sm'
            onClick={goBack}
            className='h-8 px-2'
          >
            <ArrowLeft className='h-4 w-4 mr-1' />
            Back
          </Button>
        )}
        {currentView !== 'home' && (
          <Button
            variant='ghost'
            size='sm'
            onClick={navigateToHome}
            className='h-8 px-2'
          >
            <Home className='h-4 w-4 mr-1' />
            Home
          </Button>
        )}
        {currentView === 'home' && (
          <Badge variant='secondary' className='text-xs'>
            Home
          </Badge>
        )}
        {currentView === 'category' && (
          <Badge variant='secondary' className='text-xs'>
            Category
          </Badge>
        )}
        {currentView === 'article' && (
          <Badge variant='secondary' className='text-xs'>
            Article
          </Badge>
        )}
        {currentView === 'search' && (
          <Badge variant='secondary' className='text-xs'>
            Search Results
          </Badge>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className='relative'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          type='search'
          placeholder='Search help articles... (Press / to focus)'
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className='pl-10 pr-4'
        />
      </form>
    </div>
  );
}
