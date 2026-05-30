# LMS SaaS Platform

## Business Analysis Document (Phase 1 - Foundation Architecture)

### Version

1.0

### Author

Business Analyst

### Date

30/05/2026

---

# 1. Tổng quan dự án

## 1.1 Mục tiêu

Xây dựng nền tảng LMS SaaS cho phép nhiều tổ chức (doanh nghiệp, trung tâm đào tạo, trường học, cá nhân) sử dụng chung một hệ thống nhưng dữ liệu được tách biệt hoàn toàn.

Giai đoạn đầu tập trung phát triển Module Test Platform.

Hệ thống phải được thiết kế theo kiến trúc SaaS ngay từ đầu để hỗ trợ:

* Multi Tenant
* Subscription Billing
* Role Permission
* Organization Management
* Future LMS Module
* Future CRM Module

---

# 2. Phạm vi giai đoạn 1

## In Scope

### Test Platform

* Quản lý câu hỏi
* Quản lý ngân hàng câu hỏi
* Quản lý đề thi
* Quản lý học viên
* Giao đề thi
* Làm bài thi trực tuyến
* Chấm điểm tự động
* Báo cáo kết quả

### SaaS Core

* Authentication
* Organization
* Membership
* Permission
* Subscription

---

## Out Of Scope

### LMS

* Khóa học
* Video bài giảng
* Assignment
* Learning Path
* Certificate

### CRM

* Lead Management
* Customer Management
* Sales Pipeline

---

# 3. Business Goals

## Goal 1

Cho phép khách hàng tự đăng ký và sử dụng nền tảng.

## Goal 2

Hỗ trợ nhiều tổ chức trên cùng hệ thống.

## Goal 3

Tạo nguồn doanh thu định kỳ theo tháng hoặc năm.

## Goal 4

Có thể mở rộng thành LMS và CRM trong tương lai mà không cần thay đổi kiến trúc.

---

# 4. SaaS Architecture

## Khái niệm Tenant

Tenant là một tổ chức sử dụng hệ thống.

Ví dụ:

* Công ty A
* Trung tâm B
* Trường học C

Mỗi tenant có:

* User riêng
* Học viên riêng
* Câu hỏi riêng
* Đề thi riêng
* Báo cáo riêng

Dữ liệu không được phép nhìn thấy lẫn nhau.

---

# 5. Organization Management

## Mô tả

Mọi dữ liệu trong hệ thống đều thuộc về một Organization.

## Chức năng

### Tạo Organization

Người dùng đăng ký tài khoản.

Hệ thống tự động tạo:

* Organization
* Owner Account

### Cập nhật Organization

Owner có thể:

* Đổi tên tổ chức
* Đổi logo
* Cập nhật thông tin

---

# 6. User Management

## Vai trò

### Owner

Quyền cao nhất.

Có thể:

* Quản lý subscription
* Quản lý người dùng
* Quản lý toàn bộ dữ liệu

---

### Admin

Quản lý vận hành.

Có thể:

* Quản lý đề thi
* Quản lý câu hỏi
* Quản lý học viên

Không được:

* Quản lý thanh toán

---

### Teacher

Có thể:

* Tạo câu hỏi
* Tạo đề thi
* Giao đề thi
* Xem kết quả

---

### Student

Có thể:

* Đăng nhập
* Làm bài thi
* Xem kết quả

---

# 7. Permission Matrix

| Chức năng          | Owner | Admin | Teacher | Student |
| ------------------ | ----- | ----- | ------- | ------- |
| Quản lý tổ chức    | Yes   | No    | No      | No      |
| Quản lý người dùng | Yes   | Yes   | No      | No      |
| Quản lý câu hỏi    | Yes   | Yes   | Yes     | No      |
| Quản lý đề thi     | Yes   | Yes   | Yes     | No      |
| Giao đề thi        | Yes   | Yes   | Yes     | No      |
| Làm bài thi        | No    | No    | No      | Yes     |
| Xem báo cáo        | Yes   | Yes   | Yes     | Limited |

---

# 8. Subscription Management

## Mục tiêu

Thu phí người dùng theo gói.

---

## Gói Free

Giới hạn:

* 20 học viên
* 5 đề thi
* 100 câu hỏi

---

## Gói Pro

Không giới hạn hoặc giới hạn cao hơn.

Ví dụ:

* 1000 học viên
* 500 đề thi
* 10000 câu hỏi

---

## Gói Enterprise

Tùy chỉnh.

Bao gồm:

* White Label
* API
* SSO

---

# 9. Module Test Platform

## Question Bank

### Chức năng

Tạo ngân hàng câu hỏi.

### Loại câu hỏi

* Single Choice
* Multiple Choice
* True/False
* Fill In Blank
* Essay

---

## Exam Management

### Chức năng

Tạo đề thi.

Thông tin:

* Tên đề
* Mô tả
* Thời gian làm bài
* Tổng điểm

---

## Student Management

### Chức năng

* Tạo học viên
* Import Excel
* Gửi tài khoản

---

## Assignment

### Chức năng

Giao đề thi cho học viên.

Thông tin:

* Học viên
* Thời gian bắt đầu
* Thời gian kết thúc

---

## Exam Taking

### Chức năng

Học viên:

* Đăng nhập
* Xem đề được giao
* Làm bài
* Nộp bài

---

## Result

### Chức năng

Hiển thị:

* Điểm số
* Số câu đúng
* Số câu sai
* Thời gian làm bài

---

# 10. Security Requirements

## Data Isolation

Người dùng chỉ được truy cập dữ liệu thuộc Organization của mình.

---

## Role Based Access Control

Kiểm tra quyền truy cập ở:

* Frontend
* Backend
* Database

---

## Audit Log

Ghi nhận:

* Login
* Tạo đề thi
* Xóa dữ liệu
* Chỉnh sửa dữ liệu

---

# 11. Non Functional Requirements

## Performance

* Trang tải dưới 3 giây
* Hỗ trợ tối thiểu 1000 người dùng đồng thời

---

## Availability

* Uptime 99.9%

---

## Scalability

Có thể mở rộng:

* LMS Module
* CRM Module
* Mobile App

---

# 12. Future Roadmap

## Phase 2

### LMS Module

* Khóa học
* Video
* Quiz
* Assignment

---

## Phase 3

### CRM Module

* Leads
* Customers
* Pipeline
* Sales Report

---

# 13. Kiến trúc dữ liệu bắt buộc

Tất cả bảng nghiệp vụ phải có:

* id
* organization_id
* created_by
* created_at
* updated_at

Ví dụ:

Questions
Exams
Students
Results

Điều này đảm bảo hệ thống hoạt động đúng mô hình Multi Tenant SaaS.
