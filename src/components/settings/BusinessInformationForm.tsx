'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import apiClient from '@/lib/api-client'
import {
  ACCOUNT_TYPE,
  BUSINESS_CATEGORIES,
  BUSINESS_GALLERY_MAX,
  BUSINESS_TEXT_MAX,
  BUSINESS_TYPES,
  BusinessProfileFields,
  parseGalleryList,
  validateBusinessImageFile,
} from '@/lib/business-profile'

type Props = {
  initial: BusinessProfileFields
  profilePhoto?: File | null
  coverImage?: File | null
  photoRemoved?: boolean
  coverRemoved?: boolean
  onSaved?: (user: any) => void
}

const EMPTY: BusinessProfileFields = {
  business_name: '',
  business_established_year: '',
  business_type: '',
  business_category: '',
  business_address: '',
  business_city: '',
  business_phone: '',
  business_website: '',
  business_about: '',
  business_products_services: '',
}

const inputCls = 'w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all'
const inputStyle = { backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8', color: '#212529' }
const YEARS = Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) =>
  String(new Date().getFullYear() - i),
)

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium mb-2" style={{ color: '#212529' }}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

export default function BusinessInformationForm({
  initial,
  profilePhoto,
  coverImage,
  photoRemoved,
  coverRemoved,
  onSaved,
}: Props) {
  const [form, setForm] = useState<BusinessProfileFields>({ ...EMPTY, ...initial })
  const [galleryUrls, setGalleryUrls] = useState<string[]>(parseGalleryList(initial.business_gallery))
  const [galleryFiles, setGalleryFiles] = useState<{ file: File; preview: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isPredefinedType = (val?: string) =>
    val ? (BUSINESS_TYPES as readonly string[]).filter((t) => t !== 'Other').includes(val) : false

  const isPredefinedCategory = (val?: string) =>
    val ? (BUSINESS_CATEGORIES as readonly string[]).filter((c) => c !== 'Other').includes(val) : false

  const [typeSelect, setTypeSelect] = useState<string>(() => {
    if (!initial.business_type) return ''
    return isPredefinedType(initial.business_type) ? initial.business_type : 'Other'
  })
  const [otherBusinessType, setOtherBusinessType] = useState<string>(() => {
    if (!initial.business_type) return ''
    return isPredefinedType(initial.business_type) ? '' : (initial.business_type === 'Other' ? '' : initial.business_type)
  })

  const [categorySelect, setCategorySelect] = useState<string>(() => {
    if (!initial.business_category) return ''
    return isPredefinedCategory(initial.business_category) ? initial.business_category : 'Other'
  })
  const [otherBusinessCategory, setOtherBusinessCategory] = useState<string>(() => {
    if (!initial.business_category) return ''
    return isPredefinedCategory(initial.business_category) ? '' : (initial.business_category === 'Other' ? '' : initial.business_category)
  })

  useEffect(() => {
    setForm({ ...EMPTY, ...initial })
    setGalleryUrls(parseGalleryList(initial.business_gallery))
    setGalleryFiles([])

    if (initial.business_type) {
      if (isPredefinedType(initial.business_type)) {
        setTypeSelect(initial.business_type)
        setOtherBusinessType('')
      } else {
        setTypeSelect('Other')
        setOtherBusinessType(initial.business_type === 'Other' ? '' : initial.business_type)
      }
    } else {
      setTypeSelect('')
      setOtherBusinessType('')
    }

    if (initial.business_category) {
      if (isPredefinedCategory(initial.business_category)) {
        setCategorySelect(initial.business_category)
        setOtherBusinessCategory('')
      } else {
        setCategorySelect('Other')
        setOtherBusinessCategory(initial.business_category === 'Other' ? '' : initial.business_category)
      }
    } else {
      setCategorySelect('')
      setOtherBusinessCategory('')
    }
  }, [initial])

  const galleryCount = galleryUrls.length + galleryFiles.length
  const isBusiness = initial.account_type === ACCOUNT_TYPE.BUSINESS

  const setField = (key: keyof BusinessProfileFields, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleGalleryAdd = (files: FileList | null) => {
    if (!files?.length) return
    const remaining = BUSINESS_GALLERY_MAX - galleryCount
    const next: { file: File; preview: string }[] = []
    for (const file of Array.from(files).slice(0, remaining)) {
      const err = validateBusinessImageFile(file)
      if (err) { setError(err); return }
      next.push({ file, preview: URL.createObjectURL(file) })
    }
    setError('')
    setGalleryFiles((prev) => [...prev, ...next])
  }

  const clientValidate = () => {
    const finalType = typeSelect === 'Other' ? otherBusinessType.trim() : typeSelect
    const finalCategory = categorySelect === 'Other' ? otherBusinessCategory.trim() : categorySelect

    if (!form.business_name?.trim()) return 'Business name is required'
    if (!form.business_established_year) return 'Year of establishment is required'
    if (!finalType) {
      return typeSelect === 'Other'
        ? 'Please specify your business type'
        : 'Business type is required'
    }
    if (!finalCategory) {
      return categorySelect === 'Other'
        ? 'Please specify your industry / business category'
        : 'Industry / business category is required'
    }
    if (!form.business_address?.trim()) return 'Business address is required'
    if (!form.business_city?.trim()) return 'City / location is required'
    if (!form.business_about?.trim()) return 'About business is required'
    if (!form.business_products_services?.trim()) return 'Products / services is required'
    if ((form.business_about || '').length > BUSINESS_TEXT_MAX) return `About business must be ${BUSINESS_TEXT_MAX} characters or less`
    if ((form.business_products_services || '').length > BUSINESS_TEXT_MAX) {
      return `Products / services must be ${BUSINESS_TEXT_MAX} characters or less`
    }
    return ''
  }

  const handleSave = async () => {
    const validationError = clientValidate()
    if (validationError) { setError(validationError); setSuccess(''); return }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const finalType = typeSelect === 'Other' ? otherBusinessType.trim() : typeSelect
      const finalCategory = categorySelect === 'Other' ? otherBusinessCategory.trim() : categorySelect

      const data = new FormData()
      data.append('account_type', ACCOUNT_TYPE.BUSINESS)
      data.append('business_name', form.business_name!.trim())
      data.append('business_established_year', String(form.business_established_year))
      data.append('business_type', finalType)
      data.append('business_category', finalCategory)
      data.append('business_address', form.business_address!.trim())
      data.append('business_city', form.business_city!.trim())
      data.append('business_phone', (form.business_phone || '').trim())
      data.append('business_website', (form.business_website || '').trim())
      data.append('business_about', form.business_about!.trim())
      data.append('business_products_services', form.business_products_services!.trim())
      data.append('business_gallery', JSON.stringify(galleryUrls))
      if (profilePhoto) {
        data.append('profile_photo', profilePhoto)
        data.append('business_logo', profilePhoto)
      } else if (photoRemoved) {
        data.append('profile_photo', '')
        data.append('business_logo', '')
      }

      if (coverImage) {
        data.append('cover_image', coverImage)
      } else if (coverRemoved) {
        data.append('cover_image', '')
      }

      galleryFiles.forEach((item) => data.append('gallery_images', item.file))

      const res = await apiClient.updateProfile(data)
      const user = res.data?.user || res.data
      setSuccess('Business profile saved. Your account is now a business account.')
      setGalleryFiles([])
      onSaved?.(user)
    } catch (err: any) {
      const raw = err?.response?.data?.message
      const text = Array.isArray(raw) ? raw.join('. ') : (raw || err?.message || 'Failed to save business profile')
      setError(text)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({ ...EMPTY, ...initial })
    setGalleryUrls(parseGalleryList(initial.business_gallery))
    setGalleryFiles([])
    if (initial.business_type) {
      if (isPredefinedType(initial.business_type)) {
        setTypeSelect(initial.business_type)
        setOtherBusinessType('')
      } else {
        setTypeSelect('Other')
        setOtherBusinessType(initial.business_type === 'Other' ? '' : initial.business_type)
      }
    } else {
      setTypeSelect('')
      setOtherBusinessType('')
    }

    if (initial.business_category) {
      if (isPredefinedCategory(initial.business_category)) {
        setCategorySelect(initial.business_category)
        setOtherBusinessCategory('')
      } else {
        setCategorySelect('Other')
        setOtherBusinessCategory(initial.business_category === 'Other' ? '' : initial.business_category)
      }
    } else {
      setCategorySelect('')
      setOtherBusinessCategory('')
    }
    setError('')
    setSuccess('')
  }

  const handleSwitchProfessional = async () => {
    setSwitching(true)
    setError('')
    setSuccess('')
    try {
      const data = new FormData()
      data.append('account_type', ACCOUNT_TYPE.PROFESSIONAL)
      const res = await apiClient.updateProfile(data)
      const user = res.data?.user || res.data
      setSuccess('Account switched back to professional.')
      onSaved?.(user)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to switch account type')
    } finally {
      setSwitching(false)
    }
  }

  const aboutCount = (form.business_about || '').length
  const productsCount = (form.business_products_services || '').length
  const yearOptions = useMemo(() => YEARS, [])

  return (
    <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ border: '1px solid #E8E8E8' }}>
      <div>
        <h2 className="text-xl font-semibold" style={{ color: '#212529' }}>Business Information</h2>
        <p className="text-sm mt-1" style={{ color: '#5F6368' }}>
          Manage your business details and presence on Businesstalk24.
        </p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 border border-red-200">{error}</div>}
      {success && <div className="text-sm text-green-700 bg-green-50 rounded-xl p-3 border border-green-200">{success}</div>}

      <div>
        <FieldLabel required>Business Name</FieldLabel>
        <input value={form.business_name || ''} onChange={(e) => setField('business_name', e.target.value)} placeholder="Aarav Foods Pvt. Ltd." className={inputCls} style={inputStyle} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Year of Establishment</FieldLabel>
          <select
            value={String(form.business_established_year || '')}
            onChange={(e) => setField('business_established_year', e.target.value)}
            className={inputCls}
            style={{ ...inputStyle, backgroundColor: '#fff' }}
          >
            <option value="">Select year</option>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel required>Business Type</FieldLabel>
          <select
            value={typeSelect}
            onChange={(e) => {
              setTypeSelect(e.target.value)
              if (e.target.value !== 'Other') setOtherBusinessType('')
            }}
            className={inputCls}
            style={{ ...inputStyle, backgroundColor: '#fff' }}
          >
            <option value="">Select type</option>
            {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      {typeSelect === 'Other' && (
        <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-xl space-y-1.5 transition-all">
          <FieldLabel required>Specify Custom Business Type</FieldLabel>
          <input
            type="text"
            value={otherBusinessType}
            onChange={(e) => setOtherBusinessType(e.target.value)}
            placeholder="Ex: Research & Development Lab, Space Tech, Venture Studio..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
            required
          />
        </div>
      )}

      <div>
        <FieldLabel required>Industry / Business Category</FieldLabel>
        <select
          value={categorySelect}
          onChange={(e) => {
            setCategorySelect(e.target.value)
            if (e.target.value !== 'Other') setOtherBusinessCategory('')
          }}
          className={inputCls}
          style={{ ...inputStyle, backgroundColor: '#fff' }}
        >
          <option value="">Select category</option>
          {BUSINESS_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>

      {categorySelect === 'Other' && (
        <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-xl space-y-1.5 transition-all">
          <FieldLabel required>Specify Custom Industry / Business Category</FieldLabel>
          <input
            type="text"
            value={otherBusinessCategory}
            onChange={(e) => setOtherBusinessCategory(e.target.value)}
            placeholder="Ex: Biotechnology, Clean Energy, Aerospace, Robotics..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
            required
          />
        </div>
      )}

      <div>
        <FieldLabel required>Business Address</FieldLabel>
        <input value={form.business_address || ''} onChange={(e) => setField('business_address', e.target.value)} placeholder="MIDC Industrial Area, Andheri East, Mumbai" className={inputCls} style={inputStyle} />
      </div>

      <div>
        <FieldLabel required>City / Location</FieldLabel>
        <input value={form.business_city || ''} onChange={(e) => setField('business_city', e.target.value)} placeholder="Mumbai, Maharashtra" className={inputCls} style={inputStyle} />
      </div>

      <div>
        <FieldLabel>Business Contact Number (Optional)</FieldLabel>
        <input type="tel" value={form.business_phone || ''} onChange={(e) => setField('business_phone', e.target.value)} placeholder="+91 98765 43210" className={inputCls} style={inputStyle} />
      </div>

      <div>
        <FieldLabel>Website (Optional)</FieldLabel>
        <input value={form.business_website || ''} onChange={(e) => setField('business_website', e.target.value)} placeholder="www.yourbusiness.com" className={inputCls} style={inputStyle} />
      </div>

      <div>
        <FieldLabel required>About Business</FieldLabel>
        <textarea
          rows={4}
          maxLength={BUSINESS_TEXT_MAX}
          value={form.business_about || ''}
          onChange={(e) => setField('business_about', e.target.value)}
          placeholder="Tell people what your business does..."
          className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
          style={inputStyle}
        />
        <p className="text-xs text-gray-400 text-right mt-1">{aboutCount}/{BUSINESS_TEXT_MAX}</p>
      </div>

      <div>
        <FieldLabel required>Products / Services</FieldLabel>
        <textarea
          rows={3}
          maxLength={BUSINESS_TEXT_MAX}
          value={form.business_products_services || ''}
          onChange={(e) => setField('business_products_services', e.target.value)}
          placeholder="Namkeen, Snacks, Ready-to-Eat Foods"
          className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
          style={inputStyle}
        />
        <p className="text-xs text-gray-400 text-right mt-1">{productsCount}/{BUSINESS_TEXT_MAX}</p>
      </div>

      <div>
        <FieldLabel>Business / Product Gallery</FieldLabel>
        <p className="text-xs text-gray-400 mb-3">Upload photos of your facility, products, team or office (Max 5 images)</p>
        <div className="flex flex-wrap gap-3">
          {galleryUrls.map((url) => (
            <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden border bg-gray-50">
              <img src={url} alt="Gallery" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setGalleryUrls((prev) => prev.filter((item) => item !== url))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {galleryFiles.map((item, index) => (
            <div key={item.preview} className="relative w-24 h-24 rounded-xl overflow-hidden border bg-gray-50">
              <img src={item.preview} alt="New gallery" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setGalleryFiles((prev) => prev.filter((_, i) => i !== index))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {galleryCount < BUSINESS_GALLERY_MAX && (
            <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400">
              <Plus className="w-5 h-5" />
              <span className="text-[11px] mt-1">Add Photo</span>
              <input type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={(e) => handleGalleryAdd(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      {isBusiness && (
        <button
          type="button"
          onClick={handleSwitchProfessional}
          disabled={switching || saving}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 underline disabled:opacity-60"
        >
          {switching ? 'Switching...' : 'Switch back to professional account'}
        </button>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-2.5 rounded-lg border text-sm font-medium"
          style={{ borderColor: '#E8E8E8', color: '#212529' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: '#1976D2' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
