import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldX } from 'lucide-react';

interface SkillEntry {
  skill: string;
  evidence: string;
  match: boolean;
}

interface SkillsMatrixProps {
  data: SkillEntry[];
}

const SkillsMatrix: React.FC<SkillsMatrixProps> = ({ data }) => {
  return (
    <div className="w-full border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              Required Skill
            </th>
            <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              Candidate Evidence
            </th>
            <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-gray-500 font-bold text-center">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((entry, index) => (
            <tr 
              key={index} 
              className="group hover:bg-gray-50 transition-colors duration-150"
            >
              <td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-50/50">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-black transition-colors" />
                  {entry.skill}
                </div>
              </td>
              <td className="px-6 py-4 text-gray-500 italic font-sans leading-relaxed">
                {entry.match ? (
                  entry.evidence
                ) : (
                  <span className="text-gray-400 not-italic">No objective evidence found in candidate record.</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center">
                  {entry.match ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-100">
                      <CheckCircle2 size={12} />
                      Matched
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-100">
                      <AlertTriangle size={12} className="animate-pulse" />
                      Missing
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="p-10 text-center text-gray-400 font-sans italic text-sm">
          No skills data available for analysis.
        </div>
      )}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <ShieldX size={12} />
          Objective Skills Verification
        </div>
        <span className="text-[10px] font-mono text-gray-400 uppercase">
          Audit Verified by Google AI
        </span>
      </div>
    </div>
  );
};

export default SkillsMatrix;
