/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  Newspaper,
  FileText,
  Image as ImageIcon,
  Paintbrush,
  Users,
  Settings,
  LucideIcon
} from 'lucide-react';

export interface AdminMenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    label: 'Tổng quan',
    href: '/quan-tri',
    icon: LayoutDashboard,
  },
  {
    label: 'Tin tức',
    href: '/quan-tri/tin-tuc',
    icon: Newspaper,
  },
  {
    label: 'Tài liệu',
    href: '/quan-tri/tai-lieu',
    icon: FileText,
  },
  {
    label: 'Album ảnh',
    href: '/quan-tri/album',
    icon: ImageIcon,
  },
  {
    label: 'CMS giao diện',
    href: '/quan-tri/cms',
    icon: Paintbrush,
  },
  {
    label: 'Người dùng',
    href: '/quan-tri/nguoi-dung',
    icon: Users,
  },
  {
    label: 'Cài đặt',
    href: '/quan-tri/cai-dat',
    icon: Settings,
  },
];
