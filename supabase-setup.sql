-- =====================================================
-- School Time Database Setup
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- =====================================================

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  pin TEXT,
  level TEXT,
  applicant_name TEXT,
  phone TEXT,
  email TEXT,
  institution_name TEXT,
  wilaya TEXT,
  municipality TEXT,
  expert_username TEXT,
  expert_name TEXT,
  days_pattern TEXT,
  morning_periods NUMERIC DEFAULT 0,
  afternoon_periods NUMERIC DEFAULT 0,
  afternoon_start_time TEXT,
  num_rooms NUMERIC DEFAULT 0,
  num_labs NUMERIC DEFAULT 0,
  num_workshops NUMERIC DEFAULT 0,
  num_computer_rooms NUMERIC DEFAULT 0,
  num_playgrounds NUMERIC DEFAULT 0,
  sections_mode TEXT,
  sections_breakdown JSONB,
  teachers_breakdown JSONB,
  map_image_url TEXT,
  total_sections NUMERIC DEFAULT 0,
  has_rotating_sections BOOLEAN DEFAULT false,
  rotating_sections_names TEXT,
  rotating_sections_fee NUMERIC DEFAULT 0,
  assignment_file_url TEXT,
  notes_guided_work TEXT,
  notes_catch_up_tech TEXT,
  notes_general TEXT,
  total_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'قيد المراجعة',
  is_paid BOOLEAN DEFAULT false,
  final_files JSONB DEFAULT '[]'::jsonb,
  payment_method TEXT,
  payment_proof_url TEXT,
  payment_proof_name TEXT,
  payment_confirmed BOOLEAN DEFAULT false,
  download_allowed BOOLEAN DEFAULT false,
  payment_submitted_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancelled_by TEXT,
  cancelled_at TIMESTAMPTZ,
  rejected_reason TEXT,
  admin_confirmed BOOLEAN DEFAULT false,
  expert_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Experts table
CREATE TABLE IF NOT EXISTS experts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  ccp_number TEXT,
  ccp_name TEXT,
  baridimob_number TEXT,
  baridimob_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Registration requests table
CREATE TABLE IF NOT EXISTS expert_registration_requests (
  id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password TEXT NOT NULL,
  ccp_number TEXT,
  baridimob_number TEXT,
  payment_method TEXT,
  payment_proof_url TEXT,
  payment_proof_name TEXT,
  registration_fee NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'قيد المراجعة',
  rejection_reason TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (optional, permissive policies)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_registration_requests ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (app handles auth itself)
DROP POLICY IF EXISTS "Allow all for bookings" ON bookings;
DROP POLICY IF EXISTS "Allow all for experts" ON experts;
DROP POLICY IF EXISTS "Allow all for registrations" ON expert_registration_requests;
DROP POLICY IF EXISTS "Allow all for storage" ON storage.objects;

CREATE POLICY "Allow all for bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for experts" ON experts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for registrations" ON expert_registration_requests FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('booking-documents', 'booking-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow all for storage" ON storage.objects FOR ALL USING (bucket_id = 'booking-documents') WITH CHECK (bucket_id = 'booking-documents');
