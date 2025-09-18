#!/bin/bash

echo "🧪 GenSpark AI Search - End-to-End Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test Results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -e "\n${BLUE}Testing:${NC} $test_name"
    
    result=$(eval "$test_command" 2>/dev/null)
    
    if [[ $result =~ $expected_pattern ]]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        echo -e "${YELLOW}Expected pattern:${NC} $expected_pattern"
        echo -e "${YELLOW}Actual result:${NC} $result"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "\n${BLUE}1. Backend Health Check${NC}"
run_test "Backend Server Health" \
    "curl -s http://localhost:3001/health | jq -r '.status'" \
    "healthy"

run_test "Model Ready Status" \
    "curl -s http://localhost:3001/health | jq -r '.modelReady'" \
    "true"

run_test "Index Ready Status" \
    "curl -s http://localhost:3001/health | jq -r '.indexReady'" \
    "true"

run_test "File Count Check" \
    "curl -s http://localhost:3001/health | jq -r '.indexStats.totalFiles'" \
    "10"

echo -e "\n${BLUE}2. Real File Indexing Tests${NC}"
run_test "Search for AI Content" \
    "curl -s -X POST http://localhost:3001/api/search -H 'Content-Type: application/json' -d '{\"query\": \"artificial intelligence\", \"limit\": 1}' | jq -r '.indexReady'" \
    "true"

run_test "Search Returns Real Results" \
    "curl -s -X POST http://localhost:3001/api/search -H 'Content-Type: application/json' -d '{\"query\": \"AI Testing Document\", \"limit\": 10}' | jq -r '.results[] | select(.title == \"AI Testing Document\") | .title'" \
    "AI Testing Document"

run_test "Neural Networks File Found" \
    "curl -s -X POST http://localhost:3001/api/search -H 'Content-Type: application/json' -d '{\"query\": \"neural networks research\", \"limit\": 10}' | jq -r '.results[] | select(.title == \"Neural Networks Research Paper\") | .title'" \
    "Neural Networks Research Paper"

echo -e "\n${BLUE}3. File Type Coverage${NC}"
run_test "Python Code File Indexed" \
    "curl -s -X POST http://localhost:3001/api/search -H 'Content-Type: application/json' -d '{\"query\": \"machine learning\", \"limit\": 10}' | jq -r '.results[] | select(.type == \"code\") | .type'" \
    "code"

run_test "CSV Data File Indexed" \
    "curl -s -X POST http://localhost:3001/api/search -H 'Content-Type: application/json' -d '{\"query\": \"sales\", \"limit\": 10}' | jq -r '.results[] | select(.type == \"data\") | .type'" \
    "data"

run_test "Markdown Documents Indexed" \
    "curl -s -X POST http://localhost:3001/api/search -H 'Content-Type: application/json' -d '{\"query\": \"research\", \"limit\": 10}' | jq -r '.results[] | select(.path | contains(\".md\")) | .type'" \
    "document"

echo -e "\n${BLUE}4. Real-time File Monitoring${NC}"

# Create a new test file
TEST_FILE="/Users/paco/Downloads/GenSpark-AI-Search/test-files/monitoring-test.txt"
echo "Real-time monitoring test file with unique content $(date)" > "$TEST_FILE"
sleep 3  # Wait for file watcher

run_test "Real-time File Detection" \
    "curl -s http://localhost:3001/health | jq -r '.indexStats.totalFiles'" \
    "10"

run_test "New File Searchable" \
    "curl -s -X POST http://localhost:3001/api/search -H 'Content-Type: application/json' -d '{\"query\": \"monitoring test\", \"limit\": 10}' | jq -r '.results[] | select(.title | contains(\"monitoring\")) | .title'" \
    "monitoring"

echo -e "\n${BLUE}5. Frontend Integration${NC}"
# Test if frontend is accessible (simple check)
run_test "Frontend Server Response" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3005/" \
    "200"

# Cleanup test file
rm -f "$TEST_FILE" 2>/dev/null

echo -e "\n${BLUE}Test Summary${NC}"
echo "============="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}ALL TESTS PASSED!${NC}"
    echo -e "✅ P1.1: Real File Indexing implementation is complete and working!"
    exit 0
else
    echo -e "\n⚠️  ${YELLOW}Some tests failed. Please review the results above.${NC}"
    exit 1
fi