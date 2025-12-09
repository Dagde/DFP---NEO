# Build Results Analysis Enhancement - Possible vs Scheduled Events

## Phase 1: Extend Analysis Data Structure
- [x] Update BuildAnalysis interface in App.tsx to include:
  - [x] possibleEvents count per course (from Next Event + Plus-One lists)
  - [x] schedulingEfficiency percentage per course
  - [x] limitingFactors object tracking why events weren't scheduled
- [x] Add helper function to count possible events from Next Event lists

## Phase 2: Implement Limiting Factor Detection
- [ ] Track limiting factors during build process:
  - [ ] Insufficient instructors available
  - [ ] No aircraft slots available
  - [ ] No FTD slots available
  - [ ] No CPT slots available
  - [ ] Trainee daily limit reached
  - [ ] Instructor daily limit reached
  - [ ] No suitable time slots (turnaround conflicts)
- [ ] Store limiting factors in BuildAnalysis data structure

## Phase 3: Update Analysis Function
- [ ] Modify analyzeBuildResults() to:
  - [ ] Count possible events from Next Event lists per course
  - [ ] Calculate scheduling efficiency (scheduled/possible)
  - [ ] Aggregate limiting factors per course
  - [ ] Generate insights about bottlenecks

## Phase 4: Update UI Display
- [x] Modify priority-analysis.html to show:
  - [x] "Possible" column in course distribution table
  - [x] "Scheduled" column (existing eventCount)
  - [x] "Efficiency %" column
  - [x] Limiting factors breakdown per course
  - [x] Visual indicators for bottlenecks (color coding)
  - [x] Summary of overall limiting factors

## Phase 5: Testing & Verification
- [x] Test with various build scenarios
- [ ] Verify limiting factor detection accuracy (Note: Limiting factors currently initialized to 0 - Phase 2 implementation needed)
- [x] Ensure UI displays correctly
- [x] Build and deploy changes

## Phase 6: Documentation
- [ ] Update implementation documentation
- [ ] Commit and push all changes