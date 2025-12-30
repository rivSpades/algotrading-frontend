/**
 * Strategy Assignment Manager Component
 * Manages strategy assignments for symbols
 */

import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Check, XCircle } from 'lucide-react';
import { getStrategies, getStrategyAssignments, createStrategyAssignment, updateStrategyAssignment, deleteStrategyAssignment } from '../data/strategies';

export default function StrategyAssignmentManager({ symbolTicker, onAssignmentChange }) {
  const [strategies, setStrategies] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [parameters, setParameters] = useState({});
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    loadData();
  }, [symbolTicker]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [strategiesData, assignmentsData] = await Promise.all([
        getStrategies(),
        getStrategyAssignments(symbolTicker),
      ]);
      setStrategies(strategiesData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedStrategy) return;

    try {
      const assignmentData = {
        strategy_id: selectedStrategy.id,
        symbol_ticker: symbolTicker,
        parameters: parameters,
        enabled: enabled,
      };

      await createStrategyAssignment(assignmentData);
      await loadData();
      setShowAddModal(false);
      resetForm();
      if (onAssignmentChange) onAssignmentChange();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create strategy assignment: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment || !selectedStrategy) return;

    try {
      const assignmentData = {
        strategy_id: selectedStrategy.id,
        symbol_ticker: symbolTicker,
        parameters: parameters,
        enabled: enabled,
      };

      await updateStrategyAssignment(editingAssignment.id, assignmentData);
      await loadData();
      setShowEditModal(false);
      resetForm();
      if (onAssignmentChange) onAssignmentChange();
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update strategy assignment: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!confirm('Are you sure you want to delete this strategy assignment?')) return;

    try {
      await deleteStrategyAssignment(id);
      await loadData();
      if (onAssignmentChange) onAssignmentChange();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete strategy assignment: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setSelectedStrategy(assignment.strategy);
    setParameters(assignment.parameters || {});
    setEnabled(assignment.enabled);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setSelectedStrategy(null);
    setParameters({});
    setEnabled(false);
    setEditingAssignment(null);
  };

  const handleStrategySelect = (strategy) => {
    setSelectedStrategy(strategy);
    // Initialize parameters with default values
    setParameters(strategy.default_parameters || {});
  };

  const updateParameter = (key, value) => {
    setParameters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return <div className="text-center py-4">Loading strategies...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Strategy Assignments</h3>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Strategy
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No strategy assignments. Add one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{assignment.strategy_name}</h3>
                  {assignment.symbol === null && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Global
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    assignment.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {assignment.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {assignment.strategy_info?.description_short && (
                  <p className="text-sm text-gray-600 mt-1">{assignment.strategy_info.description_short}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(assignment)}
                  className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteAssignment(assignment.id)}
                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Strategy Assignment</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strategy
                </label>
                <select
                  value={selectedStrategy?.id || ''}
                  onChange={(e) => {
                    const strategy = strategies.find(s => s.id === parseInt(e.target.value));
                    handleStrategySelect(strategy);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a strategy</option>
                  {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStrategy && (
                <>
                  {selectedStrategy.description_short && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">{selectedStrategy.description_short}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parameters
                    </label>
                    <div className="space-y-2">
                      {Object.entries(selectedStrategy.default_parameters || {}).map(([key, defaultValue]) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-600 mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <input
                            type={typeof defaultValue === 'number' ? 'number' : 'text'}
                            value={parameters[key] !== undefined ? parameters[key] : defaultValue}
                            onChange={(e) => {
                              const value = typeof defaultValue === 'number' ? parseFloat(e.target.value) : e.target.value;
                              updateParameter(key, value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            step={typeof defaultValue === 'number' ? 'any' : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                      Enable this strategy
                    </label>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAssignment}
                  disabled={!selectedStrategy}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Strategy Assignment</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedStrategy && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Strategy
                    </label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg">
                      {selectedStrategy.name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parameters
                    </label>
                    <div className="space-y-2">
                      {Object.entries(selectedStrategy.default_parameters || {}).map(([key, defaultValue]) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-600 mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <input
                            type={typeof defaultValue === 'number' ? 'number' : 'text'}
                            value={parameters[key] !== undefined ? parameters[key] : defaultValue}
                            onChange={(e) => {
                              const value = typeof defaultValue === 'number' ? parseFloat(e.target.value) : e.target.value;
                              updateParameter(key, value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            step={typeof defaultValue === 'number' ? 'any' : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-enabled"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="edit-enabled" className="text-sm font-medium text-gray-700">
                      Enable this strategy
                    </label>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAssignment}
                  disabled={!selectedStrategy}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}











