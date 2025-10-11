import { createFileRoute } from '@tanstack/react-router';
import { WorkflowsConfiguration } from '@/features/workflows/pages/workflows-configuration';

export const Route = createFileRoute('/_authenticated/workflows/')({
  component: WorkflowsConfiguration,
});
