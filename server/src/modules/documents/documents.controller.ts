import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './documents.service';
import { listDocumentsSchema, publishDocumentSchema } from './documents.validation';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listDocumentsSchema.shape.query.parse(req.query);
  const result = await service.listDocuments(query);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const document = await service.publishDocument(req.body, requester);
  sendSuccess(res, 201, document);
});

export const publishFile = asyncHandler(async (req: Request, res: Response) => {
  const decode = (header: unknown) => {
    try {
      return decodeURIComponent(String(header || ''));
    } catch {
      throw ApiError.badRequest('Invalid file metadata');
    }
  };
  const input = publishDocumentSchema.shape.body.parse({
    code: decode(req.headers['x-document-code']),
    expectedVersion:
      req.headers['x-document-expected-version'] === undefined
        ? undefined
        : Number(req.headers['x-document-expected-version']),
    publicationReason:
      req.headers['x-document-publication-reason'] === undefined
        ? undefined
        : decode(req.headers['x-document-publication-reason']),
    title: decode(req.headers['x-document-title']),
    category: decode(req.headers['x-document-category']),
    description: decode(req.headers['x-document-description']),
  });
  const document = await service.publishPdf(
    input,
    decode(req.headers['x-file-name']),
    req.body as Buffer,
    requireUser(req),
  );
  sendSuccess(res, 201, document);
});

export const downloadFile = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getPdf(req.params.id);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.document.filename!)}`);
  res.setHeader('Content-Length', result.document.size!);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  result.stream.on('error', (error) => res.destroy(error));
  result.stream.pipe(res);
});
