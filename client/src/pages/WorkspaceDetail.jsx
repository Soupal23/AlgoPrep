import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Layers,
  ArrowLeft,
  UploadCloud,
  FileText,
  FileCheck2,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Compass,
  FileCode,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const WorkspaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [materialKind, setMaterialKind] = useState('notes');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeJobs, setActiveJobs] = useState({}); // jobId -> { progress, stage, status }

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Roadmap Generation Modal State
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  const [roadmapSettings, setRoadmapSettings] = useState({
    days: 7,
    hoursPerDay: 2,
    level: 'intermediate'
  });
  const [roadmapJobId, setRoadmapJobId] = useState(null);
  const [roadmapJobProgress, setRoadmapJobProgress] = useState(null);
  const [roadmapError, setRoadmapError] = useState('');

  const fileInputRef = useRef(null);

  // 1. Fetch Workspace & Materials
  const {
    data: workspaceData,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['workspace', id],
    queryFn: async () => {
      const res = await api.getWorkspaceById(id);
      return res.workspace;
    }
  });

  const workspace = workspaceData;

  // 1.1 Fetch Active Roadmap if exists
  const {
    data: existingRoadmap,
    refetch: refetchRoadmap
  } = useQuery({
    queryKey: ['roadmap', id],
    queryFn: async () => {
      try {
        const res = await api.getRoadmap(id);
        return res.roadmap;
      } catch (e) {
        return null;
      }
    },
    retry: false
  });

  // 2. Material Deletion Mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId) => api.deleteMaterial(id, materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', id] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    }
  });

  // 3. Handle File Selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validExtensions = ['.pdf', '.docx', '.pptx', '.txt', '.md'];
    const invalidFiles = files.filter(f => {
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
      return !validExtensions.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setUploadError(`Unsupported file format. Please upload PDF, DOCX, PPTX, TXT, or MD.`);
      return;
    }

    const oversizedFiles = files.filter(f => f.size > 25 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setUploadError(`Files cannot exceed 25MB each.`);
      return;
    }

    setUploadError('');
    setSelectedFiles(files);
  };

  // 4. Handle Material Upload & Job SSE Streaming
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('kind', materialKind);

      const res = await api.uploadMaterials(id, formData);

      // Reset file input
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Initialize job progress tracking
      if (res.jobs && res.jobs.length > 0) {
        const newJobs = { ...activeJobs };
        res.jobs.forEach(job => {
          newJobs[job._id] = {
            progress: job.progress || 5,
            stage: job.stage || 'Ingesting document',
            status: 'running'
          };
          subscribeToJobStream(job._id);
        });
        setActiveJobs(newJobs);
      }

      queryClient.invalidateQueries({ queryKey: ['workspace', id] });
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // 5. SSE Progress Stream for Job
  const subscribeToJobStream = async (jobId) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    let sseUrl;
    try {
      const ticketRes = await api.getJobStreamTicket(jobId);
      sseUrl = `${apiBase}/jobs/${jobId}/stream?ticket=${encodeURIComponent(ticketRes.ticket)}`;
    } catch {
      const token = localStorage.getItem('algoprep_access_token');
      sseUrl = `${apiBase}/jobs/${jobId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        setActiveJobs((prev) => ({
          ...prev,
          [jobId]: {
            progress: payload.progress ?? 50,
            stage: payload.stage ?? 'Processing',
            status: payload.status ?? 'running'
          }
        }));

        if (payload.status === 'completed' || payload.status === 'failed') {
          eventSource.close();
          queryClient.invalidateQueries({ queryKey: ['workspace', id] });
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });

          // Clear completed job after 5 seconds
          setTimeout(() => {
            setActiveJobs((prev) => {
              const copy = { ...prev };
              delete copy[jobId];
              return copy;
            });
          }, 5000);
        }
      } catch (err) {
        // Ignored SSE parse error
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  // 5.1 SSE Stream for Roadmap Generation
  const subscribeToRoadmapJobStream = (jobId) => {
    const token = localStorage.getItem('algoprep_access_token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const sseUrl = `${apiBase}/jobs/${jobId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setRoadmapJobProgress(payload);

        if (payload.status === 'completed') {
          eventSource.close();
          refetchRoadmap();
          setTimeout(() => {
            setIsRoadmapModalOpen(false);
            navigate(`/workspaces/${id}/roadmap`);
          }, 1200);
        } else if (payload.status === 'failed') {
          eventSource.close();
          setRoadmapError(payload.error || 'Roadmap generation failed. Please try again.');
        }
      } catch (err) {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  const handleGenerateRoadmap = async (e) => {
    e.preventDefault();
    setRoadmapError('');

    try {
      const res = await api.generateRoadmap(id, roadmapSettings);
      if (res.jobId) {
        setRoadmapJobId(res.jobId);
        subscribeToRoadmapJobStream(res.jobId);
      }
    } catch (err) {
      setRoadmapError(err.message || 'Failed to trigger roadmap generation');
    }
  };

  // 6. Handle Semantic Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await api.searchWorkspace(id, searchQuery.trim(), 4);
      setSearchResults(res.results || []);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Loading workspace materials...</p>
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link to="/workspaces" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Workspaces
        </Link>
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-800 text-rose-300 text-sm">
          Failed to load workspace. It may not exist or you might not have access.
        </div>
      </div>
    );
  }

  const materials = workspace.materials || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#9f99b0]">
        <Link to="/workspaces" className="hover:text-white transition-colors">
          Workspaces
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white truncate max-w-xs">{workspace.title}</span>
      </div>

      {/* Workspace Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#14111f] border border-[#383050] space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-950/80 border border-indigo-800 text-indigo-300 uppercase tracking-wide">
                {workspace.subject}
              </span>
              {workspace.examDate && (
                <div className="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-950/60 border border-purple-800/80 px-2.5 py-1 rounded-xl">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Exam: {new Date(workspace.examDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f0eef5] tracking-tight">
              {workspace.title}
            </h1>

            {workspace.description && (
              <p className="text-sm text-[#9f99b0] max-w-2xl leading-relaxed">
                {workspace.description}
              </p>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {existingRoadmap ? (
              <Link
                to={`/workspaces/${id}/roadmap`}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>View Study Roadmap</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => setIsRoadmapModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Generate Study Roadmap</span>
              </button>
            )}
          </div>
        </div>

        {/* Workspace Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#251e35] text-xs">
          <div className="p-3 rounded-xl bg-[#1c1729]/60 border border-[#383050]">
            <span className="text-[#9f99b0] block">Documents</span>
            <span className="text-lg font-extrabold text-white">{materials.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#1c1729]/60 border border-[#383050]">
            <span className="text-[#9f99b0] block">Knowledge Chunks</span>
            <span className="text-lg font-extrabold text-indigo-400">{workspace.chunkCount || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#1c1729]/60 border border-[#383050]">
            <span className="text-[#9f99b0] block">Syllabus Uploaded</span>
            <span className="text-lg font-extrabold text-purple-400">
              {materials.some(m => m.kind === 'syllabus') ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#1c1729]/60 border border-[#383050]">
            <span className="text-[#9f99b0] block">RAG Ready</span>
            <span className="text-lg font-extrabold text-emerald-400">
              {workspace.chunkCount > 0 ? 'Active' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Jobs Progress Bar Banner */}
      {Object.keys(activeJobs).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Ingesting Materials in Real-Time</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(activeJobs).map(([jobId, job]) => (
              <div
                key={jobId}
                className="p-4 rounded-2xl bg-[#14111f] border border-indigo-500/30 space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white truncate max-w-[70%]">
                    {job.stage || 'Processing document...'}
                  </span>
                  <span className="font-mono font-bold text-indigo-400">
                    {job.progress}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1c1729] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Upload Dropzone + Materials List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form (Left Column, 1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-3xl bg-[#14111f] border border-[#383050] space-y-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <UploadCloud className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Upload Material</h2>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                  Document Type
                </label>
                <select
                  value={materialKind}
                  onChange={(e) => setMaterialKind(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="syllabus">Syllabus / Curriculum (Recommended First)</option>
                  <option value="notes">Lecture Notes / Summary</option>
                  <option value="slides">Presentation Slides (.pptx)</option>
                  <option value="book">Textbook / Reference Material</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              {/* Dropzone Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#383050] hover:border-indigo-500/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#1c1729]/40 hover:bg-[#1c1729]/80 space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-800 flex items-center justify-center mx-auto text-indigo-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Click to browse or drop files
                  </p>
                  <p className="text-[11px] text-[#9f99b0] mt-0.5">
                    PDF, DOCX, PPTX, TXT, MD up to 25MB
                  </p>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#9f99b0]">
                    Selected ({selectedFiles.length}):
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                    {selectedFiles.map((f, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1c1729] border border-[#383050] text-slate-300 truncate"
                      >
                        {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading & Queuing...</span>
                  </>
                ) : (
                  <span>Upload & Ingest Chunks</span>
                )}
              </button>
            </form>
          </div>

          {/* Semantic Search Inspector (RAG Testing) */}
          <div className="p-6 rounded-3xl bg-[#14111f] border border-[#383050] space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">RAG Search Test</h2>
                <p className="text-[11px] text-[#9f99b0]">
                  Query indexed material chunks
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask or search your notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#1c1729] border border-[#383050] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </form>

            {searchResults && (
              <div className="space-y-2 pt-2 border-t border-[#251e35] max-h-60 overflow-y-auto">
                <span className="text-[10px] font-mono font-bold uppercase text-[#9f99b0]">
                  Top {searchResults.length} Match(es):
                </span>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-500">No relevant passages found.</p>
                ) : (
                  searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-purple-400 font-mono">
                        <span>
                          {result.location?.page
                            ? `Page ${result.location.page}`
                            : result.location?.slide
                            ? `Slide ${result.location.slide}`
                            : 'Excerpt'}
                        </span>
                        {result.score > 0 && (
                          <span>Score: {(result.score * 100).toFixed(0)}%</span>
                        )}
                      </div>
                      <p className="text-slate-300 line-clamp-3 leading-snug">
                        {result.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Materials Table (Right Column, 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span>Workspace Materials ({materials.length})</span>
            </h2>
          </div>

          {materials.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#14111f] border border-[#383050] text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#1c1729] border border-[#383050] flex items-center justify-center mx-auto text-[#9f99b0]">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No materials uploaded yet</h3>
              <p className="text-xs text-[#9f99b0] max-w-sm mx-auto">
                Upload your course syllabus, lecture slides, or revision notes on the left. The ingestion engine will automatically extract pages and generate vector embeddings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((m) => (
                <div
                  key={m._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#14111f] border border-[#383050] hover:border-[#483d66] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate max-w-xs">
                          {m.fileName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-[#1c1729] border border-[#383050] text-slate-300">
                          {m.kind}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#9f99b0]">
                        <span>{(m.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                        {m.pageCount > 0 && <span>• {m.pageCount} pages</span>}
                        {m.chunkCount > 0 && (
                          <span className="text-purple-400 font-semibold">
                            • {m.chunkCount} chunks
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {/* Status Badge */}
                    {m.status === 'ready' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : m.status === 'processing' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/60 border border-indigo-800 text-indigo-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                      </span>
                    ) : m.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950/60 border border-rose-800 text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-400">
                        Pending
                      </span>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${m.fileName}" and all associated embeddings?`)) {
                          deleteMaterialMutation.mutate(m._id);
                        }
                      }}
                      title="Delete Material"
                      className="p-2 rounded-xl text-[#9f99b0] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Roadmap Setup Modal */}
      {isRoadmapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#14111f] border border-[#383050] p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#251e35] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Compass className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Generate Study Roadmap</h2>
              </div>
              <button
                onClick={() => setIsRoadmapModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {roadmapError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {roadmapError}
              </div>
            )}

            {roadmapJobId ? (
              <div className="space-y-4 py-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {roadmapJobProgress?.stage || 'Analyzing syllabus & curriculum materials...'}
                  </h3>
                  <p className="text-xs text-[#9f99b0] mt-1">
                    Extracting topics, resolving dependencies, and structuring schedule...
                  </p>
                </div>
                {roadmapJobProgress?.progress && (
                  <div className="w-full h-2 rounded-full bg-[#1c1729] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                      style={{ width: `${roadmapJobProgress.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleGenerateRoadmap} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                    Target Preparation Days
                  </label>
                  <select
                    value={roadmapSettings.days}
                    onChange={(e) => setRoadmapSettings({ ...roadmapSettings, days: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={5}>5 Days (Intensive Sprint)</option>
                    <option value={7}>7 Days (Standard Week)</option>
                    <option value={10}>10 Days (Comprehensive)</option>
                    <option value={14}>14 Days (Two-Week In-Depth)</option>
                    <option value={21}>21 Days (Semester Pace)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                    Daily Study Commitment
                  </label>
                  <select
                    value={roadmapSettings.hoursPerDay}
                    onChange={(e) => setRoadmapSettings({ ...roadmapSettings, hoursPerDay: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>1 hour / day</option>
                    <option value={2}>2 hours / day (Recommended)</option>
                    <option value={3}>3 hours / day</option>
                    <option value={4}>4+ hours / day (Immersion)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                    Target Rigor & Level
                  </label>
                  <select
                    value={roadmapSettings.level}
                    onChange={(e) => setRoadmapSettings({ ...roadmapSettings, level: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="beginner">Beginner (Foundational explanations & clear pacing)</option>
                    <option value="intermediate">Intermediate (Standard University / College Level)</option>
                    <option value="advanced">Advanced (Deep Theoretical Rigor & Problem-Solving)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRoadmapModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#1c1729] border border-[#383050] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-md"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Create Roadmap</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDetail;
