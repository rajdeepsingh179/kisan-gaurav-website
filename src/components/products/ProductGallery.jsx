import { useState } from "react";

import { cn } from "../../utils/cn";

export default function ProductGallery({ images, productName }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  return (
    <div className="min-w-0">
      <div className="aspect-square overflow-hidden rounded-card border border-border bg-primary-50 shadow-card">
        <img
          alt={activeImage.alt}
          className="h-full w-full object-cover"
          decoding="async"
          fetchPriority="high"
          height={activeImage.largeWidth}
          sizes="(min-width: 1024px) 50vw, 100vw"
          src={activeImage.large}
          srcSet={`${activeImage.small} ${activeImage.smallWidth}w, ${activeImage.large} ${activeImage.largeWidth}w`}
          width={activeImage.largeWidth}
        />
      </div>
      <div aria-label={`${productName} image gallery`} className="mt-3 grid grid-cols-4 gap-3" role="list">
        {images.map((image, index) => (
          <div key={`${image.large}-${index}`} role="listitem">
            <button
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-pressed={activeIndex === index}
              className={cn(
                "aspect-square min-h-11 w-full overflow-hidden rounded-control border-2 bg-surface transition",
                activeIndex === index ? "border-primary-600 shadow-soft" : "border-transparent hover:border-primary-200",
              )}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <img alt="" className="h-full w-full object-cover" height="120" loading="lazy" src={image.small} width="120" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
