-- fct_engagement_churn.sql
-- Correlate engagement intensity with churn behavior
-- Connects KKBox user_logs engagement data to churn outcomes

with member_engagement as (
    select
        member_id,
        count(distinct activity_date)                 as active_days,
        sum(unique_songs)                             as total_unique_songs,
        sum(total_songs)                              as total_songs_played,
        round(avg(total_minutes), 1)                  as avg_daily_minutes,
        round(avg(completion_rate_pct), 1)             as avg_completion_rate,
        min(activity_date)                            as first_activity,
        max(activity_date)                            as last_activity
    from "subscription_financial_model"."public_staging"."stg_user_logs"
    group by member_id
),

churn_labels as (
    select
        msno                                          as member_id,
        is_churn
    from "subscription_financial_model"."raw"."train"
),

combined as (
    select
        e.member_id,
        e.active_days,
        e.total_unique_songs,
        e.total_songs_played,
        e.avg_daily_minutes,
        e.avg_completion_rate,
        e.last_activity - e.first_activity            as engagement_span_days,
        coalesce(c.is_churn, 0)                       as churned,
        -- Engagement tier
        case
            when e.avg_daily_minutes >= 60 then 'power_user'
            when e.avg_daily_minutes >= 20 then 'regular'
            when e.avg_daily_minutes >= 5  then 'light'
            else 'dormant'
        end                                           as engagement_tier
    from member_engagement e
    left join churn_labels c using (member_id)
)

select
    engagement_tier,
    count(*)                                          as members,
    round(avg(churned) * 100, 2)                      as churn_rate_pct,
    round(avg(active_days), 0)                        as avg_active_days,
    round(avg(avg_daily_minutes), 1)                  as avg_daily_minutes,
    round(avg(avg_completion_rate), 1)                 as avg_completion_rate,
    round(avg(total_unique_songs), 0)                  as avg_unique_songs
from combined
group by engagement_tier
order by churn_rate_pct