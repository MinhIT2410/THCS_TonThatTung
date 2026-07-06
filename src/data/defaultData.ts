/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NewsItem, ActivityItem, DocumentItem, PhotoItem, LeaderProfile, AchievementItem } from '../types';

export const SCHOOL_NAME = "Liên Đội THCS Tôn Thất Tùng";
export const SCHOOL_SLOGAN = "Thiếu nhi Tôn Thất Tùng - Chăm ngoan, học tốt, tiếp bước cha anh";

export const defaultLeaders: LeaderProfile[] = [
  {
    id: "1",
    name: "Cô Nguyễn Thanh Hà",
    position: "Giáo viên Tổng phụ trách Đội",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    roleDescription: "Phụ trách chỉ đạo toàn diện hoạt động Đội, bồi dưỡng Ban chỉ huy Liên đội và triển khai các phong trào thi đua cấp trường, cấp Quận.",
    email: "nguyenha.tpt@gmail.com"
  },
  {
    id: "2",
    name: "Em Trần Nam Khánh",
    position: "Liên đội trưởng - Lớp 9A1",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
    roleDescription: "Đại diện Liên đội, điều hành sinh hoạt Ban chỉ huy Liên đội, đôn đốc phong trào tự quản và học tập của Đội viên.",
    email: "namkhanh9a1@gmail.com"
  },
  {
    id: "3",
    name: "Em Lê Mỹ Linh",
    position: "Liên đội phó - Lớp 8B2",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80",
    roleDescription: "Phụ trách mảng văn thể mỹ, phong trào văn nghệ, báo chí và phát thanh măng non của Liên đội.",
    email: "mylinh8b2@gmail.com"
  },
  {
    id: "4",
    name: "Em Nguyễn Hoàng Nam",
    position: "Liên đội phó - Lớp 8A3",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
    roleDescription: "Phụ trách mảng nề nếp, kỷ luật, đội cờ đỏ thi đua và công tác đền ơn đáp nghĩa, chăm sóc công trình măng non.",
    email: "hoangnam8a3@gmail.com"
  }
];

export const defaultNews: NewsItem[] = [
  {
    id: "news-1",
    title: "Đại hội Liên đội nhiệm kỳ mới thành công rực rỡ",
    category: "Sự kiện",
    date: "2026-10-15",
    summary: "Đại hội Liên đội THCS Tôn Thất Tùng nhiệm kỳ 2026-2027 diễn ra long trọng nhằm tổng kết hoạt động cũ và bầu ra Ban chỉ huy Liên đội mới đầy năng nổ.",
    content: "Được sự nhất trí của Ban Giám hiệu Nhà trường và Hội đồng Đội cấp trên, Liên đội trường THCS Tôn Thất Tùng đã tổ chức thành công Đại hội Liên đội nhiệm kỳ 2026 - 2027 vào ngày 15/10/2026.\n\nTham dự Đại hội có sự hiện diện của Ban Giám hiệu, đại diện các thầy cô chủ nhiệm, và hơn 100 Đội viên ưu tú đại diện cho 32 Chi đội trong toàn trường.\n\nTrong nhiệm kỳ vừa qua, Liên đội đã hoàn thành xuất sắc các mục tiêu đề ra, đặc biệt là phong trào học tập tốt, rèn luyện chăm và cuộc vận động 'Kế hoạch nhỏ'. Đại hội đã biểu quyết thông qua phương hướng hoạt động mới, tập trung vào nâng cao kỹ năng mềm, chuyển đổi số trong hoạt động sinh hoạt Đội và phong trào bảo vệ môi trường xanh.\n\nSau thời gian làm việc nghiêm túc, Đại hội đã bầu chọn ra 15 bạn xuất sắc vào Ban chỉ huy Liên đội nhiệm kỳ mới, hứa hẹn sẽ mang lại luồng sinh khí mới cho phong trào thiếu nhi nhà trường.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
    views: 425,
    featured: true
  },
  {
    id: "news-2",
    title: "Hội diễn văn nghệ chào mừng Ngày Nhà giáo Việt Nam 20/11",
    category: "Sự kiện",
    date: "2026-11-19",
    summary: "Các Chi đội hào hứng tham gia hội diễn với những tiết mục văn nghệ đặc sắc thể hiện tấm lòng tri ân sâu sắc tới thầy cô.",
    content: "Nằm trong chuỗi hoạt động tri ân thầy cô giáo, sáng ngày 19/11/2026, Liên đội THCS Tôn Thất Tùng đã phối hợp cùng Công đoàn nhà trường tổ chức Hội diễn văn nghệ với chủ đề 'Mái trường mến yêu - Thầy cô nghĩa nặng'.\n\nHội diễn quy tụ gần 30 tiết mục ca múa nhạc, nhạc kịch, hòa tấu vô cùng đa dạng từ các Chi đội. Nhiều tiết mục được dàn dựng công phu, sáng tạo, truyền tải thông điệp ý nghĩa về tình thầy trò, công ơn dạy dỗ sâu sắc.\n\nKết quả chung cuộc, tiết mục múa 'Hành khúc người gieo hạt' của Chi đội 9A1 xuất sắc giành giải Đặc biệt, các Chi đội 8B2, 7A3 giành giải Nhất toàn khối. Hội diễn là sân chơi lành mạnh, phát huy tài năng nghệ thuật và thắt chặt tình đoàn kết giữa các Đội viên.",
    image: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&auto=format&fit=crop&q=80",
    views: 312,
    featured: true
  },
  {
    id: "news-3",
    title: "Phong trào 'Kế hoạch nhỏ' thu gom giấy vụn đợt I nhận được sự ủng hộ lớn",
    category: "Rèn luyện",
    date: "2026-11-05",
    summary: "Hơn 2 tấn giấy vụn và vỏ lon đã được thu gom thành công, xây dựng quỹ học bổng 'Vòng tay bè bạn' hỗ trợ bạn học vượt khó.",
    content: "Triển khai phong trào 'Kế hoạch nhỏ' do Hội đồng Đội phát động, Liên đội trường THCS Tôn Thất Tùng đã tổ chức đợt thu gom giấy vụn, vỏ lon đợt I năm học mới.\n\nNgay từ sáng sớm, không khí tại sân trường đã vô cùng nhộn nhịp. Các Đội viên tích cực mang đến những chồng giấy báo cũ, sách vở không còn sử dụng được phân loại gọn gàng. Từng chi đội thi đua hoàn thành và vượt chỉ tiêu đề ra.\n\nTổng kết đợt thu gom, toàn trường đã quyên góp được hơn 2.100kg giấy vụn and hơn 5.000 vỏ lon các loại. Toàn bộ số tiền thu được từ quỹ kế hoạch nhỏ sẽ được đưa vào quỹ 'Vòng tay bè bạn' để trao tặng xe đạp, sách vở và học bổng cho các bạn học sinh có hoàn cảnh khó khăn của Liên đội trong dịp Tết Nguyên Đán sắp tới.",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
    views: 189
  },
  {
    id: "news-4",
    title: "Tuyên dương gương sáng 'Dũng sĩ nghìn việc tốt' - Bạn Phạm Đức Trí lớp 7B1",
    category: "Gương sáng",
    date: "2026-12-01",
    summary: "Nhặt được ví tiền chứa tài sản lớn trên đường đến trường, bạn Trí đã nhanh chóng giao nộp cho công an để trả lại người đánh rơi.",
    content: "Liên đội THCS Tôn Thất Tùng vừa tổ chức tuyên dương dưới cờ gương sáng 'Người tốt việc tốt' đối với em Phạm Đức Trí, học sinh lớp 7B1.\n\nTrước đó, trên đường đi học, Trí phát hiện một chiếc ví màu nâu rơi gần ngã tư đường. Không chút do dự, em đã mang chiếc ví đến trụ sở công an phường gần nhất để trình báo. Qua kiểm tra, chiếc ví chứa hơn 5 triệu đồng tiền mặt cùng nhiều giấy tờ tùy thân quan trọng mang tên một cựu chiến binh trên địa bàn.\n\nNhờ sự trung thực của Trí, công an đã nhanh chóng liên hệ và hoàn trả lại nguyên vẹn tài sản cho người đánh mất. Hành động đẹp của bạn Phạm Đức Trí là tấm gương sáng về lòng trung thực, đạo đức cao đẹp của người Đội viên, nhân rộng phong trào 'Nghìn việc tốt' của Liên đội.",
    image: "https://images.unsplash.com/photo-1484712401471-05c7215a39eb?w=800&auto=format&fit=crop&q=80",
    views: 540,
    featured: true
  },
  {
    id: "news-5",
    title: "Chuyên đề ngoại khóa: Tập huấn kỹ năng phòng chống bạo lực học đường",
    category: "Học tập",
    date: "2026-09-25",
    summary: "Học sinh được trang bị kiến thức nhận diện, xử lý và phòng tránh bạo lực, xây dựng tình bạn đẹp dưới mái trường.",
    content: "Nhằm giáo dục đạo đức lối sống và kỹ năng ứng xử văn minh, Liên đội phối hợp cùng Tổ tư vấn tâm lý nhà trường tổ chức buổi sinh hoạt chuyên đề ngoại khóa 'Xây dựng tình bạn đẹp - Nói không với bạo lực học đường'.\n\nBuổi chuyên đề thu hút đông đảo học sinh tham gia với các hoạt động tương tác sôi nổi như thảo luận tình huống thực tế, đóng kịch tự biên, và giao lưu cùng chuyên gia tâm lý học đường.\n\nThầy cô đã cung cấp cho các em những bài học bổ ích về cách kiềm chế cảm xúc, cách tìm sự giúp đỡ từ thầy cô, cha mẹ khi gặp mâu thuẫn, cũng như trách nhiệm bảo vệ bạn bè xung quanh, cùng nhau kiến tạo một môi trường học đường an toàn, hạnh phúc.",
    image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80",
    views: 264
  }
];

export const defaultActivities: ActivityItem[] = [
  {
    id: "act-1",
    title: "Hội thu heo đất 'Khuyên học - Giúp bạn đến trường'",
    status: "ongoing",
    date: "2026-11-15 đến 2026-12-25",
    description: "Các Chi đội thực hiện nuôi heo đất tiết kiệm bằng tiền ăn sáng, tiết kiệm tiêu dùng để quyên góp xây dựng tủ sách hiếu học và mua thẻ bảo hiểm y tế cho các bạn có hoàn cảnh đặc biệt khó khăn.",
    requirements: "Mỗi Chi đội nhận nuôi ít nhất 1 chú heo đất, cho ăn hàng ngày thông qua tiền tiết kiệm tự nguyện của học sinh.",
    benefits: "Bồi dưỡng lòng nhân ái, thói quen tiết kiệm lành mạnh, hỗ trợ trực tiếp từ 10 - 15 bạn học sinh khó khăn tiếp tục vươn lên trong học tập.",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80",
    participantsCount: 1250
  },
  {
    id: "act-2",
    title: "Hành trình về nguồn: Học tập truyền thống tại Địa đạo Củ Chi",
    status: "upcoming",
    date: "2026-03-26",
    description: "Chương trình dã ngoại kết hợp giáo dục lịch sử ý nghĩa cho đoàn viên ưu tú và Ban chỉ huy Liên đội nhằm kỷ niệm ngày thành lập Đoàn TNCS Hồ Chí Minh.",
    requirements: "Là cán bộ Đội xuất sắc, học sinh giỏi có đạo đức tốt từ khối 8, khối 9 được Chi đội đề xuất.",
    benefits: "Được tìm hiểu thực tế lịch sử hào hùng, dâng hương tri ân các anh hùng liệt sĩ, nhận chứng nhận hoàn thành lớp bồi dưỡng Đội viên ưu tú.",
    image: "https://images.unsplash.com/photo-1544006659-f0b21f04cb1d?w=800&auto=format&fit=crop&q=80",
    participantsCount: 120
  },
  {
    id: "act-3",
    title: "Hội thi kể chuyện về tấm gương đạo đức phong cách Hồ Chí Minh",
    status: "completed",
    date: "2026-05-19",
    description: "Hội thi tuyên truyền sâu rộng trong Đội viên về cuộc đời, sự nghiệp và những bài học đạo đức giản dị nhưng sâu sắc của Bác Hồ kính yêu.",
    requirements: "Mỗi chi đội chuẩn bị một tiết mục kể chuyện có phụ họa múa, hát, thơ hoặc trình chiếu slide tư liệu.",
    benefits: "Giáo dục lòng yêu nước, rèn luyện kỹ năng thuyết trình trước đám đông và phát hiện các tài năng kể chuyện, dẫn chương trình của trường.",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80",
    participantsCount: 950
  },
  {
    id: "act-4",
    title: "Ngày hội 'Thiếu nhi khỏe - Tiến bước lên Đoàn'",
    status: "completed",
    date: "2026-03-22",
    description: "Ngày hội thể thao lớn với các trò chơi dân gian, đồng diễn thể dục, nhảy dân vũ sân trường kích thích tinh thần thể chất khỏe mạnh của Đội viên.",
    requirements: "Toàn bộ học sinh khối 6, 7, 8, 9 tham gia mặc đồng phục thể dục, mang khăn quàng đỏ.",
    benefits: "Tăng cường sức khỏe thể chất, bồi đắp kỹ năng làm việc nhóm và tạo kỷ niệm tươi đẹp dưới mái trường mến yêu.",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80",
    participantsCount: 1450
  }
];

export const defaultDocuments: DocumentItem[] = [
  {
    id: "doc-1",
    title: "Quyết định chuẩn y Ban Chỉ huy Liên đội nhiệm kỳ 2026 - 2027",
    code: "05/QĐ-HĐĐ-CVAN",
    category: "Nghị quyết",
    date: "2026-10-20",
    issuingBody: "Hội đồng Đội Quận",
    fileUrl: "#",
    fileSize: "1.2 MB"
  },
  {
    id: "doc-2",
    title: "Kế hoạch tổ chức các hoạt động chào mừng ngày thành lập Đội TNTP 15/5",
    code: "12/KH-LĐ-2026",
    category: "Kế hoạch",
    date: "2026-04-10",
    issuingBody: "Ban Chỉ huy Liên đội",
    fileUrl: "#",
    fileSize: "850 KB"
  },
  {
    id: "doc-3",
    title: "Hướng dẫn thực hiện Chương trình rèn luyện Đội viên giai đoạn mới",
    code: "02/HD-LĐ-RLDV",
    category: "Hướng dẫn",
    date: "2026-09-10",
    issuingBody: "Liên đội THCS Tôn Thất Tùng",
    fileUrl: "#",
    fileSize: "2.4 MB"
  },
  {
    id: "doc-4",
    title: "Điều lệ Đội Thiếu niên Tiền phong Hồ Chí Minh khóa VIII",
    code: "01/ĐL-TWĐ-TTP",
    category: "Điều lệ",
    date: "2025-08-15",
    issuingBody: "Ban Chấp hành Trung ương Đoàn",
    fileUrl: "#",
    fileSize: "3.1 MB"
  }
];

export const defaultPhotos: PhotoItem[] = [
  {
    id: "photo-1",
    title: "Lễ chào cờ hào hùng ngày khai giảng năm học mới",
    category: "Hoạt động",
    imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80",
    date: "2026-09-05",
    description: "Học sinh toàn trường trang nghiêm hướng về lá cờ Tổ quốc hát vang bài Tiến quân ca đầy tự hào."
  },
  {
    id: "photo-2",
    title: "Bàn giao Ban Chỉ huy Liên đội khóa mới nhiệm kỳ 2026 - 2027",
    category: "Đại hội",
    imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
    date: "2026-10-15",
    description: "Cô Tổng phụ trách trao cờ Đội truyền thống cho Ban chỉ huy Liên đội mới đầy quyết tâm."
  },
  {
    id: "photo-3",
    title: "Trận chung kết kịch tính Giải bóng đá nam cấp trường",
    category: "Thể thao",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80",
    date: "2026-11-10",
    description: "Phút giây ghi bàn quyết định đầy cảm xúc giúp Chi đội lớp 9A2 đăng quang ngôi vô địch."
  },
  {
    id: "photo-4",
    title: "Đội văn nghệ múa hoa sen tri ân ngày 20/11",
    category: "Văn nghệ",
    imageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80",
    date: "2026-11-19",
    description: "Tiết mục múa hoa sen truyền thống duyên dáng được chuẩn bị công phu từ các bạn khối 8."
  },
  {
    id: "photo-5",
    title: "Đoàn viên thanh niên dâng hương dọn dẹp Nghĩa trang Liệt sĩ",
    category: "Hoạt động",
    imageUrl: "https://images.unsplash.com/photo-1545231027-63b6f2437214?w=800&auto=format&fit=crop&q=80",
    date: "2026-07-27",
    description: "Hoạt động đền ơn đáp nghĩa giáo dục tình yêu thương, lòng biết ơn sâu sắc đối với các anh hùng."
  },
  {
    id: "photo-6",
    title: "Lớp học cảm tình Đoàn đầy trang trọng cho khối 9",
    category: "Hoạt động",
    imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
    date: "2026-03-10",
    description: "Các Đội viên ưu tú lắng nghe giáo dục lý tưởng cách mạng chuẩn bị đứng vào hàng ngũ của Đoàn."
  }
];

export const defaultAchievements: AchievementItem[] = [
  {
    id: "ach-1",
    year: "2025",
    title: "Cờ Thi Đua Dẫn Đầu Phong Trào Đội Toàn Thành Phố",
    description: "Thành tích cao quý do Hội đồng Đội Thành phố trao tặng nhờ nỗ lực thi đua rèn luyện xuất sắc của tập thể học sinh và giáo viên trường.",
    badge: "🏆"
  },
  {
    id: "ach-2",
    year: "2024",
    title: "Bằng khen của Trung ương Đoàn TNCS Hồ Chí Minh",
    description: "Khen thưởng tập thể có thành tích xuất sắc đặc biệt trong công tác Đội và phong trào thiếu nhi trường học toàn quốc.",
    badge: "🥇"
  },
  {
    id: "ach-3",
    year: "2023",
    title: "Liên đội Mạnh Xuất Sắc cấp Quận liên tục 5 năm liền",
    description: "Danh hiệu ghi nhận nề nếp sinh hoạt vững mạnh, các phong trào kế hoạch nhỏ, rèn luyện đội viên luôn duy trì chất lượng hàng đầu.",
    badge: "⭐"
  }
];
