import { MetadataRoute } from 'next';
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://studyear.com';
 
  const staticRoutes = [
    '/',
    '/about',
    '/how-it-works',
    '/create',
    '/login',
    '/signup',
    '/terms-of-service',
    '/privacy-policy',
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly',
    priority: route === '/' ? 1 : 0.8,
  }));
}
