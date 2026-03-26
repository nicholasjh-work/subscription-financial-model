-- stg_transactions.sql
-- Clean KKBox transaction data: parse dates, derive plan type, compute MRR

with source as (
    select * from {{ source('raw', 'transactions') }}
),

cleaned as (
    select
        msno                                                         as member_id,
        payment_method_id,
        payment_plan_days,
        plan_list_price,
        actual_amount_paid,
        is_auto_renew                                                as auto_renew,
        to_date(transaction_date, 'YYYYMMDD')                        as transaction_date,
        date_trunc('month',
            to_date(transaction_date, 'YYYYMMDD'))::date             as transaction_month,
        to_date(membership_expire_date, 'YYYYMMDD')                  as expiry_date,
        is_cancel                                                    as is_cancelled,
        -- Derive plan type from payment_plan_days
        case
            when payment_plan_days <= 30  then 'monthly'
            when payment_plan_days <= 100 then 'quarterly'
            when payment_plan_days <= 366 then 'annual'
            else 'other'
        end                                                          as plan_type,
        -- MRR contribution: normalize to monthly
        case
            when payment_plan_days > 0
            then round(actual_amount_paid::numeric / (payment_plan_days / 30.0), 2)
            else 0
        end                                                          as mrr_contribution
    from source
    where transaction_date is not null
      and length(transaction_date) = 8
)

select * from cleaned
