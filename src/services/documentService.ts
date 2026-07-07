/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentItem } from '../types';
import { defaultDocuments } from '../data/documents';
import { storage } from './storage/localStorage';

const STORAGE_KEY = 'documents';

/**
 * Service to manage Document data with local storage persistence
 */
export const documentService = {
  /**
   * Get all document items
   */
  getAll(): DocumentItem[] {
    const saved = storage.get<DocumentItem[]>(STORAGE_KEY);
    return saved !== null ? saved : defaultDocuments;
  },

  /**
   * Save all document items to storage
   */
  saveAll(documents: DocumentItem[]): void {
    storage.set<DocumentItem[]>(STORAGE_KEY, documents);
  },

  /**
   * Get a single document item by ID
   */
  getById(id: string): DocumentItem | undefined {
    const list = this.getAll();
    return list.find(item => item.id === id);
  },

  /**
   * Create a new document item
   */
  create(item: Omit<DocumentItem, 'id'>): DocumentItem {
    const list = this.getAll();
    const newItem: DocumentItem = {
      ...item,
      id: `doc-${Date.now()}`
    };
    list.unshift(newItem);
    this.saveAll(list);
    return newItem;
  },

  /**
   * Update an existing document item
   */
  update(id: string, updatedFields: Partial<DocumentItem>): DocumentItem {
    const list = this.getAll();
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) {
      throw new Error(`Document with ID ${id} not found`);
    }
    const updatedItem = { ...list[idx], ...updatedFields };
    list[idx] = updatedItem;
    this.saveAll(list);
    return updatedItem;
  },

  /**
   * Delete a document item
   */
  delete(id: string): void {
    const list = this.getAll();
    const filtered = list.filter(item => item.id !== id);
    this.saveAll(filtered);
  }
};
