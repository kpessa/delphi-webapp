// Core Types for Delphi Platform

export interface Topic {
  id?: string;
  title: string;
  description: string;
  question: string;
  panelId: string;
  createdBy: string;
  status: 'open' | 'closed';
  roundNumber: number;
  
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
  roundNumber: number;
  expertId: string;
  type: FeedbackType;
  content: string;
  parentFeedbackId?: string; // For refinements of existing feedback
  voteCount: number;
  voters: string[]; // Track who voted to prevent double voting
  createdAt: Date;
}

export interface Panel {
  id?: string;
  name: string;
  description: string;
  adminIds: string[];
  expertIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Expert {
  id?: string;
  uid: string; // Firebase Auth UID
  email: string;
  displayName: string;
  panelIds: string[]; // Many-to-many relationship
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