#!/bin/bash

echo "🔧 Fixing GenSpark/Grahmos branding to Grahmos..."

# Find and replace function
find_and_replace() {
    local search="$1"
    local replace="$2"
    local extensions="$3"
    
    echo "Replacing '$search' with '$replace'..."
    
    find /Users/paco/Downloads/grahmos-ai-search-privacy \
        -type f \
        \( $extensions \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/logs/*" \
        -exec sed -i '' "s/$search/$replace/g" {} +
}

# Replace GenSpark and Grahmos with Grahmos
find_and_replace "GenSpark" "Grahmos" "-name '*.md' -o -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.txt' -o -name '*.sh'"
find_and_replace "Grahmos" "Grahmos" "-name '*.md' -o -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.txt' -o -name '*.sh'"

# Also replace lowercase versions
find_and_replace "grahmos" "grahmos" "-name '*.md' -o -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.txt' -o -name '*.sh'"

echo "✅ Branding fix completed!"

# Verify the changes
echo "📊 Checking for remaining GenSpark references..."
remaining=$(grep -r "GenSpark\|Grahmos" /Users/paco/Downloads/grahmos-ai-search-privacy --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=logs | wc -l)

if [ "$remaining" -eq 0 ]; then
    echo "✅ All GenSpark references successfully replaced with Grahmos!"
else
    echo "⚠️  Found $remaining remaining references:"
    grep -r "GenSpark\|Grahmos" /Users/paco/Downloads/grahmos-ai-search-privacy --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=logs | head -5
fi