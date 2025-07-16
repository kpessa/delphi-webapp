// Core Types for Delphi Platform

export interface Topic {
  id?: string;
  title: string;
  description: string;
  question: string;
  panelId: string;
  creatorId: string;
  status: 'draft' | 'active' | 'completed';
  roundNumber: number;
  currentRoundId?: string;
  
  // AI extraction fields
  rawInput?: string;
  aiExtracted: boolean;
  aiConfidence?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export type FeedbackType = 'idea' | 'solution' | 'concern' | 'vote' | 'refinement';

export interface Feedback {
  id?: string;
  topicId: string;
  panelId: string;
  expertId: string; // Anonymous to other experts
  roundId?: string;
  roundNumber: number;
  type: FeedbackType;
  content: string;
  upvotes: string[]; // Array of user IDs who upvoted
  downvotes: string[]; // Array of user IDs who downvoted
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

// Legacy types for migration reference
export type ItemType = 'initiative' | 'assessment' | 'consultation' | 'evaluation' | 'survey' | 'custom';
export type ItemCategory = 'clinical' | 'operational' | 'financial' | 'strategic' | 'quality' | 'technology';
export type ItemScope = 'system-wide' | 'regional' | 'facility' | 'department';

export interface Item {
  id?: string;
  type: ItemType;
  category?: ItemCategory;
  scope?: ItemScope;
  title: string;
  description: string;
  adminIds: string[];
  expertIds: string[];
  consensusThreshold: number;
  maxRounds: number;
  currentRound: number;
  status: 'draft' | 'active' | 'completed';
  customMetadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}