/**
 * Statistics Card Component
 * Displays a single statistic in a card format
 */

export default function StatisticsCard({ title, value, unit = '', description = '', icon: Icon = null, additionalInfo = null }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {Icon && <Icon className="w-5 h-5 text-gray-500" />}
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <div className="mt-2">
            {value !== null && value !== undefined ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </span>
                {unit && (
                  <span className="text-lg text-gray-600 ml-1">{unit}</span>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-lg">N/A</div>
            )}
          </div>
          {additionalInfo && (
            <div className="mt-2 text-sm text-gray-600">
              {additionalInfo}
            </div>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

