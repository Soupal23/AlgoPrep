import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Video, Users, ArrowRight, AlertCircle, PlayCircle, Clock } from 'lucide-react';

export const RecordedLectures = () => {
  const [lectures, setLectures] = useState([]);
  const [activeLecture, setActiveLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLectures();
  }, []);

  const fetchLectures = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getStudentLecturesFeed();
      const list = res.lectures || [];
      setLectures(list);
      if (list.length > 0) {
        setActiveLecture(list[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load video lectures feed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-2 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Recorded Video Lectures</h1>
            <p className="text-xs text-slate-400">Asynchronous video lectures published by your joined teachers</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading recorded lectures...</p>
        </div>
      ) : lectures.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-4 shadow-xl border border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <Video className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Lectures Available</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Join classes in the teacher directory to access their recorded video lectures.
            </p>
          </div>
          <Link
            to="/teachers"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:opacity-95 transition-opacity"
          >
            <Users className="w-4 h-4" />
            <span>Browse Teachers Directory</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Video Player */}
          <div className="lg:col-span-2 space-y-4">
            {activeLecture ? (
              <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 shadow-xl">
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
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
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                      Teacher: {activeLecture.teacherId?.name || 'Instructor'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(activeLecture.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="text-xl font-extrabold text-white">{activeLecture.title}</h2>
                  {activeLecture.description && (
                    <p className="text-xs text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 leading-relaxed">
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
                        ? 'bg-rose-950/40 border-rose-600 shadow-md shadow-rose-900/20'
                        : 'glass-card border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <PlayCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? 'text-rose-400' : 'text-slate-500'}`} />
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
  );
};
