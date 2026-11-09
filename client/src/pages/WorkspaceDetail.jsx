import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { AITutorDrawer } from '../components/chat/AITutorDrawer';
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
  ChevronRight,
  TrendingUp,
  BarChart2,
  Target
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

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

  // 1.2 Fetch Workspace Concept Mastery (Phase 8)
  const {
    data: masteryData
  } = useQuery({
    queryKey: ['workspace-mastery', id],
    queryFn: async () => {
      try {
        const res = await api.getWorkspaceMastery(id);
        return res;
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
      queryClient.invalidateQueries({ queryKey: ['workspace', id] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setTimeout(() => {
        setActiveJobs((prev) => {
          const copy = { ...prev };
          delete copy[jobId];
          return copy;
        });
      }, 3000);
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
      refetchRoadmap();
      setTimeout(() => {
        setRoadmapJobProgress(null);
      }, 3000);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 space-y-3 font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
        <p className="text-xs">Loading workspace...</p>
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link to="/workspaces" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Workspaces
        </Link>
        <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-sm font-bold text-white">Workspace Not Found</h2>
        </div>
      </div>
    );
  }

  const materials = workspace.materials || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
        <Link to="/workspaces" className="hover:text-white transition-colors">
          Workspaces
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-white truncate max-w-xs">{workspace.title}</span>
      </div>

      {/* Workspace Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-[#27272a] space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 uppercase">
                {workspace.subject}
              </span>
              {workspace.examDate && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Exam: {new Date(workspace.examDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              {workspace.title}
            </h1>

            {workspace.description && (
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                {workspace.description}
              </p>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {existingRoadmap ? (
              <Link
                to={`/workspaces/${id}/roadmap`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer shadow-sm"
              >
                <Compass className="w-4 h-4" />
                <span>View Study Roadmap</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => setIsRoadmapModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer shadow-sm"
              >
                <Compass className="w-4 h-4" />
                <span>Generate Study Roadmap</span>
              </button>
            )}
          </div>
        </div>

        {/* Workspace Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#27272a] text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
            <span className="text-zinc-500 block text-[10px] uppercase">Documents</span>
            <span className="text-base font-bold text-white mt-0.5">{materials.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
            <span className="text-zinc-500 block text-[10px] uppercase">Knowledge Chunks</span>
            <span className="text-base font-bold text-white mt-0.5">{workspace.chunkCount || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
            <span className="text-zinc-500 block text-[10px] uppercase">Syllabus Uploaded</span>
            <span className="text-base font-bold text-white mt-0.5">
              {materials.some(m => m.kind === 'syllabus') ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
            <span className="text-zinc-500 block text-[10px] uppercase">RAG Engine</span>
            <span className="text-base font-bold text-white mt-0.5">
              {workspace.chunkCount > 0 ? 'Active' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Concept Mastery Overview (Phase 8) */}
      {masteryData?.concepts?.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white">Concept Mastery</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-zinc-900 border border-zinc-800 text-white">
                {masteryData.concepts.filter(c => c.mastery >= 0.75).length} Mastered
              </span>
              <span className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">
                {masteryData.concepts.filter(c => c.mastery < 0.6).length} Needs Review
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={masteryData.concepts.map(c => ({
                  name: c.conceptTitle || c.conceptKey,
                  mastery: Math.round(c.mastery * 100)
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#27272a"
                  tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#27272a"
                  tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="p-2.5 rounded-lg bg-[#09090b] border border-[#27272a] shadow-xl text-xs font-mono">
                          <p className="font-bold text-white mb-1">{data.payload.name}</p>
                          <p className="text-white font-bold">{data.value}% Mastery</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="mastery" radius={[4, 4, 0, 0]}>
                  {masteryData.concepts.map((entry, index) => {
                    const score = entry.mastery * 100;
                    const fill = score >= 75 ? '#ffffff' : score >= 60 ? '#a1a1aa' : '#52525b';
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Concept Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {masteryData.concepts.map((c) => {
              const pct = Math.round(c.mastery * 100);

              return (
                <div
                  key={c._id || c.conceptKey}
                  className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2 font-mono"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[70%]">
                      {c.conceptTitle || c.conceptKey}
                    </span>
                    <span className="font-mono font-bold text-white">
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{c.attempts || 1} attempt{c.attempts === 1 ? '' : 's'}</span>
                    <span>interval: {c.intervalDays || 1}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Jobs Progress Bar Banner */}
      {Object.keys(activeJobs).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            <span>Ingesting Materials</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(activeJobs).map(([jobId, job]) => (
              <div
                key={jobId}
                className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white truncate max-w-[70%]">
                    {job.stage || 'Processing document...'}
                  </span>
                  <span className="font-mono font-bold text-white">
                    {job.progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300 rounded-full"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Upload Dropzone + Materials List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form (Left Column, 1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <UploadCloud className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Upload Material</h2>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Document Type
                </label>
                <select
                  value={materialKind}
                  onChange={(e) => setMaterialKind(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="syllabus">Syllabus / Curriculum</option>
                  <option value="notes">Lecture Notes / Summary</option>
                  <option value="slides">Presentation Slides (.pptx)</option>
                  <option value="book">Textbook / Reference</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Dropzone Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-[#27272a] hover:border-zinc-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-[#09090b] space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Click to browse or drop files
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    PDF, DOCX, PPTX, TXT up to 25MB
                  </p>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">
                    Selected ({selectedFiles.length}):
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-xs font-mono">
                    {selectedFiles.map((f, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-[#0d1117] border border-[#30363d] text-slate-300 truncate"
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Upload &amp; Ingest</span>
                )}
              </button>
            </form>
          </div>

          {/* Semantic Search Inspector (RAG Testing) */}
          <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <Search className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">RAG Search Test</h2>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-black disabled:opacity-40 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : 'Search'}
              </button>
            </form>

            {searchResults && (
              <div className="space-y-2 pt-2 border-t border-[#27272a] max-h-60 overflow-y-auto">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                  Matches ({searchResults.length}):
                </span>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-zinc-500">No passages found.</p>
                ) : (
                  searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[11px] font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
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
                      <p className="text-zinc-300 line-clamp-3 leading-snug">
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-zinc-400" />
              <span>Workspace Materials ({materials.length})</span>
            </h2>
          </div>

          {materials.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#121215] border border-[#27272a] text-center space-y-3 font-mono">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">No materials uploaded yet</h3>
            </div>
          ) : (
            <div className="space-y-2.5">
              {materials.map((m) => (
                <div
                  key={m._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#121215] border border-[#27272a] hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-white truncate max-w-xs font-mono">
                          {m.fileName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {m.kind}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#8b949e]">
                        <span>{(m.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                        {m.pageCount > 0 && <span>• {m.pageCount} pages</span>}
                        {m.chunkCount > 0 && (
                          <span className="text-zinc-300 font-medium">
                            • {m.chunkCount} chunks
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    {/* Status Badge */}
                    {m.status === 'ready' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-white">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : m.status === 'processing' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Ingesting
                      </span>
                    ) : m.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-rose-950/70 border border-rose-800 text-rose-400">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-500">
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
                      className="p-1.5 rounded-md text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
          <div className="w-full max-w-md rounded-2xl bg-[#121215] border border-[#27272a] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  <Compass className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white">Generate Study Roadmap</h2>
              </div>
              <button
                onClick={() => setIsRoadmapModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            {roadmapError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs font-mono">
                {roadmapError}
              </div>
            )}

            {roadmapJobId ? (
              <div className="space-y-4 py-6 text-center font-mono">
                <Loader2 className="w-6 h-6 animate-spin text-white mx-auto" />
                <div>
                  <h3 className="text-xs font-bold text-white">
                    {roadmapJobProgress?.stage || 'Analyzing curriculum materials...'}
                  </h3>
                </div>
                {roadmapJobProgress?.progress && (
                  <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 rounded-full"
                      style={{ width: `${roadmapJobProgress.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleGenerateRoadmap} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Target Preparation Days
                  </label>
                  <select
                    value={roadmapSettings.days}
                    onChange={(e) => setRoadmapSettings({ ...roadmapSettings, days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={10}>10 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={21}>21 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Daily Study Commitment
                  </label>
                  <select
                    value={roadmapSettings.hoursPerDay}
                    onChange={(e) => setRoadmapSettings({ ...roadmapSettings, hoursPerDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value={1}>1 hour / day</option>
                    <option value={2}>2 hours / day</option>
                    <option value={3}>3 hours / day</option>
                    <option value={4}>4+ hours / day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Target Level
                  </label>
                  <select
                    value={roadmapSettings.level}
                    onChange={(e) => setRoadmapSettings({ ...roadmapSettings, level: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRoadmapModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Create Roadmap</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating AI Tutor Drawer (Phase 9) */}
      <AITutorDrawer workspaceId={id} dayTitle={workspace?.title} />
    </div>
  );
};

export default WorkspaceDetail;
