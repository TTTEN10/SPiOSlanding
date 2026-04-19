import { useLocation } from 'react-router-dom';
import { seoConfig } from '../config/seo';
import { SEOConfig } from '../types/seo';

export function useSEO(): SEOConfig {
  const location = useLocation();
  const pathname = location.pathname;
  
  // Get SEO config for current route, fallback to home page config
  const config = seoConfig[pathname] || seoConfig['/'];
  
  return config;
}
