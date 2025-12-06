
import React, { useState, useMemo } from 'react';
import { ScheduleEvent } from '../types';
import AuthorisationConfirmation from './AuthorisationConfirmation';
import PinEntryFlyout from './PinEntryFlyout';
import ClearAuthConfirmation from './ClearAuthConfirmation';

interface AuthorisationFlyoutProps {
  event: ScheduleEvent;
  onClose: () => void;
  onAuthorise: (eventId: string, notes: string, role: 'autho' | 'captain', isVerbal: boolean) => void;
  onClearAuth: (eventId: string) => void;
}

const InfoRow: React.FC<{ label: string; value: string | undefined }> = ({ label, value }) => (
    <div className="flex justify-between text-sm py-1 border-b border-gray-700/50">
        <span className="text-gray-400 font-medium">{label}:</span>
        <span className="text-gray-200">{value || 'N/A'}</span>
    </div>
);

const AuthorisationFlyout: React.FC<AuthorisationFlyoutProps> = ({ event, onClose, onAuthorise, onClearAuth }) => {
  const [notes, setNotes] = useState(event.authNotes ?? '');
  const [showAuthConfirmation, setShowAuthConfirmation] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [signingRole, setSigningRole] = useState<'autho' | 'captain' | null>(null);
  const [isVerbal, setIsVerbal] = useState(event.isVerbalAuth ?? false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isClearingAuth, setIsClearingAuth] = useState(false);

  const picName = useMemo(() => event.instructor || event.pilot, [event]);

  const handleSignClick = (role: 'autho' | 'captain') => {
    setSigningRole(role);
    if (role === 'autho') {
        setShowAuthConfirmation(true);
    } else {
        setShowPinEntry(true);
    }
  };

  const handleConfirmAuthForSign = () => {
    setShowAuthConfirmation(false);
    setShowPinEntry(true);
  };

  const handleCancelAuthForSign = () => {
    setShowAuthConfirmation(false);
    setSigningRole(null);
  };
  
  const handleCorrectPinForSign = () => {
    if (signingRole) {
      onAuthorise(event.id, notes, signingRole, isVerbal);
    }
    setShowPinEntry(false);
    setSigningRole(null);
  };
  
  const handleProceedToPinForClear = () => {
    setShowClearConfirmation(false);
    setIsClearingAuth(true);
    setShowPinEntry(true);
  };

  const handleCorrectPinForClear = () => {
    onClearAuth(event.id);
    setShowPinEntry(false);
    setIsClearingAuth(false);
  };

  const handleCancelPin = () => {
    setShowPinEntry(false);
    setSigningRole(null);
    setIsClearingAuth(false);
  };

  const formatAuthTime = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };
  
  const hasAnySignature = !!(event.authoSignedBy ?? event.captainSignedBy);

  // Default PIN for all users is 1111
  const pinForVerification = '1111';

  return (
    <>
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h2 className="text-xl font-bold text-amber-400">Flight Authorisation</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-300" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <fieldset className="p-4 border border-gray-600 rounded-lg">
                        <legend className="px-2 text-sm font-semibold text-gray-300">Flight Summary</legend>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                            <InfoRow label="Syllabus" value={event.flightNumber} />
                            <InfoRow label="Start Time" value={`${Math.floor(event.startTime)}:${String(Math.round((event.startTime % 1) * 60)).padStart(2, '0')}`} />
                            <InfoRow label="Instructor" value={event.instructor} />
                            <InfoRow label="Student" value={event.student} />
                            <InfoRow label="Aircraft" value={event.resourceId} />
                             <InfoRow label="Route" value={`${event.origin}-${event.destination}`} />
                        </div>
                    </fieldset>
                    
                    <div>
                        <label htmlFor="auth-notes" className="block text-sm font-medium text-gray-400">Notes</label>
                        <textarea
                            id="auth-notes"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            disabled={!!(event.authoSignedBy ?? event.captainSignedBy)}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                            placeholder="Enter any authorisation notes here..."
                        />
                    </div>
                    
                    <div className="space-y-3">
                        <div className="p-3 bg-gray-900/50 rounded-lg flex items-center justify-between">
                             <h3 className="font-semibold text-gray-300">Authorising Officer (AUTHO)</h3>
                             {!event.authoSignedBy ? (
                                <button onClick={() => handleSignClick('autho')} className="px-3 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 text-sm font-semibold">Sign</button>
                             ) : (
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-green-400">{event.authoSignedBy}</p>
                                    <p className="text-xs text-gray-400">{formatAuthTime(event.authoSignedAt)}</p>
                                </div>
                             )}
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                             <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-300">Captain (PIC) - {picName}</h3>
                                {!event.captainSignedBy ? (
                                    <button
                                        onClick={() => handleSignClick('captain')}
                                        disabled={!(event.authoSignedBy || event.isVerbalAuth)}
                                        className="px-3 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 text-sm font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                                    >
                                        Sign
                                    </button>
                                ) : (
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-green-400">{event.captainSignedBy}</p>
                                        <p className="text-xs text-gray-400">{formatAuthTime(event.captainSignedAt)}</p>
                                    </div>
                                )}
                             </div>
                             {!event.captainSignedBy && (
                                <label className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-700/50">
                                    <input
                                        type="checkbox"
                                        checked={isVerbal}
                                        onChange={e => setIsVerbal(e.target.checked)}
                                        disabled={!!event.authoSignedBy}
                                        className="h-4 w-4 bg-gray-700 border-gray-600 rounded focus:ring-amber-500 focus:ring-offset-gray-800 accent-amber-500 disabled:accent-gray-600"
                                    />
                                    <span className={`text-sm ${event.authoSignedBy ? 'text-gray-500' : 'text-gray-300'}`}>
                                        Verbal AUTH received. See Notes.
                                    </span>
                                </label>
                             )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700 flex justify-between items-center">
                    <div>
                        {hasAnySignature && (
                            <button
                                onClick={() => setShowClearConfirmation(true)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-semibold"
                            >
                                Clear Auth
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-semibold">Close</button>
                </div>
            </div>
        </div>
        {showAuthConfirmation && <AuthorisationConfirmation onConfirm={handleConfirmAuthForSign} onCancel={handleCancelAuthForSign} />}
        {showPinEntry && (
            <PinEntryFlyout
                correctPin={pinForVerification}
                onConfirm={isClearingAuth ? handleCorrectPinForClear : handleCorrectPinForSign}
                onCancel={handleCancelPin}
            />
        )}
        {showClearConfirmation && <ClearAuthConfirmation onConfirm={handleProceedToPinForClear} onCancel={() => setShowClearConfirmation(false)} />}
    </>
  );
};

export default AuthorisationFlyout;
