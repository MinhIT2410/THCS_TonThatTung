/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Home from '../components/home/Home';
import { NewsItem, ActivityItem, PhotoItem } from '../types';

interface HomePageContext {
  news: NewsItem[];
  activities: ActivityItem[];
  photos: PhotoItem[];
  handleNavigate: (viewId: string) => void;
  handleSelectNewsItem: (item: NewsItem) => void;
  handleSelectActivityItem: (item: ActivityItem) => void;
}

export default function HomePage() {
  const {
    news,
    activities,
    photos,
    handleNavigate,
    handleSelectNewsItem,
    handleSelectActivityItem
  } = useOutletContext<HomePageContext>();

  return (
    <Home
      news={news}
      activities={activities}
      photos={photos}
      onNavigate={handleNavigate}
      onSelectNews={handleSelectNewsItem}
      onSelectActivity={handleSelectActivityItem}
    />
  );
}
