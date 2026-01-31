# 🔧 Cấu hình Environment Variables

## Vấn đề: Lỗi kết nối Supabase

Nếu bạn gặp lỗi "Không thể kết nối tới Supabase", có thể do chưa cấu hình biến môi trường.

## Cách khắc phục:

### Bước 1: Tạo file `.env.local`

Tạo file `.env.local` trong thư mục `protrack-ai---quản-lý-dự-án-thông-minh` với nội dung:

```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Bước 2: Lấy thông tin Supabase

1. Truy cập https://app.supabase.com
2. Đăng nhập và chọn project của bạn
3. Vào **Settings** > **API**
4. Copy các giá trị:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Bước 3: Lấy Gemini API Key (Tùy chọn)

1. Truy cập https://makersuite.google.com/app/apikey
2. Tạo API key mới
3. Copy vào `GEMINI_API_KEY`

### Bước 4: Khởi động lại server

Sau khi tạo file `.env.local`, khởi động lại server:

```bash
npm run dev
```

## Lưu ý:

- File `.env.local` không được commit lên Git (đã có trong .gitignore)
- Không chia sẻ file `.env.local` với người khác
- Nếu vẫn gặp lỗi, kiểm tra:
  - Kết nối Internet
  - DNS/VPN settings
  - Supabase project có đang hoạt động không
