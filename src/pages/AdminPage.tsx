/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import CMS from '../components/admin/CMS';
import { NewsItem, ActivityItem, PhotoItem, DocumentItem, ContactSubmission } from '../types';

interface AdminPageContext {
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  schoolName: string;
  setSchoolName: (name: string) => void;
  schoolSlogan: string;
  setSchoolSlogan: (slogan: string) => void;
  news: NewsItem[];
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  activities: ActivityItem[];
  setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  photos: PhotoItem[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoItem[]>>;
  documents: DocumentItem[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentItem[]>>;
  contacts: ContactSubmission[];
  setContacts: React.Dispatch<React.SetStateAction<ContactSubmission[]>>;
  handleResetDefaults: () => void;
}

export default function AdminPage() {
  const {
    isAdmin,
    setIsAdmin,
    schoolName,
    setSchoolName,
    schoolSlogan,
    setSchoolSlogan,
    news,
    setNews,
    activities,
    setActivities,
    photos,
    setPhotos,
    documents,
    setDocuments,
    contacts,
    setContacts,
    handleResetDefaults
  } = useOutletContext<AdminPageContext>();

  return (
    <CMS
      isAdmin={isAdmin}
      setIsAdmin={setIsAdmin}
      schoolName={schoolName}
      setSchoolName={setSchoolName}
      schoolSlogan={schoolSlogan}
      setSchoolSlogan={setSchoolSlogan}
      news={news}
      setNews={setNews}
      activities={activities}
      setActivities={setActivities}
      photos={photos}
      setPhotos={setPhotos}
      documents={documents}
      setDocuments={setDocuments}
      contacts={contacts}
      setContacts={setContacts}
      onResetDefaults={handleResetDefaults}
    />
  );
}
