/**
 * i18n Audit Tool
 * Scans codebase for hard-coded user-facing strings
 * Run with: node components/i18n/auditTool.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'auditConfig.json'), 'utf8'));

// Patterns to detect hard-coded strings
const PATTERNS = {
  jsxText: />([\w\s,!?.'"-]+)</g,
  placeholder: /placeholder=["']([^"']+)["']/g,
  ariaLabel: /aria-label=["']([^"']+)["']/g,
  title: /title=["']([^"']+)["']/g,
  alt: /alt=["']([^"']+)["']/g,
  toast: /toast\.(success|error|info|warning)\(["']([^"']+)["']/g,
  alert: /alert\(["']([^"']+)["']/g,
  confirm: /confirm\(["']([^"']+)["']/g,
};

// Check if string is likely English text (not code/variables)
function isLikelyEnglishText(str) {
  const trimmed = str.trim();
  if (trimmed.length < 3) return false;
  if (/^[A-Z_]+$/.test(trimmed)) return false; // CONSTANT_NAMES
  if (/^[a-z]+[A-Z]/.test(trimmed)) return false; // camelCase
  if (/^[{}\[\]()]+$/.test(trimmed)) return false; // Brackets only
  if (/^\d+$/.test(trimmed)) return false; // Numbers only
  if (config.properNounAllowlist.some(noun => trimmed.includes(noun))) return false;
  
  // Check if it contains common English words
  const commonWords = ['the', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must'];
  return commonWords.some(word => trimmed.toLowerCase().includes(word)) || /[a-zA-Z]{4,}/.test(trimmed);
}

// Scan a file for hard-coded strings
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  Object.entries(PATTERNS).forEach(([patternName, pattern]) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1] || match[2];
      if (isLikelyEnglishText(text)) {
        const lines = content.substring(0, match.index).split('\n');
        const lineNumber = lines.length;
        issues.push({
          file: filePath,
          line: lineNumber,
          pattern: patternName,
          text: text,
        });
      }
    }
  });

  return issues;
}

// Recursively scan directory
function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDirectory(filePath, results);
    } else if ((file.endsWith('.jsx') || file.endsWith('.js')) && 
               !config.excludePatterns.some(pattern => new RegExp(pattern).test(filePath))) {
      const issues = scanFile(filePath);
      if (issues.length > 0) {
        results.push(...issues);
      }
    }
  });

  return results;
}

// Main execution
console.log('🔍 Starting i18n audit...\n');

const rootDir = path.join(__dirname, '../../');
const issues = scanDirectory(rootDir);

if (issues.length === 0) {
  console.log('✅ No hard-coded strings found! All user-facing text is internationalized.\n');
  process.exit(0);
} else {
  console.log(`❌ Found ${issues.length} potential hard-coded strings:\n`);
  
  // Group by file
  const byFile = {};
  issues.forEach(issue => {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  });

  Object.entries(byFile).forEach(([file, fileIssues]) => {
    console.log(`\n📄 ${file.replace(rootDir, '')}`);
    fileIssues.forEach(issue => {
      console.log(`   Line ${issue.line} [${issue.pattern}]: "${issue.text}"`);
    });
  });

  console.log(`\n❌ Total issues: ${issues.length}`);
  console.log('Run this tool after fixing all hard-coded strings.\n');
  
  if (config.strictMode) {
    process.exit(1);
  }
}