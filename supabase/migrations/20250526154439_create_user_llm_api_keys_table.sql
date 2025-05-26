create table if not exists
  public.user_llm_api_keys (
    id uuid not null default gen_random_uuid (),
    user_id uuid not null default auth.uid (),
    api_key text not null,
    created_at timestamp
    with
      time zone not null default now(),
      updated_at timestamp
    with
      time zone null default now(),
      constraint user_llm_api_keys_pkey primary key (id),
      constraint user_llm_api_keys_user_id_key unique (user_id),
      constraint user_llm_api_keys_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
  ) TABLESPACE pg_default;