/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Gallery from '../components/gallery/Gallery';
import { PhotoItem } from '../types';

interface GalleryPageContext {
  photos: PhotoItem[];
}

export default function GalleryPage() {
  const { photos } = useOutletContext<GalleryPageContext>();

  return (
    <Gallery photos={photos} />
  );
}
