/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LeaderProfile, AchievementItem } from '../types';
import { SCHOOL_NAME, SCHOOL_SLOGAN, defaultLeaders, defaultAchievements } from '../data/about';

/**
 * Service to manage School Profile, Leaders, and Achievements
 */
export const aboutService = {
  /**
   * Get all leader profiles (default collection)
   */
  getAll(): LeaderProfile[] {
    return defaultLeaders;
  },

  /**
   * Get a single leader profile by ID
   */
  getById(id: string): LeaderProfile | undefined {
    return defaultLeaders.find(item => item.id === id);
  },

  /**
   * Get the school name
   */
  getSchoolName(): string {
    return SCHOOL_NAME;
  },

  /**
   * Get the school slogan
   */
  getSchoolSlogan(): string {
    return SCHOOL_SLOGAN;
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
