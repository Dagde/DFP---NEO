
import React, { useState } from 'react';

interface AirframeColumnProps {
  resources: string[];
  onReorder: (reorderedResources: string[]) => void;
  rowHeight: number;
  airframeCount: number;
  standbyCount: number;
  ftdCount: number;
  cptCount: number;
}

// Helper to determine resource category
const getCategory = (res: string) => {
    if (res.startsWith('PC-21') || res.startsWith('Deployed')) return 'PC-21';
    if (res.startsWith('STBY')) return 'STBY';
    if (res === 'Duty Sup') return 'Duty Sup';
    if (res.startsWith('FTD')) return 'FTD';
    if (res.startsWith('CPT')) return 'CPT';
    if (res.startsWith('Ground')) return 'Ground';
    return 'Other';
};

const AirframeColumn: React.FC<AirframeColumnProps> = ({ resources, onReorder, rowHeight, airframeCount, standbyCount, ftdCount, cptCount }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    
    const reorderedResources = [...resources];
    const draggedItemContent = reorderedResources.splice(draggedIndex, 1)[0];
    reorderedResources.splice(dropIndex, 0, draggedItemContent);

    onReorder(reorderedResources);
    setDraggedIndex(null);
  };

  return (
    <div className="w-36 bg-gray-800 flex-shrink-0 h-full">
      <ul>
        {resources.map((resource, index) => {
            const isAircraft = index < airframeCount;
            const isStandby = index >= airframeCount && index < airframeCount + standbyCount;
            const isFtd = index >= airframeCount + standbyCount + 1 && index < airframeCount + standbyCount + 1 + ftdCount;
            const isCpt = index >= airframeCount + standbyCount + 1 + ftdCount && index < airframeCount + standbyCount + 1 + ftdCount + cptCount;
            // isGround is the else case

            let resourceText: string;
            let textColorClass = 'text-gray-400';
            let isDraggable = true;

            const resourceNumber = resource.match(/\d+$/)?.[0] || '';

            if (resource === 'Duty Sup') {
                resourceText = 'Duty Sup';
                textColorClass = 'text-amber-300 font-semibold';
                isDraggable = false;
            } else if (resource.startsWith('Deployed')) {
                resourceText = resource; // Show full "Deployed X" text
                textColorClass = 'text-purple-300 font-semibold';
                isDraggable = false;
            } else if (isAircraft) {
                resourceText = 'PC-21';
            } else if (isStandby) {
                resourceText = 'STBY';
                isDraggable = false;
            } else if (isFtd) {
                resourceText = resource.replace(/\s*\d+$/, '');
                textColorClass = 'text-indigo-300';
            } else if (isCpt) {
                resourceText = resource.replace(/\s*\d+$/, '');
                textColorClass = 'text-cyan-300';
                isDraggable = false;
            } else { // isGround
                resourceText = 'Ground';
                isDraggable = false;
            }

            const currentCategory = getCategory(resource);
            const prevCategory = index > 0 ? getCategory(resources[index - 1]) : currentCategory;
            const isCategoryStart = index > 0 && currentCategory !== prevCategory;

            const baseClasses = "flex items-center justify-center text-xs font-mono transition-all duration-150";
            const cursorClass = isDraggable ? 'cursor-move' : '';
            
            // Apply a top border for category starts to align with timeline separators
            const borderClass = isCategoryStart 
                ? 'border-t-2 border-t-gray-500 border-b border-b-gray-700/50' 
                : 'border-b border-gray-700/50';
                
            const hoverClass = isDraggable ? 'hover:bg-gray-700' : '';
            const dragClass = draggedIndex === index ? 'opacity-50 bg-sky-900' : '';
          
          return (
            <li
              key={resource}
              draggable={isDraggable}
              onDragStart={() => isDraggable && handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => isDraggable && handleDrop(index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={`${baseClasses} ${textColorClass} ${cursorClass} ${borderClass} ${hoverClass} ${dragClass}`}
              style={{ height: rowHeight }}
            >
              {(resource === 'Duty Sup' || resource.startsWith('Deployed')) ? (
                  <div className="w-full text-center">
                      <span>{resourceText}</span>
                  </div>
              ) : (
                  <div className="relative w-full text-center">
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-500">{resourceNumber}</span>
                      <span>{resourceText}</span>
                  </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  );
};

export default AirframeColumn;
