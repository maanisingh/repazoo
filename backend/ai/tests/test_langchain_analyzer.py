"""
Tests for LangChain Analyzer
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from ..langchain_analyzer import LangChainAnalyzer, create_analyzer, get_model_for_tier_name
from config import AIModel


@pytest.fixture
def sample_tweet_data():
    """Sample tweet data for testing"""
    return {
        "tweets": [
            {
                "id": "1",
                "text": "Excited to share my new project! #coding #python",
                "likes": 10,
                "retweets": 5,
                "replies": 2,
                "created_at": "2024-01-01T10:00:00Z"
            },
            {
                "id": "2",
                "text": "Just finished a great book on AI ethics. Highly recommend!",
                "likes": 15,
                "retweets": 8,
                "replies": 3,
                "created_at": "2024-01-02T14:00:00Z"
            },
            {
                "id": "3",
                "text": "Working on improving my machine learning skills this year.",
                "likes": 20,
                "retweets": 10,
                "replies": 5,
                "created_at": "2024-01-03T16:00:00Z"
            },
        ] * 5,  # 15 tweets total
        "total_count": 15,
        "date_range": "2024-01-01 to 2024-01-03",
        "total_likes": 225,
        "total_retweets": 115,
        "total_replies": 50,
        "avg_engagement": 26.0
    }


@pytest.fixture
def sample_user_profile():
    """Sample user profile for testing"""
    return {
        "username": "testuser",
        "display_name": "Test User",
        "follower_count": 1000,
        "following_count": 500,
        "verified": False,
        "bio": "Software developer and AI enthusiast",
        "created_at": "2020-01-01T00:00:00Z"
    }


@pytest.fixture
def mock_analysis_result():
    """Mock AI analysis result"""
    return {
        "sentiment": {
            "overall_sentiment": "positive",
            "sentiment_score": 0.75,
            "positive_ratio": 0.8,
            "negative_ratio": 0.1,
            "neutral_ratio": 0.1,
            "confidence": 0.85,
            "concerning_patterns": [],
            "sample_quotes": ["Excited to share my new project!"]
        },
        "themes": [
            {
                "name": "Technology & Programming",
                "frequency": 10,
                "relevance_score": 0.9,
                "sentiment": "positive",
                "example_tweets": ["1", "2"],
                "is_controversial": False
            }
        ],
        "engagement": {
            "total_tweets": 15,
            "average_likes": 15.0,
            "average_retweets": 7.7,
            "average_replies": 3.3,
            "engagement_rate": 26.0,
            "peak_engagement_times": ["afternoon"],
            "engagement_trend": "increasing",
            "most_engaging_content_types": ["technical content"]
        },
        "risk_assessment": {
            "overall_risk_score": 10.0,
            "risk_level": "low",
            "flags": [],
            "association_risks": [],
            "content_integrity_issues": [],
            "timeline_analysis": "No concerning patterns detected",
            "escalation_required": False
        },
        "bias_indicators": {
            "overall_bias_score": 0.0,
            "bias_indicators": [],
            "political_leaning": "center",
            "demographic_patterns": [],
            "geopolitical_alignment": {
                "alignment_score": 90.0,
                "primary_affiliations": [],
                "sensitive_topics": [],
                "regional_risk_factors": [],
                "international_relations_concerns": []
            },
            "neutrality_score": 0.9,
            "recommendations": []
        },
        "recommendations": [],
        "executive_summary": "Positive technology-focused profile with low risk",
        "key_findings": [
            "Strong positive sentiment",
            "Focused on technology topics",
            "Good engagement metrics"
        ],
        "confidence_level": 0.85,
        "human_review_required": False,
        "token_count": 1000,
        "processing_time_ms": 1500,
        "model_used": "claude-3-5-sonnet-20241022"
    }


class TestLangChainAnalyzer:
    """Test LangChain Analyzer functionality"""

    @pytest.mark.parametrize("tier,expected_model", [
        ("free", AIModel.HAIKU),
        ("basic", AIModel.SONNET_35),
        ("pro", AIModel.OPUS_35),
    ])
    def test_tier_model_routing(self, tier, expected_model):
        """Test that correct model is selected for each tier"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier=tier)
            assert analyzer.model_enum == expected_model

    def test_analyzer_initialization(self):
        """Test analyzer initializes correctly"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")
            assert analyzer.tier == "basic"
            assert analyzer.llm is not None
            assert analyzer.analysis_chain is not None

    def test_validate_inputs_success(self, sample_tweet_data, sample_user_profile):
        """Test input validation with valid data"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")
            # Should not raise exception
            analyzer._validate_inputs(sample_tweet_data, sample_user_profile)

    def test_validate_inputs_insufficient_tweets(self, sample_user_profile):
        """Test input validation with insufficient tweets"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")
            tweet_data = {"tweets": [{"id": "1", "text": "test"}]}  # Only 1 tweet
            with pytest.raises(ValueError, match="At least .* tweets required"):
                analyzer._validate_inputs(tweet_data, sample_user_profile)

    def test_validate_inputs_missing_username(self, sample_tweet_data):
        """Test input validation with missing username"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")
            user_profile = {}  # No username
            with pytest.raises(ValueError, match="Missing required profile fields"):
                analyzer._validate_inputs(sample_tweet_data, user_profile)

    def test_validate_result_success(self, mock_analysis_result):
        """Test result validation with valid result"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")
            assert analyzer._validate_result(mock_analysis_result) is True

    def test_validate_result_missing_keys(self):
        """Test result validation with missing keys"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")
            incomplete_result = {"sentiment": {}, "themes": []}
            assert analyzer._validate_result(incomplete_result) is False

    @pytest.mark.asyncio
    async def test_analyze_async(
        self,
        sample_tweet_data,
        sample_user_profile,
        mock_analysis_result
    ):
        """Test async analysis execution"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")

            # Mock the chain invocation
            with patch.object(
                analyzer.analysis_chain,
                'ainvoke',
                new=AsyncMock(return_value=mock_analysis_result)
            ):
                result = await analyzer.analyze(
                    tweet_data=sample_tweet_data,
                    user_profile=sample_user_profile,
                    purpose="job_search"
                )

                assert result is not None
                assert "sentiment" in result
                assert "processing_time_ms" in result
                assert result["tier"] == "basic"

    def test_analyze_sync(
        self,
        sample_tweet_data,
        sample_user_profile,
        mock_analysis_result
    ):
        """Test synchronous analysis execution"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")

            # Mock the chain invocation
            with patch.object(
                analyzer.analysis_chain,
                'invoke',
                return_value=mock_analysis_result
            ):
                result = analyzer.analyze_sync(
                    tweet_data=sample_tweet_data,
                    user_profile=sample_user_profile,
                    purpose="job_search"
                )

                assert result is not None
                assert "sentiment" in result
                assert "processing_time_ms" in result
                assert result["tier"] == "basic"

    def test_estimate_tokens(self):
        """Test token estimation"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = LangChainAnalyzer(tier="basic")
            input_text = "test " * 100  # ~500 characters
            output_text = "result " * 100  # ~600 characters
            tokens = analyzer._estimate_tokens(input_text, output_text)
            assert tokens > 0
            assert isinstance(tokens, int)


class TestFactoryFunctions:
    """Test factory functions"""

    def test_create_analyzer(self):
        """Test analyzer factory function"""
        with patch('backend.ai.langchain_analyzer.get_anthropic_api_key', return_value="test-key"):
            analyzer = create_analyzer(tier="pro")
            assert isinstance(analyzer, LangChainAnalyzer)
            assert analyzer.tier == "pro"

    @pytest.mark.parametrize("tier,expected_model", [
        ("basic", "claude-3-5-sonnet-20241022"),
        ("pro", "claude-3-5-opus-20241022"),
    ])
    def test_get_model_for_tier_name(self, tier, expected_model):
        """Test get model name for tier"""
        model_name = get_model_for_tier_name(tier)
        assert model_name == expected_model
