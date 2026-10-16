import React from 'react';
import * as Sentry from '@sentry/react';

// Add this button component to your app to test Sentry's error tracking
export function ErrorButton({ className = '' }) {
  return (
    <button
      type="button"
      className={className || "px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"}
      onClick={() => {
        throw new Error('This is your first error!');
      }}
    >
      <span>💥</span> Break the world
    </button>
  );
}

export default ErrorButton;
