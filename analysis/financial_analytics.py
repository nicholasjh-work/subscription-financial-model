"""
Subscription financial analytics on KKBox data via PostgreSQL.
Computes MRR decomposition, cohort retention, LTV/CAC, plan mix,
engagement-churn correlation, and MRR forecasting.

Falls back to CSV if PostgreSQL is unavailable (for CI/demo).
"""

import logging
import os
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)
DATA_DIR = Path(__file__).parent.parent / "data"
EXPORT_DIR = DATA_DIR / "exports"


def _get_engine():
    from sqlalchemy import create_engine
    url = os.getenv("DATABASE_URL")
    if url:
        return create_engine(url)
    from sqlalchemy import create_engine
    db = os.getenv("PGDATABASE", "subscription_financial_model")
    user = os.getenv("PGUSER", "postgres")
    host = os.getenv("PGHOST", "localhost")
    port = os.getenv("PGPORT", "5432")
    pw = os.getenv("PGPASSWORD", "")
    return create_engine(f"postgresql://{user}:{pw}@{host}:{port}/{db}")


def _query(sql: str) -> pd.DataFrame:
    from sqlalchemy import text
    engine = _get_engine()
    with engine.connect() as conn:
        return pd.read_sql(text(sql), conn)


def _load_csv(name):
    path = EXPORT_DIR / f"{name}.csv"
    if path.exists():
        return pd.read_csv(path)
    return pd.DataFrame()


def _try_mart(mart_sql: str, fallback_sql: str, csv_name: str = "") -> pd.DataFrame:
    """Try dbt mart first, fall back to raw query, then CSV."""
    try:
        return _query(mart_sql)
    except Exception:
        try:
            return _query(fallback_sql)
        except Exception as e:
            logger.warning("PostgreSQL unavailable: %s", e)
    if csv_name:
        return _load_csv(csv_name)
    return pd.DataFrame()


def load_mrr_summary() -> pd.DataFrame:
    mart = "SELECT * FROM marts.fct_mrr_summary ORDER BY month"
    raw = """
    WITH monthly AS (
        SELECT msno as member_id,
            date_trunc('month', to_date(transaction_date, 'YYYYMMDD'))::date as month,
            MAX(CASE WHEN payment_plan_days > 0
                THEN ROUND(actual_amount_paid::numeric / (payment_plan_days / 30.0), 2)
                ELSE 0 END) as mrr
        FROM raw.transactions WHERE is_cancel = 0
        AND transaction_date IS NOT NULL AND LENGTH(transaction_date) = 8
        GROUP BY 1, 2
    ),
    with_prev AS (
        SELECT *, LAG(mrr) OVER (PARTITION BY member_id ORDER BY month) as prev_mrr
        FROM monthly
    )
    SELECT month::text,
        COUNT(DISTINCT member_id) as active_members,
        ROUND(SUM(mrr)::numeric, 2) as total_mrr,
        ROUND(SUM(CASE WHEN prev_mrr IS NULL THEN mrr ELSE 0 END)::numeric, 2) as new_mrr,
        ROUND(SUM(CASE WHEN prev_mrr IS NOT NULL AND mrr > prev_mrr
            THEN mrr - prev_mrr ELSE 0 END)::numeric, 2) as expansion_mrr,
        ROUND(SUM(CASE WHEN prev_mrr IS NOT NULL AND mrr < prev_mrr
            THEN prev_mrr - mrr ELSE 0 END)::numeric, 2) as contraction_mrr,
        ROUND(SUM(mrr)::numeric / NULLIF(COUNT(DISTINCT member_id), 0), 2) as arpu
    FROM with_prev GROUP BY month ORDER BY month
    """
    df = _try_mart(mart, raw, "fct_mrr_summary")
    if not df.empty:
        df["month"] = df["month"].astype(str).str[:7]
        if "net_new_mrr" not in df.columns:
            df["net_new_mrr"] = df["new_mrr"] + df["expansion_mrr"] - df["contraction_mrr"]
        if "mrr_growth_pct" not in df.columns:
            df["mrr_growth_pct"] = (df["total_mrr"].pct_change() * 100).round(2)
    return df


def load_cohort_retention() -> pd.DataFrame:
    mart = "SELECT * FROM marts.fct_cohort_retention ORDER BY cohort_month, tenure_months"
    raw = """
    WITH cohorts AS (
        SELECT msno as member_id,
            date_trunc('month', to_date(registration_init_time, 'YYYYMMDD'))::date as cohort_month
        FROM raw.members WHERE registration_init_time IS NOT NULL AND LENGTH(registration_init_time) = 8
    ),
    activity AS (
        SELECT DISTINCT msno as member_id,
            date_trunc('month', to_date(transaction_date, 'YYYYMMDD'))::date as active_month
        FROM raw.transactions WHERE is_cancel = 0 AND transaction_date IS NOT NULL
    ),
    joined AS (
        SELECT c.cohort_month::text, a.member_id,
            (EXTRACT(YEAR FROM a.active_month) - EXTRACT(YEAR FROM c.cohort_month)) * 12
            + EXTRACT(MONTH FROM a.active_month) - EXTRACT(MONTH FROM c.cohort_month) as tenure_months
        FROM activity a INNER JOIN cohorts c USING (member_id)
    ),
    sizes AS (SELECT cohort_month::text, COUNT(DISTINCT member_id) as cohort_size FROM cohorts GROUP BY 1),
    counts AS (
        SELECT cohort_month, tenure_months, COUNT(DISTINCT member_id) as active_count
        FROM joined WHERE tenure_months BETWEEN 0 AND 24 GROUP BY 1, 2
    )
    SELECT r.cohort_month, r.tenure_months::int, s.cohort_size, r.active_count,
        ROUND(r.active_count * 100.0 / NULLIF(s.cohort_size, 0), 2) as retention_rate
    FROM counts r INNER JOIN sizes s USING (cohort_month) ORDER BY 1, 2
    """
    return _try_mart(mart, raw, "fct_cohort_retention")


def load_ltv_cac() -> pd.DataFrame:
    mart = "SELECT * FROM marts.fct_ltv_cac_by_channel ORDER BY ltv_cac_ratio DESC NULLS LAST"
    raw = """
    WITH ltv AS (
        SELECT msno as member_id, SUM(actual_amount_paid) as lifetime_revenue
        FROM raw.transactions WHERE is_cancel = 0 GROUP BY 1
    ),
    ch AS (
        SELECT msno as member_id,
            CASE registered_via WHEN 3 THEN 'organic_search' WHEN 4 THEN 'app_store'
                WHEN 7 THEN 'referral' WHEN 9 THEN 'paid_social'
                WHEN 13 THEN 'direct' ELSE 'other' END as acquisition_channel
        FROM raw.members
    ),
    sp AS (SELECT channel, SUM(spend) as total_spend, SUM(new_members) as attributed FROM raw.marketing_spend GROUP BY 1)
    SELECT ch.acquisition_channel, COUNT(DISTINCT ch.member_id) as total_members,
        ROUND(AVG(COALESCE(l.lifetime_revenue, 0))::numeric, 2) as avg_ltv,
        COALESCE(sp.total_spend, 0)::numeric as total_channel_spend,
        CASE WHEN COALESCE(sp.attributed, 0) > 0
            THEN ROUND((sp.total_spend / sp.attributed)::numeric, 2) ELSE NULL END as avg_cac
    FROM ch LEFT JOIN ltv l USING (member_id) LEFT JOIN sp ON ch.acquisition_channel = sp.channel
    GROUP BY 1, sp.total_spend, sp.attributed
    """
    df = _try_mart(mart, raw, "fct_ltv_cac_by_channel")
    if not df.empty and "ltv_cac_ratio" not in df.columns:
        df["ltv_cac_ratio"] = (df["avg_ltv"] / df["avg_cac"].replace(0, np.nan)).round(2)
        df["payback_months"] = (df["avg_cac"] / (df["avg_ltv"] / 12).replace(0, np.nan)).round(1)
    return df


def load_plan_mix() -> pd.DataFrame:
    mart = "SELECT * FROM marts.fct_plan_mix ORDER BY month, plan_type"
    raw = """
    SELECT date_trunc('month', to_date(transaction_date, 'YYYYMMDD'))::text as month,
        CASE WHEN payment_plan_days <= 30 THEN 'monthly'
             WHEN payment_plan_days <= 100 THEN 'quarterly'
             WHEN payment_plan_days <= 366 THEN 'annual' ELSE 'other' END as plan_type,
        ROUND(SUM(CASE WHEN payment_plan_days > 0
            THEN actual_amount_paid::numeric / (payment_plan_days / 30.0) ELSE 0 END), 2) as mrr,
        COUNT(DISTINCT msno) as members
    FROM raw.transactions WHERE is_cancel = 0 AND transaction_date IS NOT NULL AND LENGTH(transaction_date) = 8
    GROUP BY 1, 2 ORDER BY 1, 2
    """
    df = _try_mart(mart, raw, "fct_plan_mix")
    if not df.empty:
        df["month"] = df["month"].astype(str).str[:10]
        for col in ["mrr", "members"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        if "pct_of_mrr" not in df.columns:
            totals = df.groupby("month")["mrr"].sum().reset_index()
            totals.columns = ["month", "total_mrr"]
            df = df.merge(totals, on="month")
            df["pct_of_mrr"] = (df["mrr"] / df["total_mrr"] * 100).round(2)
    return df


def load_engagement_churn() -> pd.DataFrame:
    mart = "SELECT * FROM marts.fct_engagement_churn ORDER BY churn_rate_pct"
    raw = """
    WITH eng AS (
        SELECT msno as member_id, ROUND(AVG(total_secs / 60.0)::numeric, 1) as avg_daily_minutes,
            COUNT(DISTINCT date) as active_days FROM raw.user_logs WHERE date IS NOT NULL GROUP BY 1
    ),
    labeled AS (
        SELECT e.*, COALESCE(t.is_churn, 0) as churned,
            CASE WHEN avg_daily_minutes >= 60 THEN 'power_user'
                 WHEN avg_daily_minutes >= 20 THEN 'regular'
                 WHEN avg_daily_minutes >= 5 THEN 'light' ELSE 'dormant' END as engagement_tier
        FROM eng e LEFT JOIN raw.train t ON e.member_id = t.msno
    )
    SELECT engagement_tier, COUNT(*) as members,
        ROUND(AVG(churned) * 100, 2) as churn_rate_pct,
        ROUND(AVG(active_days)::numeric, 0) as avg_active_days,
        ROUND(AVG(avg_daily_minutes)::numeric, 1) as avg_daily_minutes
    FROM labeled GROUP BY 1 ORDER BY churn_rate_pct
    """
    return _try_mart(mart, raw, "fct_engagement_churn")


def forecast_mrr(mrr_df: pd.DataFrame, periods: int = 6) -> pd.DataFrame:
    """Driver-based MRR forecast using trailing growth rate."""
    if mrr_df.empty:
        return pd.DataFrame()
    df = mrr_df.copy()
    trailing_growth = df["total_mrr"].pct_change().tail(6).mean()
    last_mrr = df["total_mrr"].iloc[-1]
    last_month = pd.Period(df["month"].iloc[-1][:7], freq="M")
    forecasts = [
        {"month": str(last_month + i), "total_mrr": round(last_mrr * (1 + trailing_growth) ** i, 2), "is_forecast": True}
        for i in range(1, periods + 1)
    ]
    actuals = df[["month", "total_mrr"]].copy()
    actuals["is_forecast"] = False
    return pd.concat([actuals, pd.DataFrame(forecasts)], ignore_index=True)
