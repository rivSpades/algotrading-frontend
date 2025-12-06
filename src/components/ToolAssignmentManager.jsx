/**
 * Tool Assignment Manager Component
 * Manages analytical tool assignments for a symbol
 */

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { getTools, getSymbolAssignments, createAssignment, updateAssignment, deleteAssignment } from '../data/tools';

export default function ToolAssignmentManager({ symbolTicker, onAssignmentChange }) {
  const [tools, setTools] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [parameters, setParameters] = useState({});

  useEffect(() => {
    loadData();
  }, [symbolTicker]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [toolsData, assignmentsData] = await Promise.all([
        getTools(),
        getSymbolAssignments(symbolTicker)
      ]);
      setTools(toolsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading tools data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedTool) return;

    try {
      // Build style object - special handling for Bollinger Bands
      let style = {
        line_width: 2
      };
      
      if (selectedTool.name === 'BollingerBands') {
        // Separate colors for each band
        style.upper_color = upperColor;
        style.middle_color = middleColor;
        style.lower_color = lowerColor;
        style.bandwidth_color = bandwidthColor;
      } else {
        // Single color for other indicators
        style.color = color;
      }
      
      const assignmentData = {
        tool_name: selectedTool.name, // Use tool name instead of ID
        parameters: parameters,
        enabled: true,
        subchart: subchart, // Include subchart flag
        style: style,
        is_global: true  // Always create global assignments
      };

      await createAssignment(assignmentData);
      await loadData();
      setShowAddModal(false);
      setSelectedTool(null);
      setParameters({});
      setSubchart(false);
      setColor('#3B82F6');
      // Trigger immediate refetch of OHLCV data to get indicators
      if (onAssignmentChange) onAssignmentChange();
    } catch (error) {
      alert(`Failed to add tool: ${error.message}`);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      // Build style object - special handling for Bollinger Bands
      let style = {
        line_width: 2
      };
      
      if (editingAssignment.tool.name === 'BollingerBands') {
        // Separate colors for each band
        style.upper_color = upperColor;
        style.middle_color = middleColor;
        style.lower_color = lowerColor;
        style.bandwidth_color = bandwidthColor;
      } else {
        // Single color for other indicators
        style.color = color;
      }
      
      const assignmentData = {
        parameters: parameters,
        subchart: subchart,
        style: style
      };

      await updateAssignment(editingAssignment.id, assignmentData);
      await loadData();
      setShowEditModal(false);
      setEditingAssignment(null);
      setSelectedTool(null);
      setParameters({});
      setSubchart(false);
      setColor('#3B82F6');
      // Trigger immediate refetch of OHLCV data to get indicators
      if (onAssignmentChange) onAssignmentChange();
    } catch (error) {
      alert(`Failed to update tool: ${error.message}`);
    }
  };

  const handleToggleEnabled = async (assignment) => {
    try {
      const newEnabled = !assignment.enabled;
      await updateAssignment(assignment.id, {
        enabled: newEnabled
      });
      await loadData();
      // Auto-compute is handled synchronously by backend, refresh indicators immediately
      if (onAssignmentChange) onAssignmentChange();
    } catch (error) {
      alert(`Failed to update assignment: ${error.message}`);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this tool assignment?')) {
      return;
    }

    try {
      await deleteAssignment(assignmentId);
      // Reload data to reflect changes
      await loadData();
      // Trigger parent component to refresh OHLCV data and indicators
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      // Only show error if it's not a successful deletion
      if (error.message && !error.message.includes('Unexpected end of JSON')) {
        alert(`Failed to delete assignment: ${error.message}`);
      } else {
        // Deletion was successful, just refresh
        await loadData();
        if (onAssignmentChange) {
          onAssignmentChange();
        }
      }
    }
  };

  // Computation is now automatic - indicators are computed on-the-fly when fetching OHLCV data
  // No need for manual compute buttons

  const [color, setColor] = useState('#3B82F6'); // Default blue color
  const [upperColor, setUpperColor] = useState('#EF4444'); // Default red for upper band
  const [middleColor, setMiddleColor] = useState('#3B82F6'); // Default blue for middle band
  const [lowerColor, setLowerColor] = useState('#10B981'); // Default green for lower band
  const [bandwidthColor, setBandwidthColor] = useState('#8B5CF6'); // Default purple for bandwidth
  const [subchart, setSubchart] = useState(false); // Default to main chart

  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    // Initialize parameters with tool defaults
    setParameters(tool.default_parameters || {});
    // Reset colors to defaults
    setColor('#3B82F6');
    setUpperColor('#EF4444');
    setMiddleColor('#3B82F6');
    setLowerColor('#10B981');
    setBandwidthColor('#8B5CF6');
    // Reset subchart to false (main chart by default)
    setSubchart(false);
  };

  const updateParameter = (key, value) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-500">Loading tools...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Analytical Tools</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Tool
          </button>
        </div>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No tools assigned. Click "Add Tool" to get started.</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{assignment.tool.name}</h3>
                  {!assignment.symbol && (
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                      Global
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleEnabled(assignment)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {assignment.enabled ? (
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <span className={`text-sm px-2 py-1 rounded ${
                    assignment.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {assignment.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {assignment.tool.description && (
                  <p className="text-sm text-gray-600 mt-1">{assignment.tool.description}</p>
                )}
                {Object.keys(assignment.parameters || {}).length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    Parameters: {JSON.stringify(assignment.parameters)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingAssignment(assignment);
                    setSelectedTool(assignment.tool);
                    setParameters(assignment.parameters || {});
                    const style = assignment.style || {};
                    if (assignment.tool.name === 'BollingerBands') {
                      setUpperColor(style.upper_color || '#EF4444');
                      setMiddleColor(style.middle_color || '#3B82F6');
                      setLowerColor(style.lower_color || '#10B981');
                      setBandwidthColor(style.bandwidth_color || '#8B5CF6');
                    } else {
                      setColor(style.color || '#3B82F6');
                    }
                    setSubchart(assignment.subchart || false);
                    setShowEditModal(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit tool settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteAssignment(assignment.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Remove tool"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Tool Modal */}
      {showEditModal && editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Edit {editingAssignment.tool.name} Settings</h3>
            
            {/* Parameters */}
            {editingAssignment.tool.default_parameters && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parameters
                </label>
                {Object.entries(editingAssignment.tool.default_parameters).map(([key, defaultValue]) => (
                  <div key={key} className="mb-2">
                    <label className="block text-xs text-gray-600 mb-1 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="number"
                      value={parameters[key] !== undefined ? parameters[key] : defaultValue}
                      onChange={(e) => updateParameter(key, parseInt(e.target.value) || defaultValue)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Color Pickers */}
            {editingAssignment?.tool.name === 'BollingerBands' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Band Colors
                </label>
                <div className="space-y-3">
                  {/* Upper Band Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Upper Band</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={upperColor}
                        onChange={(e) => setUpperColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={upperColor}
                        onChange={(e) => setUpperColor(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="#EF4444"
                      />
                    </div>
                  </div>
                  {/* Middle Band Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Middle Band</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={middleColor}
                        onChange={(e) => setMiddleColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={middleColor}
                        onChange={(e) => setMiddleColor(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  {/* Lower Band Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Lower Band</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={lowerColor}
                        onChange={(e) => setLowerColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={lowerColor}
                        onChange={(e) => setLowerColor(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="#10B981"
                      />
                    </div>
                  </div>
                  {/* Bandwidth Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Bandwidth</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={bandwidthColor}
                        onChange={(e) => setBandwidthColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={bandwidthColor}
                        onChange={(e) => setBandwidthColor(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="#8B5CF6"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            )}

            {/* Subchart Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subchart}
                  onChange={(e) => setSubchart(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Display in subchart (below main chart)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Recommended for indicators like RSI (0-100 range) that need separate scale
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAssignment(null);
                  setSelectedTool(null);
                  setParameters({});
                  setSubchart(false);
                  setColor('#3B82F6');
                  setUpperColor('#EF4444');
                  setMiddleColor('#3B82F6');
                  setLowerColor('#10B981');
                  setBandwidthColor('#8B5CF6');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAssignment}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Add Analytical Tool</h3>
            
            {/* Tool Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tool
              </label>
              <select
                value={selectedTool?.name || ''}
                onChange={(e) => {
                  const tool = tools.find(t => t.name === e.target.value);
                  handleToolSelect(tool);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Choose a tool...</option>
                {tools
                  .filter(tool => !assignments.some(a => a.tool?.name === tool.name))
                  .map(tool => (
                    <option key={tool.name || tool.id} value={tool.name}>
                      {tool.name} - {tool.description || 'No description'}
                    </option>
                  ))}
              </select>
            </div>

            {/* Parameters */}
            {selectedTool && selectedTool.default_parameters && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parameters
                </label>
                {Object.entries(selectedTool.default_parameters).map(([key, defaultValue]) => (
                  <div key={key} className="mb-2">
                    <label className="block text-xs text-gray-600 mb-1 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="number"
                      value={parameters[key] || defaultValue}
                      onChange={(e) => updateParameter(key, parseInt(e.target.value) || defaultValue)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Color Pickers */}
            {selectedTool && selectedTool.name === 'BollingerBands' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Band Colors
                </label>
                <div className="space-y-3">
                  {/* Upper Band Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Upper Band</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={upperColor}
                        onChange={(e) => setUpperColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={upperColor}
                        onChange={(e) => setUpperColor(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="#EF4444"
                      />
                    </div>
                  </div>
                  {/* Middle Band Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Middle Band</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={middleColor}
                        onChange={(e) => setMiddleColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={middleColor}
                        onChange={(e) => setMiddleColor(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  {/* Lower Band Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Lower Band</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={lowerColor}
                        onChange={(e) => setLowerColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={lowerColor}
                        onChange={(e) => setLowerColor(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="#10B981"
                      />
                    </div>
                  </div>
                  {/* Bandwidth Color */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Bandwidth</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={bandwidthColor}
                        onChange={(e) => setBandwidthColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={bandwidthColor}
                        onChange={(e) => setBandwidthColor(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="#8B5CF6"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedTool && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            )}

            {/* Subchart Checkbox */}
            {selectedTool && (
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subchart}
                    onChange={(e) => setSubchart(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Display in subchart (below main chart)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Recommended for indicators like RSI (0-100 range) that need separate scale
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedTool(null);
                  setParameters({});
                  setSubchart(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAssignment}
                disabled={!selectedTool}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Add Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

