import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

import type { CategoryCardProps } from '@/types/components';

const PLACEHOLDER = 'https://placehold.co/300x300/f3f4f6/a3a3a3?text=IMG';

export default function CategoryCard({ category }: CategoryCardProps): React.ReactElement {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleCategoryClick = (): void => {
    navigate(`/productos?categoria=${encodeURIComponent(category.id)}`);
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    handleCategoryClick();
  };

  const media = category.media;
  const isVideo = media?.tipo === 'video' && Boolean(media.url);
  const visualSrc = media?.url || category.image || PLACEHOLDER;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    target.src = PLACEHOLDER;
  };

  const handleVideoError = (): void => {
    if (videoRef.current) {
      videoRef.current.style.display = 'none';
    }
  };

  return (
    <Card
      onClick={handleCategoryClick}
      className="
        relative cursor-pointer
        h-[300px] w-full
        flex flex-col
        overflow-hidden
        border-none shadow-none
        items-center justify-center
        bg-muted/50
        transition-all duration-300 ease-in-out
        hover:translate-y-[-2px] hover:shadow-xl
        group
      "
    >
      <div className="relative h-full w-full flex items-center justify-center p-6">
        {isVideo ? (
          <video
            ref={videoRef}
            src={visualSrc}
            className="
              w-full h-full
              max-w-[80%] max-h-[80%]
              object-cover object-center
              rounded-md
              transition-transform duration-500 ease-out
              group-hover:scale-[1.05]
            "
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={handleVideoError}
          />
        ) : (
          <img
            src={visualSrc}
            alt={category.name}
            className="
              w-full h-full
              max-w-[80%] max-h-[80%]
              object-contain object-center
              transition-transform duration-500 ease-out
              group-hover:scale-[1.05]
              block
            "
            onError={handleImageError}
          />
        )}

        <div
          className="
            absolute inset-0
            bg-gradient-to-t from-black/40 to-transparent/50
            flex flex-col justify-end
            p-4
            pointer-events-none
          "
        >
          <div className="flex justify-between items-center w-full pointer-events-auto">
            <h3 className="text-base text-white font-semibold drop-shadow-md capitalize">
              {String(category.name || '').toLowerCase()}
            </h3>
            <Button
              onClick={handleButtonClick}
              variant="default"
              size="icon"
              className="
                h-7 w-7 p-0 rounded-full
                border border-input
                transition-all duration-300
                hover:scale-[1.1]
              "
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
