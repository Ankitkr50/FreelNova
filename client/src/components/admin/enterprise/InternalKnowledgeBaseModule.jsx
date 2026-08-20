import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

const CATEGORIES = [
  "Support SOP",
  "Refund Policy",
  "Escrow Policy",
  "Dispute Handling",
  "Security Procedures",
  "Payment Procedures",
  "Account Management",
  "Moderation Guidelines",
  "Employee Guidelines",
];

export default function InternalKnowledgeBaseModule() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [activeArticle, setActiveArticle] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Article Form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Support SOP");
  const [content, setContent] = useState("");

  const { data: kbRes, isLoading } = useQuery({
    queryKey: ["knowledgeArticles", selectedCategory, search],
    queryFn: async () => {
      const res = await enterpriseApi.listKnowledgeArticles({
        category: selectedCategory,
        search,
      });
      return res.data?.data;
    },
  });

  const createArticleMutation = useMutation({
    mutationFn: (payload) => enterpriseApi.createKnowledgeArticle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["knowledgeArticles"]);
      setShowCreateModal(false);
      setTitle("");
      setContent("");
    },
  });

  const articles = kbRes?.articles || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Module 7 — Staff Standard Operating Procedures
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Internal Knowledge Base</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search internal SOPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition"
          >
            + Create SOP Article
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            selectedCategory === "all"
              ? "bg-purple-600 text-white"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
          }`}
        >
          All SOP Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedCategory === cat
                ? "bg-purple-600 text-white"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Grid / Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Loading Internal SOPs...</div>
          ) : articles.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No SOP articles found. Click "+ Create SOP Article" to add one.
            </div>
          ) : (
            articles.map((art) => (
              <div
                key={art.id}
                onClick={() => setActiveArticle(art)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  activeArticle?.id === art.id
                    ? "border-purple-600 bg-purple-100/90 dark:bg-purple-950 dark:border-purple-500 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-purple-800 dark:text-purple-300">{art.articleId}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200">
                    {art.category}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{art.title}</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mt-1">{art.content}</p>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Version {art.version}</span>
                  <span>{new Date(art.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Article Viewer Pane */}
        <div className="lg:col-span-2">
          {!activeArticle ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Select an SOP article from the list to view full internal documentation.
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">{activeArticle.articleId}</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{activeArticle.title}</h3>
                </div>
                <div className="text-xs text-slate-400 text-right">
                  <div>Category: {activeArticle.category}</div>
                  <div>v{activeArticle.version}</div>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {activeArticle.content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create SOP Document</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Article Title</label>
                <input
                  type="text"
                  placeholder="e.g. Escrow Dispute Handling Procedure v2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Content / SOP Instructions</label>
                <textarea
                  placeholder="Detail step-by-step internal operational procedures..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={!title || !content || createArticleMutation.isLoading}
                onClick={() =>
                  createArticleMutation.mutate({
                    title,
                    category,
                    content,
                  })
                }
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                Publish SOP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
