import React, { useState } from "react";
import { growthApi } from "../../api/growth.api";

export default function CommunityHubModule({ postsData, onRefresh }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [creating, setCreating] = useState(false);

  const posts = postsData?.posts || [];

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    setCreating(true);
    try {
      await growthApi.createCommunityPost({ title, content, category });
      setTitle("");
      setContent("");
      setShowCreateModal(false);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const categories = ["all", "General", "Showcase", "Advice", "Tech", "QA"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="rounded-full bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 text-[10px] font-extrabold uppercase">
            📣 FreelNova Community
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">Knowledge Sharing & Showcase Hub</h2>
          <p className="text-xs text-slate-500 mt-1">
            Share tutorials, showcase deliverables, ask technical questions, and learn from fellow specialists.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0"
        >
          + Create Post
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeCategory === cat
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {cat === "all" ? "All Posts" : cat}
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">No community posts yet. Be the first to share!</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 hover:bg-white transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-150">
                  {post.category}
                </span>
                <span className="text-[10px] text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{post.title}</h4>
              <p className="text-xs text-slate-600 line-clamp-3">{post.content}</p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500 font-semibold">
                <span>By <strong className="text-slate-800">{post.author?.name || "Community Member"}</strong></span>
                <div className="flex items-center gap-3">
                  <span>💬 {post._count?.comments || 0} Comments</span>
                  <span>👍 {post.likesCount || 0} Likes</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Community Post</h3>
            <form onSubmit={handleCreatePost} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none"
                >
                  <option value="General">General</option>
                  <option value="Showcase">Showcase</option>
                  <option value="Advice">Advice</option>
                  <option value="Tech">Tech</option>
                  <option value="QA">QA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Content</label>
                <textarea
                  rows="4"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share details, snippets, or tutorials..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold"
                >
                  {creating ? "Posting..." : "Publish Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
