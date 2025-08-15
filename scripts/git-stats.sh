#!/bin/bash

echo "📊 GIT REPOSITORY STATISTICS"
echo "============================"
echo ""

echo "📝 Commit Statistics:"
echo "Total commits: $(git rev-list --all --count)"
echo "Contributors: $(git shortlog -sn | wc -l)"
echo ""

echo "📈 Code Changes Last 30 Days:"
git log --since="30 days ago" --pretty=tformat: --numstat | awk '{ add += $1; subs += $2; loc += $1 - $2 } END { printf "Added lines: %s\nRemoved lines: %s\nTotal change: %s\n", add, subs, loc }'
echo ""

echo "📁 File Type Distribution:"
git ls-files | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10
echo ""

echo "🏆 Most Changed Files:"
git log --pretty=format: --name-only | sort | uniq -c | sort -rg | head -10
echo ""

echo "📅 Commits by Day of Week:"
git log --pretty=format:"%ad" --date=format:"%A" | sort | uniq -c | sort -rn
echo ""

echo "⏰ Commits by Hour:"
git log --pretty=format:"%ad" --date=format:"%H" | sort | uniq -c | sort -rn | head -10
echo ""

echo "💾 Repository Size:"
du -sh .git
echo "Working directory: $(du -sh . | cut -f1)"
