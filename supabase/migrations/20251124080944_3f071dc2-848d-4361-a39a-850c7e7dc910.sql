-- PHASE 2: Database Schema for EduSpark/Aether Project Persistence

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_files table
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'plaintext',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, path)
);

-- Enable RLS (allowing anonymous access for now, per requirements)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Create policies allowing public access (anonymous projects)
CREATE POLICY "Allow public read access to projects"
  ON public.projects
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to projects"
  ON public.projects
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public read access to project_files"
  ON public.project_files
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to project_files"
  ON public.project_files
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to project_files"
  ON public.project_files
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete to project_files"
  ON public.project_files
  FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();