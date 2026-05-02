import type { Timestamp } from "firebase-admin/firestore";
import type { FeatureKey } from "@/data/acu-costs";

export type UserRole = 
  | "STUDENT"
  | "PARENT"
  | "PRIVATE_TUTOR"
  | "SCHOOL_ADMIN"
  | "SCHOOL_TUTOR"
  | "ADMIN";

export type SubscriptionType =
  | "FREE"
  | "STUDENT_PREMIUM"
  | "STUDENT_PREMIUM_PLUS"
  | "PARENT_PRO"
  | "PARENT_PRO_PLUS"
  | "PRIVATE_TUTOR"
  | "SCHOOL_STARTER"
  | "SCHOOL_GROWTH"
  | "SCHOOL_ENTERPRISE"
  | "SCHOOL_TUTOR" // Added for clarity
  | "SCHOOL_ADMIN" // Added for clarity
  | "ADMIN"; // Admin has its own "type" for entitlement purposes

export type SubscriptionStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "CANCELLED"
  | "EXPIRED"
  | "PENDING_PAYMENT";

export type WalletOwnerType = "USER" | "SCHOOL";

export type ACUTransactionType =
  | "PURCHASE"
  | "BONUS"
  | "DEBIT"
  | "REFUND"
  | "ADMIN_ADJUSTMENT";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  profileImageUrl?: string;
  coverImageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subscription {
  id: string;
  userId: string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  startedAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface AcuWallet {
  id: string;
  userId: string;
  ownerType?: WalletOwnerType;
  balance: number;
  locked?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AcuTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: ACUTransactionType;
  featureKey?: FeatureKey;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  actualAICostGBP?: number;
  platformChargeGBP?: number;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studyLevel?: string;
  yearGroup?: string;
  course?: string;
  subject?: string;
  examBoard?: string;
  currentGrade?: string;
  targetGrade?: string;
}
