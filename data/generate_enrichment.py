"""
Generate synthetic marketing spend data to enrich KKBox subscription data.
KKBox provides member/transaction/engagement data but not marketing spend.
This module creates realistic channel-level spend to enable LTV/CAC and
capital allocation analysis.

Calibrated against real industry benchmarks:
- Music streaming CAC: $3-5 (organic) to $15-40 (paid)
- Blended CAC for subscription services: $8-25
- Marketing spend as % of revenue: 15-25%
"""

import logging
import os
from datetime import datetime

import numpy as np
import pandas as pd

try:
    import psycopg2
except ImportError:
    psycopg2 = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

CHANNELS = {
    "organic_search": {"share": 0.22, "cac_range": (3, 8)},
    "paid_search": {"share": 0.18, "cac_range": (18, 35)},
    "paid_social": {"share": 0.20, "cac_range": (12, 28)},
    "referral": {"share": 0.15, "cac_range": (5, 12)},
    "app_store": {"share": 0.12, "cac_range": (8, 20)},
    "affiliate": {"share": 0.08, "cac_range": (10, 22)},
    "direct": {"share": 0.05, "cac_range": (2, 5)},
}

# KKBox data spans roughly 2015-01 to 2017-03
START_MONTH = "2015-01"
END_MONTH = "2017-03"


def generate_marketing_spend() -> pd.DataFrame:
    """Generate monthly marketing spend by channel."""
    np.random.seed(42)
    records = []
    months = pd.period_range(START_MONTH, END_MONTH, freq="M")

    for i, period in enumerate(months):
        month_str = str(period)
        # Growing spend over time
        trend = 1.0 + 0.03 * i
        # Seasonal: heavier in Q4 and Q1
        month_num = period.month
        seasonal = 1.0
        if month_num in (11, 12, 1):
            seasonal = 1.25
        elif month_num in (6, 7, 8):
            seasonal = 0.80

        for channel, props in CHANNELS.items():
            base_spend = 800_000 * props["share"] * trend * seasonal
            noise = np.random.normal(1.0, 0.08)
            spend = round(max(0, base_spend * noise), 2)

            # Estimate new members from this channel
            avg_cac = np.mean(props["cac_range"])
            new_members = int(spend / avg_cac * np.random.normal(1.0, 0.1))
            new_members = max(0, new_members)

            records.append({
                "month": month_str,
                "channel": channel,
                "spend": spend,
                "new_members": new_members,
            })

    return pd.DataFrame(records)


def load_to_postgres(df: pd.DataFrame) -> None:
    """Load marketing spend into PostgreSQL."""
    if psycopg2 is None:
        logger.warning("psycopg2 not installed, saving to CSV instead")
        df.to_csv("data/marketing_spend.csv", index=False)
        return

    conn = psycopg2.connect(
        dbname=os.getenv("PGDATABASE", "subscription_financial_model"),
        user=os.getenv("PGUSER", "postgres"),
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", "5432"),
    )
    cur = conn.cursor()
    cur.execute("TRUNCATE raw.marketing_spend;")
    for _, row in df.iterrows():
        cur.execute(
            "INSERT INTO raw.marketing_spend (month, channel, spend, new_members) VALUES (%s, %s, %s, %s)",
            (row["month"], row["channel"], row["spend"], row["new_members"]),
        )
    conn.commit()
    cur.close()
    conn.close()
    logger.info("Marketing spend loaded to PostgreSQL")


def main() -> None:
    logger.info("Generating marketing spend enrichment data...")
    df = generate_marketing_spend()

    # Always save CSV as fallback
    df.to_csv("data/marketing_spend.csv", index=False)
    logger.info("Saved data/marketing_spend.csv (%d rows)", len(df))

    # Try loading to PostgreSQL
    try:
        load_to_postgres(df)
    except Exception as e:
        logger.warning("Could not load to PostgreSQL: %s", e)
        logger.info("CSV saved, use \\copy to load manually")

    # Print summary
    total_spend = df["spend"].sum()
    total_members = df["new_members"].sum()
    logger.info("Total spend: $%.2fM over %d months", total_spend / 1e6, df["month"].nunique())
    logger.info("Total attributed members: %d", total_members)
    logger.info("Blended CAC: $%.2f", total_spend / max(total_members, 1))


if __name__ == "__main__":
    main()
