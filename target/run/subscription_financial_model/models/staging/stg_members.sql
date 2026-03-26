
  create view "subscription_financial_model"."public_staging"."stg_members__dbt_tmp"
    
    
  as (
    -- stg_members.sql
-- Clean KKBox member data: fix age outliers, parse dates, map acquisition channels

with source as (
    select * from "subscription_financial_model"."raw"."members"
),

cleaned as (
    select
        msno                                                         as member_id,
        city                                                         as city_id,
        case when bd between 10 and 80 then bd else null end         as age,
        case when gender in ('male', 'female') then gender
             else 'unknown' end                                      as gender,
        registered_via                                               as registration_method,
        to_date(registration_init_time, 'YYYYMMDD')                  as registration_date,
        date_trunc('month',
            to_date(registration_init_time, 'YYYYMMDD'))::date       as registration_month,
        -- Map registration method to channel (KKBox codes)
        case registered_via
            when 3  then 'organic_search'
            when 4  then 'app_store'
            when 7  then 'referral'
            when 9  then 'paid_social'
            when 13 then 'direct'
            else 'other'
        end                                                          as acquisition_channel
    from source
    where registration_init_time is not null
      and length(registration_init_time) = 8
)

select * from cleaned
  );