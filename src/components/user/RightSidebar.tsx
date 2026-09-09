'use client'

import { TrendingUp, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useContentViewerContext } from '@/providers/ContentViewerProvider'
import { useState, useEffect } from 'react'
import { profileHref } from '@/lib/profile-link'
import apiClient from '@/lib/api-client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useFollow } from '@/hooks/useFollow'
import RichTextContent from '../common/RichTextContent'

interface SuggestedGroup {
  id: string
  name: string
  description: string
  image: string
  members: number
  visibility: 'PUBLIC' | 'PRIVATE'
  requiresApproval: boolean
  category: string
  joined: boolean
  hasPendingRequest: boolean
}

const getTimeAgo = (timestamp: string | number) => {
  const now = Date.now()
  const time = Number(timestamp)
  const diff = now - time

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  if (weeks < 4) return `${weeks}w`
  if (months < 12) return `${months}mo`
  return `${years}y`
} 

// --- UI COMPONENTS ---
export function TrendingItem({
  item,
  type,
  onClick,
}: {
  item: any
  type: 'questions' | 'stories'
  onClick: (item: any) => void
}) {
  const timeAgo = getTimeAgo(item.created_on)

  const displayText =
    type === 'stories'
      ? item.title || item.storyTitle
      : item.content || item.title

  return (
    <button
      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 active:scale-95 fade-in-card"
      style={{ color: '#212529' }}
      onClick={() => onClick(item)}
    >
      <RichTextContent className="text-sm font-semibold text-black line-clamp-2 mb-1" html={displayText} />
      <p className="text-xs text-gray-500">
        {type === 'questions' && (
          <>{item.commentsCount || item.comment_count || 0} Answers</>
        )}
        {type === 'stories' && (
          <>{timeAgo} ago</>
        )}
      </p>
    </button>
  );
}

export function UserCard({
  person,
  onProfileClick,
}: {
  person: any
  onProfileClick: (person: any) => void
}) {
  const {
    state: followState,
    loading: followLoading,
    follow,
    unfollow,
    acceptConnection,
    cancelConnection,
  } = useFollow(String(person.id || ''))

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (followLoading) return

    if (followState === 'connect') {
      await follow()
    } else if (followState === 'pending') {
      await cancelConnection()
    } else if (followState === 'incoming') {
      await acceptConnection()
    } else if (followState === 'connected') {
      await unfollow()
    }
  }

  const label =
    followLoading ? 'Loading...' :
    followState === 'connected' ? 'Connected' :
    followState === 'pending' ? 'Requested' :
    followState === 'incoming' ? 'Accept' :
    'Connect'

  return (
    <div className="flex items-center gap-3 fade-in-card">
      <img
        src={person.profile_photo || 'https://ui-avatars.com/api/name=' + encodeURIComponent(person.full_name || person.username)}
        alt={person.full_name || person.username}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer"
        onClick={() => onProfileClick(person)}
      />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onProfileClick(person)}>
        <h3 className="font-medium text-sm truncate" style={{ color: '#212529' }}>
          {person.full_name || person.username}
        </h3>
        <p className="text-xs text-gray-500 truncate">{person.profession || person.title || 'User'}</p>
      </div>
      <button
        disabled={followLoading}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex-shrink-0 border active:scale-95 cursor-pointer disabled:opacity-60 ${
          followState === 'connected'
            ? 'bg-[#212529] text-white border-[#212529] hover:bg-[#3D3D3D]'
            : followState === 'pending'
            ? 'bg-amber-50 text-amber-700 border-amber-400 hover:bg-red-50 hover:text-red-700 hover:border-red-500'
            : followState === 'incoming'
            ? 'bg-green-50 text-green-700 border-green-600 hover:bg-green-100'
            : 'bg-transparent text-[#212529] border-[#212529] hover:bg-gray-100'
        }`}
        onClick={handleAction}
      >
        {label}
      </button>
    </div>
  );
}

export function GroupCard({
  group,
  onClick,
  joinState,
  onJoinClick,
}: {
  group: any
  onClick: (group: any) => void
  joinState: 'join' | 'requested' | 'joined'
  onJoinClick: (group: any) => void
}) {
  const getMembersLabel = (members: unknown) => {
    if (typeof members === 'number') {
      if (members >= 1000) {
        const value = Math.floor(members / 100) / 10
        return `${value}k`
      }
      return `${members}`
    }

    if (typeof members === 'string') {
      const trimmed = members.trim()
      if (!trimmed) return '0'
      if (trimmed.toLowerCase().includes('k')) {
        return `${trimmed.split(/k/i)[0]}k`
      }
      return trimmed
    }

    return '0'
  }

  const membersLabel = getMembersLabel(group?.members)

  return (
    <div
      className="rounded-xl overflow-hidden transition-all hover:shadow-md fade-in-card cursor-pointer"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8' }}
      onClick={() => onClick(group)}
    >
      {/* Group Cover Image */}
      <div
        className="h-20 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${group.image})`, backgroundColor: '#F8F9FA' }}
      >
        {/* Category Badge on Cover */}
        <div
          className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', color: '#212529' }}
        >
          {group.category}
        </div>
      </div>
      {/* Group Content */}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2" style={{ color: '#212529' }}>
          {group.name}
        </h3>
        <p className="text-xs mb-3" style={{ color: '#5F6368' }}>
          {group.description}
        </p>
        {/* Member Avatars - Overlapping Style */}
        {group.memberAvatars && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {group.memberAvatars.map((avatar: string, idx: number) => (
                  <img
                    key={idx}
                    src={avatar}
                    alt={`Member ${idx + 1}`}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-white flex-shrink-0"
                  />
                ))}
              </div>
              <span className="ml-2 text-xs font-medium" style={{ color: '#5F6368' }}>
                +{membersLabel}
              </span>
            </div>
          </div>
        )}
        {/* Join Button */}
        <button
          disabled={joinState === 'requested'}
          className={`w-full py-2 text-xs font-semibold rounded-lg border transition-all duration-200 active:scale-95 ${joinState === 'requested' ? 'cursor-not-allowed opacity-70' : ''}`}
          style={{
            backgroundColor: 'transparent',
            color: joinState === 'joined' ? '#DC2626' : joinState === 'requested' ? '#5F6368' : '#212529',
            borderColor: joinState === 'joined' ? '#DC2626' : joinState === 'requested' ? '#9CA3AF' : '#212529',
          }}
          onClick={e => {
            e.stopPropagation();
            onJoinClick(group);
          }}
          onMouseEnter={e => {
            if (joinState === 'joined') {
              e.currentTarget.style.backgroundColor = '#DC2626';
              e.currentTarget.style.color = '#FFFFFF';
            } else if (joinState === 'join') {
              e.currentTarget.style.backgroundColor = '#212529';
              e.currentTarget.style.color = '#FFFFFF';
            }
          }}
          onMouseLeave={e => {
            if (joinState === 'joined') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#DC2626';
            } else if (joinState === 'join') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#212529';
            }
          }}
        >
          {joinState === 'join' && ((group.requiresApproval || group.visibility === 'PRIVATE') ? 'Request to Join' : 'Join Group')}
          {joinState === 'requested' && 'Requested'}
          {joinState === 'joined' && 'Leave Group'}
        </button>
      </div>
    </div>
  );
}

export function RightSidebar() {
  const router = useRouter();
  const { open } = useContentViewerContext();
  const [people, setPeople] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [groups, setGroups] = useState<SuggestedGroup[]>([]);
  const [joinStates, setJoinStates] = useState<{ [id: string]: 'join' | 'requested' | 'joined' }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const requireAuth = useRequireAuth()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [peopleRes, groupsRes, storiesRes, hotRes] = await Promise.all([
          apiClient.getFollowSuggestions(),
          apiClient.getGroupSuggestions(5),
          apiClient.getTrendingStories(),
          apiClient.getTrendingPosts(),
        ]);
        setPeople((peopleRes.data || []).slice(0, 5));

        const formattedGroups: SuggestedGroup[] = (groupsRes.data || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          image: g.cover_image || '/placeholder.jpg',
          members: g.memberCount || 0,
          visibility: 'PUBLIC',
          requiresApproval: Boolean(g.requiresApproval),
          category: 'General',
          joined: false,
          hasPendingRequest: Boolean(g.hasPendingRequest),
        }));

        setGroups(formattedGroups.slice(0, 5));
        const sortedStories = (storiesRes.data || []).sort(
          (a: any, b: any) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime()
        );
        setStories(sortedStories.slice(0, 5));
        const hotPosts = hotRes.data || [];
        const questionPosts = hotPosts
          .filter((p: any) => (p.post_type || p.type)?.toUpperCase() === 'QUESTION')
          .sort((a: any, b: any) => (b.hot_score || 0) - (a.hot_score || 0));
        setQuestions(questionPosts.slice(0, 5));
        setJoinStates(
          formattedGroups.reduce((acc: any, g: SuggestedGroup) => {
            acc[g.id] = g.hasPendingRequest ? 'requested' : 'join';
            return acc;
          }, {})
        );
      } catch (err) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- HANDLERS ---
  const handleTrendingClick = (type: 'questions' | 'stories') => (item: any) => {
    // if (!requireAuth()) return
    if (!item) return

    // Normalize item shape so UniversalContentViewer gets full expected fields
    const normalizeStory = (s: any) => ({
      id: s.id || s._id || s.story_id || s.blog_id,
      author: {
        name: s.user?.full_name || s.author_name || s.author?.name || s.by || 'Unknown',
        title: s.user?.profession || s.author?.title || s.author?.role || '',
        avatar: s.user?.profile_photo || s.author?.avatar || s.cover_image || '',
      },
      authorId: String(s.user?.id || s.user?.user_id || s.authorId || s.author_id || s.author?.id || ''),
      storyTitle: s.title || s.storyTitle || s.name || '',
      excerpt: s.excerpt || s.summary || s.description || s.content?.slice?.(0, 200) || '',
      content: s.content || s.body || '',
      coverImage: s.cover_image || s.image || s.coverImage || null,
      timestamp: s.created_on || s.timestamp || s.published_at || Date.now(),
      likes: Number(s.likes || s.likes_count || s.upvotes || 0),
      liked: Boolean(s.liked || s.myVote === 'up'),
      comments: Number(s.comments_count || s.comment_count || s.comments || 0),
      views: Number(s.views || s.view_count || 0),
    })

    const normalizeQuestion = (q: any) => ({
      id: q.id || q._id || q.post_id,
      author: {
        name: q.user?.full_name || q.author_name || q.author?.name || 'Unknown',
        title: q.user?.profession || q.author?.title || '',
        avatar: q.user?.profile_photo || q.author?.avatar || '',
      },
      authorId: String(q.user?.id || q.user?.user_id || q.authorId || q.author_id || ''),
      question: q.question || q.title || q.content || '',
      content: q.content || q.description || '',
      description: q.description || q.content || '',
      tags: q.tags || q.post_tags || [],
      timestamp: q.created_on || q.timestamp || Date.now(),
      likes: Number(q.upvotes || q.likes || 0),
      liked: Boolean(q.liked || q.myVote === 'up'),
      views: Number(q.views || q.view_count || 0),
    })

    if (isMobile) {
      router.push(`/${type}/${item.id}`)
      return
    }

    if (type === 'stories') {
      open(type, normalizeStory(item))
      return
    }

    if (type === 'questions') {
      open(type, normalizeQuestion(item))
      return
    }
  }

  const handleProfileClick = (person: any) => {
    if (!requireAuth()) return
    router.push(profileHref(person.id, person.name));
  };

  const handleGroupClick = (group: any) => {
    if (!requireAuth()) return
    router.push(`/groups/${group.id}`);
  };

  const handleJoinClick = async (group: any) => {
    if (!requireAuth()) return
    const current = joinStates[group.id] || 'join';
    try {
      if (current === 'requested') {
        // no cancel endpoint
        return;
      } else if (group.requiresApproval) {
        await apiClient.requestToJoinGroup(group.id);
        setJoinStates(prev => ({ ...prev, [group.id]: 'requested' }));
        setGroups(prev => prev.map(item =>
          item.id === group.id ? { ...item, joined: false, hasPendingRequest: true } : item
        ));
      } else {
        await apiClient.joinGroup(group.id);
        setGroups(prev => prev.filter(item => item.id !== group.id));
        setJoinStates(prev => {
          const next = { ...prev };
          delete next[group.id];
          return next;
        });
      }
    } catch (err) {
      console.error('Group join/leave error', err);
    }
  };

  // --- ANIMATION CSS ---
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .fade-in-card {
        opacity: 0;
        transform: translateY(16px);
        animation: fadeInCard 0.5s cubic-bezier(.4,0,.2,1) forwards;
      }
      @keyframes fadeInCard {
        to {
          opacity: 1;
          transform: none;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) return <div className="p-6">Loading SideBar...</div>

  return (
    <aside className="w-80 shrink-0 bg-white overflow-y-auto rounded-2xl shadow-sm border border-gray-200/80 sticky top-6 self-start max-h-[calc(100vh-3rem)]">
      <div className="p-6 space-y-6">
        {/* Trending Header */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: '#212529' }} />
            <h2 className="font-semibold" style={{ color: '#212529' }}>Trending</h2>
          </div>
          {/* Questions */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#212529' }}>Questions</h3>
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600 mb-2">Looks like the questions in the application are not that interesting yet.</span>
                <span className="text-xs text-gray-500 mb-3">Publish your own question and see if your content comes up here!</span>
                <button
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#212529] text-white hover:bg-[#3D3D3D] transition-all duration-200"
                  onClick={() => router.push('/?tab=qa&compose=1')}
                >
                  Ask a Question
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map(item => (
                  <TrendingItem key={item.id} item={item} type="questions" onClick={handleTrendingClick('questions')} />
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Divider */}
        <div className="border-t border-gray-200"></div>
        {/* Trending Stories */}
        <div>
          <h2 className="font-semibold mb-4" style={{ color: '#212529' }}>Stories</h2>
          {stories.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600 mb-2">Looks like the stories in the application are not that interesting yet.</span>
              <span className="text-xs text-gray-500 mb-3">Publish your own story and see if your content comes up here!</span>
              <button
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#212529] text-white hover:bg-[#3D3D3D] transition-all duration-200"
                onClick={() => router.push('/?tab=stories&compose=1')}
              >
                Share a Story
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {stories.map(item => (
                <TrendingItem key={item.id} item={item} type="stories" onClick={handleTrendingClick('stories')} />
              ))}
            </div>
          )}
        </div>
        {/* Divider */}
        <div className="border-t border-gray-200"></div>
        {/* Suggested People */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: '#212529' }}>Suggested for You</h2>
            <button
              className="text-xs font-medium transition-colors"
              style={{ color: '#1A73E8' }}
              onClick={() => router.push('/people')}
            >
              See all
            </button>
          </div>
          <div className="space-y-4">
            {people.map(person => (
              <UserCard
                key={person.id}
                person={person}
                onProfileClick={handleProfileClick}
              />
            ))}
          </div>
        </div>
        {/* Divider */}
        <div className="border-t" style={{ borderColor: '#E8E8E8' }}></div>
        {/* Suggested Groups - Proper Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: '#212529' }} />
              <h2 className="font-semibold" style={{ color: '#212529' }}>Groups for You</h2>
            </div>
            <button 
              className="text-xs font-medium transition-colors"
              style={{ color: '#1A73E8' }}
              tabIndex={-1}
              onClick={() => router.push('/groups')}
            >
              See all
            </button>
          </div>
          <div className="space-y-4">
            {groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                onClick={handleGroupClick}
                joinState={joinStates[group.id] || 'join'}
                onJoinClick={handleJoinClick}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}