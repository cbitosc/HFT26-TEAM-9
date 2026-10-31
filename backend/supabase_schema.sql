-- ==============================================================================
-- REKISHI FORENSICS - SUPABASE DATABASE & STORAGE SCHEMA
-- ==============================================================================
-- INSTRUCTIONS FOR USER:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_
-- 2. Click on "SQL Editor" in the left navigation sidebar.
-- 3. Click "New Query" (or paste into the query window).
-- 4. Copy and paste this ENTIRE file into the editor.
-- 5. Click the green "Run" button (or press Ctrl + Enter).
-- 6. Done! All tables, indexes, storage buckets, and security policies are active.
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. TABLE: CASES
-- Stores all forensic incident dossiers, AI summaries, and physics configurations
-- ==============================================================================
create table if not exists public.cases (
    id text primary key,
    name text not null,
    case_number text,
    location text,
    address text,
    accident_date text,
    filed_by text,
    department text default 'Traffic Accident Investigation Bureau',
    witness_statement text,
    description text,
    status text default 'Verified Consistent',
    confidence numeric default 90,
    summary jsonb default '{}'::jsonb,
    scenario text default 'INTERSECTION_TBONE',
    trajectory jsonb default '[]'::jsonb,
    contradictions jsonb default '[]'::jsonb,
    evidence_counts jsonb default '{"video": 0, "audio": 0, "sensor": 0, "text": 0}'::jsonb,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 3. TABLE: EVIDENCE_RECORDS
-- Stores all multimodal ingested evidence: Videos, Images, Documents, Audio, Sensors
-- ==============================================================================
create table if not exists public.evidence_records (
    id text primary key,
    case_id text references public.cases(id) on delete cascade,
    source_name text not null,
    file_type text not null, -- 'VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT', 'SENSOR', 'WITNESS_TEXT'
    file_size text,
    storage_path text,
    public_url text,
    transcript_or_text text,
    extracted_observations jsonb default '[]'::jsonb,
    is_ground_truth boolean default false,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 4. TABLE: TIMELINE_ENTRIES
-- Stores chronological physical timeline events with AI classifications
-- ==============================================================================
create table if not exists public.timeline_entries (
    id text primary key,
    case_id text references public.cases(id) on delete cascade,
    time_sec numeric not null,
    iso_time text,
    title text not null,
    description text,
    category text default 'MOVEMENT',
    classification text default 'RAW_OBSERVATION',
    confidence numeric default 95,
    has_contradiction boolean default false,
    evidence_references jsonb default '[]'::jsonb,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 5. INDEXES FOR HIGH-SPEED QUERY PERFORMANCE
-- ==============================================================================
create index if not exists idx_cases_case_number on public.cases(case_number);
create index if not exists idx_cases_created_at on public.cases(created_at desc);
create index if not exists idx_evidence_records_case_id on public.evidence_records(case_id);
create index if not exists idx_timeline_entries_case_id on public.timeline_entries(case_id);
create index if not exists idx_timeline_entries_time_sec on public.timeline_entries(time_sec asc);

-- ==============================================================================
-- 6. AUTOMATIC TIMESTAMP TRIGGER FOR CASES
-- ==============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_cases_updated_at on public.cases;
create trigger set_cases_updated_at
    before update on public.cases
    for each row
    execute function public.set_updated_at();

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET: evidence-media
-- Dedicated bucket for Videos, Images, Documents (PDF/Doc), Audio, Sensor CSVs
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'evidence-media',
    'evidence-media',
    true,
    524288000, -- 500MB max per asset
    null        -- Allows all standard MIME types
)
on conflict (id) do update set public = true;

-- ==============================================================================
-- 8. STORAGE ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
drop policy if exists "Public Access to Evidence Media" on storage.objects;
create policy "Public Access to Evidence Media"
    on storage.objects for select
    using (bucket_id = 'evidence-media');

drop policy if exists "Public Upload to Evidence Media" on storage.objects;
create policy "Public Upload to Evidence Media"
    on storage.objects for insert
    with check (bucket_id = 'evidence-media');

drop policy if exists "Public Update to Evidence Media" on storage.objects;
create policy "Public Update to Evidence Media"
    on storage.objects for update
    using (bucket_id = 'evidence-media');

drop policy if exists "Public Delete to Evidence Media" on storage.objects;
create policy "Public Delete to Evidence Media"
    on storage.objects for delete
    using (bucket_id = 'evidence-media');

-- ==============================================================================
-- 9. TABLE ROW LEVEL SECURITY (RLS) POLICIES
-- Enables open read/write access for both anon and authenticated API clients
-- ==============================================================================
alter table public.cases enable row level security;
alter table public.evidence_records enable row level security;
alter table public.timeline_entries enable row level security;

drop policy if exists "Public access cases" on public.cases;
create policy "Public access cases"
    on public.cases for all
    using (true)
    with check (true);

drop policy if exists "Public access evidence_records" on public.evidence_records;
create policy "Public access evidence_records"
    on public.evidence_records for all
    using (true)
    with check (true);

drop policy if exists "Public access timeline_entries" on public.timeline_entries;
create policy "Public access timeline_entries"
    on public.timeline_entries for all
    using (true)
    with check (true);

-- ==============================================================================
-- 10. SEED SAMPLE REKISHI FORENSIC CASES (Optional verification data)
-- ==============================================================================
insert into public.cases (
    id, name, case_number, location, address, accident_date, filed_by, department, status, confidence, scenario, summary
)
values (
    'CASE-2026-101',
    'Main St & 4th Ave Intersection Collision (Car vs Motorcycle)',
    'CASE-2026-101',
    'Junction of Main St & 4th Ave, Downtown Metro',
    'Junction of Main St & 4th Ave, Downtown Metro',
    '2026-10-28 14:02 UTC',
    'Det. Marcus Vance',
    'Traffic Accident Investigation Bureau',
    'Flagged Contradiction',
    91,
    'CAR_VS_BIKE',
    '{"executive": "At approximately 14:02:11 UTC, an intersection collision occurred between Vehicle A proceeding westbound and Vehicle B proceeding southbound. Optical keyframe parsing and ECU telemetry verify Vehicle A entered on an illuminated green signal. Eyewitness statement asserting Vehicle A ran a red light is conclusively refuted by dashcam optical ground truth."}'::jsonb
)
on conflict (id) do nothing;

insert into public.cases (
    id, name, case_number, location, address, accident_date, filed_by, department, status, confidence, scenario, summary
)
values (
    'CASE-2026-102',
    'Highway 101 Northbound Multi-Vehicle Rear-End',
    'CASE-2026-102',
    'Interstate 101, Mile Marker 42.4',
    'Interstate 101, Mile Marker 42.4',
    '2026-10-29 09:15 UTC',
    'Sgt. Sarah Jenkins',
    'Highway Patrol Crash Division',
    'Verified Consistent',
    88,
    'HIGHWAY_REAR_END',
    '{"executive": "At 09:15:22 UTC on Interstate 101 Northbound, Lead Vehicle 1 initiated sudden braking due to stationary traffic. Commercial Truck (Vehicle 2) deployed retarder brakes with 1.1s reaction latency. Vehicle 3 failed to maintain safe stopping distance, causing sequential rear-end impact."}'::jsonb
)
on conflict (id) do nothing;

