'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

export function PwaSplashScreen() {
  const [showSplash, setShowSplash] = useState(false);
  const [introPhase, setIntroPhase] = useState(0); // 0: none, 1: "Move Packages", 2: "Build Reputation", 3: "Stack Sats", 4: done
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);

  const backgroundImages = useMemo(() => ['/hero.jpeg', 'hero-3.jpeg', '/hero-4.jpeg', '/hero-5.jpeg'], []);

  useEffect(() => {
    // Multiple ways to detect PWA launch
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    
    // Check if this is a fresh app launch (not a page navigation)
    const isAppLaunch = !document.referrer || document.referrer === '';
    
    // Only show splash on PWA launch, not every session
    const shouldShowSplash = isPWA && isAppLaunch && !sessionStorage.getItem('pwa-splash-shown');

    if (shouldShowSplash) {
      setShowSplash(true);
      sessionStorage.setItem('pwa-splash-shown', 'true');
      
      // Start the intro sequence immediately
      setTimeout(() => {
        setIntroPhase(1);
      }, 500);
    }
  }, []);

  // Handle intro phase transitions
  useEffect(() => {
    if (introPhase === 0 || !showSplash) return;
    
    let duration;
    if (introPhase === 1) {
      duration = 1000; // "Move Packages" lasts 1.0s
    } else if (introPhase === 2) {
      duration = 1000; // "Build Reputation" lasts 1.0s
    } else if (introPhase === 3) {
      duration = 1000; // "Stack Sats" lasts 1.0s
    }
    
    const timer = setTimeout(() => {
      if (introPhase < 4) {
        setIntroPhase(introPhase + 1);
      } else {
        // Intro sequence complete, hide splash
        setShowSplash(false);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [introPhase, showSplash]);

  // Handle background image rotation
  useEffect(() => {
    if (!showSplash) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [showSplash, backgroundImages.length]);

  if (!showSplash) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-off-white overflow-hidden z-[100]">
      {/* Hero Section with Cyberpunk Background */}
      <section className='relative min-h-screen flex items-center overflow-hidden'>
        {/* Background Images */}
        <div className='absolute inset-0 z-0'>
          {backgroundImages.map((imageSrc, index) => (
            <Image
              key={imageSrc}
              src={imageSrc}
              alt='Cyberpunk delivery scene'
              fill
              className={`object-cover object-center transition-opacity duration-1000 ${
                currentImageIndex === index ? 'opacity-100' : 'opacity-0'
              }`}
              priority={index === 0}
            />
          ))}
          
          {/* Dark overlay for readability */}
          <div className='absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40 z-10'></div>
          {/* Cyberpunk color overlay */}
          <div className='absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 z-10'></div>
        </div>

        {/* Neon glow effects */}
        <div className='absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl animate-pulse-slow'></div>
        <div className='absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl animate-pulse-slow animation-delay-2000'></div>
        <div className='absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-pink-500/20 blur-2xl animate-pulse-slow'></div>

        {/* Intro Text Overlay */}
        {introPhase > 0 && introPhase < 4 && (
          <div className='absolute inset-0 z-30'>
            <div className='absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center'>
              {introPhase === 1 && (
                <h1 className='text-4xl md:text-6xl font-cyber font-bold text-off-white uppercase animate-center-fade'>
                  Move Packages
                </h1>
              )}
              {introPhase === 2 && (
                <h1 className='text-4xl md:text-6xl font-cyber font-bold text-off-white uppercase animate-center-fade'>
                  Build Reputation
                </h1>
              )}
              {introPhase === 3 && (
                <h1
                  className='text-4xl md:text-6xl font-cyber font-bold text-black uppercase animate-center-fade-glow'
                  style={{
                    WebkitTextStroke: '0.5px #60a5fa',
                  }}
                >
                  Stack Sats
                </h1>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
} 