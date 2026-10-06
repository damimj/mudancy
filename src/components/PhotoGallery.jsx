import { useState } from 'react'
import styles from './PhotoGallery.module.css'

export default function PhotoGallery({ images, alt }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const photos = images && images.length > 0 ? images : [null]

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        {photos[activeIndex] ? (
          <img src={photos[activeIndex]} alt={alt} className={styles.mainImage} />
        ) : (
          <div className={styles.placeholder} />
        )}
      </div>
      {photos.length > 1 && (
        <div className={styles.thumbs}>
          {photos.map((src, index) => (
            <button
              key={src || index}
              type="button"
              className={index === activeIndex ? styles.thumbActive : styles.thumb}
              onClick={() => setActiveIndex(index)}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
