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

/**
 * React component to render formatted tobacconist response
 * Handles paragraph spacing and preserves bullet formatting
 */
export function FormattedTobacconistResponse({ content }) {
  if (!content) return null;

  // Split into paragraphs and preserve structure
  const paragraphs = formatTobacconistResponse(content).split('\n\n');

  return (
    <div className="space-y-3">
      {paragraphs.map((para, idx) => {
        // Check if this paragraph contains bullets
        const isBulletSection = para.includes('\n- ') || para.startsWith('- ');

        if (isBulletSection) {
          // Split into intro line and bullet points
          const lines = para.split('\n');
          const introLine = lines[0];
          const bulletLines = lines.slice(1).filter(l => l.trim());

          return (
            <div key={idx}>
              {introLine && !introLine.startsWith('-') && (
                <p className="text-sm leading-relaxed mb-2">{introLine}</p>
              )}
              <ul className="space-y-1 ml-0">
                {bulletLines.map((line, bIdx) => (
                  <li key={bIdx} className="text-sm leading-relaxed">
                    {line.replace(/^-\s*/, '')}
                  </li>
                ))}
              </ul>
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