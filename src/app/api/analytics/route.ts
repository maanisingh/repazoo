import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { queryOne, queryMany } from '@/lib/postgres';

// GET /api/analytics - Get analytics data for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data
    const [
      totalMentionsResult,
      mentionsInPeriodResult,
      sentimentBreakdownResult,
      averageSentimentResult,
    ] = await Promise.all([
      // Total mentions for user
      queryOne(
        'SELECT COUNT(*) as count FROM simple_mentions WHERE user_id = $1',
        [user.userId]
      ),

      // Mentions in selected period
      queryOne(
        'SELECT COUNT(*) as count FROM simple_mentions WHERE user_id = $1 AND created_at >= $2',
        [user.userId, startDate]
      ),

      // Sentiment breakdown
      queryMany(
        'SELECT sentiment, COUNT(*) as count FROM simple_mentions WHERE user_id = $1 AND created_at >= $2 GROUP BY sentiment',
        [user.userId, startDate]
      ),

      // Average sentiment score
      queryOne(
        'SELECT AVG(sentiment_score) as avg_score FROM simple_mentions WHERE user_id = $1 AND created_at >= $2',
        [user.userId, startDate]
      ),
    ]);

    const totalMentions = parseInt(totalMentionsResult.count);
    const mentionsInPeriod = parseInt(mentionsInPeriodResult.count);
    const sentimentBreakdown = sentimentBreakdownResult;
    const averageSentiment = { _avg: { sentimentScore: parseFloat(averageSentimentResult.avg_score) || 0 } };

    // Calculate reputation score (0-100 based on sentiment)
    const avgSentiment = averageSentiment._avg.sentimentScore || 0;
    const reputationScore = Math.max(0, Math.min(100, (avgSentiment + 1) * 50));

    // Process sentiment breakdown
    const sentiment = {
      positive: sentimentBreakdown.find(s => s.sentiment === 'POSITIVE')?.count || 0,
      negative: sentimentBreakdown.find(s => s.sentiment === 'NEGATIVE')?.count || 0,
      neutral: sentimentBreakdown.find(s => s.sentiment === 'NEUTRAL')?.count || 0,
    };

    const analytics = {
      totalMentions,
      mentionsInPeriod,
      reputationScore: Math.round(reputationScore),
      sentiment,
      averageSentimentScore: avgSentiment,
      timeframe,
      periodStart: startDate.toISOString(),
      periodEnd: now.toISOString(),
    };

    return NextResponse.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('GET analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}