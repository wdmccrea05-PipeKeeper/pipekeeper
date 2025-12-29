import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function FAQDownloadButton({ faqContent }) {
  const handleDownload = () => {
    const formattedContent = faqContent.map(section => {
      const sectionTitle = section.title;
      const questionsAndAnswers = section.items.map(item => {
        // Remove HTML tags from answer
        const cleanAnswer = item.answer.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        return `Q: ${item.question}\n\nA: ${cleanAnswer}\n`;
      }).join('\n');
      return `${sectionTitle}\n${'='.repeat(sectionTitle.length)}\n\n${questionsAndAnswers}`;
    }).join('\n\n');

    const header = `PIPEKEEPER - HELP & FAQ\nGenerated on ${new Date().toLocaleDateString()}\n\n${'='.repeat(50)}\n\n`;
    const fullContent = header + formattedContent;

    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'PipeKeeper_FAQ.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleDownload} className="bg-amber-700 hover:bg-amber-800">
      <Download className="w-4 h-4 mr-2" />
      Download FAQ
    </Button>
  );
}