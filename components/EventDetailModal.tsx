import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ScheduleEvent } from '../types';

interface EventDetailModalProps {
    event: ScheduleEvent;
    onSave: (events: ScheduleEvent[]) => void;
    onClose: () => void;
    isInstructor?: boolean;
    currentUserName?: string;
    isAddingTile?: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
    event,
    onSave,
    onClose,
    isInstructor = false,
    currentUserName,
    isAddingTile = false
}) => {
    const [flightNumber, setFlightNumber] = useState(event.flightNumber || '');
    const [startTime, setStartTime] = useState(event.startTime || 480);
    const [duration, setDuration] = useState(event.duration || 60);
    const [area, setArea] = useState(event.area || 'A');
    const [instructor, setInstructor] = useState(event.instructor || '');
    const [student, setStudent] = useState(event.student || '');
    const [formationType, setFormationType] = useState('MERL');
    const [aircraftCount, setAircraftCount] = useState(2);

    const handleSave = () => {
        console.log('Saving flight:', flightNumber);
        
        // Create normal flight events
        if (flightNumber !== 'SCT FORM') {
            const normalEvent: ScheduleEvent = {
                ...event,
                id: event.id,
                type: event.type,
                flightNumber,
                startTime,
                duration,
                area: event.type === 'flight' ? area : undefined,
                instructor,
                student,
                pilot: instructor.split(' ')[1] || '',
                resourceId: event.resourceId,
            };
            console.log('Saving 1 normal flight');
            onSave([normalEvent]);
            return;
        }
        
        // Create multiple separate flight events with unique IDs
        const events: ScheduleEvent[] = [];
        for (let i = 0; i < aircraftCount; i++) {
            const flightEvent: ScheduleEvent = {
                ...event,
                id: `${event.id}-${i}-${Date.now()}`,
                type: event.type,
                flightNumber: 'SCT FORM',
                startTime,
                duration,
                area: event.type === 'flight' ? area : undefined,
                instructor: `FLTLT Smith`,
                student: `CSE301 - Student${i + 1}`,
                pilot: `${formationType}${i + 1}`,
                resourceId: '', // Empty so findAvailableResourceId assigns to different lines
                formationType: formationType,
                formationPosition: i + 1,
                callsign: `${formationType}${i + 1}`,
                formationId: undefined,
            };
            events.push(flightEvent);
        }
        
        console.log(`Adding ${aircraftCount} separate flight events`);
        onSave(events);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {isAddingTile ? 'Add Event' : 'Edit Event'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Flight Number</label>
                        <select 
                            value={flightNumber} 
                            onChange={(e) => setFlightNumber(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                        >
                            <option value="">Select flight number...</option>
                            {isAddingTile && <option value="SCT FORM">SCT FORM</option>}
                            <option value="BGF1">BGF1</option>
                            <option value="BGF2">BGF2</option>
                            <option value="BGF3">BGF3</option>
                            <option value="BGF4">BGF4</option>
                            <option value="BGF5">BGF5</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Start Time</label>
                        <select 
                            value={startTime} 
                            onChange={(e) => setStartTime(Number(e.target.value))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                        >
                            {Array.from({ length: 96 }, (_, i) => {
                                const hour = Math.floor(i * 15 / 60);
                                const minute = (i * 15) % 60;
                                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                                return <option key={i} value={i * 15}>{time}</option>;
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Duration (min)</label>
                        <input 
                            type="number" 
                            value={duration} 
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                        />
                    </div>

                    {event.type === 'flight' && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Area</label>
                            <select 
                                value={area} 
                                onChange={(e) => setArea(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                            >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>
                        </div>
                    )}

                    {flightNumber !== 'SCT FORM' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-2">Instructor</label>
                                <input 
                                    type="text" 
                                    value={instructor} 
                                    onChange={(e) => setInstructor(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Student</label>
                                <input 
                                    type="text" 
                                    value={student} 
                                    onChange={(e) => setStudent(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                />
                            </div>
                        </>
                    )}

                    {flightNumber === 'SCT FORM' && (
                        <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                            <h3 className="font-semibold">Multiple Flight Events</h3>
                            <div>
                                <label className="block text-sm font-medium mb-2">Callsign Prefix</label>
                                <select value={formationType} onChange={e => setFormationType(e.target.value)}>
                                    <option value="MERL">MERL</option>
                                    <option value="VANG">VANG</option>
                                    <option value="COBR">COBR</option>
                                    <option value="HAWK">HAWK</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Number of Flights to Add</label>
                                <select value={aircraftCount} onChange={e => setAircraftCount(parseInt(e.target.value))}>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                </select>
                            </div>
                            <p className="text-sm text-gray-400">
                                Will add {aircraftCount} separate flight events with callsigns {formationType}1, {formationType}2, etc.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};