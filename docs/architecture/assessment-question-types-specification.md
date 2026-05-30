# Assessment Question Types Specification

Version: 1.0

Project: LMS SaaS Platform

Module: Assessment Engine

Status: Approved

---

# 1. Purpose

Tài liệu này định nghĩa toàn bộ các loại câu hỏi được hỗ trợ trong hệ thống Assessment Engine.

Mục tiêu:

* Hỗ trợ mọi môn học
* Hỗ trợ mọi hình thức đánh giá
* Hỗ trợ trường học
* Hỗ trợ trung tâm đào tạo
* Hỗ trợ doanh nghiệp
* Hỗ trợ tuyển dụng
* Hỗ trợ chứng chỉ quốc tế

Không phụ thuộc vào bất kỳ chương trình đào tạo cụ thể nào.

---

# 2. Design Principles

Question Engine phải:

* Mở rộng dễ dàng
* Không hard-code theo môn học
* Không hard-code theo IELTS/TOEIC
* Hỗ trợ auto grading
* Hỗ trợ manual grading
* Hỗ trợ AI grading

---

# 3. Question Categories

## 3.1 Choice Questions

Các câu hỏi lựa chọn.

### single_choice

Mô tả:

Người dùng chọn duy nhất một đáp án.

Ví dụ:

A

B

C

D

Đáp án đúng:

A

Auto Grading:

Có

---

### multiple_choice

Mô tả:

Người dùng chọn nhiều đáp án.

Ví dụ:

A

B

C

D

Đáp án đúng:

A

C

Auto Grading:

Có

---

### true_false

Mô tả:

Đúng hoặc Sai.

Auto Grading:

Có

---

### yes_no

Mô tả:

Có hoặc Không.

Auto Grading:

Có

---

# 3.2 Text Input Questions

Các câu hỏi nhập văn bản.

### fill_blank

Mô tả:

Điền vào chỗ trống.

Ví dụ:

2 + 2 = ____

Auto Grading:

Có

---

### short_answer

Mô tả:

Trả lời ngắn.

Ví dụ:

Thủ đô Việt Nam là gì?

Auto Grading:

Có

---

### numeric_answer

Mô tả:

Trả lời bằng số.

Ví dụ:

100 / 4 = ?

Auto Grading:

Có

---

### paragraph_answer

Mô tả:

Trả lời bằng đoạn văn ngắn.

Auto Grading:

Không

Manual Grading:

Có

---

# 3.3 Matching Questions

### matching_pairs

Ghép cặp.

Ví dụ:

HTML → Markup

CSS → Styling

JS → Logic

Auto Grading:

Có

---

### matching_headings

Ghép tiêu đề.

Auto Grading:

Có

---

### matching_information

Ghép thông tin.

Auto Grading:

Có

---

### matching_features

Ghép thuộc tính.

Auto Grading:

Có

---

# 3.4 Ordering Questions

### sequence_order

Sắp xếp thứ tự.

Ví dụ:

Requirement

Design

Development

Testing

Auto Grading:

Có

---

### drag_drop_order

Sắp xếp bằng kéo thả.

Auto Grading:

Có

---

# 3.5 Labeling Questions

### image_labeling

Gắn nhãn lên hình ảnh.

Auto Grading:

Có

---

### diagram_labeling

Gắn nhãn lên sơ đồ.

Auto Grading:

Có

---

### map_labeling

Gắn nhãn trên bản đồ.

Auto Grading:

Có

---

# 3.6 Essay Questions

### essay

Bài luận.

Ví dụ:

Phân tích vai trò của AI trong giáo dục.

Auto Grading:

Không

Manual Grading:

Có

AI Grading:

Có

---

### case_study

Phân tích tình huống.

Ví dụ:

Phân tích Case Study về chiến lược Marketing.

Auto Grading:

Không

Manual Grading:

Có

AI Grading:

Có

---

# 3.7 Media Questions

### audio_response

Người học ghi âm câu trả lời.

Auto Grading:

Không

Manual Grading:

Có

AI Grading:

Có

---

### video_response

Người học quay video trả lời.

Auto Grading:

Không

Manual Grading:

Có

AI Grading:

Có

---

### audio_comprehension

Nghe audio và trả lời câu hỏi.

Auto Grading:

Tùy loại đáp án.

---

### video_comprehension

Xem video và trả lời câu hỏi.

Auto Grading:

Tùy loại đáp án.

---

# 3.8 File Submission Questions

### file_upload

Người học tải file lên.

Hỗ trợ:

* PDF
* DOCX
* XLSX
* PPTX
* ZIP
* PNG
* JPG

Auto Grading:

Không

Manual Grading:

Có

---

# 3.9 Programming Questions

### coding

Viết mã nguồn.

Hỗ trợ:

* JavaScript
* TypeScript
* Python
* Java
* C#
* PHP
* Go

Auto Grading:

Có

Thông qua Test Cases.

---

### sql_query

Viết câu lệnh SQL.

Auto Grading:

Có

---

### debug_code

Tìm lỗi và sửa lỗi.

Auto Grading:

Có

---

# 3.10 Interactive Questions

### spreadsheet_task

Bài tập Excel.

Manual Grading:

Có

---

### formula_builder

Xây dựng công thức.

Áp dụng:

* Toán
* Vật lý
* Hóa học

Auto Grading:

Có

---

### drawing

Vẽ sơ đồ.

Ví dụ:

ERD

Flowchart

UML

Manual Grading:

Có

---

# 3.11 Survey Questions

### rating_scale

Đánh giá theo thang điểm.

Ví dụ:

1 → 5

Auto Grading:

Không

---

### likert_scale

Hoàn toàn đồng ý

Đồng ý

Trung lập

Không đồng ý

Hoàn toàn không đồng ý

Auto Grading:

Không

---

### nps

Net Promoter Score

Thang điểm:

0 → 10

Auto Grading:

Không

---

# 4. Recommended MVP

Các loại câu hỏi triển khai ở Phase 1.

single_choice

multiple_choice

true_false

fill_blank

short_answer

matching_pairs

sequence_order

essay

file_upload

audio_response

---

# 5. Recommended Phase 2

image_labeling

diagram_labeling

video_response

coding

sql_query

spreadsheet_task

rating_scale

likert_scale

---

# 6. Database Strategy

Không lưu logic loại câu hỏi trong source code.

Sử dụng bảng:

question_types

---

Cấu trúc:

id

code

name

category

is_active

created_at

updated_at

---

Ví dụ dữ liệu:

single_choice

multiple_choice

essay

coding

audio_response

file_upload

---

# 7. Future Expansion

Question Engine phải hỗ trợ mở rộng mà không thay đổi schema.

Các loại câu hỏi mới trong tương lai:

* AI Conversation
* Simulation
* VR Assessment
* Interactive Lab
* Whiteboard Assessment

Hệ thống phải cho phép thêm mới thông qua cấu hình và metadata.
