export const ACCOUNT_TYPE = {
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
} as const

export type AccountTypeValue = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE]

export const BUSINESS_TYPES = [
  'Manufacturer',
  'Retailer',
  'Wholesaler',
  'Distributor',
  'Service Provider',
  'Consultant',
  'Importer',
  'Exporter',
  'Other',
] as const

export const BUSINESS_CATEGORIES = [
  'Food & Beverage',
  'Technology',
  'Manufacturing',
  'Education',
  'Healthcare',
  'Retail',
  'Wholesale',
  'Real Estate',
  'Consulting',
  'Finance',
  'Hospitality',
  'Agriculture',
  'Construction',
  'Logistics',
  'Media & Entertainment',
  'Other',
] as const

export const BUSINESS_TEXT_MAX = 500
export const BUSINESS_GALLERY_MAX = 5
export const BUSINESS_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const BUSINESS_IMAGE_TYPES = ['image/jpeg', 'image/png']

export type BusinessProfileFields = {
  account_type?: string
  business_logo?: string | null
  business_name?: string
  business_established_year?: number | string | null
  business_type?: string
  business_category?: string
  business_address?: string
  business_city?: string
  business_phone?: string
  business_website?: string
  business_about?: string
  business_products_services?: string
  business_gallery?: string[] | null
}

export function isBusinessAccount(user: any) {
  return user?.account_type === ACCOUNT_TYPE.BUSINESS
}

export function parseGalleryList(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim())
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string' && item.trim())
      }
    } catch {
      return value.startsWith('http') ? [value] : []
    }
  }
  return []
}

export function validateBusinessImageFile(file: File): string | null {
  if (!BUSINESS_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" must be a JPG or PNG image.`
  }
  if (file.size > BUSINESS_IMAGE_MAX_BYTES) {
    return `"${file.name}" exceeds the 5 MB limit.`
  }
  return null
}

export function displayNameFromUser(user: any) {
  if (isBusinessAccount(user) && user?.business_name) return user.business_name
  return user?.full_name || user?.name || user?.username || 'User'
}

export function displayAvatarFromUser(user: any) {
  if (isBusinessAccount(user) && user?.business_logo) return user.business_logo
  return user?.profile_photo || user?.avatar || ''
}

export function displayTitleFromUser(user: any) {
  if (isBusinessAccount(user)) {
    return [user?.business_type, user?.business_category].filter(Boolean).join(' · ')
  }
  return user?.profession || user?.title || ''
}

export function publicProfileFromUser(p: any) {
  const business = isBusinessAccount(p)
  return {
    username: p.username,
    name: displayNameFromUser(p),
    cover_image: p.cover_image,
    avatar: displayAvatarFromUser(p) || p.profile_photo,
    title: displayTitleFromUser(p),
    location: business ? p.business_city || p.business_address || p.location : p.location,
    company: business ? p.business_name || p.company : p.company,
    email: p.email,
    phone_number: business ? p.business_phone || p.phone_number : p.phone_number,
    about: business ? p.business_about || p.about || p.short_bio : p.about || p.short_bio,
    experience: p.experience,
    education: p.education,
    account_type: p.account_type || ACCOUNT_TYPE.PROFESSIONAL,
    isBusiness: business,
    business_website: p.business_website,
    business_address: p.business_address,
    business_products_services: p.business_products_services,
    business_gallery: parseGalleryList(p.business_gallery),
    business_established_year: p.business_established_year,
    business_type: p.business_type,
    business_category: p.business_category,
  }
}
