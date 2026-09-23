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
  return user?.account_type === ACCOUNT_TYPE.BUSINESS || user?.isBusiness === true
}

export function hasCompanyDetails(user: any) {
  if (!user) return false
  return Boolean(
    user.business_name ||
    user.company ||
    user.business_type ||
    user.business_category ||
    user.business_about ||
    user.business_address ||
    user.business_city ||
    user.business_phone ||
    user.business_website ||
    user.business_products_services ||
    (Array.isArray(user.business_gallery) && user.business_gallery.length > 0)
  )
}

export function shouldShowCompanyTab(user: any) {
  return isBusinessAccount(user) && hasCompanyDetails(user)
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
  return user?.profile_photo || user?.avatar || user?.business_logo || ''
}

export function displayTitleFromUser(user: any) {
  if (isBusinessAccount(user)) {
    return [user?.business_type, user?.business_category].filter(Boolean).join(' · ')
  }
  return user?.profession || user?.title || ''
}

export function publicProfileFromUser(p: any) {
  if (!p) return null
  const business = isBusinessAccount(p)
  return {
    id: p.id || p._id,
    username: p.username,
    name: displayNameFromUser(p),
    full_name: p.full_name || p.name,
    profession: p.profession,
    cover_image: p.cover_image,
    avatar: displayAvatarFromUser(p) || p.profile_photo,
    profile_photo: p.profile_photo,
    title: displayTitleFromUser(p),
    location: business ? p.business_city || p.business_address || p.location : p.location,
    company: business ? p.business_name || p.company : p.company,
    email: p.email,
    phone_number: business ? p.business_phone || p.phone_number : p.phone_number,
    about: business ? p.business_about || p.about || p.short_bio : p.about || p.short_bio,
    short_bio: p.short_bio,
    experience: p.experience,
    education: p.education,
    account_type: p.account_type || (business ? ACCOUNT_TYPE.BUSINESS : ACCOUNT_TYPE.PROFESSIONAL),
    isBusiness: business,
    business_name: p.business_name || (business ? p.company : undefined),
    business_logo: p.business_logo,
    business_phone: p.business_phone || (business ? p.phone_number : undefined),
    business_city: p.business_city,
    business_website: p.business_website,
    business_address: p.business_address,
    business_about: p.business_about,
    business_products_services: p.business_products_services,
    business_gallery: parseGalleryList(p.business_gallery),
    business_established_year: p.business_established_year,
    business_type: p.business_type,
    business_category: p.business_category,
  }
}
