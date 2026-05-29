import { resourceMetadata, type ResourceType } from '@/data/academic';

/** Not listed on Find Study Resources (private student / review content). */
export const PRIVATE_LIBRARY_RESOURCE_TYPES = new Set<ResourceType>([
  'DIAGNOSTIC_REPORT',
  'RECOVERY_PLAN',
  'AI_TUTOR_SESSION',
  'ASSIGNMENT_REVIEW',
  'ESSAY_REVIEW',
  'DISSERTATION_REVIEW',
]);

/** Categories shown on Find Study Resources (shared library only). */
export const PUBLIC_LIBRARY_RESOURCE_TYPES: ResourceType[] = (
  Object.keys(resourceMetadata) as ResourceType[]
).filter((type) => !PRIVATE_LIBRARY_RESOURCE_TYPES.has(type));
