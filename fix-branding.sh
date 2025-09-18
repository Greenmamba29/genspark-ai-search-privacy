#!/bin/bash

echo "🔧 Fixing GenSpark/Genspark branding to Grahmos..."

# Find and replace function
find_and_replace() {
    local search="$1"
    local replace="$2"
    local extensions="$3"
    
    echo "Replacing '$search' with '$replace'..."
    
    find /Users/paco/Downloads/GenSpark-AI-Search \
        -type f \
        \( $extensions \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/logs/*" \
        -exec sed -i '' "s/$search/$replace/g" {} +
}

# Replace GenSpark and Genspark with Grahmos
find_and_replace "GenSpark" "Grahmos" "-name '*.md' -o -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.txt' -o -name '*.sh'"
find_and_replace "Genspark" "Grahmos" "-name '*.md' -o -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.txt' -o -name '*.sh'"

# Also replace lowercase versions
find_and_replace "genspark" "grahmos" "-name '*.md' -o -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.txt' -o -name '*.sh'"

echo "✅ Branding fix completed!"

# Verify the changes
echo "📊 Checking for remaining GenSpark references..."
remaining=$(grep -r "GenSpark\|Genspark" /Users/paco/Downloads/GenSpark-AI-Search --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=logs | wc -l)

if [ "$remaining" -eq 0 ]; then
    echo "✅ All GenSpark references successfully replaced with Grahmos!"
else
    echo "⚠️  Found $remaining remaining references:"
    grep -r "GenSpark\|Genspark" /Users/paco/Downloads/GenSpark-AI-Search --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=logs | head -5
fi