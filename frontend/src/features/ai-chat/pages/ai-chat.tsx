import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Send,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  MessageCircle,
  TrendingUp,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { ConfigDrawer } from '@/components/config-drawer';

interface Recommendation {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedPost: string;
  reasoning: string;
}

interface RecentTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

export function AIChat() {
  const { auth } = useAuthStore();
  const userId = auth.user?.accountNo || '';

  const [tweetText, setTweetText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);

  // Fetch AI-generated personalized recommendations
  const { data: recommendationsData, isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ['recommendations', userId],
    queryFn: async () => {
      const response = await fetch(`/api/mentions/recommendations?user_id=${userId}`);
      if (!response.ok) {
        // Return default recommendations if endpoint not available
        return {
          recommendations: [
            {
              id: '1',
              type: 'positive',
              priority: 'high',
              title: 'Share Professional Achievement',
              description: 'Post about recent professional accomplishments',
              suggestedPost: 'Excited to share that I successfully completed [your achievement]. Grateful for the learning experience! #ProfessionalGrowth',
              reasoning: 'Sharing achievements demonstrates growth and competence.',
            },
            {
              id: '2',
              type: 'engagement',
              priority: 'high',
              title: 'Engage with Industry Leaders',
              description: 'Reply thoughtfully to posts in your industry',
              suggestedPost: 'Great insights! I especially appreciate the point about [specific topic]. Thanks for sharing!',
              reasoning: 'Engaging with respected voices creates positive associations.',
            },
            {
              id: '3',
              type: 'positive',
              priority: 'medium',
              title: 'Share Educational Content',
              description: 'Post about something you learned',
              suggestedPost: 'Just learned about [interesting topic]. Key takeaway: [your insight]. What has been your experience?',
              reasoning: 'Educational content positions you as knowledgeable.',
            },
          ],
        };
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch recent tweets
  const { data: recentTweetsData, refetch: refetchTweets } = useQuery({
    queryKey: ['recent-tweets', userId],
    queryFn: async () => {
      const response = await fetch(`/api/twitter/my-posts/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch recent tweets');
      return response.json();
    },
    enabled: !!userId,
  });

  // Post tweet mutation
  const postTweetMutation = useMutation({
    mutationFn: async (tweet_text: string) => {
      const response = await fetch('/api/twitter/post-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, tweet_text }),
      });
      if (!response.ok) throw new Error('Failed to post tweet');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Tweet posted successfully!');
      setTweetText('');
      setAnalysisResult(null);
      setShowPostDialog(false);
      refetchTweets();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to post tweet');
    },
  });

  // Delete tweet mutation
  const deleteTweetMutation = useMutation({
    mutationFn: async (tweet_id: string) => {
      const response = await fetch('/api/twitter/delete-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, tweet_id }),
      });
      if (!response.ok) throw new Error('Failed to delete tweet');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Tweet deleted successfully');
      refetchTweets();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tweet');
    },
  });

  const handleAnalyzeTweet = async () => {
    if (!tweetText.trim()) {
      toast.error('Please enter tweet text first');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Send to local Ollama for analysis
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3:8b',
          prompt: `Analyze this tweet for reputation risk before posting. Rate it on a scale of 0-100 (100 being safest). Consider: professionalism, controversial topics, sentiment, potential misinterpretation.

Tweet: "${tweetText}"

Respond with JSON:
{
  "risk_score": <number 0-100>,
  "risk_level": "<low/medium/high>",
  "concerns": [<array of strings>],
  "suggestions": [<array of strings>],
  "safe_to_post": <boolean>
}`,
          stream: false,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        setAnalysisResult(analysis);

        if (analysis.risk_level === 'high') {
          toast.warning('High risk detected! Review concerns before posting.');
        } else if (analysis.risk_level === 'low') {
          toast.success('Analysis complete - Tweet looks good!');
        } else {
          toast('Analysis complete - Review suggestions', { icon: '💡' });
        }
      }
    } catch (error) {
      toast.error('Failed to analyze tweet');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePost = () => {
    setShowPostDialog(true);
  };

  const confirmPost = () => {
    postTweetMutation.mutate(tweetText);
  };

  const handleUseRecommendation = (rec: Recommendation) => {
    setTweetText(rec.suggestedPost);
    setAnalysisResult(null); // Reset analysis when using recommendation
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <TrendingUp className='h-4 w-4 text-red-500' />;
      case 'medium':
        return <Lightbulb className='h-4 w-4 text-orange-500' />;
      default:
        return <Sparkles className='h-4 w-4 text-blue-500' />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  const recommendations: Recommendation[] = recommendationsData?.recommendations || [];
  const recentTweets: RecentTweet[] = recentTweetsData?.tweets?.slice(0, 10) || [];

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
        <div className='grid gap-6 md:grid-cols-3'>
          {/* Main Content - 2 columns */}
          <div className='md:col-span-2 space-y-6'>
            {/* Page Header */}
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>AI Chat & Tweet Composer</h1>
              <p className='text-muted-foreground mt-1'>
                Chat with AI, analyze tweets before posting, and manage your Twitter presence
              </p>
            </div>

            {/* Open WebUI Embed */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <MessageCircle className='h-5 w-5' />
                  AI Chat Assistant
                </CardTitle>
                <CardDescription>
                  Ask questions, get advice, or discuss your Twitter strategy with AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='w-full h-[600px] border rounded-lg overflow-hidden'>
                  <iframe
                    src='https://ai.repazoo.com'
                    className='w-full h-full'
                    title='Open WebUI'
                    sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox'
                  />
                </div>
                <p className='text-sm text-muted-foreground mt-2'>
                  Powered by Open WebUI and Ollama local AI models
                </p>
              </CardContent>
            </Card>

            {/* Tweet Composer */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Sparkles className='h-5 w-5' />
                  Compose & Analyze Tweet
                </CardTitle>
                <CardDescription>
                  Write your tweet and analyze it with AI before posting
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Textarea
                    placeholder='What do you want to tweet?'
                    value={tweetText}
                    onChange={(e) => setTweetText(e.target.value)}
                    rows={5}
                    maxLength={280}
                    className='resize-none'
                  />
                  <div className='flex items-center justify-between text-sm'>
                    <span className={tweetText.length > 260 ? 'text-orange-500' : 'text-muted-foreground'}>
                      {tweetText.length} / 280
                    </span>
                    {analysisResult && (
                      <Badge className={getRiskColor(analysisResult.risk_level)}>
                        Risk: {analysisResult.risk_level.toUpperCase()} ({analysisResult.risk_score}/100)
                      </Badge>
                    )}
                  </div>
                </div>

                <div className='flex gap-2'>
                  <Button
                    onClick={handleAnalyzeTweet}
                    disabled={!tweetText.trim() || isAnalyzing}
                    variant='outline'
                    className='flex-1'
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Eye className='h-4 w-4 mr-2' />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handlePost}
                    disabled={!tweetText.trim() || postTweetMutation.isPending}
                    className='flex-1'
                  >
                    {postTweetMutation.isPending ? (
                      <>
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className='h-4 w-4 mr-2' />
                        Post to Twitter
                      </>
                    )}
                  </Button>
                </div>

                {/* Analysis Results */}
                {analysisResult && (
                  <div className='border rounded-lg p-4 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <h4 className='font-semibold flex items-center gap-2'>
                        {analysisResult.safe_to_post ? (
                          <CheckCircle className='h-5 w-5 text-green-500' />
                        ) : (
                          <AlertCircle className='h-5 w-5 text-red-500' />
                        )}
                        Analysis Result
                      </h4>
                      <Badge className={getRiskColor(analysisResult.risk_level)}>
                        {analysisResult.risk_level.toUpperCase()}
                      </Badge>
                    </div>

                    {analysisResult.concerns && analysisResult.concerns.length > 0 && (
                      <div>
                        <p className='text-sm font-medium text-red-600 dark:text-red-400 mb-1'>
                          Concerns:
                        </p>
                        <ul className='text-sm space-y-1'>
                          {analysisResult.concerns.map((concern: string, idx: number) => (
                            <li key={idx} className='flex items-start gap-2'>
                              <span className='text-red-500'>•</span>
                              <span>{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                      <div>
                        <p className='text-sm font-medium text-blue-600 dark:text-blue-400 mb-1'>
                          Suggestions:
                        </p>
                        <ul className='text-sm space-y-1'>
                          {analysisResult.suggestions.map((suggestion: string, idx: number) => (
                            <li key={idx} className='flex items-start gap-2'>
                              <span className='text-blue-500'>•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className='space-y-6'>
            {/* AI Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Lightbulb className='h-5 w-5' />
                  AI Recommendations
                </CardTitle>
                <CardDescription className='text-xs'>
                  Personalized suggestions to boost your reputation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRecommendations ? (
                  <div className='flex items-center justify-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {recommendations.slice(0, 3).map((rec) => (
                      <div
                        key={rec.id}
                        className='border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors cursor-pointer'
                        onClick={() => handleUseRecommendation(rec)}
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            {getPriorityIcon(rec.priority)}
                            <h4 className='text-sm font-semibold'>{rec.title}</h4>
                          </div>
                          <Badge variant='outline' className='text-xs'>
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className='text-xs text-muted-foreground'>{rec.description}</p>
                        <Button size='sm' variant='ghost' className='w-full text-xs h-7'>
                          Use This Suggestion
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Tweets */}
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base'>Recent Posts</CardTitle>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => refetchTweets()}
                  >
                    Refresh
                  </Button>
                </div>
                <CardDescription className='text-xs'>
                  Your last 10 tweets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentTweets.length === 0 ? (
                  <p className='text-sm text-muted-foreground text-center py-4'>
                    No recent tweets found
                  </p>
                ) : (
                  <div className='space-y-3'>
                    {recentTweets.map((tweet) => (
                      <div key={tweet.id} className='border rounded-lg p-3 space-y-2'>
                        <p className='text-sm line-clamp-3'>{tweet.text}</p>
                        <div className='flex items-center justify-between text-xs text-muted-foreground'>
                          <span>
                            {new Date(tweet.created_at).toLocaleDateString()}
                          </span>
                          <div className='flex items-center gap-3'>
                            {tweet.public_metrics && (
                              <>
                                <span>❤️ {tweet.public_metrics.like_count}</span>
                                <span>🔁 {tweet.public_metrics.retweet_count}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='flex-1 h-7 text-xs'
                            asChild
                          >
                            <a
                              href={`https://twitter.com/user/status/${tweet.id}`}
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              <ExternalLink className='h-3 w-3 mr-1' />
                              View
                            </a>
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='flex-1 h-7 text-xs text-red-500'
                            onClick={() => {
                              if (confirm('Delete this tweet?')) {
                                deleteTweetMutation.mutate(tweet.id);
                              }
                            }}
                          >
                            <Trash2 className='h-3 w-3 mr-1' />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>

      {/* Post Confirmation Dialog */}
      <AlertDialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post this tweet?</AlertDialogTitle>
            <AlertDialogDescription>
              {analysisResult ? (
                <div className='space-y-2'>
                  <p>AI Risk Analysis:</p>
                  <Badge className={getRiskColor(analysisResult.risk_level)}>
                    {analysisResult.risk_level.toUpperCase()} Risk - Score: {analysisResult.risk_score}/100
                  </Badge>
                  {!analysisResult.safe_to_post && (
                    <p className='text-red-600 font-medium mt-2'>
                      ⚠️ AI recommends reviewing this tweet before posting
                    </p>
                  )}
                </div>
              ) : (
                <p>This tweet has not been analyzed. Consider analyzing it first for safety.</p>
              )}
              <div className='mt-4 p-3 bg-muted rounded'>
                <p className='text-sm'>{tweetText}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPost}
              className='bg-blue-500 hover:bg-blue-600'
            >
              Post to Twitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
