"use client";

interface TimelineItem {
  status: string;
  label: string;
  time?: string;
  completed: boolean;
}

interface TimelineStepperProps {
  timeline: TimelineItem[];
  currentStatus: string;
}

export default function TimelineStepper({
  timeline,
  currentStatus,
}: TimelineStepperProps) {
  const getStatusIcon = (
    status: string,
    completed: boolean,
    isCurrent: boolean
  ) => {
    if (completed) {
      return (
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    }

    if (isCurrent) {
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      );
    }

    return (
      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
      </div>
    );
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "";
    return new Date(timeString).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Remove duplicates and ensure proper order
  const uniqueTimeline = timeline.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.status === item.status)
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Order Status
      </h3>

      {/* Horizontal Stepper */}
      <div className="relative bg-white p-4 rounded-lg border border-gray-200">
        {/* Progress Line Background */}
        <div className="absolute top-6 left-4 right-4 h-0.5 bg-gray-200"></div>

        {/* Progress Line Active */}
        <div
          className="absolute top-6 left-4 h-0.5 bg-green-500 transition-all duration-500"
          style={{
            width: `calc(${
              (uniqueTimeline.filter((item) => item.completed).length /
                uniqueTimeline.length) *
              100
            }% - 2rem)`,
          }}
        ></div>

        {/* Steps */}
        <div className="relative flex justify-between items-start min-h-20">
          {uniqueTimeline.map((item, index) => {
            const isCurrent = item.status === currentStatus && !item.completed;
            const isCompleted = item.completed;

            return (
              <div
                key={`${item.status}-${index}`}
                className="flex flex-col items-center flex-1 max-w-20"
              >
                {/* Icon */}
                <div className="relative z-10 mb-2">
                  {getStatusIcon(item.status, isCompleted, isCurrent)}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={`text-xs font-medium leading-tight ${
                      isCompleted
                        ? "text-green-600"
                        : isCurrent
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    {item.label
                      .split(" ")
                      .map(
                        (word) =>
                          word.charAt(0).toUpperCase() +
                          word.slice(1).toLowerCase()
                      )
                      .join(" ")}
                  </p>
                  {isCurrent && (
                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 animate-pulse"></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status Info */}
      <div className="mt-4 text-center">
        <span className="inline-flex items-center px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-700">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
          {uniqueTimeline.find((item) => item.status === currentStatus)
            ?.label || "Order Processing"}
        </span>
      </div>
    </div>
  );
}
