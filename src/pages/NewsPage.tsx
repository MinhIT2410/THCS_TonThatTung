/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import News from '../components/news/News';
import { NewsItem } from '../types';

interface NewsPageContext {
  news: NewsItem[];
  selectedNews: NewsItem | null;
  setSelectedNews: (item: NewsItem | null) => void;
  handleIncrementNewsViews: (id: string) => void;
}

export default function NewsPage() {
  const {
    news,
    selectedNews,
    setSelectedNews,
    handleIncrementNewsViews
  } = useOutletContext<NewsPageContext>();

  return (
    <News
      news={news}
      selectedItem={selectedNews}
      onSelectItem={setSelectedNews}
      onIncrementViews={handleIncrementNewsViews}
    />
  );
}
