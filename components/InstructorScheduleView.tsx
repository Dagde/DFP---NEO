

import React, { useState, useRef, useEffect, useCallback, useMemo, MouseEvent } from 'react';
import { ScheduleEvent, SyllabusItemDetail, InstructorRank, Trainee } from '../types';
import AuditButton from './AuditButton';
import FlightTile from './FlightTile';
import PersonnelColumn from './PersonnelColumn';

interface InstructorScheduleViewProps {
  date: string;
  onDateChange: (increment: number) => void;
  events: ScheduleEvent[];
  instructors: { name: string; rank: InstructorRank }[];
  traineesData: Trainee[];
  onSelectEvent: (event: ScheduleEvent) => void;
  onUpdateEvent: (updates: { eventId: string, newStartTime: number }[]) => void;
  zoomLevel: number;
  daylightTimes: { firstLight: string | null; lastLight: string | null };
  personnelData: Map<string, { callsignPrefix: string; callsignNumber: number }>;
  seatConfigs: Map<string, string>;
  syllabusDetails: SyllabusItemDetail[];
  conflictingEventIds: Set<string>;
  showValidation: boolean;
  unavailabilityConflicts: Map<string, string[]>;
  onSelectInstructor: (instructorName: string) => void;
}

const PIXELS_PER_HOUR = 200;
const ROW_HEIGHT = 32;
const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const PERSONNEL_COLUMN_WIDTH = 160;
const TIME_HEADER_HEIGHT = 40;

// --- Utility functions ---
const getPersonnel = (event: ScheduleEvent): string[] => {
    const personnel = [];
    if (event.flightType === 'Solo') {
        if (event.pilot) personnel.push(event.pilot);
    } else {
        if (event.instructor) personnel.push(event.instructor);
        if (event.student) personnel.push(event.student);
    }
    return personnel;
};


const InstructorScheduleView: React.FC<InstructorScheduleViewProps> = ({ date, onDateChange, events, instructors, onSelectEvent, onUpdateEvent, zoomLevel, daylightTimes, personnelData, seatConfigs, syllabusDetails, conflictingEventIds, showValidation, unavailabilityConflicts, onSelectInstructor, traineesData }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [draggingState, setDraggingState] = useState<{
    mainEventId: string;
    xOffset: number;
    initialPositions: Map<string, { startTime: number, rowIndex: number }>;
  } | null>(null);

  const [realtimeConflict, setRealtimeConflict] = useState<{ conflictingEventId: string; conflictedPersonName: string; } | null>(null);
  const scheduleGridRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const prevZoomLevelRef = useRef(zoomLevel);
  const didDragRef = useRef(false);

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const formattedDisplayDate = useMemo(() => {
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC'
    });
  }, [date]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    if (isInitialLoad.current) {
      // On initial load, scroll to 8 AM
      const defaultStartHour = 8;
      const initialScrollLeft = (defaultStartHour - START_HOUR) * PIXELS_PER_HOUR * zoomLevel;
      scrollContainer.scrollLeft = initialScrollLeft;
      isInitialLoad.current = false;
    } else {
        const prevZoom = prevZoomLevelRef.current;
        if (prevZoom === zoomLevel) return; // No change in zoom

        // Zoom from center
        const { scrollLeft, clientWidth } = scrollContainer;
        const timeAtCenterInHoursFromStart = (scrollLeft + clientWidth / 2) / (PIXELS_PER_HOUR * prevZoom);
        const newScrollLeft = (timeAtCenterInHoursFromStart * PIXELS_PER_HOUR * zoomLevel) - (clientWidth / 2);
        scrollContainer.scrollLeft = newScrollLeft;
    }
    
    prevZoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  const findConflict = useCallback((eventsToCheck: ScheduleEvent[], existingEvents: ScheduleEvent[]): { conflictingEvent: ScheduleEvent, personName: string } | null => {
    for (const eventToCheck of eventsToCheck) {
        const s1 = syllabusDetails.find(d => d.id === eventToCheck.flightNumber);
        if (!s1) continue;

        const e1StartWithPre = eventToCheck.startTime - s1.preFlightTime;
        const e1EndWithPost = eventToCheck.startTime + eventToCheck.duration + s1.postFlightTime;

        for (const existingEvent of existingEvents) {
            const s2 = syllabusDetails.find(d => d.id === existingEvent.flightNumber);
            if (!s2) continue;

            const e2StartWithPre = existingEvent.startTime - s2.preFlightTime;
            const e2EndWithPost = existingEvent.startTime + existingEvent.duration + s2.postFlightTime;
            
            if (e1StartWithPre < e2EndWithPost && e1EndWithPost > e2StartWithPre) {
                const personnelToCheck = getPersonnel(eventToCheck);
                const existingPersonnel = getPersonnel(existingEvent);
                
                const conflictedPersonName = personnelToCheck.find(p => existingPersonnel.includes(p));

                if (conflictedPersonName) {
                    return {
                        conflictingEvent: existingEvent,
                        personName: conflictedPersonName
                    };
                }
            }
        }
    }
    return null;
}, [syllabusDetails]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, event: ScheduleEvent) => {
    if (e.button !== 0) return;
    didDragRef.current = false;
    document.body.classList.add('no-select');
    const tileElement = e.currentTarget;
    const rect = tileElement.getBoundingClientRect();

    const initialPositions = new Map<string, { startTime: number, rowIndex: number }>();
    const instructorName = event.instructor || '';
    const rowIndex = instructors.findIndex(i => i.name === instructorName);
    
    if (rowIndex !== -1) {
        initialPositions.set(event.id, { startTime: event.startTime, rowIndex });
    }

    if (initialPositions.size > 0) {
        setDraggingState({
            mainEventId: event.id,
            xOffset: (e.clientX - rect.left) / zoomLevel,
            initialPositions,
        });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingState || !scheduleGridRef.current) return;
    didDragRef.current = true;

    const gridRect = scheduleGridRef.current.getBoundingClientRect();
    const xInGrid = e.clientX - gridRect.left;
    
    const newStartTime = (xInGrid / zoomLevel - draggingState.xOffset) / PIXELS_PER_HOUR + START_HOUR;

    const eventData = events.find(ev => ev.id === draggingState.mainEventId);
    if (!eventData) return;

    let clampedStartTime = newStartTime;
    if (clampedStartTime < START_HOUR) clampedStartTime = START_HOUR;
    if ((clampedStartTime + eventData.duration) > END_HOUR) clampedStartTime = END_HOUR - eventData.duration;

    const snappedStartTime = Math.round(clampedStartTime * 12) / 12;

    const proposedEvent = { ...eventData, startTime: snappedStartTime };
    const otherEvents = events.filter(event => event.id !== draggingState.mainEventId);
    const conflict = findConflict([proposedEvent], otherEvents);

    setRealtimeConflict(conflict ? { 
        conflictingEventId: conflict.conflictingEvent.id, 
        conflictedPersonName: conflict.personName 
    } : null);
    
    const hasChanged = snappedStartTime !== eventData.startTime;
    if (hasChanged) {
        onUpdateEvent([{
            eventId: draggingState.mainEventId,
            newStartTime: snappedStartTime,
        }]);
    }
  };


  const handleMouseUp = () => {
      document.body.classList.remove('no-select');
      setDraggingState(null);
      setRealtimeConflict(null);
      setTimeout(() => { didDragRef.current = false; }, 0);
  };

  const totalRows = instructors.length;
  const timelineWidth = TOTAL_HOURS * PIXELS_PER_HOUR * zoomLevel;
  const containerHeight = totalRows * ROW_HEIGHT;

  const timeStringToHours = useCallback((timeString: string | null): number | null => {
    if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + minutes / 60;
  }, []);

  const renderTimeHeaders = () => {
    const markers = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) {
        markers.push(
            <div key={i} className="absolute h-full top-0 text-xs text-gray-500 flex items-center" style={{ left: (i - START_HOUR) * PIXELS_PER_HOUR * zoomLevel }}>
                <span className="-translate-x-1/2">{`${String(i).padStart(2, '0')}:00`}</span>
            </div>
        );
    }
    
    const firstLightHour = timeStringToHours(daylightTimes.firstLight);
    const lastLightHour = timeStringToHours(daylightTimes.lastLight);

    if (firstLightHour !== null) {
        const flLeft = (firstLightHour - START_HOUR) * PIXELS_PER_HOUR * zoomLevel;
        markers.push(
            <div key="fl-label" className="absolute h-full top-0 text-xs text-white font-bold flex items-center" style={{ left: flLeft }}>
                <span className="-translate-x-1/2">{`FL ${daylightTimes.firstLight}`}</span>
            </div>
        );
    }

    if (lastLightHour !== null) {
        const llLeft = (lastLightHour - START_HOUR) * PIXELS_PER_HOUR * zoomLevel;
        markers.push(
            <div key="ll-label" className="absolute h-full top-0 text-xs text-white font-bold flex items-center" style={{ left: llLeft }}>
                <span className="-translate-x-1/2">{`LL ${daylightTimes.lastLight}`}</span>
            </div>
        );
    }

    return markers;
  };

  const renderGridLines = () => {
    const lines = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) {
        lines.push(
            <div key={`v-${i}`} className="absolute h-full top-0" style={{ left: (i - START_HOUR) * PIXELS_PER_HOUR * zoomLevel }}>
                <div className="w-px h-full bg-gray-700/50"></div>
            </div>
        );
        if (i < END_HOUR) {
            lines.push(
                <div key={`v-${i}-30`} className="absolute h-full top-0" style={{ left: (i - START_HOUR + 0.5) * PIXELS_PER_HOUR * zoomLevel }}>
                    <div className="w-px h-full bg-gray-700/25"></div>
                </div>
            );
        }
    }
    for (let i = 1; i <= totalRows; i++) {
      lines.push(
        <div key={`h-${i}`} className="absolute left-0 w-full bg-gray-700/25" style={{ top: i * ROW_HEIGHT, height: '1px' }}></div>
      );
    }
    return lines;
  };

  const renderDaylightLines = () => {
    const firstLightHour = timeStringToHours(daylightTimes.firstLight);
    const lastLightHour = timeStringToHours(daylightTimes.lastLight);
    
    return (
        <>
            {firstLightHour !== null && (
                <div
                    className="absolute top-0 h-full z-[5] pointer-events-none border-l border-dashed border-white/30"
                    style={{ left: `${(firstLightHour - START_HOUR) * PIXELS_PER_HOUR * zoomLevel}px` }}
                />
            )}
            {lastLightHour !== null && (
                 <div
                    className="absolute top-0 h-full z-[5] pointer-events-none border-l border-dashed border-white/30"
                    style={{ left: `${(lastLightHour - START_HOUR) * PIXELS_PER_HOUR * zoomLevel}px` }}
                />
            )}
        </>
    );
  };
  
  const renderNightShade = () => {
    const firstLightHour = timeStringToHours(daylightTimes.firstLight);
    const lastLightHour = timeStringToHours(daylightTimes.lastLight);
    const shades = [];
    if (firstLightHour !== null && firstLightHour > START_HOUR) {
        const width = (firstLightHour - START_HOUR) * PIXELS_PER_HOUR * zoomLevel;
        shades.push(
            <div
                key="night-shade-morning"
                className="absolute top-0 left-0 h-full bg-white/5 pointer-events-none z-[1]"
                style={{ width: `${width}px` }}
            />
        );
    }
    if (lastLightHour !== null && lastLightHour < END_HOUR) {
        const left = (lastLightHour - START_HOUR) * PIXELS_PER_HOUR * zoomLevel;
        const width = (END_HOUR - lastLightHour) * PIXELS_PER_HOUR * zoomLevel;
        shades.push(
            <div
                key="night-shade-evening"
                className="absolute top-0 h-full bg-white/5 pointer-events-none z-[1]"
                style={{ left: `${left}px`, width: `${width}px` }}
            />
        );
    }
    return <>{shades}</>;
  };
  
  const renderCurrentTimeIndicator = () => {
    // Get timezone offset from localStorage
    const timezoneOffset = parseFloat(localStorage.getItem('timezoneOffset') || '0');
    const offsetMs = timezoneOffset * 60 * 60 * 1000;
    const adjustedDate = new Date(Date.now() + offsetMs);
    const todayStr = `${adjustedDate.getUTCFullYear()}-${String(adjustedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(adjustedDate.getUTCDate()).padStart(2, '0')}`;
    if (date !== todayStr) {
        return null;
    }
    const now = currentTime;
    const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    if (currentHour < START_HOUR || currentHour > END_HOUR) return null;
    const leftPosition = (currentHour - START_HOUR) * PIXELS_PER_HOUR * zoomLevel;
    return (
        <div 
            className="absolute top-0 h-full z-[30] pointer-events-none"
            style={{ left: `${leftPosition}px` }}
        >
            <div className="w-0.5 h-full bg-white animate-pulse"></div>
            <div 
                className="absolute -top-2.5 -translate-x-1/2 w-0 h-0"
                style={{
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '7px solid white',
                }}
            />
        </div>
    );
  };

  const renderPrePostBars = () => {
    const bars: React.ReactElement[] = [];
  
    instructors.forEach((instructor, rowIndex) => {
      const instructorEvents = events
        .filter(e => e.instructor === instructor.name || (e.flightType === 'Dual' && e.student === instructor.name))
        .sort((a, b) => a.startTime - b.startTime); // Already sorted
  
      for (let i = 0; i < instructorEvents.length; i++) {
        const currentEvent = instructorEvents[i];
        const prevEvent = instructorEvents[i - 1];
        const nextEvent = instructorEvents[i + 1];
  
        const currentSyllabus = syllabusDetails.find(d => d.id === currentEvent.flightNumber);
        if (!currentSyllabus) continue;
  
        // Helper to render a single bar
        const renderBar = (duration: number, left: number, isConflicting: boolean, key: string) => {
          const barWidth = duration * PIXELS_PER_HOUR * zoomLevel;
          const barHeight = ROW_HEIGHT * 0.25;
          const barTop = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - barHeight) / 2;
  
          const baseClassName = "absolute pointer-events-none z-20 rounded-full border shadow-lg backdrop-blur-sm transition-colors duration-200";
          const className = `${baseClassName} ${isConflicting ? 'bg-red-500/50 border-red-400/30' : 'bg-gray-400/50 border-white/30'}`;
  
          const style: React.CSSProperties = { left: `${left}px`, top: `${barTop}px`, width: `${barWidth}px`, height: `${barHeight}px` };
          
          bars.push(<div key={key} style={style} className={className} />);
        };
  
        // --- Pre-Bar Logic ---
        let preBarIsConflicting = false;
        if (prevEvent) {
          const prevSyllabus = syllabusDetails.find(d => d.id === prevEvent.flightNumber);
          if (prevSyllabus) {
            const prevPostBarEndTime = prevEvent.startTime + prevEvent.duration + prevSyllabus.postFlightTime;
            const currentPreBarStartTime = currentEvent.startTime - currentSyllabus.preFlightTime;
            if (prevPostBarEndTime > currentPreBarStartTime) {
              preBarIsConflicting = true;
            }
          }
        }
        if (currentSyllabus.preFlightTime > 0) {
          const preBarLeft = (currentEvent.startTime - currentSyllabus.preFlightTime - START_HOUR) * PIXELS_PER_HOUR * zoomLevel;
          renderBar(currentSyllabus.preFlightTime, preBarLeft, preBarIsConflicting, `${currentEvent.id}-pre`);
        }
  
        // --- Post-Bar Logic ---
        let postBarIsConflicting = false;
        if (nextEvent) {
          const nextSyllabus = syllabusDetails.find(d => d.id === nextEvent.flightNumber);
          if (nextSyllabus) {
            const postBarEndTime = currentEvent.startTime + currentEvent.duration + currentSyllabus.postFlightTime;
            const nextPreBarStartTime = nextEvent.startTime - nextSyllabus.preFlightTime;
            if (postBarEndTime > nextPreBarStartTime) {
              postBarIsConflicting = true;
            }
          }
        }
        if (currentSyllabus.postFlightTime > 0) {
          const postBarLeft = (currentEvent.startTime + currentEvent.duration - START_HOUR) * PIXELS_PER_HOUR * zoomLevel;
          renderBar(currentSyllabus.postFlightTime, postBarLeft, postBarIsConflicting, `${currentEvent.id}-post`);
        }
      }
    });
  
    return <>{bars}</>;
  };

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-auto relative bg-gray-900">
      <div 
        // This is the new wrapper div that explicitly sets the total size of the content
        // and acts as the grid container for its children.
        style={{
          width: `${PERSONNEL_COLUMN_WIDTH + timelineWidth}px`,
          height: `${TIME_HEADER_HEIGHT + containerHeight}px`,
          display: 'grid',
          gridTemplateColumns: `${PERSONNEL_COLUMN_WIDTH}px 1fr`,
          gridTemplateRows: `${TIME_HEADER_HEIGHT}px 1fr`,
        }}
      >
        <div className="sticky top-0 left-0 z-40 bg-gray-800 border-r border-b border-gray-700 p-1">
            <div className="bg-gray-700 rounded-md w-full h-full flex items-center justify-center px-2 space-x-2">
                <button onClick={() => onDateChange(-1)} className="p-1 rounded-full hover:bg-gray-600 text-white flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </button>
                <span className="flex-grow min-w-0 text-center font-semibold text-white cursor-default truncate">{formattedDisplayDate}</span>
                <button onClick={() => onDateChange(1)} className="p-1 rounded-full hover:bg-gray-600 text-white flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                </button>
            </div>
        </div>
        
        <div className="sticky top-0 z-20 bg-gray-800 border-b border-gray-700"> {/* Removed minWidth: timelineWidth */}
            <div className="relative" style={{ width: timelineWidth, height: TIME_HEADER_HEIGHT }}>
                {renderTimeHeaders()}
            </div>
        </div>
        
        <div className="sticky left-0 z-30 bg-gray-800 border-r border-gray-700"> {/* Removed minHeight: containerHeight */}
          <PersonnelColumn
            personnel={instructors}
            rowHeight={ROW_HEIGHT}
            onPersonClick={onSelectInstructor}
          />
        </div>

        <div
            ref={scheduleGridRef}
            className="relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {renderGridLines()}
            {renderNightShade()}
            {renderDaylightLines()}
            {renderCurrentTimeIndicator()}
            {showValidation && renderPrePostBars()}
            {instructors.flatMap((instructor, rowIndex) => {
              const instructorEvents = events.filter(event => 
                event.instructor === instructor.name || 
                (event.flightType === 'Dual' && event.student === instructor.name)
              ).sort((a, b) => a.startTime - b.startTime);
              
              return instructorEvents.map(event => {
                const isDraggedTile = !!(draggingState && draggingState.mainEventId === event.id);
                const isStationaryConflictTile = event.id === realtimeConflict?.conflictingEventId;
                const isConflicting =
                  (showValidation && conflictingEventIds.has(event.id)) ||
                  isStationaryConflictTile ||
                  (isDraggedTile && !!realtimeConflict);
                
                const unavailabilityConflictData = unavailabilityConflicts.get(event.id);
                const isUnavailability = !!unavailabilityConflictData;
                const unavailablePeople = unavailabilityConflictData || [];
                
                let personToHighlight = null;
                if (realtimeConflict) {
                    const personnelOnThisTile = getPersonnel(event);
                    if ((isDraggedTile || isStationaryConflictTile) && personnelOnThisTile.includes(realtimeConflict.conflictedPersonName)) {
                        personToHighlight = realtimeConflict.conflictedPersonName;
                    }
                }
                
                return (
                  <FlightTile
                    key={`${event.id}-${instructor.name}`}
                    event={event}
                    traineesData={traineesData}
                    onSelectEvent={() => { if (!didDragRef.current) onSelectEvent(event); }}
                    onMouseDown={(e) => handleMouseDown(e, event)}
                    onMouseEnter={() => {}}
                    onMouseLeave={() => {}}
                    pixelsPerHour={PIXELS_PER_HOUR * zoomLevel}
                    rowHeight={ROW_HEIGHT}
                    startHour={START_HOUR}
                    row={rowIndex}
                    isDragging={isDraggedTile}
                    isConflicting={isConflicting}
                    isUnavailabilityConflict={isUnavailability}
                    unavailablePersonnel={unavailablePeople}
                    conflictedPersonnelName={personToHighlight}
                    personnelData={personnelData}
                    seatConfigs={seatConfigs}
                    isDraggable={true}
                    currentTime={currentTime}
                  />
                );
              });
            })}
        </div>
      </div>
    </div>
  );
};

export default InstructorScheduleView;
