import { useState } from "react";
import SectionCard from "./SectionCard.jsx";

// Standard preset gradients for fallback mockup images
const GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-500 to-teal-700",
  "from-purple-600 to-pink-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-red-600",
];

function PortfolioItemsSection({ portfolioItems = [], editable = false, onChange }) {
  const [isAdding, setIsAdding] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    price: "",
    link: "",
    imageUrl: "",
  });

  const handleAdd = () => {
    if (!newItem.title.trim() || !newItem.description.trim()) {
      alert("Title and Description are required.");
      return;
    }

    const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    const updated = [
      ...portfolioItems,
      {
        ...newItem,
        id: "port_" + Date.now(),
        gradient: randomGradient,
      },
    ];
    onChange("portfolioItems", updated);
    setNewItem({ title: "", description: "", price: "", link: "", imageUrl: "" });
    setSaveSuccessMsg(`🎉 Work "${newItem.title}" saved successfully!`);
    setIsAdding(false); // Close form after saving so it doesn't stay open below saved cards
    setTimeout(() => setSaveSuccessMsg(""), 3500);
  };

  const handleRemove = (id) => {
    const updated = portfolioItems.filter((item) => item.id !== id);
    onChange("portfolioItems", updated);
  };

  return (
    <SectionCard
      description="Showcase specific services, past works, and mini-contracts to attract clients."
      title="Works & Gigs Portfolio"
      action={
        editable && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 shadow-sm transition cursor-pointer border-0"
          >
            <span className="text-base font-black">+</span> Add Work / Gig
          </button>
        )
      }
    >
      {saveSuccessMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700 animate-fadeIn">
          {saveSuccessMsg}
        </div>
      )}

      {/* Grid of Saved Works + Plus Add Card */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {portfolioItems.map((item) => (
          <div
            key={item.id}
            className="group border border-slate-200 bg-white rounded-3xl overflow-hidden flex flex-col justify-between hover:shadow-lg hover:border-blue-200 transition duration-300"
          >
            <div>
              {/* Gig Card Image or Mock Gradient */}
              <div className="h-44 w-full relative overflow-hidden bg-slate-100 flex items-center justify-center">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${item.gradient || "from-blue-600 to-indigo-700"} flex items-center justify-center p-4`}>
                    <span className="text-sm font-black text-white text-center line-clamp-2">{item.title}</span>
                  </div>
                )}

                <span className="absolute left-3 bottom-3 text-[9px] font-extrabold uppercase tracking-widest bg-slate-900/60 border border-white/10 px-2.5 py-0.5 rounded-full text-white backdrop-blur-xs">
                  Service Gig
                </span>

                {editable && (
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute right-3 top-3 text-white bg-slate-900/80 hover:bg-rose-600 w-7 h-7 rounded-full flex items-center justify-center text-xs transition shadow-sm cursor-pointer border-0"
                    title="Remove work"
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider">
                  Starting from
                </span>
                <span className="text-sm font-black text-slate-800">
                  ₹{Number(item.price || 0).toLocaleString()}
                </span>
              </div>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                >
                  View Project →
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Plus (+) Add New Work Card inside Grid */}
        {editable && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-3xl p-6 min-h-[220px] flex flex-col items-center justify-center text-center gap-3 transition-all duration-200 cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-full bg-blue-100 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center text-xl font-black transition-colors">
              +
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 block">Add New Work / Gig</span>
              <span className="text-xs text-slate-400 font-medium">Click to add another project or service</span>
            </div>
          </button>
        )}
      </div>

      {portfolioItems.length === 0 && !isAdding && (
        <p className="text-sm text-slate-500 italic mt-2">No custom services or portfolio works added yet. Click the + button above to add your first work.</p>
      )}

      {/* Form Card (Only rendered when isAdding is true) */}
      {editable && isAdding && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 max-w-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">+</span>
                Add Portfolio Work / Gig
              </h4>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Work / Service Title</label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                placeholder="I will design saas startup website..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your design tools, features delivered, or dev stacks..."
                rows="3"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Project Photo / Screenshot Link (Google Drive / Direct URL)</label>
              <input
                type="url"
                value={newItem.imageUrl}
                onChange={(e) => setNewItem(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="e.g. https://drive.google.com/..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
              />
            </div>

            {newItem.imageUrl && newItem.imageUrl.startsWith("http") && (
              <div className="rounded-2xl overflow-hidden border border-slate-250 h-28 w-48 relative group animate-fadeIn">
                <img src={newItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewItem(prev => ({ ...prev, imageUrl: "" }))}
                  className="absolute right-2 top-2 text-white bg-slate-900/80 hover:bg-rose-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md transition duration-150 border-0 cursor-pointer"
                  title="Clear Image"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Demo / Reference Link</label>
                <input
                  type="url"
                  value={newItem.link}
                  onChange={(e) => setNewItem(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="e.g. https://github.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 px-4 py-2 transition cursor-pointer border-0"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white px-5 py-2.5 shadow-md transition cursor-pointer border-0"
                type="button"
              >
                Save Work
              </button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default PortfolioItemsSection;
