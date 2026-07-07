/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentItem } from '../types';
import { defaultDocuments } from '../data';

/**
 * Service to manage Document data
 */
export const documentService = {
  /**
   * Get all document items
   */
  getAll(): DocumentItem[] {
    return defaultDocuments;
  },

  /**
   * Get a single document item by ID
   */
  getById(id: string): DocumentItem | undefined {
    return defaultDocuments.find(item => item.id === id);
  }
};
