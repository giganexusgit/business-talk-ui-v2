export function ProfileTabs({
  activeTab,
  setActiveTab,
  isOwnProfile,
  showCompany,
}: {
  activeTab: string
  setActiveTab: (tab: any) => void
  isOwnProfile?: boolean
  showCompany?: boolean
}) {
  const tabs: { key: string; label: string }[] = [
    { key: 'about', label: 'About' },
    { key: 'experience', label: 'Experience' },
    { key: 'education', label: 'Education' },
  ]
  if (isOwnProfile) {
    tabs.push({ key: 'gallery', label: 'Gallery' })
  }
  if (showCompany) {
    tabs.push({ key: 'company', label: 'Business' })
  }

  return (
    <div className="flex gap-4 sm:gap-6 border-b px-4 sm:px-6 bg-white rounded-xl overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`pb-3 whitespace-nowrap text-sm sm:text-base shrink-0 transition-colors ${
            activeTab === tab.key
              ? 'border-b-2 border-black text-black font-semibold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}