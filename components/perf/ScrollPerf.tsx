'use client'

import { useEffect } from 'react'

// Smooth scrolling. The sticky/fixed bars (nav, mobile CTA, portal header) use
// backdrop-filter: blur(), which forces the GPU to re-blur everything moving
// behind them on EVERY frame while you scroll - the main cause of scroll jank,
// especially on mobile and over the autoplaying hero video.
//
// While the page is actively scrolling we add `is-scrolling` to <html>; CSS then
// drops the blur on those bars (they keep their translucent backgrounds, so they
// still read as frosted glass in motion). ~160ms after scrolling stops we remove
// the class and the full blur fades back in. The toggle itself is rAF-throttled
// and the listener is passive, so it adds no measurable cost.
export default function ScrollPerf() {
  useEffect(() => {
    const root = document.documentElement
    let idleTimer: number | undefined
    let raf = 0

    const onScroll = () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          root.classList.add('is-scrolling')
          raf = 0
        })
      }
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => root.classList.remove('is-scrolling'), 160)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (idleTimer) clearTimeout(idleTimer)
      if (raf) cancelAnimationFrame(raf)
      root.classList.remove('is-scrolling')
    }
  }, [])

  return null
}
