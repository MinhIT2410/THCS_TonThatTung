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
} as const;

export type RouteKeys = keyof typeof ROUTES;
