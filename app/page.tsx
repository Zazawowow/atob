'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Map, CheckCircle, Truck, User, Download } from 'lucide-react';
import { useNostr } from '@/components/nostr-provider';
import { useUIAnimation } from '@/components/ui-animation-context';
import { NostrAuthModal } from '@/components/nostr-auth-modal';
import { DebugPanel } from '@/components/debug-panel';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function Home() {
  const { isLoggedIn, isReady } = useNostr();
  const { showUI, setShowUI } = useUIAnimation();
  const [mounted, setMounted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [introPhase, setIntroPhase] = useState(0); // 0: none, 1: "Move Packages", 2: "Build Reputation", 3: "Stack Sats", 4: done
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string>('');
  const [videoOpacity, setVideoOpacity] = useState(1);
  
  // Array of background images to rotate through - memoized to prevent constant re-renders
  const backgroundImages = useMemo(() => ['/hero.jpeg', '/hero-3.jpeg', '/hero-4.jpeg', '/hero-5.jpeg'], []);

  useEffect(() => {
    setMounted(true);
    
    // Check if user has seen the intro before
    const seenIntro = localStorage.getItem('atob-intro-seen');
    console.log('Has user seen intro?', seenIntro);
    if (seenIntro === 'true') {
      setHasSeenIntro(true);
      setVideoEnded(true);
      setShowUI(true);
      setIntroPhase(4);
    } else {
      setHasSeenIntro(false);
      setShowUI(false);
      setIntroPhase(0);
    }
  }, []); // Empty dependency array - this should only run once

  // Handle intro phase transitions
  useEffect(() => {
    if (introPhase === 0 || hasSeenIntro) return;
    
    let duration;
    if (introPhase === 1) {
      duration = 1000; // "Move Packages" lasts 1.0s (0.5s to 1.5s)
    } else if (introPhase === 2) {
      duration = 1000; // "Build Reputation" lasts 1.0s (1.5s to 2.5s)
    } else if (introPhase === 3) {
      duration = 1000; // "Stack Sats" lasts 1.0s (2.5s to 3.5s)
    }
    
    const timer = setTimeout(() => {
      if (introPhase < 4) {
        setIntroPhase(introPhase + 1);
      } else {
        // Intro sequence complete, show main UI and mark as seen
        setShowUI(true);
        localStorage.setItem('atob-intro-seen', 'true');
        setHasSeenIntro(true);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [introPhase, hasSeenIntro]); // Remove setShowUI to prevent constant re-renders

  // Handle background image rotation after video ends
  useEffect(() => {
    if (!videoEnded) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      );
    }, 4000); // Rotate every 4 seconds

    return () => clearInterval(interval);
  }, [videoEnded, backgroundImages.length]);

  useEffect(() => {
    if (videoRef && mounted && !hasSeenIntro) {
      // Force video to start from beginning and play
      videoRef.currentTime = 0;
      videoRef.style.opacity = '1';
      videoRef.style.display = 'block';
      setVideoEnded(false);
      setShowUI(false);
      
      // Force play the video
      const playPromise = videoRef.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Start intro sequence after video starts playing (with a shorter delay)
          setTimeout(() => {
            setIntroPhase(1);
          }, 500);
        }).catch(error => {
          console.error('Video autoplay was prevented:', error);
          // If video fails to play, skip it and start the intro sequence.
          setVideoEnded(true); 
          setIntroPhase(1);
        });
      }
    }
  }, [videoRef, mounted, hasSeenIntro]); // Remove setShowUI to prevent constant re-renders



  // If not ready yet, show loading
  if (!mounted || !isReady) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
        <p className='ml-3'>Loading...</p>
      </div>
    );
  }

  return (
    <main className='min-h-screen bg-gray-900 text-off-white overflow-hidden'>
      {/* NostrAuthModal */}
      <NostrAuthModal 
        trigger={<button id="nostr-login-trigger" className="hidden" />}
        onAuth={() => {
          if (pendingRedirect) {
            window.location.href = pendingRedirect;
          }
        }}
      />

      {/* Hero Section with Cyberpunk Background */}
      <section className='relative min-h-screen flex items-center overflow-hidden'>
        {/* Background Video with Image Transition */}
        <div className='absolute inset-0 z-0'>
          {/* Rotating Background Images - initially hidden, fades in when video ends */}
          {backgroundImages.map((imageSrc, index) => (
            <Image
              key={imageSrc}
              src={imageSrc}
              alt='Cyberpunk delivery scene'
              fill
              className={`object-cover object-center transition-opacity duration-1000 ${
                videoEnded && currentImageIndex === index ? 'opacity-100' : 'opacity-0'
              }`}
              priority={index === 0}
            />
          ))}
          
          {/* Video - plays once then fades out */}
          <video
            ref={(el) => {
              if (el && !videoRef) {
                setVideoRef(el);
              }
            }}
            key={mounted ? 'mounted' : 'loading'} // Force re-render when mounted
            muted
            playsInline
            className={`w-full h-full object-cover object-center transition-opacity duration-1000`}
            style={{ opacity: videoEnded ? 0 : videoOpacity }}
            onTimeUpdate={(e) => {
              const video = e.target as HTMLVideoElement;
              const duration = video.duration;
              const currentTime = video.currentTime;
              
              // Start fading when video is 90% complete
              if (duration && currentTime >= duration * 0.9 && !videoEnded) {
                const fadeProgress = (currentTime - duration * 0.9) / (duration * 0.1);
                setVideoOpacity(1 - fadeProgress);
              }
            }}
            onEnded={() => {
              setVideoEnded(true);
              setVideoOpacity(0);
            }}
          >
            <source src='/hero-alt.mp4' type='video/mp4' />
          </video>
          
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
        {!hasSeenIntro && introPhase > 0 && introPhase < 4 && (
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

        <div className='container mx-auto px-4 relative z-20'>
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-center transition-all duration-1000 ${showUI ? 'animate-slide-up-fade opacity-100' : 'opacity-0'}`}>
            {/* Left Content */}
            <div className='lg:col-span-7 flex flex-col items-start text-left min-h-screen lg:min-h-0 justify-center lg:justify-start'>
              <div className='inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm'>
                <span className='inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse'></span>
                <span className='text-sm font-medium text-cyan-300'>
                  Decentralized Delivery Platform
                </span>
              </div>

              <h1 className='text-4xl sm:text-7xl md:text-6xl lg:text-5xl font-cyber font-bold mb-6 leading-tight uppercase'>
                <span className={`block text-off-white drop-shadow-lg transition-all duration-1500 ${showUI ? 'animate-slide-in-right animation-delay-300 opacity-100' : 'opacity-0'}`}>
                  Move Packages,
                </span>
                <span className={`block text-off-white drop-shadow-lg transition-all duration-1500 ${showUI ? 'animate-slide-in-right animation-delay-600 opacity-100' : 'opacity-0'}`}>
                  Build Reputation,
                </span>
                <span
                  className={`block text-black font-extrabold transition-all duration-1500 ${showUI ? 'animate-glow-after-slide animation-delay-900 opacity-100' : 'opacity-0'}`}
                  style={{
                    WebkitTextStroke: '0.5px #60a5fa'
                  }}
                >
                  Stack Sats.
                </span>
              </h1>

              {/* Mobile-only action buttons */}
              <div className='block lg:hidden mt-8 space-y-4'>
                {isLoggedIn ? (
                  <>
                    <button 
                      onClick={() => window.location.href = '/post-package'}
                      className='w-full px-8 py-4 bg-transparent rounded-full text-blue-400 font-medium hover:shadow-blue-glow transform hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-blue-400 hover:border-blue-300 hover:text-blue-300'
                    >
                      Post a Package
                    </button>
                    <button 
                      onClick={() => window.location.href = '/post-job'}
                      className='w-full px-8 py-4 bg-transparent rounded-full text-green-400 font-medium hover:shadow-green-glow transform hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-green-400 hover:border-green-300 hover:text-green-300'
                    >
                      Post a Job
                    </button>
                  </>
                ) : (
                  <NostrAuthModal
                    trigger={
                      <button className='w-full px-8 py-4 bg-transparent rounded-full text-blue-400 font-medium hover:shadow-blue-glow transform hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-blue-400 hover:border-blue-300 hover:text-blue-300'>
                        Login with Nostr
                      </button>
                    }
                  />
                )}
              </div>
            </div>

            {/* Right Content */}
            <div className='hidden lg:flex lg:col-span-5 flex-col'>
              <div className='bg-black/30 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-sm'>
                <p className='text-lg text-gray-300 drop-shadow-md leading-relaxed'>
                  <span className='font-cyber font-bold'>A TO ₿</span> connects people who need packages delivered with those
                  who can deliver them, all powered by <span className='text-cyan-400 font-semibold'>Nostr technology</span>.
                </p>
                
                <div className='mt-6 space-y-3'>
                  <div className='flex items-center gap-3'>
                    <div className='w-2 h-2 rounded-full bg-cyan-400'></div>
                    <span className='text-md text-gray-400'>Decentralized & Trustless</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-2 h-2 rounded-full bg-purple-400'></div>
                    <span className='text-md text-gray-400'>Bitcoin Payments</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-2 h-2 rounded-full bg-pink-400'></div>
                    <span className='text-md text-gray-400'>Reputation System</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Info Section */}
      <section className='lg:hidden py-16 bg-gray-900 relative'>
        {/* Background effects */}
        <div className='absolute inset-0 z-0'>
          <div className='absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl'></div>
          <div className='absolute bottom-0 right-1/4 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl'></div>
        </div>
        
        <div className='container mx-auto px-4 relative z-10'>
          <div className='bg-black/30 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-sm max-w-lg mx-auto'>
            <p className='text-base text-gray-300 drop-shadow-md leading-relaxed text-center mb-6'>
              <span className='font-cyber font-bold'>A TO ₿</span> connects people who need packages delivered with those
              who can deliver them, all powered by <span className='text-cyan-400 font-semibold'>Nostr technology</span>.
            </p>
            
            <div className='space-y-4'>
              <div className='flex items-center justify-center gap-3'>
                <div className='w-2 h-2 rounded-full bg-cyan-400'></div>
                <span className='text-md text-gray-400'>Decentralized & Trustless</span>
              </div>
              <div className='flex items-center justify-center gap-3'>
                <div className='w-2 h-2 rounded-full bg-purple-400'></div>
                <span className='text-md text-gray-400'>Bitcoin Payments</span>
              </div>
              <div className='flex items-center justify-center gap-3'>
                <div className='w-2 h-2 rounded-full bg-pink-400'></div>
                <span className='text-md text-gray-400'>Reputation System</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className='py-20 relative bg-gray-800'>
        <div className='absolute inset-0 z-0'>
          <div className='absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[100px]'></div>
          <div className='absolute bottom-[10%] left-[10%] w-[250px] h-[250px] rounded-full bg-cyan-500/10 blur-[100px]'></div>
          <div className='absolute top-[60%] left-[30%] w-[200px] h-[200px] rounded-full bg-pink-500/10 blur-[80px]'></div>
        </div>

        <div className='container mx-auto px-4 relative z-10'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-cyber font-bold mb-4'>
              <span className='bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text'>
                How It Works
              </span>
            </h2>
            <p className='text-gray-300 max-w-2xl mx-auto'>
              Simple steps to get your package delivered in the <span className='text-purple-400 font-semibold'>cyberpunk way</span>
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {/* Step 1 */}
            <div className='relative'>
              <div className='bg-black/40 border border-cyan-500/30 rounded-2xl p-6 h-full backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 flex items-center justify-center mb-6 text-off-white font-bold'>
                  1
                </div>
                <h3 className='text-xl font-bold mb-4 text-off-white'>
                  Post Your Package
                </h3>
                <p className='text-gray-300'>
                  Create a delivery request with pickup location, destination,
                  and payment amount in <span className='text-cyan-400 font-semibold'>Bitcoin</span>.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className='relative'>
              <div className='bg-black/40 border border-purple-500/30 rounded-2xl p-6 h-full backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-400 flex items-center justify-center mb-6 text-off-white font-bold'>
                  2
                </div>
                <h3 className='text-xl font-bold mb-4 text-off-white'>
                  Courier Picks Up
                </h3>
                <p className='text-gray-300'>
                  A nearby courier accepts your delivery request and picks up
                  your package using the <span className='text-purple-400 font-semibold'>decentralized network</span>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className='bg-black/40 border border-pink-500/30 rounded-2xl p-6 h-full backdrop-blur-sm hover:border-pink-400/50 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-pink-400 flex items-center justify-center mb-6 text-off-white font-bold'>
                  3
                </div>
                <h3 className='text-xl font-bold mb-4 text-off-white'>
                  Delivery Confirmation
                </h3>
                <p className='text-gray-300'>
                  Recipient scans <span className='text-pink-400 font-semibold'>QR code</span> to confirm delivery and release
                  Bitcoin payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Section - Only show when logged in */}
      {isLoggedIn && (
        <section className='py-20 bg-gray-900'>
          <div className='container mx-auto px-4'>
            <div className='bg-gradient-to-r from-black/60 to-gray-900/60 border border-cyan-500/30 rounded-3xl p-8 md:p-12 relative overflow-hidden backdrop-blur-sm'>
              {/* Background Elements */}
              <div className='absolute inset-0 z-0'>
                <div className='absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[100px]'></div>
                <div className='absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-green-500/10 blur-[100px]'></div>
                <div className='absolute top-1/2 left-1/2 w-[200px] h-[200px] rounded-full bg-purple-500/10 blur-[80px]'></div>
              </div>

              <div className='relative z-10 text-center'>
                <h2 className='text-3xl md:text-4xl font-cyber font-bold mb-6'>
                  <span className='bg-gradient-to-r from-cyan-400 to-green-400 text-transparent bg-clip-text'>
                    Ready to Get Started?
                  </span>
                </h2>
                <p className='text-gray-300 max-w-2xl mx-auto mb-8'>
                  Choose what you want to do in the <span className='text-cyan-400 font-semibold'>decentralized economy</span>
                </p>
                
                <div className='flex flex-col md:flex-row gap-4 justify-center'>
                  <button 
                    onClick={() => window.location.href = '/post-package'}
                    className='px-8 py-4 bg-transparent rounded-full text-blue-400 font-medium hover:shadow-blue-glow transform hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-blue-400 hover:border-blue-300 hover:text-blue-300'
                  >
                    Post a Package
                  </button>
                  <button 
                    onClick={() => window.location.href = '/post-job'}
                    className='px-8 py-4 bg-transparent rounded-full text-green-400 font-medium hover:shadow-green-glow transform hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-green-400 hover:border-green-300 hover:text-green-300'
                  >
                    Post a Job
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - Only show when not logged in */}
      {!isLoggedIn && (
        <section className='py-20 bg-gray-900'>
          <div className='container mx-auto px-4'>
            <div className='bg-gradient-to-r from-black/60 to-gray-900/60 border border-cyan-500/30 rounded-3xl p-8 md:p-12 relative overflow-hidden backdrop-blur-sm'>
              {/* Background Elements */}
              <div className='absolute inset-0 z-0'>
                <div className='absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[100px]'></div>
                <div className='absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[100px]'></div>
                <div className='absolute top-1/2 left-1/2 w-[200px] h-[200px] rounded-full bg-pink-500/10 blur-[80px]'></div>
              </div>

              <div className='relative z-10 flex flex-col md:flex-row items-center justify-between gap-8'>
                <div>
                  <h2 className='text-3xl md:text-4xl font-cyber font-bold mb-4 text-center md:text-left'>
                    <span className='bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text'>
                      Ready to get started?
                    </span>
                  </h2>
                  <p className='text-gray-300 max-w-lg text-center md:text-left'>
                    Join the <span className='text-cyan-400 font-semibold'>decentralized delivery revolution</span> today and
                    experience the future of package delivery.
                  </p>
                </div>
                <div className='w-full md:w-auto'>
                  <NostrAuthModal
                    trigger={
                      <button className='w-full md:w-auto px-8 py-4 bg-transparent rounded-full text-blue-400 font-medium hover:shadow-blue-glow transform hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-blue-400 hover:border-blue-300 hover:text-blue-300'>
                        Login with Nostr
                      </button>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Debug Panel - Only show when logged in */}
      {isLoggedIn && (
        <section className='py-8 bg-gray-900'>
          <div className='container mx-auto px-4'>
            <div className='max-w-4xl mx-auto'>
              <DebugPanel />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
