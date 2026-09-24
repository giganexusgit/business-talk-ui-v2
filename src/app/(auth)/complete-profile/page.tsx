'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Upload, 
  X, 
  Plus, 
  Pencil, 
  Briefcase, 
  GraduationCap, 
  User, 
  Building2, 
  Image as ImageIcon,
  Globe,
  Phone,
  MapPin,
  ArrowRight
} from 'lucide-react'
import { useAppDispatch } from '@/hooks/useRedux'
import { completeProfile } from '@/redux/slices/authSlice'
import { validateImageFile } from '@/lib/utils'
import { 
  ACCOUNT_TYPE, 
  BUSINESS_TYPES, 
  BUSINESS_CATEGORIES, 
  BUSINESS_GALLERY_MAX,
  validateBusinessImageFile 
} from '@/lib/business-profile'

// ── Types ─────────────────────────────────────────────────────────────────────
type ExperienceEntry = {
  title: string
  employment_type: string
  company: string
  location: string
  location_type: string
  start_month: string
  start_year: string
  currently_working: boolean
  end_month: string
  end_year: string
  description: string
  skills: string[]
}

type EducationEntry = {
  school: string
  degree: string
  field_of_study: string
  start_month: string
  start_year: string
  end_month: string
  end_year: string
  grade: string
  activities: string
  description: string
  skills: string[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR - i))
const EST_YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => String(CURRENT_YEAR - i))

const EMPTY_EXP: ExperienceEntry = {
  title: '', employment_type: '', company: '', location: '',
  location_type: '', start_month: '', start_year: '',
  currently_working: false, end_month: '', end_year: '', description: '', skills: [],
}
const EMPTY_EDU: EducationEntry = {
  school: '', degree: '', field_of_study: '',
  start_month: '', start_year: '', end_month: '', end_year: '',
  grade: '', activities: '', description: '', skills: [],
}

// ── Reusable Input Components ────────────────────────────────────────────────
function FormLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-800">
        {children}
        {required && <span className="text-red-500 ml-1 font-bold">*</span>}
      </label>
      {hint && <span className="text-xs text-gray-600 font-normal">{hint}</span>}
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  icon: Icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  icon?: any
}) {
  return (
    <div>
      <FormLabel required={required}>{label}</FormLabel>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white border border-gray-300 rounded-xl py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all ${
            Icon ? 'pl-10 pr-3.5' : 'px-3.5'
          }`}
        />
      </div>
    </div>
  )
}

function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  rows = 3,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  rows?: number
  maxLength?: number
}) {
  return (
    <div>
      <FormLabel required={required} hint={maxLength ? `${value.length}/${maxLength}` : undefined}>
        {label}
      </FormLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-black resize-none transition-all"
      />
    </div>
  )
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: readonly string[] | string[]
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      {label && <FormLabel required={required}>{label}</FormLabel>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
      >
        <option value="" disabled className="text-gray-600">{placeholder || `Select ${label}`}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-gray-900">
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Skills Input Component ───────────────────────────────────────────────────
function SkillsInputBox({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !skills.includes(v)) {
      onChange([...skills, v])
      setInput('')
    }
  }
  return (
    <div>
      <FormLabel>Skills & Expertise</FormLabel>
      <div className="flex gap-2 mb-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Add a skill (e.g. Strategy, UI/UX, Sales)"
          className="flex-1 bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
        />
        <button
          type="button"
          onClick={add}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-100 text-gray-800 border border-gray-300 hover:bg-black hover:text-white hover:border-black transition-all"
        >
          + Add
        </button>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-300 text-gray-900 px-3 py-1 rounded-full text-xs font-semibold"
            >
              {s}
              <button
                type="button"
                onClick={() => onChange(skills.filter((x) => x !== s))}
                className="hover:text-red-600 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Experience Modal ──────────────────────────────────────────────────────────
function ExperienceModal({
  initial,
  onSave,
  onClose,
}: {
  initial: ExperienceEntry
  onSave: (e: ExperienceEntry) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<ExperienceEntry>(initial)
  const set = (field: keyof ExperienceEntry, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-gray-200 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/60">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {initial.title ? 'Edit Experience' : 'Add Experience'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          <TextInput
            label="Job Title"
            value={form.title}
            onChange={(v) => set('title', v)}
            placeholder="Ex: Product Manager, Senior Architect"
            required
          />

          <SelectInput
            label="Employment Type"
            value={form.employment_type}
            onChange={(v) => set('employment_type', v)}
            options={['Full-time', 'Part-time', 'Self-employed', 'Freelance', 'Contract', 'Internship', 'Apprenticeship']}
            placeholder="Select type"
          />

          <TextInput
            label="Company Name"
            value={form.company}
            onChange={(v) => set('company', v)}
            placeholder="Ex: Google, BusinessTalk24"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Location"
              value={form.location}
              onChange={(v) => set('location', v)}
              placeholder="Ex: London, UK"
            />
            <SelectInput
              label="Location Type"
              value={form.location_type}
              onChange={(v) => set('location_type', v)}
              options={['On-site', 'Remote', 'Hybrid']}
              placeholder="Select location type"
            />
          </div>

          <div>
            <FormLabel>Start Date</FormLabel>
            <div className="grid grid-cols-2 gap-3">
              <SelectInput
                value={form.start_month}
                onChange={(v) => set('start_month', v)}
                options={MONTHS}
                placeholder="Month"
              />
              <SelectInput
                value={form.start_year}
                onChange={(v) => set('start_year', v)}
                options={YEARS}
                placeholder="Year"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 py-1">
            <input
              type="checkbox"
              id="currently_working"
              checked={form.currently_working}
              onChange={(e) => set('currently_working', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black accent-black"
            />
            <label htmlFor="currently_working" className="text-sm font-medium text-gray-700 cursor-pointer">
              I currently work in this role
            </label>
          </div>

          {!form.currently_working && (
            <div>
              <FormLabel>End Date</FormLabel>
              <div className="grid grid-cols-2 gap-3">
                <SelectInput
                  value={form.end_month}
                  onChange={(v) => set('end_month', v)}
                  options={MONTHS}
                  placeholder="Month"
                />
                <SelectInput
                  value={form.end_year}
                  onChange={(v) => set('end_year', v)}
                  options={YEARS}
                  placeholder="Year"
                />
              </div>
            </div>
          )}

          <TextAreaInput
            label="Description"
            value={form.description}
            onChange={(v) => set('description', v)}
            placeholder="Describe key responsibilities, achievements, and impact..."
            rows={3}
          />

          <SkillsInputBox skills={form.skills} onChange={(v) => set('skills', v)} />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.title.trim() && form.company.trim()) onSave(form)
            }}
            disabled={!form.title.trim() || !form.company.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-30 transition"
          >
            Save Experience
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Education Modal ───────────────────────────────────────────────────────────
function EducationModal({
  initial,
  onSave,
  onClose,
}: {
  initial: EducationEntry
  onSave: (e: EducationEntry) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<EducationEntry>(initial)
  const set = (field: keyof EducationEntry, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-gray-200 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/60">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {initial.school ? 'Edit Education' : 'Add Education'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          <TextInput
            label="School / University"
            value={form.school}
            onChange={(v) => set('school', v)}
            placeholder="Ex: Stanford University, Oxford"
            required
          />

          <TextInput
            label="Degree"
            value={form.degree}
            onChange={(v) => set('degree', v)}
            placeholder="Ex: Bachelor of Science, MBA"
          />

          <TextInput
            label="Field of Study"
            value={form.field_of_study}
            onChange={(v) => set('field_of_study', v)}
            placeholder="Ex: Computer Science, Business Administration"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel>Start Year</FormLabel>
              <SelectInput
                value={form.start_year}
                onChange={(v) => set('start_year', v)}
                options={YEARS}
                placeholder="Year"
              />
            </div>
            <div>
              <FormLabel>End Year (or Expected)</FormLabel>
              <SelectInput
                value={form.end_year}
                onChange={(v) => set('end_year', v)}
                options={YEARS}
                placeholder="Year"
              />
            </div>
          </div>

          <TextInput
            label="Grade / GPA"
            value={form.grade}
            onChange={(v) => set('grade', v)}
            placeholder="Ex: 3.8 GPA, First Class Honours"
          />

          <TextAreaInput
            label="Description & Activities"
            value={form.description}
            onChange={(v) => set('description', v)}
            placeholder="Describe notable societies, coursework, or achievements..."
            rows={3}
          />

          <SkillsInputBox skills={form.skills} onChange={(v) => set('skills', v)} />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.school.trim()) onSave(form)
            }}
            disabled={!form.school.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-30 transition"
          >
            Save Education
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function CompleteProfilePage() {
  const router = useRouter()
  const dispatch = useAppDispatch()

  // Account Type: 'professional' vs 'business'
  const [accountType, setAccountType] = useState<'professional' | 'business'>('professional')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Media
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [previewCover, setPreviewCover] = useState<string | null>(null)

  // Personal Fields
  const [fullName, setFullName] = useState('')
  const [profession, setProfession] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [shortBio, setShortBio] = useState('')
  const [about, setAbout] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([])
  const [educations, setEducations] = useState<EducationEntry[]>([])

  // Business Fields
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [otherBusinessType, setOtherBusinessType] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [otherBusinessCategory, setOtherBusinessCategory] = useState('')
  const [businessEstablishedYear, setBusinessEstablishedYear] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessAbout, setBusinessAbout] = useState('')
  const [businessProductsServices, setBusinessProductsServices] = useState('')
  const [galleryFiles, setGalleryFiles] = useState<{ file: File; preview: string }[]>([])

  // Modals
  const [expModal, setExpModal] = useState(false)
  const [editExpIndex, setEditExpIndex] = useState<number | null>(null)
  const [eduModal, setEduModal] = useState(false)
  const [editEduIndex, setEditEduIndex] = useState<number | null>(null)

  // Handlers for Photo & Cover
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const err = validateImageFile(file)
      if (err) {
        alert(err)
        return
      }
      setProfilePhoto(file)
      const reader = new FileReader()
      reader.onload = (event) => setPreviewPhoto(event.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const err = validateImageFile(file)
      if (err) {
        alert(err)
        return
      }
      setCoverImage(file)
      const reader = new FileReader()
      reader.onload = (event) => setPreviewCover(event.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleGalleryAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remaining = BUSINESS_GALLERY_MAX - galleryFiles.length
    if (files.length > remaining) {
      alert(`You can upload at most ${BUSINESS_GALLERY_MAX} gallery images (${remaining} slots remaining)`)
    }

    const validNew = files.slice(0, remaining).map((f) => {
      const err = validateBusinessImageFile(f)
      if (err) {
        alert(err)
        return null
      }
      return { file: f, preview: URL.createObjectURL(f) }
    }).filter(Boolean) as { file: File; preview: string }[]

    setGalleryFiles((prev) => [...prev, ...validNew])
    e.target.value = ''
  }

  const handleRemoveGalleryItem = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Experience handlers
  const handleSaveExp = (entry: ExperienceEntry) => {
    if (editExpIndex !== null) {
      setExperiences((prev) => prev.map((e, i) => (i === editExpIndex ? entry : e)))
    } else {
      setExperiences((prev) => [...prev, entry])
    }
    setExpModal(false)
    setEditExpIndex(null)
  }

  // Education handlers
  const handleSaveEdu = (entry: EducationEntry) => {
    if (editEduIndex !== null) {
      setEducations((prev) => prev.map((e, i) => (i === editEduIndex ? entry : e)))
    } else {
      setEducations((prev) => [...prev, entry])
    }
    setEduModal(false)
    setEditEduIndex(null)
  }

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (accountType === 'professional') {
      if (!fullName.trim()) {
        setError('Full Name is required')
        return
      }
    } else {
      // Business account validation
      if (!businessName.trim()) {
        setError('Business Name is required')
        return
      }
      if (!businessEstablishedYear) {
        setError('Year of establishment is required')
        return
      }
      if (!businessType) {
        setError('Business Type is required')
        return
      }
      if (businessType === 'Other' && !otherBusinessType.trim()) {
        setError('Please specify your other business type')
        return
      }
      if (!businessCategory) {
        setError('Industry / Business Category is required')
        return
      }
      if (businessCategory === 'Other' && !otherBusinessCategory.trim()) {
        setError('Please specify your other industry / category')
        return
      }
      if (!businessAddress.trim()) {
        setError('Business Address is required')
        return
      }
      if (!businessCity.trim()) {
        setError('Business City is required')
        return
      }
      if (!businessAbout.trim()) {
        setError('About Business description is required')
        return
      }
      if (!businessProductsServices.trim()) {
        setError('Products & Services description is required')
        return
      }
    }

    setSubmitting(true)
    try {
      const formData = new FormData()

      if (accountType === 'professional') {
        formData.append('account_type', ACCOUNT_TYPE.PROFESSIONAL)
        formData.append('full_name', fullName.trim())
        if (profession.trim()) formData.append('profession', profession.trim())
        if (company.trim()) formData.append('company', company.trim())
        if (location.trim()) formData.append('location', location.trim())
        if (shortBio.trim()) formData.append('short_bio', shortBio.trim())
        if (about.trim()) formData.append('about', about.trim())
        if (skills.length) {
          skills.forEach((s) => formData.append('skills', s))
        }
        if (experiences.length) {
          formData.append('experience', JSON.stringify(experiences))
        }
        if (educations.length) {
          formData.append('education', JSON.stringify(educations))
        }
        if (profilePhoto) formData.append('profile_photo', profilePhoto)
        if (coverImage) formData.append('cover_image', coverImage)
      } else {
        const finalType = businessType === 'Other' ? otherBusinessType.trim() : businessType
        const finalCategory = businessCategory === 'Other' ? otherBusinessCategory.trim() : businessCategory

        // Business Account Payload
        formData.append('account_type', ACCOUNT_TYPE.BUSINESS)
        formData.append('business_name', businessName.trim())
        formData.append('business_established_year', String(businessEstablishedYear))
        formData.append('business_type', finalType)
        formData.append('business_category', finalCategory)
        formData.append('business_address', businessAddress.trim())
        formData.append('business_city', businessCity.trim())
        if (businessPhone.trim()) formData.append('business_phone', businessPhone.trim())
        if (businessWebsite.trim()) formData.append('business_website', businessWebsite.trim())
        formData.append('business_about', businessAbout.trim())
        formData.append('business_products_services', businessProductsServices.trim())
        
        // Use business name / contact for full name fallback
        if (fullName.trim()) {
          formData.append('full_name', fullName.trim())
        } else {
          formData.append('full_name', businessName.trim())
        }

        if (profilePhoto) {
          formData.append('profile_photo', profilePhoto)
          formData.append('business_logo', profilePhoto)
        }
        if (coverImage) formData.append('cover_image', coverImage)

        // Add gallery images
        galleryFiles.forEach((item) => {
          formData.append('gallery_images', item.file)
        })
      }

      const result = await dispatch(completeProfile(formData as any))
      if (completeProfile.fulfilled.match(result)) {
        router.push('/dashboard')
      } else if (completeProfile.rejected.match(result)) {
        let msg = result.payload as any
        if (typeof msg === 'string') {
          try {
            const parsed = JSON.parse(msg)
            if (parsed.message) {
              msg = Array.isArray(parsed.message) ? parsed.message.join('. ') : parsed.message
            }
          } catch {}
        } else if (msg && typeof msg === 'object' && msg.message) {
          msg = Array.isArray(msg.message) ? msg.message.join('. ') : msg.message
        }
        setError(typeof msg === 'string' ? msg : 'Failed to complete profile. Please check required fields.')
      }
    } catch (err: any) {
      setError(err?.message || 'Profile setup failed. Please check your inputs.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {/* Title & Account Selection Prompt */}
      <div className="text-center mb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mb-1.5">
          Select which account you want to create?
        </h1>
      </div>

      {/* ── Slim & Professional Segmented Switch ────────────────────────────── */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex p-1 bg-gray-100/90 border border-gray-200 rounded-full max-w-md w-full shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setAccountType('professional')
              setError(null)
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
              accountType === 'professional'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-white/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountType('business')
              setError(null)
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
              accountType === 'business'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-white/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Business Account</span>
          </button>
        </div>
      </div>

      {/* ── Dynamic Profile Heading ───────────────────────────────────────── */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-1.5">
          Complete Your {accountType === 'professional' ? 'Personal' : 'Business'} Profile
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          {accountType === 'professional'
            ? 'Set up your personal professional identity and experience.'
            : 'Set up your company profile, business details, and showcase.'}
        </p>
      </div>

      {/* ── Main Form Container ───────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-9 shadow-sm">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <X className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Cover & Avatar Header */}
          <div className="space-y-4 pb-6 border-b border-gray-100">
            {/* Cover / Banner */}
            <div>
              <FormLabel hint="Recommended: 16:9 ratio (e.g. 1584×396px)">
                {accountType === 'professional' ? 'Profile Banner / Cover Image (Optional)' : 'Company Banner / Header (Optional)'}
              </FormLabel>
              <label className="block cursor-pointer group">
                <div
                  className="w-full rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 group-hover:border-black transition-all flex items-center justify-center bg-gray-50 relative"
                  style={{ aspectRatio: '16/5', minHeight: '140px' }}
                >
                  {previewCover ? (
                    <img src={previewCover} alt="Cover Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-gray-600 group-hover:text-black transition">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-semibold">Click to upload banner image (optional)</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </label>
              {previewCover && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage(null)
                    setPreviewCover(null)
                  }}
                  className="mt-1.5 text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Remove cover
                </button>
              )}
            </div>

            {/* Profile Avatar / Logo */}
            <div className="flex items-center gap-5 pt-2">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 ${
                  accountType === 'professional' ? 'rounded-full' : 'rounded-2xl'
                } bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative group shadow-xs`}
              >
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center">
                    {accountType === 'professional' ? (
                      <User className="w-8 h-8" />
                    ) : (
                      <Building2 className="w-8 h-8" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-800 mb-1.5">
                  {accountType === 'professional' ? 'Profile Photo (Optional)' : 'Business Logo (Optional)'}
                </label>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 hover:bg-black hover:text-white hover:border-black cursor-pointer transition-all shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{previewPhoto ? 'Change Photo' : 'Upload Image (Optional)'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                {previewPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePhoto(null)
                      setPreviewPhoto(null)
                    }}
                    className="ml-3 text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                )}
                <p className="text-xs text-gray-600 mt-1">JPG or PNG (max 5 MB)</p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* CONDITIONAL FORM CONTENT BASED ON ACCOUNT TYPE                     */}
          {/* ═══════════════════════════════════════════════════════════════════ */}

          {accountType === 'professional' ? (
            /* ──────────────── PERSONAL / PROFESSIONAL FIELDS ─────────────────── */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Full Name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Ex: John Doe"
                  required
                />
                <TextInput
                  label="Professional Title / Profession"
                  value={profession}
                  onChange={setProfession}
                  placeholder="Ex: Software Engineer, Founder"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Current Company / Organization"
                  value={company}
                  onChange={setCompany}
                  placeholder="Ex: Acme Inc."
                />
                <TextInput
                  label="Location"
                  value={location}
                  onChange={setLocation}
                  placeholder="Ex: San Francisco, CA"
                  icon={MapPin}
                />
              </div>

              <TextInput
                label="Short Bio"
                value={shortBio}
                onChange={setShortBio}
                placeholder="A one-line professional headline about you"
              />

              <TextAreaInput
                label="About"
                value={about}
                onChange={setAbout}
                placeholder="Share your professional background, focus areas, and interests..."
                rows={4}
              />

              {/* Skills */}
              <SkillsInputBox skills={skills} onChange={setSkills} />

              {/* Experience Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" /> Work Experience
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditExpIndex(null)
                      setExpModal(true)
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-black hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Experience
                  </button>
                </div>

                {experiences.length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <p className="text-xs text-gray-600">No experience entries added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {experiences.map((exp, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition"
                      >
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-black">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900">{exp.title}</p>
                            <p className="text-xs text-gray-600">
                              {exp.company}
                              {exp.employment_type ? ` · ${exp.employment_type}` : ''}
                            </p>
                            {(exp.start_year || exp.currently_working) && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {exp.start_month} {exp.start_year} –{' '}
                                {exp.currently_working ? 'Present' : `${exp.end_month} ${exp.end_year}`}
                                {exp.location ? ` · ${exp.location}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditExpIndex(i)
                              setExpModal(true)
                            }}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExperiences((prev) => prev.filter((_, idx) => idx !== i))}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Education Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> Education
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditEduIndex(null)
                      setEduModal(true)
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-black hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Education
                  </button>
                </div>

                {educations.length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <p className="text-xs text-gray-600">No education entries added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {educations.map((edu, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition"
                      >
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-black">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900">{edu.degree || edu.school}</p>
                            <p className="text-xs text-gray-600">{edu.school}</p>
                            {edu.field_of_study && (
                              <p className="text-xs text-gray-600 mt-0.5">{edu.field_of_study}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditEduIndex(i)
                              setEduModal(true)
                            }}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEducations((prev) => prev.filter((_, idx) => idx !== i))}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ──────────────── BUSINESS / COMPANY FIELDS ──────────────────────── */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Business / Company Name"
                  value={businessName}
                  onChange={setBusinessName}
                  placeholder="Ex: Innovate Corp"
                  required
                />
                <TextInput
                  label="Contact Person Full Name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Ex: John Doe (Founder / Representative)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectInput
                  label="Business Category / Industry"
                  value={businessCategory}
                  onChange={(v) => {
                    setBusinessCategory(v)
                    if (v !== 'Other') setOtherBusinessCategory('')
                  }}
                  options={BUSINESS_CATEGORIES}
                  placeholder="Select Industry"
                  required
                />

                <SelectInput
                  label="Business Type"
                  value={businessType}
                  onChange={(v) => {
                    setBusinessType(v)
                    if (v !== 'Other') setOtherBusinessType('')
                  }}
                  options={BUSINESS_TYPES}
                  placeholder="Select Business Type"
                  required
                />
              </div>

              {businessCategory === 'Other' && (
                <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-xl space-y-1 transition-all">
                  <TextInput
                    label="Specify Custom Industry / Business Category"
                    value={otherBusinessCategory}
                    onChange={setOtherBusinessCategory}
                    placeholder="Ex: Biotechnology, Renewable Energy, Aerospace, Robotics..."
                    required
                  />
                </div>
              )}

              {businessType === 'Other' && (
                <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-xl space-y-1 transition-all">
                  <TextInput
                    label="Specify Custom Business Type"
                    value={otherBusinessType}
                    onChange={setOtherBusinessType}
                    placeholder="Ex: Research & Development Lab, Space Tech, Venture Studio..."
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SelectInput
                  label="Established Year"
                  value={businessEstablishedYear}
                  onChange={setBusinessEstablishedYear}
                  options={EST_YEARS}
                  placeholder="Year"
                  required
                />
                <TextInput
                  label="Business Phone"
                  value={businessPhone}
                  onChange={setBusinessPhone}
                  placeholder="+1 (555) 000-0000"
                  icon={Phone}
                />
                <TextInput
                  label="Business Website"
                  value={businessWebsite}
                  onChange={setBusinessWebsite}
                  placeholder="https://example.com"
                  icon={Globe}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Business Address"
                  value={businessAddress}
                  onChange={setBusinessAddress}
                  placeholder="Street Address or Building"
                  required
                  icon={MapPin}
                />
                <TextInput
                  label="City / State"
                  value={businessCity}
                  onChange={setBusinessCity}
                  placeholder="Ex: New York, NY"
                  required
                />
              </div>

              <TextAreaInput
                label="About Company"
                value={businessAbout}
                onChange={setBusinessAbout}
                placeholder="Describe your company's mission, background, and vision..."
                rows={3}
                required
              />

              <TextAreaInput
                label="Products & Services"
                value={businessProductsServices}
                onChange={setBusinessProductsServices}
                placeholder="List the key products, solutions, or services your business offers..."
                rows={3}
                required
              />

              {/* Business Gallery */}
              <div>
                <FormLabel hint={`Up to ${BUSINESS_GALLERY_MAX} images`}>
                  Business Showcase / Gallery Photos
                </FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
                  {galleryFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group shadow-2xs"
                    >
                      <img src={item.preview} alt="Gallery" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryItem(idx)}
                        className="absolute top-1.5 right-1.5 bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {galleryFiles.length < BUSINESS_GALLERY_MAX && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-black flex flex-col items-center justify-center cursor-pointer transition-all bg-gray-50/60 hover:bg-gray-50">
                      <ImageIcon className="w-5 h-5 text-gray-600 mb-1" />
                      <span className="text-[11px] font-semibold text-gray-700">+ Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryAdd}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Submit Action Button ───────────────────────────────────────── */}
          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-black text-white font-bold text-sm sm:text-base hover:bg-neutral-800 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-md"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {accountType === 'professional' ? 'Complete Personal Profile' : 'Complete Business Profile'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Experience Modal */}
      {expModal && (
        <ExperienceModal
          initial={editExpIndex !== null ? experiences[editExpIndex] : EMPTY_EXP}
          onSave={handleSaveExp}
          onClose={() => {
            setExpModal(false)
            setEditExpIndex(null)
          }}
        />
      )}

      {/* Education Modal */}
      {eduModal && (
        <EducationModal
          initial={editEduIndex !== null ? educations[editEduIndex] : EMPTY_EDU}
          onSave={handleSaveEdu}
          onClose={() => {
            setEduModal(false)
            setEditEduIndex(null)
          }}
        />
      )}
    </div>
  )
}
