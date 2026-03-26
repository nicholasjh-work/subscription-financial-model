-- fct_cohort_retention.sql
-- Monthly cohort retention: % of members still transacting N months after registration

with member_cohorts as (
    select
        member_id,
        registration_month                           as cohort_month,
        acquisition_channel
    from {{ ref('stg_members') }}
),

member_activity as (
    select distinct
        member_id,
        transaction_month
    from {{ ref('stg_transactions') }}
    where is_cancelled = 0
),

cohort_activity as (
    select
        mc.cohort_month,
        mc.acquisition_channel,
        ma.member_id,
        -- Tenure in months from registration
        (extract(year from ma.transaction_month) - extract(year from mc.cohort_month)) * 12
        + extract(month from ma.transaction_month) - extract(month from mc.cohort_month) as tenure_months
    from member_activity ma
    inner join member_cohorts mc using (member_id)
),

cohort_sizes as (
    select
        cohort_month,
        acquisition_channel,
        count(distinct member_id) as cohort_size
    from member_cohorts
    group by 1, 2
),

retention_counts as (
    select
        cohort_month,
        acquisition_channel,
        tenure_months,
        count(distinct member_id) as active_count
    from cohort_activity
    where tenure_months >= 0
    group by 1, 2, 3
)

select
    r.cohort_month,
    r.acquisition_channel,
    r.tenure_months,
    c.cohort_size,
    r.active_count,
    round(r.active_count * 100.0 / nullif(c.cohort_size, 0), 2) as retention_rate
from retention_counts r
inner join cohort_sizes c
    on r.cohort_month = c.cohort_month
    and r.acquisition_channel = c.acquisition_channel
where r.tenure_months <= 24
order by r.cohort_month, r.tenure_months
