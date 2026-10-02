import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Book {
  _id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
}
export interface Loan { _id: string; book: { _id: string; title: string; author: string; isbn: string } | string; student: { _id: string; name: string; refId: string; grade: string } | string; issuedDate: string; dueDate: string; returnedDate?: string; status: 'Active' | 'Returned' | 'Overdue' }
export interface CreateBookInput { isbn: string; title: string; author: string; category: string; totalCopies: number }
export interface IssueLoanInput { bookId: string; studentId: string; dueDate: string }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listBooks(page = 1, search = ''): Promise<Paginated<Book>> {
  const res = await apiClient.get<ApiSuccess<Book[]>>('/library/books', {
    params: { page, limit: 20, search: search || undefined },
  });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function addBook(input: CreateBookInput): Promise<Book> { const res = await apiClient.post<ApiSuccess<Book>>('/library/books', input); return res.data.data; }
export async function listLoans(page = 1): Promise<Paginated<Loan>> { const res = await apiClient.get<ApiSuccess<Loan[]>>('/library/loans', { params: { page, limit: 20 } }); const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 }; return { items: res.data.data, ...pagination }; }
export async function issueLoan(input: IssueLoanInput): Promise<Loan> { const res = await apiClient.post<ApiSuccess<Loan>>('/library/loans', input); return res.data.data; }
export async function returnLoan(id: string): Promise<Loan> { const res = await apiClient.post<ApiSuccess<Loan>>(`/library/loans/${id}/return`); return res.data.data; }
