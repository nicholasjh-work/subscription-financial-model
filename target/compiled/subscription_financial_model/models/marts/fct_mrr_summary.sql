-- fct_mrr_summary.sql
-- Monthly MRR decomposition: new, expansion, contraction, churned, net new

with monthly_member_mrr as (
    -- Latest transaction per member per month (handles multiple transactions)
    select
        member_id,
        transaction_month,
        plan_type,
        auto_renew,
        is_cancelled,
        -- Use the max MRR contribution for the month
        max(mrr_contribution)   as mrr_contribution,
        max(expiry_date)        as latest_expiry
    from "subscription_financial_model"."public_staging"."stg_transactions"
    where is_cancelled = 0
    group by member_id, transaction_month, plan_type, auto_renew, is_cancelled
),

-- Determine active status: member has an expiry date beyond the month end
with_status as (
    select
        *,
        (latest_expiry >= (transaction_month + interval '1 month')::date) as is_active
    from monthly_member_mrr
),

-- Get previous month MRR per member
with_prev as (
    select
        c.*,
        lag(c.mrr_contribution) over (
            partition by c.member_id order by c.transaction_month
        ) as prev_mrr,
        lag(c.transaction_month) over (
            partition by c.member_id order by c.transaction_month
        ) as prev_month
    from with_status c
    where c.is_active
),

-- Classify MRR movement
classified as (
    select
        transaction_month,
        member_id,
        mrr_contribution,
        prev_mrr,
        case
            when prev_mrr is null then 'new'
            when mrr_contribution > prev_mrr then 'expansion'
            when mrr_contribution < prev_mrr then 'contraction'
            else 'retained'
        end as mrr_type
    from with_prev
),

-- Aggregate
aggregated as (
    select
        transaction_month                                            as month,
        count(distinct member_id)                                    as active_members,
        sum(mrr_contribution)                                        as total_mrr,
        sum(case when mrr_type = 'new' then mrr_contribution else 0 end)        as new_mrr,
        sum(case when mrr_type = 'expansion' then mrr_contribution - coalesce(prev_mrr, 0) else 0 end) as expansion_mrr,
        sum(case when mrr_type = 'contraction' then coalesce(prev_mrr, 0) - mrr_contribution else 0 end) as contraction_mrr
    from classified
    group by transaction_month
)

select
    a.*,
    -- Net new MRR
    a.new_mrr + a.expansion_mrr - a.contraction_mrr                  as net_new_mrr,
    -- ARPU
    round(a.total_mrr / nullif(a.active_members, 0), 2)              as arpu,
    -- MoM growth
    round((a.total_mrr - lag(a.total_mrr) over (order by a.month))
        / nullif(lag(a.total_mrr) over (order by a.month), 0) * 100, 2) as mrr_growth_pct
from aggregated a
order by a.month