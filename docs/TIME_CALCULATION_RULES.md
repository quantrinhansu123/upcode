# Quy Tắc Tính Thời Gian Làm Việc

## Tổng Quan

Ứng dụng ProTrack AI sử dụng hệ thống **Work Sessions** để theo dõi thời gian làm việc trên mỗi task. Mỗi task có thể có nhiều phiên làm việc (sessions) khác nhau.

## Cấu Trúc Dữ Liệu

### Work Session
Mỗi session bao gồm:
- `startedAt`: Thời điểm bắt đầu phiên làm việc
- `endedAt`: Thời điểm kết thúc phiên làm việc (null nếu đang chạy)

### Task Fields
- `sessions`: Mảng các work sessions
- `startedAt`: Thời điểm bắt đầu làm việc (legacy field, để tương thích)
- `hoursWorked`: Tổng số giờ làm việc (chỉ được lưu khi task hoàn thành)

## Quy Tắc Tính Toán

### 1. Tính Thời Gian Đã Làm (Khi Task Đã Tạm Dừng)

Khi task đã tạm dừng (không có session nào đang chạy):

```typescript
totalWorkedMinutes = sum của tất cả các sessions đã kết thúc
```

**Công thức:**
```
totalWorkedMinutes = Σ (endedAt - startedAt) cho mỗi session có endedAt
```

**Ví dụ:**
- Session 1: 09:00 - 10:30 = 90 phút
- Session 2: 14:00 - 15:15 = 75 phút
- **Tổng:** 165 phút = 2h 45m

### 2. Tính Thời Gian Đang Chạy (Khi Task Đang Làm Việc)

Khi task đang chạy (có session đang active):

```typescript
previousMinutes = sum của tất cả các sessions đã kết thúc
currentMinutes = thời gian hiện tại - startedAt của session đang chạy
totalMinutes = previousMinutes + currentMinutes
```

**Công thức:**
```
totalMinutes = Σ (endedAt - startedAt) + (now - currentSession.startedAt)
```

**Ví dụ:**
- Session 1 (đã kết thúc): 09:00 - 10:30 = 90 phút
- Session 2 (đang chạy): 14:00 - hiện tại (15:30) = 90 phút
- **Tổng:** 180 phút = 3h 0m

### 3. Tính Thời Gian Khi Hoàn Thành Task

Khi người dùng hoàn thành task, hệ thống tính toán:

```typescript
// Từ các sessions đã kết thúc
previousMinutes = Σ (endedAt - startedAt) cho sessions có endedAt

// Từ session đang chạy (nếu có)
currentMinutes = now - startedAt (nếu task đang chạy)

// Tổng
totalMinutes = previousMinutes + currentMinutes
totalHours = totalMinutes / 60
```

**Lưu ý:** Người dùng có thể chỉnh sửa số giờ trước khi xác nhận hoàn thành.

## Luồng Hoạt Động

### Bắt Đầu Làm Việc
1. Người dùng click "Bắt đầu" hoặc "Tiếp tục"
2. Hệ thống tạo một **work session mới** với `startedAt = now`
3. Session này chưa có `endedAt` (đang active)

### Tạm Dừng
1. Người dùng click "Tạm dừng"
2. Hệ thống tìm session đang active (không có `endedAt`)
3. Cập nhật `endedAt = now` cho session đó
4. Task chuyển sang trạng thái "paused"

### Hoàn Thành
1. Người dùng click "Hoàn thành"
2. Hệ thống tính toán tổng thời gian từ tất cả sessions
3. Hiển thị modal cho phép chỉnh sửa số giờ
4. Lưu `hoursWorked` vào database
5. Đánh dấu task là `isCompleted = true`

## Hiển Thị Thời Gian

### Khi Task Đang Chạy
- Hiển thị **TaskTimer** component
- Cập nhật mỗi phút
- Format: `Xh Ym` (ví dụ: "2h 30m")

### Khi Task Đã Tạm Dừng
- Hiển thị: "Đã làm: Xh Ym"
- Tính từ các sessions đã kết thúc

### Khi Task Đã Hoàn Thành
- Hiển thị: "X giờ" (từ field `hoursWorked`)
- Đây là giá trị cuối cùng được lưu khi hoàn thành

## Tổng Thời Gian (Dashboard)

Tổng thời gian làm việc trên dashboard được tính:

```typescript
totalHours = Σ (task.hoursWorked) cho tất cả tasks đã hoàn thành
```

**Lưu ý:** Chỉ tính các task đã hoàn thành (`isCompleted = true`).

## Lưu Ý Kỹ Thuật

1. **Đơn vị tính:** Tất cả tính toán đều dùng **phút** (minutes), sau đó chuyển sang giờ/phút để hiển thị
2. **Timezone:** Tất cả timestamps đều lưu với timezone (TIMESTAMP WITH TIME ZONE)
3. **Legacy Support:** Vẫn hỗ trợ field `startedAt` cũ để tương thích
4. **Active Session:** Một task chỉ có thể có **một session active** tại một thời điểm

## Ví Dụ Thực Tế

### Scenario 1: Làm việc liên tục
- 09:00 - Bắt đầu
- 12:00 - Tạm dừng (3 giờ)
- 14:00 - Tiếp tục
- 16:30 - Hoàn thành (2.5 giờ)
- **Tổng:** 5.5 giờ

### Scenario 2: Nhiều phiên làm việc
- Session 1: 09:00 - 10:00 (1h)
- Session 2: 11:00 - 12:30 (1.5h)
- Session 3: 14:00 - 15:45 (1.75h)
- **Tổng:** 4.25 giờ = 4h 15m

### Scenario 3: Đang làm việc
- Session 1 (đã kết thúc): 09:00 - 10:00 (1h)
- Session 2 (đang chạy): 14:00 - hiện tại 15:30 (1.5h)
- **Tổng hiện tại:** 2.5 giờ (đang tăng dần)
