export class HttpsError extends Error {
    constructor(public code: 'unauthenticated' | 'failed-precondition' | 'not-found' | 'internal' | 'invalid-argument' | 'resource-exhausted', message: string) {
        super(message);
        this.name = 'HttpsError';
    }
}
