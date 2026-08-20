import { useEffect, useState } from "react";
import ProfileNavLinks from "../components/profile/ProfileNavLinks.jsx";
import { useResumeQuery, useUploadResumeMutation } from "../hooks/useResume.js";
import { useAuth } from "../hooks/useAuth.js";

const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isPdf(file) {
  return file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");
}

function ResumeUpload() {
  const { user } = useAuth();
  const { data: existingResume, isLoading } = useResumeQuery();
  const uploadMutation = useUploadResumeMutation();

  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSelectFile = (event) => {
    const file = event.target.files?.[0];
    setStatus({ type: "", text: "" });
    setError("");
    setProgress(0);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const cleanUsername = user?.username?.trim().toLowerCase();
    if (!cleanUsername) {
      setError("Username not found on profile. Please complete your profile first.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    const expectedName = `${cleanUsername}_resume`;
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    if (nameWithoutExt.toLowerCase() !== expectedName) {
      setError(`Invalid file name! The selected file must be named exactly: ${expectedName}.pdf`);
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (!isPdf(file)) {
      setSelectedFile(null);
      setError("Only PDF files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setSelectedFile(null);
      setError(`File size must be less than ${MAX_SIZE_MB} MB.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = (event) => {
    event.preventDefault();
    setError("");
    setStatus({ type: "", text: "" });

    if (!selectedFile) {
      setError("Please select a valid PDF file first.");
      return;
    }

    setProgress(0);
    setStatus({ type: "loading", text: "Uploading resume..." });

    uploadMutation.mutate(
      {
        file: selectedFile,
        username: user?.username || "user",
        onProgress: (value) => setProgress(value),
      },
      {
        onSuccess: (response) => {
          const message = response?.data?.message || "Resume uploaded successfully.";
          const localPreview = URL.createObjectURL(selectedFile);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(localPreview);
          setStatus({ type: "success", text: message });
          setSelectedFile(null);
          setProgress(100);
        },
        onError: (uploadError) => {
          const message = uploadError?.response?.data?.message || "Failed to upload resume. Please try again.";
          setStatus({ type: "error", text: message });
        },
      },
    );
  };

  const uploadedResume = uploadMutation.data?.data?.resume || existingResume;
  const canUpload = selectedFile && !uploadMutation.isPending;

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] p-6 shadow-md md:p-8 text-white">
        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-50">
          Resume
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Resume Upload</h1>
        <p className="mt-2 text-blue-100/90 text-sm">Upload your latest CV in PDF format for clients to review.</p>
      </div>

      <ProfileNavLinks />

      <form className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleUpload}>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="resumeFile">
          Resume (PDF, max {MAX_SIZE_MB} MB)
        </label>

        <input
          accept=".pdf,application/pdf"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm text-slate-700"
          disabled={uploadMutation.isPending}
          id="resumeFile"
          onChange={handleSelectFile}
          type="file"
        />

        {user?.username && (
          <p className="mt-1 text-xs text-rose-600 font-bold tracking-wide block">
            * Name file as: <span className="font-mono bg-rose-50 border border-rose-200 px-1 py-0.5 rounded text-rose-700 font-bold">{user.username.toLowerCase()}_resume.pdf</span> before upload
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {selectedFile ? `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})` : "No file selected yet."}
        </div>

        {uploadMutation.isPending || progress > 0 ? (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-[#2563eb] transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-600">Upload progress: {progress}%</p>
          </div>
        ) : null}

        <button
          className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] mt-4 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canUpload}
          type="submit"
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload Resume"}
        </button>
      </form>

      {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {status.text ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : status.type === "success"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          {status.text}
        </p>
      ) : null}

      {isLoading ? <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">Loading uploaded resume...</p> : null}

      {uploadedResume ? (
        <section className="mt-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Uploaded CV</h2>
          <dl className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">File Name</dt>
              <dd>{uploadedResume.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Size</dt>
              <dd>{formatFileSize(uploadedResume.size)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Uploaded At</dt>
              <dd>{new Date(uploadedResume.uploadedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Type</dt>
              <dd>{uploadedResume.mimeType || "application/pdf"}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href={previewUrl || uploadedResume.resumeUrl}
              rel="noreferrer"
              target="_blank"
            >
              Preview CV
            </a>
            <a
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] px-3 py-2 text-sm"
              download
              href={previewUrl || uploadedResume.resumeUrl}
            >
              Download CV
            </a>
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default ResumeUpload;


