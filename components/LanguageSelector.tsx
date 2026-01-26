'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LANGUAGES, applyLanguageDirection, type LanguageCode } from '@/lib/i18n/config';

/**
 * Language Selector Component
 * Allows users to switch between supported languages
 * Automatically applies RTL layout for Arabic
 */
export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Apply language direction on mount
    applyLanguageDirection(i18n.language);
  }, [i18n.language]);

  const changeLanguage = async (languageCode: LanguageCode) => {
    await i18n.changeLanguage(languageCode);
    applyLanguageDirection(languageCode);

    // Save to localStorage
    localStorage.setItem('i18nextLng', languageCode);
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    lang => lang.code === i18n.language
  ) || SUPPORTED_LANGUAGES[0];

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          aria-label="Select language"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline">{currentLanguage.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LANGUAGES.map((language) => {
          const isActive = i18n.language === language.code;
          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Mini Language Selector (for mobile or compact layouts)
 */
export function LanguageSelectorCompact() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const changeLanguage = async (languageCode: LanguageCode) => {
    await i18n.changeLanguage(languageCode);
    applyLanguageDirection(languageCode);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {SUPPORTED_LANGUAGES.map((language) => {
        const isActive = i18n.language === language.code;
        return (
          <Button
            key={language.code}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeLanguage(language.code)}
            className="text-xs px-2 py-1 h-auto"
          >
            {language.code.toUpperCase()}
          </Button>
        );
      })}
    </div>
  );
}
