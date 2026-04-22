import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  FileText, 
  ShieldCheck, 
  SearchCode, 
  ChevronRight,
  LogOut,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  CheckCircle,
  RotateCw,
  Edit,
  Download,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signInWithGoogle, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc 
} from 'firebase/firestore';
import { analyzeJobDescription, anonymizeAndEvaluateCandidate, reevaluateWithContext, rewriteInclusiveSentence } from './lib/gemini';
import { Job, Candidate, EthicalAuditReport as AuditReportType } from './types';
import SkillsMatrix from './components/SkillsMatrix';

// Components
const Navbar = ({ user, onSignOut }: { user: FirebaseUser | null, onSignOut: () => void }) => (
  <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <ShieldCheck size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">EquiHire AI</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{user.displayName}</span>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>
              <button 
                onClick={onSignOut}
                className="p-2 text-gray-500 hover:text-black transition-colors"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </div>
    </div>
  </nav>
);

const JobForm = ({ 
  onCancel, 
  onSubmit, 
  loading,
  initialTitle = '',
  initialDesc = ''
}: { 
  onCancel: () => void, 
  onSubmit: (title: string, desc: string) => void, 
  loading: boolean,
  initialTitle?: string,
  initialDesc?: string
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [desc, setDesc] = useState(initialDesc);
  const isEditing = !!initialTitle;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm ${isEditing ? 'border-none shadow-none p-0' : ''}`}
    >
      {!isEditing && <h3 className="text-lg font-semibold mb-4">Create New Job Posting</h3>}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Job Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-mono text-sm"
            placeholder="e.g. Senior Software Engineer"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
          <textarea 
            rows={6}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-sans text-sm"
            placeholder="Include roles, responsibilities, and requirements..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-black transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            disabled={loading || !title || !desc}
            onClick={() => onSubmit(title, desc)}
            className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Plus size={16} />}
            {isEditing ? 'Save Changes' : 'Analyze & Create'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

interface JobCardProps {
  job: Job;
  onClick: () => void;
  active: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ job, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl border transition-all ${
      active ? 'bg-black text-white border-black shadow-lg scale-[1.02]' : 'bg-white text-gray-900 border-gray-200 hover:border-gray-400'
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-bold tracking-tight text-lg leading-tight">{job.title}</h4>
      {job.inclusiveAnalysis && (
        <div className={`text-xs px-2 py-1 rounded font-mono ${job.inclusiveAnalysis.score > 80 ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>
          {job.inclusiveAnalysis.score}% Inclusive
        </div>
      )}
    </div>
    <p className={`text-sm mb-4 line-clamp-2 ${active ? 'text-gray-300' : 'text-gray-600'}`}>
      {job.description}
    </p>
    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-semibold opacity-70">
      <span>{new Date(job.createdAt?.toDate()).toLocaleDateString()}</span>
      <div className="flex items-center gap-1">
        <span>View Candidates</span>
        <ChevronRight size={12} />
      </div>
    </div>
  </button>
);

interface CandidateCardProps {
  candidate: Candidate;
  onReevaluate: (candidate: Candidate, note: string) => Promise<void>;
  onUpdateStatus: (candidate: Candidate, status: 'pending' | 'shortlisted' | 'rejected') => Promise<void>;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, onReevaluate, onUpdateStatus }) => {
  const [showFullRegistry, setShowFullRegistry] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'compliance'>('audit');
  const [recruiterNote, setRecruiterNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!recruiterNote.trim()) return;
    setIsUpdating(true);
    await onReevaluate(candidate, recruiterNote);
    setIsUpdating(false);
    setRecruiterNote('');
  };

  const downloadReport = (type: 'audit' | 'compliance') => {
    let content = '';
    if (type === 'audit' && candidate.auditReport) {
      content = `ETHICAL AUDIT REPORT - EquiHire AI\n\n` +
                `Score: ${candidate.evaluation.score}%\n` +
                `Justification: ${candidate.evaluation.justification}\n\n` +
                `Skills Matrix:\n` +
                (candidate.auditReport.skillsMatrix?.map(s => `- ${s.requiredSkill}: ${s.matchFound ? 'Matched' : 'Missing'} (${s.candidateEvidence})`).join('\n') || 'N/A') +
                `\n\nEthics Confidence: ${candidate.auditReport.confidenceScore}%` +
                (candidate.auditReport.strategicRecommendation ? `\n\nStrategic Recommendation: ${candidate.auditReport.strategicRecommendation}` : '');
    } else if (candidate.auditReport?.complianceAudit) {
      content = `COMPLIANCE & TRANSPARENCY REPORT - EquiHire AI\n\n` +
                `Redaction Log: ${(candidate.auditReport.complianceAudit.piiRedactionLog || []).join(', ')}\n` +
                `Reasoning Trace: ${candidate.auditReport.complianceAudit.reasoningTrace}\n` +
                `Non-Discrimination: ${candidate.auditReport.complianceAudit.nonDiscriminationStatement}\n` +
                `Auditor: ${candidate.auditReport.complianceAudit.modelAndVersion}`;
    }

    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EquiHire_${type}_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden h-fit"
    >
      <div className="flex items-center justify-between mb-6 pr-16 bg-gray-50 -mx-6 -mt-6 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm">
            <User size={24} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 leading-none mb-1">Anonymized Candidate</h4>
            <div className="flex gap-2">
              {candidate.status === 'shortlisted' && <span className="text-[9px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Shortlisted</span>}
              {candidate.status === 'rejected' && <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Rejected</span>}
              {candidate.status === 'pending' && <span className="text-[9px] bg-gray-100 text-gray-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-gray-200">Pending</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => downloadReport(activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black hover:border-gray-400 transition-all shadow-sm"
          >
            <Download size={12} />
            Report
          </button>
          <div className="flex gap-1">
            <button 
              onClick={() => onUpdateStatus(candidate, 'shortlisted')}
              className={`p-1.5 rounded-lg border transition-all shadow-sm ${candidate.status === 'shortlisted' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400 border-gray-200 hover:text-green-600 hover:border-green-600'}`}
              title="Shortlist"
            >
              <CheckCircle size={14} />
            </button>
            <button 
              onClick={() => onUpdateStatus(candidate, 'rejected')}
              className={`p-1.5 rounded-lg border transition-all shadow-sm ${candidate.status === 'rejected' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-400 border-gray-200 hover:text-red-600 hover:border-red-600'}`}
              title="Reject"
            >
              <XCircle size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-100 pb-1">
        <button 
          onClick={() => setActiveTab('audit')}
          className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Ethical Audit
        </button>
        <button 
          onClick={() => setActiveTab('compliance')}
          className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'compliance' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Compliance & Transparency
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'audit' ? (
          <>
            <div>
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-500" />
                AI Bio-Ethical Justification
              </h5>
              <p className="text-sm text-gray-700 leading-relaxed font-sans italic">
                "{candidate.evaluation.justification}"
              </p>
              {candidate.auditReport?.reasonForUpdate && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <h6 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Human-Context Adjustment</h6>
                  <p className="text-xs text-amber-700 leading-tight italic">{candidate.auditReport.reasonForUpdate}</p>
                </div>
              )}
            </div>

            {candidate.auditReport && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Skills-Gap Matrix</h5>
                    <span className="text-[10px] font-mono text-gray-400">Pure Objective Analysis</span>
                  </div>
                  <SkillsMatrix 
                    data={candidate.auditReport.skillsMatrix.map(s => ({
                      skill: s.requiredSkill,
                      evidence: s.candidateEvidence,
                      match: s.matchFound
                    }))} 
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Collaborative Re-evaluation</h5>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={recruiterNote}
                      onChange={(e) => setRecruiterNote(e.target.value)}
                      placeholder="Add recruiter context (e.g. 'Evidence found in portfolio')..."
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-black"
                    />
                    <button 
                      onClick={handleUpdate}
                      disabled={isUpdating || !recruiterNote.trim()}
                      className="px-3 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdating ? <RotateCw size={12} className="animate-spin" /> : <Plus size={12} />}
                      {isUpdating ? 'Analyzing...' : 'Re-evaluate'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-black" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ethics Confidence</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-black">{candidate.auditReport.confidenceScore}%</span>
                </div>

                {candidate.auditReport.strategicRecommendation && (
                  <div className="p-4 bg-black text-white rounded-xl shadow-inner border border-gray-800">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 text-gray-400">
                      <Sparkles size={12} className="text-amber-400" />
                      Strategic Advisor Note
                    </h5>
                    <p className="text-xs leading-relaxed font-sans opacity-90">
                      {candidate.auditReport.strategicRecommendation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {candidate.auditReport?.complianceAudit ? (
              <div className="space-y-6">
                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <FileText size={14} className="text-black" />
                    PII Redaction Log
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {candidate.auditReport.complianceAudit.piiRedactionLog.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-50 text-[10px] font-mono text-gray-600 rounded border border-gray-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Reasoning Trace</h5>
                  <p className="text-xs text-gray-600 leading-relaxed font-sans bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {candidate.auditReport.complianceAudit.reasoningTrace}
                  </p>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Non-Discrimination Pledge</h5>
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex gap-3">
                    <ShieldCheck size={18} className="text-green-600 shrink-0" />
                    <p className="text-xs text-green-700 leading-tight font-medium">
                      {candidate.auditReport.complianceAudit.nonDiscriminationStatement}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 text-[10px] text-gray-400 font-mono flex items-center justify-between">
                  <span>Audit Engine: {candidate.auditReport.complianceAudit.modelAndVersion}</span>
                  <span className="uppercase font-bold tracking-widest">Compliant</span>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center opacity-50 italic text-sm">
                Compliance report not generated for this audit.
              </div>
            )}
          </div>
        )}

        <div>
          <button 
            onClick={() => setShowFullRegistry(!showFullRegistry)}
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors flex items-center gap-1"
          >
            {showFullRegistry ? 'Hide' : 'View'} Deep Anonymized Content
            <ChevronRight size={10} className={showFullRegistry ? 'rotate-90' : ''} />
          </button>
          
          <AnimatePresence>
            {showFullRegistry && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-dashed border-gray-100 mt-2">
                  <p className="text-xs text-gray-500 font-mono leading-relaxed bg-gray-50 p-3 rounded">
                    {candidate.anonymizedData}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const [evaluatingResume, setEvaluatingResume] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'status'>('score');

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) {
      setJobs([]);
      return;
    }
    const q = query(collection(db, 'jobs'), where('ownerId', '==', user.uid));
    return onSnapshot(q, (snapshot) => {
      const jobList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(jobList.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    });
  }, [user]);

  useEffect(() => {
    if (!activeJob) {
      setCandidates([]);
      return;
    }
    const q = query(collection(db, `jobs/${activeJob.id}/candidates`));
    return onSnapshot(q, (snapshot) => {
      const candList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates(candList.sort((a, b) => b.evaluation.score - a.evaluation.score));
    });
  }, [activeJob]);

  const handleCreateJob = async (title: string, desc: string) => {
    if (!user) return;
    setCreatingJob(true);
    try {
      const analysis = await analyzeJobDescription(desc);
      await addDoc(collection(db, 'jobs'), {
        title,
        description: desc,
        status: 'open',
        ownerId: user.uid,
        ownerEmail: user.email,
        createdAt: serverTimestamp(),
        inclusiveAnalysis: analysis
      });
      setShowJobForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingJob(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeJob || !e.target.files?.[0]) return;
    setEvaluatingResume(true);
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const { anonymizedResume, evaluation, auditReport } = await anonymizeAndEvaluateCandidate(text, activeJob.description);
        await addDoc(collection(db, `jobs/${activeJob.id}/candidates`), {
          jobId: activeJob.id,
          anonymizedData: anonymizedResume,
          evaluation,
          auditReport,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error(err);
      } finally {
        setEvaluatingResume(false);
      }
    };
    reader.readAsText(file);
  };

  const handleReevaluate = async (candidate: Candidate, note: string) => {
    if (!activeJob || !candidate.auditReport) return;
    try {
      const updatedReport = await reevaluateWithContext(candidate.auditReport, note, activeJob.description);
      const newScore = Math.round(updatedReport.skillsMatrix.filter(s => s.matchFound).length / updatedReport.skillsMatrix.length * 100);
      
      await updateDoc(doc(db, `jobs/${activeJob.id}/candidates`, candidate.id), {
        auditReport: updatedReport,
        evaluation: {
          ...candidate.evaluation,
          score: newScore,
          justification: updatedReport.overallEvaluation,
          skillsMatch: updatedReport.skillsMatrix.filter(s => s.matchFound).map(s => s.requiredSkill)
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditJob = async (id: string, title: string, desc: string) => {
    if (!user) return;
    setCreatingJob(true);
    try {
      const analysis = await analyzeJobDescription(desc);
      await updateDoc(doc(db, 'jobs', id), {
        title,
        description: desc,
        inclusiveAnalysis: analysis
      });
      setEditingJob(null);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingJob(false);
    }
  };

  const handleUpdateStatus = async (candidate: Candidate, status: 'pending' | 'shortlisted' | 'rejected') => {
    if (!activeJob) return;
    try {
      await updateDoc(doc(db, `jobs/${activeJob.id}/candidates`, candidate.id), {
        status
      });
    } catch (err) {
      console.error(err);
    }
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (sortBy === 'score') return b.evaluation.score - a.evaluation.score;
    if (sortBy === 'date') return b.createdAt?.toMillis() - a.createdAt?.toMillis();
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    return 0;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-gray-200">
          <div className="w-20 h-20 bg-black rounded-3xl mx-auto flex items-center justify-center text-white mb-8 rotate-3">
            <ShieldCheck size={48} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-4">EquiHire AI</h1>
          <p className="text-gray-500 text-lg mb-10 leading-relaxed font-sans">
            Eliminate bias in your hiring process with AI-powered anonymization and inclusive language auditing.
          </p>
          <button 
            id="signin-button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-gray-800 transition-all active:scale-[0.98] shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)]"
          >
            Get Started with Google
          </button>
          <p className="mt-8 text-xs text-gray-400 font-mono tracking-widest uppercase">
            Recruitment Redefined by Google AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-gray-900 font-sans selection:bg-black selection:text-white">
      <Navbar user={user} onSignOut={() => signOut(auth)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Jobs List */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                <LayoutDashboard size={16} />
                My Openings
              </h2>
              <button 
                onClick={() => setShowJobForm(true)}
                className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all"
                title="New Job Posting"
              >
                <Plus size={18} />
              </button>
            </div>

            <AnimatePresence>
              {showJobForm && (
                <JobForm 
                  loading={creatingJob}
                  onCancel={() => setShowJobForm(false)}
                  onSubmit={handleCreateJob}
                />
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {jobs.map(job => (
                <JobCard 
                  key={job.id}
                  job={job}
                  active={activeJob?.id === job.id}
                  onClick={() => setActiveJob(job)}
                />
              ))}
              {jobs.length === 0 && !showJobForm && (
                <div className="text-center py-12 px-6 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                  <FileText className="mx-auto mb-2 opacity-20" size={40} />
                  <p className="text-sm font-medium">No job postings yet.<br/>Start by creating one.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Job Details & Candidates */}
          <div className="lg:col-span-8 space-y-8">
            {activeJob ? (
              <div className="space-y-8">
                {/* Inclusive Analysis Header */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight mb-1">{activeJob.title}</h2>
                        <button 
                          onClick={() => setEditingJob(activeJob)}
                          className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest">
                        <span>Created {new Date(activeJob.createdAt?.toDate()).toLocaleDateString()}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"/>
                        <span>{activeJob.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`text-4xl font-black tracking-tighter ${activeJob.inclusiveAnalysis && activeJob.inclusiveAnalysis.score > 80 ? 'text-green-600' : 'text-amber-500'}`}>
                        {activeJob.inclusiveAnalysis?.score}%
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inclusivity Score</span>
                    </div>
                  </div>
                  
                  {activeJob.inclusiveAnalysis && (
                    <div className="bg-gray-50 p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200/50">
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-amber-500" />
                          Bias Heatmap Analysis
                        </h4>
                        <div className="space-y-3">
                          {activeJob.inclusiveAnalysis.biasHeatmap?.map((bias, i) => (
                            <div key={i} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-gray-900">"{bias.phrase}"</span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  bias.biasType === 'gender' ? 'bg-pink-100 text-pink-600' :
                                  bias.biasType === 'age' ? 'bg-blue-100 text-blue-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {bias.biasType}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-tight">{bias.explanation}</p>
                            </div>
                          ))}
                          {(!activeJob.inclusiveAnalysis.biasHeatmap || activeJob.inclusiveAnalysis.biasHeatmap.length === 0) && (
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                              <CheckCircle2 size={14} />
                              No biased phrases detected.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 italic">AI Inclusivity Suggestions</h4>
                          <ul className="space-y-2">
                            {activeJob.inclusiveAnalysis.suggestions.map((s, i) => (
                              <li key={i} className="text-xs text-gray-600 flex gap-2 p-2 bg-white rounded border border-gray-100">
                                <span className="w-1 h-1 bg-black rounded-full mt-1.5 shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {activeJob.inclusiveAnalysis.rewrittenSentences && activeJob.inclusiveAnalysis.rewrittenSentences.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <Sparkles size={12} className="text-amber-500" />
                              Inclusive Writing Specialist
                            </h4>
                            <div className="space-y-3">
                              {activeJob.inclusiveAnalysis.rewrittenSentences.map((rw, i) => (
                                <div key={i} className="p-3 bg-black text-white rounded-lg shadow-lg border border-gray-800">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Original</p>
                                  <p className="text-xs line-through opacity-50 mb-2 truncate">"{rw.originalSentence}"</p>
                                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1">Suggested</p>
                                  <p className="text-xs font-medium mb-2 leading-relaxed">"{rw.suggestedSentence}"</p>
                                  <div className="p-2 bg-gray-900 rounded text-[9px] text-gray-400 leading-tight">
                                    <span className="font-bold text-gray-300">Logic:</span> {rw.improvementLogic}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Candidate Management Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-6">
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                        <SearchCode size={16} />
                        Candidate Pipeline
                      </h3>
                      <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-gray-200">
                        <Filter size={12} className="text-gray-400" />
                        <select 
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="text-[10px] font-bold uppercase tracking-widest text-gray-600 outline-none cursor-pointer"
                        >
                          <option value="score">Sort by Score</option>
                          <option value="date">Sort by Date</option>
                          <option value="status">Sort by Status</option>
                        </select>
                      </div>
                    </div>
                    <div className="relative">
                      <input 
                        type="file" 
                        id="resume-upload" 
                        className="hidden" 
                        onChange={handleResumeUpload}
                        accept=".txt,.pdf"
                      />
                      <label 
                        htmlFor="resume-upload"
                        className={`cursor-pointer px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-all flex items-center gap-2 ${evaluatingResume ? 'opacity-50' : ''}`}
                      >
                        {evaluatingResume ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Anonymizing...
                          </>
                        ) : (
                          <>
                            <Plus size={16} />
                            Candidate (TXT)
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                      {sortedCandidates.map(candidate => (
                        <CandidateCard 
                          key={candidate.id} 
                          candidate={candidate} 
                          onReevaluate={handleReevaluate}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      ))}
                    {candidates.length === 0 && !evaluatingResume && (
                      <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-gray-200 border-dashed">
                        <User className="mx-auto mb-4 text-gray-200" size={48} />
                        <h4 className="text-gray-400 font-medium">No candidates in the pipeline yet.</h4>
                        <p className="text-xs text-gray-400 mt-1">Upload an anonymized resume to get started.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 rounded-3xl">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300 mb-6">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Job Posting</h3>
                <p className="text-gray-500 max-w-xs mx-auto">
                  Choose an opening from the left panel to view candidates and inclusive language audits.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
      <AnimatePresence>
        {editingJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Edit Job Posting</h3>
                <button onClick={() => setEditingJob(null)} className="text-gray-400 hover:text-black hover:bg-gray-100 p-1.5 rounded-lg"><XCircle size={20}/></button>
              </div>
              <div className="p-6">
                <JobForm 
                  initialTitle={editingJob.title}
                  initialDesc={editingJob.description}
                  onSubmit={(title, desc) => handleEditJob(editingJob.id, title, desc)}
                  onCancel={() => setEditingJob(null)}
                  loading={creatingJob}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
