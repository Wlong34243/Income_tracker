const fs = require('fs');
const path = require('path');

class AppMetricsAnalyzer {
    constructor() {
        this.metrics = {
            totalLines: 0,
            totalFiles: 0,
            byFileType: {},
            byDirectory: {},
            largestFiles: [],
            features: [],
            complexity: {}
        };
    }

    analyzeDirectory(dir, baseDir = dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                this.analyzeDirectory(fullPath, baseDir);
            } else if (stat.isFile() && this.shouldAnalyze(file)) {
                this.analyzeFile(fullPath, baseDir);
            }
        });
    }

    analyzeFile(filePath, baseDir) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const ext = path.extname(filePath);
        const relPath = path.relative(baseDir, filePath);
        const dir = path.dirname(relPath).split(path.sep)[0] || 'root';

        // Count lines (excluding empty lines and comments)
        const codeLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*');
        }).length;

        this.metrics.totalLines += lines.length;
        this.metrics.totalFiles++;

        // By file type
        this.metrics.byFileType[ext] = (this.metrics.byFileType[ext] || 0) + lines.length;

        // By directory
        this.metrics.byDirectory[dir] = (this.metrics.byDirectory[dir] || 0) + lines.length;

        // Track largest files
        this.metrics.largestFiles.push({
            path: relPath,
            lines: lines.length,
            codeLines,
            size: (content.length / 1024).toFixed(2) + ' KB'
        });

        // Analyze complexity for JS files
        if (ext === '.js') {
            this.analyzeComplexity(content, relPath);
        }
    }

    analyzeComplexity(content, filePath) {
        const metrics = {
            functions: (content.match(/function\s+\w+|=>\s*{|async\s+\w+/g) || []).length,
            classes: (content.match(/class\s+\w+/g) || []).length,
            imports: (content.match(/import\s+.+from/g) || []).length,
            exports: (content.match(/export\s+(default\s+)?/g) || []).length,
            asyncFunctions: (content.match(/async\s+/g) || []).length,
            conditionals: (content.match(/if\s*\(|switch\s*\(/g) || []).length,
            loops: (content.match(/for\s*\(|while\s*\(|\.forEach|\.map|\.filter/g) || []).length
        };

        this.metrics.complexity[filePath] = metrics;
    }

    shouldAnalyze(file) {
        const extensions = ['.js', '.html', '.css', '.json', '.md', '.yml', '.yaml'];
        return extensions.some(ext => file.endsWith(ext));
    }

    generateReport() {
        // Sort largest files
        this.metrics.largestFiles.sort((a, b) => b.lines - a.lines);
        this.metrics.largestFiles = this.metrics.largestFiles.slice(0, 10);

        // Calculate totals
        const totalComplexity = Object.values(this.metrics.complexity).reduce((acc, curr) => {
            Object.keys(curr).forEach(key => {
                acc[key] = (acc[key] || 0) + curr[key];
            });
            return acc;
        }, {});

        return {
            summary: {
                totalLines: this.metrics.totalLines,
                totalFiles: this.metrics.totalFiles,
                avgLinesPerFile: Math.round(this.metrics.totalLines / this.metrics.totalFiles)
            },
            byFileType: this.metrics.byFileType,
            byDirectory: this.metrics.byDirectory,
            largestFiles: this.metrics.largestFiles,
            complexity: totalComplexity
        };
    }
}

// Run analysis
const analyzer = new AppMetricsAnalyzer();
analyzer.analyzeDirectory('./');
const report = analyzer.generateReport();

console.log('\n📊 FINANCE TRACKER - CODE METRICS REPORT\n');
console.log('=' .repeat(50));
console.log('\n📈 SUMMARY:');
console.log(`   Total Lines of Code: ${report.summary.totalLines.toLocaleString()}`);
console.log(`   Total Files: ${report.summary.totalFiles}`);
console.log(`   Average Lines/File: ${report.summary.avgLinesPerFile}`);

console.log('\n📁 BY FILE TYPE:');
Object.entries(report.byFileType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, lines]) => {
        console.log(`   ${type}: ${lines.toLocaleString()} lines`);
    });

console.log('\n📂 BY DIRECTORY:');
Object.entries(report.byDirectory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dir, lines]) => {
        console.log(`   ${dir}: ${lines.toLocaleString()} lines`);
    });

console.log('\n📄 LARGEST FILES:');
report.largestFiles.forEach(file => {
    console.log(`   ${file.path}: ${file.lines} lines (${file.codeLines} code, ${file.size})`);
});

console.log('\n🔧 COMPLEXITY METRICS:');
Object.entries(report.complexity).forEach(([metric, count]) => {
    console.log(`   ${metric}: ${count}`);
});

// Save to file
fs.writeFileSync('metrics-report.json', JSON.stringify(report, null, 2));
console.log('\n✅ Full report saved to metrics-report.json\n');
