'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Link from 'next/link';

interface BankDetails {
  _id?: string;
  accountNumber: string;
  ifsc: string;
  beneficiaryName: string;
  isPrimary?: boolean;
}

export default function DeliveryBoyBankDetailsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankDetails[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBank, setNewBank] = useState<BankDetails>({
    accountNumber: '',
    ifsc: '',
    beneficiaryName: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const res = await axios.get('/api/delivery-boy/bank-details');
      if (res.data.banks && res.data.banks.length > 0) {
        setBankAccounts(res.data.banks);
      } else {
        setShowAddForm(true); // Show form if no banks exist
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
      setShowAddForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBank((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await axios.post('/api/delivery-boy/bank-details', newBank);
      if (res.data.success) {
        toast.success('Bank account added successfully!');
        setNewBank({ accountNumber: '', ifsc: '', beneficiaryName: '' });
        setShowAddForm(false);
        fetchBankDetails();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (bankId: string) => {
    try {
      const res = await axios.put('/api/delivery-boy/bank-details', { bankId, isPrimary: true });
      if (res.data.success) {
        toast.success('Primary bank updated!');
        fetchBankDetails();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating primary bank');
    }
  };

  const handleDeleteBank = async (bankId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    
    try {
      const res = await axios.delete(`/api/delivery-boy/bank-details?bankId=${bankId}`);
      if (res.data.success) {
        toast.success('Bank account deleted!');
        fetchBankDetails();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting bank');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
              <p className="text-gray-600 mt-1">Manage your bank accounts for payouts</p>
            </div>
            <Link href="/delivery-boy" className="text-blue-600 hover:text-blue-800 font-semibold">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Bank Accounts List */}
        {bankAccounts.length > 0 && (
          <div className="space-y-4 mb-6">
            {bankAccounts.map((bank) => (
              <div
                key={bank._id}
                className={`bg-white rounded-lg shadow p-6 ${
                  bank.isPrimary ? 'border-2 border-green-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold">{bank.beneficiaryName}</h3>
                      {bank.isPrimary && (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                          ✓ PRIMARY
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Account Number</p>
                        <p className="font-mono text-lg">
                          ••••••••{bank.accountNumber.slice(-4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">IFSC Code</p>
                        <p className="font-mono text-lg">{bank.ifsc}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {!bank.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(bank._id!)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Set as Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBank(bank._id!)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      disabled={bank.isPrimary}
                    >
                      {bank.isPrimary ? 'Cannot Delete' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Bank Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all mb-6"
          >
            + Add New Bank Account
          </button>
        )}

        {/* Add Bank Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {bankAccounts.length > 0 ? 'Add New Bank Account' : 'Add Your First Bank Account'}
              </h2>
              {bankAccounts.length > 0 && (
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ✕
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  name="beneficiaryName"
                  value={newBank.beneficiaryName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={newBank.accountNumber}
                  onChange={handleChange}
                  placeholder="Enter your account number"
                  required
                  maxLength={18}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
                <p className="text-xs text-gray-500 mt-1">9-18 digits</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifsc"
                  value={newBank.ifsc}
                  onChange={(e) =>
                    setNewBank((prev) => ({
                      ...prev,
                      ifsc: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g., HDFC0001234"
                  required
                  maxLength={11}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
                <p className="text-xs text-gray-500 mt-1">11 characters (auto-uppercase)</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Bank Account'}
                </button>
                {bankAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewBank({ accountNumber: '', ifsc: '', beneficiaryName: '' });
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>💡 Note:</strong> Your bank details are securely stored and used only for payment transfers.
                {bankAccounts.length === 0 && ' Your first bank will be set as primary automatically.'}
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        {bankAccounts.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-bold text-lg mb-3 text-blue-900">💰 Payout Information</h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Weekly payouts are processed every Friday to your primary bank account</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can add multiple bank accounts and switch primary anytime</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Primary bank cannot be deleted - set another as primary first</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
