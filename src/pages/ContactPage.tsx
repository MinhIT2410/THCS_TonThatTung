/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Contact from '../components/contact/Contact';
import { ContactSubmission } from '../types';

interface ContactPageContext {
  handleSubmitContactForm: (submission: Omit<ContactSubmission, 'id' | 'date' | 'status'>) => void;
}

export default function ContactPage() {
  const { handleSubmitContactForm } = useOutletContext<ContactPageContext>();

  return (
    <Contact onSubmitContact={handleSubmitContactForm} />
  );
}
