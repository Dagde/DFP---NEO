import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScheduleEvent, SyllabusItemDetail, Trainee } from '../types';
import CancelConfirmationFlyout from './CancelConfirmationFlyout';

interface EventDetailModalProps {
  event: ScheduleEvent;
  onClose: () => void;
  onSave: (events: ScheduleEvent[]) => void;
  onDeleteRequest: () => void;
  isEditingDefault?: boolean;
  instructors: string[];
  trainees: string[];
  syllabus: string[];
  syllabusDetails: SyllabusItemDetail[];
  highlightedField?: 'startTime' | 'instructor' | 'student' | null;
  school: 'ESL' | 'PEA';
  traineesData: Trainee[];
  courseColors: { [key: string]: string };
  onNavigateToHateSheet: (trainee: Trainee) => void;
  onNavigateToSyllabus: (flightNumber: string) => void;
  onOpenPt051: (trainee: Trainee) => void;
  onOpenAuth: (event: ScheduleEvent) => void;
  onOpenPostFlight: (event: ScheduleEvent) => void;
  isConflict: boolean;
  onNeoClick: (event: ScheduleEvent) => void;
  oracleAvailableInstructors?: string[];
  oracleAvailableTrainees?: string[];
  oracleNextSyllabusEvent?: SyllabusItemDetail | null;
}

interface CrewMember {
    flightType: 'Dual' | 'Solo';
    instructor: string;
    student: string;
    pilot: string;
    group: string;
    groupTraineeIds: number[]; // Added to track selected IDs
}

const getEventTypeFromSyllabus = (syllabusId: string, syllabusDetails: SyllabusItemDetail[]): 'flight' | 'ftd' | 'ground' => {
    const detail = syllabusDetails.find(d => d.id === syllabusId);
    if (!detail) { // Fallback for items not in syllabus like 'SCT FORM' or if data is missing
        if (syllabusId.includes('FTD')) return 'ftd';
        if (syllabusId.includes('CPT') || syllabusId.includes('MB') || syllabusId.includes('TUT') || syllabusId.includes('QUIZ')) return 'ground';
        return 'flight';
    }
    if (detail.type === 'FTD') return 'ftd';
    if (detail.type === 'Ground School') return 'ground';
    return 'flight';
};


export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose, onSave, onDeleteRequest, isEditingDefault = false, instructors, trainees, syllabus, syllabusDetails, highlightedField, school, traineesData, courseColors, onNavigateToHateSheet, onNavigateToSyllabus, onOpenPt051, onOpenAuth, onOpenPostFlight, isConflict, onNeoClick, oracleAvailableInstructors, oracleAvailableTrainees, oracleNextSyllabusEvent }) => {
    const [isEditing, setIsEditing] = useState(isEditingDefault);
    const [localHighlight, setLocalHighlight] = useState(highlightedField);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const [flightNumber, setFlightNumber] = useState(event.flightNumber);
    const [duration, setDuration] = useState(event.duration);
    const [eventType, setEventType] = useState(event.type);
    const [startTime, setStartTime] = useState(event.startTime);
    const [area, setArea] = useState(event.area || 'A');
    const [aircraftCount, setAircraftCount] = useState(1);
    const [crew, setCrew] = useState<CrewMember[]>([{
        flightType: event.flightType,
        instructor: event.instructor || '',
        student: event.student || '',
        pilot: event.pilot || '',
        group: event.group || '',
        groupTraineeIds: event.groupTraineeIds || [],
    }]);

    const [locationType, setLocationType] = useState(event.locationType || 'Local');
    const [origin, setOrigin] = useState(event.origin || school);
    const [destination, setDestination] = useState(event.destination || school);
    const [formationType, setFormationType] = useState(event.formationType || '');
    
    // Group Selection State
    const [activeGroupInput, setActiveGroupInput] = useState<number | null>(null);
    const groupInputRef = useRef<HTMLDivElement>(null);
    
    // Oracle state
    const [syllabusSelectionError, setSyllabusSelectionError] = useState(false);
    const isOracleContext = !!(oracleAvailableInstructors || oracleAvailableTrainees);

    const formationTypes = school === 'ESL' ? ['MERL', 'VANG'] : ['COBR', 'HAWK'];
    const areas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    const courses = useMemo(() => Object.keys(courseColors).sort(), [courseColors]);
    
    // Group trainees data by course for the flyout
    const coursesStruct = useMemo(() => {
        return courses.map(courseName => ({
            name: courseName,
            trainees: traineesData.filter(t => t.course === courseName).sort((a,b) => a.name.localeCompare(b.name))
        }));
    }, [courses, traineesData]);

    const modalTitle = useMemo(() => {
        if (eventType === 'flight') return 'Flight Details';
        if (eventType === 'ftd') return 'FTD Session Details';
        return 'Ground Event Details';
    }, [eventType]);

    useEffect(() => {
        setFlightNumber(event.flightNumber);
        setDuration(event.duration);
        setEventType(event.type);
        setStartTime(event.startTime);
        setArea(event.area || 'A');
        setAircraftCount(1);
        setCrew([{ 
            flightType: event.flightType, 
            instructor: event.instructor || '', 
            student: event.student || '', 
            pilot: event.pilot || '',
            group: event.group || '',
            groupTraineeIds: event.groupTraineeIds || []
        }]);
        setIsEditing(isEditingDefault);
        setLocalHighlight(highlightedField);
        setLocationType(event.locationType || 'Local');
        setOrigin(event.origin || school);
        setDestination(event.destination || school);
        setFormationType(event.formationType || formationTypes[0]);
    }, [event, isEditingDefault, highlightedField, school]);
    
    useEffect(() => {
        if (locationType === 'Local') {
            setOrigin(school);
            setDestination(school);
        }
    }, [locationType, school]);

    useEffect(() => {
        const isFormation = flightNumber === 'SCT FORM';
        const newSize = isFormation ? aircraftCount : 1;
        if (crew.length !== newSize) {
             const newCrew = Array.from({ length: newSize }, (_, i) => {
                return crew[i] || { flightType: 'Dual' as 'Dual' | 'Solo', instructor: '', student: '', pilot: '', group: '', groupTraineeIds: [] };
            });
            setCrew(newCrew);
        }
    }, [aircraftCount, flightNumber, crew]);

    useEffect(() => {
      setEventType(getEventTypeFromSyllabus(flightNumber, syllabusDetails));
    }, [flightNumber, syllabusDetails]);
    
    // Oracle Logic: Auto-populate syllabus and duration when trainee is selected
    useEffect(() => {
        const traineeName = crew[0]?.student;
        if (isOracleContext && traineeName && oracleAvailableTrainees?.includes(traineeName)) {
            if (oracleNextSyllabusEvent) {
                setFlightNumber(oracleNextSyllabusEvent.id);
                setDuration(oracleNextSyllabusEvent.duration);
            }
        }
    }, [crew[0]?.student, isOracleContext, oracleAvailableTrainees, oracleNextSyllabusEvent]);

    // Close group flyout when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (groupInputRef.current && !groupInputRef.current.contains(e.target as Node)) {
                setActiveGroupInput(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside as any);
        return () => document.removeEventListener("mousedown", handleClickOutside as any);
    }, []);
    
    const personnel = useMemo(() => [...instructors, ...trainees].sort(), [instructors, trainees]);
    
    const handleCrewChange = (index: number, field: keyof CrewMember, value: any) => {
        const newCrew = [...crew];
        const memberToUpdate = { ...newCrew[index] };

        if (field === 'flightType') {
            const flightTypeValue = value as 'Dual' | 'Solo';
            memberToUpdate.flightType = flightTypeValue;

            if (flightTypeValue === 'Solo') {
                memberToUpdate.instructor = '';
                memberToUpdate.student = '';
                memberToUpdate.group = '';
                memberToUpdate.groupTraineeIds = [];
            } else {
                memberToUpdate.pilot = '';
            }
        } else {
            // @ts-ignore - dynamic assignment
            memberToUpdate[field] = value;
        }

        newCrew[index] = memberToUpdate;
        setCrew(newCrew);
        setLocalHighlight(null);
    };
    
    const handleToggleTrainee = (index: number, traineeId: number) => {
        // ... (existing logic)
    };

    const handleToggleCourse = (index: number, courseTrainees: Trainee[]) => {
        // ... (existing logic)
    };

    const handleFlightNumberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newFlightNumber = e.target.value;
        const oldFlightNumber = flightNumber;
        setFlightNumber(newFlightNumber);

        const detail = syllabusDetails.find(d => d.id === newFlightNumber);
        if (detail) {
            setDuration(detail.duration);
        }

        if (newFlightNumber === 'SCT FORM' && !formationType) {
            setFormationType(formationTypes[0]);
        }
        
        if (newFlightNumber !== 'SCT FORM') {
            setAircraftCount(1);
        }
    };

    const handleSave = () => {
        const eventsToSave: ScheduleEvent[] = crew.map((c, index) => {
            let eventColor = event.color;
            // ... (existing color logic)
            return {
                ...event,
                type: eventType,
                flightNumber,
                startTime,
                duration, // Use stateful duration
                area: eventType === 'flight' ? area : undefined,
                color: eventColor,
                flightType: c.flightType,
                instructor: c.instructor,
                student: c.student,
                pilot: c.pilot,
                group: c.group,
                groupTraineeIds: c.groupTraineeIds,
                locationType,
                origin: locationType === 'Local' ? school : origin,
                destination: locationType === 'Local' ? school : destination,
                formationType: flightNumber === 'SCT FORM' ? formationType : undefined,
                formationPosition: flightNumber === 'SCT FORM' ? index + 1 : undefined,
            };
        });
        
        onSave(eventsToSave);
    }

    const timeOptions = useMemo(() => {
        const options = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 5) {
                const totalHours = h + m / 60;
                const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                options.push({ label, value: totalHours });
            }
        }
        return options;
    }, []);

    const traineeObject = useMemo(() => {
        const traineeFullName = event.flightType === 'Dual' ? event.student : event.pilot;
        if (!traineeFullName) return null;
        return traineesData.find(t => t.fullName === traineeFullName) || null;
    }, [event.flightType, event.student, event.pilot, traineesData]);

    const handleSyllabusFocus = () => {
        if (isOracleContext && !crew[0]?.student) {
            setSyllabusSelectionError(true);
            setTimeout(() => setSyllabusSelectionError(false), 2000);
        }
    };
    
    // ... (other handlers)

    const renderCrewFields = (crewMember: CrewMember, index: number) => {
        // ... (existing logic)
        const instructorList = oracleAvailableInstructors || instructors;
        const traineeList = oracleAvailableTrainees || trainees;

        return (
            <div key={index}>
                {/* ... existing fields ... */}
                {crewMember.flightType === 'Dual' ? (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Instructor</label>
                            <select value={crewMember.instructor} onChange={e => handleCrewChange(index, 'instructor', e.target.value)} className={`mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm`}>
                                <option value="" disabled>Select an instructor</option>
                                {instructorList.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Student</label>
                            <select value={crewMember.student} onChange={e => handleCrewChange(index, 'student', e.target.value)} className={`mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm`}>
                                <option value="" disabled>Select a trainee</option>
                                {traineeList.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        {/* ... existing group logic ... */}
                    </>
                ) : (
                     <div>
                        <label className="block text-sm font-medium text-gray-400">Pilot</label>
                        <select value={crewMember.pilot} onChange={e => handleCrewChange(index, 'pilot', e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
                            <option value="" disabled>Select pilot</option>
                            {traineeList.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
                <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl border border-gray-700 transform transition-all animate-fade-in flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                    {/* ... (existing header) ... */}
                    <div className="flex-1 flex flex-row overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-400">Syllabus Item</label>
                                            <select 
                                                value={flightNumber} 
                                                onChange={handleFlightNumberChange} 
                                                onFocus={handleSyllabusFocus}
                                                disabled={isOracleContext && !crew[0]?.student}
                                                className={`mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm disabled:bg-gray-700/50 disabled:cursor-not-allowed`}
                                            >
                                                {isOracleContext && oracleNextSyllabusEvent ? (
                                                    <option value={oracleNextSyllabusEvent.id}>{oracleNextSyllabusEvent.id}</option>
                                                ) : (
                                                    syllabus.map(item => <option key={item} value={item}>{item}</option>)
                                                )}
                                            </select>
                                            {syllabusSelectionError && (
                                                <div className="absolute -bottom-6 left-0 text-xs text-red-400 animate-fade-in">Select a trainee first.</div>
                                            )}
                                        </div>
                                        {/* ... (other fields) ... */}
                                    </div>
                                    {/* ... (other editing fields) ... */}
                                    <div className="space-y-4">{crew.map(renderCrewFields)}</div>
                                </div>
                            ) : (
                                // ... (existing view mode)
                                <></>
                            )}
                        </div>
                        {/* ... (existing button panel) ... */}
                    </div>
                    {/* ... (existing footer) ... */}
                </div>
            </div>
            {/* ... (existing flyouts) ... */}
        </>
    );
};

export default EventDetailModal;
