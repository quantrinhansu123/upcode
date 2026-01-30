-- Create employees table (Quản lý nhân sự)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  position VARCHAR(100),
  avatar_url TEXT,
  qr_code_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional, currently public for dev)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy to allow all access for now (dev mode)
CREATE POLICY "Allow all access" ON employees FOR ALL USING (true);
