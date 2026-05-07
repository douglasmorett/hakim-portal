import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Portal Hakim',
    short_name: 'Hakim',
    description: 'Sistema de gerenciamento Hakim',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#FF8A00',
    icons: [
      {
        src: '/icon.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  }
}
