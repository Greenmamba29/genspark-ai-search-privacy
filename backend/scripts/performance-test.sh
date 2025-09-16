#!/bin/bash
set -e

echo "Starting performance regression test..."

# Start backend
npm run dev &
BACKEND_PID=$!
sleep 10

# Run standardized test
START_TIME=$(date +%s)
cp ../test-files/technical-overview.md ../test-files/perf-ci-test.md

# Wait for processing
while ! grep -q "perf-ci-test.md" logs/application.log; do
  sleep 0.5
  if [ $(($(date +%s) - START_TIME)) -gt 30 ]; then
    echo "FAIL: Processing timeout"
    kill $BACKEND_PID
    exit 1
  fi
done

# Extract metrics
PROCESSING_TIME=$(grep "perf-ci-test.md" logs/application.log | grep "Processing Time" | tail -1 | awk '{print $NF}' | sed 's/ms//')
MEMORY_USAGE=$(ps -o rss= $BACKEND_PID)

echo "Processing Time: ${PROCESSING_TIME}ms"
echo "Memory Usage: ${MEMORY_USAGE}KB"

# Performance thresholds
if (( $(echo "$PROCESSING_TIME > 100" | bc -l) )); then
  echo "WARN: Processing time exceeded 100ms threshold"
fi

if (( MEMORY_USAGE > 102400 )); then  # 100MB
  echo "WARN: Memory usage exceeded 100MB threshold"
fi

# Cleanup
kill $BACKEND_PID
rm ../test-files/perf-ci-test.md

echo "Performance test completed successfully"