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
        <h3 className="text-lg font-semibold text-ink">Strategy Assignments</h3>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Strategy
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-8 text-ink-tertiary">
          No strategy assignments. Add one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-ink">{assignment.strategy_name}</h3>
                  {assignment.symbol === null && (
                    <span className="px-2 py-1 text-xs font-medium bg-status-running-soft text-accent-ink rounded-full">
                      Global
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    assignment.enabled
                      ? 'bg-profit-soft text-profit-ink'
                      : 'bg-surface-sunken text-ink'
                  }`}>
                    {assignment.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {assignment.strategy_info?.description_short && (
                  <p className="text-sm text-ink-secondary mt-1">{assignment.strategy_info.description_short}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(assignment)}
                  className="p-2 text-ink-secondary hover:text-accent transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteAssignment(assignment.id)}
                  className="p-2 text-ink-secondary hover:text-loss transition-colors"
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
          <div className="bg-surface rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-ink">Add Strategy Assignment</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-ink-tertiary hover:text-ink-secondary"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Strategy
                </label>
                <select
                  value={selectedStrategy?.id || ''}
                  onChange={(e) => {
                    const strategy = strategies.find(s => s.id === parseInt(e.target.value));
                    handleStrategySelect(strategy);
                  }}
                  className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
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
                    <div className="bg-bg p-3 rounded-lg">
                      <p className="text-sm text-ink-secondary">{selectedStrategy.description_short}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-2">
                      Parameters
                    </label>
                    <div className="space-y-2">
                      {Object.entries(selectedStrategy.default_parameters || {}).map(([key, defaultValue]) => (
                        <div key={key}>
                          <label className="block text-xs text-ink-secondary mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <input
                            type={typeof defaultValue === 'number' ? 'number' : 'text'}
                            value={parameters[key] !== undefined ? parameters[key] : defaultValue}
                            onChange={(e) => {
                              const value = typeof defaultValue === 'number' ? parseFloat(e.target.value) : e.target.value;
                              updateParameter(key, value);
                            }}
                            className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
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
                      className="w-4 h-4 text-accent border-border-strong rounded focus:ring-accent"
                    />
                    <label htmlFor="enabled" className="text-sm font-medium text-ink-secondary">
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
                  className="px-4 py-2 border border-border-strong rounded-lg hover:bg-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAssignment}
                  disabled={!selectedStrategy}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-surface rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-ink">Edit Strategy Assignment</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-ink-tertiary hover:text-ink-secondary"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedStrategy && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-2">
                      Strategy
                    </label>
                    <div className="px-3 py-2 bg-bg rounded-lg">
                      {selectedStrategy.name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-2">
                      Parameters
                    </label>
                    <div className="space-y-2">
                      {Object.entries(selectedStrategy.default_parameters || {}).map(([key, defaultValue]) => (
                        <div key={key}>
                          <label className="block text-xs text-ink-secondary mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <input
                            type={typeof defaultValue === 'number' ? 'number' : 'text'}
                            value={parameters[key] !== undefined ? parameters[key] : defaultValue}
                            onChange={(e) => {
                              const value = typeof defaultValue === 'number' ? parseFloat(e.target.value) : e.target.value;
                              updateParameter(key, value);
                            }}
                            className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
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
                      className="w-4 h-4 text-accent border-border-strong rounded focus:ring-accent"
                    />
                    <label htmlFor="edit-enabled" className="text-sm font-medium text-ink-secondary">
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
                  className="px-4 py-2 border border-border-strong rounded-lg hover:bg-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAssignment}
                  disabled={!selectedStrategy}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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












