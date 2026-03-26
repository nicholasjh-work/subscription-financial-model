
  create view "subscription_financial_model"."public_staging"."stg_user_logs__dbt_tmp"
    
    
  as (
    -- stg_user_logs.sql
-- Clean KKBox daily engagement data: parse dates, compute engagement metrics

with source as (
    select * from "subscription_financial_model"."raw"."user_logs"
),

cleaned as (
    select
        msno                                                         as member_id,
        to_date(date, 'YYYYMMDD')                                   as activity_date,
        date_trunc('month', to_date(date, 'YYYYMMDD'))::date         as activity_month,
        date_trunc('week', to_date(date, 'YYYYMMDD'))::date          as activity_week,
        num_unq                                                      as unique_songs,
        (num_25 + num_50 + num_75 + num_985 + num_100)               as total_songs,
        num_100                                                      as songs_completed,
        coalesce(total_secs, 0)                                      as total_seconds,
        round((coalesce(total_secs, 0) / 60.0)::numeric, 1)                     as total_minutes,
        -- Engagement quality: % of songs listened to completion
        case
            when (num_25 + num_50 + num_75 + num_985 + num_100) > 0
            then round(num_100::numeric / (num_25 + num_50 + num_75 + num_985 + num_100) * 100, 1)
            else 0
        end                                                          as completion_rate_pct
    from source
    where date is not null
      and length(date) = 8
)

select * from cleaned
  );