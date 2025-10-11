import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Zap,
  Brain,
  Save,
  Loader2,
  Plus,
  X,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { ConfigDrawer } from '@/components/config-drawer';

interface WorkflowConfig {
  id?: string;
  scan_frequency: string;
  scan_schedule?: string;
  keywords: string[];
  custom_analysis_prompt?: string;
  model_preference: string;
  notification_enabled: boolean;
  notification_email?: string;
  max_scans_per_month: number;
  scans_used: number;
  quota_reset_date?: string;
}

export function WorkflowsConfiguration() {
  const { auth } = useAuthStore();
  const userId = auth.user?.accountNo || '';
  const queryClient = useQueryClient();

  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [scanFrequency, setScanFrequency] = useState('manual');
  const [modelPreference, setModelPreference] = useState('llama3:8b');
  const [customPrompt, setCustomPrompt] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('');

  // Fetch workflow configuration
  const { data: configData, isLoading } = useQuery({
    queryKey: ['workflow-config', userId],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/config?user_id=${userId}`);
      if (!response.ok) {
        // If config doesn't exist, return defaults
        if (response.status === 404) {
          return {
            scan_frequency: 'manual',
            keywords: [],
            model_preference: 'llama3:8b',
            notification_enabled: true,
            max_scans_per_month: 10,
            scans_used: 0,
          };
        }
        throw new Error('Failed to fetch workflow configuration');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  // Update configuration when data loads
  useState(() => {
    if (configData) {
      setKeywords(configData.keywords || []);
      setScanFrequency(configData.scan_frequency || 'manual');
      setModelPreference(configData.model_preference || 'llama3:8b');
      setCustomPrompt(configData.custom_analysis_prompt || '');
      setNotificationEnabled(configData.notification_enabled !== false);
      setNotificationEmail(configData.notification_email || auth.user?.email || '');
    }
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (config: Partial<WorkflowConfig>) => {
      const response = await fetch('/api/workflows/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...config,
        }),
      });
      if (!response.ok) throw new Error('Failed to save configuration');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Configuration saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['workflow-config'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    },
  });

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleSaveConfiguration = () => {
    saveConfigMutation.mutate({
      scan_frequency: scanFrequency,
      keywords,
      custom_analysis_prompt: customPrompt,
      model_preference: modelPreference,
      notification_enabled: notificationEnabled,
      notification_email: notificationEmail,
    });
  };

  const getSubscriptionTier = () => {
    // TODO: Fetch from user subscription data
    return 'Free'; // Default to free tier
  };

  const getQuotaProgress = () => {
    if (!configData) return 0;
    return (configData.scans_used / configData.max_scans_per_month) * 100;
  };

  const getQuotaColor = () => {
    const progress = getQuotaProgress();
    if (progress >= 90) return 'text-red-500';
    if (progress >= 70) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Page Header */}
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Workflow Configuration</h1>
            <p className='text-muted-foreground mt-1'>
              Configure how your reputation scans are performed and scheduled
            </p>
          </div>

          {/* Scan Quota Card */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <TrendingUp className='h-5 w-5' />
                    Scan Quota
                  </CardTitle>
                  <CardDescription>Your current plan and usage</CardDescription>
                </div>
                <Badge variant='outline' className='text-lg'>
                  {getSubscriptionTier()} Tier
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>Scans This Month</span>
                    <span className={`text-2xl font-bold ${getQuotaColor()}`}>
                      {configData?.scans_used || 0} / {configData?.max_scans_per_month || 10}
                    </span>
                  </div>
                  <div className='w-full bg-secondary rounded-full h-2'>
                    <div
                      className={`h-2 rounded-full transition-all ${
                        getQuotaProgress() >= 90
                          ? 'bg-red-500'
                          : getQuotaProgress() >= 70
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(getQuotaProgress(), 100)}%` }}
                    />
                  </div>
                  {configData?.quota_reset_date && (
                    <p className='text-sm text-muted-foreground'>
                      Quota resets on {new Date(configData.quota_reset_date).toLocaleDateString()}
                    </p>
                  )}
                  <Button variant='outline' size='sm' className='w-full'>
                    Upgrade Plan for More Scans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scan Frequency Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='h-5 w-5' />
                Scan Schedule
              </CardTitle>
              <CardDescription>Configure automatic scan frequency</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='scan-frequency'>Scan Frequency</Label>
                <Select value={scanFrequency} onValueChange={setScanFrequency}>
                  <SelectTrigger id='scan-frequency'>
                    <SelectValue placeholder='Select frequency' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='manual'>Manual Only</SelectItem>
                    <SelectItem value='daily'>Daily</SelectItem>
                    <SelectItem value='weekly'>Weekly</SelectItem>
                    <SelectItem value='monthly'>Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-sm text-muted-foreground'>
                  {scanFrequency === 'manual'
                    ? 'Scans will only run when you manually trigger them'
                    : `Scans will run automatically ${scanFrequency}`}
                </p>
              </div>

              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label htmlFor='notifications'>Email Notifications</Label>
                  <p className='text-sm text-muted-foreground'>
                    Receive alerts when scans complete
                  </p>
                </div>
                <Switch
                  id='notifications'
                  checked={notificationEnabled}
                  onCheckedChange={setNotificationEnabled}
                />
              </div>

              {notificationEnabled && (
                <div className='space-y-2'>
                  <Label htmlFor='notification-email'>Notification Email</Label>
                  <Input
                    id='notification-email'
                    type='email'
                    placeholder='your.email@example.com'
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Keywords Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Zap className='h-5 w-5' />
                Keywords & Focus Areas
              </CardTitle>
              <CardDescription>
                Specify keywords or topics to focus on during analysis
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex gap-2'>
                <Input
                  placeholder='Add keyword (e.g., "immigration", "hiring")'
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
                <Button onClick={handleAddKeyword} size='icon'>
                  <Plus className='h-4 w-4' />
                </Button>
              </div>

              {keywords.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant='secondary' className='px-3 py-1'>
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className='ml-2 hover:text-destructive'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-muted-foreground text-center py-4'>
                  No keywords added yet. Add keywords to customize your analysis focus.
                </p>
              )}

              <div className='border-t pt-4'>
                <p className='text-sm font-medium mb-2'>Quick Add - Common Keywords:</p>
                <div className='flex flex-wrap gap-2'>
                  {['politics', 'religion', 'discrimination', 'violence', 'drugs', 'controversial'].map(
                    (suggestion) => (
                      <Button
                        key={suggestion}
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          if (!keywords.includes(suggestion)) {
                            setKeywords([...keywords, suggestion]);
                          }
                        }}
                        disabled={keywords.includes(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Model Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Brain className='h-5 w-5' />
                AI Analysis Customization
              </CardTitle>
              <CardDescription>
                Customize how AI analyzes your Twitter content
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='model-preference'>AI Model</Label>
                <Select value={modelPreference} onValueChange={setModelPreference}>
                  <SelectTrigger id='model-preference'>
                    <SelectValue placeholder='Select AI model' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='llama3:8b'>
                      Llama 3 (8B) - Fast & Accurate
                    </SelectItem>
                    <SelectItem value='mistral:7b'>
                      Mistral (7B) - Balanced
                    </SelectItem>
                    <SelectItem value='llava:13b'>
                      LLaVA (13B) - Vision-Enhanced
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-sm text-muted-foreground'>
                  {modelPreference === 'llama3:8b' && 'Recommended for general analysis'}
                  {modelPreference === 'mistral:7b' && 'Good balance of speed and quality'}
                  {modelPreference === 'llava:13b' && 'Best for tweets with images'}
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='custom-prompt'>Custom Analysis Instructions (Optional)</Label>
                <Textarea
                  id='custom-prompt'
                  placeholder='e.g., "Focus on professional conduct and avoid political content..." (leave empty for default analysis)'
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                  className='resize-none'
                />
                <p className='text-sm text-muted-foreground'>
                  Provide specific instructions for AI to follow during analysis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => window.location.reload()}>
              Reset Changes
            </Button>
            <Button onClick={handleSaveConfiguration} disabled={saveConfigMutation.isPending}>
              {saveConfigMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                <>
                  <Save className='mr-2 h-4 w-4' />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </Main>
    </>
  );
}
