import { createFileRoute } from '@tanstack/react-router';
import { MentionsManagement } from '@/features/mentions/pages/mentions-management';

export const Route = createFileRoute('/_authenticated/mentions/')({
  component: MentionsManagement,
});
