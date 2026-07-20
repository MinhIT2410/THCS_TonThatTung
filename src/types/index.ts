/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NewsItem {
  id: string;
  title: string;
  slug?: string;
  category: 'Học tập' | 'Rèn luyện' | 'Sự kiện' | 'Gương sáng' | 'Tin tức';
  date: string;
  summary: string;
  content: string;
  image: string;
  views: number;
  featured?: boolean;
}

export interface ActivityItem {
  id: string;
  title: string;
  status: 'ongoing' | 'upcoming' | 'completed';
  date: string;
  description: string;
  requirements?: string;
  benefits?: string;
  image: string;
  participantsCount: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  code: string;
  category: 'Nghị quyết' | 'Kế hoạch' | 'Điều lệ' | 'Hướng dẫn';
  date: string;
  issuingBody: string;
  fileUrl: string;
  fileSize: string;
  fileType?: string;
  fileName?: string;
}

export interface PhotoItem {
  id: string;
  title: string;
  category: 'Hoạt động' | 'Đại hội' | 'Thể thao' | 'Văn nghệ';
  imageUrl: string;
  date: string;
  description?: string;
}

export interface ContactSubmission {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  date: string;
  status: 'unread' | 'read' | 'replied';
}

export interface LeaderProfile {
  id: string;
  name: string;
  position: string;
  avatar: string;
  roleDescription: string;
  email?: string;
}

export interface AchievementItem {
  id: string;
  year: string;
  title: string;
  description: string;
  badge: string;
}
