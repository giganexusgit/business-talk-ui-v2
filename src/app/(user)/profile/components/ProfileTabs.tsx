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
  const tabs: string[] = ['about', 'experience', 'education']
  if (isOwnProfile) {
    tabs.push('gallery')
  }
  if (showCompany) {
    tabs.push('company')
  }

  return (
    <div className="flex gap-4 sm:gap-6 border-b px-4 sm:px-6 bg-white rounded-xl overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`pb-3 capitalize whitespace-nowrap text-sm sm:text-base shrink-0 transition-colors ${
            activeTab === tab
              ? 'border-b-2 border-black text-black font-semibold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}