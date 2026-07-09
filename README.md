# Liên Đội Trường THCS Tôn Thất Tùng

Trang web Liên đội trường THCS Tôn Thất Tùng với các tính năng quản lý hoạt động, tin tức và đặc biệt là hệ thống **Visual Edit Mode (CMS)** trực quan.

## CMS Visual Edit Mode

Hệ thống quản lý nội dung trực tiếp trên giao diện áp dụng mô hình:

`Frontend Defaults + Database Overrides + Supabase Storage Assets = Final UI`

- **Frontend Defaults**: Lưu trữ cấu hình mặc định giao diện của ứng dụng trong code nhằm tăng tốc độ tải trang ban đầu và làm phương án dự phòng hoàn hảo.
- **Database Overrides**: Bảng `public.cms_overrides` trong cơ sở dữ liệu Supabase chỉ lưu trữ những phần thay đổi do quản trị viên chỉnh sửa.
- **Supabase Storage Assets**: Các tệp tin đa phương tiện được lưu trữ công khai trong bucket `school-media` và `school-document`.

### Luồng Hoạt Động
- Người dùng thông thường chỉ tải cấu hình mặc định kèm các bản ghi ghi đè có thuộc tính `is_enabled = true`.
- Quản trị viên/Biên tập viên bật **Edit Mode** để sửa trực tiếp văn bản, hình ảnh, liên kết nút của Hero trang chủ.
- Khi lưu thay đổi, dữ liệu sẽ được `upsert` vào bảng `cms_overrides`. Khi "Khôi phục mặc định", bản ghi tương ứng sẽ bị xóa khỏi cơ sở dữ liệu và giao diện quay về cấu hình code ban đầu.

### Phân Quyền
- **Public**: Chỉ có quyền đọc công khai các bản ghi CMS Overrides đã bật (`is_enabled = true`) và đọc file trong storage.
- **Authenticated (Tạm thời)**: Có toàn quyền quản lý `cms_overrides` và tải tệp lên storage nhằm phục vụ kiểm thử và demo.
- *Lưu ý quan trọng*: Trong môi trường Production thực tế, các policy ghi tạm thời cần được thay thế bằng kiểm tra phân quyền người dùng (Role-based Access Control - RBAC) như `admin`, `editor` để bảo mật tối đa.

## Content Modules

Dự án bao gồm cấu trúc bảng cơ sở dữ liệu và lớp API hoàn chỉnh cho các mô-đun nội dung:

- **Tin tức (News)**: Bảng `public.news` dùng để quản lý các bài viết tin tức, hoạt động của liên đội.
- **Tài liệu (Documents)**: Bảng `public.documents` quản lý kế hoạch, công văn, biểu mẫu và quyết định.
- **Thư viện ảnh (Albums & Album Images)**: Bảng `public.albums` và `public.album_images` quản lý các bộ sưu tập ảnh hoạt động của Liên đội trường.

### Phân Quyền Nội Dung
- Người dùng công cộng (Public) chỉ có quyền xem nội dung đã được xuất bản (`status = 'published'`).
- Người dùng đăng nhập (Authenticated) có các policy tạm thời để quản lý toàn bộ nội dung trong quá trình kiểm thử và phát triển. Trước khi triển khai thực tế, các policy này cần được điều chỉnh sang kiểm tra vai trò `admin`/`editor`.
