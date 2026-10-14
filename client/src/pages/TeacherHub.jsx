import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { resolveFileUrl } from '../utils/fileUrl';
import {
  Users,
  Megaphone,
  Video,
  UserCheck,
  Plus,
  MessageSquare,
  AlertCircle,
  PlayCircle,
  Clock,
  Sparkles,
  ArrowRight,
  GraduationCap
} from 'lucide-react';

export const TeacherHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active sub-tab: 'teachers' | 'announcements' | 'lectures'
  const initialTab = searchParams.get('tab') || 'teachers';
  const [activeTab, setActiveTab] = useState(
    ['teachers', 'announcements', 'lectures'].includes(initialTab) ? initialTab : 'teachers'
  );

  // Data states
  const [teachers, setTeachers] = useState([]);
  const [joinedTeacherIds, setJoinedTeacherIds] = useState(new Set());
  const [announcements, setAnnouncements] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [activeLecture, setActiveLecture] = useState(null);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  // Sync activeTab if URL search param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['teachers', 'announcements', 'lectures'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const [teachersRes, myTeachersRes, announcementsRes, lecturesRes] = await Promise.allSettled([
        api.getTeachers(),
        api.getMyTeachers(),
        api.getStudentAnnouncementsFeed(),
        api.getStudentLecturesFeed()
      ]);

      if (teachersRes.status === 'fulfilled') {
        setTeachers(teachersRes.value?.teachers || []);
      }
      if (myTeachersRes.status === 'fulfilled') {
        const joined = new Set(
          (myTeachersRes.value?.teachers || []).map((m) => m.teacher?._id || m.teacher)
        );
        setJoinedTeacherIds(joined);
      }
      if (announcementsRes.status === 'fulfilled') {
        setAnnouncements(announcementsRes.value?.announcements || []);
      }
      if (lecturesRes.status === 'fulfilled') {
        const lectureList = lecturesRes.value?.lectures || [];
        setLectures(lectureList);
        if (lectureList.length > 0) {
          setActiveLecture(lectureList[0]);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load teacher classroom hub');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJoin = async (teacherId) => {
    const isJoined = joinedTeacherIds.has(teacherId);
    setActionLoading((prev) => ({ ...prev, [teacherId]: true }));

    try {
      if (isJoined) {
        await api.leaveClass(teacherId);
        setJoinedTeacherIds((prev) => {
          const next = new Set(prev);
          next.delete(teacherId);
          return next;
        });
      } else {
        await api.joinClass(teacherId);
        setJoinedTeacherIds((prev) => new Set(prev).add(teacherId));
      }
      // Refresh announcements and lectures in the background
      const [annRes, lecRes] = await Promise.allSettled([
        api.getStudentAnnouncementsFeed(),
        api.getStudentLecturesFeed()
      ]);
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value?.announcements || []);
      if (lecRes.status === 'fulfilled') {
        const list = lecRes.value?.lectures || [];
        setLectures(list);
        if (!activeLecture && list.length > 0) setActiveLecture(list[0]);
      }
    } catch (err) {
      alert(err.message || 'Failed to update class membership');
    } finally {
      setActionLoading((prev) => ({ ...prev, [teacherId]: false }));
    }
  };

  const TABS = [
    {
      id: 'teachers',
      label: 'Browse Teachers',
      icon: Users,
      count: teachers.length
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
      count: announcements.length
    },
    {
      id: 'lectures',
      label: 'Recorded Lectures',
      icon: Video,
      count: lectures.length
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#14111f] rounded-3xl p-6 sm:p-8 border border-[#383050] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Teachers & Classes</h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Browse instructors, read announcements, and watch recorded lecture videos
              </p>
            </div>
          </div>
        </div>

        {/* Sub-navigation buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#383050]/80 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                    : 'bg-[#1c1729] text-[#9f99b0] border-[#383050] hover:text-[#f0eef5] hover:bg-[#251e35]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-indigo-700/90 text-white' : 'bg-[#14111f] text-slate-400 border border-[#383050]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading classroom resources...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BROWSE TEACHERS */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              {teachers.length === 0 ? (
                <div className="bg-[#14111f] rounded-3xl p-12 text-center text-slate-400 space-y-3 border border-[#383050]">
                  <Users className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-base font-bold text-white">No Teachers Available Yet</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Instructors will appear here once they register and publish course content.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teachers.map((t) => {
                    const isJoined = joinedTeacherIds.has(t._id);
                    const isLoadingThis = !!actionLoading[t._id];

                    return (
                      <div
                        key={t._id}
                        className="bg-[#14111f] rounded-2xl p-6 border border-[#383050] hover:border-purple-400/50 transition-all flex flex-col justify-between space-y-6 shadow-lg"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#1c1729] border border-[#383050] flex items-center justify-center text-purple-300 text-xl font-bold shrink-0">
                              {t.avatarUrl ? (
                                <img
                                  src={resolveFileUrl(t.avatarUrl)}
                                  alt={t.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{t.name ? t.name[0].toUpperCase() : 'T'}</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-bold text-white truncate">{t.name}</h3>
                              <p className="text-xs font-mono text-slate-400 truncate">{t.email}</p>
                              {t.subjectFocus && (
                                <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1c1729] text-purple-300 border border-[#383050]">
                                  {t.subjectFocus}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-3 bg-[#1c1729] p-3 rounded-xl border border-[#383050]">
                            {t.bio || 'No bio provided.'}
                          </p>
                        </div>

                        <div className="space-y-2 pt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleJoin(t._id)}
                              disabled={isLoadingThis}
                              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
                                isJoined
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              }`}
                            >
                              {isJoined ? (
                                <>
                                  <UserCheck className="w-4 h-4" />
                                  <span>Joined ✓ (Leave)</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  <span>Join Class</span>
                                </>
                              )}
                            </button>

                            {isJoined && (
                              <button
                                onClick={() => navigate(`/messages?teacherId=${t._id}`)}
                                className="p-2.5 rounded-xl bg-[#1c1729] hover:bg-[#251e35] text-purple-300 border border-[#383050] transition-colors"
                                title="Send Message"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {isJoined && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleTabChange('announcements')}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-[#1c1729] hover:bg-[#251e35] text-[10px] font-mono text-purple-300 border border-[#383050] flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Megaphone className="w-3 h-3" />
                                <span>Announcements</span>
                              </button>
                              <button
                                onClick={() => handleTabChange('lectures')}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-[#1c1729] hover:bg-[#251e35] text-[10px] font-mono text-purple-300 border border-[#383050] flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Video className="w-3 h-3" />
                                <span>Lectures</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              {announcements.length === 0 ? (
                <div className="bg-[#14111f] rounded-3xl p-12 text-center space-y-4 shadow-xl border border-[#383050]">
                  <div className="w-16 h-16 rounded-2xl bg-[#1c1729] border border-[#383050] flex items-center justify-center text-slate-500 mx-auto">
                    <Megaphone className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">No Announcements Yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Join teacher classes to receive real-time announcements, test notices, and updates.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTabChange('teachers')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>Browse Teachers</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((item) => {
                    const teacher = item.teacherId || {};

                    return (
                      <div
                        key={item._id}
                        className="bg-[#14111f] rounded-2xl p-6 border border-[#383050] hover:border-purple-400/50 transition-all space-y-4 shadow-lg"
                      >
                        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#383050]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#1c1729] border border-[#383050] flex items-center justify-center text-purple-300 text-sm font-bold shrink-0">
                              {teacher.avatarUrl ? (
                                <img
                                  src={resolveFileUrl(teacher.avatarUrl)}
                                  alt={teacher.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{teacher.name ? teacher.name[0].toUpperCase() : 'T'}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{teacher.name || 'Instructor'}</h4>
                              <p className="text-[11px] font-mono text-slate-400">
                                {teacher.subjectFocus || 'Teacher'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-[#1c1729] px-3 py-1 rounded-full border border-[#383050]">
                            <Clock className="w-3 h-3 text-purple-400" />
                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-base font-bold text-purple-300">{item.title}</h3>
                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RECORDED LECTURES */}
          {activeTab === 'lectures' && (
            <div className="space-y-6">
              {lectures.length === 0 ? (
                <div className="bg-[#14111f] rounded-3xl p-12 text-center space-y-4 shadow-xl border border-[#383050]">
                  <div className="w-16 h-16 rounded-2xl bg-[#1c1729] border border-[#383050] flex items-center justify-center text-slate-500 mx-auto">
                    <Video className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">No Lectures Available</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Join teacher classes to access their published lecture videos and study material.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTabChange('teachers')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>Browse Teachers</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Video Player */}
                  <div className="lg:col-span-2 space-y-4">
                    {activeLecture ? (
                      <div className="bg-[#14111f] rounded-3xl p-6 border border-[#383050] space-y-4 shadow-xl">
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-[#383050] shadow-2xl">
                          <iframe
                            src={activeLecture.embedUrl}
                            title={activeLecture.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>

                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1c1729] text-purple-300 border border-[#383050]">
                              Teacher: {activeLecture.teacherId?.name || 'Instructor'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {new Date(activeLecture.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h2 className="text-xl font-extrabold text-white">{activeLecture.title}</h2>
                          {activeLecture.description && (
                            <p className="text-xs text-slate-300 bg-[#1c1729] p-4 rounded-xl border border-[#383050] leading-relaxed">
                              {activeLecture.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Lecture Playlist Sidebar */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                      Available Lectures ({lectures.length})
                    </h3>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {lectures.map((item) => {
                        const isSelected = activeLecture?._id === item._id;

                        return (
                          <button
                            key={item._id}
                            onClick={() => setActiveLecture(item)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                              isSelected
                                ? 'bg-[#1c1729] border-purple-400 text-white shadow-md'
                                : 'bg-[#14111f] border-[#383050] hover:border-slate-700'
                            }`}
                          >
                            <PlayCircle
                              className={`w-5 h-5 shrink-0 mt-0.5 ${
                                isSelected ? 'text-purple-400' : 'text-slate-500'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                                {item.teacherId?.name || 'Instructor'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherHub;
