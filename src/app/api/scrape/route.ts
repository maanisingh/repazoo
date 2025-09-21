import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth';
import { createWebScraper } from '../../../lib/web-scraper';
import { queryMany, queryOne } from '../../../lib/postgres';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, sources } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    console.log(`[Scrape API] Starting scrape for user ${authResult.user.id}, query: "${query}"`);

    // Create scraper instance
    const scraper = createWebScraper();

    // Perform scraping
    const results = await scraper.scrapeQuery(query, sources);

    // Store results in database
    let totalNewMentions = 0;
    const scrapeSummary = [];

    for (const result of results) {
      console.log(`[Scrape API] Processing ${result.mentions.length} mentions from ${result.source}`);

      for (const mention of result.mentions) {
        try {
          // Check if mention already exists
          const existing = await queryOne(
            'SELECT id FROM simple_mentions WHERE url = $1 AND user_id = $2',
            [mention.url, authResult.user.id]
          );

          if (!existing) {
            // Insert new mention
            await queryOne(`
              INSERT INTO simple_mentions (
                user_id, title, content, url, source, source_type, author,
                published_date, sentiment, sentiment_score, sentiment_confidence,
                reputation_impact, engagement_count, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            `, [
              authResult.user.id,
              mention.title,
              mention.content,
              mention.url,
              mention.source,
              mention.sourceType,
              mention.author || null,
              mention.date ? new Date(mention.date) : null,
              mention.sentiment?.label || 'NEUTRAL',
              mention.sentiment?.score || 0,
              mention.sentiment?.confidence || 0.5,
              mention.sentiment?.reputationImpact || 0,
              mention.engagement || 0
            ]);

            totalNewMentions++;
          }
        } catch (dbError) {
          console.error(`[Scrape API] Failed to save mention:`, dbError);
        }
      }

      scrapeSummary.push({
        source: result.source,
        found: result.totalFound,
        errors: result.errors,
        scrapedAt: result.scrapedAt
      });
    }

    // Update user's last scan time
    await queryOne(
      'UPDATE users SET last_scan_at = NOW() WHERE id = $1',
      [authResult.user.id]
    );

    console.log(`[Scrape API] Scraping completed: ${totalNewMentions} new mentions saved`);

    return NextResponse.json({
      success: true,
      query,
      totalSources: results.length,
      totalMentions: results.reduce((sum, r) => sum + r.totalFound, 0),
      newMentions: totalNewMentions,
      sources: scrapeSummary,
      scrapedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Scrape API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get available scraping sources
    const scraper = createWebScraper();
    const sources = scraper.getSources();

    // Get user's scraping history
    const recentScans = await queryMany(`
      SELECT
        DATE(created_at) as scan_date,
        COUNT(*) as mentions_found,
        COUNT(DISTINCT source) as sources_used
      FROM simple_mentions
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY scan_date DESC
      LIMIT 10
    `, [authResult.user.id]);

    return NextResponse.json({
      sources: sources.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        enabled: s.enabled,
        baseUrl: s.baseUrl
      })),
      recentScans,
      totalSources: sources.length,
      enabledSources: sources.filter(s => s.enabled).length
    });

  } catch (error) {
    console.error('[Scrape API] Error getting sources:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}