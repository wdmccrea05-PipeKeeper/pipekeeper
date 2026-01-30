/**
 * Format agent responses with aggressive paragraph reflow
 * Strips markdown, handles long paragraphs, ensures clean spacing
 */
export function formatTobacconistResponse(text) {
  if (!text || typeof text !== 'string') return '';

  // Step 1: Strip markdown artifacts
  let cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // **bold** → bold
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')   // ***bold italic*** → text
    .replace(/\*([^*]+)\*/g, '$1')           // *italic* → italic
    .replace(/^#+\s+/gm, '')                 // remove markdown headings
    .replace(/^\s*[-*_]+\s*$/gm, '')         // remove markdown dividers
    .replace(/`([^`]+)`/g, '$1')             // remove inline code ticks
    .replace(/^\s*\*+\s*$/gm, '')            // remove isolated * lines
    .trim();

  // Step 2: Split by double newlines first (explicit breaks)
  let paragraphs = cleaned.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);

  // Step 3: Aggressively reflow long paragraphs (>350 chars) into 2–3 sentence chunks
  const finalParagraphs = [];
  for (const para of paragraphs) {
    if (para.length > 350) {
      // Split by sentence: period/exclamation/question followed by space + capital OR end of string
      // This regex is more robust: captures full sentence including punctuation
      const sentenceRegex = /[^.!?]*[.!?]+/g;
      let sentences = para.match(sentenceRegex) || [para];
      
      let chunk = '';
      let sentenceCount = 0;
      
      for (let sentence of sentences) {
        sentence = sentence.trim();
        if (!sentence) continue;
        
        const potentialChunk = chunk ? chunk + ' ' + sentence : sentence;
        sentenceCount++;
        
        // Split if: 3+ sentences OR exceeds 350 chars and already has content
        if (sentenceCount >= 3 || (potentialChunk.length > 350 && chunk.length > 0)) {
          if (chunk.trim()) finalParagraphs.push(chunk.trim());
          chunk = sentence;
          sentenceCount = 1;
        } else {
          chunk = potentialChunk;
        }
      }
      if (chunk.trim()) finalParagraphs.push(chunk.trim());
    } else {
      finalParagraphs.push(para);
    }
  }

  // Step 4: Ensure blank lines between all paragraphs
  return finalParagraphs.join('\n\n');
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