CREATE TABLE public.community_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 channel text NOT NULL CHECK (channel IN ('public', 'bug', 'idea')),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 10),
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 300),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.community_messages TO anon, authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read public community discussions" ON public.community_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Post nickname community messages" ON public.community_messages FOR INSERT TO anon, authenticated WITH CHECK (channel IN ('public', 'bug', 'idea') AND char_length(btrim(name)) BETWEEN 1 AND 10 AND char_length(btrim(body)) BETWEEN 1 AND 300);
CREATE INDEX community_messages_channel_time ON public.community_messages (channel, created_at DESC);
CREATE FUNCTION public.prepare_community_message() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.name := btrim(NEW.name); NEW.body := btrim(NEW.body); NEW.created_at := now(); IF EXISTS (SELECT 1 FROM public.nickname_warnings WHERE name = NEW.name AND warnings >= 3) THEN NEW.name := '익명'; END IF; RETURN NEW; END $$;
CREATE TRIGGER prepare_community_message BEFORE INSERT ON public.community_messages FOR EACH ROW EXECUTE FUNCTION public.prepare_community_message();
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;