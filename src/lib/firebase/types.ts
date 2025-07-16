// Core Types for Delphi Platform

export type TopicType = 
  | 'priority-setting'    // What should we prioritize?
  | 'policy-decision'     // Should we implement this policy?
  | 'solution-selection'  // Which approach should we take?
  | 'indicator-development' // What metrics should we track?
  | 'resource-allocation' // How should we allocate resources?
  | 'quality-improvement' // How can we improve quality?
  | 'risk-assessment'     // What are the risks and mitigation strategies?
  | 'strategic-planning'  // What are our strategic options?
  | 'clinical-guidelines' // What clinical practices should we adopt?
  | 'technology-adoption' // Should we adopt this technology?

export interface Topic {
  id?: string;
  title: string;
  description: string;
  question: string;
  panelId: string;
  createdBy: string;
  status: 'draft' | 'active' | 'completed';
  roundNumber: number;
  currentRoundId?: string;
  
  // Healthcare-specific fields
  topicType: TopicType;
  expectedOutcome: 'recommendation' | 'ranking' | 'consensus-rating' | 'action-plan';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  scope: 'department' | 'facility' | 'regional' | 'system-wide';
  totalRounds?: number; // Default 2, configurable
  
  // AI extraction fields
  rawInput?: string;
  aiExtracted: boolean;
  aiConfidence?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export type FeedbackType = 'idea' | 'solution' | 'concern' | 'vote' | 'refinement';

export type AgreementLevel = -2 | -1 | 0 | 1 | 2;

export interface Feedback {
  id?: string;
  topicId: string;
  panelId: string;
  expertId: string; // Anonymous to other experts
  roundId?: string;
  roundNumber: number;
  type: FeedbackType;
  content: string;
  // Legacy voting system (for backwards compatibility)
  upvotes: string[]; // Array of user IDs who upvoted
  downvotes: string[]; // Array of user IDs who downvoted
  // New 5-point agreement system
  agreements: Record<string, AgreementLevel>; // expertId -> agreement level
  parentId?: string | null; // For threading refinements
  metadata?: {
    reasoning?: string;
    refinementCount?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Panel {
  id?: string;
  name: string;
  description: string;
  creatorId: string;
  adminIds: string[];
  expertIds: string[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Expert {
  id?: string;
  panelId: string;
  email: string;
  name: string;
  organization?: string;
  expertise?: string;
  status: 'invited' | 'accepted' | 'declined';
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date;
  userId?: string; // Linked after accepting invitation
  createdAt: Date;
  updatedAt: Date;
}

export interface Round {
  id?: string;
  topicId: string;
  roundNumber: number;
  status: 'active' | 'completed';
  summary?: string; // AI-generated summary of previous round
  startDate: Date;
  endDate?: Date;
}

// Invitation Types
export interface PanelInvitation {
  id?: string;
  panelId: string;
  panelName: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: string;
  invitedByName?: string;
  token: string; // Unique token for invitation link
  message?: string; // Custom message from inviter
  expertId?: string; // Set when invitation is accepted
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
}

// AI Extraction Types
export interface ExtractTopicRequest {
  rawText: string;
  panelContext?: string;
}

export interface ExtractTopicResponse {
  title: string;
  description: string;
  question: string;
  suggestedFeedbackTypes: FeedbackType[];
  confidence: number;
}