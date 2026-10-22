CREATE TABLE public.records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 10),
 char text NOT NULL CHECK (char IN ('cat','dog','hamster','alien','capybara','axolotl','rabbit')),
 map text NOT NULL CHECK (map IN ('cute','spooky','jelly','choco','forest','sea')),
 diff text NOT NULL CHECK (diff IN ('easy','normal','hard')),
 time_ms integer NOT NULL CHECK (time_ms > 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.records TO anon, authenticated;
GRANT ALL ON public.records TO service_role;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public nickname race results" ON public.records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Submit completed race result" ON public.records FOR INSERT TO anon, authenticated WITH CHECK (time_ms > 0 AND char_length(name) BETWEEN 1 AND 10);
CREATE INDEX records_ranking_idx ON public.records(map, diff, time_ms);