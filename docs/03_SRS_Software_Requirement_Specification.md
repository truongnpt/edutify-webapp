# SOFTWARE REQUIREMENT SPECIFICATION (SRS)

# LMS SaaS Platform

## Module: Test Platform

### Version 1.0

---

# 1. Introduction

## 1.1 Purpose

Tài liệu này mô tả các yêu cầu chức năng và phi chức năng của nền tảng LMS SaaS.

Giai đoạn 1 tập trung vào Module Test Platform.

Mục tiêu:

* Hỗ trợ nhiều tổ chức trên cùng hệ thống.
* Quản lý câu hỏi và đề thi.
* Hỗ trợ học viên làm bài trực tuyến.
* Chấm điểm tự động.
* Hỗ trợ subscription SaaS.

---

# 2. System Architecture

## 2.1 Architecture Pattern

SaaS Multi-Tenant

Frontend:

* Next.js

Backend:

* Supabase

Database:

* PostgreSQL

Authentication:

* Supabase Auth

Storage:

* Supabase Storage

---

# 3. Actors

## Owner

Quản lý toàn bộ hệ thống của tổ chức.

---

## Admin

Quản lý vận hành.

---

## Teacher

Tạo và quản lý đề thi.

---

## Student

Làm bài thi.

---

# 4. Functional Requirements

# FR-01 Authentication

## Description

Người dùng đăng ký và đăng nhập hệ thống.

### Input

* Email
* Password

### Output

* JWT Session
* User Profile

### Acceptance Criteria

* Email duy nhất
* Mật khẩu tối thiểu 8 ký tự
* Hỗ trợ quên mật khẩu

---

# FR-02 Organization Management

## Description

Mỗi tài khoản sở hữu một Organization.

### Create Organization

Input:

* Organization Name

Output:

* Organization Record

### Acceptance Criteria

* Tự động tạo khi đăng ký
* Owner được gán mặc định

---

# FR-03 Member Management

## Description

Owner/Admin có thể mời thành viên.

### Create Member

Input:

* Email
* Role

Output:

* Invitation

### Roles

* Owner
* Admin
* Teacher

---

# FR-04 Question Bank

## Description

Quản lý ngân hàng câu hỏi.

---

### Create Question Bank

Input

* Name
* Description

Output

* Question Bank

---

### Edit Question Bank

### Delete Question Bank

---

# FR-05 Question Management

## Description

Quản lý câu hỏi.

---

### Question Types

single_choice

multiple_choice

true_false

essay

fill_blank

---

### Create Question

Input:

* Type
* Content
* Explanation
* Difficulty
* Options

Output:

* Question

---

### Validation

Single Choice

* Chỉ 1 đáp án đúng

Multiple Choice

* Nhiều đáp án đúng

Essay

* Không cần đáp án

---

# FR-06 Exam Management

## Description

Quản lý đề thi.

---

### Create Exam

Input

* Title
* Description
* Duration
* Pass Score

Output

* Exam

---

### Add Questions

Teacher chọn câu hỏi từ Question Bank.

---

### Remove Questions

Teacher có thể gỡ câu hỏi khỏi đề.

---

# FR-07 Student Management

## Description

Quản lý học viên.

---

### Create Student

Input

* Full Name
* Email

Output

* Student

---

### Import Student

Input

* Excel File

Output

* Student List

---

# FR-08 Exam Assignment

## Description

Giao đề thi cho học viên.

---

### Assign Exam

Input

* Exam
* Student
* Start Time
* End Time

Output

* Assignment

---

### Validation

Không được giao đề thi đã bị xóa.

---

# FR-09 Exam Taking

## Description

Học viên thực hiện bài thi.

---

### Start Exam

Validation:

* Đề tồn tại
* Trong thời gian cho phép

---

### Save Answer

Hệ thống tự động lưu.

Interval:

10 giây

---

### Submit Exam

Input

* Answers

Output

* Result

---

# FR-10 Auto Grading

## Description

Tự động chấm điểm.

---

### Supported Types

Single Choice

Multiple Choice

True False

Fill Blank

---

### Not Supported

Essay

Teacher chấm thủ công.

---

# FR-11 Result Management

## Description

Xem kết quả thi.

---

Output:

* Total Score
* Correct Answers
* Wrong Answers
* Duration

---

# FR-12 Subscription

## Description

Quản lý gói dịch vụ.

---

### Free Plan

20 Students

5 Exams

100 Questions

---

### Pro Plan

Configurable

---

### Validation

Khi vượt quota:

Hiển thị thông báo nâng cấp gói.

---

# 5. Use Cases

# UC-01 Create Question

Actor:

Teacher

Flow:

1. Teacher vào Question Bank
2. Chọn Create Question
3. Nhập thông tin
4. Save

Result:

Question được tạo.

---

# UC-02 Create Exam

Actor:

Teacher

Flow:

1. Chọn Create Exam
2. Nhập thông tin
3. Chọn câu hỏi
4. Save

Result:

Exam được tạo.

---

# UC-03 Assign Exam

Actor:

Teacher

Flow:

1. Chọn Exam
2. Chọn Student
3. Assign

Result:

Assignment được tạo.

---

# UC-04 Take Exam

Actor:

Student

Flow:

1. Login
2. Start Exam
3. Answer Questions
4. Submit

Result:

Exam Attempt được tạo.

---

# 6. Database Design

## organizations

* id
* name
* logo_url
* plan_id
* owner_id

---

## organization_members

* id
* organization_id
* user_id
* role

---

## question_banks

* id
* organization_id
* name

---

## questions

* id
* organization_id
* bank_id
* type
* content
* explanation

---

## question_options

* id
* question_id
* content
* is_correct

---

## exams

* id
* organization_id
* title
* duration_minutes
* pass_score

---

## exam_questions

* id
* exam_id
* question_id
* score

---

## students

* id
* organization_id
* full_name
* email

---

## exam_assignments

* id
* exam_id
* student_id
* start_time
* end_time

---

## exam_attempts

* id
* exam_id
* student_id
* score
* started_at
* submitted_at

---

## attempt_answers

* id
* attempt_id
* question_id
* answer_data

---

# 7. Security Requirements

## SR-01 Multi Tenant Isolation

Mọi truy vấn phải lọc theo:

organization_id

---

## SR-02 Role Permission

Owner

Admin

Teacher

Student

---

## SR-03 Row Level Security

Supabase RLS bắt buộc bật trên tất cả bảng nghiệp vụ.

---

# 8. Non Functional Requirements

Performance:

Page Load < 3s

---

Availability:

99.9%

---

Scalability:

100 Organizations

10,000 Students

100,000 Attempts

---

# 9. Future Expansion

LMS Module

* Courses
* Lessons
* Assignments
* Certificates

CRM Module

* Leads
* Customers
* Sales Pipeline

Không thay đổi cấu trúc Organization hiện tại.
