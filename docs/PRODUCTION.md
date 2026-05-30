# Hướng dẫn triển khai production

Tài liệu này mô tả các bước đưa monorepo **Next.js + Supabase** (Makerkit Lite) lên môi trường thật. Đọc kèm [README.md](../README.md) phần “Going to Production”.

## 1. Phân biệt local và production

| Thành phần | Local (Docker) | Production |
|------------|----------------|------------|
| Database & Auth | `apps/web/supabase/config.toml` + Supabase CLI | **Supabase Cloud** (Dashboard) |
| URL API | Ví dụ `http://127.0.0.1:55521` (tuỳ máy) | `https://<project-ref>.supabase.co` |
| Biến môi trường app | `apps/web/.env.local` | **Hosting** (Vercel, Railway, …) — không commit secret |
| OAuth Google | Redirect URI trỏ về API local | Redirect URI trỏ về Supabase Cloud (`…/auth/v1/callback`) |

**Lưu ý:** Các port tùy chỉnh trong `config.toml` (55521, 55523, …) chỉ dùng khi `supabase start` trên máy dev. **Production không chạy file đó** trên server Next.js; bạn cấu hình tương ứng trong **Supabase Dashboard**.

---

## 2. Chuẩn bị Supabase (cloud)

### 2.1 Tạo project

1. Đăng nhập [supabase.com](https://supabase.com), tạo project mới (chọn region, đặt mật khẩu DB).
2. Ghi nhận **Project URL** và **anon (publishable) / service_role (secret)** tại **Settings → API**.

### 2.2 Đẩy schema (migration)

Trên máy có Supabase CLI và đã clone repo:

```bash
cd apps/web
pnpm supabase login
pnpm supabase link --project-ref <PROJECT_REF>
pnpm supabase db push
```

`<PROJECT_REF>` lấy từ URL Dashboard (ví dụ `abcdefghij` trong `https://supabase.com/dashboard/project/abcdefghij`).

Từ thư mục gốc monorepo có thể dùng:

```bash
pnpm --filter web supabase db push
```

(sau khi đã `link` trong `apps/web`.)

### 2.3 URL và redirect (Auth)

**Authentication → URL configuration:**

- **Site URL:** `https://<domain-của-bạn>` (ví dụ `https://thuexe77.com`).
- **Redirect URLs:** thêm đủ các URL mà app dùng sau đăng nhập, ví dụ:
  - `https://<domain>/auth/callback`
  - `https://<domain>/update-password`
  - (Các path khác nếu bạn mở rộng, phải khớp **ký tự** với redirect thực tế.)

Không dùng `http://localhost:3000` làm Site URL chính trên production (chỉ thêm vào Redirect nếu cần test).

### 2.4 Google OAuth (nếu bật)

1. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client (**Web application**).

2. **Authorized redirect URIs** — thêm **một** URI có dạng (thay `<project-ref>` bằng ref Supabase):

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   Không dùng `http://127.0.0.1:55521/auth/v1/callback` cho production.

3. **Supabase Dashboard** → Authentication → Providers → **Google**: bật provider, dán **Client ID** và **Client Secret** từ Google.

(Cấu hình Google trong `apps/web/supabase/config.toml` + `supabase/.env` chỉ áp dụng cho **local**; cloud cấu hình trên Dashboard.)

### 2.5 Cấu hình SMTP (email từ Supabase Auth)

Trong project này, email **xác nhận đăng ký**, **đặt lại mật khẩu**, **magic link**, **đổi email** đều do **Supabase Auth** gửi — **không** cấu hình SMTP trong Next.js (`apps/web`). Chỉ cần cấu hình trên **Supabase Cloud** (và tuỳ chỉnh nội dung template nếu muốn).

#### Local (dev)

- Supabase Docker dùng **Inbucket** (cấu hình port trong `apps/web/supabase/config.toml` → `[inbucket]`).
- Mail không gửi ra internet; xem tại URL Mailpit/Inbucket (ví dụ `http://127.0.0.1:55524` với stack hiện tại).

#### Production

1. Vào **Supabase Dashboard** → project production → **Project Settings** → **Authentication** (hoặc mục **SMTP** / **Custom SMTP** tùy giao diện phiên bản Dashboard).
2. Bật **Custom SMTP** và điền thông tin nhà cung cấp (ví dụ SendGrid, Mailgun, Amazon SES, Brevo, nhà cung cấp VPS mail, …):

   | Trường | Ghi chú |
   |--------|---------|
   | **Host** | Ví dụ `smtp.sendgrid.net`, `smtp.eu.mailgun.org`, … |
   | **Port** | Thường **587** (STARTTLS) hoặc **465** (SSL) — theo tài liệu provider. |
   | **Username / Password** | User SMTP và mật khẩu hoặc API key dạng SMTP (tuỳ dịch vụ). |
   | **Sender email** | Địa chỉ người gửi (nên là domain bạn đã xác minh / có SPF-DKIM). |
   | **Sender name** | Tên hiển thị (ví dụ tên sản phẩm). |

3. **Site URL** và **Redirect URLs** (mục 2.3) phải đúng domain production — link trong email (xác nhận, reset) dựa trên các URL này.

4. **Email templates:** Dashboard → **Authentication** → **Email Templates** (hoặc tương đương): chỉnh subject/body nếu cần. Template HTML trong repo (`apps/web/supabase/templates/*.html`) chủ yếu phục vụ **CLI/local**; trên cloud bạn đồng bộ tay hoặc giữ nội dung mặc định rồi sửa từng mẫu trên Dashboard.

5. **Deliverability:** với domain riêng, cấu hình **SPF**, **DKIM**, **DMARC** theo hướng dẫn của SMTP provider; tránh dùng “from” `@gmail.com` với SMTP không phải Google nếu provider cấm.

**Tài liệu chính thức:** [Custom SMTP / Auth](https://supabase.com/docs/guides/auth/auth-smtp).

**Lưu ý:** Nếu chỉ dùng **đăng nhập Google (OAuth)** và tắt đăng ký bằng email, bạn vẫn có thể cần SMTP cho **đổi email**, **mời user**, hoặc **reset mật khẩu** (nếu bật các luồng đó).

---


## 3. Ứng dụng Next.js (`apps/web`)

### 3.1 Biến môi trường bắt buộc / thường gặp

Đặt trên nền tảng hosting (Production / Preview tuỳ nhu cầu):

| Biến | Ghi chú |
|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase (HTTPS). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon hoặc publishable key (public). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret**, chỉ server; không lộ ra client. |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` — khớp domain deploy. |

Các biến public khác xem trong `apps/web/.env`, README (tên app, theme, `NEXT_PUBLIC_AUTH_*`, CAPTCHA nếu có, …).

Script build của `web` dùng `dotenv -e ./.env.local`; trên CI nếu thiếu file, cần hoặc tạo `.env.local` chỉ trên CI (secret từ hosting), hoặc điều chỉnh pipeline để `next build` nhận đủ biến từ môi trường — tuỳ cách bạn cấu hình Vercel/Railway.

**Stripe (tùy chọn — nâng cấp gói qua thẻ):**

| Biến | Ghi chú |
|------|---------|
| `STRIPE_SECRET_KEY` | Secret key (`sk_test_…` / `sk_live_…`). **Không** public. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret webhook (`whsec_…`). |
| `STRIPE_PRICE_PRO` | Price ID gói Pro (`price_…`), hoặc set `plans.stripe_price_id` trong DB. |
| `STRIPE_PRICE_ENTERPRISE` | Price ID gói Enterprise. |

**Webhook production:** Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://<domain>/api/billing/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`

**Webhook local:** cài [Stripe CLI](https://stripe.com/docs/stripe-cli), chạy:

```bash
cd apps/web
pnpm stripe:listen
```

Copy `whsec_…` in ra terminal vào `STRIPE_WEBHOOK_SECRET` trong `.env.local`, rồi restart `pnpm dev`.

**Customer Portal:** bật trong Stripe Dashboard → Settings → Billing → Customer portal (mặc định test mode). Nút *Quản lý gói* trên `/home/billing` mở portal cho org đã có `stripe_customer_id`.

### 3.2 Deploy Vercel (monorepo pnpm)

Trên **Vercel → Project → Settings → General**:

| Mục | Giá trị |
|-----|---------|
| **Root Directory** | `apps/web` (bắt buộc — `next` nằm trong `apps/web/package.json`, không có ở root repo) |
| **Framework Preset** | Next.js (tự nhận sau khi đúng Root Directory) |
| **Install Command** | `cd ../.. && pnpm install` (đã khai báo trong `apps/web/vercel.json`) |
| **Build Command** | `next build` (đã khai báo trong `apps/web/vercel.json`; không dùng `pnpm with-env` vì không có `.env.local` trên Vercel) |

Nếu **Root Directory** để trống hoặc là `.` (repo gốc), Vercel báo lỗi *No Next.js version detected* vì `package.json` ở root không có dependency `next`.

Đảm bảo `NEXT_PUBLIC_*` và secret có trong **Environment Variables** của Vercel (Production / Preview) — biến phải có **lúc build**.

### 3.3 Kiểm tra trước khi deploy

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run build
```

---

## 4. DNS & HTTPS

- Trỏ domain về hosting (A/CNAME).
- Bật HTTPS (thường hosting tự provisioning).
- Cập nhật lại `NEXT_PUBLIC_SITE_URL` và Redirect URLs trong Supabase nếu đổi domain.

---

## 5. Bảo mật

- Không commit `apps/web/.env.local`, `apps/web/supabase/.env`, hoặc service role key.
- Rà soát **Row Level Security** trên Supabase; chỉ grant tối thiểu cần thiết.
- Giới hạn **Redirect URLs** trong Supabase đúng domain thật.

---

## 6. Sau khi deploy

- Đăng ký / đăng nhập (email + Google nếu bật), vào `/home` và `/home/settings`.
- Kiểm tra log hosting và **Logs** trên Supabase nếu lỗi auth/API.

---

## 7. Tham khảo nhanh lệnh Supabase (local — không dùng cho prod server)

Chỉ dùng khi dev trên máy:

```bash
# Từ root monorepo
pnpm run supabase:web:start
pnpm run supabase:web:stop
pnpm run supabase:web:reset
```

Production DB quản lý qua **Supabase Dashboard** và `supabase db push` / migration từ máy dev hoặc CI đã xác thực.
