import React, { useState, useEffect } from 'react';
import { Plus, Loader } from 'lucide-react';
import api from '../services/api';
import BudgetCard from './Budget/BudgetCard';
import CreateBudgetModal from './Budget/CreateBudgetModal';

const Budgets = () => {
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchBudgets = async () => {
        try {
            setLoading(true);
            const response = await api.getBudgets();
            setBudgets(response.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching budgets:", err);
            setError("Failed to load budgets.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudgets();
    }, []);

    const handleCreateBudget = async (budgetData) => {
        try {
            await api.createBudget(budgetData);
            await fetchBudgets(); // Refresh list
        } catch (err) {
            console.error("Error creating budget:", err);
            throw new Error(err.response?.data?.error || "Failed to create budget");
        }
    };

    const handleDeleteBudget = async (id) => {
        if (!window.confirm("Are you sure you want to delete this budget?")) return;
        try {
            await api.deleteBudget(id);
            setBudgets(budgets.filter(b => b.budget.id !== id));
        } catch (err) {
            console.error("Error deleting budget:", err);
            alert("Failed to delete budget");
        }
    };

    if (loading && budgets.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
                    <p className="text-gray-500 mt-1">Set limits and track spending by service or project.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={18} /> Create Budget
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">
                    {error}
                </div>
            )}

            {!loading && budgets.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Plus size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No budgets yet</h3>
                    <p className="text-gray-500 mb-6">Create a budget to start monitoring your cloud spend.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-blue-600 font-medium hover:text-blue-800"
                    >
                        Create your first budget
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {budgets.map((budgetData) => (
                        <BudgetCard
                            key={budgetData.budget.id}
                            budgetData={budgetData}
                            onDelete={handleDeleteBudget}
                        />
                    ))}
                </div>
            )}

            <CreateBudgetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateBudget}
            />
        </div>
    );
};

export default Budgets;
