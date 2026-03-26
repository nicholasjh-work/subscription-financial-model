"""
Subscription Financial Model Dashboard
Interactive analytics for DTC membership economics.
Data source: KKBox subscription data (Kaggle) + synthetic marketing enrichment.
"""

import os
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

# Inject DATABASE_URL from Streamlit secrets if present (Streamlit Cloud)
try:
    os.environ["DATABASE_URL"] = st.secrets["DATABASE_URL"]
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).parent.parent))
from analysis.financial_analytics import (
    forecast_mrr,
    load_cohort_retention,
    load_engagement_churn,
    load_ltv_cac,
    load_mrr_summary,
    load_plan_mix,
)

st.set_page_config(page_title="Subscription Financial Model", layout="wide", page_icon="📊")


@st.cache_data(ttl=600)
def get_data():
    mrr = load_mrr_summary()
    retention = load_cohort_retention()
    ltv_cac = load_ltv_cac()
    plan_mix = load_plan_mix()
    engagement = load_engagement_churn()
    forecast = forecast_mrr(mrr, periods=6) if not mrr.empty else pd.DataFrame()
    return mrr, retention, ltv_cac, plan_mix, engagement, forecast


mrr_df, retention, ltv_cac, plan_mix, engagement, forecast = get_data()

if mrr_df.empty:
    st.error("No data available. Check DATABASE_URL or run setup.sh to load data into PostgreSQL.")
    st.stop()

# --- Header ---
st.title("📊 Subscription Financial Model")
st.markdown("*Real subscription data (KKBox) with driver-based forecasting and unit economics*")

# --- KPI Cards ---
latest = mrr_df.iloc[-1]
prev = mrr_df.iloc[-2] if len(mrr_df) > 1 else latest
mrr_change = ((latest["total_mrr"] - prev["total_mrr"]) / prev["total_mrr"] * 100) if prev["total_mrr"] > 0 else 0

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total MRR", f"${latest['total_mrr']:,.0f}", f"{mrr_change:+.1f}%")
col2.metric("Active Members", f"{int(latest['active_members']):,}")
col3.metric("ARPU", f"${latest.get('arpu', 0):,.2f}")
best_channel = ltv_cac.iloc[0] if not ltv_cac.empty else None
if best_channel is not None and pd.notna(best_channel.get("ltv_cac_ratio")):
    col4.metric("Best LTV/CAC", f"{best_channel['ltv_cac_ratio']:.1f}x",
                f"{best_channel['acquisition_channel']}")

st.divider()

# --- Tabs ---
tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "MRR Decomposition", "Cohort Retention", "LTV / CAC",
    "Plan Mix", "Engagement vs Churn", "Forecast"
])

with tab1:
    st.subheader("Monthly Recurring Revenue Decomposition")
    fig = go.Figure()
    fig.add_trace(go.Bar(x=mrr_df["month"], y=mrr_df["new_mrr"], name="New MRR", marker_color="#2ecc71"))
    fig.add_trace(go.Bar(x=mrr_df["month"], y=mrr_df["expansion_mrr"], name="Expansion", marker_color="#3498db"))
    fig.add_trace(go.Bar(x=mrr_df["month"], y=-mrr_df["contraction_mrr"], name="Contraction", marker_color="#e67e22"))
    fig.add_trace(go.Scatter(x=mrr_df["month"], y=mrr_df["total_mrr"], name="Total MRR",
                             line=dict(color="#2c3e50", width=3), yaxis="y2"))
    fig.update_layout(barmode="relative", yaxis=dict(title="MRR Change"),
                      yaxis2=dict(title="Total MRR", overlaying="y", side="right"),
                      height=500, template="plotly_white",
                      legend=dict(orientation="h", yanchor="bottom", y=1.02))
    st.plotly_chart(fig, use_container_width=True)

with tab2:
    st.subheader("Cohort Retention Curves")
    if not retention.empty:
        agg = retention.groupby(["cohort_month", "tenure_months"])["retention_rate"].mean().reset_index()
        pivot = agg.pivot_table(index="cohort_month", columns="tenure_months", values="retention_rate")
        pivot = pivot.tail(15)
        fig_heat = px.imshow(pivot.values, labels=dict(x="Tenure (Months)", y="Cohort", color="Retention %"),
                             x=[str(c) for c in pivot.columns], y=[str(r) for r in pivot.index],
                             color_continuous_scale="Blues", aspect="auto")
        fig_heat.update_layout(height=500, template="plotly_white")
        st.plotly_chart(fig_heat, use_container_width=True)

with tab3:
    st.subheader("LTV / CAC by Acquisition Channel")
    if not ltv_cac.empty:
        display = ltv_cac[ltv_cac["avg_cac"].notna()].copy()
        fig_ltv = go.Figure()
        fig_ltv.add_trace(go.Bar(x=display["acquisition_channel"], y=display["avg_ltv"],
                                 name="Avg LTV", marker_color="#2ecc71"))
        fig_ltv.add_trace(go.Bar(x=display["acquisition_channel"], y=display["avg_cac"],
                                 name="Avg CAC", marker_color="#e74c3c"))
        fig_ltv.update_layout(barmode="group", height=400, template="plotly_white", yaxis_title="$")
        st.plotly_chart(fig_ltv, use_container_width=True)

        st.subheader("Channel Unit Economics")
        cols = [c for c in ["acquisition_channel", "total_members", "avg_ltv", "avg_cac",
                            "ltv_cac_ratio", "payback_months"] if c in display.columns]
        st.dataframe(display[cols].sort_values("ltv_cac_ratio", ascending=False),
                     use_container_width=True, hide_index=True)

with tab4:
    st.subheader("MRR by Plan Type Over Time")
    if not plan_mix.empty:
        fig_mix = px.area(plan_mix, x="month", y="mrr", color="plan_type",
                          labels={"mrr": "MRR ($)", "month": "Month"}, template="plotly_white")
        fig_mix.update_layout(height=450)
        st.plotly_chart(fig_mix, use_container_width=True)

with tab5:
    st.subheader("Engagement Tier vs Churn Rate")
    if not engagement.empty:
        fig_eng = go.Figure()
        fig_eng.add_trace(go.Bar(x=engagement["engagement_tier"], y=engagement["churn_rate_pct"],
                                 marker_color=["#2ecc71", "#3498db", "#e67e22", "#e74c3c"][:len(engagement)]))
        fig_eng.update_layout(height=400, template="plotly_white",
                              yaxis_title="Churn Rate (%)", xaxis_title="Engagement Tier")
        st.plotly_chart(fig_eng, use_container_width=True)

        st.dataframe(engagement, use_container_width=True, hide_index=True)
        st.info("Higher engagement correlates with lower churn. "
                "Power users churn at the lowest rate; dormant users are the highest risk.")

with tab6:
    st.subheader("MRR Forecast (Driver-Based Projection)")
    if not forecast.empty:
        actuals = forecast[~forecast["is_forecast"]]
        fcs = forecast[forecast["is_forecast"]]
        fig_fc = go.Figure()
        fig_fc.add_trace(go.Scatter(x=actuals["month"], y=actuals["total_mrr"],
                                    name="Actual", line=dict(color="#2c3e50", width=2)))
        fig_fc.add_trace(go.Scatter(x=fcs["month"], y=fcs["total_mrr"],
                                    name="Forecast", line=dict(color="#3498db", width=2, dash="dash")))
        fig_fc.update_layout(height=450, template="plotly_white", yaxis_title="MRR ($)")
        st.plotly_chart(fig_fc, use_container_width=True)

        trailing = mrr_df["total_mrr"].pct_change().tail(6).mean() * 100
        st.info(f"Trailing 6-month avg MRR growth: **{trailing:.2f}% / month**")
        st.dataframe(fcs[["month", "total_mrr"]].rename(columns={"total_mrr": "Projected MRR ($)"}),
                     use_container_width=True, hide_index=True)

st.divider()
st.caption("Data: KKBox (WSDM Kaggle Competition) + synthetic marketing enrichment | "
           "Stack: PostgreSQL, dbt, Supabase, Python, Streamlit, Plotly | "
           "Built by Nicholas Hidalgo")
