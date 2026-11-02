'use client'

import { UserSidebar } from '@/components/shared/UserSidebar'
import { UserNavbar } from '@/components/shared/UserNavbar'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { profileHref } from '@/lib/profile-link'
import apiClient from '@/lib/api-client'
import { MergedMobileSidebarContent } from '@/components/shared/MergedMobileSidebarContent'
import { useAppSelector } from '@/hooks/useRedux'
import { useRequireAuth } from '@/hooks/useRequireAuth'

interface UserLayoutWrapperProps {
  children: React.ReactNode
}

export const UserLayoutWrapper = ({ children }: UserLayoutWrapperProps) => {
  const requireAuth = useRequireAuth()
  type Person = any
  type Story = any
  type Question = any
  type Group = any

  const [people, setPeople] = useState<Person[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  // Use Redux isRestricted state as the single source of truth for ban routing
  const isRestricted = useAppSelector((state: any) => state.auth.isRestricted)

  // Route guard: redirect restricted users immediately
  useEffect(() => {
    if (isRestricted) {
      router.replace('/account-restricted')
    }
  }, [isRestricted, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isGuest =
          typeof window !== 'undefined' &&
          !localStorage.getItem('user')

        let peopleData: any[] = []
        let groupsData: any[] = []

        const requests = [
          apiClient.getStories(),
          apiClient.getTrendingPosts(),
        ]

        if (!isGuest) {
          requests.unshift(
            apiClient.getFollowSuggestions(),
            apiClient.getGroupSuggestions(10)
          )
        }

        const results = await Promise.all(requests)

        let storiesRes: any
        let hotRes: any

        if (isGuest) {
          ;[storiesRes, hotRes] = results
        } else {
          const [peopleRes, groupsRes] = results

          peopleData = peopleRes.data || []
          groupsData = groupsRes.data || []

          storiesRes = results[2]
          hotRes = results[3]
        }

        setPeople(peopleData)
        setGroups(groupsData)

        const sortedStories = (storiesRes.data || []).sort(
          (a: any, b: any) =>
            new Date(b.created_on).getTime() -
            new Date(a.created_on).getTime()
        )

        setStories(sortedStories.slice(0, 5))

        const trendingPosts = hotRes.data || []

                let questionPosts = trendingPosts
          .filter(
            (p: any) =>
              (p.post_type || p.type)?.toUpperCase() ===
              'QUESTION'
          )
          .sort(
            (a: any, b: any) =>
              (b.trendingScore || b.hot_score || 0) -
              (a.trendingScore || a.hot_score || 0) ||
              Number(b.created_on || 0) - Number(a.created_on || 0)
          )

        if (questionPosts.length === 0) {
          try {
            const allRes = await apiClient.getAllPosts(1, 10);
            const allData = allRes.data?.data || allRes.data || [];
            questionPosts = allData
              .filter((p: any) => (p.post_type || p.type)?.toUpperCase() === 'QUESTION')
              .sort((a: any, b: any) => Number(b.created_on || 0) - Number(a.created_on || 0));
          } catch {}
        }

        setQuestions(questionPosts.slice(0, 5))
      } catch (err) {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    const handleRefresh = () => {
      fetchData()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('post-created', handleRefresh)
      window.addEventListener('question-created', handleRefresh)
      window.addEventListener('story-created', handleRefresh)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('post-created', handleRefresh)
        window.removeEventListener('question-created', handleRefresh)
        window.removeEventListener('story-created', handleRefresh)
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#f5f6f7]">
      {/* Navbar for mobile */}
      <div className="lg:hidden">
        <UserNavbar>
          <MergedMobileSidebarContent
            people={people}
            stories={stories}
            questions={questions}
            groups={groups}
            loading={loading}
            onProfileClick={(person: any) => router.push(profileHref(person.id, person.full_name))}
            onFollow={async (id: string) => {
              if (!requireAuth()) return
              try {
                await apiClient.followUserById(id)
                setPeople((prev) => prev.filter((p) => p.id !== id))
              } catch {}
            }}
            onSeeAllPeople={() => router.push('/people')}
            onSeeAllGroups={() => router.push('/groups')}
          />
        </UserNavbar>
      </div>
      {/* Sidebar for desktop */}
      <div className="hidden lg:block">
        <UserSidebar />
      </div>
      {/* Main Content */}
      <main className="lg:ml-64 p-1 pt-16 lg:pt-1">
        <div className="w-full max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
