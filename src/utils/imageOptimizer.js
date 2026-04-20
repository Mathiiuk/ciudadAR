/**
 * Utilidad asíncrona para transformar imágenes capturadas con
 * la cámara del celular a un formato amigable para web (WebP) 
 * altamente comprimido. 
 * Pasando de ~8MB a ~100KB y previniendo colapso en S3.
 */
export const processImageToWebP = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject("No file provided");

    const reader = new FileReader()
    reader.onerror = reject
    
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scaleSize = maxWidth / img.width
        
        // Si la imagen es más pequeña que maxWidth, no la escalamos hacia arriba.
        const actualScale = scaleSize < 1 ? scaleSize : 1
        canvas.width = img.width * actualScale
        canvas.height = img.height * actualScale
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          resolve(blob)
        }, 'image/webp', quality)
      }
      img.onerror = reject
      img.src = event.target.result
    }
    
    reader.readAsDataURL(file)
  })
}
