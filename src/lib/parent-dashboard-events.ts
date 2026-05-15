/** Dispatched after a parent successfully links a student — parent dashboard listens to refetch. */
export const PARENT_STUDENT_LINKED_EVENT = 'studyear:parent-student-linked';

export function notifyParentStudentLinked() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PARENT_STUDENT_LINKED_EVENT));
  }
}
