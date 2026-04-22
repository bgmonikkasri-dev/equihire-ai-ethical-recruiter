import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

export interface InclusiveAnalysis {
  score: number;
  genderedTerms: string[];
  suggestions: string[];
  biasHeatmap: BiasAnalysis[];
  rewrittenSentences?: RewrittenSentence[];
}

export interface CandidateEvaluation {
  score: number;
  justification: string;
  skillsMatch: string[];
}

export const rewriteInclusiveSentence = async (sentence: string): Promise<RewrittenSentence> => {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as an Inclusive Writing Expert. I will provide a sentence from a Job Description that was flagged for 'Gender-Coded' or 'Aggressive' language.
    
    Sentence: '${sentence}'
    
    Your Task:
    1. Rewrite this sentence to be neutral, welcoming, and inclusive while maintaining the original professional requirement.
    2. Explain why the new version is better (e.g., 'removes aggressive terminology like Rockstar').
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalSentence: { type: Type.STRING },
          suggestedSentence: { type: Type.STRING },
          improvementLogic: { type: Type.STRING }
        },
        required: ["originalSentence", "suggestedSentence", "improvementLogic"]
      }
    }
  });

  return JSON.parse(result.text || "{}");
};

export const analyzeJobDescription = async (description: string): Promise<InclusiveAnalysis> => {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as an Advanced AI Recruitment Ethics Advisor. Analyze the following job description for unconscious bias, gendered language, and exclusivity. 
    
    1. Identify phrases that are 'Gender-Coded' (e.g., 'Aggressive', 'Rockstar') and explain why.
    2. Provide an inclusivity score (0-100).
    3. Suggest neutral alternatives.
    4. For the top 2 biased sentences, provide a rewritten version.
    
    Job Description:
    ${description}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          genderedTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          biasHeatmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phrase: { type: Type.STRING },
                biasType: { type: Type.STRING, enum: ['gender', 'age', 'prestige', 'other'] },
                explanation: { type: Type.STRING }
              },
              required: ["phrase", "biasType", "explanation"]
            }
          },
          rewrittenSentences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalSentence: { type: Type.STRING },
                suggestedSentence: { type: Type.STRING },
                improvementLogic: { type: Type.STRING }
              }
            }
          }
        },
        required: ["score", "genderedTerms", "suggestions", "biasHeatmap"]
      }
    }
  });

  return JSON.parse(result.text || "{}");
};

export const performEthicalAudit = async (resume: string, jobDescription: string): Promise<EthicalAuditReport> => {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as an Advanced AI Recruitment Ethics Advisor. Perform a deep anonymized audit and objective evaluation.
    
    CORE DIRECTIVES:
    1. Deep Anonymization: Strip names, contact info, graduation years (replace with [YEARS_EXPERIENCE]), and institution names (replace with [INSTITUTION_TYPE]).
    2. Over-qualification Guard: If a candidate is over-qualified, identify them as a 'Strategic Alternative' and suggest a senior-level role.
    3. Non-Bias Clause: Strictly ignore personal requests (remote work, family commitments) during the technical skills score.
    4. Skills-Gap Matrix: Compare 'Required Skill' from JD vs 'Candidate Evidence' from Resume.
    5. Transparency & Audit Report: List redacted categories, reasoning for confidence score, and confirm non-discrimination.
    
    Job Description:
    ${jobDescription}
    
    Candidate Resume:
    ${resume}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          anonymizedResume: { type: Type.STRING },
          biasHeatmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phrase: { type: Type.STRING },
                biasType: { type: Type.STRING, enum: ['gender', 'age', 'prestige', 'other'] },
                explanation: { type: Type.STRING }
              }
            }
          },
          skillsMatrix: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                requiredSkill: { type: Type.STRING },
                candidateEvidence: { type: Type.STRING },
                matchFound: { type: Type.BOOLEAN }
              }
            }
          },
          confidenceScore: { type: Type.NUMBER },
          overallEvaluation: { type: Type.STRING },
          strategicRecommendation: { type: Type.STRING },
          complianceAudit: {
            type: Type.OBJECT,
            properties: {
              piiRedactionLog: { type: Type.ARRAY, items: { type: Type.STRING } },
              reasoningTrace: { type: Type.STRING },
              nonDiscriminationStatement: { type: Type.STRING },
              modelAndVersion: { type: Type.STRING }
            },
            required: ["piiRedactionLog", "reasoningTrace", "nonDiscriminationStatement", "modelAndVersion"]
          }
        },
        required: ["anonymizedResume", "skillsMatrix", "confidenceScore", "overallEvaluation", "strategicRecommendation", "complianceAudit"]
      }
    }
  });

  return JSON.parse(result.text || "{}");
};

export const reevaluateWithContext = async (currentReport: EthicalAuditReport, recruiterNote: string, jobDescription: string): Promise<EthicalAuditReport> => {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as a Collaborative AI Hiring Assistant. I am providing a previous evaluation where a skill might have been marked as 'Missing'. The recruiter has provided this context: ${recruiterNote}
    
    Current Evaluation Report:
    ${JSON.stringify(currentReport)}
    
    Job Description:
    ${jobDescription}
    
    Your Task:
    1. Re-evaluate the 'Skills-Gap Matrix' based on this new information.
    2. Update the matchScore (implied by skillsMatrix) and ethicsConfidence.
    3. Explain how this human context changed your reasoning in 'reasonForUpdate'.
    4. Ensure no new biases (like favoritism) are introduced during this adjustment.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skillsMatrix: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                requiredSkill: { type: Type.STRING },
                candidateEvidence: { type: Type.STRING },
                matchFound: { type: Type.BOOLEAN }
              }
            }
          },
          confidenceScore: { type: Type.NUMBER },
          overallEvaluation: { type: Type.STRING },
          reasonForUpdate: { type: Type.STRING },
          strategicRecommendation: { type: Type.STRING }
        }
      }
    }
  });

  const updatedData = JSON.parse(result.text || "{}");
  return { ...currentReport, ...updatedData };
};

export const anonymizeAndEvaluateCandidate = async (resume: string, jobDescription: string): Promise<{ anonymizedResume: string; evaluation: CandidateEvaluation; auditReport: EthicalAuditReport }> => {
  const auditReport = await performEthicalAudit(resume, jobDescription);
  
  return {
    anonymizedResume: auditReport.anonymizedResume,
    auditReport,
    evaluation: {
      score: Math.round(auditReport.skillsMatrix.filter(s => s.matchFound).length / auditReport.skillsMatrix.length * 100) || 0,
      justification: auditReport.overallEvaluation,
      skillsMatch: auditReport.skillsMatrix.filter(s => s.matchFound).map(s => s.requiredSkill)
    }
  };
};
