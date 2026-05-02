
import type { Metadata } from "next";
import "./globals.css";

/** App relies on session, ACU, and auth headers; avoid static prerender build failures. */
export const dynamic = "force-dynamic";
import { AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";
import { UserProfileProvider } from "@/components/user-profile-provider";
import { AcuWalletProvider } from "@/components/acu-wallet-provider";
import { Inter } from 'next/font/google';
import CookieBanner from "@/components/cookie-banner";
import InstallAppPrompt from "@/components/InstallAppPrompt";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://studyear.com'),
  title: {
    template: '%s | StudYear',
    default: 'StudYear - The AI-Powered Academic Command Centre',
  },
  description: "Stop studying hard. Start studying smart. StudYear is the AI-powered platform that builds your personalised path to better grades, from study plans to instant essay feedback.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
      title: 'StudYear - AI-Powered Academic Command Centre',
      description: 'Personalised study plans, instant essay feedback, and AI-powered learning tools to help you ace your exams.',
      url: 'https://studyear.com',
      siteName: 'StudYear',
      images: [
        {
          url: '/og-image.png', // hosted in /public
          width: 1200,
          height: 630,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'StudYear - AI-Powered Academic Command Centre',
      description: 'Personalised study plans, instant essay feedback, and AI-powered learning tools to help you ace your exams.',
      images: ['/og-image.png'],
    },
    manifest: '/manifest.json',
    themeColor: '#2563EB',
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'StudYear',
    url: 'https://studyear.com',
    potentialAction: {
        '@type': 'SearchAction',
        target: 'https://studyear.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" className={`${inter.variable} h-full dark`} suppressHydrationWarning>
      <head>
        {/* Apple PWA specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="StudYear" />
        
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5GNC8F6G');`,
          }}
        />
        {/* End Google Tag Manager */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1615236079598196');
            fbq('track', 'PageView');`,
          }}
        />
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none"
            src="https://www.facebook.com/tr?id=1615236079598196&ev=PageView&noscript=1"
            />`,
          }}
        />
        {/* End Meta Pixel Code */}
      </head>
      <body className="font-body antialiased h-full">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5GNC8F6G"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <AuthProvider>
          <UserProfileProvider>
            <AcuWalletProvider>
              <AppLayout>
              {children}
              </AppLayout>
              <Toaster />
              <CookieBanner />
              <InstallAppPrompt />
            </AcuWalletProvider>
          </UserProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
