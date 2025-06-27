import { Package } from 'lucide-react';

export function Footer() {
  return (
    <footer className='bg-gray-900 border-t border-cyan-500/20 py-12 relative overflow-hidden'>
      {/* Background effects */}
      <div className='absolute inset-0 z-0'>
        <div className='absolute top-0 left-1/4 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl'></div>
        <div className='absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl'></div>
      </div>

      <div className='container mx-auto px-4 relative z-10'>
        <div className='flex flex-col md:flex-row justify-between items-center'>
          <div className='flex items-center gap-2 mb-6 md:mb-0'>
            <div className='bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full p-2 shadow-cyan-glow'>
              <Package className='h-5 w-5 text-white' />
            </div>
            <span className='font-cyber font-bold text-xl text-white drop-shadow-md'>A to ₿</span>
          </div>

          <div className='flex flex-col items-center md:items-end gap-2'>
            <p className='text-gray-400 text-sm'>
              Built by{' '}
              <a
                href='https://github.com/alexandriaroberts'
                target='_blank'
                rel='noopener noreferrer'
                className='text-cyan-400 hover:text-cyan-300 transition-colors font-medium'
              >
                Alexandria Roberts
              </a>
              {' '}for atob.
            </p>
            <p className='text-gray-500 text-sm'>
              &copy; {new Date().getFullYear()} A to ₿. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 