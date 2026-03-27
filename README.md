<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/nh-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/nh-logo-light.svg">
    <img alt="NH" src="assets/nh-logo-dark.svg" width="80">
  </picture>
</p>

<h1 align="center">Subscription Financial Model</h1>
<p align="center">
  <strong>Driver-based financial analytics for a DTC membership business</strong>
</p>

<p align="center">
  <a href="https://submetrics.nicholashidalgo.com"><img src="https://img.shields.io/badge/Live_Demo-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white" alt="Demo"></a>&nbsp;
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/dbt-FF694B?style=flat&logo=dbt&logoColor=white" alt="dbt">
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Streamlit-FF4B4B?style=flat&logo=streamlit&logoColor=white" alt="Streamlit">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Plotly-3F4F75?style=flat&logo=plotly&logoColor=white" alt="Plotly">
  <img src="https://img.shields.io/badge/Snowflake-29B5E8?style=flat&logo=snowflake&logoColor=white" alt="Snowflake">
</p>

---

Built on real subscription data from the KKBox music streaming platform (WSDM Kaggle Competition, 6.7M members, 21.5M transactions). Covers MRR decomposition, cohort retention, LTV/CAC unit economics, plan mix analysis, engagement-churn correlation, and forward MRR forecasting.

---

### Why this exists

This project demonstrates what a Business Analytics Manager (Finance) delivers at a subscription company: connecting operational drivers (acquisition, retention, monetization) to financial projections with enough rigor to defend in executive planning sessions. Every analysis maps to a real decision: where to allocate marketing spend, which plan types to promote, how engagement predicts churn, and what the forward revenue trajectory looks like.

---

### Architecture

```
KKBox (Kaggle) ─► setup.sh ─► PostgreSQL ─► dbt models ─► Python analysis ─► Streamlit
                                  │
                  Marketing       │
                  enrichment ─────┘
                  (synthetic)
```

```
subscription-financial-model/
├── setup.sh                         # One-command setup: download, load, enrich
├── data/
│   ├── raw/                         # KKBox CSVs (downloaded by setup.sh)
│   ├── generate_enrichment.py       # Synthetic marketing spend layer
│   └── marketing_spend.csv          # Generated enrichment data
├── models/
│   ├── staging/
│   │   ├── sources.yml              # Raw table definitions
│   │   ├── stg_members.sql          # Clean demographics, map channels
│   │   ├── stg_transactions.sql     # Parse dates, derive plan type, compute MRR
│   │   └── stg_user_logs.sql        # Daily engagement metrics
│   └── marts/
│       ├── fct_mrr_summary.sql      # MRR decomposition with growth metrics
│       ├── fct_cohort_retention.sql  # Monthly retention by cohort + channel
│       ├── fct_ltv_cac_by_channel.sql # Unit economics per acquisition channel
│       ├── fct_plan_mix.sql         # MRR contribution by plan type
│       └── fct_engagement_churn.sql # Engagement tier vs churn rate
├── analysis/
│   └── financial_analytics.py       # Query layer with mart/raw fallback
├── dashboard/
│   └── app.py                       # Streamlit dashboard (6 tabs)
├── screenshots/                     # Static charts for README
├── dbt_project.yml
├── profiles.yml.example
├── .env.example
└── requirements.txt
```

---

### Data sources

#### KKBox (Real Data)

| Table | Rows | Description |
|-------|------|-------------|
| `members` | 6.7M | Member demographics: age, gender, city, registration date, registration method |
| `transactions` | 21.5M | Payment events: plan days, list price, actual paid, auto-renew, expiry, cancellation |
| `user_logs` | 30M | Daily engagement: songs played by completion bucket, unique songs, total seconds |
| `train` | 970K | Churn labels for Feb/Mar 2017 expiry cohorts |

#### Marketing Spend (Synthetic Enrichment)

KKBox does not publish marketing spend data. This layer generates realistic channel-level spend calibrated against industry benchmarks (streaming CAC $3-40, blended $8-25, marketing as 15-25% of revenue) to enable LTV/CAC and capital allocation analysis.

---

### Analytics modules

| Module | Business Question | Key Output |
|--------|-------------------|------------|
| **MRR Decomposition** | How is recurring revenue growing? | New, expansion, contraction by month |
| **Cohort Retention** | Are we retaining members better over time? | Retention heatmap by cohort and tenure |
| **LTV / CAC** | Which channels generate the best unit economics? | LTV/CAC ratio and payback by channel |
| **Plan Mix** | How is our revenue composition shifting? | MRR % by plan type over time |
| **Engagement vs Churn** | Does engagement predict churn? | Churn rate by engagement tier |
| **MRR Forecast** | What does the next 6 months look like? | Driver-based trailing growth projection |

---

### Screenshots

#### MRR Over Time
![MRR](screenshots/mrr_over_time.png)

#### LTV / CAC by Channel
![LTV CAC](screenshots/ltv_cac_by_channel.png)

#### Cohort Retention Heatmap
![Retention](screenshots/cohort_retention.png)

#### MRR Decomposition
![Decomposition](screenshots/mrr_decomposition.png)

---

### Quick start

#### Prerequisites
- Python 3.10+
- PostgreSQL 14+
- Kaggle CLI (`pip install kaggle`)
- Kaggle API credentials (~/.kaggle/kaggle.json)

#### Setup

```bash
git clone https://github.com/nicholasjh-work/subscription-financial-model.git
cd subscription-financial-model
pip install -r requirements.txt
cp .env.example .env  # Edit with your PostgreSQL credentials

# One-command setup: downloads KKBox data, creates schema, loads CSVs
chmod +x setup.sh
./setup.sh

# Build dbt models
cp profiles.yml.example ~/.dbt/profiles.yml
dbt build

# Launch dashboard
streamlit run dashboard/app.py
```

#### Without PostgreSQL (Quick Demo)

The analysis module falls back to CSV if PostgreSQL is unavailable:

```bash
python data/generate_enrichment.py  # Generate marketing spend CSV
# Dashboard will show enrichment data only (limited without KKBox)
```

---

### dbt models

#### Staging

| Model | Source | Key Transformations |
|-------|--------|-------------------|
| `stg_members` | `raw.members` | Age outlier cleanup (10-80), date parsing, channel mapping |
| `stg_transactions` | `raw.transactions` | Date parsing, plan type derivation, MRR normalization |
| `stg_user_logs` | `raw.user_logs` | Date parsing, completion rate, minutes calculation |

#### Marts

| Model | Grain | Description |
|-------|-------|-------------|
| `fct_mrr_summary` | month | MRR with new/expansion/contraction decomposition, ARPU, growth % |
| `fct_cohort_retention` | cohort_month x tenure x channel | Retention rate at each tenure month |
| `fct_ltv_cac_by_channel` | acquisition_channel | LTV, CAC, ratio, payback months |
| `fct_plan_mix` | month x plan_type | MRR and % contribution by plan |
| `fct_engagement_churn` | engagement_tier | Churn rate correlated with daily usage intensity |

---

### Related repos

- [feature-adoption-retention](https://github.com/nicholasjh-work/feature-adoption-retention) - Feature engagement and retention cohorts (dbt + Snowflake)
- [fpna-forecasting-model](https://github.com/nicholasjh-work/fpna-forecasting-model) - Driver-based revenue forecasting
- [llm-text-to-sql-finance](https://github.com/nicholasjh-work/llm-text-to-sql-finance) - Governed NL-to-SQL for finance teams

---

<p align="center">
  <a href="https://linkedin.com/in/nicholashidalgo"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"></a>&nbsp;
  <a href="https://nicholashidalgo.com"><img src="https://img.shields.io/badge/Website-000000?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Website"></a>&nbsp;
  <a href="mailto:analytics@nicholashidalgo.com"><img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email"></a>
</p>
