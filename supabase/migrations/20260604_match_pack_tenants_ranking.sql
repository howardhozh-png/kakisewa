-- Add owner ranking columns to match_pack_tenants
-- These are set by the owner via the public share-pack page when they rank tenants
alter table match_pack_tenants
  add column if not exists rank        integer     default null,
  add column if not exists liked       integer     default 0    not null,
  add column if not exists owner_note  text        default null;
