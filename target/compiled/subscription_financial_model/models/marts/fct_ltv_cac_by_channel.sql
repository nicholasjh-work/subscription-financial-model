-- fct_ltv_cac_by_channel.sql
-- Unit economics by acquisition channel using real transaction revenue + synthetic CAC

with member_ltv as (
    select
        member_id,
        sum(actual_amount_paid)                      as lifetime_revenue,
        count(distinct transaction_month)             as active_months,
        min(transaction_date)                         as first_transaction,
        max(transaction_date)                         as last_transaction
    from "subscription_financial_model"."public_staging"."stg_transactions"
    where is_cancelled = 0
    group by member_id
),

channel_members as (
    select
        m.member_id,
        m.acquisition_channel,
        m.registration_month,
        coalesce(l.lifetime_revenue, 0)               as lifetime_revenue,
        coalesce(l.active_months, 0)                  as active_months
    from "subscription_financial_model"."public_staging"."stg_members" m
    left join member_ltv l using (member_id)
),

-- Join with marketing spend to get CAC
channel_spend as (
    select
        channel,
        sum(spend)                                    as total_spend,
        sum(new_members)                              as total_attributed_members
    from "subscription_financial_model"."raw"."marketing_spend"
    group by channel
),

channel_economics as (
    select
        cm.acquisition_channel,
        count(distinct cm.member_id)                  as total_members,
        round(avg(cm.lifetime_revenue), 2)            as avg_ltv,
        round((percentile_cont(0.5) within group (order by cm.lifetime_revenue))::numeric, 2) as median_ltv,
        round(sum(cm.lifetime_revenue)::numeric, 2)   as total_revenue,
        coalesce(cs.total_spend, 0)                   as total_channel_spend,
        coalesce(cs.total_attributed_members, 0)       as attributed_members,
        case
            when coalesce(cs.total_attributed_members, 0) > 0
            then round(cs.total_spend / cs.total_attributed_members, 2)
            else null
        end                                           as avg_cac
    from channel_members cm
    left join channel_spend cs on cm.acquisition_channel = cs.channel
    group by cm.acquisition_channel, cs.total_spend, cs.total_attributed_members
)

select
    *,
    case when avg_cac > 0
         then round(avg_ltv / avg_cac, 2)
         else null
    end                                               as ltv_cac_ratio,
    case when avg_cac > 0 and avg_ltv > 0
         then round(avg_cac / (avg_ltv / 12.0), 1)
         else null
    end                                               as payback_months
from channel_economics
order by ltv_cac_ratio desc nulls last