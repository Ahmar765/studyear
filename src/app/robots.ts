import { MetadataRoute } from 'next';
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://studyear.com';
 
  return {
    rules: [
        {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/account/', '/profile-setup/'],
        },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
