/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhotoItem } from '../types';
import { defaultPhotos } from '../data/gallery';
import { storage } from './storage/localStorage';

const STORAGE_KEY = 'photos';

/**
 * Service to manage Gallery (Photo) data with local storage persistence
 */
export const galleryService = {
  /**
   * Get all photo items
   */
  getAll(): PhotoItem[] {
    const saved = storage.get<PhotoItem[]>(STORAGE_KEY);
    return saved !== null ? saved : defaultPhotos;
  },

  /**
   * Save all photo items to storage
   */
  saveAll(photos: PhotoItem[]): void {
    storage.set<PhotoItem[]>(STORAGE_KEY, photos);
  },

  /**
   * Get a single photo item by ID
   */
  getById(id: string): PhotoItem | undefined {
    const list = this.getAll();
    return list.find(item => item.id === id);
  },

  /**
   * Create a new photo item
   */
  create(item: Omit<PhotoItem, 'id'>): PhotoItem {
    const list = this.getAll();
    const newItem: PhotoItem = {
      ...item,
      id: `photo-${Date.now()}`
    };
    list.unshift(newItem);
    this.saveAll(list);
    return newItem;
  },

  /**
   * Update an existing photo item
   */
  update(id: string, updatedFields: Partial<PhotoItem>): PhotoItem {
    const list = this.getAll();
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) {
      throw new Error(`Photo item with ID ${id} not found`);
    }
    const updatedItem = { ...list[idx], ...updatedFields };
    list[idx] = updatedItem;
    this.saveAll(list);
    return updatedItem;
  },

  /**
   * Delete a photo item
   */
  delete(id: string): void {
    const list = this.getAll();
    const filtered = list.filter(item => item.id !== id);
    this.saveAll(filtered);
  }
};
