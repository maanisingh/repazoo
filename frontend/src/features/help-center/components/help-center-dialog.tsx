import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useHelpCenterStore } from '@/stores/help-center-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCenterHome } from './help-center-home';
import { HelpCenterCategory } from './help-center-category';
import { HelpCenterArticle } from './help-center-article';
import { HelpCenterSearch } from './help-center-search';
import { HelpCenterHeader } from './help-center-header';

export function HelpCenterDialog() {
  const {
    isOpen,
    closeHelpCenter,
    currentView,
    generateSessionId,
  } = useHelpCenterStore();

  // Generate session ID on mount
  useEffect(() => {
    generateSessionId();
  }, [generateSessionId]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeHelpCenter();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeHelpCenter]);

  return (
    <Dialog open={isOpen} onOpenChange={closeHelpCenter}>
      <DialogContent className='max-w-[95vw] w-[1400px] h-[90vh] p-0 gap-0 flex flex-col'>
        {/* Header */}
        <DialogHeader className='p-6 pb-4 border-b shrink-0'>
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-2xl font-bold'>Help Center</DialogTitle>
            <Button
              variant='ghost'
              size='icon'
              onClick={closeHelpCenter}
              className='h-8 w-8'
            >
              <X className='h-4 w-4' />
              <span className='sr-only'>Close</span>
            </Button>
          </div>
          <HelpCenterHeader />
        </DialogHeader>

        {/* Content */}
        <div className='flex-1 overflow-hidden flex flex-col'>
          {currentView === 'home' && <HelpCenterHome />}
          {currentView === 'category' && <HelpCenterCategory />}
          {currentView === 'article' && <HelpCenterArticle />}
          {currentView === 'search' && <HelpCenterSearch />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
