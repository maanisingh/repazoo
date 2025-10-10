#!/usr/bin/env python3
"""
Stripe Product Creation Script
Creates Stripe products and prices for Repazoo subscription tiers
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from billing.config import StripeConfig
from billing.stripe_handler import StripeHandler


def print_banner():
    """Print script banner"""
    print("=" * 70)
    print("Repazoo Stripe Product Creation Script")
    print("=" * 70)
    print()


def print_section(title: str):
    """Print section header"""
    print()
    print("-" * 70)
    print(f"  {title}")
    print("-" * 70)


async def main():
    """Main script execution"""
    print_banner()

    try:
        # Initialize configuration
        print("Initializing Stripe configuration...")
        config = StripeConfig()

        mode = "TEST" if config.is_test_mode else "LIVE"
        print(f"Environment: {config.environment.value.upper()} ({mode} mode)")
        print(f"API Key: {config.api_key[:10]}...{config.api_key[-4:]}")
        print()

        # Confirm before proceeding in live mode
        if not config.is_test_mode:
            print("WARNING: You are running in LIVE mode!")
            print("This will create real products and prices in your Stripe account.")
            response = input("Do you want to continue? (yes/no): ")
            if response.lower() != "yes":
                print("Aborted.")
                return

        # Initialize handler
        handler = StripeHandler(config)

        # Create products and prices
        print_section("Creating Stripe Products and Prices")
        results = await handler.create_products_and_prices()

        # Display results
        print_section("Products Created Successfully")

        for tier, ids in results.items():
            from billing.config import TIER_CONFIG
            tier_config = TIER_CONFIG[tier]

            print()
            print(f"Tier: {tier_config.display_name}")
            print(f"  Price: ${tier_config.price_usd}/month")
            print(f"  AI Model: {tier_config.ai_model}")
            print(f"  Quota: {tier_config.monthly_quota:,} requests/month")
            print()
            print(f"  Product ID: {ids['product_id']}")
            print(f"  Price ID:   {ids['price_id']}")
            print()

        # Generate configuration update
        print_section("Configuration Update Required")
        print()
        print("Add these price IDs to /root/repazoo/backend/billing/config.py:")
        print()

        env_key = "cfy" if config.is_test_mode else "ai"

        for tier, ids in results.items():
            print(f'TIER_CONFIG["{tier}"].stripe_price_id_{env_key} = "{ids["price_id"]}"')
            print(f'TIER_CONFIG["{tier}"].stripe_product_id = "{ids["product_id"]}"')
            print()

        # Save to file
        output_file = f"/root/repazoo/backend/billing/stripe_products_{env_key}.txt"
        with open(output_file, "w") as f:
            f.write(f"Stripe Products Created - {mode} Mode\n")
            f.write(f"Created: {asyncio.get_event_loop().time()}\n")
            f.write("\n")

            for tier, ids in results.items():
                from billing.config import TIER_CONFIG
                tier_config = TIER_CONFIG[tier]

                f.write(f"\n{tier.upper()} TIER\n")
                f.write(f"Product ID: {ids['product_id']}\n")
                f.write(f"Price ID: {ids['price_id']}\n")
                f.write(f"Price: ${tier_config.price_usd}/month\n")
                f.write(f"AI Model: {tier_config.ai_model}\n")
                f.write(f"Quota: {tier_config.monthly_quota:,} requests/month\n")

        print(f"Product IDs saved to: {output_file}")
        print()

        print_section("Next Steps")
        print()
        print("1. Update config.py with the price IDs above")
        print("2. Configure webhook endpoint in Stripe dashboard:")
        print("   https://dashboard.stripe.com/webhooks")
        print("   URL: https://ntf.repazoo.com/webhooks/stripe")
        print("3. Add webhook signing secret to .env file")
        print("4. Test subscription creation with test cards")
        print()

        print("=" * 70)
        print("Product creation completed successfully!")
        print("=" * 70)

    except ValueError as e:
        print(f"\nERROR: {str(e)}")
        print("\nPlease ensure all required environment variables are set:")
        print("  - STRIPE_TEST_SECRET_KEY (for test mode)")
        print("  - STRIPE_LIVE_SECRET_KEY (for live mode)")
        print("  - REPAZOO_ENV (cfy or ai)")
        sys.exit(1)

    except Exception as e:
        print(f"\nERROR: Failed to create products")
        print(f"Details: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
