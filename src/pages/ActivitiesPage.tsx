/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Activities from '../components/activity/Activities';
import { ActivityItem } from '../types';
import { cmsService } from '../services/cmsService';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  useEffect(() => {
    async function loadActivities() {
      try {
        setLoading(true);
        const posts = await cmsService.getPublishedPosts('hoat-dong');
        const mappedActivities = posts.map(post => ({
          id: String(post.id),
          title: post.title,
          status: 'ongoing' as const, // Match default active status
          date: post.published_at ? new Date(post.published_at).toLocaleDateString('vi-VN') : new Date(post.created_at).toLocaleDateString('vi-VN'),
          description: post.excerpt || '',
          requirements: 'Tham gia đầy đủ các hoạt động phong trào theo hướng dẫn của Liên đội.',
          benefits: 'Được tuyên dương, ghi nhận thành tích thi đua Cháu ngoan Bác Hồ.',
          image: post.cover_image_url || 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
          participantsCount: 150
        }));
        setActivities(mappedActivities);
      } catch (err) {
        console.error('Error loading activities:', err);
        setError('Không thể tải hoạt động phong trào từ Supabase.');
      } finally {
        setLoading(false);
      }
    }
    loadActivities();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 font-bold text-slate-600 dark:text-slate-400">Đang tải hoạt động phong trào từ Supabase...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-red-500 font-bold">{error}</p>
      </div>
    );
  }

  return (
    <Activities
      activities={activities}
      selectedItem={selectedActivity}
      onSelectItem={setSelectedActivity}
      onRegisterParticipation={() => {}}
    />
  );
}
