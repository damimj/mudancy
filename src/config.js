// Site-wide settings. Every value can be overridden with an environment
// variable (in .env.local, or in your Vercel project settings), so you can
// customise your shop without touching the code.

// Name shown in the header, the browser tab and the admin panel.
export const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'Mudancy'

// ISO 4217 code used for every price in the shop (e.g. USD, EUR, ARS, CZK).
export const CURRENCY = (import.meta.env.VITE_CURRENCY || 'USD').toUpperCase()

// Language used when the visitor has no saved choice and their browser
// language is not one of the supported ones. See src/i18n/languages.js.
export const DEFAULT_LANG = import.meta.env.VITE_DEFAULT_LANG || 'en'
