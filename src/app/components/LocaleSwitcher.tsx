'use client';
 
import {useLocale} from 'next-intl';
import {useRouter, usePathname} from '../../navigation';
import {ChangeEvent, useTransition} from 'react';
 
export default function LocaleSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const localActive = useLocale();
 
  const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    startTransition(() => {
      router.replace(pathname, {locale: nextLocale});
    });
  };
 
  return (
    <label className="border-2 rounded">
      <p className="sr-only">change language</p>
      <select
        defaultValue={localActive}
        className="bg-transparent py-2"
        onChange={onSelectChange}
        disabled={isPending}
      >
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="zh">Chinese</option>
      </select>
    </label>
  );
}
