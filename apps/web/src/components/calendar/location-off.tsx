import { CalendarX } from "lucide-react";
import React from "react";

const LocationOff = () => {
  return (
    <div className="relative flex items-center justify-center h-full w-full">
      <div className="text-center max-w-md p-8">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-amber-100 mb-4">
          <CalendarX className="size-8 text-amber-800" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Location Closed
        </h2>
        <p className="text-gray-600 mb-4">Location is closed.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Employees Working:</span>
            <span className="font-medium text-gray-900">0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Appointments:</span>
            <span className="font-medium text-gray-900">0</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">Open Monday - Friday</p>
      </div>
    </div>
  );
};

export default LocationOff;
