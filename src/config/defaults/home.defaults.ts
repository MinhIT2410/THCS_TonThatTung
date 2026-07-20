/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HeroButtonConfig = {
  label: string;
  href: string;
};

export type BadgeConfig = {
  title: string;
  description: string;
};

export type DecorativeImageConfig = {
  url: string;
  alt: string;
  tag: string;
  title: string;
};

export type HomeHeroConfig = {
  title: string;
  subtitle: string;
  description: string;
  backgroundImage: string;
  primaryButton: HeroButtonConfig;
  secondaryButton: HeroButtonConfig;
  badge1: BadgeConfig;
  badge2: BadgeConfig;
  decorImage: DecorativeImageConfig;
};

export const HOME_HERO_DEFAULT: HomeHeroConfig = {
  title: "Chào mừng bạn đến với Liên đội trường THCS Tôn Thất Tùng",
  subtitle: "Nơi ươm mầm tri thức, nuôi dưỡng ước mơ và xây dựng hoài bão cho tương lai Đội viên",
  description: "Nơi nuôi dưỡng lý tưởng cách mạng, bồi dưỡng kỹ năng toàn diện, rèn luyện phẩm chất Đội viên tài năng, sẵn sàng tiếp bước xây dựng Tổ quốc xã hội chủ nghĩa tươi đẹp.",
  backgroundImage: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&auto=format&fit=crop&q=80",
  primaryButton: {
    label: "Xem hoạt động nổi bật",
    href: "/hoat-dong",
  },
  secondaryButton: {
    label: "Tìm hiểu truyền thống",
    href: "/gioi-thieu",
  },
  badge1: {
    title: "Liên đội mạnh",
    description: "Năm học 2025 - 2026",
  },
  badge2: {
    title: "100% Đội viên",
    description: "Rèn luyện đạt chuẩn",
  },
  decorImage: {
    url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80",
    alt: "Pioneer Activities",
    tag: "Sinh hoạt Đội",
    title: "Hành trình rèn luyện phấn đấu lên Đoàn",
  },
};
