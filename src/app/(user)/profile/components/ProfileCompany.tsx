'use client'

import { useState } from 'react'
import {
  Building2,
  Globe,
  MapPin,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  X,
  Tag,
} from 'lucide-react'
import BioText from '@/components/common/BioText'

export function ProfileCompany({ profile }: { profile: any }) {
  const [activeImage, setActiveImage] = useState<string | null>(null)

  const companyName = profile?.business_name || profile?.company || 'Company'
  const companyLogo = profile?.business_logo
  const businessType = profile?.business_type
  const businessCategory = profile?.business_category
  const establishedYear = profile?.business_established_year
  const address = profile?.business_address
  const city = profile?.business_city || profile?.location
  const phone = profile?.business_phone || profile?.phone_number
  const website = profile?.business_website
  const about = profile?.business_about || profile?.about || profile?.short_bio
  const productsServices = profile?.business_products_services
  const gallery: string[] = Array.isArray(profile?.business_gallery) ? profile.business_gallery : []

  return (
    <div className="space-y-6">
      {/* Main Company Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{companyName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {businessType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  <Layers className="w-3 h-3" />
                  {businessType}
                </span>
              )}
              {businessCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                  <Tag className="w-3 h-3" />
                  {businessCategory}
                </span>
              )}
              {establishedYear && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                  <Calendar className="w-3 h-3" />
                  Est. {establishedYear}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Meta Quick Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-sm text-gray-600">
          {(address || city) && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">
                {[address, city].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <a href={`tel:${phone}`} className="hover:text-blue-600 truncate transition-colors">
                {phone}
              </a>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 truncate"
              >
                {website.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* About Company */}
      {about && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-700" />
            About Company
          </h3>
          <BioText content={about} fallback="No company description provided." />
        </div>
      )}

      {/* Products & Services */}
      {productsServices && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Products & Services
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {productsServices}
          </p>
        </div>
      )}

      {/* Company Gallery */}
      {gallery.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Company Gallery</span>
            <span className="text-xs font-normal text-gray-400">{gallery.length} photos</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setActiveImage(url)}
                className="group relative h-32 rounded-xl overflow-hidden cursor-pointer border border-gray-100 bg-gray-50 hover:opacity-95 transition-all shadow-sm hover:shadow"
              >
                <img
                  src={url}
                  alt={`Company gallery ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Lightbox Modal */}
      {activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
