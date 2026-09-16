-- Update meeting_links_platform_check constraint to allow all meeting platform enum values
ALTER TABLE public.meeting_links DROP CONSTRAINT IF EXISTS meeting_links_platform_check;

ALTER TABLE public.meeting_links ADD CONSTRAINT meeting_links_platform_check 
CHECK (((platform)::text = ANY ((ARRAY['ZOOM'::character varying, 'GOOGLE_MEET'::character varying, 'TEAMS'::character varying, 'WEBEX'::character varying, 'CUSTOM'::character varying])::text[])));
