create index if not exists push_subscriptions_user_id_idx
  on push_subscriptions (user_id);

create unique index if not exists push_subscriptions_endpoint_uidx
  on push_subscriptions (endpoint);
