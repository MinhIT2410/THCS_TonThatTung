/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Documents from '../components/documents/Documents';
import { DocumentItem } from '../types';

interface DocumentsPageContext {
  documents: DocumentItem[];
}

export default function DocumentsPage() {
  const { documents } = useOutletContext<DocumentsPageContext>();

  return (
    <Documents documents={documents} />
  );
}
