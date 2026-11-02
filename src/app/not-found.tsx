import Link from 'next/link'
import { Home, HelpCircle, BookOpen } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200/90 shadow-sm p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-800">
          404
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
          The page you are looking for might have been removed, renamed, or is temporarily unavailable.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home Feed</span>
          </Link>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              href="/questions"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Explore Q&A</span>
            </Link>
            <Link
              href="/blogs"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read Blogs</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
