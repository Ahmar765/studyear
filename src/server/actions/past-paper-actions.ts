
'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import { z } from 'zod';

const SearchFiltersSchema = z.object({
  subjectId: z.string().optional(),
  examBoard: z.string().optional(),
  year: z.string().optional(),
});

type SearchFilters = z.infer<typeof SearchFiltersSchema>;

// This interface must align with the `past_papers` collection schema in the blueprint
export interface PastPaperResult {
  id: string;
  subjectId: string;
  examBoard?: string;
  title: string;
  paperYear?: number;
  paperSeries?: string;
  active: boolean;
  createdAt: string;
}

export async function searchPastPapersAction(filters: SearchFilters): Promise<{ papers: PastPaperResult[], error: string | null }> {
  try {
    const validatedFilters = SearchFiltersSchema.parse(filters);
    
    let query: admin.firestore.Query = adminDb.collection('past_papers');
    
    // Per blueprint, only show active papers
    query = query.where('active', '==', true);
    
    // Filter by subjectId (e.g., 'BIO', 'CHEM')
    if (validatedFilters.subjectId) {
      query = query.where('subjectId', '==', validatedFilters.subjectId);
    }
    // Filter by exam board
    if (validatedFilters.examBoard) {
      query = query.where('examBoard', '==', validatedFilters.examBoard);
    }
    // Filter by year
    if (validatedFilters.year) {
      query = query.where('paperYear', '==', parseInt(validatedFilters.year, 10));
    }
    
    // Order by year, newest first
    query = query.orderBy('paperYear', 'desc');

    const snapshot = await query.limit(50).get();
    
    if (snapshot.empty) {
      return { papers: [], error: null };
    }
    
    const papers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        subjectId: data.subjectId,
        examBoard: data.examBoard,
        paperYear: data.paperYear,
        paperSeries: data.paperSeries,
        active: data.active,
        createdAt: (data.createdAt as admin.firestore.Timestamp).toDate().toISOString(),
      } as PastPaperResult
    });
    
    return { papers, error: null };

  } catch (error: any) {
    console.error("Error searching past papers:", error);
    if (error instanceof z.ZodError) {
        return { papers: [], error: error.errors.map(e => e.message).join(', ') };
    }
    return { papers: [], error: "An unexpected error occurred during the search." };
  }
}
