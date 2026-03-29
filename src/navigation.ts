import {createNavigation} from 'next-intl/navigation';
 
export const locales = ['en', 'es', 'zh'] as const;
 
export const {Link, redirect, usePathname, useRouter} =
  createNavigation({
    locales,
    defaultLocale: 'zh',
    pathnames: {},
    localePrefix: 'as-needed'
  });
