/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActivityItem } from '../types';
import { defaultActivities } from '../data';

const STORAGE_KEY = 'activities';
const REGISTRATION_KEY = 'activity_registrations';

export interface ActivityRegistration {
  id: string;
  activityId: string;
  fullName: string;
  className: string;
  phone?: string;
  date: string;
}

/**
 * Service to manage Activities and youth pioneer registrations
 */
export const activityService = {
  /**
   * Get all activities
   */
  getAll(): ActivityItem[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultActivities;
  },

  /**
   * Get a single activity by ID
   */
  getById(id: string): ActivityItem | undefined {
    const list = this.getAll();
    return list.find(item => item.id === id);
  },

  /**
   * Save all activities
   */
  saveAll(activities: ActivityItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  },

  /**
   * Register a student for an activity
   */
  register(activityId: string, fullName: string, className: string, phone?: string): ActivityRegistration {
    // 1. Save registration details
    const registrations = this.getRegistrations();
    const newReg: ActivityRegistration = {
      id: `reg-${Date.now()}`,
      activityId,
      fullName,
      className,
      phone,
      date: new Date().toISOString().split('T')[0]
    };
    registrations.push(newReg);
    localStorage.setItem(REGISTRATION_KEY, JSON.stringify(registrations));

    // 2. Increment participant count on the activity itself
    const activities = this.getAll();
    const idx = activities.findIndex(act => act.id === activityId);
    if (idx !== -1) {
      activities[idx].participantsCount = (activities[idx].participantsCount || 0) + 1;
      this.saveAll(activities);
    }

    return newReg;
  },

  /**
   * Get list of all registrations
   */
  getRegistrations(): ActivityRegistration[] {
    const saved = localStorage.getItem(REGISTRATION_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  /**
   * Get registrations specifically for one activity
   */
  getRegistrationsForActivity(activityId: string): ActivityRegistration[] {
    return this.getRegistrations().filter(reg => reg.activityId === activityId);
  },

  /**
   * Create a new activity
   */
  create(item: Omit<ActivityItem, 'id' | 'participantsCount'>): ActivityItem {
    const list = this.getAll();
    const newItem: ActivityItem = {
      ...item,
      id: `activity-${Date.now()}`,
      participantsCount: 0
    };
    list.unshift(newItem);
    this.saveAll(list);
    return newItem;
  },

  /**
   * Update an existing activity
   */
  update(id: string, updatedFields: Partial<ActivityItem>): ActivityItem {
    const list = this.getAll();
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) {
      throw new Error(`Activity with ID ${id} not found`);
    }
    const updatedItem = { ...list[idx], ...updatedFields };
    list[idx] = updatedItem;
    this.saveAll(list);
    return updatedItem;
  },

  /**
   * Delete an activity
   */
  delete(id: string): void {
    const list = this.getAll();
    const filtered = list.filter(item => item.id !== id);
    this.saveAll(filtered);
  }
};
