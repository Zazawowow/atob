#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Monitor specific directories for changes
const watchDirs = [
  './app',
  './components',
  './lib',
  './public'
];

const ignoredPatterns = [
  /\.git/,
  /node_modules/,
  /\.next/,
  /\.DS_Store/,
  /\.swp$/,
  /\.tmp$/
];

console.log('🔍 Monitoring file changes for constant compilation issues...');
console.log('Press Ctrl+C to stop monitoring\n');

let changeCount = 0;
const changeLog = new Map();

function shouldIgnore(filePath) {
  return ignoredPatterns.some(pattern => pattern.test(filePath));
}

function logChange(filePath, eventType) {
  changeCount++;
  const timestamp = new Date().toLocaleTimeString();
  const relativePath = path.relative('.', filePath);
  
  if (!changeLog.has(relativePath)) {
    changeLog.set(relativePath, []);
  }
  changeLog.get(relativePath).push({ timestamp, eventType });
  
  console.log(`[${timestamp}] ${eventType}: ${relativePath}`);
  
  // Show summary every 10 changes
  if (changeCount % 10 === 0) {
    console.log(`\n📊 Summary (${changeCount} total changes):`);
    const sortedFiles = Array.from(changeLog.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    sortedFiles.forEach(([file, changes]) => {
      console.log(`  ${file}: ${changes.length} changes`);
    });
    console.log('');
  }
}

watchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename && !shouldIgnore(filename)) {
        const fullPath = path.join(dir, filename);
        logChange(fullPath, eventType);
      }
    });
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📈 Final Summary:');
  console.log(`Total changes monitored: ${changeCount}`);
  
  const sortedFiles = Array.from(changeLog.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  console.log('\nMost frequently changed files:');
  sortedFiles.forEach(([file, changes]) => {
    console.log(`  ${file}: ${changes.length} changes`);
  });
  
  process.exit(0);
}); 