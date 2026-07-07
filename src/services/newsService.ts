/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NewsItem } from '../types';
import { defaultNews } from '../data/news';

const STORAGE_KEY = 'news';

/**
 * Service to manage News data with local storage persistence
 */
export const newsService = {
  /**
   * Get all news items
   */
  getAll(): NewsItem[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultNews;
  },

  /**
   * Save all news items to storage
   */
  saveAll(news: NewsItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(news));
  },

  /**
   * Get a single news item by ID
   */
  getById(id: string): NewsItem | undefined {
    const list = this.getAll();
    return list.find(item => item.id === id);
  },

  /**
   * Add a new news item
   */
  create(item: Omit<NewsItem, 'id' | 'views'>): NewsItem {
    const list = this.getAll();
    const newItem: NewsItem = {
      ...item,
      id: `news-${Date.now()}`,
      views: 0
    };
    list.unshift(newItem);
    this.saveAll(list);
    return newItem;
  },

  /**
   * Update an existing news item
   */
  update(id: string, updatedFields: Partial<NewsItem>): NewsItem {
    const list = this.getAll();
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) {
      throw new Error(`News item with ID ${id} not found`);
    }
    const updatedItem = { ...list[idx], ...updatedFields };
    list[idx] = updatedItem;
    this.saveAll(list);
    return updatedItem;
  },

  /**
   * Delete a news item
   */
  delete(id: string): void {
    const list = this.getAll();
    const filtered = list.filter(item => item.id !== id);
    this.saveAll(filtered);
  },

  /**
   * Increment the view count of an article
   */
  incrementViews(id: string): void {
    try {
      const list = this.getAll();
      const idx = list.findIndex(item => item.id === id);
      if (idx !== -1) {
        list[idx].views = (list[idx].views || 0) + 1;
        this.saveAll(list);
      }
    } catch (e) {
      console.error('Failed to increment views', e);
    }
  }
};
