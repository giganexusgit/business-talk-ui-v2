'use client'



import {

  User, Lock, Bell, Shield, Mail, Smartphone,
  // Eye, Globe,

  Upload, X, Briefcase, GraduationCap, Plus, Pencil, Trash2,

} from 'lucide-react'

import { useState, useEffect } from 'react'

import apiClient from '@/lib/api-client'
import PasswordInput from '@/components/common/PasswordInput'
import { validateImageFile } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux'
import {
  requestPushPermission,
  revokePushPermission,
  savePushPreferences,
  syncPermissionState,
} from '@/redux/slices/pushSlice'
import { isPushSupported, getPushPermissionState } from '@/lib/fcm'
import BusinessInformationForm from '@/components/settings/BusinessInformationForm'
import { ACCOUNT_TYPE, BusinessProfileFields } from '@/lib/business-profile'


type ExperienceEntry = {

  title: string; employment_type: string; company: string; location: string

  location_type: string; start_month: string; start_year: string

  currently_working: boolean; end_month: string; end_year: string

  description: string; skills: string[]

}

type EducationEntry = {

  school: string; degree: string; field_of_study: string

  start_month: string; start_year: string; end_month: string; end_year: string

  grade: string; activities: string; description: string; skills: string[]

}



const MONTHS = ['January','February','March','April','May','June',

  'July','August','September','October','November','December']

const YEARS = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i))



const EMPTY_EXP: ExperienceEntry = {

  title: '', employment_type: '', company: '', location: '', location_type: '',

  start_month: '', start_year: '', currently_working: false,

  end_month: '', end_year: '', description: '', skills: [],

}

const EMPTY_EDU: EducationEntry = {

  school: '', degree: '', field_of_study: '',

  start_month: '', start_year: '', end_month: '', end_year: '',

  grade: '', activities: '', description: '', skills: [],

}



function parseMaybeJson(val: any): any[] {

  if (!val) return []

  if (Array.isArray(val)) return val

  try { return JSON.parse(val) } catch { return [] }

}



// â”€â”€ Shared field helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MField({ label, value, onChange, placeholder, required, type = 'text' }: {

  label?: string; value: string; onChange: (v: string) => void

  placeholder?: string; required?: boolean; type?: string

}) {

  return (

    <div>

      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}

      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}

        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

    </div>

  )

}

function MSelect({ label, value, onChange, options, placeholder }: {

  label?: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string

}) {

  return (

    <div>

      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      <select value={value} onChange={e => onChange(e.target.value)}

        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">

        {placeholder && <option value="">{placeholder}</option>}

        {options.map(o => <option key={o} value={o}>{o}</option>)}

      </select>

    </div>

  )

}

function MTextarea({ label, value, onChange, placeholder, rows = 3, maxLength }: {

  label?: string; value: string; onChange: (v: string) => void

  placeholder?: string; rows?: number; maxLength?: number

}) {

  return (

    <div>

      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}

        rows={rows} maxLength={maxLength}

        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />

    </div>

  )

}

function SkillsInput({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {

  const [input, setInput] = useState('')

  const add = () => {

    const v = input.trim()

    if (v && !skills.includes(v)) { onChange([...skills, v]); setInput('') }

  }

  return (

    <div>

      <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>

      <div className="flex gap-2 mb-2">

        <input type="text" value={input} onChange={e => setInput(e.target.value)}

          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}

          placeholder="Add a skill (press Enter)"

          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <button type="button" onClick={add}

          className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition">

          + Add

        </button>

      </div>

      {skills.length > 0 && (

        <div className="flex flex-wrap gap-2">

          {skills.map(s => (

            <span key={s} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">

              {s}

              <button type="button" onClick={() => onChange(skills.filter(x => x !== s))}

                className="hover:text-blue-900"><X className="w-3 h-3" /></button>

            </span>

          ))}

        </div>

      )}

    </div>

  )

}



// â”€â”€ Experience Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ExperienceModal({ initial, onSave, onClose }: {

  initial: ExperienceEntry; onSave: (e: ExperienceEntry) => void; onClose: () => void

}) {

  const [form, setForm] = useState<ExperienceEntry>(initial)

  const set = (field: keyof ExperienceEntry, value: string | boolean | string[]) =>

    setForm(f => ({ ...f, [field]: value }))

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b">

          <h2 className="text-lg font-semibold">{initial.title ? 'Edit experience' : 'Add experience'}</h2>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>

        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">

          <p className="text-xs text-gray-500">* Indicates required</p>

          <MField label="Title" value={form.title} onChange={v => set('title', v)} placeholder="Ex: Senior Engineer" required />

          <MSelect label="Employment type" value={form.employment_type} onChange={v => set('employment_type', v)}

            placeholder="Please select" options={['Full-time','Part-time','Self-employed','Freelance','Contract','Internship','Apprenticeship','Seasonal']} />

          <MField label="Company name" value={form.company} onChange={v => set('company', v)} placeholder="Ex: Microsoft" required />

          <MField label="Location" value={form.location} onChange={v => set('location', v)} placeholder="Ex: London, United Kingdom" />

          <MSelect label="Location type" value={form.location_type} onChange={v => set('location_type', v)}

            placeholder="Please select" options={['On-site','Remote','Hybrid']} />

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>

            <div className="grid grid-cols-2 gap-3">

              <MSelect value={form.start_month} onChange={v => set('start_month', v)} options={MONTHS} placeholder="Month" />

              <MSelect value={form.start_year} onChange={v => set('start_year', v)} options={YEARS} placeholder="Year" />

            </div>

          </div>

          <div className="flex items-center gap-3">

            <input type="checkbox" id="cw_settings" checked={form.currently_working}

              onChange={e => set('currently_working', e.target.checked)}

              className="w-4 h-4 rounded border-gray-300 text-blue-600" />

            <label htmlFor="cw_settings" className="text-sm text-gray-700">I currently work here</label>

          </div>

          {!form.currently_working && (

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>

              <div className="grid grid-cols-2 gap-3">

                <MSelect value={form.end_month} onChange={v => set('end_month', v)} options={MONTHS} placeholder="Month" />

                <MSelect value={form.end_year} onChange={v => set('end_year', v)} options={YEARS} placeholder="Year" />

              </div>

            </div>

          )}

          <MTextarea label="Description" value={form.description} onChange={v => set('description', v)}

            placeholder="Describe your role and achievements..." rows={4} />

          <SkillsInput skills={form.skills} onChange={v => set('skills', v)} />

        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">

          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>

          <button onClick={() => { if (form.title.trim() && form.company.trim()) onSave(form) }}

            disabled={!form.title.trim() || !form.company.trim()}

            className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition">

            Save

          </button>

        </div>

      </div>

    </div>

  )

}



// â”€â”€ Education Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EducationModal({ initial, onSave, onClose }: {

  initial: EducationEntry; onSave: (e: EducationEntry) => void; onClose: () => void

}) {

  const [form, setForm] = useState<EducationEntry>(initial)

  const set = (field: keyof EducationEntry, value: string | string[]) =>

    setForm(f => ({ ...f, [field]: value }))

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b">

          <h2 className="text-lg font-semibold">{initial.school ? 'Edit education' : 'Add education'}</h2>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>

        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">

          <p className="text-xs text-gray-500">* Indicates required</p>

          <MField label="School" value={form.school} onChange={v => set('school', v)}

            placeholder="Ex: California State University" required />

          <MField label="Degree" value={form.degree} onChange={v => set('degree', v)} placeholder="Ex: Bachelor of Science" />

          <MField label="Field of study" value={form.field_of_study} onChange={v => set('field_of_study', v)}

            placeholder="Ex: Mechanical Engineering" />

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>

            <div className="grid grid-cols-2 gap-3">

              <MSelect value={form.start_month} onChange={v => set('start_month', v)} options={MONTHS} placeholder="Month" />

              <MSelect value={form.start_year} onChange={v => set('start_year', v)} options={YEARS} placeholder="Year" />

            </div>

          </div>

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">End date (or expected)</label>

            <div className="grid grid-cols-2 gap-3">

              <MSelect value={form.end_month} onChange={v => set('end_month', v)} options={MONTHS} placeholder="Month" />

              <MSelect value={form.end_year} onChange={v => set('end_year', v)} options={YEARS} placeholder="Year" />

            </div>

          </div>

          <MField label="Grade" value={form.grade} onChange={v => set('grade', v)} placeholder="Ex: 3.58" />

          <MTextarea label="Activities and societies" value={form.activities} onChange={v => set('activities', v)}

            placeholder="Ex: Tau Beta Pi, Society of Automotive Engineers" rows={3} maxLength={500} />

          <MTextarea label="Description" value={form.description} onChange={v => set('description', v)}

            placeholder="Describe your studies and achievements..." rows={4} maxLength={1000} />

          <SkillsInput skills={form.skills} onChange={v => set('skills', v)} />

        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">

          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>

          <button onClick={() => { if (form.school.trim()) onSave(form) }}

            disabled={!form.school.trim()}

            className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition">

            Save

          </button>

        </div>

      </div>

    </div>

  )

}



// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// ─── Notifications tab (req 15 — notification preference UI) ─────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40"
      style={{ backgroundColor: checked ? '#1976D2' : '#BDBDBD' }}
      role="switch"
      aria-checked={checked}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

function NotificationsTab({
  emailNotifications,
  setEmailNotifications,
}: {
  emailNotifications: boolean;
  setEmailNotifications: (v: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const permission = useAppSelector((s) => s.push.permission);
  const isRegistering = useAppSelector((s) => s.push.isRegistering);
  const registrationError = useAppSelector((s) => s.push.registrationError);
  const prefs = useAppSelector((s) => s.push.preferences);
  const isRegisteredWithBackend = useAppSelector((s) => s.push.isRegisteredWithBackend);
  const supported = isPushSupported();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      dispatch(syncPermissionState(getPushPermissionState()));
    }
  }, [dispatch]);

  const handleEnablePush = async () => {
    await dispatch(requestPushPermission());
  };

  const handleDisablePush = async () => {
    await dispatch(revokePushPermission());
  };

  const handleTogglePref = (key: keyof typeof prefs) => {
    dispatch(savePushPreferences({ [key]: !prefs[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    await dispatch(savePushPreferences(prefs));
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const prefRows: { key: keyof Omit<typeof prefs, 'enabled'>; label: string; desc: string }[] = [
    { key: 'likes',        label: 'Likes',          desc: 'When someone likes your content' },
    { key: 'comments',     label: 'Comments',       desc: 'New comments on your posts' },
    { key: 'follows',      label: 'Follows',        desc: 'When someone follows you' },
    { key: 'messages',     label: 'Messages',       desc: 'New direct messages' },
    { key: 'mentions',     label: 'Mentions',       desc: 'When someone mentions you' },
    { key: 'groups',       label: 'Groups',         desc: 'Group activity and join requests' },
    { key: 'systemAlerts', label: 'System alerts',  desc: 'Important account notifications' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ border: '1px solid #E8E8E8' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#212529' }}>Email Notifications</h2>
        <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5" style={{ color: '#5F6368' }} />
            <div>
              <p className="font-medium" style={{ color: '#212529' }}>Email Notifications</p>
              <p className="text-sm" style={{ color: '#5F6368' }}>Receive notifications via email</p>
            </div>
          </div>
          <Toggle checked={emailNotifications} onChange={() => setEmailNotifications(!emailNotifications)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ border: '1px solid #E8E8E8' }}>
        <h2 className="text-xl font-semibold mb-1" style={{ color: '#212529' }}>Push Notifications</h2>
        <p className="text-sm text-gray-500 mb-4">Real-time alerts delivered directly to your browser or device.</p>

        {!supported && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Push notifications are not supported in this browser. Try Chrome, Edge, or Firefox. On iOS, install Businesstalk24 to your Home Screen via Safari.
          </div>
        )}

        {supported && permission === 'denied' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            You have blocked push notifications. Open your browser site settings and allow notifications for this site, then refresh the page.
          </div>
        )}

        {supported && (permission === 'default' || !isRegisteredWithBackend) && permission !== 'denied' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5" style={{ color: '#5F6368' }} />
                <div>
                  <p className="font-medium" style={{ color: '#212529' }}>Push Notifications</p>
                  <p className="text-sm" style={{ color: '#5F6368' }}>Click Enable to allow browser push notifications</p>
                </div>
              </div>
              <button onClick={handleEnablePush} disabled={isRegistering}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: '#1976D2' }}>
                {isRegistering ? 'Enabling\u2026' : 'Enable'}
              </button>
            </div>
            {registrationError && <p className="text-xs text-red-600 px-1">{registrationError}</p>}
          </div>
        )}

        {supported && permission === 'granted' && isRegisteredWithBackend && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border-2" style={{ backgroundColor: '#F0F7FF', borderColor: '#1976D2' }}>
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">Push Notifications Active</p>
                  <p className="text-sm text-blue-700">Your device is registered to receive push alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={prefs.enabled} onChange={() => handleTogglePref('enabled')} />
                <button onClick={handleDisablePush} className="text-xs text-red-500 hover:text-red-700 underline transition-colors">Disable</button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Notify me about\u2026</p>
              </div>
              {prefRows.map((row, i) => (
                <div key={row.key} className={`flex items-center justify-between px-4 py-3 ${i < prefRows.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{row.label}</p>
                    <p className="text-xs text-gray-500">{row.desc}</p>
                  </div>
                  <Toggle checked={prefs[row.key]} onChange={() => handleTogglePref(row.key)} disabled={!prefs.enabled} />
                </div>
              ))}
            </div>

            <button onClick={handleSave} disabled={saving}
              className="px-6 py-3 text-white rounded-lg transition-all disabled:opacity-50"
              style={{ backgroundColor: '#212529' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3D3D3D')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}>
              {saving ? 'Saving\u2026' : saveSuccess ? 'Saved \u2713' : 'Save Preferences'}
            </button>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 border border-gray-200">
        We are continuously improving our notification features and will have more options soon.
      </div>
    </div>
  );
}
export default function AdminSettingsPage() {

  const [activeTab, setActiveTab] = useState('profile')



  // â”€â”€ Profile state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const [profile, setProfile] = useState({

    full_name: '', profession: '', company: '',

    location: '', phone_number: '', short_bio: '',

  })

  const [profileSkills, setProfileSkills] = useState<string[]>([])

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [coverImage, setCoverImage] = useState<File | null>(null)

  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const [profileSection, setProfileSection] = useState<'basic' | 'business'>('basic')
  const [accountType, setAccountType] = useState<string>(ACCOUNT_TYPE.PROFESSIONAL)
  const [businessInitial, setBusinessInitial] = useState<BusinessProfileFields>({})



  const [experiences, setExperiences] = useState<ExperienceEntry[]>([])

  const [expModal, setExpModal] = useState(false)

  const [editExpIndex, setEditExpIndex] = useState<number | null>(null)



  const [educations, setEducations] = useState<EducationEntry[]>([])

  const [eduModal, setEduModal] = useState(false)

  const [editEduIndex, setEditEduIndex] = useState<number | null>(null)



  const [loading, setLoading] = useState(false)

  const [saving, setSaving] = useState(false)

  const [success, setSuccess] = useState('')

  const [error, setError] = useState('')



  // â”€â”€ Account/Security state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const [email, setEmail] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')

  const [newPassword, setNewPassword] = useState('')

  const [confirmPassword, setConfirmPassword] = useState('')

  const [pwLoading, setPwLoading] = useState(false)

  const [pwSuccess, setPwSuccess] = useState('')

  const [pwError, setPwError] = useState('')

  // const [twoFactorAuth, setTwoFactorAuth] = useState(false)

  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [changePassword, setChangePassword] = useState('')
  const [changeEmailError, setChangeEmailError] = useState('')
  const [changeEmailSuccess, setChangeEmailSuccess] = useState('')
  const [changeEmailLoading, setChangeEmailLoading] = useState(false)



  // â”€â”€ Notification / Privacy state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const [emailNotifications, setEmailNotifications] = useState(true)

  const [pushNotifications, setPushNotifications] = useState(true)

  // const [profileVisibility, setProfileVisibility] = useState('public')

  const handleChangeEmail = async () => {
    setChangeEmailError('')
    setChangeEmailSuccess('')
    if (!newEmail || !changePassword) return setChangeEmailError('Please provide both email and password')
    try {
      setChangeEmailLoading(true)
      // Use the existing profile update API to change email.
      // IMPORTANT: do NOT send the password field here — the backend's PATCH /user/me
      // endpoint stores password improperly if sent. We only submit the new email.
      await apiClient.completeProfile({ email: newEmail })
      setChangeEmailSuccess('Email updated successfully')
      setEmail(newEmail)
      setShowChangeEmail(false)
      setNewEmail('')
      setChangePassword('')
    } catch (err: any) {
      const msg = err?.response?.data?.message || String(err)
      setChangeEmailError(msg)
    } finally {
      setChangeEmailLoading(false)
    }
  }



  useEffect(() => {

    setLoading(true)

    apiClient.getMyProfileinfo().then(res => {

      const d = res.data

      setProfile({

        full_name:    d.full_name    || '',

        profession:   d.profession   || '',

        company:      d.company      || '',

        location:     d.location     || '',

        phone_number: d.phone_number || '',

        short_bio:    d.short_bio || d.about || '',

      })

      setEmail(d.email || '')

      setProfileSkills(Array.isArray(d.skills) ? d.skills : parseMaybeJson(d.skills))

      setExperiences(parseMaybeJson(d.experience))

      setEducations(parseMaybeJson(d.education))

      if (d.profile_photo) setPhotoPreview(d.profile_photo)

      if (d.cover_image)   setCoverPreview(d.cover_image)

      setAccountType(d.account_type || ACCOUNT_TYPE.PROFESSIONAL)
      setBusinessInitial({
        account_type: d.account_type || ACCOUNT_TYPE.PROFESSIONAL,
        business_logo: d.business_logo || '',
        business_name: d.business_name || '',
        business_established_year: d.business_established_year || '',
        business_type: d.business_type || '',
        business_category: d.business_category || '',
        business_address: d.business_address || '',
        business_city: d.business_city || '',
        business_phone: d.business_phone || '',
        business_website: d.business_website || '',
        business_about: d.business_about || '',
        business_products_services: d.business_products_services || '',
        business_gallery: d.business_gallery || [],
      })
      if (d.account_type === ACCOUNT_TYPE.BUSINESS) setProfileSection('business')

    }).catch(() => setError('Failed to load profile'))

      .finally(() => setLoading(false))

  }, [])



  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0]; if (!file) return

    const err = validateImageFile(file); if (err) { alert(err); return }

    setProfilePhoto(file)

    const r = new FileReader(); r.onload = ev => setPhotoPreview(ev.target?.result as string); r.readAsDataURL(file)

  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0]; if (!file) return

    const err = validateImageFile(file); if (err) { alert(err); return }

    setCoverImage(file)

    const r = new FileReader(); r.onload = ev => setCoverPreview(ev.target?.result as string); r.readAsDataURL(file)

  }



  const handleSaveProfile = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const form = new FormData()
      if (profilePhoto) form.append('profile_photo', profilePhoto)
      if (coverImage)   form.append('cover_image', coverImage)
      Object.entries(profile).forEach(([k, v]) => { if (v) form.append(k, v) })
      form.append('skills', JSON.stringify(profileSkills))
      form.append('experience', JSON.stringify(experiences))
      form.append('education',  JSON.stringify(educations))

      await apiClient.updateProfile(form)
      setSuccess('Profile updated successfully!')
      setProfilePhoto(null); setCoverImage(null)
    } catch (err: any) {
      const raw = err?.response?.data?.message
      const text = Array.isArray(raw) ? raw.join('. ') : (raw || err?.message || 'Failed to update profile')
      setError(text)
    } finally { setSaving(false) }
  }



  const handleChangePassword = async () => {

    if (!newPassword)                         { setPwError('New password is required'); return }

    if (newPassword !== confirmPassword)       { setPwError('Passwords do not match'); return }

    if (newPassword.length < 8)               { setPwError('Password must be at least 8 characters'); return }

    setPwLoading(true); setPwError(''); setPwSuccess('')

    try {

      await apiClient.changePassword({ password: newPassword })

      setPwSuccess('Password changed successfully!')

      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')

    } catch (err: any) {

      setPwError(err?.message || 'Failed to change password')

    } finally { setPwLoading(false) }

  }



  const tabs = [

    { id: 'profile',       label: 'Profile Settings',   icon: User },

    { id: 'account',       label: 'Account & Security', icon: Lock },

    { id: 'notifications', label: 'Notifications',      icon: Bell },

    { id: 'privacy',       label: 'Privacy',            icon: Shield },

  ]



  const inputCls = 'w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all'
  const inputStyle = { backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8', color: '#212529' }



  return (

    <div className="p-3 sm:p-6 overflow-y-auto" style={{ backgroundColor: '#F8F9FA' }}>

      <div className="max-w-5xl mx-auto">

        <div className="mb-6">

          <h1 className="text-2xl sm:text-3xl font-semibold mb-2" style={{ color: '#212529' }}>Settings</h1>

          <p style={{ color: '#5F6368' }}>Manage your account settings and preferences</p>

        </div>



        <div className="grid md:grid-cols-4 gap-6">

          {/* Sidebar */}

          <div className="md:col-span-1">

            <div className="bg-white rounded-2xl shadow-sm border p-2" style={{ border: '1px solid #E8E8E8' }}>

              {tabs.map(tab => {

                const Icon = tab.icon

                return (

                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}

                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1"

                    style={{ backgroundColor: activeTab === tab.id ? '#E3F2FD' : 'transparent', color: activeTab === tab.id ? '#1976D2' : '#5F6368' }}

                    onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = '#F8F9FA' }}

                    onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'transparent' }}>

                    <Icon className="w-5 h-5" />

                    <span className="font-medium text-sm">{tab.label}</span>

                  </button>

                )

              })}

            </div>

          </div>



          {/* Content */}

          <div className="md:col-span-3">



            {/* â”€â”€ PROFILE TAB â”€â”€ */}

            {activeTab === 'profile' && (

              <div className="space-y-6">

                {loading && <div className="text-sm text-gray-500 bg-white rounded-xl p-4 border">Loading profile...</div>}

                {error   && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-4 border border-red-200">{error}</div>}

                {success && <div className="text-sm text-green-700 bg-green-50 rounded-xl p-4 border border-green-200">{success}</div>}

                <div className="bg-[#F1F3F4] rounded-full p-1 flex w-full max-w-md">
                  <button
                    type="button"
                    onClick={() => setProfileSection('basic')}
                    className="flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all"
                    style={{
                      backgroundColor: profileSection === 'basic' ? '#FFFFFF' : 'transparent',
                      color: profileSection === 'basic' ? '#212529' : '#5F6368',
                      boxShadow: profileSection === 'basic' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Personal Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileSection('business')}
                    className="flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all"
                    style={{
                      backgroundColor: profileSection === 'business' ? '#212529' : 'transparent',
                      color: profileSection === 'business' ? '#FFFFFF' : '#5F6368',
                    }}
                  >
                    Business Information
                  </button>
                </div>

                {accountType === ACCOUNT_TYPE.BUSINESS && profileSection === 'basic' && (
                  <p className="text-xs text-gray-500">This account is currently shown as a business profile. Open Business Information to update it or switch back.</p>
                )}

                {profileSection === 'business' ? (
                  <BusinessInformationForm
                    initial={businessInitial}
                    onSaved={(user) => {
                      const nextType = user?.account_type || ACCOUNT_TYPE.BUSINESS
                      setAccountType(nextType)
                      setBusinessInitial({
                        account_type: nextType,
                        business_logo: user?.business_logo || businessInitial.business_logo || '',
                        business_name: user?.business_name || '',
                        business_established_year: user?.business_established_year || '',
                        business_type: user?.business_type || '',
                        business_category: user?.business_category || '',
                        business_address: user?.business_address || '',
                        business_city: user?.business_city || '',
                        business_phone: user?.business_phone || '',
                        business_website: user?.business_website || '',
                        business_about: user?.business_about || '',
                        business_products_services: user?.business_products_services || '',
                        business_gallery: user?.business_gallery || [],
                      })
                      if (nextType === ACCOUNT_TYPE.PROFESSIONAL) setProfileSection('basic')
                    }}
                  />
                ) : (
                <>

                {/* Cover image */}

                <div className="bg-white rounded-2xl border p-6" style={{ border: '1px solid #E8E8E8' }}>

                  <h2 className="text-xl font-semibold mb-1" style={{ color: '#212529' }}>Cover Image</h2>

                  <p className="text-xs text-gray-400 mb-3">Recommended: 1584Ã—396px (16:5 ratio)</p>

                  <label className="block cursor-pointer">

                    <div className="w-full rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors flex items-center justify-center bg-gray-50"

                      style={{ aspectRatio: '16/5' }}>

                      {coverPreview

                        ? <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />

                        : <div className="flex flex-col items-center gap-2 text-gray-400 py-6">

                            <Upload className="w-8 h-8" />

                            <span className="text-sm">Click to upload cover image</span>

                          </div>

                      }

                    </div>

                    <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />

                  </label>

                  {coverImage && (

                    <button type="button" onClick={() => { setCoverImage(null); setCoverPreview(null) }}

                      className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1">

                      <X className="w-3 h-3" /> Remove

                    </button>

                  )}

                </div>



                {/* Profile photo */}

                <div className="bg-white rounded-2xl border p-6" style={{ border: '1px solid #E8E8E8' }}>

                  <h2 className="text-xl font-semibold mb-4" style={{ color: '#212529' }}>Profile Photo</h2>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">

                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">

                      {photoPreview

                        ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />

                        : <User className="w-10 h-10 text-gray-400" />

                      }

                    </div>

                    <div className="flex-1">

                      <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">

                        <Upload className="w-4 h-4 mr-2 text-gray-500" />

                        <span className="text-sm text-gray-600">Click to upload or drag and drop</span>

                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

                      </label>

                      {profilePhoto && (

                        <button type="button" onClick={() => { setProfilePhoto(null); setPhotoPreview(null) }}

                          className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1">

                          <X className="w-3 h-3" /> Remove

                        </button>

                      )}

                    </div>

                  </div>

                </div>



                {/* Basic info */}

                <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ border: '1px solid #E8E8E8' }}>

                  <h2 className="text-xl font-semibold" style={{ color: '#212529' }}>Personal Information</h2>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#212529' }}>Full Name</label>
                    <input type="text" value={profile.full_name}
                      onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Your full name" className={inputCls} style={inputStyle} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#212529' }}>Professional Title</label>
                    <input type="text" value={profile.profession}
                      onChange={e => setProfile(p => ({ ...p, profession: e.target.value }))}
                      placeholder="Ex: Senior Software Engineer" className={inputCls} style={inputStyle} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#212529' }}>Company</label>
                    <input type="text" value={profile.company}
                      onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                      placeholder="Ex: Google" className={inputCls} style={inputStyle} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#212529' }}>Location</label>
                    <input type="text" value={profile.location}
                      onChange={e => setProfile(p => ({ ...p, location: e.target.value }))}
                      placeholder="Ex: London, UK" className={inputCls} style={inputStyle} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#212529' }}>Phone Number</label>
                    <input type="tel" value={profile.phone_number}
                      onChange={e => setProfile(p => ({ ...p, phone_number: e.target.value }))}
                      placeholder="+1 234 567 8900" className={inputCls} style={inputStyle} />
                  </div>

                  <div>

                    <label className="block text-sm font-medium mb-2" style={{ color: '#212529' }}>Bio</label>

                    <textarea rows={4} value={profile.short_bio}

                      onChange={e => setProfile(p => ({ ...p, short_bio: e.target.value }))}

                      placeholder={profile.short_bio || 'Tell us about yourself...'}

                      className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"

                      style={{ backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8', color: '#212529' }}

                      onFocus={e => (e.currentTarget.style.outlineColor = '#1976D2')} />

                  </div>

                </div>



                {/* Skills */}

                <div className="bg-white rounded-2xl border p-6" style={{ border: '1px solid #E8E8E8' }}>

                  <h2 className="text-xl font-semibold mb-4" style={{ color: '#212529' }}>Skills</h2>

                  <SkillsInput skills={profileSkills} onChange={setProfileSkills} />

                </div>



                {/* Experience */}

                <div className="bg-white rounded-2xl border p-6" style={{ border: '1px solid #E8E8E8' }}>

                  <div className="flex items-center justify-between mb-4">

                    <h2 className="text-xl font-semibold" style={{ color: '#212529' }}>Experience</h2>

                    <button onClick={() => { setEditExpIndex(null); setExpModal(true) }}

                      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition">

                      <Plus className="w-4 h-4" /> Add more experience

                    </button>

                  </div>

                  {experiences.length === 0

                    ? <p className="text-sm text-gray-400">No experience added yet.</p>

                    : (

                      <div className="space-y-3">

                        {experiences.map((exp, i) => (

                          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">

                            <Briefcase className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />

                            <div className="flex-1 min-w-0">

                              <p className="text-sm font-semibold text-gray-800">{exp.title}</p>

                              <p className="text-xs text-gray-500">{exp.company}{exp.employment_type ? ` Â· ${exp.employment_type}` : ''}</p>

                              <p className="text-xs text-gray-400">

                                {exp.start_month} {exp.start_year} â€“ {exp.currently_working ? 'Present' : `${exp.end_month} ${exp.end_year}`}

                              </p>

                            </div>

                            <div className="flex gap-1 shrink-0">

                              <button onClick={() => { setEditExpIndex(i); setExpModal(true) }}

                                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition">

                                <Pencil className="w-3.5 h-3.5" />

                              </button>

                              <button onClick={() => setExperiences(prev => prev.filter((_, j) => j !== i))}

                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 transition">

                                <Trash2 className="w-3.5 h-3.5" />

                              </button>

                            </div>

                          </div>

                        ))}

                      </div>

                    )

                  }

                </div>



                {/* Education */}

                <div className="bg-white rounded-2xl border p-6" style={{ border: '1px solid #E8E8E8' }}>

                  <div className="flex items-center justify-between mb-4">

                    <h2 className="text-xl font-semibold" style={{ color: '#212529' }}>Education</h2>

                    <button onClick={() => { setEditEduIndex(null); setEduModal(true) }}

                      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition">

                      <Plus className="w-4 h-4" /> Add more education

                    </button>

                  </div>

                  {educations.length === 0

                    ? <p className="text-sm text-gray-400">No education added yet.</p>

                    : (

                      <div className="space-y-3">

                        {educations.map((edu, i) => (

                          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">

                            <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />

                            <div className="flex-1 min-w-0">

                              <p className="text-sm font-semibold text-gray-800">{edu.school}</p>

                              <p className="text-xs text-gray-500">{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</p>

                              <p className="text-xs text-gray-400">

                                {edu.start_month} {edu.start_year}{edu.end_year ? ` â€“ ${edu.end_month} ${edu.end_year}` : ''}

                              </p>

                            </div>

                            <div className="flex gap-1 shrink-0">

                              <button onClick={() => { setEditEduIndex(i); setEduModal(true) }}

                                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition">

                                <Pencil className="w-3.5 h-3.5" />

                              </button>

                              <button onClick={() => setEducations(prev => prev.filter((_, j) => j !== i))}

                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 transition">

                                <Trash2 className="w-3.5 h-3.5" />

                              </button>

                            </div>

                          </div>

                        ))}

                      </div>

                    )

                  }

                </div>



                {/* Save all */}

                <button onClick={handleSaveProfile} disabled={saving}

                  className="px-6 py-3 text-white rounded-lg transition-all font-medium"

                  style={{ backgroundColor: '#212529' }}

                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3D3D3D')}

                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}>

                  {saving ? 'Saving...' : 'Save All Changes'}

                </button>
                </>
                )}

              </div>

            )}



            {/* â”€â”€ ACCOUNT TAB â”€â”€ */}

            {activeTab === 'account' && (

              <div className="space-y-6">

                <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ border: '1px solid #E8E8E8' }}>

                  <h2 className="text-xl font-semibold mb-4" style={{ color: '#212529' }}>Account Security</h2>



                  {pwError   && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4 border border-red-200">{pwError}</div>}

                  {pwSuccess && <div className="text-sm text-green-700 bg-green-50 rounded-xl p-3 mb-4 border border-green-200">{pwSuccess}</div>}



                  <div className="space-y-4">

                    <div>

                      <label className="block text-sm font-medium mb-2" style={{ color: '#212529' }}>Email Address</label>

                      <input type="email" value={email} readOnly

                        className="w-full px-4 py-3 rounded-lg cursor-not-allowed"

                        style={{ backgroundColor: '#F0F0F0', border: '1px solid #E8E8E8', color: '#5F6368' }} />

                      <p className="text-xs text-gray-400 mt-1">Use the button below to change your admin email safely.</p>

                      <div className="mt-3">
                        <button onClick={() => setShowChangeEmail(true)} className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">Change Email</button>
                      </div>

                      {showChangeEmail && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                          <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold mb-3">Change Email</h3>
                            <p className="text-sm text-gray-600 mb-4">Enter your new email and current password to confirm.</p>
                            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email" className="w-full px-3 py-2 border rounded mb-3" />
                            <PasswordInput label="Current password" value={changePassword} onChange={e => setChangePassword(e.target.value)} />
                            <div className="flex justify-end gap-2 mt-4">
                              <button onClick={() => { setShowChangeEmail(false); setNewEmail(''); setChangePassword('') }} className="px-4 py-2 rounded-lg border">Cancel</button>
                              <button onClick={handleChangeEmail} disabled={changeEmailLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{changeEmailLoading ? 'Updating...' : 'Update'}</button>
                            </div>
                            {changeEmailError && <p className="text-sm text-red-600 mt-3">{changeEmailError}</p>}
                            {changeEmailSuccess && <p className="text-sm text-green-700 mt-3">{changeEmailSuccess}</p>}
                          </div>
                        </div>
                      )}

                    </div>



                    <hr style={{ borderColor: '#E8E8E8' }} />

                    <p className="text-sm font-semibold" style={{ color: '#212529' }}>Change Password</p>



                    <div>
                      <PasswordInput
                        label="Current Password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-4 py-3"
                        style={{ backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8', color: '#212529' }}
                      />
                    </div>

                    <div>
                      <PasswordInput
                        label="New Password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 8 characters)"
                        className="w-full px-4 py-3"
                        style={{ backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8', color: '#212529' }}
                      />
                    </div>

                    <div>
                      <PasswordInput
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-4 py-3"
                        style={{ backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8', color: '#212529' }}
                      />
                    </div>



                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>

                     {/*write acode saying we are continuously improving security features and will have 2FA soon, but for now we recommend using a strong password and keeping it safe. */ }

                      <p className="text-sm" style={{ color: '#5F6368' }}>We are continuously improving our security features and will have Two-Factor Authentication (2FA) available soon. For now, we recommend using a strong password and keeping it safe.</p>
                      {/* <div className="flex items-center gap-3">

                        <Smartphone className="w-5 h-5" style={{ color: '#5F6368' }} />

                        <div>

                          <p className="font-medium" style={{ color: '#212529' }}>Two-Factor Authentication</p>

                          <p className="text-sm" style={{ color: '#5F6368' }}>Add an extra layer of security</p>

                        </div>

                      </div>

                      <button onClick={() => setTwoFactorAuth(!twoFactorAuth)}

                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"

                        style={{ backgroundColor: twoFactorAuth ? '#1976D2' : '#BDBDBD' }}>

                        <span className="inline-block h-4 w-4 rounded-full bg-white transition-transform"

                          style={{ transform: twoFactorAuth ? 'translateX(24px)' : 'translateX(4px)' }} />

                      </button> */}

                    </div>



                    <button onClick={handleChangePassword} disabled={pwLoading}

                      className="px-6 py-3 text-white rounded-lg transition-all font-medium"

                      style={{ backgroundColor: '#212529' }}

                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3D3D3D')}

                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}>

                      {pwLoading ? 'Updating...' : 'Update Password'}

                    </button>

                  </div>

                </div>

              </div>

            )}



      

            {/* ── NOTIFICATIONS TAB ── */}

            {activeTab === 'notifications' && (
              <NotificationsTab
                emailNotifications={emailNotifications}
                setEmailNotifications={setEmailNotifications}
              />
            )}

       {/* â”€â”€ NOTIFICATIONS TAB â”€â”€ */}

            {activeTab === 'notifications' && (

              <div className="space-y-6">

                <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ border: '1px solid #E8E8E8' }}>

                  <h2 className="text-xl font-semibold mb-4" style={{ color: '#212529' }}>Notification Preferences</h2>

                  <div className="space-y-4">

                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>

                      <div className="flex items-center gap-3">

                        <Mail className="w-5 h-5" style={{ color: '#5F6368' }} />

                        <div>

                          <p className="font-medium" style={{ color: '#212529' }}>Email Notifications</p>

                          <p className="text-sm" style={{ color: '#5F6368' }}>Receive notifications via email</p>

                        </div>

                      </div>

                      <button onClick={() => setEmailNotifications(!emailNotifications)}

                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"

                        style={{ backgroundColor: emailNotifications ? '#1976D2' : '#BDBDBD' }}>

                        <span className="inline-block h-4 w-4 rounded-full bg-white transition-transform"

                          style={{ transform: emailNotifications ? 'translateX(24px)' : 'translateX(4px)' }} />

                      </button>

                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>

                      <div className="flex items-center gap-3">

                        <Bell className="w-5 h-5" style={{ color: '#5F6368' }} />

                        <div>

                          <p className="font-medium" style={{ color: '#212529' }}>Push Notifications</p>

                          <p className="text-sm" style={{ color: '#5F6368' }}>Receive push notifications on your device</p>

                        </div>

                      </div>

                      <button onClick={() => setPushNotifications(!pushNotifications)}

                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"

                        style={{ backgroundColor: pushNotifications ? '#1976D2' : '#BDBDBD' }}>

                        <span className="inline-block h-4 w-4 rounded-full bg-white transition-transform"

                          style={{ transform: pushNotifications ? 'translateX(24px)' : 'translateX(4px)' }} />

                      </button>

                    </div>

                    {/* write a code saying that we are continuously improving notification features and will have more options soon, but for now you can toggle email and push notifications. */}

                    <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 border border-gray-200">
                      We are continuously improving our notification features and will have more options soon. For now, you can toggle email and push notifications.
                    </div>
                    {/* <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>

                      <p className="font-medium mb-3" style={{ color: '#212529' }}>Email me about:</p>

                      <div className="space-y-2">

                        {['New connections','Post likes and comments','Messages','Group activity','Weekly summary'].map(item => (

                          <label key={item} className="flex items-center gap-2 cursor-pointer">

                            <input type="checkbox" defaultChecked className="w-4 h-4 rounded" style={{ accentColor: '#1976D2' }} />

                            <span className="text-sm" style={{ color: '#212529' }}>{item}</span>

                          </label>

                        ))}

                      </div>

                    </div> */}

                    <button className="px-6 py-3 text-white rounded-lg transition-all"

                      style={{ backgroundColor: '#212529' }}

                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3D3D3D')}

                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}>

                      Save Preferences

                    </button>

                  </div>

                </div>

              </div>

            )}



            {/* â”€â”€ PRIVACY TAB â”€â”€ */}

            {activeTab === 'privacy' && (

              <div className="space-y-6">

                <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ border: '1px solid #E8E8E8' }}>

                  <h2 className="text-xl font-semibold mb-4" style={{ color: '#212529' }}>Privacy Settings</h2>

                  <div className="space-y-4">
                    {/* write a code saying that feature is coming soon */}
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 border border-gray-200">
                      Privacy settings will be available soon. Stay tuned!
                    </div>
                    </div>
                  {/* <div className="space-y-4">

                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>

                      <div className="flex items-center gap-3 mb-3">

                        <Eye className="w-5 h-5" style={{ color: '#5F6368' }} />

                        <p className="font-medium" style={{ color: '#212529' }}>Profile Visibility</p>

                      </div>

                      <div className="space-y-2">

                        {[

                          { value: 'public',      label: 'Public - Anyone can see your profile' },

                          { value: 'connections', label: 'Connections Only - Only your connections can see your full profile' },

                          { value: 'private',     label: 'Private - Only you can see your profile' },

                        ].map(option => (

                          <label key={option.value} className="flex items-center gap-2 cursor-pointer">

                            <input type="radio" name="visibility" value={option.value}

                              checked={profileVisibility === option.value}

                              onChange={e => setProfileVisibility(e.target.value)}

                              className="w-4 h-4" style={{ accentColor: '#1976D2' }} />

                            <span className="text-sm" style={{ color: '#212529' }}>{option.label}</span>

                          </label>

                        ))}

                      </div>

                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>

                      <div className="flex items-center gap-3 mb-3">

                        <Globe className="w-5 h-5" style={{ color: '#5F6368' }} />

                        <p className="font-medium" style={{ color: '#212529' }}>Who can see your:</p>

                      </div>

                      <div className="space-y-3">

                        {['Connections list','Email address','Phone number','Posts and activity'].map(item => (

                          <div key={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

                            <span className="text-sm" style={{ color: '#212529' }}>{item}</span>

                            <select className="px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2"

                              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8', color: '#212529' }}

                              onFocus={e => (e.currentTarget.style.outlineColor = '#1976D2')}>

                              <option>Everyone</option>

                              <option>Connections</option>

                              <option>Only me</option>

                            </select>

                          </div>

                        ))}

                      </div>

                    </div>

                    <button className="px-6 py-3 text-white rounded-lg transition-all"

                      style={{ backgroundColor: '#212529' }}

                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3D3D3D')}

                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}>

                      Save Privacy Settings

                    </button>

                  </div> */}

                </div>

              </div>

            )}



          </div>

        </div>

      </div>



      {/* Experience modal */}

      {expModal && (

        <ExperienceModal

          initial={editExpIndex !== null ? experiences[editExpIndex] : EMPTY_EXP}

          onSave={entry => {

            setExperiences(prev => editExpIndex !== null

              ? prev.map((e, i) => i === editExpIndex ? entry : e)

              : [...prev, entry])

            setExpModal(false); setEditExpIndex(null)

          }}

          onClose={() => { setExpModal(false); setEditExpIndex(null) }}

        />

      )}



      {/* Education modal */}

      {eduModal && (

        <EducationModal

          initial={editEduIndex !== null ? educations[editEduIndex] : EMPTY_EDU}

          onSave={entry => {

            setEducations(prev => editEduIndex !== null

              ? prev.map((e, i) => i === editEduIndex ? entry : e)

              : [...prev, entry])

            setEduModal(false); setEditEduIndex(null)

          }}

          onClose={() => { setEduModal(false); setEditEduIndex(null) }}

        />

      )}

    </div>

  )

}

