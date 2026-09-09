import React from 'react';
import Link from 'next/link';
import { profileHref } from '@/lib/profile-link'
import ExpandableText from '@/components/common/ExpandableText'
import { HashtagList } from '@/lib/hashtag'

interface BlogCardProps {
  blog: {
    id: string | number;
    title: string;
    content: string;
    author?: {
      id?: string | number;
      name?: string;
      avatar?: string;
      title?: string;
    };
    created_at?: string;
    image?: string;
    tags?: string[] | { name?: string }[] | string | null;
  };
}

const BlogCard: React.FC<BlogCardProps> = ({ blog }) => {
  return (
    <article className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-300">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {blog.image && (
          <Link href={`/blogs/${blog.id}`} className="shrink-0 overflow-hidden rounded-xl border border-gray-100 sm:w-48 sm:h-36 block">
            <img
              src={blog.image}
              alt={blog.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        )}

        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            <Link href={`/blogs/${blog.id}`} className="block group-hover:text-blue-600 transition-colors">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-snug line-clamp-2">
                {blog.title}
              </h3>
            </Link>

            {blog.content && (
              <div className="mt-2.5">
                <ExpandableText className="text-sm leading-relaxed text-gray-600" lines={3}>
                  {blog.content}
                </ExpandableText>
              </div>
            )}

            {/* Hashtags displayed AFTER content preview */}
            <div className="mt-3">
              <HashtagList tags={blog.tags} badgeStyle maxDisplay={4} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              {blog.author && (
                <Link
                  href={blog.author?.id ? profileHref(blog.author.id, blog.author.name) : '#'}
                  className="flex items-center gap-2 group/author shrink-0"
                >
                  <img
                    src={blog.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(blog.author?.name || 'User')}`}
                    alt={blog.author?.name || 'Author'}
                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                  />
                  <span className="font-semibold text-xs text-gray-800 group-hover/author:underline">
                    {blog.author?.name || 'Anonymous'}
                  </span>
                </Link>
              )}
              {blog.created_at && <span className="text-gray-300">•</span>}
              {blog.created_at && (
                <span className="text-xs text-gray-500 font-medium">
                  {new Date(blog.created_at).toLocaleDateString()}
                </span>
              )}
            </div>

            <Link
              href={`/blogs/${blog.id}`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Read Article →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
