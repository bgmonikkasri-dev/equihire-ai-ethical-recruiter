export interface BiasAnalysis {
  phrase: string;
  biasType: 'gender' | 'age' | 'prestige' | 'other';
  explanation: string;
}

export interface SkillMatch {
  requiredSkill: string;
  candidateEvidence: string;
  matchFound: boolean;
}

export interface RewrittenSentence {
  originalSentence: string;
  suggestedSentence: string;
  improvementLogic: string;
}

export interface ComplianceAudit {
  piiRedactionLog: string[];
  reasoningTrace: string;
  nonDiscriminationStatement: string;
  modelAndVersion: string;
}

export interface EthicalAuditReport {
  anonymizedResume: string;
  biasHeatmap: BiasAnalysis[];
  skillsMatrix: SkillMatch[];
  confidenceScore: number;
  overallEvaluation: string;
  strategicRecommendation?: string;
  reasonForUpdate?: string;
  complianceAudit?: ComplianceAudit;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  status: 'open' | 'closed';
  createdAt: any;
  ownerId: string;
  ownerEmail: string;
  inclusiveAnalysis?: {
    score: number;
    genderedTerms: string[];
    suggestions: string[];
    biasHeatmap: BiasAnalysis[];
    rewrittenSentences?: RewrittenSentence[];
  };
}

export interface Candidate {
  id: string;
  jobId: string;
  anonymizedData: string;
  auditReport?: EthicalAuditReport;
  evaluation: {
    score: number;
    justification: string;
    skillsMatch: string[];
  };
  status: 'pending' | 'shortlisted' | 'rejected';
  createdAt: any;
}
