'use client';

import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import EmptyChatMessageInput from './EmptyChatMessageInput';
import { File } from './ChatWindow';
import Link from 'next/link';
import WeatherWidget from './WeatherWidget';
import NewsArticleWidget from './NewsArticleWidget';
import SettingsButtonMobile from '@/components/Settings/SettingsButtonMobile';
import {
  getShowNewsWidget,
  getShowWeatherWidget,
} from '@/lib/config/clientRegistry';

const EmptyChat = () => {
  const [showWeather, setShowWeather] = useState(() =>
    typeof window !== 'undefined' ? getShowWeatherWidget() : true,
  );
  const [showNews, setShowNews] = useState(() =>
    typeof window !== 'undefined' ? getShowNewsWidget() : true,
  );

  useEffect(() => {
    const updateWidgetVisibility = () => {
      setShowWeather(getShowWeatherWidget());
      setShowNews(getShowNewsWidget());
    };

    updateWidgetVisibility();

    window.addEventListener('client-config-changed', updateWidgetVisibility);
    window.addEventListener('storage', updateWidgetVisibility);

    return () => {
      window.removeEventListener(
        'client-config-changed',
        updateWidgetVisibility,
      );
      window.removeEventListener('storage', updateWidgetVisibility);
    };
  }, []);

  return (
    <div className="relative">
      <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
        <SettingsButtonMobile />
      </div>
      <div className="relative flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2 space-y-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-1/4 h-64 opacity-70 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(34,211,238,0.28), rgba(139,92,246,0.18), transparent 70%)',
          }}
        />
        <div className="relative flex flex-col items-center justify-center w-full space-y-8">
          <img
            src="/osearch-mark.svg"
            alt="OSearch"
            className="h-16 w-16 drop-shadow-[0_0_24px_rgba(34,211,238,0.45)] motion-safe:animate-pulse"
          />
          <h2 className="font-display text-3xl font-bold tracking-tight text-black/80 dark:text-white/90 -mt-2">
            Ask the web.
          </h2>
          <p className="text-sm text-black/50 dark:text-white/45 -mt-4">
            Cited answers · same OWeb identity &amp; credits
          </p>
          <EmptyChatMessageInput />
        </div>
        {(showWeather || showNews) && (
          <div className="flex flex-col w-full gap-4 mt-2 sm:flex-row sm:justify-center">
            {showWeather && (
              <div className="flex-1 w-full">
                <WeatherWidget />
              </div>
            )}
            {showNews && (
              <div className="flex-1 w-full">
                <NewsArticleWidget />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyChat;
