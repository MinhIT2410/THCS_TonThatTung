# BÁO CÁO AUDIT GIAO DIỆN (UI/UX AUDIT REPORT)

> **Hệ thống:** Cổng thông tin & Quản lý Thi đua Măng Non  
>TRẠNG THÁI: ĐÃ HOÀN TẤT AUDIT — 20/20 PASS
>Không dùng file này làm nguồn quy chuẩn.
>Nguồn quy chuẩn chính thức: docs/UI_RULES.md

---

## I. TỔNG QUAN PHÂN LOẠI LỖI UI/UX

| Cấp độ Severity | Số lượng lỗi | Mô tả phạm vi |
| :--- | :---: | :--- |
| **CRITICAL** | **3** | Vỡ layout, tràn màn hình ngang (horizontal overflow) trên mobile, modal bị tràn màn hình không cuộn được. |
| **HIGH** | **5** | Tiêu đề trang (Page Title) dùng font-size/class khác nhau; Card dùng border-radius cực đoan (`2rem`, `2.5rem`); Button lệch height/rounded. |
| **MEDIUM** | **8** | Section headings lệch font-weight (`font-black` vs `font-bold`); icon đi kèm section thiếu chuẩn hóa; Table headers & Form input lệch kích thước/padding. |
| **LOW** | **4** | Chi tiết nhãn subtitle, màu divider, empty state dùng code inline thay vì component dùng chung. |

---

## II. CHI TIẾT BẢNG AUDIT CÁC LỖI GIAO DIỆN

### 1. LỖI CRITICAL (Cần ưu tiên xử lý hàng đầu)

| STT | Trang | File / Component | Style hiện tại | Style chuẩn đề xuất | Sửa qua Component chung? |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **C-01** | Chi tiết Thi đua Chi đội | `src/pages/PublicUnitCompetitionPage.tsx` | Bảng xếp hạng / tuần thiếu container cuộn ngang `overflow-x-auto` trên màn hình mobile nhỏ (< 360px). | Bọc table trong `<div className="w-full overflow-x-auto scrollbar-thin">`. | **Có** (Table container chung) |
| **C-02** | Quản trị phong trào / Thi đua | `src/pages/admin/AdminMovementsPage.tsx`, `AdminCompetitionPage.tsx` | Các Modal dialog thiếu cấu trúc cuộn an toàn trên mobile khiến nút Action bị trôi. | Container: `max-h-[90vh] overflow-hidden flex flex-col`; Body: `overflow-y-auto flex-1`; Header/Footer: `shrink-0` (không cuộn theo body). | **Có** (`Modal` component chung) |
| **C-03** | Thi đua Đội viên | `src/pages/StudentCompetitionPage.tsx` | Đội viên badge tag trong flex container hẹp bị xuống dòng/xuất hiện gạch nối từ (words wrap inside pill). | Thêm `whitespace-nowrap shrink-0` cho các badge/pill tag. | **Có** (`Badge` component chung) |

---

### 2. LỖI HIGH (Không đồng bộ rõ rệt ở cấp trang & card)

| STT | Trang | File / Component | Style hiện tại | Style chuẩn đề xuất | Sửa qua Component chung? |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **H-01** | Tiêu đề trang Public | `PublicRewardShopPage.tsx`, `PublicUnitCompetitionPage.tsx`, `RecordIncidentPage.tsx` | Dùng `text-xl sm:text-2xl md:text-3xl font-extrabold` hoặc thiếu màu text dark/lightMode. | Chuẩn hóa Page Title: `font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight`. | **Có** (`PageHeader` component) |
| **H-02** | Card Radius Cực Đoan | `AboutPage.tsx`, `AdminCmsPage.tsx` | Dùng `rounded-[2rem]`, `rounded-[2.5rem]`, `rounded-3xl` kèm `border-2 border-red-500/30`. | `rounded-2xl` (16px) là chuẩn cho component mới hoặc vị trí audit yêu cầu sửa; không tự thay card cũ đã được người dùng duyệt. | **Có** (`Card` component) |
| **H-03** | Button Styles & Height | Toàn bộ các trang `src/pages/` và `src/components/` | Nút bấm chính (Primary Button) lẫn lộn giữa `h-8`, `h-9`, `h-10`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`. | Chuẩn hóa Button: Height `h-10` (Medium) / `h-8` (Small), Radius `rounded-xl`, font `text-sm font-semibold`. | **Có** (`Button` component) |
| **H-04** | Container Width toàn trang | `NewsDetailPage.tsx`, `PublicUnitCompetitionPage.tsx`, `RecordIncidentPage.tsx` | Mỗi trang dùng container width khác nhau (`max-w-4xl`, `max-w-5xl`, `max-w-7xl`). | Quy chuẩn: Trang danh sách/overview dùng `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Trang đọc tin/form chi tiết dùng `max-w-4xl mx-auto px-4 sm:px-6`. | **Không** (Cấu hình layout trang) |
| **H-05** | Secondary Button / Outline | Các trang Quản trị Admin | Dùng `bg-white border border-slate-300` thiếu hiệu ứng hover trong dark mode (`dark:bg-slate-800 dark:border-slate-700`). | Chuẩn hóa Nút phụ: `bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl`. | **Có** (`Button` component) |

---

### 3. LỖI MEDIUM (Không đồng bộ Typography, Icon, Form, Table)

| STT | Trang | File / Component | Style hiện tại | Style chuẩn đề xuất | Sửa qua Component chung? |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **M-01** | Section Heading Weight | `PublicUnitCompetitionPage.tsx` | Dùng `font-black` (font-weight 900) thay vì `font-bold` (700) như các section heading khác. | Đưa về chuẩn `font-display text-xl font-bold text-slate-900 dark:text-white`. | **Có** (`SectionHeader` component) |
| **M-02** | Section Title Icons | `CompetitionOverviewPage.tsx`, `PublicGoodDeedsPage.tsx` | Nơi thì dùng icon trực tiếp `w-5 h-5`, nơi bọc icon trong box `w-8 h-8 rounded-xl bg-emerald-100`. | Mọi Section Heading đi kèm icon trực tiếp `w-5 h-5` hoặc icon bọc box chuẩn 32x32px thống nhất. | **Có** (`SectionHeader` component) |
| **M-03** | Table Header Typography | `AdminUsersPage.tsx`, `AdminMovementsPage.tsx`, `AdminCompetitionPage.tsx` | Header bảng dùng hỗn hợp `text-xs font-semibold text-slate-500 uppercase` và `text-sm font-bold text-slate-700`. | Định dạng Header bảng chuẩn: `text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50`. | **Có** (Table style token) |
| **M-04** | Form Controls Height/Radius | Các form nhập liệu CMS / Admin | Input dùng `rounded-lg h-9 text-xs` xen kẽ `rounded-xl h-10 text-sm` và `rounded-2xl h-11`. | Chuẩn hóa Input/Select: `h-10 px-3.5 py-2 rounded-xl text-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500/20`. | **Có** (`Input` / `Select` component) |
| **M-05** | Modal / Drawer Width | Modal Quản trị CMS | Kích thước modal dùng lộn xộn `max-w-md`, `max-w-lg`, `max-w-xl`, `max-w-2xl`, `max-w-3xl` không quy định rõ theo loại form. | Quy chuẩn: Form ngắn (Confirm/Prompt) = `max-w-md`; Form vừa (Edit item) = `max-w-xl`; Form lớn (Multi-tab/Báo cáo) = `max-w-3xl`. | **Có** (`Modal` component) |
| **M-06** | Subtitle Text Colors | `AboutPage.tsx`, `ContactPage.tsx`, `DocumentsPage.tsx` | Subtitle dùng `text-slate-500`, `text-slate-600`, `text-slate-400` không có token dark mode rõ ràng. | Dùng màu chuẩn Subtitle: `text-slate-600 dark:text-slate-400 text-sm sm:text-base`. | **Không** (Lớp typography) |
| **M-07** | Icon Sizing trong Button | Nút bấm ở toàn hệ thống | Icon trong nút khi thì `w-3.5 h-3.5`, khi thì `w-4 h-4`, khi thì `w-5 h-5` gây lệch trục dọc với text. | Nút `h-8` dùng icon `w-3.5 h-3.5`; Nút `h-10` dùng icon `w-4 h-4`. Khoảng cách `gap-2`. | **Có** (`Button` component) |
| **M-08** | Divider Spacing | Giữa các section ở các trang public | Mối nối giữa các section dùng margin `my-6`, `my-8`, `my-12`, `py-8`, `py-12` bất cân đối. | Chuẩn hóa Spacing giữa các section chính: `space-y-10` hoặc `space-y-12`. | **Không** (Layout scale) |

---

### 4. LỖI LOW (Chi tiết nhỏ & Polishing)

| STT | Trang | File / Component | Style hiện tại | Style chuẩn đề xuất | Sửa qua Component chung? |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **L-01** | Empty State Inline | `GalleryPage.tsx`, `DocumentsPage.tsx` | Viết code inline hiển thị "Không có dữ liệu" thay vì dùng component `<EmptyState />` từ `src/components/common`. | Thay thế bằng `<EmptyState title="..." description="..." />`. | **Có** (`EmptyState` sẵn có) |
| **L-02** | Loading Skeleton Inline | `PublicGoodDeedsPage.tsx`, `StudentCompetitionPage.tsx` | Sử dụng div animate-pulse tự chế không đồng bộ chiều cao card. | Thay thế bằng `<LoadingState variant="cards" count={3} />`. | **Có** (`LoadingState` sẵn có) |
| **L-03** | Badge Color Variants | Trạng thái duyệt tin tức / thi đua | Dùng màu custom `bg-blue-100 text-blue-700` không đồng nhất độ tương phản dark mode. | Chuẩn hóa Badge variants: Success (Emerald), Pending/Warning (Amber), Danger (Rose), Info (Sky). | **Có** (`Badge` component) |
| **L-04** | Border Styles | Danh sách item tin tức / văn bản | Xen kẽ giữa `border-slate-100`, `border-slate-200/80`, `border-slate-200`. | Đưa về chuẩn duy nhất `border-slate-200/80 dark:border-slate-800/80`. | **Không** (Utility class) |

---

## III. BẢNG TỔNG HỢP PATTERN LẶP KHÔNG NHẤT QUÁN & KHUYẾN NGHỊ RÚT GỌN COMPONENT

### 1. Pattern đang bị lặp không nhất quán:
1. **Page Header Banner**: Nhiều trang tự tạo phần Header bao gồm (Icon + Title + Subtitle + Action Button) bằng các thẻ `div` thủ công với class padding/text size khác nhau.
2. **Section Title & Subtitle**: Lặp lại cấu trúc `h2` + `p` mô tả với font sizing lệch từ `text-lg` đến `text-2xl`.
3. **Form Modal**: Các modal tạo mới / chỉnh sửa item trong Admin tự dựng overlay, container, header, footer gây lặp code và sai lệch border-radius (`2rem` vs `xl`).

### 2. Các Component nên được chuẩn hóa / tái sử dụng:
1. `src/components/common/PageHeader.tsx`: Chuẩn hóa tiêu đề trang public/admin.
2. `src/components/common/SectionHeader.tsx`: Chuẩn hóa tiêu đề các khối nội dung.
3. `src/components/common/Button.tsx`: Định nghĩa sẵn các variant (`primary`, `secondary`, `outline`, `ghost`, `danger`) & sizes (`sm`, `md`, `lg`).
4. `src/components/common/Card.tsx`: Đảm bảo `rounded-2xl`, border, shadow đồng nhất cho component mới/vị trí sửa.
5. `src/components/common/Modal.tsx`: Đảm bảo cuộn an toàn trên mobile với container `max-h-[90vh] overflow-hidden flex flex-col`, body `overflow-y-auto flex-1` và header/footer `shrink-0`.
