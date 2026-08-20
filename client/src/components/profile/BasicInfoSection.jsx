import SectionCard from "./SectionCard.jsx";

function BasicInfoSection({ values, editable = false, onChange, errors = {}, isUsernameSet = false, onSetUsername }) {
  return (
    <SectionCard description="Your identity and contact details." title="Basic Info">
      {editable ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fullName">
              Full Name
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
              id="fullName"
              onChange={(event) => onChange("fullName", event.target.value)}
              type="text"
              value={values.fullName}
            />
            {errors.fullName ? <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="username">
              Username {isUsernameSet ? "(Cannot be changed)" : "(Set once)"}
            </label>
            <div className="flex gap-2">
              <input
                className={`flex-1 rounded-md border px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2 ${
                  isUsernameSet ? "bg-slate-100 cursor-not-allowed border-slate-200" : "border-slate-300"
                }`}
                id="username"
                disabled={isUsernameSet}
                onChange={(event) => onChange("username", event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30))}
                type="text"
                value={values.username || ""}
              />
              {!isUsernameSet && (
                <button
                  type="button"
                  onClick={onSetUsername}
                  className="rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer"
                >
                  Set Username
                </button>
              )}
            </div>
            {errors.username ? <p className="mt-1 text-xs text-rose-600">{errors.username}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
              id="email"
              onChange={(event) => onChange("email", event.target.value)}
              type="email"
              value={values.email}
            />
            {errors.email ? <p className="mt-1 text-xs text-rose-600">{errors.email}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="headline">
              Headline
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
              id="headline"
              onChange={(event) => onChange("headline", event.target.value)}
              placeholder="Frontend Developer | React | Node.js"
              type="text"
              value={values.headline}
            />
            {errors.headline ? <p className="mt-1 text-xs text-rose-600">{errors.headline}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="location">
              Location
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
              id="location"
              onChange={(event) => onChange("location", event.target.value)}
              placeholder="Delhi, India"
              type="text"
              value={values.location}
            />
            {errors.location ? <p className="mt-1 text-xs text-rose-600">{errors.location}</p> : null}
          </div>
        </div>
      ) : (
        <dl className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Full Name</dt>
            <dd className="font-semibold text-slate-900">{values.fullName}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Username</dt>
            <dd className="font-bold text-blue-600">@{values.username || values.fullName?.toLowerCase().replace(/\s+/g, "") || "user"}</dd>
          </div>
          {(values.adminRole || values.role === "admin") && (
            <div>
              <dt className="font-medium text-slate-500">Staff Admin Designation</dt>
              <dd className="font-extrabold text-rose-700">
                {values.customRoleTitle ||
                  (values.adminRole === "CUSTOM"
                    ? "Main Admin"
                    : {
                        SUPER_ADMIN: "Super Administrator (Full Access)",
                        FINANCE_ADMIN: "Finance & Escrow Administrator",
                        SUPPORT_STAFF: "Customer Support & Disputes Specialist",
                        MODERATOR: "Content & Project Moderator",
                        DEVELOPER: "Platform Engineer / Developer",
                        CUSTOM: "Main Admin",
                      }[values.adminRole || "SUPER_ADMIN"] || "Platform Administrator")
                }
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-slate-500">Headline</dt>
            <dd>{values.headline || "FreelNova Platform Specialist"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Location</dt>
            <dd>{values.location || "Not specified"}</dd>
          </div>
        </dl>
      )}
    </SectionCard>
  );
}

export default BasicInfoSection;

