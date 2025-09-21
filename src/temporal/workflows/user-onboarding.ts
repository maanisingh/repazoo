import { proxyActivities, defineSignal, defineQuery, setHandler, condition, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  sendWelcomeEmail,
  createUserProfile,
  setupInitialMonitoring,
  scheduleOnboardingSequence,
  trackOnboardingProgress,
  sendOnboardingReminder,
  completeOnboardingStep,
  generatePersonalizedTips,
  scheduleProductTour,
  activateTrialFeatures
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '3 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export const completeStepSignal = defineSignal<[{ stepId: string, data?: any }]>('completeStep');
export const skipStepSignal = defineSignal<[{ stepId: string, reason?: string }]>('skipStep');
export const pauseOnboardingSignal = defineSignal<[]>('pauseOnboarding');
export const resumeOnboardingSignal = defineSignal<[]>('resumeOnboarding');
export const requestHelpSignal = defineSignal<[{ stepId: string, question: string }]>('requestHelp');

export const onboardingStatusQuery = defineQuery<any>('onboardingStatus');
export const onboardingProgressQuery = defineQuery<number>('onboardingProgress');
export const currentStepQuery = defineQuery<any>('currentStep');

export interface OnboardingWorkflowParams {
  userId: string;
  userEmail: string;
  subscriptionPlan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  industry?: string;
  company?: string;
  goals: string[];
  referralSource?: string;
}

export async function userOnboardingWorkflow(params: OnboardingWorkflowParams): Promise<void> {
  let isPaused = false;
  let currentStepIndex = 0;
  let completedSteps: string[] = [];
  let skippedSteps: string[] = [];
  let helpRequests: any[] = [];

  // Define onboarding sequence based on subscription plan
  const getOnboardingSteps = (plan: string) => {
    const baseSteps = [
      { id: 'welcome', name: 'Welcome & Account Setup', required: true, estimatedTime: '2 min' },
      { id: 'profile', name: 'Complete Your Profile', required: true, estimatedTime: '3 min' },
      { id: 'monitoring_setup', name: 'Set Up Monitoring Sources', required: true, estimatedTime: '5 min' },
      { id: 'keyword_setup', name: 'Add Keywords & Competitors', required: false, estimatedTime: '3 min' },
      { id: 'notification_preferences', name: 'Configure Notifications', required: false, estimatedTime: '2 min' }
    ];

    const proSteps = [
      { id: 'advanced_monitoring', name: 'Advanced Monitoring Features', required: false, estimatedTime: '4 min' },
      { id: 'custom_alerts', name: 'Set Up Custom Alerts', required: false, estimatedTime: '3 min' }
    ];

    const enterpriseSteps = [
      { id: 'team_setup', name: 'Team Management Setup', required: false, estimatedTime: '5 min' },
      { id: 'api_integration', name: 'API Integration Guide', required: false, estimatedTime: '10 min' },
      { id: 'custom_workflows', name: 'Custom Workflow Configuration', required: false, estimatedTime: '8 min' }
    ];

    let steps = [...baseSteps];
    if (plan === 'PRO' || plan === 'ENTERPRISE') {
      steps.push(...proSteps);
    }
    if (plan === 'ENTERPRISE') {
      steps.push(...enterpriseSteps);
    }

    return steps;
  };

  const onboardingSteps = getOnboardingSteps(params.subscriptionPlan);

  // Set up signal handlers
  setHandler(completeStepSignal, ({ stepId, data }) => {
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
      // Move to next step if current step is completed
      const currentStep = onboardingSteps[currentStepIndex];
      if (currentStep && currentStep.id === stepId) {
        currentStepIndex++;
      }
    }
  });

  setHandler(skipStepSignal, ({ stepId, reason }) => {
    if (!skippedSteps.includes(stepId)) {
      skippedSteps.push(stepId);
      // Move to next step if current step is skipped
      const currentStep = onboardingSteps[currentStepIndex];
      if (currentStep && currentStep.id === stepId) {
        currentStepIndex++;
      }
    }
  });

  setHandler(pauseOnboardingSignal, () => {
    isPaused = true;
  });

  setHandler(resumeOnboardingSignal, () => {
    isPaused = false;
  });

  setHandler(requestHelpSignal, ({ stepId, question }) => {
    helpRequests.push({
      stepId,
      question,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    });
  });

  // Set up query handlers
  setHandler(onboardingStatusQuery, () => ({
    isActive: currentStepIndex < onboardingSteps.length,
    isPaused,
    totalSteps: onboardingSteps.length,
    completedSteps: completedSteps.length,
    skippedSteps: skippedSteps.length,
    currentStepIndex,
    helpRequests: helpRequests.length
  }));

  setHandler(onboardingProgressQuery, () => {
    return Math.round((completedSteps.length / onboardingSteps.length) * 100);
  });

  setHandler(currentStepQuery, () => {
    if (currentStepIndex < onboardingSteps.length) {
      return onboardingSteps[currentStepIndex];
    }
    return null;
  });

  console.log(`[Onboarding] Starting onboarding workflow for user ${params.userId} (${params.subscriptionPlan} plan)`);

  // Send welcome email immediately
  await sendWelcomeEmail({
    userId: params.userId,
    email: params.userEmail,
    subscriptionPlan: params.subscriptionPlan,
    personalizedContent: {
      goals: params.goals,
      industry: params.industry
    }
  });

  // Track initial onboarding start
  await trackOnboardingProgress({
    userId: params.userId,
    step: 'STARTED',
    progress: 0,
    metadata: {
      plan: params.subscriptionPlan,
      referralSource: params.referralSource
    }
  });

  // Main onboarding loop
  while (currentStepIndex < onboardingSteps.length) {
    // Wait if paused
    await condition(() => !isPaused);

    const currentStep = onboardingSteps[currentStepIndex];
    console.log(`[Onboarding] Processing step: ${currentStep.name} (${currentStepIndex + 1}/${onboardingSteps.length})`);

    // Track step start
    await trackOnboardingProgress({
      userId: params.userId,
      step: currentStep.id,
      progress: Math.round((currentStepIndex / onboardingSteps.length) * 100),
      metadata: {
        stepName: currentStep.name,
        required: currentStep.required
      }
    });

    // Process step based on ID
    switch (currentStep.id) {
      case 'welcome':
        // Welcome step is automatically completed after email
        await completeOnboardingStep({
          userId: params.userId,
          stepId: 'welcome',
          completionData: {
            welcomeEmailSent: true,
            timestamp: new Date().toISOString()
          }
        });
        completedSteps.push('welcome');
        break;

      case 'profile':
        // Wait for profile completion or timeout
        const profileCompleted = await condition(
          () => completedSteps.includes('profile') || skippedSteps.includes('profile'),
          48 * 60 * 60 * 1000 // 48 hour timeout
        );

        if (!profileCompleted) {
          // Send reminder email
          await sendOnboardingReminder({
            userId: params.userId,
            email: params.userEmail,
            stepName: 'Complete Your Profile',
            reminderType: 'PROFILE_INCOMPLETE'
          });
        }
        break;

      case 'monitoring_setup':
        // This is a critical step - provide extra guidance
        await setupInitialMonitoring({
          userId: params.userId,
          industry: params.industry,
          goals: params.goals,
          subscriptionPlan: params.subscriptionPlan
        });

        // Wait for completion with multiple reminders
        const monitoringSetupCompleted = await condition(
          () => completedSteps.includes('monitoring_setup') || skippedSteps.includes('monitoring_setup'),
          72 * 60 * 60 * 1000
        );

        if (!monitoringSetupCompleted) {
          // Send help offer
          await sendOnboardingReminder({
            userId: params.userId,
            email: params.userEmail,
            stepName: 'Set Up Monitoring Sources',
            reminderType: 'SETUP_HELP_OFFER'
          });
        }
        break;

      case 'keyword_setup':
        // Generate personalized keyword suggestions
        await generatePersonalizedTips({
          userId: params.userId,
          stepId: 'keyword_setup',
          industry: params.industry,
          competitors: [], // Will be filled from user input
          tipType: 'KEYWORD_SUGGESTIONS'
        });
        break;

      case 'notification_preferences':
        // Set up default notifications based on plan
        await scheduleOnboardingSequence({
          userId: params.userId,
          sequenceType: 'NOTIFICATION_SETUP',
          plan: params.subscriptionPlan
        });
        break;

      case 'advanced_monitoring':
        if (params.subscriptionPlan === 'PRO' || params.subscriptionPlan === 'ENTERPRISE') {
          await activateTrialFeatures({
            userId: params.userId,
            features: ['ADVANCED_SENTIMENT', 'COMPETITOR_TRACKING', 'CUSTOM_REPORTS'],
            trialDuration: '14 days'
          });
        }
        break;

      case 'team_setup':
        if (params.subscriptionPlan === 'ENTERPRISE') {
          // Enterprise-specific team setup
          await generatePersonalizedTips({
            userId: params.userId,
            stepId: 'team_setup',
            industry: params.industry,
            tipType: 'TEAM_COLLABORATION'
          });
        }
        break;

      case 'api_integration':
        if (params.subscriptionPlan === 'ENTERPRISE') {
          // Provide API documentation and setup guide
          await scheduleProductTour({
            userId: params.userId,
            tourType: 'API_INTEGRATION',
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
          });
        }
        break;
    }

    // Wait for step completion or skip (with timeout)
    const stepTimeout = currentStep.required ? 7 * 24 * 60 * 60 * 1000 : 3 * 24 * 60 * 60 * 1000;

    await condition(
      () =>
        completedSteps.includes(currentStep.id) ||
        skippedSteps.includes(currentStep.id) ||
        currentStepIndex !== onboardingSteps.findIndex(s => s.id === currentStep.id), // Step changed via signal
      stepTimeout
    );

    // If step wasn't completed and is required, send final reminder
    if (!completedSteps.includes(currentStep.id) && !skippedSteps.includes(currentStep.id) && currentStep.required) {
      await sendOnboardingReminder({
        userId: params.userId,
        email: params.userEmail,
        stepName: currentStep.name,
        reminderType: 'FINAL_REMINDER'
      });

      // Wait additional 2 days for required steps
      await condition(
        () => completedSteps.includes(currentStep.id) || skippedSteps.includes(currentStep.id),
        2 * 24 * 60 * 60 * 1000
      );
    }

    // Auto-advance if step is still not completed (non-required steps only)
    if (!completedSteps.includes(currentStep.id) && !skippedSteps.includes(currentStep.id)) {
      if (!currentStep.required) {
        skippedSteps.push(currentStep.id);
        console.log(`[Onboarding] Auto-skipping non-required step: ${currentStep.id}`);
      }
    }

    // Move to next step if not already moved by signal
    if (currentStepIndex === onboardingSteps.findIndex(s => s.id === currentStep.id)) {
      currentStepIndex++;
    }
  }

  // Onboarding completion
  const completionRate = Math.round((completedSteps.length / onboardingSteps.length) * 100);

  await trackOnboardingProgress({
    userId: params.userId,
    step: 'COMPLETED',
    progress: 100,
    metadata: {
      completionRate,
      completedSteps: completedSteps.length,
      skippedSteps: skippedSteps.length,
      totalDuration: 'calculated_in_activity'
    }
  });

  // Send completion email with next steps
  await sendOnboardingReminder({
    userId: params.userId,
    email: params.userEmail,
    stepName: 'Onboarding Complete',
    reminderType: 'COMPLETION_CELEBRATION',
    additionalData: {
      completionRate,
      nextSteps: ['Start monitoring', 'Invite team members', 'Explore advanced features']
    }
  });

  console.log(`[Onboarding] Onboarding workflow completed for user ${params.userId}. Completion rate: ${completionRate}%`);
}