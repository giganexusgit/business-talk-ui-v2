import BioText from '@/components/common/BioText'

export function ProfileAbout({ profile }: any) {
  const bioContent = profile?.about || profile?.short_bio || profile?.bio

  return (
    <div className="bg-white p-6 rounded-2xl border">
      <h2 className="text-xl font-semibold mb-4">About</h2>
      <BioText content={bioContent} fallback="No bio available" />
    </div>
  )
}