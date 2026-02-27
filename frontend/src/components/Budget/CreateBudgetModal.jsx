import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

const CreateBudgetModal = ({ isOpen, onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        scopeType: 'global',
        scopeValue: '',
        thresholds: '50, 80, 100'
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const budgetPayload = {
                name: formData.name,
                amount: parseFloat(formData.amount),
                scope: {
                    type: formData.scopeType,
                    value: formData.scopeType === 'global' ? null : formData.scopeValue
                },
                thresholds: formData.thresholds.split(',').map(t => parseFloat(t.trim())),
                period: 'monthly'
            };

            if (isNaN(budgetPayload.amount) || budgetPayload.amount <= 0) {
                throw new Error("Amount must be a positive number");
            }
            if (budgetPayload.scope.type !== 'global' && !budgetPayload.scope.value) {
                throw new Error("Scope value is required for non-global budgets");
            }

            await onCreate(budgetPayload);
            onClose();
            // Reset form
            setFormData({
                name: '',
                amount: '',
                scopeType: 'global',
                scopeValue: '',
                thresholds: '50, 80, 100'
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Create New Budget</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="e.g. Production Compute"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Limit Amount ($)</label>
                            <input
                                type="number"
                                name="amount"
                                required
                                min="1"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="1000.00"
                                value={formData.amount}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                            <select disabled className="w-full px-3 py-2 border border-gray-100 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed">
                                <option>Monthly</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Scope Type</label>
                            <select
                                name="scopeType"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                value={formData.scopeType}
                                onChange={handleChange}
                            >
                                <option value="global">Global</option>
                                <option value="service">Service</option>
                                <option value="resource_group">Resource Group</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Scope Value</label>
                            <input
                                type="text"
                                name="scopeValue"
                                disabled={formData.scopeType === 'global'}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${formData.scopeType === 'global' ? 'bg-gray-50 text-gray-400' : ''}`}
                                placeholder={formData.scopeType === 'global' ? 'All Services' : 'e.g. ComputeEngine'}
                                value={formData.scopeType === 'global' ? '' : formData.scopeValue}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alert Thresholds (%)</label>
                        <input
                            type="text"
                            name="thresholds"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="50, 80, 100"
                            value={formData.thresholds}
                            onChange={handleChange}
                        />
                        <p className="text-xs text-gray-500 mt-1">Comma separated percentages to trigger alerts (e.g. 50, 80, 90)</p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : (
                                <>
                                    <Save size={16} /> Create Budget
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateBudgetModal;
