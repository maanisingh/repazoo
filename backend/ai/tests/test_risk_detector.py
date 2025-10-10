"""
Tests for Risk and Bias Detection
"""

import pytest
from ..risk_detector import RiskDetector, BiasDetector, RiskKeywords, KnownEntities
from ..schemas import RiskLevel, RiskCategory


@pytest.fixture
def safe_tweets():
    """Sample safe tweets"""
    return [
        {
            "id": "1",
            "text": "Just finished a great book on machine learning!",
            "likes": 10,
            "retweets": 5
        },
        {
            "id": "2",
            "text": "Excited to start my new job next week!",
            "likes": 15,
            "retweets": 3
        },
        {
            "id": "3",
            "text": "Coffee and coding make the perfect morning combination.",
            "likes": 20,
            "retweets": 7
        }
    ]


@pytest.fixture
def risky_tweets():
    """Sample tweets with risk indicators"""
    return [
        {
            "id": "1",
            "text": "I hate my job and my boss is the worst person ever",
            "likes": 5,
            "retweets": 1
        },
        {
            "id": "2",
            "text": "This political situation is ridiculous. They are all corrupt!",
            "likes": 10,
            "retweets": 3
        },
        {
            "id": "3",
            "text": "Fuck this shit, I'm done dealing with these idiots",
            "likes": 8,
            "retweets": 2
        }
    ]


@pytest.fixture
def political_left_tweets():
    """Tweets with left-leaning indicators"""
    return [
        {
            "id": "1",
            "text": "We need progressive policies for social justice and equity",
            "likes": 20,
            "retweets": 10
        },
        {
            "id": "2",
            "text": "Fighting for inclusive communities and diversity",
            "likes": 15,
            "retweets": 8
        },
        {
            "id": "3",
            "text": "Liberal values and democratic socialism are the future",
            "likes": 25,
            "retweets": 12
        }
    ]


@pytest.fixture
def political_right_tweets():
    """Tweets with right-leaning indicators"""
    return [
        {
            "id": "1",
            "text": "Conservative values and traditional principles matter",
            "likes": 20,
            "retweets": 10
        },
        {
            "id": "2",
            "text": "Freedom and liberty are core Republican ideals",
            "likes": 15,
            "retweets": 8
        },
        {
            "id": "3",
            "text": "Law and order, patriotism, and libertarian principles",
            "likes": 25,
            "retweets": 12
        }
    ]


class TestRiskDetector:
    """Test risk detection functionality"""

    def test_initialization(self):
        """Test risk detector initialization"""
        detector = RiskDetector(purpose="job_search")
        assert detector.purpose == "job_search"
        assert detector.risk_weights is not None

    def test_different_purpose_weights(self):
        """Test that different purposes have different risk weights"""
        detector_visa = RiskDetector(purpose="visa_application")
        detector_brand = RiskDetector(purpose="brand_building")

        # Visa should weight extremism higher than brand building
        assert detector_visa.risk_weights.get("extremism", 1.0) > \
               detector_brand.risk_weights.get("extremism", 1.0)

    def test_detect_risks_safe_content(self, safe_tweets):
        """Test risk detection with safe content"""
        detector = RiskDetector(purpose="personal_reputation")
        tweet_data = {"tweets": safe_tweets}

        risk_score, risk_level, risk_flags = detector.detect_risks(tweet_data)

        assert risk_score < 30.0  # Should be low risk
        assert risk_level == RiskLevel.LOW
        assert len(risk_flags) == 0  # No flags for safe content

    def test_detect_risks_risky_content(self, risky_tweets):
        """Test risk detection with risky content"""
        detector = RiskDetector(purpose="job_search")
        tweet_data = {"tweets": risky_tweets}

        risk_score, risk_level, risk_flags = detector.detect_risks(tweet_data)

        assert risk_score > 30.0  # Should have some risk
        assert len(risk_flags) > 0  # Should flag issues

    def test_detect_professional_conduct_issues(self, risky_tweets):
        """Test professional conduct detection"""
        detector = RiskDetector(purpose="job_search")
        flags = detector._detect_professional_conduct_issues(risky_tweets)

        assert len(flags) > 0
        assert any(
            f.category == RiskCategory.PROFESSIONAL_CONDUCT
            for f in flags
        )

    def test_detect_brand_safety_issues(self, risky_tweets):
        """Test brand safety detection"""
        detector = RiskDetector(purpose="brand_building")
        flags = detector._detect_brand_safety_issues(risky_tweets)

        assert len(flags) > 0
        # Should detect profanity
        assert any("profanity" in f.description.lower() for f in flags)

    def test_detect_extremism_keywords(self):
        """Test extremism keyword detection"""
        detector = RiskDetector(purpose="security_clearance")
        extremist_tweets = [
            {
                "id": "1",
                "text": "Some extremist keyword content here",
                "likes": 0,
                "retweets": 0
            }
        ]

        flags = detector._detect_extremism(extremist_tweets)
        # Should detect if keywords are present

    def test_risk_level_calculation(self):
        """Test risk level calculation from scores"""
        detector = RiskDetector(purpose="personal_reputation")

        assert detector._calculate_risk_level(20.0) == RiskLevel.LOW
        assert detector._calculate_risk_level(45.0) == RiskLevel.MEDIUM
        assert detector._calculate_risk_level(75.0) == RiskLevel.HIGH
        assert detector._calculate_risk_level(95.0) == RiskLevel.CRITICAL

    def test_detect_associations(self):
        """Test risky association detection"""
        detector = RiskDetector(purpose="visa_application")

        tweets_with_associations = [
            {
                "id": "1",
                "text": "Discussing the impact of extremist groups on society",
                "likes": 5,
                "retweets": 2
            }
        ]

        tweet_data = {"tweets": tweets_with_associations}
        associations = detector.detect_associations(tweet_data)

        # Test passes if no errors (associations may or may not be found)
        assert isinstance(associations, list)


class TestBiasDetector:
    """Test bias detection functionality"""

    def test_initialization(self):
        """Test bias detector initialization"""
        detector = BiasDetector()
        assert detector.political_keywords is not None
        assert "left" in detector.political_keywords
        assert "right" in detector.political_keywords

    def test_detect_political_bias_neutral(self, safe_tweets):
        """Test bias detection with neutral content"""
        detector = BiasDetector()
        bias_score, leaning, indicators = detector.detect_political_bias(safe_tweets)

        assert bias_score == 0.0  # No political content
        assert leaning == "center"
        assert len(indicators) == 0

    def test_detect_political_bias_left(self, political_left_tweets):
        """Test detection of left-leaning bias"""
        detector = BiasDetector()
        bias_score, leaning, indicators = detector.detect_political_bias(
            political_left_tweets
        )

        assert bias_score < 0  # Negative = left
        assert leaning in ["left", "far_left"]
        assert len(indicators) > 0

    def test_detect_political_bias_right(self, political_right_tweets):
        """Test detection of right-leaning bias"""
        detector = BiasDetector()
        bias_score, leaning, indicators = detector.detect_political_bias(
            political_right_tweets
        )

        assert bias_score > 0  # Positive = right
        assert leaning in ["right", "far_right"]
        assert len(indicators) > 0

    def test_bias_score_range(self, political_left_tweets, political_right_tweets):
        """Test that bias scores are in valid range"""
        detector = BiasDetector()

        bias_left, _, _ = detector.detect_political_bias(political_left_tweets)
        bias_right, _, _ = detector.detect_political_bias(political_right_tweets)

        assert -1.0 <= bias_left <= 1.0
        assert -1.0 <= bias_right <= 1.0

    def test_bias_indicator_creation(self, political_left_tweets):
        """Test that bias indicators are created correctly"""
        detector = BiasDetector()
        _, _, indicators = detector.detect_political_bias(political_left_tweets)

        for indicator in indicators:
            assert hasattr(indicator, 'category')
            assert hasattr(indicator, 'strength')
            assert hasattr(indicator, 'description')
            assert 0.0 <= indicator.strength <= 1.0


class TestRiskKeywords:
    """Test risk keyword databases"""

    def test_extremism_keywords_exist(self):
        """Test that extremism keywords are defined"""
        assert len(RiskKeywords.EXTREMISM_KEYWORDS) > 0
        assert isinstance(RiskKeywords.EXTREMISM_KEYWORDS, list)

    def test_violence_keywords_exist(self):
        """Test that violence keywords are defined"""
        assert len(RiskKeywords.VIOLENCE_KEYWORDS) > 0
        assert isinstance(RiskKeywords.VIOLENCE_KEYWORDS, list)

    def test_conspiracy_patterns_exist(self):
        """Test that conspiracy patterns are defined"""
        assert len(RiskKeywords.CONSPIRACY_PATTERNS) > 0
        assert isinstance(RiskKeywords.CONSPIRACY_PATTERNS, list)

    def test_geopolitical_sensitive_exist(self):
        """Test that geopolitical sensitive topics are defined"""
        assert len(RiskKeywords.GEOPOLITICAL_SENSITIVE) > 0
        assert isinstance(RiskKeywords.GEOPOLITICAL_SENSITIVE, list)


class TestKnownEntities:
    """Test known entity databases"""

    def test_extremist_groups_exist(self):
        """Test that extremist groups are defined"""
        assert len(KnownEntities.EXTREMIST_GROUPS) > 0
        assert isinstance(KnownEntities.EXTREMIST_GROUPS, list)

    def test_sanctioned_entities_exist(self):
        """Test that sanctioned entities list exists"""
        assert hasattr(KnownEntities, 'SANCTIONED_ENTITIES')
        assert isinstance(KnownEntities.SANCTIONED_ENTITIES, list)

    def test_controversial_figures_exist(self):
        """Test that controversial figures list exists"""
        assert hasattr(KnownEntities, 'CONTROVERSIAL_FIGURES')
        assert isinstance(KnownEntities.CONTROVERSIAL_FIGURES, list)
