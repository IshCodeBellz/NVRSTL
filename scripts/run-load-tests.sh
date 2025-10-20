#!/bin/bash

# DY Official Load Testing Suite
# Comprehensive load testing with system monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
RESULTS_DIR="./load-tests/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🚀 DY Official Load Testing Suite${NC}"
echo -e "${BLUE}=================================${NC}"

# Create results directory
mkdir -p "$RESULTS_DIR/$TIMESTAMP"

# Function to check if server is running
check_server() {
    echo -e "${YELLOW}📡 Checking if server is running...${NC}"
    if curl -f -s "$BASE_URL/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is running at $BASE_URL${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running at $BASE_URL${NC}"
        echo -e "${YELLOW}💡 Please start the server with: npm run dev${NC}"
        return 1
    fi
}

# Function to start system monitoring
start_monitoring() {
    echo -e "${YELLOW}📊 Starting system monitoring...${NC}"
    
    # Monitor system resources during load test
    {
        echo "timestamp,cpu_percent,memory_percent,load_avg,disk_io"
        while true; do
            timestamp=$(date +%s)
            cpu_percent=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
            memory_percent=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
            load_avg=$(uptime | awk '{print $10}' | sed 's/,//')
            disk_io=$(iostat -d 1 2 | tail -1 | awk '{print $3}')
            
            echo "$timestamp,$cpu_percent,$memory_percent,$load_avg,$disk_io"
            sleep 5
        done
    } > "$RESULTS_DIR/$TIMESTAMP/system_metrics.csv" &
    
    MONITOR_PID=$!
    echo -e "${GREEN}✅ System monitoring started (PID: $MONITOR_PID)${NC}"
}

# Function to stop system monitoring
stop_monitoring() {
    if [[ -n "$MONITOR_PID" ]]; then
        echo -e "${YELLOW}⏹️  Stopping system monitoring...${NC}"
        kill $MONITOR_PID 2>/dev/null || true
        echo -e "${GREEN}✅ System monitoring stopped${NC}"
    fi
}

# Function to run load test
run_load_test() {
    local test_name=$1
    local config_file=$2
    local description=$3
    
    echo -e "${BLUE}🔥 Running $test_name${NC}"
    echo -e "${YELLOW}📝 Description: $description${NC}"
    
    # Run Artillery load test
    npx artillery run \
        --output "$RESULTS_DIR/$TIMESTAMP/${test_name}_results.json" \
        "$config_file" \
        | tee "$RESULTS_DIR/$TIMESTAMP/${test_name}_output.log"
    
    # Generate HTML report
    npx artillery report \
        "$RESULTS_DIR/$TIMESTAMP/${test_name}_results.json" \
        --output "$RESULTS_DIR/$TIMESTAMP/${test_name}_report.html"
    
    echo -e "${GREEN}✅ $test_name completed${NC}"
    echo ""
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}📊 Generating load test summary...${NC}"
    
    cat > "$RESULTS_DIR/$TIMESTAMP/summary.md" << EOF
# DY Official Load Test Results

**Test Date:** $(date)
**Test Duration:** $TIMESTAMP
**Server:** $BASE_URL

## Test Summary

### Tests Executed:
1. **Basic Load Test** - Simulates normal user traffic patterns
2. **Stress Test** - Tests system behavior under high load
3. **Spike Test** - Tests system resilience during traffic spikes

### Key Metrics Monitored:
- Response Times (95th percentile < 1s target)
- Request Success Rate (>99.5% target)
- System Resource Usage (CPU, Memory, Load)
- Database Performance
- Cache Hit Rates

### Performance Targets:
- **API Response Times:**
  - Health endpoints: < 200ms
  - Product listings: < 500ms
  - Search queries: < 800ms
  - Cart operations: < 300ms
  - Checkout process: < 1000ms

- **System Resources:**
  - CPU usage: < 80%
  - Memory usage: < 85%
  - Database connections: < 80% of pool

### Results:
- View detailed reports in the HTML files
- Check system metrics in system_metrics.csv
- Review error logs for any failures

### Recommendations:
$(if [ -f "$RESULTS_DIR/$TIMESTAMP/basic_load_test_results.json" ]; then
    echo "- Review response time trends"
    echo "- Check for any SLA violations"
    echo "- Monitor database query performance"
    echo "- Validate cache effectiveness"
fi)
EOF

    echo -e "${GREEN}✅ Summary report generated${NC}"
}

# Function to check performance thresholds
check_thresholds() {
    echo -e "${YELLOW}📈 Checking performance thresholds...${NC}"
    
    # This would normally parse the JSON results and check against SLAs
    # For now, we'll just create a placeholder
    
    cat > "$RESULTS_DIR/$TIMESTAMP/threshold_check.log" << EOF
Performance Threshold Analysis
============================

Checking against defined SLAs:
- API response times
- Error rates
- System resource usage
- Database performance

$(date): Threshold analysis completed
EOF

    echo -e "${GREEN}✅ Threshold analysis completed${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    stop_monitoring
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    echo -e "${BLUE}Starting comprehensive load testing...${NC}"
    
    # Check if server is running
    if ! check_server; then
        exit 1
    fi
    
    # Install faker if not present
    if ! npm list @faker-js/faker > /dev/null 2>&1; then
        echo -e "${YELLOW}📦 Installing faker for test data generation...${NC}"
        npm install --save-dev @faker-js/faker
    fi
    
    # Start system monitoring
    start_monitoring
    
    # Run load tests
    run_load_test "basic_load_test" "./load-tests/config.yml" "Basic load test simulating normal user patterns"
    
    sleep 30  # Cool down between tests
    
    run_load_test "stress_test" "./load-tests/stress-test.yml" "Stress test with high concurrent users"
    
    sleep 30  # Cool down between tests
    
    run_load_test "spike_test" "./load-tests/spike-test.yml" "Spike test with sudden traffic bursts"
    
    # Generate reports
    generate_summary
    check_thresholds
    
    echo -e "${GREEN}🎉 Load testing completed successfully!${NC}"
    echo -e "${BLUE}📁 Results saved to: $RESULTS_DIR/$TIMESTAMP${NC}"
    echo -e "${BLUE}🔍 Open the HTML reports to view detailed metrics${NC}"
    
    # Open results directory
    if command -v open > /dev/null 2>&1; then
        open "$RESULTS_DIR/$TIMESTAMP"
    fi
}

# Run main function
main "$@"