/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Activities from '../components/activity/Activities';
import { ActivityItem } from '../types';

interface ActivitiesPageContext {
  activities: ActivityItem[];
  selectedActivity: ActivityItem | null;
  setSelectedActivity: (item: ActivityItem | null) => void;
  handleRegisterActivityParticipation: (id: string) => void;
}

export default function ActivitiesPage() {
  const {
    activities,
    selectedActivity,
    setSelectedActivity,
    handleRegisterActivityParticipation
  } = useOutletContext<ActivitiesPageContext>();

  return (
    <Activities
      activities={activities}
      selectedItem={selectedActivity}
      onSelectItem={setSelectedActivity}
      onRegisterParticipation={handleRegisterActivityParticipation}
    />
  );
}
