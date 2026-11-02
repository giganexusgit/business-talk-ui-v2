import BioText from '@/components/common/BioText'

export function ProfileAbout({ profile }: any) {
  const isBusiness = Boolean(profile?.isBusiness)
  const bioContent = (profile?.about || profile?.short_bio || profile?.bio)?.trim()
  const products = isBusiness ? profile?.business_products_services?.trim() : undefined
  const gallery: string[] = isBusiness && Array.isArray(profile?.business_gallery) ? profile.business_gallery : []
  const website = isBusiness ? profile?.business_website?.trim() : undefined
  const address = isBusiness ? (profile?.business_address || profile?.location)?.trim() : undefined
  const establishedYear = isBusiness ? profile?.business_established_year : undefined

  const hasAboutDetails = Boolean(bioContent || website || address || establishedYear)
  const hasSkills = Array.isArray(profile?.skills) && profile.skills.length > 0

  if (!hasAboutDetails && !products && gallery.length === 0 && !hasSkills) {
    return (
      <div className="bg-white p-6 rounded-2xl border text-sm text-gray-400">
        No additional profile information provided.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasAboutDetails && (
        <div className="bg-white p-6 rounded-2xl border">
          <h2 className="text-xl font-semibold mb-4">{isBusiness ? 'About Business' : 'About'}</h2>
          {bioContent ? (
            <BioText content={bioContent} showEmptyFallback={false} />
          ) : (
            <BioText content="" fallback="No bio available" />
          )}
          {isBusiness && (website || address || establishedYear) && (
            <div className={`${bioContent ? 'mt-4' : ''} space-y-1 text-sm text-gray-600`}>
              {establishedYear && (
                <p>Established {establishedYear}</p>
              )}
              {address && <p>{address}</p>}
              {website && (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline break-all inline-block"
                >
                  {website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {hasSkills && (
        <div className="bg-white p-6 rounded-2xl border">
          <h2 className="text-xl font-semibold mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill: string) => (
              <span
                key={skill}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {isBusiness && products && (
        <div className="bg-white p-6 rounded-2xl border">
          <h2 className="text-xl font-semibold mb-3">Products / Services</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{products}</p>
        </div>
      )}

      {isBusiness && gallery.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border">
          <h2 className="text-xl font-semibold mb-4">Business Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.map((url) => (
              <img key={url} src={url} alt="Business gallery" className="w-full h-28 object-cover rounded-xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
