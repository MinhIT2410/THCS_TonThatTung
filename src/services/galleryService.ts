/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhotoItem } from '../types';
import { defaultPhotos } from '../data';

/**
 * Service to manage Gallery (Photo) data
 */
export const galleryService = {
  /**
   * Get all photo items
   */
  getAll(): PhotoItem[] {
    return defaultPhotos;
  },

  /**
   * Get a single photo item by ID
   */
  getById(id: string): PhotoItem | undefined {
    return defaultPhotos.find(item => item.id === id);
  }
};
