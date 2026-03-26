
  
    

  create  table "subscription_financial_model"."public_marts"."fct_plan_mix__dbt_tmp"
  
  
    as
  
  (
    -- fct_plan_mix.sql
-- MRR contribution by plan type over time

with monthly_plan_mrr as (
    select
        transaction_month                             as month,
        plan_type,
        sum(mrr_contribution)                         as mrr,
        count(distinct member_id)                     as members
    from "subscription_financial_model"."public_staging"."stg_transactions"
    where is_cancelled = 0
    group by 1, 2
),

monthly_totals as (
    select
        month,
        sum(mrr)                                      as total_mrr
    from monthly_plan_mrr
    group by month
)

select
    p.month,
    p.plan_type,
    round(p.mrr, 2)                                   as mrr,
    p.members,
    round(p.mrr * 100.0 / nullif(t.total_mrr, 0), 2) as pct_of_mrr,
    round(t.total_mrr, 2)                             as total_mrr
from monthly_plan_mrr p
inner join monthly_totals t using (month)
order by p.month, p.plan_type
  );
  