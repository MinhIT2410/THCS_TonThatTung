/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../services/supabaseClient';

export interface CreateUserInput {
  full_name: string;
  email: string;
  roles: string[];
  class_id?: string | null;
  academic_year_id?: string | null;
}

export const userCreationApi = {
  /**
   * Invoke Edge Function to create a user with specified details.
   */
  async createUser(input: CreateUserInput) {
    const { data, error } = await supabase.functions.invoke('admin-create-users', {
      body: {
        action: 'create_one',
        user: {
          full_name: input.full_name,
          email: input.email,
          roles: input.roles,
          class_id: input.class_id || null,
          academic_year_id: input.academic_year_id || null
        }
      }
    });

    if (error) {
      // Direct invoke error
      throw error;
    }

    return data;
  },

  /**
   * Fetch all academic years to support enrollment assignment.
   */
  async getAcademicYears() {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  },

  /**
   * Fetch all classes to support student assignment.
   */
  async getClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('grade_level', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  }
};
