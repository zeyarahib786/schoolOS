import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ApiError } from './ApiError';
/** A real downloadable record copy; this helper does not claim a digital signature. */
export async function recordPdf(school: string, title: string, lines: string[]) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(title);
  pdf.setAuthor(school);
  let font;
  try {
    font = await pdf.embedFont(
      await readFile(process.env.PDF_FONT_PATH || resolve(__dirname, '../../assets/fonts/NotoSansArabic.ttf')),
      { subset: true },
    );
  } catch {
    throw new ApiError(503, 'PDF_FONT_UNAVAILABLE', 'PDF font is unavailable');
  }
  let page = pdf.addPage([595.28, 841.89]),
    y = 785;
  const draw = (value: string, size = 11) => {
    let line = '';
    for (const char of value.replace(/[\r\n\t]/g, ' ')) {
      const next = line + char;
      if (font.widthOfTextAtSize(next, size) > 495) {
        if (y < 65) {
          page = pdf.addPage([595.28, 841.89]);
          y = 785;
        }
        page.drawText(line, { x: 48, y, size, font, color: rgb(0.14, 0.18, 0.23) });
        y -= size + 9;
        line = char;
      } else line = next;
    }
    if (y < 65) {
      page = pdf.addPage([595.28, 841.89]);
      y = 785;
    }
    page.drawText(line, { x: 48, y, size, font, color: rgb(0.14, 0.18, 0.23) });
    y -= size + 9;
  };
  draw(school, 18);
  draw(title, 15);
  y -= 14;
  for (const line of lines) draw(line);
  y -= 15;
  draw('Record copy. This PDF has no certificate-based digital signature.', 9);
  return Buffer.from(await pdf.save());
}
