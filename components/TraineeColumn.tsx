import React from 'react';

interface TraineeColumnProps {
  trainees: string[];
  rowHeight: number;
  onRowEnter?: (index: number) => void;
  onRowLeave?: () => void;
  onTraineeClick?: (traineeFullName: string) => void;
  onRowRef?: (fullName: string, element: HTMLLIElement | null) => void;
}

const TraineeColumn: React.FC<TraineeColumnProps> = ({ trainees, rowHeight, onRowEnter, onRowLeave, onTraineeClick, onRowRef }) => {

  const parseTraineeName = (fullName: string) => {
    const parts = fullName.split(' – ');
    return {
      name: parts[0] || fullName,
      course: parts[1] || '',
    };
  };

  return (
    <div className="w-40 bg-gray-800 flex-shrink-0 h-full">
      <ul>
        {trainees.map((fullName, index) => {
          const { name, course } = parseTraineeName(fullName);
          return (
            <li
              key={fullName}
              ref={(el) => onRowRef?.(fullName, el)}
              className={`flex items-center justify-start pl-3 text-xs transition-colors duration-150 text-gray-300 border-b border-gray-700/50 ${onTraineeClick ? 'cursor-pointer hover:bg-gray-700' : ''}`}
              style={{ height: rowHeight }}
              onMouseEnter={() => onRowEnter?.(index)}
              onMouseLeave={() => onRowLeave?.()}
              onClick={() => onTraineeClick?.(fullName)}
            >
              <div className="flex flex-col">
                <span className="truncate font-medium leading-tight">{name}</span>
                {course && <span className="font-mono text-gray-500 leading-tight">{course}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TraineeColumn;