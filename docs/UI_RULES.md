# QUY CHUẨN GIAO DIỆN HỆ THỐNG (UI/UX DESIGN RULES)

> **CĂN CỨ VÀ BẮT BUỘC ĐỐI VỚI LẬP TRÌNH VIÊN & AI:**
> 
> **“Trước khi chỉnh sửa bất kỳ giao diện nào, AI phải đọc docs/UI_RULES.md và kiểm tra component/style hiện có. Không được tạo style mới chỉ để giải quyết cục bộ nếu đã có pattern tương đương trong hệ thống.”**

---

## I. TỔNG QUAN HỆ THỐNG DESIGN TOKENS

Hệ thống giao diện sử dụng **Tailwind CSS** làm nền tảng cốt lõi với cấu trúc màu sắc chính:
- **Primary Accent (Đội TNTP):** Cờ đỏ sao vàng / Đỏ nhiệt huyết (`red-600` / `red-700`).
- **Neutrals (Nền & Chữ):** Warm/Cool Slate (`slate-900`, `slate-800`, `slate-600`, `slate-500`, `slate-100`, `slate-50`).
- **Dark Mode Support:** Bắt buộc hỗ trợ dark mode đồng bộ qua các lớp `dark:bg-slate-900`, `dark:bg-slate-950`, `dark:text-white`, `dark:border-slate-800`.

---

## II. QUY CHUẨN TYPOGRAPHY & PHÂN CẤP TIÊU ĐỀ

| Cấp Tiêu đề (Hierarchy) | Class Tailwind Chuẩn | Kích thước & Trọng lượng | Ứng dụng thực tế |
| :--- | :--- | :--- | :--- |
| **Hero Title** | `font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white` | 30px / 36px / 48px, Weight 800 | Tiêu đề lớn Trang chủ / Banner Hero chính (cấp riêng biệt). |
| **Page Title** | `font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight` | 24px / 30px, Weight 800 | Đầu các trang Public & CMS (`/hoat-dong`, `/thi-dua`, `/tin-tuc`). **Duy nhất class này, không dùng `text-3xl sm:text-4xl` cho Page Title thông thường**. |
| **Section Heading (Mức 1)** | `font-display text-xl font-bold text-slate-900 dark:text-white` | 20px, Weight 700, Line-height 1.4 | Tiêu đề các khối nội dung đồng cấp: “Hoạt động thường xuyên”, “Hoạt động theo mốc thời gian”, “Thi đua chi đội”, “Thi đua Đội viên”, “Bảng vinh danh Người tốt - Việc tốt”. |
| **Card / Sub-section Heading** | `font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white` | 16px / 18px, Weight 700 | Tiêu đề Card tin tức, tên chi đội, tên sự kiện. |
| **Item Title / Table Row Header** | `text-sm font-semibold text-slate-900 dark:text-white` | 14px, Weight 600 | Tên văn bản, tên tài khoản, nhãn trường dữ liệu. |
| **Body Text (Đoạn văn chính)** | `text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed` | 14px / 16px, Weight 400, Line-height 1.625 | Nội dung bài viết, mô tả sự kiện, chi tiết hoạt động. |
| **Subtitle / Description** | `text-xs sm:text-sm text-slate-500 dark:text-slate-400` | 12px / 14px, Weight 400 | Dòng mô tả ngắn ngay dưới Section Heading. |
| **Metadata / Timestamp / Caption** | `text-xs text-slate-400 dark:text-slate-500` | 12px, Weight 400 | Ngày đăng, người tạo, số lượt xem, nhãn phụ. |

---

## III. QUY CHUẨN KHUNG CHỨA (CONTAINER) & KHOẢNG CÁCH (SPACING SCALE)

### 1. Chiều rộng Khung chứa (Container Width)
- **Trang Danh sách / Tổng quan (List & Overview Pages):**  
  `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (HomePage, CompetitionOverview, Movements, News, Gallery, Documents, Contact, About).
- **Trang Chi tiết / Form Đọc (Detail & Form Pages):**  
  `max-w-4xl mx-auto px-4 sm:px-6` (NewsDetail, MovementDetail, RecordIncident, PublicUnitCompetition).
- **Trang Đăng nhập / Khôi phục mật khẩu (Auth Pages):**  
  `max-w-md mx-auto px-4`.

### 2. Spacing Scale Giữa các Khối (Section Spacing)
- **Khoảng cách giữa Header trang & Section đầu tiên:** `py-6` hoặc `py-8`.
- **Khoảng cách giữa các Section chính trên cùng trang:** `space-y-10` hoặc `space-y-12` (Mobile: `space-y-8`).
- **Khoảng cách từ Section Title đến Nội dung bên trong:** `space-y-4` hoặc `mb-6`.
- **Khoảng cách Title đến Subtitle:** `space-y-1` hoặc `gap-1`.

---

## IV. QUY CHUẨN BO GÓC (BORDER RADIUS) & DẠNG CARD

### 1. Bo góc (Border Radius Rules)
- **Mặc định cho Component / Card / Container mới:** `rounded-2xl` (16px).
- **Mặc định cho Input / Button / Dropdown / Badge Large:** `rounded-xl` (12px).
- **Mặc định cho Badge Small / Chip / Pill / Action Tooltip:** `rounded-lg` (8px) hoặc `rounded-full` (cho pill tag riêng biệt).
- **Quy tắc bảo tồn thiết kế cũ:** Không tự động quét toàn project để thay thế mọi `rounded-3xl` hoặc `rounded-[...]` nếu đó là thiết kế đã được người dùng phê duyệt. Chỉ sửa các vị trí cụ thể mà `UI_AUDIT.md` xác định cần sửa.

### 2. Dạng Card Chuẩn (Card Variants)
- **Standard Content Card:**  
  `bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200`
- **Interactive Hover Card (Clickable):**  
  `bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 hover:border-red-500/30 dark:hover:border-red-500/30 shadow-sm hover:shadow-lg transition-all duration-200 group`
- **Highlight / Featured Card (Khối vinh danh/nổi bật):**  
  `bg-gradient-to-br from-red-50/50 to-amber-50/30 dark:from-slate-900 dark:to-slate-900/90 border border-red-200/60 dark:border-red-900/40 rounded-2xl p-6 shadow-sm`

---

## V. QUY CHUẨN NÚT BẤM (BUTTON VARIANTS)

Tất cả nút bấm phải có chiều cao rõ ràng, không viết padding tùy tiện:

| Variant | Class Tailwind Chuẩn | Chiều cao & Text | Ứng dụng |
| :--- | :--- | :--- | :--- |
| **Primary (Đỏ chính)** | `bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50` | Medium: `h-10 px-4 text-sm`<br>Small: `h-8 px-3 text-xs` | Hành động chính (Lưu, Thêm mới, Gửi duyệt, Xem chi tiết chính). |
| **Secondary (Xám nhẹ)** | `bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors` | Medium: `h-10 px-4 text-sm`<br>Small: `h-8 px-3 text-xs` | Hành động phụ (Hủy, Quay lại, Đóng modal, Lọc). |
| **Outline (Viền)** | `border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors` | Medium: `h-10 px-4 text-sm`<br>Small: `h-8 px-3 text-xs` | Nút xuất dữ liệu, Xuất Excel, Tải xuống. |
| **Danger (Đỏ cảnh báo)** | `bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors shadow-sm` | Medium: `h-10 px-4 text-sm`<br>Small: `h-8 px-3 text-xs` | Xóa vĩnh viễn, Từ chối, Khóa tài khoản. |
| **Ghost (Không nền)** | `hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-xl transition-colors` | Medium: `h-10 px-3 text-sm`<br>Small: `h-8 px-2.5 text-xs` | Icon action trên hàng của Bảng, nút thu gọn. |

*Lưu ý:* Icon trong Nút bấm có kích thước chuẩn: `w-4 h-4` đối với nút Medium (`h-10`), `w-3.5 h-3.5` đối với nút Small (`h-8`). Căn chỉnh `gap-2` (Medium) hoặc `gap-1.5` (Small).

---

## VI. QUY CHUẨN BẢNG DỮ LIỆU (TABLES), FORM & MODAL

### 1. Bảng Dữ liệu (Tables)
- **Container Bảng:**  
  `w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900`
- **Table Header (`th`):**  
  `bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 whitespace-nowrap`
- **Table Cell (`td`):**  
  `px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/60 align-middle`
- **Row Hover:**  
  `hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors`

### 2. Form Controls (Input, Select, Textarea)
- **Label:** `block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5`
- **Input / Select Text:**  
  `w-full h-10 px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all`
- **Textarea:**  
  `w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all min-h-[90px]`

### 3. Modal / Dialog Popups (Cấu trúc duy nhất)
- **Overlay:** `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6`
- **Modal Container:**  
  `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col`
- **Modal Header:** `px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0` (không cuộn theo body).
- **Modal Body:** `p-6 overflow-y-auto space-y-4 flex-1` (nội dung duy nhất cuộn bên trong).
- **Modal Footer:** `px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0` (cố định ở đáy, không cuộn theo body).

---

## VII. QUY CHUẨN ICON, BADGE, LOADER & EMPTY STATE

### 1. Icon Sizing Rules
- **Section Heading Icon:** `w-5 h-5` (nếu icon độc lập) hoặc `w-4 h-4` trong box `w-8 h-8 rounded-xl`.
- **Button Icon:** `w-4 h-4` (nút h-10), `w-3.5 h-3.5` (nút h-8).
- **Card Metadata Icon:** `w-4 h-4` hoặc `w-3.5 h-3.5` với màu `text-slate-400`.

### 2. Badge Status Variants
- **Success (Đã duyệt / Dẫn đầu):**  
  `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 whitespace-nowrap`
- **Pending / Warning (Chờ duyệt):**  
  `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 whitespace-nowrap`
- **Danger (Từ chối / Vi phạm):**  
  `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 whitespace-nowrap`
- **Info / Neutral (Thông tin / Khối):**  
  `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap`

### 3. Loading, Error & Empty States
- Bắt buộc tái sử dụng các component dùng chung tại `src/components/common/`:
  - `<LoadingState />`
  - `<EmptyState />`
  - `<ErrorState />`
- **KHÔNG** tự tạo div `animate-pulse` custom hoặc text "Không có dữ liệu" lẻ tóm tắt nếu đã có sẵn component chung.

---

## VIII. QUY CHUẨN RESPONSIVE & BẢO TỒN CẤU TRÚC DESKTOP

1. **Bảo tồn Desktop Layout:**  
   Layout màn hình lớn (Desktop ≥ 1024px) đã được phê duyệt **KHÔNG ĐƯỢC PHÁ VỠ**. Không được tự ý gom cột, ẩn sidebar, hoặc thay đổi thứ tự grid trên Desktop.
2. **Mobile First Adjustments:**  
   - Mobile Padding an toàn: `px-4 py-6` cho container chính.
   - Text Size Scale trên Mobile: Tiêu đề tự động co về kích thước phù hợp (Ví dụ: `text-2xl sm:text-3xl`).
   - Mọi Bảng dữ liệu (Table) hoặc Grid điểm số nhiều cột trên mobile **phải bọc trong div cuộn ngang** (`overflow-x-auto`).
   - Nút bấm trên Mobile: Ưu tiên full-width (`w-full`) trong form hoặc cố định ở bottom drawer nếu là hành động Submit chính.

---

## IX. CÁC NGUYÊN TẮC BẮT BUỘC & NHỮNG VIỆC AI TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI

1. **Bảo tồn Legacy Approved UI:**  
   “Không được tự động thay đổi style/layout của component hoặc vùng giao diện desktop đã được người dùng duyệt chỉ vì nó khác design token chuẩn. Design token là chuẩn cho component mới và cho những vị trí `UI_AUDIT.md` xác định cần sửa. Nếu việc chuẩn hóa có thể thay đổi đáng kể giao diện đã duyệt, phải giữ nguyên.”
2. **Cấm Tìm kiếm & Thay thế Toàn cục (Global Search/Replace):**  
   “Không được thực hiện global search/replace Tailwind classes trên toàn project để chuẩn hóa UI.”
3. **Phân tách Rõ ràng UI với Logic / Backend:**  
   “Một yêu cầu sửa UI không được kéo theo sửa business logic, API, Supabase, RLS, migration, route hoặc dữ liệu.”
4. **Kiểm tra Component Tái sử dụng trước khi tạo mới:**  
   “Trước khi tạo component `PageHeader`, `SectionHeader`, `Button`, `Card`, `Modal` mới phải kiểm tra project đã có component tương đương hay chưa. Không tạo component trùng chức năng.”
5. **Không thay đổi Bố cục Desktop lớn đã duyệt:**  
   Bố cục desktop (Desktop ≥ 1024px) tuyệt đối không bị biến đổi cấu trúc.
6. **Không thay đổi Font Family toàn site:**  
   Giữ nguyên font chữ mặc định của hệ thống.
7. **Không tạo Inline Style (`style={{ ... }}`):**  
   Bắt buộc dùng Tailwind Utility Classes.
8. **Không tự ý thêm thư viện UI mới:**  
   Chỉ sử dụng Tailwind CSS và Lucide React hiện có.
9. **Quy tắc Bảo tồn Trạng thái Giao diện (State Persistence):**  
   “Không được reset tab, subtab, filter hoặc view state hiện tại chỉ vì browser window/tab mất focus, visibility thay đổi hoặc dữ liệu được refetch. Khi người dùng quay lại tab trình duyệt, giao diện phải giữ nguyên ngữ cảnh đang sử dụng. Nếu project đã có persistence pattern hiện hữu thì phải tái sử dụng pattern đó, không tạo cơ chế mới cục bộ.”
10. **Bảo toàn UI State khi Refetch dữ liệu:**  
   “Refetch dữ liệu khi focus/visibilitychange được phép, nhưng refetch không được ghi đè state UI đang được người dùng lựa chọn.”
11. Bảo toàn Component Tree khi Refetch quyền/xác thực:
  “Khi dữ liệu profile/quyền đã có sẵn và hệ thống chỉ đang refetch hoặc refresh phiên đăng nhập ở nền, không được thay toàn bộ giao diện hiện tại bằng loading spinner khiến component bị unmount. Loading toàn màn hình chỉ dùng cho lần tải đầu tiên khi chưa có dữ liệu cần thiết. Background refetch phải giữ nguyên component tree và chỉ cập nhật dữ liệu khi hoàn tất.”
