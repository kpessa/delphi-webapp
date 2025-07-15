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

export interface Round {
  id?: string;
  itemId: string;
  roundNumber: number;
  questions: Question[];
  status: 'pending' | 'active' | 'completed';
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'rating' | 'ranking' | 'multiple-choice';
  options?: string[];
  required: boolean;
}

export interface Response {
  id?: string;
  roundId: string;
  expertId: string;
  votes: Record<string, any>;
  feedback: Record<string, string>;
  timestamp: Date;
}

export interface Aggregation {
  id?: string;
  roundId: string;
  questionId: string;
  statistics: {
    mean?: number;
    median?: number;
    mode?: number;
    standardDeviation?: number;
    iqr?: number;
    distribution?: Record<string, number>;
  };
  consensus: boolean;
  consensusLevel: number;
}