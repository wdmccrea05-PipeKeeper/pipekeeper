/**
 * Format agent responses with proper paragraph spacing
 * Ensures blank lines between paragraphs and clean rendering
 */
export function formatTobacconistResponse(text) {
  if (!text || typeof text !== 'string') return '';

  // Split on double newlines or natural paragraph breaks
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Return paragraphs joined with actual line breaks (React will render them)
  // Each paragraph gets double spacing via CSS
  return paragraphs.join('\n\n');
}

import { type ResponseStyle } from '@/components/utils/questionClassifier';

/**
 * React component to render formatted tobacconist response
 * Adapts format based on response style (simple_paragraphs, light_structure, structured)
 */
export function FormattedTobacconistResponse({ content, style = 'light_structure' }: { content: string; style?: ResponseStyle }) {
  if (!content) return null;

  // Split into paragraphs and preserve structure
  const paragraphs = formatTobacconistResponse(content).split('\n\n');

  return (
    <div className={style === 'structured' ? 'space-y-4' : 'space-y-3'}>
      {paragraphs.map((para, idx) => {
        // Check if this paragraph contains bullets
        const isBulletSection = para.includes('\n- ') || para.startsWith('- ');

        if (isBulletSection && (style === 'light_structure' || style === 'structured')) {
          // Split into intro line and bullet points
          const lines = para.split('\n');
          const introLine = lines[0];
          const bulletLines = lines.slice(1).filter(l => l.trim());

          return (
            <div key={idx}>
              {introLine && !introLine.startsWith('-') && (
                <p className={`text-sm leading-relaxed ${style === 'structured' ? 'font-semibold mb-2' : 'mb-2'}`}>
                  {introLine}
                </p>
              )}
              <ul className="space-y-1 ml-3">
                {bulletLines.map((line, bIdx) => (
                  <li key={bIdx} className="text-sm leading-relaxed list-disc">
                    {line.replace(/^-\s*/, '')}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Regular paragraph (bullets suppressed in simple_paragraphs mode)
        if (isBulletSection && style === 'simple_paragraphs') {
          const lines = para.split('\n').filter(l => l.trim());
          return (
            <div key={idx}>
              {lines.map((line, lIdx) => (
                <p key={lIdx} className="text-sm leading-relaxed">
                  {line.replace(/^-\s*/, '')}
                </p>
              ))}
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-sm leading-relaxed">
            {para}
          </p>
        );
      })}
    </div>
  );
}