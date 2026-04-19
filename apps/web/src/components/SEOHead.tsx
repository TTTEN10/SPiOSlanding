import { Helmet } from 'react-helmet-async';
import { SEOConfig } from '../types/seo';

interface SEOHeadProps {
  config: SEOConfig;
}

export default function SEOHead({ config }: SEOHeadProps) {
  const {
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    twitterTitle,
    twitterDescription,
    twitterImage,
    twitterCard = 'summary_large_image',
    canonical,
    type = 'website',
    noindex = false,
  } = config;

  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : (import.meta.env.VITE_PUBLIC_ORIGIN || (import.meta.env.PROD ? 'https://safepsy.com' : 'http://localhost:5173'));
  
  const fullOgImage = ogImage?.startsWith('http') ? ogImage : `${baseUrl}${ogImage || '/Logotransparent.png'}`;
  const fullTwitterImage = twitterImage?.startsWith('http') ? twitterImage : `${baseUrl}${twitterImage || '/Logotransparent.png'}`;
  const fullCanonical = canonical?.startsWith('http') ? canonical : `${baseUrl}${canonical || '/'}`;
  const fullOgUrl = ogUrl?.startsWith('http') ? ogUrl : `${baseUrl}${ogUrl || '/'}`;

  // Structured Data (JSON-LD)
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SafePsy',
    url: baseUrl,
    logo: `${baseUrl}/Logotransparent.png`,
    description: 'Privacy-first online therapy platform revolutionizing mental health care with blockchain technology.',
    sameAs: [
      // Add social media URLs when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      url: `${baseUrl}/contact-us`,
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SafePsy',
    url: baseUrl,
    description: description,
    publisher: {
      '@type': 'Organization',
      name: 'SafePsy',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      ...(canonical && canonical !== '/' ? [{
        '@type': 'ListItem',
        position: 2,
        name: title,
        item: fullCanonical,
      }] : []),
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description,
    url: fullCanonical,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'SafePsy',
      url: baseUrl,
    },
    about: {
      '@type': 'Organization',
      name: 'SafePsy',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SafePsy',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/Logotransparent.png`,
      },
    },
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="SafePsy" />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"} />
      <meta name="googlebot" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <meta name="bingbot" content={noindex ? "noindex, nofollow" : "index, follow"} />
      
      {/* Language and Locale */}
      <html lang="en" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="en_GB" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonical} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={ogTitle || title} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:url" content={fullOgUrl} />
      <meta property="og:site_name" content="SafePsy" />
      <meta property="og:updated_time" content={new Date().toISOString()} />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={twitterTitle || ogTitle || title} />
      <meta name="twitter:description" content={twitterDescription || ogDescription || description} />
      <meta name="twitter:image" content={fullTwitterImage} />
      <meta name="twitter:image:alt" content={twitterTitle || ogTitle || title} />
      <meta name="twitter:url" content={fullOgUrl} />
      {/* Add Twitter site handle when available */}
      {/* <meta name="twitter:site" content="@safepsy" /> */}
      {/* <meta name="twitter:creator" content="@safepsy" /> */}
      
      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#3B82F6" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="SafePsy" />
      
      {/* Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Additional Meta Tags for SEO */}
      <meta httpEquiv="x-ua-compatible" content="IE=edge" />
      <meta name="referrer" content="no-referrer-when-downgrade" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />
      <meta name="coverage" content="worldwide" />
      
      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </script>
    </Helmet>
  );
}
