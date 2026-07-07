/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import About from '../components/home/About';
import { LeaderProfile, AchievementItem } from '../types';

interface AboutPageContext {
  leaders: LeaderProfile[];
  achievements: AchievementItem[];
}

export default function AboutPage() {
  const { leaders, achievements } = useOutletContext<AboutPageContext>();

  return (
    <About
      leaders={leaders}
      achievements={achievements}
    />
  );
}
