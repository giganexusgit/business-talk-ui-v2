import BioText from '@/components/common/BioText'

export function ProfileAbout({ profile }: any) {
  const bioContent = profile?.about || profile?.short_bio || profile?.bio
  const products = profile?.business_products_services
  const gallery: string[] = Array.isArray(profile?.business_gallery) ? profile.business_gallery : []
  const website = profile?.business_website
  const address = profile?.business_address

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border">
        <h2 className="text-xl font-semibold mb-4">{profile?.isBusiness ? 'About Business' : 'About'}</h2>
        <BioText content={bioContent} fallback="No bio available" />
        {(website || address || profile?.business_established_year) && (
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            {profile?.business_established_year && (
              <p>Established {profile.business_established_year}</p>
            )}
            {address && <p>{address}</p>}
            {website && (
              <a href={website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                {website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        )}
      </div>

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
