/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Storage utility layer for interacting with local storage
 */
export const storage = {
  /**
   * Get an item from localStorage with safe JSON parsing fallback
   */
  get<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        // If it fails to parse (e.g. raw primitive string), return the value as is
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`Error getting key "${key}" from localStorage:`, error);
      return null;
    }
  },

  /**
   * Set an item in localStorage, serializing to JSON when appropriate
   */
  set<T>(key: string, value: T): void {
    try {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting key "${key}" in localStorage:`, error);
    }
  },

  /**
   * Remove an item from localStorage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing key "${key}" from localStorage:`, error);
    }
  },

  /**
   * Clear all items in localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};
