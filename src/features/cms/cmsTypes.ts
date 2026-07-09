/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CmsOverride {
  id: string;
  page_key: string;
  block_key: string;
  data: any;
  is_enabled: boolean;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}
