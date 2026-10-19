import { Link } from "react-router";
import { Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-6xl font-bold text-gray-300">404</p>
        <h1 className="mb-3 text-2xl font-semibold text-gray-900">页面未找到</h1>
        <p className="mb-6 text-gray-600">您访问的页面不存在或已被移动。</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-6 py-3 font-medium text-white transition-colors hover:bg-sky-800"
        >
          <Home className="h-5 w-5" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
