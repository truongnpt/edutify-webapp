# Assessment Engine Specification

Version: 1.0

Project: LMS SaaS Platform

Tech Stack:

* Next.js
* TypeScript
* Supabase
* PostgreSQL

---

# 1. Mục tiêu

Xây dựng Assessment Engine có thể hỗ trợ:

* Trường học
* Trung tâm đào tạo
* Doanh nghiệp
* Hệ thống tuyển dụng
* Hệ thống cấp chứng chỉ

Assessment Engine phải độc lập với môn học.

Không được thiết kế riêng cho:

* IELTS
* TOEIC
* Tiếng Anh

Mà phải hỗ trợ mọi lĩnh vực đào tạo.

---

# 2. Business Requirements

Hệ thống phải hỗ trợ:

## Giáo dục phổ thông

* Toán
* Lý
* Hóa
* Sinh
* Văn
* Sử
* Địa
* Ngoại ngữ

## Đại học

* CNTT
* Luật
* Kinh tế
* Marketing
* Kế toán

## Doanh nghiệp

* Đào tạo nội bộ
* Compliance
* Onboarding
* KPI Assessment

## Tuyển dụng

* IQ Test
* Technical Test
* Aptitude Test

## Chứng chỉ

* IELTS
* TOEIC
* MOS
* AWS
* PMP

---

# 3. Assessment Domain Model

Organization

└── Question Bank

```
└── Question Group

    └── Question

        └── Answer

            └── Score
```

---

# 4. Question Bank

## Mục đích

Lưu trữ câu hỏi theo:

* Môn học
* Chuyên đề
* Chương
* Kỹ năng

Ví dụ:

Toán lớp 10

Tiếng Anh B1

JavaScript Basics

AWS Associate

---

# 5. Question Group

Một nhóm câu hỏi dùng chung tài nguyên.

Ví dụ:

Passage

Audio

Image

Video

Case Study

Document

---

Ví dụ:

Case Study ABC

Question 1

Question 2

Question 3

Question 4

---

# 6. Question Types

## Choice

single_choice

multiple_choice

true_false

yes_no

---

## Text Input

fill_blank

short_answer

paragraph_answer

---

## Matching

matching_pairs

matching_headings

matching_features

matching_information

---

## Ordering

drag_drop_order

sequence_order

---

## Labeling

image_labeling

diagram_labeling

map_labeling

---

## Essay

essay

---

## File Submission

file_upload

---

## Audio

audio_response

---

## Coding

coding

---

## Spreadsheet

spreadsheet_task

---

# 7. Question Structure

Question

id

organization_id

question_type

title

content

metadata

answer_schema

scoring_schema

difficulty

status

created_by

created_at

updated_at

---

# 8. Metadata Design

Metadata phải sử dụng JSONB.

Ví dụ:

{
"allowCalculator": true,
"allowMultipleAttempts": false,
"timeLimit": 60
}

---

# 9. Answer Schema

Single Choice

{
"correctAnswer": "A"
}

---

Multiple Choice

{
"correctAnswers": [
"A",
"C"
]
}

---

Short Answer

{
"acceptedAnswers": [
"London",
"LONDON"
]
}

---

Matching

{
"answers": {
"A": "2",
"B": "1"
}
}

---

# 10. Scoring Schema

Simple

{
"score": 1
}

---

Weighted

{
"correctScore": 5,
"wrongScore": 0
}

---

Negative Marking

{
"correctScore": 4,
"wrongScore": -1
}

---

Rubric

{
"criteria": [
"Accuracy",
"Completeness",
"Reasoning"
]
}

---

# 11. Difficulty Levels

Easy

Medium

Hard

Expert

---

# 12. Subject Structure

subjects

id

organization_id

name

code

description

---

Ví dụ:

MATH

ENGLISH

PHYSICS

CHEMISTRY

PROGRAMMING

---

# 13. Topics

topics

id

subject_id

parent_id

name

---

Ví dụ:

Toán

└── Đại số

└── Hình học

---

# 14. Tags

tags

id

name

---

Ví dụ:

Beginner

Advanced

AWS

ReactJS

IELTS

---

# 15. Exam Engine

Exam

└── Sections

```
└── Question Groups

    └── Questions
```

---

Ví dụ:

Exam

Part 1

Question 1

Question 2

Question 3

---

Part 2

Question 4

Question 5

---

# 16. Attempt Engine

Attempt

└── Answers

└── Score

└── Logs

---

Hỗ trợ:

Auto Save

Resume

Review

Submit

---

# 17. Grading Engine

Auto Grading

Manual Grading

AI Grading

Hybrid Grading

---

# 18. Analytics Engine

Theo học viên

Theo lớp

Theo đề thi

Theo môn học

Theo câu hỏi

---

# 19. AI Ready Requirements

Question Generation

Question Classification

Difficulty Prediction

Essay Grading

Speaking Evaluation

Feedback Generation

---

# 20. Multi Tenant Requirements

Mọi bảng nghiệp vụ phải có:

organization_id

---

Bắt buộc áp dụng:

Supabase RLS

---

Không cho phép:

Tenant A

truy cập dữ liệu

Tenant B

---

# 21. Performance Requirements

1000+ Organizations

100000+ Students

1000000+ Attempts

---

Page Load

< 3s

---

API Response

< 500ms

---

# 22. Future LMS Integration

Assessment Engine phải hoạt động độc lập.

Sau này có thể kết nối với:

Course

Lesson

Assignment

Certificate

mà không thay đổi kiến trúc hiện tại.

---

# 23. Future CRM Integration

Assessment Result

↓

Lead Score

↓

Customer Qualification

↓

CRM Pipeline

không cần thay đổi database.
