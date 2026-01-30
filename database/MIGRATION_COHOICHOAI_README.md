# 📊 Migration: Cơ Hội Cho AI

File migration này tạo các bảng database cho tab "Cơ Hội Cho AI".

## 🗃️ Các Bảng Được Tạo

### 1. `portfolio_projects` - Dự án Portfolio
Lưu trữ thông tin các dự án trong portfolio:
- `id` - UUID Primary Key
- `name` - Tên dự án
- `industry` - Lĩnh vực
- `price` - Giá thành
- `type` - Loại (APPSHEET/WEBAPP)
- `status` - Trạng thái
- `pitch` - Tóm tắt dự án
- `start_date` - Ngày bắt đầu
- `banner_url` - URL banner
- `media_urls` - JSONB array các URL media
- `vande` - Vấn đề
- `giaiphap` - Giải pháp
- `khacbiet` - USP (Unique Selling Point)

### 2. `capital_allocation` - Phân bổ vốn
Lưu trữ phân bổ vốn cho biểu đồ pie chart:
- `id` - UUID Primary Key
- `label` - Tên mục (VD: "Sản phẩm", "MKT")
- `value` - Giá trị phần trăm (0-100)
- `display_order` - Thứ tự hiển thị

### 3. `growth_data` - Dữ liệu tăng trưởng
Lưu trữ dữ liệu cho biểu đồ line chart:
- `id` - UUID Primary Key
- `year` - Năm (VD: "2026", "2027")
- `value` - Giá trị tăng trưởng

### 4. `financial_metrics` - Chỉ số tài chính
Lưu trữ các chỉ số tài chính quan trọng:
- `id` - UUID Primary Key
- `metric_key` - Key duy nhất (TAM, SAM, SOM, etc.)
- `metric_label` - Label hiển thị
- `metric_value` - Giá trị
- `display_order` - Thứ tự hiển thị

### 5. `investor_content` - Nội dung nhà đầu tư
Lưu trữ nội dung cho các subtab:
- `id` - UUID Primary Key
- `subtab_number` - Số subtab (1-6)
- `title` - Tiêu đề
- `content` - Nội dung

### 6. `investment_details` - Chi tiết đầu tư
Lưu trữ thông tin định giá và equity:
- `id` - UUID Primary Key
- `valuation` - Định giá
- `equity` - Cổ phần

## 🚀 Cách Chạy Migration

### Bước 1: Mở Supabase Dashboard
1. Truy cập: https://app.supabase.com
2. Chọn project của bạn
3. Click vào **SQL Editor** ở sidebar

### Bước 2: Chạy Migration
1. Click **New Query**
2. Copy toàn bộ nội dung từ file `migration_cohoichoai.sql`
3. Paste vào SQL Editor
4. Click **Run** (hoặc nhấn Ctrl+Enter)

### Bước 3: Kiểm tra
1. Click vào **Table Editor**
2. Bạn sẽ thấy 6 bảng mới:
   - ✅ `portfolio_projects`
   - ✅ `capital_allocation`
   - ✅ `growth_data`
   - ✅ `financial_metrics`
   - ✅ `investor_content`
   - ✅ `investment_details`

## 📝 Sample Data

Migration đã bao gồm sample data:
- 1 portfolio project mẫu
- 4 capital allocation items
- 5 growth data points (2026-2030)
- 5 financial metrics
- 4 investor content items
- 1 investment detail

Bạn có thể xóa các dòng INSERT nếu không muốn dữ liệu mẫu.

## 🔐 Security

Tất cả các bảng đã được cấu hình:
- ✅ Row Level Security (RLS) enabled
- ✅ Public access policies (có thể điều chỉnh sau)
- ✅ Auto-update `updated_at` triggers

## 📊 Indexes

Các indexes đã được tạo để tối ưu performance:
- `portfolio_projects`: industry, type, status, created_at
- `capital_allocation`: display_order
- `growth_data`: year
- `financial_metrics`: metric_key, display_order
- `investor_content`: subtab_number

## 🔄 Next Steps

Sau khi chạy migration, bạn cần:
1. Tạo service layer trong `services/cohoichoaiService.ts` để CRUD các bảng này
2. Tích hợp vào component `CoHoiChoAiView.tsx`
3. Thay thế state local bằng database calls
