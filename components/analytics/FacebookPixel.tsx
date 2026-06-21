'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID

// Meta (Facebook) Pixel. Loads the base code once and fires a PageView on every
// client-side route change (the base snippet only fires the first one). Renders
// nothing until NEXT_PUBLIC_FB_PIXEL_ID is set, so it's a safe no-op in dev.
export default function FacebookPixel() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    if (!PIXEL_ID) return
    // Skip the initial load - the inline snippet already tracked that PageView.
    if (first.current) { first.current = false; return }
    const w = window as unknown as { fbq?: (...a: unknown[]) => void }
    w.fbq?.('track', 'PageView')
  }, [pathname])

  if (!PIXEL_ID) return null

  return (
    <>
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}
