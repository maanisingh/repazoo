-- Sample Twitter Mentions with Media Data
-- For testing the enhanced media display system

BEGIN;

-- Sample User (if not exists)
INSERT INTO users (id, email, display_name, created_at)
VALUES (
    '123e4567-e89b-12d3-a456-426614174000'::UUID,
    'demo@repazoo.com',
    'Demo User',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Sample Mention 1: Single Photo
WITH mention1 AS (
    INSERT INTO twitter_mentions (
        user_id,
        tweet_id,
        author_id,
        author_username,
        author_display_name,
        author_verified,
        author_followers_count,
        author_profile_image_url,
        tweet_text,
        tweet_created_at,
        retweet_count,
        reply_count,
        like_count,
        quote_count,
        view_count,
        engagement_score,
        sentiment,
        sentiment_score,
        risk_level,
        risk_score,
        tweet_url,
        has_media,
        media_count,
        created_at
    ) VALUES (
        '123e4567-e89b-12d3-a456-426614174000'::UUID,
        '1234567890123456789',
        'twitter_user_1',
        'techreviewer',
        'Tech Reviewer',
        true,
        15000,
        'https://pbs.twimg.com/profile_images/1234567890/photo.jpg',
        'Just tested the new Repazoo platform - incredibly impressive! The AI-powered reputation analysis is spot on. Highly recommended for anyone concerned about their online presence. #RepazooReview',
        NOW() - INTERVAL '2 hours',
        145,
        23,
        892,
        12,
        15420,
        1058.5,
        'positive',
        0.92,
        'low',
        0.15,
        'https://twitter.com/techreviewer/status/1234567890123456789',
        true,
        1,
        NOW() - INTERVAL '2 hours'
    )
    ON CONFLICT (tweet_id) DO UPDATE SET updated_at = NOW()
    RETURNING id
)
INSERT INTO tweet_media (mention_id, media_key, media_type, media_url, preview_image_url, width, height, alt_text, display_order)
SELECT
    mention1.id,
    'media_key_001',
    'photo',
    'https://picsum.photos/1200/800?random=1',
    'https://picsum.photos/1200/800?random=1',
    1200,
    800,
    'Screenshot of Repazoo dashboard showing analytics',
    0
FROM mention1
ON CONFLICT DO NOTHING;

-- Sample Mention 2: Multiple Photos (4 images)
WITH mention2 AS (
    INSERT INTO twitter_mentions (
        user_id,
        tweet_id,
        author_id,
        author_username,
        author_display_name,
        author_verified,
        author_followers_count,
        author_profile_image_url,
        tweet_text,
        tweet_created_at,
        retweet_count,
        reply_count,
        like_count,
        quote_count,
        view_count,
        engagement_score,
        sentiment,
        sentiment_score,
        risk_level,
        risk_score,
        tweet_url,
        has_media,
        media_count,
        created_at
    ) VALUES (
        '123e4567-e89b-12d3-a456-426614174000'::UUID,
        '1234567890123456790',
        'twitter_user_2',
        'socialmediaguru',
        'Social Media Guru',
        true,
        45000,
        'https://picsum.photos/200/200?random=2',
        '🔥 Complete walkthrough of @Repazoo''s reputation management suite! Check out these amazing features:

1. Real-time sentiment analysis
2. AI-powered risk detection
3. Beautiful analytics dashboard
4. Comprehensive reporting

Game changer! 🚀',
        NOW() - INTERVAL '5 hours',
        320,
        67,
        1845,
        45,
        28900,
        2547.5,
        'positive',
        0.95,
        'low',
        0.12,
        'https://twitter.com/socialmediaguru/status/1234567890123456790',
        true,
        4,
        NOW() - INTERVAL '5 hours'
    )
    ON CONFLICT (tweet_id) DO UPDATE SET updated_at = NOW()
    RETURNING id
)
INSERT INTO tweet_media (mention_id, media_key, media_type, media_url, preview_image_url, width, height, alt_text, display_order)
SELECT mention2.id, 'media_key_002', 'photo', 'https://picsum.photos/1200/800?random=2', 'https://picsum.photos/1200/800?random=2', 1200, 800, 'Sentiment analysis dashboard', 0 FROM mention2
UNION ALL
SELECT mention2.id, 'media_key_003', 'photo', 'https://picsum.photos/1200/800?random=3', 'https://picsum.photos/1200/800?random=3', 1200, 800, 'Risk detection interface', 1 FROM mention2
UNION ALL
SELECT mention2.id, 'media_key_004', 'photo', 'https://picsum.photos/1200/800?random=4', 'https://picsum.photos/1200/800?random=4', 1200, 800, 'Analytics dashboard overview', 2 FROM mention2
UNION ALL
SELECT mention2.id, 'media_key_005', 'photo', 'https://picsum.photos/1200/800?random=5', 'https://picsum.photos/1200/800?random=5', 1200, 800, 'Comprehensive reporting feature', 3 FROM mention2
ON CONFLICT DO NOTHING;

-- Sample Mention 3: Video Content
WITH mention3 AS (
    INSERT INTO twitter_mentions (
        user_id,
        tweet_id,
        author_id,
        author_username,
        author_display_name,
        author_verified,
        author_followers_count,
        author_profile_image_url,
        tweet_text,
        tweet_created_at,
        retweet_count,
        reply_count,
        like_count,
        quote_count,
        view_count,
        engagement_score,
        sentiment,
        sentiment_score,
        risk_level,
        risk_score,
        tweet_url,
        has_media,
        media_count,
        is_quote,
        created_at
    ) VALUES (
        '123e4567-e89b-12d3-a456-426614174000'::UUID,
        '1234567890123456791',
        'twitter_user_3',
        'videomaker',
        'Video Content Creator',
        false,
        8500,
        'https://picsum.photos/200/200?random=6',
        'Watch my full @Repazoo demo! This tool is essential for anyone managing their online reputation. The AI insights are incredible 🎥',
        NOW() - INTERVAL '1 day',
        89,
        15,
        567,
        8,
        12300,
        783.5,
        'positive',
        0.88,
        'low',
        0.18,
        'https://twitter.com/videomaker/status/1234567890123456791',
        true,
        1,
        false,
        NOW() - INTERVAL '1 day'
    )
    ON CONFLICT (tweet_id) DO UPDATE SET updated_at = NOW()
    RETURNING id
)
INSERT INTO tweet_media (mention_id, media_key, media_type, media_url, preview_image_url, width, height, alt_text, display_order, duration_ms)
SELECT
    mention3.id,
    'media_key_006',
    'video',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://picsum.photos/1280/720?random=7',
    1280,
    720,
    'Full walkthrough video of Repazoo platform',
    0,
    120000
FROM mention3
ON CONFLICT DO NOTHING;

-- Sample Mention 4: Negative sentiment with risk
INSERT INTO twitter_mentions (
    user_id,
    tweet_id,
    author_id,
    author_username,
    author_display_name,
    author_verified,
    author_followers_count,
    author_profile_image_url,
    tweet_text,
    tweet_created_at,
    retweet_count,
    reply_count,
    like_count,
    quote_count,
    view_count,
    engagement_score,
    sentiment,
    sentiment_score,
    risk_level,
    risk_score,
    tweet_url,
    has_media,
    media_count,
    created_at
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000'::UUID,
    '1234567890123456792',
    'twitter_user_4',
    'concerneduser',
    'Privacy Advocate',
    false,
    2300,
    'https://picsum.photos/200/200?random=8',
    'Concerned about @Repazoo''s data collection practices. How much user data are you storing? Need transparency here. #PrivacyMatters',
    NOW() - INTERVAL '3 hours',
    34,
    12,
    89,
    3,
    3400,
    147.5,
    'negative',
    0.72,
    'medium',
    0.65,
    'https://twitter.com/concerneduser/status/1234567890123456792',
    false,
    0,
    NOW() - INTERVAL '3 hours'
)
ON CONFLICT (tweet_id) DO UPDATE SET updated_at = NOW();

-- Sample Mention 5: No media, neutral sentiment
INSERT INTO twitter_mentions (
    user_id,
    tweet_id,
    author_id,
    author_username,
    author_display_name,
    author_verified,
    author_followers_count,
    author_profile_image_url,
    tweet_text,
    tweet_created_at,
    retweet_count,
    reply_count,
    like_count,
    quote_count,
    view_count,
    engagement_score,
    sentiment,
    sentiment_score,
    risk_level,
    risk_score,
    tweet_url,
    has_media,
    media_count,
    created_at
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000'::UUID,
    '1234567890123456793',
    'twitter_user_5',
    'neutralobserver',
    'Tech Observer',
    false,
    12000,
    'https://picsum.photos/200/200?random=9',
    'Signed up for @Repazoo. Testing it out. Will report back with findings.',
    NOW() - INTERVAL '6 hours',
    5,
    2,
    18,
    0,
    890,
    27.5,
    'neutral',
    0.55,
    'low',
    0.25,
    'https://twitter.com/neutralobserver/status/1234567890123456793',
    false,
    0,
    NOW() - INTERVAL '6 hours'
)
ON CONFLICT (tweet_id) DO UPDATE SET updated_at = NOW();

COMMIT;

-- Verify the data
SELECT
    tm.id,
    tm.tweet_id,
    tm.author_username,
    tm.sentiment,
    tm.risk_level,
    tm.has_media,
    tm.media_count,
    COUNT(med.id) as actual_media_count
FROM twitter_mentions tm
LEFT JOIN tweet_media med ON med.mention_id = tm.id
WHERE tm.user_id = '123e4567-e89b-12d3-a456-426614174000'::UUID
GROUP BY tm.id, tm.tweet_id, tm.author_username, tm.sentiment, tm.risk_level, tm.has_media, tm.media_count
ORDER BY tm.created_at DESC;
