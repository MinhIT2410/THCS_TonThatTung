/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LeaderProfile, AchievementItem } from '../types';
import { SCHOOL_NAME, SCHOOL_SLOGAN, defaultLeaders, defaultAchievements } from '../data/about';
import { storage } from './storage/localStorage';

const LEADERS_STORAGE_KEY = 'leaders';
const SCHOOL_NAME_KEY = 'schoolName';
const SCHOOL_SLOGAN_KEY = 'schoolSlogan';

/**
 * Service to manage School Profile, Leaders, and Achievements
 */
export const aboutService = {
  /**
   * Get all leader profiles
   */
  getAll(): LeaderProfile[] {
    const saved = storage.get<LeaderProfile[]>(LEADERS_STORAGE_KEY);
    return saved !== null ? saved : defaultLeaders;
  },

  /**
   * Save all leader profiles to storage
   */
  saveAll(leaders: LeaderProfile[]): void {
    storage.set<LeaderProfile[]>(LEADERS_STORAGE_KEY, leaders);
  },

  /**
   * Get a single leader profile by ID
   */
  getById(id: string): LeaderProfile | undefined {
    const list = this.getAll();
    return list.find(item => item.id === id);
  },

  /**
   * Create a new leader profile
   */
  create(item: Omit<LeaderProfile, 'id'>): LeaderProfile {
    const list = this.getAll();
    const newItem: LeaderProfile = {
      ...item,
      id: `${Date.now()}`
    };
    list.push(newItem);
    this.saveAll(list);
    return newItem;
  },

  /**
   * Update an existing leader profile
   */
  update(id: string, updatedFields: Partial<LeaderProfile>): LeaderProfile {
    const list = this.getAll();
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) {
      throw new Error(`Leader profile with ID ${id} not found`);
    }
    const updatedItem = { ...list[idx], ...updatedFields };
    list[idx] = updatedItem;
    this.saveAll(list);
    return updatedItem;
  },

  /**
   * Delete a leader profile
   */
  delete(id: string): void {
    const list = this.getAll();
    const filtered = list.filter(item => item.id !== id);
    this.saveAll(filtered);
  },

  /**
   * Get the school name
   */
  getSchoolName(): string {
    const saved = storage.get<string>(SCHOOL_NAME_KEY);
    return saved !== null ? saved : SCHOOL_NAME;
  },

  /**
   * Get the school slogan
   */
  getSchoolSlogan(): string {
    const saved = storage.get<string>(SCHOOL_SLOGAN_KEY);
    return saved !== null ? saved : SCHOOL_SLOGAN;
  },

  /**
   * Get all achievements
   */
  getAchievements(): AchievementItem[] {
    return defaultAchievements;
  },

  /**
   * Get a single achievement by ID
   */
  getAchievementById(id: string): AchievementItem | undefined {
    return defaultAchievements.find(item => item.id === id);
  }
};
