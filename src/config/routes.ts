/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ROUTES = {
  HOME: '/',
  ABOUT: '/gioi-thieu',
  NEWS: '/tin-tuc',
  ACTIVITIES: '/hoat-dong',
  GALLERY: '/thu-vien',
  DOCUMENTS: '/van-ban',
  CONTACT: '/lien-he',
  ADMIN: '/quan-tri',
  LOGIN: '/dang-nhap',
  RESET_PASSWORD: '/reset-password',
} as const;

export type RouteKeys = keyof typeof ROUTES;
