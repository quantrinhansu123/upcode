-- Migration: Cơ Hội Cho AI - Portfolio và Investment Data
-- Tạo các bảng để lưu trữ dữ liệu cho tab "Cơ Hội Cho AI"

-- Enable UUID extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Bảng Portfolio Projects (Dự án Portfolio)
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  industry VARCHAR(255) NOT NULL,
  price VARCHAR(100),
  type VARCHAR(50) NOT NULL DEFAULT 'APPSHEET', -- APPSHEET hoặc WEBAPP
  status VARCHAR(100) NOT NULL DEFAULT '✅ ĐANG HOẠT ĐỘNG',
  pitch TEXT,
  start_date VARCHAR(50),
  banner_url TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb, -- Mảng các URL hình ảnh/video
  vande TEXT, -- Vấn đề
  giaiphap TEXT, -- Giải pháp
  khacbiet TEXT, -- USP (Unique Selling Point)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes cho portfolio_projects
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_industry ON portfolio_projects(industry);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_type ON portfolio_projects(type);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_status ON portfolio_projects(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_created_at ON portfolio_projects(created_at);

-- ============================================
-- 2. Bảng Capital Allocation (Phân bổ vốn)
-- ============================================
CREATE TABLE IF NOT EXISTS capital_allocation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(255) NOT NULL,
  value DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (value >= 0 AND value <= 100),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index cho capital_allocation
CREATE INDEX IF NOT EXISTS idx_capital_allocation_order ON capital_allocation(display_order);

-- ============================================
-- 3. Bảng Growth Data (Dữ liệu tăng trưởng)
-- ============================================
CREATE TABLE IF NOT EXISTS growth_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year VARCHAR(10) NOT NULL UNIQUE, -- 2026, 2027, etc.
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index cho growth_data
CREATE INDEX IF NOT EXISTS idx_growth_data_year ON growth_data(year);

-- ============================================
-- 4. Bảng Financial Metrics (Chỉ số tài chính)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_key VARCHAR(100) NOT NULL UNIQUE, -- TAM, SAM, SOM, profit_margin, valuation_stage
  metric_label VARCHAR(255) NOT NULL,
  metric_value VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index cho financial_metrics
CREATE INDEX IF NOT EXISTS idx_financial_metrics_key ON financial_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_order ON financial_metrics(display_order);

-- ============================================
-- 5. Bảng Investor Content (Nội dung nhà đầu tư)
-- ============================================
CREATE TABLE IF NOT EXISTS investor_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtab_number INTEGER NOT NULL CHECK (subtab_number BETWEEN 1 AND 6),
  title VARCHAR(500),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subtab_number)
);

-- Index cho investor_content
CREATE INDEX IF NOT EXISTS idx_investor_content_subtab ON investor_content(subtab_number);

-- ============================================
-- 6. Bảng Investment Details (Chi tiết đầu tư)
-- ============================================
CREATE TABLE IF NOT EXISTS investment_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valuation VARCHAR(100), -- Định giá
  equity VARCHAR(100), -- Cổ phần
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_details ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Cho phép public access
-- ============================================

-- Portfolio Projects policies
CREATE POLICY "Enable read access for all users" ON portfolio_projects
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON portfolio_projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON portfolio_projects
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON portfolio_projects
  FOR DELETE USING (true);

-- Capital Allocation policies
CREATE POLICY "Enable read access for all users" ON capital_allocation
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON capital_allocation
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON capital_allocation
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON capital_allocation
  FOR DELETE USING (true);

-- Growth Data policies
CREATE POLICY "Enable read access for all users" ON growth_data
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON growth_data
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON growth_data
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON growth_data
  FOR DELETE USING (true);

-- Financial Metrics policies
CREATE POLICY "Enable read access for all users" ON financial_metrics
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON financial_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON financial_metrics
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON financial_metrics
  FOR DELETE USING (true);

-- Investor Content policies
CREATE POLICY "Enable read access for all users" ON investor_content
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON investor_content
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON investor_content
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON investor_content
  FOR DELETE USING (true);

-- Investment Details policies
CREATE POLICY "Enable read access for all users" ON investment_details
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON investment_details
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON investment_details
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON investment_details
  FOR DELETE USING (true);

-- ============================================
-- Triggers để tự động cập nhật updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portfolio_projects_updated_at
  BEFORE UPDATE ON portfolio_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_capital_allocation_updated_at
  BEFORE UPDATE ON capital_allocation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_growth_data_updated_at
  BEFORE UPDATE ON growth_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_financial_metrics_updated_at
  BEFORE UPDATE ON financial_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_investor_content_updated_at
  BEFORE UPDATE ON investor_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_investment_details_updated_at
  BEFORE UPDATE ON investment_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Insert Sample Data (Optional)
-- ============================================

-- Sample Portfolio Project
INSERT INTO portfolio_projects (name, industry, price, type, status, pitch, start_date, banner_url, vande, giaiphap, khacbiet)
VALUES (
  'QUẢN LÝ KHO THÔNG MINH',
  'Sản xuất',
  '5.000.000',
  'APPSHEET',
  '✅ ĐANG HOẠT ĐỘNG',
  'Giảm tồn kho và tối ưu quy trình quản lý kho hàng',
  '01/2026',
  'https://via.placeholder.com/400x300',
  'Quản lý kho thủ công gây lãng phí thời gian và sai sót',
  'Ứng dụng AppSheet tự động hóa quy trình quản lý kho',
  'Real-time tracking và báo cáo tự động'
)
ON CONFLICT DO NOTHING;

-- Sample Capital Allocation
INSERT INTO capital_allocation (label, value, display_order)
VALUES
  ('Sản phẩm', 40, 1),
  ('MKT', 30, 2),
  ('Nhân sự', 20, 3),
  ('Vận hành', 10, 4)
ON CONFLICT DO NOTHING;

-- Sample Growth Data
INSERT INTO growth_data (year, value)
VALUES
  ('2026', 15),
  ('2027', 35),
  ('2028', 70),
  ('2029', 120),
  ('2030', 200)
ON CONFLICT (year) DO UPDATE SET value = EXCLUDED.value;

-- Sample Financial Metrics
INSERT INTO financial_metrics (metric_key, metric_label, metric_value, display_order)
VALUES
  ('TAM', '🌍 TAM (Tổng thị trường)', '100 TR USD', 1),
  ('SAM', '🎯 SAM (Tiếp cận)', '20 TR USD', 2),
  ('SOM', '🎯 SOM (Mục tiêu)', '5 TR USD', 3),
  ('profit_margin', '📈 Lợi nhuận dự kiến', '35% / Năm', 4),
  ('valuation_stage', '🚀 Giai đoạn định giá', 'SEED ROUND', 5)
ON CONFLICT (metric_key) DO UPDATE SET metric_value = EXCLUDED.metric_value;

-- Sample Investment Details
INSERT INTO investment_details (valuation, equity)
VALUES ('$XXXk', '10-15%')
ON CONFLICT DO NOTHING;

-- Sample Investor Content
INSERT INTO investor_content (subtab_number, title, content)
VALUES
  (1, 'Phân tích cơ hội thị trường', 'Dữ liệu TAM/SAM/SOM chi tiết...'),
  (2, 'Traction & Thành tích', 'Doanh thu, tốc độ tăng trưởng...'),
  (4, 'Dự báo tài chính 5 năm', 'Chi tiết dự báo tài chính...'),
  (5, 'Đội ngũ & Tầm nhìn', 'Thông tin về đội ngũ và tầm nhìn...')
ON CONFLICT (subtab_number) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content;
