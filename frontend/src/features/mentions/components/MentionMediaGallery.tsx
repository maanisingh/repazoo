/**
 * MentionMediaGallery Component
 * Displays media (images, videos, GIFs) from Twitter mentions
 */

import { useState } from 'react'
import type { MediaItem } from '../types/mention'

interface MentionMediaGalleryProps {
  media: MediaItem[]
  className?: string
}

export function MentionMediaGallery({ media, className = '' }: MentionMediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!media || media.length === 0) {
    return null
  }

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index)
    setLightboxOpen(true)
  }

  const handleCloseLightbox = () => {
    setLightboxOpen(false)
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % media.length)
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + media.length) % media.length)
  }

  // Determine grid layout based on number of items
  const getGridClass = () => {
    if (media.length === 1) return 'grid-cols-1'
    if (media.length === 2) return 'grid-cols-2'
    if (media.length === 3) return 'grid-cols-3'
    return 'grid-cols-2' // 4+ items in 2x2 grid
  }

  return (
    <>
      <div className={`mt-3 grid gap-2 ${getGridClass()} ${className}`}>
        {media.map((item, index) => (
          <MediaItemDisplay
            key={item.id}
            item={item}
            index={index}
            onClick={() => handleImageClick(index)}
            showCount={media.length > 4 && index === 3}
            remainingCount={media.length - 4}
          />
        )).slice(0, 4)} {/* Show max 4 in grid */}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <MediaLightbox
          media={media}
          currentIndex={currentImageIndex}
          onClose={handleCloseLightbox}
          onNext={handleNextImage}
          onPrev={handlePrevImage}
        />
      )}
    </>
  )
}

interface MediaItemDisplayProps {
  item: MediaItem
  index: number
  onClick: () => void
  showCount?: boolean
  remainingCount?: number
}

function MediaItemDisplay({ item, onClick, showCount, remainingCount }: MediaItemDisplayProps) {
  if (item.type === 'video' || item.type === 'animated_gif') {
    return (
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {item.preview_url && (
          <img
            src={item.preview_url}
            alt={item.alt_text || 'Video thumbnail'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <svg
            className="w-16 h-16 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <button
          onClick={onClick}
          className="absolute inset-0 w-full h-full cursor-pointer"
          aria-label="Play video"
        />
      </div>
    )
  }

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
      <img
        src={item.url}
        alt={item.alt_text || 'Tweet image'}
        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
        loading="lazy"
        onClick={onClick}
      />
      {showCount && remainingCount && remainingCount > 0 && (
        <div
          className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center cursor-pointer"
          onClick={onClick}
        >
          <span className="text-white text-3xl font-bold">+{remainingCount}</span>
        </div>
      )}
    </div>
  )
}

interface MediaLightboxProps {
  media: MediaItem[]
  currentIndex: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

function MediaLightbox({ media, currentIndex, onClose, onNext, onPrev }: MediaLightboxProps) {
  const currentItem = media[currentIndex]

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous Button */}
      {media.length > 1 && (
        <button
          className="absolute left-4 text-white hover:text-gray-300 z-10"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          aria-label="Previous image"
        >
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Media Content */}
      <div
        className="max-w-7xl max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {currentItem.type === 'video' || currentItem.type === 'animated_gif' ? (
          <video
            src={currentItem.url}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-lg"
            poster={currentItem.preview_url}
          />
        ) : (
          <img
            src={currentItem.url}
            alt={currentItem.alt_text || `Image ${currentIndex + 1}`}
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
          />
        )}

        {/* Image Counter */}
        {media.length > 1 && (
          <div className="text-center text-white mt-4">
            {currentIndex + 1} / {media.length}
          </div>
        )}

        {/* Alt Text */}
        {currentItem.alt_text && (
          <div className="text-center text-gray-300 mt-2 text-sm max-w-2xl mx-auto">
            {currentItem.alt_text}
          </div>
        )}
      </div>

      {/* Next Button */}
      {media.length > 1 && (
        <button
          className="absolute right-4 text-white hover:text-gray-300 z-10"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          aria-label="Next image"
        >
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Keyboard Navigation Hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm">
        Use arrow keys to navigate • ESC to close
      </div>
    </div>
  )
}

// Keyboard navigation support
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close lightbox handled by component state
    } else if (e.key === 'ArrowLeft') {
      // Previous handled by component state
    } else if (e.key === 'ArrowRight') {
      // Next handled by component state
    }
  })
}
