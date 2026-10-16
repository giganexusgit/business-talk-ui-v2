import BioText from '@/components/common/BioText'

export function ProfileAbout({ profile }: any) {
  const bioContent = (profile?.about || profile?.short_bio || profile?.bio)?.trim()
  const products = profile?.business_products_services?.trim()
  const gallery: string[] = Array.isArray(profile?.business_gallery) ? profile.business_gallery : []
  const website = profile?.business_website?.trim()
  const address = (profile?.business_address || profile?.location)?.trim()
  const establishedYear = profile?.business_established_year

  const hasAboutDetails = Boolean(bioContent || website || address || establishedYear)

  if (!hasAboutDetails && !products && gallery.length === 0) {
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
          <h2 className="text-xl font-semibold mb-4">{profile?.isBusiness ? 'About Business' : 'About'}</h2>
          {bioContent && (
            <BioText content={bioContent} showEmptyFallback={false} />
          )}
          {(website || address || establishedYear) && (
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

      {products && (
        <div className="bg-white p-6 rounded-2xl border">
          <h2 className="text-xl font-semibold mb-3">Products / Services</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{products}</p>
        </div>
      )}

      {gallery.length > 0 && (
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
