import { createFileRoute } from '@tanstack/react-router';
import { AIChat } from '@/features/ai-chat/pages/ai-chat';

export const Route = createFileRoute('/_authenticated/ai-chat/')({
  component: AIChat,
});
