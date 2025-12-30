/**
 * Broker Form Component
 * Create/Edit broker configuration with separate paper and real money trading
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { getBroker, createBroker, updateBroker } from '../data/liveTrading';
import { liveTradingAPI } from '../data/liveTrading';
import { motion } from 'framer-motion';

const BROKER_CODES = [
  { value: 'ALPACA', label: 'Alpaca' },
  // Add more brokers here as they become available
];

export default function BrokerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [testingPaper, setTestingPaper] = useState(false);
  const [testingRealMoney, setTestingRealMoney] = useState(false);
  const [testResultPaper, setTestResultPaper] = useState(null);
  const [testResultRealMoney, setTestResultRealMoney] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: 'ALPACA',
    paper_trading_endpoint_url: '',
    paper_trading_api_key: '',
    paper_trading_secret_key: '',
    paper_trading_active: false,
    real_money_endpoint_url: '',
    real_money_api_key: '',
    real_money_secret_key: '',
    real_money_active: false,
    api_config: {},
  });
  
  const [showPaperKey, setShowPaperKey] = useState(false);
  const [showPaperSecret, setShowPaperSecret] = useState(false);
  const [showRealMoneyKey, setShowRealMoneyKey] = useState(false);
  const [showRealMoneySecret, setShowRealMoneySecret] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadBroker();
    }
  }, [id]);

  const loadBroker = async () => {
    setLoading(true);
    try {
      const broker = await getBroker(id);
      setFormData({
        name: broker.name || '',
        code: broker.code || 'ALPACA',
        paper_trading_endpoint_url: broker.paper_trading_endpoint_url || '',
        paper_trading_api_key: broker.paper_trading_api_key || '',
        paper_trading_secret_key: broker.paper_trading_secret_key || '',
        paper_trading_active: broker.paper_trading_active || false,
        real_money_endpoint_url: broker.real_money_endpoint_url || '',
        real_money_api_key: broker.real_money_api_key || '',
        real_money_secret_key: broker.real_money_secret_key || '',
        real_money_active: broker.real_money_active || false,
        api_config: broker.api_config || {},
      });
      setTestResultPaper(null);
      setTestResultRealMoney(null);
    } catch (error) {
      console.error('Error loading broker:', error);
      alert('Failed to load broker: ' + (error.message || 'Unknown error'));
      navigate('/brokers');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (deploymentType) => {
    const isPaper = deploymentType === 'paper';
    const setTesting = isPaper ? setTestingPaper : setTestingRealMoney;
    const setTestResult = isPaper ? setTestResultPaper : setTestResultRealMoney;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      // Check if required fields are filled
      const endpointField = isPaper ? 'paper_trading_endpoint_url' : 'real_money_endpoint_url';
      const keyField = isPaper ? 'paper_trading_api_key' : 'real_money_api_key';
      const secretField = isPaper ? 'paper_trading_secret_key' : 'real_money_secret_key';
      
      if (!formData[endpointField] || !formData[keyField] || !formData[secretField]) {
        setTestResult({
          success: false,
          message: `Please fill in ${deploymentType.replace('_', ' ')} endpoint URL, API key, and secret key before testing.`
        });
        setTesting(false);
        return;
      }

      // If editing, update first, then test. If creating, create first, then test.
      let brokerId = id;
      if (!isEditing) {
        // Validate required fields before creating
        if (!formData.name || !formData.code) {
          setTestResult({
            success: false,
            message: 'Please fill in broker name and code before testing connection.',
          });
          setTesting(false);
          return;
        }
        
        // Create broker first
        try {
          const newBroker = await createBroker({
            name: formData.name,
            code: formData.code,
            [endpointField]: formData[endpointField],
            [keyField]: formData[keyField],
            [secretField]: formData[secretField],
            api_config: formData.api_config,
            paper_trading_active: false,
            real_money_active: false,
          });
          brokerId = newBroker.id;
        } catch (createError) {
          setTestResult({
            success: false,
            message: `Failed to create broker: ${createError.message}. Please save the broker first.`,
          });
          setTesting(false);
          return;
        }
      } else {
        // Update broker first
        await updateBroker(id, {
          [endpointField]: formData[endpointField],
          [keyField]: formData[keyField],
          [secretField]: formData[secretField],
        });
      }

      // Test connection
      const response = await liveTradingAPI.brokers.testConnection(brokerId, { deployment_type: deploymentType });
      if (response.success) {
        setTestResult({
          success: response.data.success,
          message: response.data.message || 'Connection test successful',
        });
        // Update active status if test was successful
        if (response.data.success) {
          const activeField = isPaper ? 'paper_trading_active' : 'real_money_active';
          setFormData(prev => ({ ...prev, [activeField]: true }));
        }
        // If we created a new broker, update the ID in the URL
        if (!isEditing && brokerId) {
          navigate(`/brokers/${brokerId}/edit`, { replace: true });
        }
        // Reload broker to get updated status
        if (isEditing) {
          await loadBroker();
        }
      } else {
        setTestResult({
          success: false,
          message: response.error || 'Connection test failed',
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        await updateBroker(id, formData);
      } else {
        await createBroker(formData);
      }
      navigate('/brokers');
    } catch (error) {
      console.error('Error saving broker:', error);
      alert('Failed to save broker: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear test result when fields change
    if (field.startsWith('paper_trading_')) {
      setTestResultPaper(null);
    } else if (field.startsWith('real_money_')) {
      setTestResultRealMoney(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate('/brokers')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Brokers
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEditing ? 'Edit Broker' : 'Add New Broker'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Alpaca"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Broker Code *
              </label>
              <select
                required
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {BROKER_CODES.map(broker => (
                  <option key={broker.value} value={broker.value}>
                    {broker.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paper Trading Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Paper Trading</h2>
              {formData.paper_trading_active && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Active
                </span>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={formData.paper_trading_endpoint_url}
                  onChange={(e) => handleChange('paper_trading_endpoint_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., https://paper-api.alpaca.markets"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showPaperKey ? 'text' : 'password'}
                    value={formData.paper_trading_api_key}
                    onChange={(e) => handleChange('paper_trading_api_key', e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter paper trading API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPaperKey(!showPaperKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPaperKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showPaperSecret ? 'text' : 'password'}
                    value={formData.paper_trading_secret_key}
                    onChange={(e) => handleChange('paper_trading_secret_key', e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter paper trading secret key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPaperSecret(!showPaperSecret)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPaperSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Test Result Paper */}
              {testResultPaper && (
                <div className={`p-4 rounded-lg border ${
                  testResultPaper.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResultPaper.success ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">{testResultPaper.message}</span>
                  </div>
                </div>
              )}

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTestConnection('paper')}
                disabled={testingPaper || !formData.paper_trading_endpoint_url || !formData.paper_trading_api_key || !formData.paper_trading_secret_key}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingPaper ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Paper Trading Connection'
                )}
              </motion.button>
            </div>
          </div>

          {/* Real Money Trading Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Real Money Trading</h2>
              {formData.real_money_active && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Active
                </span>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={formData.real_money_endpoint_url}
                  onChange={(e) => handleChange('real_money_endpoint_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., https://api.alpaca.markets"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showRealMoneyKey ? 'text' : 'password'}
                    value={formData.real_money_api_key}
                    onChange={(e) => handleChange('real_money_api_key', e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter real money API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRealMoneyKey(!showRealMoneyKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showRealMoneyKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showRealMoneySecret ? 'text' : 'password'}
                    value={formData.real_money_secret_key}
                    onChange={(e) => handleChange('real_money_secret_key', e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter real money secret key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRealMoneySecret(!showRealMoneySecret)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showRealMoneySecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Test Result Real Money */}
              {testResultRealMoney && (
                <div className={`p-4 rounded-lg border ${
                  testResultRealMoney.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResultRealMoney.success ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">{testResultRealMoney.message}</span>
                  </div>
                </div>
              )}

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTestConnection('real_money')}
                disabled={testingRealMoney || !formData.real_money_endpoint_url || !formData.real_money_api_key || !formData.real_money_secret_key}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingRealMoney ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Real Money Connection'
                )}
              </motion.button>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => navigate('/brokers')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
